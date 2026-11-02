/**
 * The public motion catalogue at motionhub.dev (github.com/motionhub-dev/motions, its HUB.md): search its index, and fetch a motion as a VisoTalk pack.
 * A catalogue motion is usable here when it has a `visotalk/` directory, which holds the whole pack as `visotalk motion check` reads it; the
 * catalogue's poster joins it. One without that directory is followed by hand from its MOTION.md and tokens.json, like any design system.
 */
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';

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
  const files = untar(gunzipSync(gz)), pack = new Map<string,Uint8Array>(), root = `${row.slug}/`, tool = `${root}visotalk/`;
  for (const [path, data] of files) {
    if (!path.startsWith(root) || path.split('/').some((p) => p === '..' || p === '.' || !p)) throw new Error(`The package holds a file outside its motion: ${path}`);
    if (path.startsWith(tool)) pack.set(`motion/${path.slice(tool.length)}`, data);
  }
  if (!pack.has('motion/motion.json')) throw new Error(`${row.slug} has no VisoTalk pack; follow its MOTION.md and tokens.json by hand (${MOTIONHUB}/m/${row.slug}/)`);
  const poster = files.get(`${root}poster.jpg`);
  if (poster && !pack.has('motion/poster.jpg')) pack.set('motion/poster.jpg', poster);
  return pack;
}

/** A catalogue motion by its slug, as a VisoTalk pack, or undefined when the catalogue has no such slug */
export async function hubMotion(slug: string, base = MOTIONHUB): Promise<Map<string,Uint8Array> | undefined> {
  const row = (await hubIndex(base)).find((m) => m.slug === slug);
  if (!row) return undefined;
  if (!row.tools.includes('visotalk')) throw new Error(`${slug} has no VisoTalk pack; follow its MOTION.md and tokens.json by hand (${base}/m/${slug}/)`);
  return packFromPackage(row, new Uint8Array(await (await get(new URL(row.package.url, base).href)).arrayBuffer()));
}
