/**
 * Chinese stroke order, fetched on demand. A part that writes Chinese stroke by stroke (Chalk Hall's hand) reads
 * `globalThis.__VISOTALK_STROKES__`, a map from a character to its strokes' medians in writing order. A build embeds that map only
 * when the document's code names it, and only for the characters the document holds: each is fetched once, from the pinned
 * `hanzi-writer-data` package (Make Me a Hanzi's data, under the Arphic Public License), and kept under ~/.visotalk/hanzi/<version>/.
 * Nothing is installed by default; offline, or for a character the data lacks, the part draws the character whole instead.
 */
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync} from 'node:fs';
import {homedir, tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ARPHIC_FILE, STROKES_SOURCE} from '@visotalk/ir';

export const STROKES = {...STROKES_SOURCE,
  // the whole package, for `doctor --fix --strokes`: checked against the registry's own integrity before a byte of it is used
  tarball: 'https://registry.npmjs.org/hanzi-writer-data/-/hanzi-writer-data-2.0.1.tgz', integrity: 'sha512-nbQwM+MaryGoq7pBMIZLCd3lFq03nXuJuwku1+6UbjL58uU+9OULVcMkoNvNuJSoIV7f1bbPRfD4D/LQa5S7qg=='} as const;
/** The name a part reads the map by; a build fetches stroke data only for a document whose code contains it */
export const STROKES_GLOBAL = '__VISOTALK_STROKES__';
/** The licence text that goes beside every build that embeds the data */
export const ARPHIC_LICENCE = join(dirname(fileURLToPath(import.meta.url)), ARPHIC_FILE);

/** A character's strokes in writing order, each its median as [x, y] in a 1024 box with y up (Make Me a Hanzi's coordinates) */
export type Medians = number[][][];

export const wantsStrokes = (text: string) => text.includes(STROKES_GLOBAL);

/**
 * The Han characters in `text`, each once, in the order they first appear. A component's literal `meta` is skipped: its Chinese name is
 * for the motion picker, never drawn, and would otherwise make an English film carry stroke data and its licence.
 */
export const hanziOf = (text: string) => [...new Set(text.replace(/^export const meta\b[\s\S]*?^\};$/gm, '').match(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g) ?? [])];

export const strokesDir = () => join(process.env.VISOTALK_HOME ?? join(homedir(), '.visotalk'), 'hanzi', STROKES.version);

const urlOf = (ch: string) => `https://cdn.jsdelivr.net/npm/${STROKES.pkg}@${STROKES.version}/${encodeURIComponent(ch)}.json`;
/** One file per character, named by its code point; `null` in it records a character the data does not have, so it is not asked for again */
const cacheFile = (dir: string, ch: string) => join(dir, `${ch.codePointAt(0)!.toString(16)}.json`);
/** Written by a full install: then a character with no file is one the data lacks, and nothing is fetched (a sandbox has no network) */
const COMPLETE = 'complete';
/** Written whole or not at all, so a crash or two builds at once never leave half a file */
const keep = (file: string, text: string) => { const tmp = `${file}.${process.pid}.tmp`; writeFileSync(tmp, text); renameSync(tmp, file); };

/** Strokes as a part draws them: 1 to 64 strokes, each 2 to 64 whole [x, y] points near the 1024 box; anything else is not used */
function medians(m: unknown): Medians | undefined {
  const ok = Array.isArray(m) && m.length > 0 && m.length <= 64 && m.every((st) => Array.isArray(st) && st.length >= 2 && st.length <= 64 &&
    st.every((pt) => Array.isArray(pt) && pt.length === 2 && pt.every((v) => typeof v === 'number' && v >= -200 && v <= 1200)));
  return ok ? (m as Medians).map((st) => st.map(([x, y]) => [Math.round(x), Math.round(y)])) : undefined;
}

/**
 * The medians of every character in `chars`, from the cache or fetched (a few at a time); `missing` lists the characters with no data, and
 * `failed` those that could not be fetched now (offline, a timeout), which are tried again on the next build.
 */
export async function strokesFor(chars: string[], opts: {dir?: string; fetch?: typeof fetch; timeoutMs?: number} = {}): Promise<{strokes: Record<string, Medians>; missing: string[]; failed: string[]}> {
  const dir = opts.dir ?? strokesDir(), get = opts.fetch ?? fetch, got = new Map<string, Medians | null>(), failed = new Set<string>();
  const complete = existsSync(join(dir, COMPLETE)), todo: string[] = [];
  for (const ch of chars) {
    const file = cacheFile(dir, ch);
    if (!existsSync(file)) { if (complete) got.set(ch, null); else todo.push(ch); continue; }
    let text = '';
    try { text = readFileSync(file, 'utf8'); } catch { /* unreadable: fetched again below */ }
    if (text.trim() === 'null') { got.set(ch, null); continue; }
    let kept: Medians | undefined;
    try { kept = medians(JSON.parse(text)); } catch { /* damaged: fetched again below */ }
    if (kept) got.set(ch, kept); else todo.push(ch);
  }
  if (todo.length) mkdirSync(dir, {recursive: true});
  const one = async (ch: string) => {
    try {
      const res = await get(urlOf(ch), {signal: AbortSignal.timeout(opts.timeoutMs ?? 10_000)});
      if (res.status === 404) { keep(cacheFile(dir, ch), 'null'); got.set(ch, null); return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // only the medians are kept: the outlines are four times their size and nothing here draws them
      const kept = medians(((await res.json()) as {medians?: unknown}).medians);
      if (!kept) throw new Error('not stroke data');
      keep(cacheFile(dir, ch), JSON.stringify(kept));
      got.set(ch, kept);
    } catch {
      failed.add(ch);
    }
  };
  for (let i = 0; i < todo.length; i += 8) await Promise.all(todo.slice(i, i + 8).map(one));
  // in the document's order whatever order the fetches finished in, so the same document always builds the same player
  const strokes: Record<string, Medians> = {};
  for (const ch of chars) { const m = got.get(ch); if (m) strokes[ch] = m; }
  return {strokes, missing: chars.filter((ch) => got.get(ch) === null), failed: chars.filter((ch) => failed.has(ch))};
}

/**
 * Every character's strokes at once, for a machine that builds without the network (a hosted run's sandbox, whose template runs
 * `doctor --fix --strokes`): the pinned package is downloaded once, checked, unpacked and kept as the same per-character files a build
 * fetches one by one. 9,565 characters, about 6 MB of data; never part of a plain `doctor --fix`.
 */
export async function installAllStrokes(dir = strokesDir(), get: typeof fetch = fetch): Promise<number> {
  if (existsSync(join(dir, COMPLETE))) return readdirSync(dir).filter((f) => f.endsWith('.json')).length;
  const res = await get(STROKES.tarball, {signal: AbortSignal.timeout(300_000)});
  if (!res.ok) throw new Error(`could not download ${STROKES.tarball}: HTTP ${res.status}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  const got = `sha512-${createHash('sha512').update(bytes).digest('base64')}`;
  if (got !== STROKES.integrity) throw new Error(`${STROKES.pkg} ${STROKES.version} does not match its pinned integrity`);
  const tmp = mkdtempSync(join(tmpdir(), 'visotalk-strokes-'));
  try {
    writeFileSync(join(tmp, 'p.tgz'), bytes);
    const untar = spawnSync('tar', ['-xzf', join(tmp, 'p.tgz'), '-C', tmp], {encoding: 'utf8'});
    if (untar.status !== 0) throw new Error(`could not unpack ${STROKES.pkg}: ${untar.stderr.trim()}`);
    mkdirSync(dir, {recursive: true});
    let n = 0;
    for (const f of readdirSync(join(tmp, 'package'))) {
      const ch = f.replace(/\.json$/, '');
      if (!f.endsWith('.json') || [...ch].length !== 1 || !hanziOf(ch).length) continue;
      const kept = medians((JSON.parse(readFileSync(join(tmp, 'package', f), 'utf8')) as {medians?: unknown}).medians);
      if (!kept) continue;
      keep(cacheFile(dir, ch), JSON.stringify(kept));
      n++;
    }
    writeFileSync(join(dir, COMPLETE), `${STROKES.pkg} ${STROKES.version}: ${n} characters\n`);
    return n;
  } finally {
    rmSync(tmp, {recursive: true, force: true});
  }
}

/** What a build says when some characters will be drawn whole instead */
export function strokesWarning(r: {missing: string[]; failed: string[]}): string | undefined {
  const parts = [r.failed.length && `${r.failed.length} could not be fetched now (${r.failed.slice(0, 8).join('')}${r.failed.length > 8 ? '…' : ''}): they are fetched on the next build`,
    r.missing.length && `${r.missing.length} have no stroke data (${r.missing.slice(0, 8).join('')}${r.missing.length > 8 ? '…' : ''})`].filter(Boolean);
  return parts.length ? `stroke order: ${parts.join('; ')}; those are drawn whole` : undefined;
}

/**
 * The player's copy of the data: a classic script of its own, loaded before the film's code, that sets the map on `globalThis`. It is a separate file
 * beside the code rather than part of it, and its header is the notice the Arphic Public License (section 2a) asks of a modified file: where the data
 * comes from, how this file changed it and when.
 */
export function strokesScript(strokes: Record<string, Medians>): string {
  return `/*! Chinese stroke order for this film, set on globalThis.${STROKES_GLOBAL}.
 * Source: the stroke medians of ${STROKES.from} (${STROKES.url}) as packaged in ${STROKES.pkg} ${STROKES.version}, derived from fonts ${STROKES.holder},
 * under the ${STROKES.licence}: see ${ARPHIC_FILE} beside this file.
 * Changed by visotalk build when this player was built: only the characters of this film are kept, the outlines are dropped, every median point is
 * rounded to whole units, and the characters are merged into one map. */
globalThis.${STROKES_GLOBAL} = ${JSON.stringify(strokes)};
`;
}
