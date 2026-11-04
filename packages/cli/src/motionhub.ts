/**
 * The public motion catalogue at motionhub.dev (github.com/motionhub-dev/motions, its HUB.md): search its index and fetch a motion as a VisoTalk pack.
 * The catalogue is engine-neutral: a motion there is the format's files (motion.json, MOTION.md, tokens.json, poster.jpg, CREDITS.md) and, in `react/`,
 * the components any React engine draws through @motionhub/runtime, their assets and previews. `packFromHub` makes a pack from it (the theme from
 * tokens.json, the components from react/). Publishing to the catalogue is not this CLI's: a motion goes there by pull request (its CONTRIBUTING.md).
 */
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {MOTION_SECTIONS,MOTION_TAGS} from '@visotalk/ir/motions';

export const MOTIONHUB = 'https://motionhub.dev';
const TIMEOUT_MS = 20_000;

/** One row of the catalogue's index (`/api/motions.json`) */
export type HubMotion = {
  slug: string; version: string; name: Record<string,string>; line: Record<string,string>; lang?: string; tags: string[];
  authors: {name: string; github: string}[]; license: {text: string; code?: string}; poster: string; tools: string[];
  package: {url: string; sha256: string; bytes: number};
  /** What it is for (the format's `fit`, since motion/0.4): its kind, and the subjects it is for and not for */
  fit?: {kind: string; for: Record<string,string>; not?: Record<string,string>};
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

/** The rows that contain every word, in their slug, names, lines, what they are for, or tags */
export function searchHub(rows: HubMotion[], words: string[]): HubMotion[] {
  const wanted = words.map((w) => w.toLowerCase()).filter(Boolean);
  return rows.filter((m) => {
    const text = [m.slug, ...Object.values(m.name), ...Object.values(m.line), ...Object.values(m.fit?.for ?? {}), m.fit?.kind ?? '', ...m.tags].join(' ').toLowerCase();
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

/** A motion's id on the catalogue: its author's scope and its slug, `@iamsuosi/red-pencil`; there are no unscoped ids there */
export const HUB_ID = /^@[a-z0-9](?:[a-z0-9-]{0,38})\/[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** A catalogue motion by its id (`@scope/slug`, the index row's `slug`), as a VisoTalk pack, or undefined when the catalogue has no such motion */
export async function hubMotion(id: string, base = MOTIONHUB): Promise<Map<string,Uint8Array> | undefined> {
  const row = (await hubIndex(base)).find((m) => m.slug === id);
  if (!row) return undefined;
  return packFromPackage(row, new Uint8Array(await (await get(new URL(row.package.url, base).href)).arrayBuffer()));
}

const GENERIC = new Set(['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-monospace', 'ui-sans-serif', 'ui-serif']);

/** A catalogue MOTION.md as a pack's: the eleven sections numbered again when it has them all, in order; otherwise as it is */
export function packDoc(text: string): string {
  const doc = text.replace(/^## Avoid: pitfalls\b/gm, '## Pitfalls').replace(/\(`react\/parts\//g, '(`parts/');
  const headings = [...doc.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
  if (headings.length !== MOTION_SECTIONS.length || !headings.every((h, i) => h.startsWith(MOTION_SECTIONS[i]))) return doc;
  let n = 0;
  return doc.replace(/^## /gm, () => `## ${++n}. `);
}


const TOOL = 'react/';

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
