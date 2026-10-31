/**
 * `visotalk export` and `visotalk import`: a talk as one `.visotalk` file and back. What a bundle is, and the rules it is
 * held to, are `@visotalk/ir/bundle`'s; this file gathers the files of a project directory into one and places a bundle's files in a new one.
 */
import {randomUUID} from 'node:crypto';
import {tmpdir} from 'node:os';
import {existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, rmdirSync, statSync, writeFileSync} from 'node:fs';
import {basename, dirname, extname, join, resolve, sep} from 'node:path';
import {BUNDLE_LIMITS, BundleError, openBundle, packBundle, packPlayerBundle, sourceClosure, type BundleManifest} from '@visotalk/ir/bundle';
import {ID_PATTERN, MarkupError, parseMarkup, type VoiceManifest} from '@visotalk/ir';
import {buildPlayer, check, load, narrationPending, voiceProvider, type Project} from './project.ts';

const dec = new TextDecoder();

/** What the work directory remembers about the talk's place in a family of bundles */
interface BundleState {
  id: string;
  lineage?: BundleManifest['lineage'];
}
const statePath = (work: string) => join(work, 'bundle.json');

export interface ExportOptions {
  /** a picture for `cover/` (jpg, png or webp) */
  cover?: string;
  /** the built form of the talk (`kind: "player"`) instead of its source */
  player?: boolean;
}

/** The regular files under `dir`, by path with `/`. */
function filesUnder(dir: string, base = ''): Array<[string, string]> {
  return readdirSync(join(dir, base), {withFileTypes: true}).flatMap((e) => {
    const rel = base ? `${base}/${e.name}` : e.name;
    return e.isDirectory() ? filesUnder(dir, rel) : e.isFile() ? [[rel, join(dir, rel)] as [string, string]] : [];
  });
}

/** A work-owned style is a complete pack, including unused guidance, parts, demos and assets. */
function styleFiles(dir: string): Map<string, Uint8Array> {
  const out = new Map<string, Uint8Array>();
  const root = lstatSync(join(dir, 'style'), {throwIfNoEntry: false});
  if (!root) return out;
  if (!root.isDirectory()) throw new BundleError('style/ must be a directory, never a link');
  let bytes = 0;
  const walk = (relative: string) => {
    for (const entry of readdirSync(join(dir, relative), {withFileTypes: true})) {
      // These are local credentials, caches and harness state, not pack content.
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const path = `${relative}/${entry.name}`;
      if (entry.isDirectory()) walk(path);
      else {
        if (!entry.isFile()) throw new BundleError(`${path}: a style pack cannot contain links or special files`);
        bytes += lstatSync(join(dir, path)).size;
        if (bytes > BUNDLE_LIMITS.bytes || out.size >= BUNDLE_LIMITS.entries) throw new BundleError('style/ exceeds the bundle file or size budget');
        out.set(path, readFileSync(join(dir, path)));
      }
    }
  };
  walk('style');
  return out;
}

function write(out: string, packed: {manifest: BundleManifest; bytes: Uint8Array}, voice: boolean) {
  mkdirSync(dirname(resolve(out)), {recursive: true});
  writeFileSync(out, packed.bytes);
  return {manifest: packed.manifest, bytes: packed.bytes.length, voice};
}

/** Writes the talk as a bundle at `out`; returns what was written */
export async function exportBundle(p: Project, out: string, opts: ExportOptions = {}): Promise<{manifest: BundleManifest; bytes: number; voice: boolean}> {
  const style = styleFiles(p.dir);
  const read = (rel: string) => style.get(rel) ?? (statSync(join(p.dir, rel), {throwIfNoEntry: false})?.isFile() ? readFileSync(join(p.dir, rel)) : undefined);
  const source = sourceClosure(basename(p.file), read);
  for (const [path, data] of style) source.set(path, data);

  let voice: Map<string, Uint8Array> | undefined;
  if (!narrationPending(p)) {
    const json = readFileSync(join(p.work, 'voice.json'));
    voice = new Map([['voice.json', json]]);
    for (const v of Object.values(JSON.parse(dec.decode(json)) as VoiceManifest)) {
      if (!v.audio && p.doc.voice?.voice?.startsWith('recording:')) continue;
      const abs = resolve(p.work, v.audio);
      if (!abs.startsWith(p.work + sep) || !existsSync(abs)) throw new BundleError(`voice.json names ${v.audio}, which is not in ${p.work}`);
      voice.set(v.audio, readFileSync(abs));
    }
  }
  let cover: {ext: 'jpg' | 'png' | 'webp'; data: Uint8Array} | undefined;
  if (opts.cover) {
    const ext = extname(opts.cover).toLowerCase().slice(1).replace('jpeg', 'jpg');
    if (ext !== 'jpg' && ext !== 'png' && ext !== 'webp') throw new BundleError(`the cover is a jpg, png or webp picture (got ${basename(opts.cover)})`);
    cover = {ext, data: readFileSync(opts.cover)};
  }

  const state: BundleState = existsSync(statePath(p.work)) ? JSON.parse(readFileSync(statePath(p.work), 'utf8')) : {id: randomUUID()};
  writeFileSync(statePath(p.work), JSON.stringify(state, null, 1));
  const created = process.env.SOURCE_DATE_EPOCH ? new Date(Number(process.env.SOURCE_DATE_EPOCH) * 1000) : new Date();
  const common = {cover, id: state.id, generator: {name: 'visotalk-cli'}, created};
  const packed = await packBundle({source, entry: basename(p.file), voice, lineage: state.lineage, ...common});
  if (!opts.player) return write(out, packed, !!voice);
  // the built form: what `build` makes, of the very document that is the source bundle, the voice kept as it is
  if (!voice) throw new BundleError('a player is built with the real narration: run prepare, then export --player');
  const dist = mkdtempSync(join(tmpdir(), 'visotalk-player-'));
  try {
    await buildPlayer(p, {out: dist});
    const player = new Map(filesUnder(dist).map(([rel, abs]) => [rel, readFileSync(abs)] as const));
    const built = await packPlayerBundle({player, docText: dec.decode(source.get(basename(p.file))!), voiceJson: voice.get('voice.json'), lineage: {id: state.id, revision: packed.manifest.revision, relation: 'player'}, ...common});
    return write(out, built, true);
  } finally {
    rmSync(dist, {recursive: true, force: true});
  }
}

export interface ImportOptions {
  /** start a talk of its own from this one: a new `id`, the old one kept as `lineage` */
  remix?: boolean;
  /** a voice module is code that runs with the environment's keys when the narration is prepared */
  allowVoiceModule?: boolean;
}

/**
 * Unpacks a source bundle into `dir` (which must not exist, or be empty) and checks the talk as any document is checked.
 * Nothing in it is run. A bundle that fails any rule leaves nothing behind.
 */
export async function importBundle(file: string, dir: string, opts: ImportOptions = {}): Promise<{dir: string; entry: string; manifest: BundleManifest; project: Project}> {
  const target = resolve(dir);
  if (existsSync(target) && readdirSync(target).length) throw new Error(`${target} is not empty: import unpacks into a new directory`);
  const {manifest, entries} = await openBundle(readFileSync(file));
  if (manifest.kind !== 'source') throw new BundleError('this is a player bundle: it plays, and has no document to open. Play it with "visotalk play"; import needs a source bundle');
  let doc;
  try {
    doc = parseMarkup(dec.decode(entries.get(manifest.entry!)!)).doc;
  } catch (e) {
    throw new BundleError(`${manifest.entry} is not a VisoTalk document: ${e instanceof MarkupError ? e.message : (e as Error).message}`);
  }
  // the id names a directory in the project: a bundle that makes it a path is refused before anything is written
  if (!ID_PATTERN.test(doc.meta.id)) throw new BundleError(`the document id "${doc.meta.id}" is not a valid id`);
  const provider = voiceProvider(doc.voice?.voice)?.provider;
  if (provider && /^\.{0,2}\//.test(provider) && !opts.allowVoiceModule) {
    throw new BundleError(`the voice of this talk is a module (${provider}): preparing the narration runs it, outside any sandbox, with your environment's keys. Read it in the bundle (source/${provider.replace(/^\.\//, '')}), then import with --allow-voice-module`);
  }

  mkdirSync(dirname(target), {recursive: true});
  const tmp = mkdtempSync(join(dirname(target), '.visotalk-import-'));
  try {
    const entryRel = manifest.entry!.slice('source/'.length);
    const work = join(tmp, dirname(entryRel), '.visotalk', doc.meta.id);
    for (const [name, data] of entries) {
      const dest = name.startsWith('source/') ? join(tmp, name.slice('source/'.length)) : name.startsWith('voice/') ? join(work, name.slice('voice/'.length)) : undefined;
      if (!dest) continue; // derived parts (cover, captions, credits) and anything this reader does not know stay in the bundle
      mkdirSync(dirname(dest), {recursive: true});
      writeFileSync(dest, data);
    }
    mkdirSync(work, {recursive: true});
    const state: BundleState = opts.remix
      ? {id: randomUUID(), lineage: {id: manifest.id, revision: manifest.revision, relation: 'remix'}}
      : {id: manifest.id, ...(manifest.lineage && {lineage: manifest.lineage})};
    writeFileSync(statePath(work), JSON.stringify(state, null, 1));
    const issues = check(load(join(tmp, entryRel)));
    if (issues.length) throw new BundleError(`the document is not valid: ${issues.slice(0, 5).map((i) => `${i.code} ${i.at}: ${i.message}`).join('; ')}${issues.length > 5 ? `; … ${issues.length - 5} more` : ''}`);
    if (existsSync(target)) rmdirSync(target);
    renameSync(tmp, target);
  } catch (e) {
    rmSync(tmp, {recursive: true, force: true});
    throw e;
  }
  const project = load(join(target, manifest.entry!.slice('source/'.length)));
  return {dir: target, entry: project.file, manifest, project};
}
