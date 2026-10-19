/**
 * Synthesise narration lines with a third-party voice provider; cache by content hash. The counterpart of tts_lines.py (the local Kokoro model):
 * it writes the same files and prints the same manifest, so `prepare` treats the two alike.
 *
 * Usage: node voice_lines.ts <speak.json> <out_dir>
 * speak.json: {"provider": "minimax" | "./my-voice.mjs", "voice": "…", "lang": "en", "speed": 1, "lines": [{"id": "l1", "say": "…"}]}
 * Writes <out_dir>/<hash>.wav, and <hash>.words2.json when the provider returns word times (the aligner's cache entry: the aligner is then not run, and
 * a language it cannot align keeps real word anchors), and prints a JSON manifest {line_id: {file, duration}}.
 *
 * A provider is a function `(request) => {audio, ext, words?}`: the built-in `minimax`, or the default export of a module whose path starts with `.` or `/`
 * (resolved from the current directory). `words` are one entry per whitespace token of `say`, in seconds from the clip start.
 * Credentials come from the environment, never from the document: MINIMAX_API_KEY (MINIMAX_GROUP_ID, MINIMAX_BASE_URL and MINIMAX_TTS_MODEL are optional).
 */
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

export interface SpeakRequest {say: string; voice: string; lang: string; speed: number}
export interface Word {w: string; t0: number; t1: number}
export interface Spoken {audio: Uint8Array; ext: string; words?: Word[]}
export type VoiceProvider = (request: SpeakRequest) => Promise<Spoken>;

/** A MiniMax subtitle entry: a syllable, or the space between two words (blank `word`), in milliseconds */
export interface MinimaxEntry {word: string; time_begin: number; time_end: number}

const key = (token: string) => token.toLowerCase().replace(/[^a-z0-9']/g, '');

/**
 * MiniMax's syllables ("M" "ine" "'" "s"), matched to the whitespace tokens of `say`. What it gives is an entry for the space between words, and that
 * is the join: the entries up to a blank one are one word. A token with no letters (a dash, a symbol) gets an empty span at the end of the word before
 * it, as the aligner does. Undefined when the words it heard are not the words in `say`: a silent mismatch would move every anchor after it.
 */
export function minimaxWords(entries: MinimaxEntry[], say: string): Word[] | undefined {
  const heard: Array<{text: string; t0: number; t1: number}> = [];
  let run: MinimaxEntry[] = [];
  const flush = () => {
    const text = run.map((e) => e.word).join('').trim();
    if (key(text)) heard.push({text, t0: run[0].time_begin / 1000, t1: run[run.length - 1].time_end / 1000});
    run = [];
  };
  for (const e of entries) (e.word.trim() ? run.push(e) : flush());
  if (run.length) flush();
  const out: Word[] = [];
  let k = 0, last = 0;
  for (const token of say.split(/\s+/).filter(Boolean)) {
    if (!key(token)) { out.push({w: key(token), t0: last, t1: last}); continue; }
    const h = heard[k++];
    if (!h || key(h.text) !== key(token)) return undefined;
    last = Math.round(h.t1 * 1000) / 1000;
    out.push({w: key(token), t0: Math.round(h.t0 * 1000) / 1000, t1: last});
  }
  return k === heard.length ? out : undefined;
}

/** MiniMax `t2a_v2`; `fetchImpl` is a parameter so a test can answer without a network or a key */
export function minimax(env: Record<string, string | undefined> = process.env, fetchImpl: typeof fetch = fetch): VoiceProvider {
  return async ({say, voice, speed}) => {
    if (!env.MINIMAX_API_KEY) throw new Error('the minimax voice needs MINIMAX_API_KEY in the environment');
    const base = env.MINIMAX_BASE_URL ?? 'https://api.minimaxi.com';
    const res = await fetchImpl(`${base}/v1/t2a_v2${env.MINIMAX_GROUP_ID ? `?GroupId=${env.MINIMAX_GROUP_ID}` : ''}`, {
      method: 'POST',
      headers: {Authorization: `Bearer ${env.MINIMAX_API_KEY}`, 'Content-Type': 'application/json'},
      body: JSON.stringify({
        model: env.MINIMAX_TTS_MODEL ?? 'speech-2.8-hd', text: say, stream: false, output_format: 'url', subtitle_enable: true, subtitle_type: 'word',
        voice_setting: {voice_id: voice, speed, vol: 1, pitch: 0},
        audio_setting: {format: 'mp3', sample_rate: 32000, bitrate: 128000, channel: 1},
      }),
    });
    const json = (await res.json().catch(() => ({}))) as {base_resp?: {status_code: number; status_msg?: string}; data?: {audio?: string; subtitle_file?: string}};
    if (json.base_resp?.status_code !== 0) throw new Error(`minimax: ${JSON.stringify(json.base_resp ?? {http: res.status})}`);
    if (!json.data?.audio) throw new Error('minimax: no audio in the response');
    const audio = new Uint8Array(await (await fetchImpl(json.data.audio)).arrayBuffer());
    let words: Word[] | undefined;
    if (json.data.subtitle_file) {
      const raw = JSON.parse(await (await fetchImpl(json.data.subtitle_file)).text()) as {timestamped_words?: MinimaxEntry[]} | Array<{timestamped_words?: MinimaxEntry[]}>;
      words = minimaxWords((Array.isArray(raw) ? raw : [raw]).flatMap((s) => s.timestamped_words ?? []), say);
      if (!words) console.error(`minimax: its word times do not match the words of "${say.slice(0, 40)}…": the aligner (English only) places the words`);
    }
    return {audio, ext: 'mp3', words};
  };
}

async function provider(id: string): Promise<VoiceProvider> {
  if (id === 'minimax') return minimax();
  if (!/^\.{0,2}\//.test(id)) throw new Error(`unknown voice provider "${id}": "minimax", or the path of a module (starting with ./ or /) whose default export is a function`);
  const fn = ((await import(pathToFileURL(resolve(id)).href)) as {default?: unknown}).default;
  if (typeof fn !== 'function') throw new Error(`${id}: the default export must be a function (request) => {audio, ext, words?}`);
  return fn as VoiceProvider;
}

export interface SpeakSpec {provider: string; voice: string; lang: string; speed: number; lines: Array<{id: string; say: string}>}

export async function run(spec: SpeakSpec, outDir: string, speak?: VoiceProvider): Promise<Record<string, {file: string; duration: number}>> {
  mkdirSync(outDir, {recursive: true});
  const manifest: Record<string, {file: string; duration: number}> = {};
  for (const line of spec.lines) {
    const hash = createHash('sha1').update(`${spec.provider}|${spec.voice}|${spec.speed}|${spec.lang}|${line.say}`).digest('hex').slice(0, 12);
    const wav = join(outDir, `${hash}.wav`);
    if (!existsSync(wav)) {
      console.error(`speaking ${line.id}`);
      speak ??= await provider(spec.provider);
      const spoken = await speak({say: line.say, voice: spec.voice, lang: spec.lang, speed: spec.speed});
      const raw = join(outDir, `${hash}.src.${spoken.ext}`);
      writeFileSync(raw, spoken.audio);
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', raw, '-ac', '1', wav]);
      rmSync(raw);
      if (spoken.words) writeFileSync(join(outDir, `${hash}.words2.json`), JSON.stringify(spoken.words));
    }
    const duration = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', wav], {encoding: 'utf8'}).trim());
    manifest[line.id] = {file: `${hash}.wav`, duration: Math.round(duration * 10000) / 10000};
  }
  return manifest;
}

// a module that bills on import must not run on import (tests import the functions above)
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [specPath, outDir] = process.argv.slice(2);
  run(JSON.parse(readFileSync(specPath, 'utf8')) as SpeakSpec, outDir).then((m) => console.log(JSON.stringify(m)), (e: Error) => { console.error(e.message); process.exit(1); });
}
