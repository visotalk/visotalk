/**
 * A `.visotalk` bundle: what its manifest says, which paths and contents are acceptable, when a set of files is a
 * whole, honest bundle, and how a talk's files are packed into one and opened from one. Pure: bytes in, bytes or a verdict out, no file system (the CLI
 * and the web app each gather and place the files themselves). Its own entry point, `@visotalk/ir/bundle`, so the web editor's bundle does not carry the ZIP code.
 */
import {unzipSync, zipSync, type Zippable} from 'fflate';
import {captionsSrt} from './captions.ts';
import {creditsMarkdown} from './credits.ts';
import {parseMarkup} from './markup.ts';
import {SPEC_VERSION, type VisoDoc} from './spec.ts';
import {solve, type VoiceManifest} from './timeline.ts';

export const BUNDLE_MIME = 'application/vnd.visotalk+zip';
export const BUNDLE_FORMAT = 'visotalk.bundle';
export const BUNDLE_VERSION = '0.1.0';
export const BUNDLE_LIMITS = {entries: 2000, bytes: 200_000_000, ratio: 100, segment: 255, path: 1024};

/** The top-level names a reader knows. Any other entry is ignored on import (it is still path-checked and listed in `files`). */
export const BUNDLE_ROOTS = ['source', 'voice', 'cover', 'captions', 'preview', 'player', 'credits.md', 'notes.md'];

export type BundleKind = 'source' | 'player';

export interface BundleManifest {
  format: typeof BUNDLE_FORMAT;
  kind: BundleKind;
  formatVersion: string;
  /** the talk's identity, kept through every edit */
  id: string;
  /** `sha256:` of the sorted `path sha256` lines of `files` */
  revision: string;
  /** the VisoTalk spec version (major.minor) of the document */
  spec: string;
  generator: {name: string; version?: string};
  created: string;
  /** `obligations`: the terms of the media a document uses (attribution, share-alike, …), so a bundle that does not hold the document still says them */
  summary: {title: string; description?: string; lang: string; duration?: number; canvases: string[]; obligations?: string[]};
  entry?: string;
  cover?: string;
  captions?: Array<{lang: string; path: string}>;
  /** present when the bundle carries a voice; `voice` is the document's own `voice` attribute, absent when the document leaves it to the default (Kokoro) */
  voice?: {voice?: string};
  license: {id: string};
  /** the bundle this one was made from: `remix` and `translation` start a talk of their own; `player` is the built form of a source (`revision` is that source's, when the exporter had it) */
  lineage?: {id: string; revision?: string; relation: 'remix' | 'translation' | 'player'};
  files: Record<string, {size: number; sha256: string}>;
  [ext: `x-${string}`]: unknown;
}

export class BundleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BundleError';
  }
}

const enc = new TextEncoder();
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');

export const sha256 = async (data: Uint8Array): Promise<string> => hex(await crypto.subtle.digest('SHA-256', data as unknown as BufferSource));

/** Names a snapshot by what is in it, and nothing else (not the manifest, not when it was written) */
export async function revisionOf(files: BundleManifest['files']): Promise<string> {
  const lines = Object.keys(files).sort().map((p) => `${p} ${files[p].sha256}\n`);
  return `sha256:${await sha256(enc.encode(lines.join('')))}`;
}

/** Why a path cannot be a bundle entry, or undefined: relative, NFC, no `..`, no backslash, no control characters, short */
export function pathIssue(path: string): string | undefined {
  if (!path) return 'empty path';
  if (enc.encode(path).length > BUNDLE_LIMITS.path) return 'path longer than 1,024 bytes';
  if (path.includes('\\')) return 'backslash in path';
  if (path.startsWith('/') || /^[A-Za-z]:/.test(path)) return 'absolute path';
  if (/[\u0000-\u001f\u007f]/.test(path)) return 'control character in path';
  if (path.normalize('NFC') !== path) return 'path is not NFC-normalised';
  for (const seg of path.split('/')) {
    if (seg === '' || seg === '.' || seg === '..') return `path segment "${seg}"`;
    if (enc.encode(seg).length > BUNDLE_LIMITS.segment) return 'path segment longer than 255 bytes';
  }
  return undefined;
}

/** What the central directory claims, checked before anything is inflated: how many entries, how large, how well compressed, and no name twice */
export function zipIssue(entries: Array<{name: string; size: number; originalSize: number}>): string | undefined {
  if (entries.length > BUNDLE_LIMITS.entries) return `more than ${BUNDLE_LIMITS.entries} entries`;
  let total = 0;
  const seen = new Set<string>();
  for (const e of entries) {
    const bad = pathIssue(e.name);
    if (bad) return `${JSON.stringify(e.name)}: ${bad}`;
    const folded = e.name.toLowerCase();
    if (seen.has(folded)) return `${JSON.stringify(e.name)}: the name is used twice (case aside)`;
    seen.add(folded);
    if (e.originalSize > BUNDLE_LIMITS.ratio * Math.max(e.size, 1) && e.originalSize > 1_000_000) return `${JSON.stringify(e.name)}: inflates to more than ${BUNDLE_LIMITS.ratio}× its size`;
    total += e.originalSize;
  }
  if (total > BUNDLE_LIMITS.bytes) return `inflates to ${(total / 1e6).toFixed(0)} MB, over the ${BUNDLE_LIMITS.bytes / 1e6} MB a bundle may hold`;
  return undefined;
}

const FORBIDDEN = /\.(html?|xhtml|exe|dll|so|dylib|bat|cmd|com|msi|ps1|sh|jar|apk)$/i;

/** Files in `source/` that no document can use: pages, executables, and SVG that runs script */
export function contentIssue(path: string, data: Uint8Array): string | undefined {
  if (FORBIDDEN.test(path)) return 'a page or an executable is not an asset';
  if (/\.svg$/i.test(path) && /<script|\son[a-z]+\s*=|javascript:|<foreignObject/i.test(new TextDecoder().decode(data))) return 'an SVG that runs script';
  return undefined;
}

/** Same major; in 0.x, the same minor (any change bumps it); later, a reader takes an equal or lower minor */
export function formatCompatible(version: string): boolean {
  const [major, minor] = version.split('.').map(Number);
  const [ours, oursMinor] = BUNDLE_VERSION.split('.').map(Number);
  return major === ours && (major === 0 ? minor === oursMinor : minor <= oursMinor);
}

const minorOf = (v: string) => v.split('.').slice(0, 2).join('.');

/** The manifest as the rules need it; the first thing wrong is the message */
export function parseManifest(text: string): BundleManifest {
  let m: Record<string, unknown>;
  try {
    m = JSON.parse(text);
  } catch (e) {
    throw new BundleError(`manifest.json is not JSON: ${(e as Error).message}`);
  }
  const need = (ok: boolean, what: string) => {
    if (!ok) throw new BundleError(`manifest.json: ${what}`);
  };
  const str = (v: unknown) => typeof v === 'string' && v.length > 0;
  need(m && typeof m === 'object' && !Array.isArray(m), 'not an object');
  need(m.format === BUNDLE_FORMAT, `format must be "${BUNDLE_FORMAT}"`);
  need(m.kind === 'source' || m.kind === 'player', 'kind must be "source" or "player"');
  for (const k of ['formatVersion', 'id', 'revision', 'spec', 'created']) need(str(m[k]), `${k} is missing`);
  const sum = m.summary as BundleManifest['summary'] | undefined;
  need(!!sum && str(sum.title) && str(sum.lang) && Array.isArray(sum.canvases), 'summary needs title, lang and canvases');
  need(!!m.license && str((m.license as {id?: unknown}).id), 'license.id is missing');
  need(!!m.generator && str((m.generator as {name?: unknown}).name), 'generator.name is missing');
  need(!!m.files && typeof m.files === 'object' && !Array.isArray(m.files), 'files is missing');
  for (const [p, f] of Object.entries(m.files as Record<string, {size?: unknown; sha256?: unknown}>)) {
    need(typeof f?.size === 'number' && typeof f.sha256 === 'string' && /^[0-9a-f]{64}$/.test(f.sha256), `files[${JSON.stringify(p)}] needs a size and a sha256`);
  }
  if (m.lineage !== undefined) {
    const l = m.lineage as {id?: unknown; revision?: unknown; relation?: unknown};
    need(str(l?.id) && (l.relation === 'remix' || l.relation === 'translation' || l.relation === 'player') && (l.revision === undefined || str(l.revision)), 'lineage needs an id, a relation ("remix", "translation" or "player") and, when it has one, a revision');
  }
  return m as unknown as BundleManifest;
}

/**
 * Whether these inflated entries are a bundle this reader accepts, and its manifest. Throws a BundleError naming the first thing wrong.
 * `entries` is every file of the ZIP by path; `spec` is the VisoTalk spec this reader speaks.
 */
export async function verifyBundle(entries: Map<string, Uint8Array>, spec = SPEC_VERSION): Promise<BundleManifest> {
  const mime = entries.get('mimetype');
  if (!mime || new TextDecoder().decode(mime) !== BUNDLE_MIME) throw new BundleError(`not a VisoTalk bundle: the "mimetype" entry is missing or is not ${BUNDLE_MIME}`);
  const raw = entries.get('manifest.json');
  if (!raw) throw new BundleError('manifest.json is missing');
  const m = parseManifest(new TextDecoder().decode(raw));
  if (!formatCompatible(m.formatVersion)) throw new BundleError(`bundle format ${m.formatVersion} is not one this reader knows (${BUNDLE_VERSION}); it was written by ${m.generator.name}${m.generator.version ? ` ${m.generator.version}` : ''}`);
  if (m.spec !== minorOf(spec) && !(m.spec==='0.6'&&minorOf(spec)==='0.7')) throw new BundleError(`the talk is written in VisoTalk spec ${m.spec}, this reader speaks ${minorOf(spec)}; open it with the ${m.generator.name}${m.generator.version ? ` ${m.generator.version}` : ''} that wrote it`);

  for (const path of entries.keys()) {
    const bad = pathIssue(path);
    if (bad) throw new BundleError(`${JSON.stringify(path)}: ${bad}`);
    if (path !== 'mimetype' && path !== 'manifest.json' && !Object.hasOwn(m.files, path)) throw new BundleError(`${path} is in the bundle but not listed in manifest.json`);
  }
  for (const [path, f] of Object.entries(m.files)) {
    const data = entries.get(path);
    if (!data) throw new BundleError(`${path} is listed in manifest.json but missing`);
    if (data.length !== f.size || (await sha256(data)) !== f.sha256) throw new BundleError(`${path} does not match the size and hash in manifest.json`);
    if (path.startsWith('source/')) {
      const bad = contentIssue(path, data);
      if (bad) throw new BundleError(`${path}: ${bad}`);
    }
  }
  if ((await revisionOf(m.files)) !== m.revision) throw new BundleError('revision does not match the files listed');

  const listed = (p: string | undefined, what: string) => {
    if (p !== undefined && !Object.hasOwn(m.files, p)) throw new BundleError(`${what} ${JSON.stringify(p)} is not in the bundle`);
  };
  const mixed = Object.keys(m.files).find((p) => (m.kind === 'source' ? p.startsWith('player/') : p.startsWith('source/') || p.startsWith('voice/')));
  if (mixed) throw new BundleError(`${mixed} does not belong in a ${m.kind} bundle: a source and a player are never in one file`);
  if (m.kind === 'source') {
    if (!m.entry?.startsWith('source/')) throw new BundleError('a source bundle needs entry under source/');
    listed(m.entry, 'entry');
  } else if (!Object.hasOwn(m.files, 'player/index.html')) throw new BundleError('a player bundle needs player/index.html');
  listed(m.cover, 'cover');
  for (const c of m.captions ?? []) listed(c.path, 'caption track');
  return m;
}

// ------------------------------------------------------------------------------------------------------------------------------ the ZIP

const STORED = /\.(mp4|m4a|mp3|jpe?g|png|webp|woff2?|zip)$/i;

/** Writes the ZIP: `mimetype` first and stored, the rest by path, every time and attribute pinned, so the same files make the same bytes */
export function zipBundle(entries: Map<string, Uint8Array>): Uint8Array {
  // DOS time has no zone and no year before 1980: a local 1980-01-01 00:00 writes the same bytes everywhere
  const epoch = new Date(1980, 0, 1);
  const tree: Zippable = {mimetype: [enc.encode(BUNDLE_MIME), {level: 0, mtime: epoch}]};
  for (const name of [...entries.keys()].filter((n) => n !== 'mimetype').sort()) tree[name] = [entries.get(name)!, {level: STORED.test(name) ? 0 : 6, mtime: epoch}];
  return zipSync(tree);
}

/** Reads a ZIP and refuses it, before inflating anything, if its directory is hostile; and if `mimetype` is not the stored first entry */
export function unzipBundle(bytes: Uint8Array): Map<string, Uint8Array> {
  const first = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const dec = new TextDecoder();
  const sniffs = bytes.length > 38 && first.getUint32(0, true) === 0x04034b50 && first.getUint16(8, true) === 0 && first.getUint16(26, true) === 8
    && dec.decode(bytes.subarray(30, 38)) === 'mimetype' && dec.decode(bytes.subarray(38, 38 + BUNDLE_MIME.length)) === BUNDLE_MIME;
  if (!sniffs) throw new BundleError(`not a VisoTalk bundle: a ZIP whose first entry is "mimetype", stored, reading ${BUNDLE_MIME}`);
  try {
    const claimed: Array<{name: string; size: number; originalSize: number}> = [];
    unzipSync(bytes, {filter: (f) => (claimed.push({name: f.name, size: f.size, originalSize: f.originalSize}), false)});
    const bad = zipIssue(claimed);
    if (bad) throw new BundleError(bad);
    return new Map(Object.entries(unzipSync(bytes)));
  } catch (e) {
    throw e instanceof BundleError ? e : new BundleError(`the ZIP is damaged: ${(e as Error).message}`);
  }
}

/** The bytes of a `.visotalk` file, opened and held to every rule: its manifest and the files it lists */
export async function openBundle(bytes: Uint8Array, spec = SPEC_VERSION): Promise<{manifest: BundleManifest; entries: Map<string, Uint8Array>}> {
  const entries = unzipBundle(bytes);
  return {manifest: await verifyBundle(entries, spec), entries};
}

// ------------------------------------------------------------------------------------------------------------------------------ a talk's files

/** `a/b/../c` as `a/c`; a path that climbs out of the root is undefined, or with `keepUp` keeps its leading `..` */
function normalised(path: string, keepUp = false): string | undefined {
  const out: string[] = [];
  for (const seg of path.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg !== '..') out.push(seg);
    else if (out.length && out[out.length - 1] !== '..') out.pop();
    else if (keepUp) out.push('..');
    else return undefined;
  }
  return out.join('/');
}
const dirOf = (path: string) => path.slice(0, Math.max(path.lastIndexOf('/'), 0));

/** The files `text` (a module at `from`) imports from its own project, as paths relative to the project root (`..` first when it climbs out); `exists` says which paths are files */
export function localImports(from: string, text: string, exists: (path: string) => boolean): string[] {
  const found: string[] = [];
  for (const m of text.matchAll(/(?:from|import)\s*\(?\s*['"](\.{1,2}\/[^'"]+)['"]/g)) {
    const base = normalised(`${dirOf(from)}/${m[1]}`, true)!;
    const bare = base.replace(/\.jsx?$/, '');
    const file = ['', '.ts', '.tsx', '.js', '/index.ts', '/index.tsx'].map((e) => base + e).concat(`${bare}.ts`, `${bare}.tsx`).find((f) => /\.[^/]+$/.test(f) && exists(f));
    if (file) found.push(file);
  }
  return found;
}

/**
 * Everything a talk takes with it, by path relative to the document's directory: the document, the files its code imports, its assets and a voice module
 * (which the document names but does not import). `read` gives a file's bytes, or undefined when there is none. A link, a file outside the directory or a
 * file that is not there is the exporter's to be told.
 */
export function sourceClosure(entry: string, read: (path: string) => Uint8Array | undefined): Map<string, Uint8Array> {
  const out = new Map<string, Uint8Array>();
  const dec = new TextDecoder();
  const take = (path: string, why: string) => {
    const clean = normalised(path);
    if (clean === undefined) throw new BundleError(`${why} is outside the project directory (${path}); a bundle holds only what is under it`);
    const data = out.get(clean) ?? read(clean);
    if (!data) throw new BundleError(`${why}: file not found: ${clean}`);
    out.set(clean, data);
    return clean;
  };
  const follow = (path: string, text: string) => {
    for (const f of localImports(path, text, (p) => read(p) !== undefined)) if (!out.has(f)) follow(take(f, `an import of ${path}`), dec.decode(out.get(f)!));
  };
  const doc = take(entry, 'the document');
  const parsed = parseMarkup(dec.decode(out.get(doc)!));
  follow(doc, parsed.prelude);
  for (const a of parsed.doc.assets ?? []) {
    if (/^https?:/.test(a.src)) throw new BundleError(`asset "${a.id}" is a link (${a.src}): a bundle holds its files, so download it into the project (media/) and name the file`);
    if (a.src.startsWith('/')) throw new BundleError(`asset "${a.id}" is outside the project directory (${a.src}); a bundle holds only what is under it`);
    take(`${dirOf(doc)}/${a.src}`, `asset "${a.id}"`);
  }
  const provider = parsed.doc.voice?.voice.indexOf(':') ?? -1;
  const module = provider > 0 ? parsed.doc.voice!.voice.slice(0, provider) : undefined;
  if (module && /^\.{0,2}\//.test(module)) {
    if (module.startsWith('/')) throw new BundleError(`the voice module is outside the project directory (${module}); a bundle holds only what is under it`);
    const path = take(`${dirOf(doc)}/${module}`, 'the voice module');
    follow(path, dec.decode(out.get(path)!));
  }
  return out;
}

export interface PackInput {
  /** the project's files by path relative to the document's directory (`sourceClosure`) */
  source: Map<string, Uint8Array>;
  /** the document, a key of `source` */
  entry: string;
  /** the prepared voice by path under `voice/`: `voice.json` and the clips it names; absent while the lines are not spoken */
  voice?: Map<string, Uint8Array>;
  cover?: {ext: 'jpg' | 'png' | 'webp'; data: Uint8Array};
  id: string;
  lineage?: BundleManifest['lineage'];
  generator: BundleManifest['generator'];
  created: Date;
}

/** What a talk's document and its voice make: how long it plays, its captions and the terms of its media. A line without a clip is an error: the voice is whole or absent. */
function derived(doc: VisoDoc, voiceJson: Uint8Array | undefined): {duration?: number; captions?: string} {
  if (!voiceJson) return {};
  const manifest = JSON.parse(new TextDecoder().decode(voiceJson)) as VoiceManifest;
  const missing = doc.scenes.flatMap((s) => s.lines).filter((l) => !manifest[l.id]?.audio);
  if (missing.length) throw new BundleError(`the voice has no clip for ${missing.map((l) => `"${l.id}"`).join(', ')}: speak the lines, then export`);
  const c = solve(doc, manifest, 30);
  return {duration: Math.round(c.duration * 100) / 100, captions: captionsSrt(c)};
}

/** The manifest of `files`, which every kind of bundle shares, and the ZIP: `files` gets its `manifest.json` here */
async function seal(kind: BundleKind, files: Map<string, Uint8Array>, doc: VisoDoc, input: {id: string; lineage?: BundleManifest['lineage']; generator: BundleManifest['generator']; created: Date}, extra: Partial<BundleManifest>, duration?: number) {
  for (const name of files.keys()) {
    const bad = pathIssue(name);
    if (bad) throw new BundleError(`${name}: ${bad}`);
  }
  const listed: BundleManifest['files'] = {};
  for (const [name, data] of files) listed[name] = {size: data.length, sha256: await sha256(data)};
  const obligations = [...new Set((doc.assets ?? []).flatMap((a) => a.license?.obligations ?? []))].sort();
  const manifest: BundleManifest = {
    format: BUNDLE_FORMAT, kind, formatVersion: BUNDLE_VERSION, id: input.id, revision: await revisionOf(listed),
    spec: doc.spec.split('.').slice(0, 2).join('.'),
    generator: input.generator,
    created: input.created.toISOString().replace(/\.\d+Z$/, 'Z'),
    summary: {
      title: doc.meta.title, ...(doc.meta.description && {description: doc.meta.description}), lang: doc.meta.lang,
      ...(duration !== undefined && {duration}), canvases: (doc.canvas?.presets ?? []).map((c) => c.id), ...(obligations.length && {obligations}),
    },
    ...extra,
    license: {id: 'all-rights-reserved'},
    ...(input.lineage && {lineage: input.lineage}),
    files: listed,
  };
  files.set('manifest.json', enc.encode(JSON.stringify(manifest, null, 1) + '\n'));
  return {manifest, bytes: zipBundle(files)};
}

/** The talk as a source bundle: its manifest and the ZIP. Captions, the duration and the credits are made here from the document and its voice. */
export async function packBundle(input: PackInput): Promise<{manifest: BundleManifest; bytes: Uint8Array}> {
  const dec = new TextDecoder();
  const doc = parseMarkup(dec.decode(input.source.get(input.entry)!)).doc;
  const files = new Map<string, Uint8Array>();
  for (const [path, data] of input.source) files.set(`source/${path}`, data);
  const made = derived(doc, input.voice?.get('voice.json'));
  if (input.voice) {
    const manifest = JSON.parse(dec.decode(input.voice.get('voice.json'))) as VoiceManifest;
    for (const v of Object.values(manifest)) if (!input.voice.has(v.audio)) throw new BundleError(`voice.json names ${v.audio}, which is not there`);
    for (const [path, data] of input.voice) files.set(`voice/${path}`, data);
    files.set(`captions/${doc.meta.lang}.srt`, enc.encode(made.captions!));
  }
  files.set('credits.md', enc.encode(creditsMarkdown(doc)));
  if (input.cover) files.set(`cover/cover.${input.cover.ext}`, input.cover.data);
  return seal('source', files, doc, input, {
    entry: `source/${input.entry}`,
    ...(input.cover && {cover: `cover/cover.${input.cover.ext}`}),
    ...(input.voice && {captions: [{lang: doc.meta.lang, path: `captions/${doc.meta.lang}.srt`}], voice: doc.voice?.voice ? {voice: doc.voice.voice} : {}}),
  }, made.duration);
}

export interface PlayerPackInput {
  /** the built player by path under `player/`: `index.html`, `app.js`, the audio, the assets, the fonts. Never the document. */
  player: Map<string, Uint8Array>;
  /** the text of the document the player was built from: the summary, the credits and the captions are made from it, and it is not put in the bundle */
  docText: string;
  /** the voice manifest the player was built with, for the captions and the length; absent when the exporter has none */
  voiceJson?: Uint8Array;
  cover?: PackInput['cover'];
  id: string;
  /** the source bundle this is the built form of */
  lineage?: BundleManifest['lineage'];
  generator: BundleManifest['generator'];
  created: Date;
}

/** The built form of a talk as a bundle: it plays wherever a static page does, and has no document to open (`kind: "player"`). */
export async function packPlayerBundle(input: PlayerPackInput): Promise<{manifest: BundleManifest; bytes: Uint8Array}> {
  if (!input.player.has('index.html')) throw new BundleError('a player is the output of build: it has an index.html');
  const doc = parseMarkup(input.docText).doc;
  const made = derived(doc, input.voiceJson);
  const files = new Map<string, Uint8Array>();
  for (const [path, data] of input.player) files.set(`player/${path}`, data);
  if (made.captions) files.set(`captions/${doc.meta.lang}.srt`, enc.encode(made.captions));
  files.set('credits.md', enc.encode(creditsMarkdown(doc)));
  if (input.cover) files.set(`cover/cover.${input.cover.ext}`, input.cover.data);
  return seal('player', files, doc, input, {
    ...(input.cover && {cover: `cover/cover.${input.cover.ext}`}),
    ...(made.captions && {captions: [{lang: doc.meta.lang, path: `captions/${doc.meta.lang}.srt`}]}),
  }, made.duration);
}
