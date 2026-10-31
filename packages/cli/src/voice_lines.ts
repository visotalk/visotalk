/**
 * Synthesise narration lines with a third-party voice provider; cache by content hash. The counterpart of tts_lines.py (the local Kokoro model):
 * it writes the same files and prints the same manifest, so `prepare` treats the two alike.
 *
 * Usage: node voice_lines.ts <speak.json> <out_dir>
 * speak.json: {"provider": "minimax" | "elevenlabs" | "volcengine" | "openai" | "./my-voice.mjs", "voice": "…", "lang": "en", "speed": 1, "lines": [{"id": "l1", "say": "…"}]}
 * Writes <out_dir>/<hash>.wav, and <hash>.words2.json when the provider returns word times (the aligner's cache entry: the aligner is then not run, and
 * a language it cannot align keeps real word anchors), and prints a JSON manifest {line_id: {file, duration}}.
 *
 * A provider is a function `(request) => {audio, ext, words?}`: a built-in one (`minimax`, `elevenlabs`, `volcengine`, `openai`), or the default export of a module whose path starts with `.` or `/`
 * (resolved from the current directory, which `prepare` sets to the document's own). `words` are one entry per token of `say` (a word between spaces; in Chinese, Japanese and
 * Thai a character, as `speechTokens` splits it), in seconds from the clip start.
 * Credentials come from the environment, never from the document:
 *   minimax     MINIMAX_API_KEY (optional: MINIMAX_GROUP_ID, MINIMAX_TTS_MODEL, MINIMAX_BASE_URL: the default is the international site, https://api.minimaxi.com for a China account)
 *   elevenlabs  ELEVENLABS_API_KEY (optional: ELEVENLABS_BASE_URL, ELEVENLABS_MODEL); `voice` is a voice id
 *   volcengine  VOLCENGINE_APPID and VOLCENGINE_ACCESS_TOKEN (optional: VOLCENGINE_CLUSTER, VOLCENGINE_BASE_URL); `voice` is a voice_type
 *   openai      OPENAI_API_KEY (optional: OPENAI_BASE_URL, OPENAI_TTS_MODEL); `voice` is a voice name; no word times, so the aligner (English only) places the words
 */
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {existsSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {normalizeWord, speechTokens} from '@visotalk/ir';
import {clipKey} from './clip_key.ts';

export interface SpeakRequest {say: string; voice: string; lang: string; speed: number}
export interface Word {w: string; t0: number; t1: number}
export interface Spoken {audio: Uint8Array; ext: string; words?: Word[]}
export type VoiceProvider = (request: SpeakRequest) => Promise<Spoken>;

/** A MiniMax subtitle entry: a syllable, or the space between two words (blank `word`), in milliseconds */
export interface MinimaxEntry {word: string; time_begin: number; time_end: number}

interface Heard {text: string; t0: number; t1: number}

/** What a word is compared by: its Latin letters and digits, and Hangul (Korean is spaced, so MiniMax times its words; Han and kana have no spaces to match on) */
const key = (token: string) => token.toLowerCase().replace(/[^a-z0-9'\p{Script=Hangul}]/gu, '');

/**
 * MiniMax's syllables ("M" "ine" "'" "s"), matched to the whitespace tokens of `say`. What it gives is an entry for the space between words, and that
 * is the join: the entries up to a blank one are one word. A token with no letters (a dash, a symbol) gets an empty span at the end of the word before
 * it, as the aligner does. Undefined when the words it heard are not the words in `say`: a silent mismatch would move every anchor after it.
 */
export function minimaxWords(entries: MinimaxEntry[], say: string): Word[] | undefined {
  if (/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}]/u.test(say)) return unspacedWords(entries, say);
  const heard: Heard[] = [];
  let run: MinimaxEntry[] = [];
  const flush = () => {
    const text = run.map((e) => e.word).join('').trim();
    if (key(text)) heard.push({text, t0: run[0].time_begin / 1000, t1: run[run.length - 1].time_end / 1000});
    run = [];
  };
  for (const e of entries) (e.word.trim() ? run.push(e) : flush());
  if (run.length) flush();
  return matchWords(heard, say);
}

/**
 * MiniMax times Chinese and Japanese a character at a time (punctuation included), which is the unit a phrase is matched in there (ADR 0019): its entries
 * are matched to the tokens of `say` as `speechTokens` splits it, a token with no letters keeping an empty span at the end of the one before. MiniMax folds a
 * pause into the character after it (measured: after a comma, a 0.47 s entry whose first 0.38 s are silent), so a character more than twice as long as the
 * line's middle one is taken to start that long before its end. Undefined when the characters heard are not the ones in `say`.
 */
function unspacedWords(entries: MinimaxEntry[], say: string): Word[] | undefined {
  const heard = entries.map((e) => ({text: normalizeWord(e.word), t0: e.time_begin / 1000, t1: e.time_end / 1000})).filter((h) => h.text);
  const lengths = heard.map((h) => h.t1 - h.t0).sort((a, b) => a - b);
  const typical = lengths[Math.floor((lengths.length - 1) / 2)] ?? 0;
  const ms = (t: number) => Math.round(t * 1000) / 1000;
  const out: Word[] = [];
  let k = 0, last = 0;
  for (const token of speechTokens(say)) {
    const want = normalizeWord(token.text);
    if (!want) { out.push({w: '', t0: last, t1: last}); continue; }
    let got = '';
    const first = heard[k];
    while (k < heard.length && got !== want && want.startsWith(got + heard[k].text)) got += heard[k++].text;
    if (got !== want) return undefined;
    const end = heard[k - 1].t1;
    const start = end - first.t0 > 2 * typical && first === heard[k - 1] ? end - typical : first.t0;
    out.push({w: want, t0: ms(start), t1: (last = ms(end))});
  }
  return k === heard.length ? out : undefined;
}

/** The words a provider heard, in seconds, matched one to one to the whitespace tokens of `say`; undefined when they are not the same words */
function matchWords(heard: Heard[], say: string): Word[] | undefined {
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
    const base = env.MINIMAX_BASE_URL ?? 'https://api.minimax.io';
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

/** ElevenLabs character times (seconds), grouped at whitespace into the words of `say` */
export interface ElevenLabsAlignment {characters: string[]; character_start_times_seconds: number[]; character_end_times_seconds: number[]}

export function elevenLabsWords(a: ElevenLabsAlignment, say: string): Word[] | undefined {
  const heard: Heard[] = [];
  let text = '', t0 = 0, t1 = 0;
  const flush = () => { if (key(text)) heard.push({text, t0, t1}); text = ''; };
  a.characters.forEach((c, i) => {
    if (!c.trim()) return flush();
    if (!text) t0 = a.character_start_times_seconds[i];
    text += c;
    t1 = a.character_end_times_seconds[i];
  });
  flush();
  return matchWords(heard, say);
}

/** ElevenLabs `with-timestamps`; the voice is a voice id. Its speed is 0.7 to 1.2 and the API refuses a value outside it. */
export function elevenlabs(env: Record<string, string | undefined> = process.env, fetchImpl: typeof fetch = fetch): VoiceProvider {
  return async ({say, voice, speed}) => {
    if (!env.ELEVENLABS_API_KEY) throw new Error('the elevenlabs voice needs ELEVENLABS_API_KEY in the environment');
    const base = env.ELEVENLABS_BASE_URL ?? 'https://api.elevenlabs.io';
    const res = await fetchImpl(`${base}/v1/text-to-speech/${encodeURIComponent(voice)}/with-timestamps?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: {'xi-api-key': env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json'},
      body: JSON.stringify({text: say, model_id: env.ELEVENLABS_MODEL ?? 'eleven_multilingual_v2', voice_settings: {speed}}),
    });
    const json = (await res.json().catch(() => ({}))) as {audio_base64?: string; alignment?: ElevenLabsAlignment | null; detail?: unknown};
    if (!res.ok || !json.audio_base64) throw new Error(`elevenlabs: ${JSON.stringify(json.detail ?? {http: res.status})}`);
    const words = json.alignment ? elevenLabsWords(json.alignment, say) : undefined;
    if (!words) console.error(`elevenlabs: its word times do not match the words of "${say.slice(0, 40)}…": the aligner (English only) places the words`);
    return {audio: Buffer.from(json.audio_base64, 'base64'), ext: 'mp3', words};
  };
}

/** Volcengine (Doubao) speech, the HTTP interface with `with_timestamp`; the voice is a `voice_type`. Its word times are in `addition.frontend`. */
export function volcengine(env: Record<string, string | undefined> = process.env, fetchImpl: typeof fetch = fetch): VoiceProvider {
  return async ({say, voice, speed}) => {
    if (!env.VOLCENGINE_APPID || !env.VOLCENGINE_ACCESS_TOKEN) throw new Error('the volcengine voice needs VOLCENGINE_APPID and VOLCENGINE_ACCESS_TOKEN in the environment');
    const base = env.VOLCENGINE_BASE_URL ?? 'https://openspeech.bytedance.com';
    const res = await fetchImpl(`${base}/api/v1/tts`, {
      method: 'POST',
      // the semicolon after Bearer is Volcengine's, not a typo
      headers: {Authorization: `Bearer;${env.VOLCENGINE_ACCESS_TOKEN}`, 'Content-Type': 'application/json'},
      body: JSON.stringify({
        app: {appid: env.VOLCENGINE_APPID, token: env.VOLCENGINE_ACCESS_TOKEN, cluster: env.VOLCENGINE_CLUSTER ?? 'volcano_tts'},
        user: {uid: 'visotalk'},
        audio: {voice_type: voice, encoding: 'mp3', speed_ratio: speed},
        request: {reqid: randomUUID(), text: say, operation: 'query', with_timestamp: 1},
      }),
    });
    const json = (await res.json().catch(() => ({}))) as {code?: number; message?: string; data?: string; addition?: {frontend?: string}};
    if (json.code !== 3000 || !json.data) throw new Error(`volcengine: ${JSON.stringify({code: json.code, message: json.message, http: res.status})}`);
    let words: Word[] | undefined;
    try {
      const frontend = JSON.parse(json.addition?.frontend ?? '{}') as {words?: Array<{word: string; start_time: number; end_time: number}>};
      words = matchWords((frontend.words ?? []).filter((w) => key(w.word)).map((w) => ({text: w.word, t0: w.start_time, t1: w.end_time})), say);
    } catch { /* no usable word times: the aligner places the words */ }
    if (!words) console.error(`volcengine: its word times do not match the words of "${say.slice(0, 40)}…": the aligner (English only) places the words`);
    return {audio: Buffer.from(json.data, 'base64'), ext: 'mp3', words};
  };
}

/** OpenAI `audio/speech`; the voice is a voice name. It returns no word times. */
export function openai(env: Record<string, string | undefined> = process.env, fetchImpl: typeof fetch = fetch): VoiceProvider {
  return async ({say, voice, speed}) => {
    if (!env.OPENAI_API_KEY) throw new Error('the openai voice needs OPENAI_API_KEY in the environment');
    const base = env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1';
    const res = await fetchImpl(`${base}/audio/speech`, {
      method: 'POST',
      headers: {Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json'},
      body: JSON.stringify({model: env.OPENAI_TTS_MODEL ?? 'gpt-4o-mini-tts', input: say, voice, speed, response_format: 'mp3'}),
    });
    if (!res.ok) throw new Error(`openai: ${res.status} ${(await res.text().catch(() => '')).slice(0, 200)}`);
    return {audio: new Uint8Array(await res.arrayBuffer()), ext: 'mp3'};
  };
}

const BUILT_IN: Record<string, () => VoiceProvider> = {minimax, elevenlabs, volcengine, openai};

async function provider(id: string): Promise<VoiceProvider> {
  if (BUILT_IN[id]) return BUILT_IN[id]();
  if (!/^\.{0,2}\//.test(id)) throw new Error(`unknown voice provider "${id}": ${Object.keys(BUILT_IN).map((n) => `"${n}"`).join(', ')}, or the path of a module (starting with ./ or /) whose default export is a function`);
  const fn = ((await import(pathToFileURL(resolve(id)).href)) as {default?: unknown}).default;
  if (typeof fn !== 'function') throw new Error(`${id}: the default export must be a function (request) => {audio, ext, words?}`);
  return fn as VoiceProvider;
}

export interface SpeakSpec {provider: string; voice: string; lang: string; speed: number; lines: Array<{id: string; say: string}>}

export async function run(spec: SpeakSpec, outDir: string, speak?: VoiceProvider): Promise<Record<string, {file: string; duration: number}>> {
  mkdirSync(outDir, {recursive: true});
  const manifest: Record<string, {file: string; duration: number}> = {};
  for (const line of spec.lines) {
    const hash = clipKey(spec, line.say);
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
