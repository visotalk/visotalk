/**
 * The public motion catalogue at motionhub.dev (github.com/motionhub-dev/motions, its HUB.md): search its index, fetch a motion as a VisoTalk pack, and
 * share one there (`shareMotion`).
 * The catalogue is engine-neutral: a motion there is the format's files (motion.json, MOTION.md, tokens.json, poster.jpg, CREDITS.md) and, in `react/`,
 * the components any React engine draws through @motionhub/runtime, their assets and previews. `toHub` writes that from a pack; `packFromHub` makes a
 * pack from it again (the theme from tokens.json, the components from react/), without what only a pack holds: a sample, pacing, voice and locks.
 */
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {cpSync,mkdirSync,mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join,resolve} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {checkMotion} from '@motionhub/cli';
import {BUNDLED,FONTS} from './fonts.ts';
import {MOTION_SECTIONS,MOTION_TAGS} from '@visotalk/ir/motions';

export const MOTIONHUB = 'https://motionhub.dev';
const TIMEOUT_MS = 20_000;

/** One row of the catalogue's index (`/api/motions.json`) */
export type HubMotion = {
  slug: string; version: string; name: Record<string,string>; line: Record<string,string>; lang?: string; tags: string[];
  authors: {name: string; github: string}[]; license: {text: string; code?: string}; poster: string; tools: string[];
  package: {url: string; sha256: string; bytes: number};
};

async function get(url: string): Promise<Response> {
  let res: Response;
  try {res = await fetch(url, {signal: AbortSignal.timeout(TIMEOUT_MS)});}
  catch (error) {throw new Error(`motionhub.dev could not be reached (${(error as Error).message}); the built-in motions still work offline`);}
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res;
}

export async function hubIndex(base = MOTIONHUB): Promise<HubMotion[]> {
  const index = await (await get(`${base}/api/motions.json`)).json() as {spec?: string; motions?: HubMotion[]};
  if (index.spec !== 'motion/0.1' || !Array.isArray(index.motions)) throw new Error(`The catalogue's index is in a format this CLI does not know (${index.spec}); update it with npx visotalk@latest`);
  return index.motions;
}

/** The rows that contain every word, in their slug, names, lines or tags */
export function searchHub(rows: HubMotion[], words: string[]): HubMotion[] {
  const wanted = words.map((w) => w.toLowerCase()).filter(Boolean);
  return rows.filter((m) => {
    const text = [m.slug, ...Object.values(m.name), ...Object.values(m.line), ...m.tags].join(' ').toLowerCase();
    return wanted.every((w) => text.includes(w));
  });
}

/** The regular files of a ustar archive, by path; links and other special entries are refused */
export function untar(tar: Uint8Array): Map<string,Uint8Array> {
  const out = new Map<string,Uint8Array>();
  const text = (at: number, width: number) => Buffer.from(tar.subarray(at, at + width)).toString('utf8').replace(/\0.*$/s, '');
  for (let at = 0; at + 512 <= tar.length;) {
    if (tar.subarray(at, at + 512).every((b) => b === 0)) break;
    const name = text(at, 100), prefix = text(at + 345, 155), size = parseInt(text(at + 124, 12).trim() || '0', 8), type = String.fromCharCode(tar[at + 156] || 48);
    if (!Number.isFinite(size) || size < 0 || at + 512 + size > tar.length) throw new Error('The package is not a valid archive');
    const path = prefix ? `${prefix}/${name}` : name;
    if (type === '0') out.set(path, tar.slice(at + 512, at + 512 + size));
    else if (type !== '5') throw new Error(`The package holds a link or special file: ${path}`);
    at += 512 + Math.ceil(size / 512) * 512;
  }
  return out;
}

/** A gzipped package checked against its SHA-256, as a VisoTalk pack under motion/ */
export function packFromPackage(row: HubMotion, gz: Uint8Array): Map<string,Uint8Array> {
  if (createHash('sha256').update(gz).digest('hex') !== row.package.sha256) throw new Error(`${row.slug} ${row.version}: the package does not match the catalogue's SHA-256`);
  const files = untar(gunzipSync(gz)), motion = new Map<string,Uint8Array>(), root = `${row.slug}/`;
  for (const [path, data] of files) {
    if (!path.startsWith(root) || path.split('/').some((p) => p === '..' || p === '.' || !p)) throw new Error(`The package holds a file outside its motion: ${path}`);
    motion.set(path.slice(root.length), data);
  }
  return packFromHub(motion);
}

/** A catalogue motion by its slug, as a VisoTalk pack, or undefined when the catalogue has no such slug */
export async function hubMotion(slug: string, base = MOTIONHUB): Promise<Map<string,Uint8Array> | undefined> {
  const row = (await hubIndex(base)).find((m) => m.slug === slug);
  if (!row) return undefined;
  return packFromPackage(row, new Uint8Array(await (await get(new URL(row.package.url, base).href)).arrayBuffer()));
}

const GENERIC = new Set(['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-monospace', 'ui-sans-serif', 'ui-serif']);
const VIDEO = new Set(['.mp4', '.webm', '.mov', '.mkv', '.m4v']);

/** A CSS font stack as a list of family names, quotes removed */
export function families(stack: string): string[] {
  return stack.split(',').map((f) => f.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
}

/** `#RRGGBB` as a DTCG colour value in sRGB */
export function color(hex: string) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new Error(`not a #RRGGBB colour: ${hex}`);
  const n = parseInt(m[1], 16);
  const components = [n >> 16, (n >> 8) & 255, n & 255].map((c) => Math.round((c / 255) * 10000) / 10000);
  return {colorSpace: 'srgb', components, hex: `#${m[1].toUpperCase()}`};
}

/** A line within the format's 160 characters: whole if it fits, otherwise its first clause (up to a colon, semicolon or comma) */
export function shortLine(line: string): string {
  if ([...line].length <= 160) return line;
  const cut = /^[^:;]+?(?=[:;])/.exec(line)?.[0] ?? /^[^,]+?(?=,)/.exec(line)?.[0] ?? '';
  return cut && [...cut].length <= 160 ? `${cut.trim()}.` : '';
}

const GENERATED = /^<!-- Generated by visotalk motion check[^\n]*-->\n/m;
/**
 * A pack's MOTION.md for the catalogue: the format's headings start with a word, so section numbers are dropped and "Pitfalls" is headed "Avoid";
 * the component index names the components where the catalogue keeps them (react/parts/), and loses the note on how VisoTalk writes it
 */
export function motionDoc(text: string): string {
  return text.replace(GENERATED, '').replace(/^## \d+\.\s+/gm, '## ').replace(/^## Pitfalls\b/gm, '## Avoid: pitfalls').replace(/\(`parts\//g, '(`react/parts/');
}
/** A catalogue MOTION.md as a pack's: the eleven sections numbered again when it has them all, in order; otherwise as it is */
export function packDoc(text: string): string {
  const doc = text.replace(/^## Avoid: pitfalls\b/gm, '## Pitfalls').replace(/\(`react\/parts\//g, '(`parts/');
  const headings = [...doc.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
  if (headings.length !== MOTION_SECTIONS.length || !headings.every((h, i) => h.startsWith(MOTION_SECTIONS[i]))) return doc;
  let n = 0;
  return doc.replace(/^## /gm, () => `## ${++n}. `);
}

/** The version after `published` for a pack whose own version has this major: the next patch, or a new major's first */
export function nextVersion(published: string | undefined, major: number): string {
  if (!published) return `${major}.0.0`;
  const [ma, mi, pa] = published.split(/[.+-]/).map(Number);
  return ma === major ? `${ma}.${mi}.${pa + 1}` : ma < major ? `${major}.0.0` : `${ma}.${mi}.${pa + 1}`;
}

/** A CSS colour (`#RRGGBB`, `rgb(…)`, `rgba(…)`) as a DTCG colour; the last such colour in anything else (a layered background) */
export function cssColor(css: string): ReturnType<typeof color> & {alpha?: number} | undefined {
  const all = [...css.matchAll(/#[0-9a-f]{6}\b|rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)/gi)];
  const m = all.at(-1);
  if (!m) return undefined;
  if (m[0].startsWith('#')) return color(m[0]);
  const hex = `#${[m[1], m[2], m[3]].map((c) => Math.round(+c).toString(16).padStart(2, '0')).join('')}`;
  const a = m[4] === undefined ? 1 : +m[4];
  return {...color(hex), ...(a < 1 && {alpha: a})};
}
/** A CSS shadow list (`0 2px 12px rgba(…), …`) as DTCG shadows */
export function cssShadow(css: string) {
  return css.split(/,(?![^(]*\))/).map((one) => {
    const tint = /(#[0-9a-f]{6}|rgba?\([^)]*\))/i.exec(one)?.[0] ?? '#000000';
    const [x = 0, y = 0, blur = 0, spread = 0] = one.replace(tint, '').trim().split(/\s+/).map((n) => parseFloat(n) || 0);
    const dim = (value: number) => ({value, unit: 'px'});
    return {color: cssColor(tint), offsetX: dim(x), offsetY: dim(y), blur: dim(blur), spread: dim(spread)};
  });
}
const colorToken = (v: string) => ({$type: 'color', $value: cssColor(v)});
const px = (v: number) => ({$type: 'dimension', $value: {value: v, unit: 'px'}});

/**
 * The caption skin as the `caption` group @motionhub/runtime's <Caption> reads: font (an alias of a font token), size, weight, color, background
 * (left out for 'none'; a layered background keeps its last colour), radius, padding-y, padding-x, bottom, max-width, shadow (DTCG shadows, drawn as a text shadow), and rule-left or rule-top (the rule's colour)
 */
export function captionTokens(k: Record<string, any>, fonts: Record<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const face = k.font ?? 'sans';
  // a face the motion does not name is drawn in its sans, as VisoTalk draws a missing display face
  if (fonts[face] || fonts.sans) out.font = {$type: 'fontFamily', $value: `{font.${fonts[face] ? face : 'sans'}}`};
  if (k.size !== undefined) out.size = px(k.size);
  if (k.weight !== undefined) out.weight = {$type: 'fontWeight', $value: k.weight};
  if (k.color) out.color = colorToken(k.color);
  if (k.background && k.background !== 'none') out.background = colorToken(k.background);
  if (k.radius !== undefined) out.radius = px(k.radius);
  if (k.padding) { out['padding-y'] = px(k.padding[0]); out['padding-x'] = px(k.padding[1]); }
  if (k.bottom !== undefined) out.bottom = px(k.bottom);
  if (k.maxWidth !== undefined) out['max-width'] = px(k.maxWidth);
  if (k.shadow) out.shadow = {$type: 'shadow', $value: cssShadow(k.shadow)};
  if (k.rule) out[k.ruleSide === 'left' ? 'rule-left' : 'rule-top'] = colorToken(k.rule);
  return out;
}

export type HubIdentity = {slug: string; version: string; authors: {name: string; github: string}[]; license: {text: string; code: string}; credit: string};

const TOOL = 'react/';
/** The pack's paths the catalogue keeps, under react/: the components, the files they import, their previews, the reel the catalogue plays and its sound */
const SHARED = /^motion\/((parts|assets|previews)\/|reel\.tsx$|sound\.json$)/;

/**
 * A VisoTalk pack (paths under motion/) in the catalogue's format (its SPEC.md, motion/0.1), by path within the motion: motion.json, MOTION.md with
 * its headings as the format reads them, tokens.json (colours, font stacks and the caption skin as W3C design tokens), poster.jpg, CREDITS.md (`credit`,
 * the faces, all from the engine's open catalogue, and the components' assets), and react/ with the components, their assets and previews. The sample,
 * pacing, voice and locks stay with the pack. It refuses a pack whose name, line, colours or faces do not fit the format, or that has no poster.
 */
export function toHub(pack: Map<string,Uint8Array>, id: HubIdentity): {files: Map<string,Uint8Array>; leftOut: string[]} {
  const text = (path: string) => (pack.has(path) ? Buffer.from(pack.get(path)!).toString('utf8') : '');
  const src = JSON.parse(text('motion/motion.json') || '{}');
  const problems: string[] = [];
  const name = src.name ?? {};
  if (!name.en || [...name.en].length > 60) problems.push('its name in English (name.en in motion.json) is missing or longer than 60 characters');
  const line = shortLine(src.line ?? '');
  if (!line) problems.push('its line (motion.json) is missing, or longer than 160 characters with no first clause that fits');
  const tokens = src.theme?.tokens ?? {};
  const fontStacks: Record<string,string> = tokens.fonts ?? {};
  const known = new Set([...FONTS.map((f) => f.family), ...BUNDLED]);
  const used = [...new Set(Object.values(fontStacks).flatMap(families).filter((f) => !GENERIC.has(f)))];
  for (const f of used) if (!known.has(f)) problems.push(`the face "${f}" is not one of the engine's open faces, so its licence is unknown`);
  if (!Object.keys(tokens.colors ?? {}).length || !Object.keys(fontStacks).length) problems.push('its theme has no colours or no faces');
  if (!pack.has('motion/MOTION.md')) problems.push('it has no MOTION.md');
  if (!pack.has('motion/poster.jpg')) problems.push('it has no poster.jpg: a frame of a film made in it, 960 to 3840 pixels wide and at most 500 KB (visotalk still doc.tsx --time SECONDS --out motion/poster.jpg)');
  if (problems.length) throw new Error(`${id.slug} cannot be shared: ${problems.join('; ')}`);

  const files = new Map<string,Uint8Array>();
  const put = (path: string, data: string | Uint8Array) => files.set(path, typeof data === 'string' ? Buffer.from(data) : data);
  put('motion.json', JSON.stringify({spec: 'motion/0.1', slug: id.slug, version: id.version, name, line: {en: line}, authors: id.authors, license: id.license, lang: 'en', ...(src.tags?.length ? {tags: src.tags} : {})}, null, 2) + '\n');
  put('tokens.json', JSON.stringify({
    color: {$type: 'color', ...Object.fromEntries(Object.entries(tokens.colors as Record<string,string>).map(([k, v]) => [k, {$value: cssColor(v)}]))},
    font: {$type: 'fontFamily', ...Object.fromEntries(Object.entries(fontStacks).map(([k, v]) => [k, {$value: families(v)}]))},
    ...(tokens.caption && {caption: captionTokens(tokens.caption, fontStacks)}),
  }, null, 2) + '\n');
  put('MOTION.md', motionDoc(text('motion/MOTION.md')));
  put('poster.jpg', pack.get('motion/poster.jpg')!);
  const leftOut: string[] = [];
  for (const [path, data] of pack) {
    if (!SHARED.test(path)) continue;
    const rel = path.slice('motion/'.length);
    if (VIDEO.has(rel.slice(rel.lastIndexOf('.')).toLowerCase())) { leftOut.push(rel); continue; }
    put(TOOL + rel, data);
  }
  const own = [...files.keys()].filter((r) => r.startsWith(`${TOOL}assets/`));
  put('CREDITS.md', [
    '# Credits', '', id.credit, '', '## Fonts', '',
    ...(used.length ? used.map((f) => `- ${f}: SIL Open Font License 1.1`) : ['- None beyond the system faces.']),
    ...(own.length ? ['', '## Assets', '', ...own.map((r) => `- \`${r}\`: its source and licence are given in MOTION.md`)] : []),
    '',
  ].join('\n'));
  return {files, leftOut};
}

/** A DTCG colour as CSS: #RRGGBB, or rgba() when it has an alpha below 1 */
function cssOf(v: any): string | undefined {
  if (typeof v === 'string') return v;
  if (!v || typeof v !== 'object') return undefined;
  const hex = v.hex ?? `#${(v.components ?? [0, 0, 0]).map((c: number) => Math.round(c * 255).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
  if (v.alpha === undefined || v.alpha >= 1) return hex;
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${v.alpha})`;
}
const pxOf = (v: any): number | undefined => (typeof v === 'number' ? v : v?.unit === 'rem' ? v.value * 16 : v?.value);
const stackOf = (v: unknown): string => [v].flat().map((f) => (GENERIC.has(String(f)) ? String(f) : `"${f}"`)).join(', ');

/**
 * A catalogue motion (paths within it) as a VisoTalk pack under motion/: motion.json with a theme from tokens.json (its colours, font stacks, and a caption
 * skin from the caption group; the dark or light base by its ground), MOTION.md numbered again when it has the eleven sections, the poster, and react/
 * as the pack's parts, assets and previews. A motion with no react/ is a theme and its guidance.
 */
export function packFromHub(motion: Map<string,Uint8Array>): Map<string,Uint8Array> {
  const text = (path: string) => (motion.has(path) ? Buffer.from(motion.get(path)!).toString('utf8') : '');
  const manifest = JSON.parse(text('motion.json') || '{}'), dtcg = JSON.parse(text('tokens.json') || '{}');
  if (!manifest.slug || !motion.has('MOTION.md')) throw new Error('The package is not a motion: it needs motion.json, MOTION.md and tokens.json');
  const lookup = (ref: string) => ref.slice(1, -1).split('.').reduce((o: any, k) => o?.[k], dtcg)?.$value;
  const value = (node: any) => (typeof node?.$value === 'string' && /^\{[^{}]+\}$/.test(node.$value) ? lookup(node.$value) : node?.$value);
  const group = (name: string) => Object.entries(dtcg[name] ?? {}).filter(([k]) => !k.startsWith('$')) as [string, any][];
  const colors = Object.fromEntries(group('color').map(([k, v]) => [k, cssOf(value(v))]).filter(([, v]) => v));
  const fonts = Object.fromEntries(group('font').map(([k, v]) => [k, stackOf(value(v))]));
  if (!fonts.sans && Object.keys(fonts).length) fonts.sans = Object.values(fonts)[0];
  const c = Object.fromEntries(group('caption')) as Record<string, any>;
  const caption: Record<string, unknown> = {};
  const face = /^\{font\.(sans|display|mono)\}$/.exec(c.font?.$value ?? '')?.[1];
  if (face) caption.font = face;
  for (const [k, to] of [['size', 'size'], ['radius', 'radius'], ['bottom', 'bottom'], ['max-width', 'maxWidth']] as const) if (c[k]) caption[to] = pxOf(value(c[k]));
  if (c.weight) caption.weight = value(c.weight);
  if (c.color) caption.color = cssOf(value(c.color));
  caption.background = c.background ? cssOf(value(c.background)) : 'none';
  if (c['padding-y'] || c['padding-x']) caption.padding = [pxOf(value(c['padding-y'])) ?? 10, pxOf(value(c['padding-x'])) ?? 26];
  if (c.shadow) caption.shadow = [value(c.shadow)].flat().map((s: any) => (typeof s === 'string' ? s : `${pxOf(s.offsetX) ?? 0}px ${pxOf(s.offsetY) ?? 0}px ${pxOf(s.blur) ?? 0}px${pxOf(s.spread) ? ` ${pxOf(s.spread)}px` : ''} ${cssOf(s.color) ?? '#000000'}`)).join(', ');
  const rule = c['rule-left'] ?? c['rule-top'];
  if (rule) Object.assign(caption, {rule: cssOf(value(rule)), ruleSide: c['rule-left'] ? 'left' : 'top'});
  // the base theme by the ground: a light ground starts from the light theme's colours, a dark one from the dark theme's
  const ground = /^#([0-9a-f]{6})$/i.exec(String(colors.bg ?? colors.paper ?? colors.ground ?? ''))?.[1];
  const light = ground ? [0, 2, 4].reduce((sum, i, j) => sum + parseInt(ground.slice(i, i + 2), 16) * [0.299, 0.587, 0.114][j], 0) > 140 : (manifest.tags ?? []).includes('light');
  const config = {
    slug: manifest.slug, version: String(manifest.version ?? '1').split('.')[0], name: manifest.name, line: manifest.line?.en ?? Object.values(manifest.line ?? {})[0],
    ...(manifest.tags && {tags: manifest.tags.filter((t: string) => (MOTION_TAGS as readonly string[]).includes(t))}),
    basedOn: null, theme: {id: light ? 'visotalk/light' : 'visotalk/dark', tokens: {colors, fonts, ...(group('caption').length && {caption})}}, locked: [],
  };
  if (config.tags && (config.tags.length < 2 || config.tags.length > 6)) delete config.tags;
  const pack = new Map<string,Uint8Array>();
  pack.set('motion/motion.json', Buffer.from(JSON.stringify(config, null, 2) + '\n'));
  pack.set('motion/MOTION.md', Buffer.from(packDoc(text('MOTION.md'))));
  if (motion.has('poster.jpg')) pack.set('motion/poster.jpg', motion.get('poster.jpg')!);
  for (const [path, data] of motion) if (path.startsWith(TOOL) && /^((parts|assets|previews)\/|reel\.tsx$|sound\.json$)/.test(path.slice(TOOL.length))) pack.set(`motion/${path.slice(TOOL.length)}`, data);
  return pack;
}

const REPO = 'motionhub-dev/motions';
const run = (cmd: string, args: string[], cwd?: string) => spawnSync(cmd, args, {cwd, encoding: 'utf8'});
/** A command that must succeed; its error says which step failed and why */
function must(cmd: string, args: string[], cwd?: string): string {
  const r = run(cmd, args, cwd);
  if (r.error || r.status !== 0) throw new Error(`${cmd} ${args.slice(0, 2).join(' ')} failed: ${(r.stderr || r.error?.message || '').trim()}`);
  return r.stdout.trim();
}

export type ShareOptions = {slug?: string; github?: string; license?: string; out?: string; pr?: boolean};

/**
 * Share a pack on the public catalogue: convert it (`toHub`) under the person's GitHub account, check it with the catalogue's own checker
 * (@motionhub/cli, the same rules its pull requests run, a change to a published slug against its published authors and version), write it to
 * `<out>/<slug>/` (out: ./motionhub), and with `pr` open the pull request from the person's fork, signed off as their git identity. Nothing is published without `pr`.
 */
export async function shareMotion(pack: Map<string,Uint8Array>, options: ShareOptions, base = MOTIONHUB): Promise<string> {
  const config = JSON.parse(Buffer.from(pack.get('motion/motion.json') ?? new Uint8Array()).toString('utf8') || '{}');
  const user = options.github ? undefined : run('gh', ['api', 'user']);
  const account = options.github ? {login: options.github, name: options.github} : user && !user.error && user.status === 0 ? JSON.parse(user.stdout) as {login: string; name?: string} : undefined;
  if (!account?.login) throw new Error('Sharing needs your GitHub account: sign in with gh (gh auth login), or pass --github <login>');
  const slug = options.slug ?? config.slug;
  if (typeof slug !== 'string' || !/^(?=.{3,40}$)[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error(`"${slug}" is not a catalogue slug (3 to 40 characters of a-z, 0-9 and single hyphens); choose one with --slug`);
  const published = (await hubIndex(base)).find((m) => m.slug === slug);
  if (published && !published.authors.some((a) => a.github.toLowerCase() === account.login.toLowerCase())) {
    throw new Error(`${slug} is already published by ${published.authors.map((a) => a.github).join(', ')}; share yours under another slug (--slug)`);
  }
  const [text, code] = (options.license ?? 'CC-BY-4.0,MIT').split(',');
  // a pack names what it started from in basedOn; a work's copy of a motion still carries that motion's slug, so a new slug means it is based on that one
  const origin = typeof config.basedOn === 'string' && config.basedOn ? config.basedOn : typeof config.slug === 'string' && config.slug !== slug ? config.slug : undefined;
  const basedOn = origin ? ` It is based on ${origin} (${base}/m/${origin}/), under its licence.` : '';
  const version = nextVersion(published?.version, Number(String(config.version ?? '1').split('.')[0]) || 1);
  const {files, leftOut} = toHub(pack, {slug, version, authors: [{name: account.name || account.login, github: account.login}], license: {text, code: code ?? 'MIT'},
    credit: `${config.name?.en ?? slug} is a motion by ${account.name || account.login}, made with VisoTalk.${basedOn}`});

  // a motion's directory is named by its slug, so --out names the directory it is written into
  const out = resolve(options.out ?? 'motionhub', slug);
  rmSync(out, {recursive: true, force: true});
  for (const [path, data] of files) { mkdirSync(dirname(join(out, path)), {recursive: true}); writeFileSync(join(out, path), data); }
  const was = published ? await (await get(`${base}/m/${slug}/motion.json`)).json() : undefined;
  const issues = checkMotion(out, {author: account.login, was}) as {code: string; at: string; message: string}[];
  if (issues.length) throw new Error(`${out} does not pass the catalogue's checks:\n${issues.map((i) => `${i.at}  ${i.code}  ${i.message}`).join('\n')}`);
  const note = `${slug} ${version}${published ? ` (after ${published.version})` : ''} written to ${out} and checked${leftOut.length ? `; left out, as the catalogue holds no video: ${leftOut.join(', ')}` : ''}`;
  if (!options.pr) return `${note}. Nothing is published yet: with the person's go-ahead, run again with --pr to open the pull request on github.com/${REPO} from their account.`;

  const dir = mkdtempSync(join(tmpdir(), 'motionhub-'));
  try {
    const name = config.name?.en ?? slug, branch = `motion/${slug}-${version}`;
    run('gh', ['repo', 'fork', REPO, '--clone=false']);
    must('git', ['clone', '--quiet', `https://github.com/${REPO}.git`, dir]);
    must('git', ['checkout', '--quiet', '-b', branch], dir);
    rmSync(join(dir, 'motions', slug), {recursive: true, force: true});
    cpSync(out, join(dir, 'motions', slug), {recursive: true});
    must('git', ['add', join('motions', slug)], dir);
    must('git', ['commit', '--quiet', '--signoff', '-m', `${published ? 'Update' : 'Add'} ${name} ${version}`], dir);
    must('git', ['-c', 'credential.helper=', '-c', 'credential.helper=!gh auth git-credential', 'push', '--quiet', `https://github.com/${account.login}/motions.git`, `HEAD:refs/heads/${branch}`], dir);
    const url = must('gh', ['pr', 'create', '--repo', REPO, '--head', `${account.login}:${branch}`, '--title', `${published ? 'Update' : 'Add'} ${name} ${version}`,
      '--body', `${files.size} files, checked with @motionhub/cli. ${config.line ?? ''}`.trim()], dir);
    return `${note}. Pull request: ${url}`;
  } finally { rmSync(dir, {recursive: true, force: true}); }
}
