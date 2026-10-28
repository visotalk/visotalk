/**
 * `visotalk asset`: find openly licensed pictures and keep them in the project's library, declared.
 *
 *   visotalk asset search "<words>" [--limit 8]          candidates with what they show, their size, licence and author, as text (no image to open)
 *   visotalk asset get <N | commons-file-page-url> --id ID [--width 1920]   download into media/ID.<ext>, check it is a picture, print the <Asset> to paste
 *
 * Sources: Wikimedia Commons first (its API names the licence and the author of every file), then Openverse. Only what a document may keep:
 * public domain, CC0, CC BY and CC BY-SA (references/assets.md). Both services answer 429 to a busy address: every request waits and retries
 * (Retry-After, else 4, 8, 16, 32 s) instead of failing, and a download that is not an image (an error page saved as .jpg) is refused.
 * The last search is kept in .visotalk/asset-search.json so `get 3` takes its third candidate.
 */
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';

const UA = 'visotalk-asset/0.6 (https://github.com/visotalk/visotalk)';
const SAVED = join('.visotalk', 'asset-search.json');

interface Candidate {
  title: string;
  page: string;
  url: string;
  width: number;
  height: number;
  license: string;
  spdx: string;
  obligations: string[];
  author: string;
  what: string;
  source: 'commons' | 'openverse';
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** GET with patience: 429 and 5xx wait (Retry-After or doubling from 4 s) and try again, up to `tries` times */
async function patient(url: string, tries = 5): Promise<Response> {
  let wait = 4000;
  for (let i = 0; ; i++) {
    let res: Response | undefined;
    try {
      res = await fetch(url, {headers: {'User-Agent': UA, 'Api-User-Agent': UA}});
    } catch (e) {
      if (i + 1 >= tries) throw e;
    }
    if (res && res.status !== 429 && res.status < 500) return res;
    if (i + 1 >= tries) {
      if (res) return res;
      throw new Error(`no answer from ${new URL(url).host}`);
    }
    const after = Number(res?.headers.get('retry-after'));
    const ms = Number.isFinite(after) && after > 0 ? Math.min(after * 1000, 60000) : wait;
    console.error(`${new URL(url).host} is busy (${res?.status ?? 'no answer'}): waiting ${Math.round(ms / 1000)} s, then trying again`);
    await sleep(ms);
    wait *= 2;
  }
}

const strip = (html: string | undefined) => (html ?? '').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();

/** A licence a document may keep, as SPDX id and obligations; undefined for one it may not (NC, ND, unknown) */
function licence(short: string, version?: string): {spdx: string; obligations: string[]; label: string} | undefined {
  const s = short.toLowerCase().replace(/\s+/g, '-');
  if (/^(pd|public-domain|pdm|cc-pd|cc-pdm)/.test(s)) return {spdx: 'PD', obligations: [], label: 'Public domain'};
  if (/^cc0|cc-zero/.test(s)) return {spdx: 'CC0-1.0', obligations: [], label: 'CC0'};
  if (/nc|nd/.test(s.replace(/^cc-/, '').replace(/[^a-z-]/g, ''))) return undefined;
  const v = (version ?? s.match(/(\d\.\d)/)?.[1] ?? '4.0');
  if (/by-sa/.test(s)) return {spdx: `CC-BY-SA-${v}`, obligations: ['attribution', 'share-alike'], label: `CC BY-SA ${v}`};
  if (/(^|-)by(-|$)/.test(s)) return {spdx: `CC-BY-${v}`, obligations: ['attribution'], label: `CC BY ${v}`};
  return undefined;
}

async function commons(q: string, limit: number): Promise<Candidate[]> {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&generator=search&gsrnamespace=6&gsrlimit=${limit * 2}`
    + `&gsrsearch=${encodeURIComponent(q + ' filetype:bitmap')}&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=1920`;
  const res = await patient(url);
  if (!res.ok) throw new Error(`Wikimedia Commons answered ${res.status}`);
  const data = (await res.json()) as {query?: {pages?: Array<{title: string; imageinfo?: Array<Record<string, unknown>>}>}};
  const out: Candidate[] = [];
  for (const p of data.query?.pages ?? []) {
    const ii = p.imageinfo?.[0] as {url: string; thumburl?: string; width: number; height: number; descriptionurl: string; extmetadata?: Record<string, {value: string}>} | undefined;
    if (!ii) continue;
    const m = ii.extmetadata ?? {};
    const lic = licence(m.LicenseShortName?.value ?? m.License?.value ?? '');
    if (!lic) continue;
    out.push({title: p.title.replace(/^File:/, ''), page: ii.descriptionurl, url: ii.thumburl ?? ii.url, width: ii.width, height: ii.height,
      license: lic.label, spdx: lic.spdx, obligations: lic.obligations, author: strip(m.Artist?.value) || 'unknown',
      what: strip(m.ImageDescription?.value).slice(0, 220), source: 'commons'});
  }
  return out.slice(0, limit);
}

async function openverse(q: string, limit: number): Promise<Candidate[]> {
  const res = await patient(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&license=by,by-sa,cc0,pdm&page_size=${limit}&mature=false`);
  if (!res.ok || !(res.headers.get('content-type') ?? '').includes('json')) throw new Error(`Openverse answered ${res.status}`);
  const data = (await res.json()) as {results?: Array<{title: string; foreign_landing_url: string; url: string; width: number; height: number; license: string; license_version: string; creator: string; tags?: Array<{name: string}>}>};
  return (data.results ?? []).flatMap((r) => {
    const lic = licence(r.license, r.license_version);
    return lic ? [{title: r.title, page: r.foreign_landing_url, url: r.url, width: r.width, height: r.height, license: lic.label, spdx: lic.spdx,
      obligations: lic.obligations, author: r.creator || 'unknown', what: (r.tags ?? []).slice(0, 8).map((t) => t.name).join(', '), source: 'openverse' as const}] : [];
  });
}

/** What the bytes are: a picture's extension, or undefined (an HTML page, an error) */
function kindOf(b: Buffer): string | undefined {
  if (b[0] === 0xff && b[1] === 0xd8) return 'jpg';
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP') return 'webp';
  if (b.subarray(0, 3).toString() === 'GIF') return 'gif';
  return undefined;
}

export async function assetCmd(sub: string | undefined, args: string[]): Promise<void> {
  const opt = (n: string, d?: string) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);
  if (sub === 'search') {
    const q = args.find((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
    if (!q) throw new Error('asset search needs the words to look for: visotalk asset search "mont blanc massif"');
    const limit = Number(opt('limit', '8'));
    let found: Candidate[] = [];
    const errors: string[] = [];
    for (const source of [commons, openverse]) {
      try {
        found = await source(q, limit);
      } catch (e) {
        errors.push((e as Error).message);
      }
      if (found.length) break;
    }
    mkdirSync('.visotalk', {recursive: true});
    writeFileSync(SAVED, JSON.stringify(found, null, 1));
    if (!found.length) {
      console.log(`nothing usable for "${q}"${errors.length ? ` (${errors.join('; ')})` : ''}: try other words, or draw it`);
      return;
    }
    found.forEach((c, i) => {
      console.log(`${String(i + 1).padStart(2)}. ${c.title}  ${c.width}x${c.height}  ${c.license}  by ${c.author.slice(0, 60)}`);
      if (c.what) console.log(`    shows: ${c.what}`);
    });
    console.log(`take one with: visotalk asset get N --id NAME (it goes to media/NAME.jpg with its <Asset> declaration)`);
    return;
  }
  if (sub === 'get') {
    const which = args[0];
    const id = opt('id');
    if (!which || !id) throw new Error('asset get needs a candidate number from the last search (or its page URL) and --id NAME');
    if (!/^[a-z][a-z0-9_-]*$/.test(id)) throw new Error(`--id is a lowercase name with letters, digits, - and _ (got ${id})`);
    const saved: Candidate[] = existsSync(SAVED) ? JSON.parse(readFileSync(SAVED, 'utf8')) : [];
    const c = /^\d+$/.test(which) ? saved[Number(which) - 1] : saved.find((x) => x.page === which);
    if (!c) throw new Error(`no candidate ${which} in the last search (${saved.length} kept): run visotalk asset search first`);
    const res = await patient(c.url);
    if (!res.ok) throw new Error(`the file answered ${res.status}: ${c.url}`);
    const bytes = Buffer.from(await res.arrayBuffer());
    const ext = kindOf(bytes);
    if (!ext) throw new Error(`what came back is not a picture (${bytes.subarray(0, 40).toString().replace(/\s+/g, ' ')}…): nothing was saved; try again in a minute`);
    mkdirSync('media', {recursive: true});
    const file = `media/${id}.${ext}`;
    writeFileSync(file, bytes);
    console.log(`saved ${file} (${(bytes.length / 1e6).toFixed(1)} MB; the original is ${c.width}x${c.height}). Declare it in <Doc>:`);
    const attribution = `${c.author.replace(/'/g, '’').slice(0, 80)} / ${c.source === 'commons' ? 'Wikimedia Commons' : 'Openverse'}`;
    console.log(`  <Asset id="${id}" kind="image" src="${file}"\n    license={{id: '${c.spdx}', attribution: '${attribution}', obligations: [${c.obligations.map((o) => `'${o}'`).join(', ')}]}}\n    source="${c.page}" />`);
    return;
  }
  throw new Error('visotalk asset search "<words>" [--limit 8] | visotalk asset get <N> --id NAME');
}
