import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {test} from 'node:test';
import {elevenlabs, elevenLabsWords, minimax, minimaxWords, openai, run, volcengine, type MinimaxEntry, type SpeakRequest} from '../../packages/cli/src/voice_lines.ts';
import {voiceProvider} from '../../packages/cli/src/project.ts';

const e = (word: string, a: number, b: number): MinimaxEntry => ({word, time_begin: a, time_end: b});

test('voice: "provider:name" names a third-party voice, a bare name is a Kokoro voice', () => {
  assert.deepEqual(voiceProvider('minimax:English_Trustworthy_Man'), {provider: 'minimax', voice: 'English_Trustworthy_Man'});
  assert.deepEqual(voiceProvider('./my-voice.mjs:alice'), {provider: './my-voice.mjs', voice: 'alice'});
  assert.equal(voiceProvider('af_heart'), undefined);
  assert.equal(voiceProvider(undefined), undefined);
});

test('minimax words: syllables are joined at the blank entries and matched one to one to the tokens of what was said', () => {
  const entries = [e('M', 0, 100), e('ine', 100, 300), e("'", 300, 320), e('s', 320, 400), e(' ', 400, 400), e('at', 420, 520), e(' ', 520, 520), e('thirty', 540, 900), e('-', 900, 910), e('one', 910, 1200)];
  assert.deepEqual(minimaxWords(entries, "Mine's at thirty-one."), [
    {w: "mine's", t0: 0, t1: 0.4}, {w: 'at', t0: 0.42, t1: 0.52}, {w: 'thirtyone', t0: 0.54, t1: 1.2},
  ]);
  // a token with no letters has an empty span at the end of the word before it, as the aligner leaves it
  const dash = minimaxWords([e('So', 0, 200), e(' ', 200, 200), e('what', 300, 500)], 'So — what');
  assert.deepEqual(dash, [{w: 'so', t0: 0, t1: 0.2}, {w: '', t0: 0.2, t1: 0.2}, {w: 'what', t0: 0.3, t1: 0.5}]);
});

test('minimax words: a spaced language that is not Latin, Korean, is timed word by word instead of as empty words', () => {
  const [an, nyeong, ha, se, yo] = [0xc548, 0xb155, 0xd558, 0xc138, 0xc694].map((c) => String.fromCodePoint(c));
  const entries = [e(an, 0, 100), e(nyeong, 100, 300), e(' ', 300, 300), e(ha, 320, 400), e(se, 400, 500), e(yo, 500, 700)];
  assert.deepEqual(minimaxWords(entries, `${an}${nyeong} ${ha}${se}${yo}`), [{w: `${an}${nyeong}`, t0: 0, t1: 0.3}, {w: `${ha}${se}${yo}`, t0: 0.32, t1: 0.7}]);
});

test('minimax words: words other than the ones sent are refused rather than shifting every anchor after them', () => {
  assert.equal(minimaxWords([e('Hello', 0, 300), e(' ', 300, 300), e('there', 320, 600)], 'Hello world'), undefined);
  assert.equal(minimaxWords([e('Hello', 0, 300)], 'Hello world'), undefined);
  assert.equal(minimaxWords([e('Hello', 0, 300), e(' ', 300, 300), e('world', 320, 600)], 'Hello'), undefined);
});

test('minimax: one request per line with the voice, speed and verbatim text; the key comes from the environment only', async () => {
  const seen: Array<{url: string; init?: RequestInit}> = [];
  const fetchImpl = (async (url: string, init?: RequestInit) => {
    seen.push({url, init});
    if (url.startsWith('https://api.example/v1/t2a_v2')) return new Response(JSON.stringify({base_resp: {status_code: 0}, data: {audio: 'https://cdn/a.mp3', subtitle_file: 'https://cdn/s.json'}}));
    if (url.endsWith('s.json')) return new Response(JSON.stringify([{timestamped_words: [e('Hi', 0, 200)]}]));
    return new Response(new Uint8Array([1, 2, 3]));
  }) as typeof fetch;
  const req: SpeakRequest = {say: 'Hi', voice: 'V1', lang: 'en', speed: 1.1};
  await assert.rejects(minimax({}, fetchImpl)(req), /MINIMAX_API_KEY/);
  const spoken = await minimax({MINIMAX_API_KEY: 'k', MINIMAX_BASE_URL: 'https://api.example', MINIMAX_GROUP_ID: 'g'}, fetchImpl)(req);
  assert.equal(seen[0].url, 'https://api.example/v1/t2a_v2?GroupId=g');
  const body = JSON.parse(String(seen[0].init!.body));
  assert.equal(body.text, 'Hi');
  assert.deepEqual(body.voice_setting, {voice_id: 'V1', speed: 1.1, vol: 1, pitch: 0});
  assert.equal((seen[0].init!.headers as Record<string, string>).Authorization, 'Bearer k');
  assert.deepEqual([...spoken.audio], [1, 2, 3]);
  assert.deepEqual(spoken.words, [{w: 'hi', t0: 0, t1: 0.2}]);
  const failing = (async () => new Response(JSON.stringify({base_resp: {status_code: 1004, status_msg: 'auth'}}))) as unknown as typeof fetch;
  await assert.rejects(minimax({MINIMAX_API_KEY: 'k'}, failing)(req), /1004/);
});

const chars = (text: string, step = 0.1) => ({
  characters: [...text], character_start_times_seconds: [...text].map((_, i) => i * step), character_end_times_seconds: [...text].map((_, i) => (i + 1) * step),
});

test('elevenlabs words: characters are grouped at whitespace and matched to the tokens; other words are refused', () => {
  assert.deepEqual(elevenLabsWords(chars('Hi you.'), 'Hi you.'), [{w: 'hi', t0: 0, t1: 0.2}, {w: 'you', t0: 0.3, t1: 0.7}]);
  assert.equal(elevenLabsWords(chars('Hi there'), 'Hi world'), undefined);
});

test('elevenlabs: the voice is in the path, the key in a header, the speed in voice_settings', async () => {
  const seen: Array<{url: string; init?: RequestInit}> = [];
  const fetchImpl = (async (url: string, init?: RequestInit) => {
    seen.push({url, init});
    return new Response(JSON.stringify({audio_base64: Buffer.from([1, 2, 3]).toString('base64'), alignment: chars('Hi')}));
  }) as typeof fetch;
  const req: SpeakRequest = {say: 'Hi', voice: 'V 1', lang: 'en', speed: 1.1};
  await assert.rejects(elevenlabs({}, fetchImpl)(req), /ELEVENLABS_API_KEY/);
  const spoken = await elevenlabs({ELEVENLABS_API_KEY: 'k', ELEVENLABS_BASE_URL: 'https://api.example'}, fetchImpl)(req);
  assert.equal(seen[0].url, 'https://api.example/v1/text-to-speech/V%201/with-timestamps?output_format=mp3_44100_128');
  assert.equal((seen[0].init!.headers as Record<string, string>)['xi-api-key'], 'k');
  assert.deepEqual(JSON.parse(String(seen[0].init!.body)).voice_settings, {speed: 1.1});
  assert.deepEqual([...spoken.audio], [1, 2, 3]);
  assert.deepEqual(spoken.words, [{w: 'hi', t0: 0, t1: 0.2}]);
  const failing = (async () => new Response(JSON.stringify({detail: {status: 'invalid_api_key'}}), {status: 401})) as unknown as typeof fetch;
  await assert.rejects(elevenlabs({ELEVENLABS_API_KEY: 'k'}, failing)(req), /invalid_api_key/);
});

test('volcengine: Bearer; auth, the voice and speed in audio, word times from addition.frontend, an error code refused', async () => {
  const seen: Array<{url: string; init?: RequestInit}> = [];
  const frontend = JSON.stringify({words: [{word: 'Hi', start_time: 0, end_time: 0.2}, {word: 'you', start_time: 0.3, end_time: 0.5}]});
  const fetchImpl = (async (url: string, init?: RequestInit) => {
    seen.push({url, init});
    return new Response(JSON.stringify({code: 3000, message: 'Success', data: Buffer.from([1, 2, 3]).toString('base64'), addition: {frontend}}));
  }) as typeof fetch;
  const req: SpeakRequest = {say: 'Hi you', voice: 'zh_female_x', lang: 'en', speed: 1.2};
  await assert.rejects(volcengine({VOLCENGINE_APPID: 'a'}, fetchImpl)(req), /VOLCENGINE_ACCESS_TOKEN/);
  const spoken = await volcengine({VOLCENGINE_APPID: 'a', VOLCENGINE_ACCESS_TOKEN: 't', VOLCENGINE_BASE_URL: 'https://api.example'}, fetchImpl)(req);
  assert.equal(seen[0].url, 'https://api.example/api/v1/tts');
  assert.equal((seen[0].init!.headers as Record<string, string>).Authorization, 'Bearer;t');
  const body = JSON.parse(String(seen[0].init!.body));
  assert.deepEqual(body.audio, {voice_type: 'zh_female_x', encoding: 'mp3', speed_ratio: 1.2});
  assert.equal(body.app.appid, 'a');
  assert.equal(body.request.text, 'Hi you');
  assert.deepEqual([...spoken.audio], [1, 2, 3]);
  assert.deepEqual(spoken.words, [{w: 'hi', t0: 0, t1: 0.2}, {w: 'you', t0: 0.3, t1: 0.5}]);
  const failing = (async () => new Response(JSON.stringify({code: 3001, message: 'bad'}))) as unknown as typeof fetch;
  await assert.rejects(volcengine({VOLCENGINE_APPID: 'a', VOLCENGINE_ACCESS_TOKEN: 't'}, failing)(req), /3001/);
});

test('openai: model, input, voice and speed in the body, no word times, an HTTP error refused', async () => {
  const seen: Array<{url: string; init?: RequestInit}> = [];
  const fetchImpl = (async (url: string, init?: RequestInit) => { seen.push({url, init}); return new Response(new Uint8Array([1, 2, 3])); }) as typeof fetch;
  const req: SpeakRequest = {say: 'Hi', voice: 'alloy', lang: 'en', speed: 1.1};
  await assert.rejects(openai({}, fetchImpl)(req), /OPENAI_API_KEY/);
  const spoken = await openai({OPENAI_API_KEY: 'k', OPENAI_BASE_URL: 'https://api.example/v1'}, fetchImpl)(req);
  assert.equal(seen[0].url, 'https://api.example/v1/audio/speech');
  assert.equal((seen[0].init!.headers as Record<string, string>).Authorization, 'Bearer k');
  assert.deepEqual(JSON.parse(String(seen[0].init!.body)), {model: 'gpt-4o-mini-tts', input: 'Hi', voice: 'alloy', speed: 1.1, response_format: 'mp3'});
  assert.deepEqual([...spoken.audio], [1, 2, 3]);
  assert.equal(spoken.words, undefined);
  const failing = (async () => new Response('nope', {status: 401})) as unknown as typeof fetch;
  await assert.rejects(openai({OPENAI_API_KEY: 'k'}, failing)(req), /401/);
});

test('voice runner: a clip is made once, its word times land in the aligner\'s cache, and a second run asks the provider for nothing', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'vt-voice-'));
  const wav = (seconds: number) => { // 8 kHz mono 16-bit silence
    const n = Math.round(8000 * seconds) * 2, b = Buffer.alloc(44 + n);
    b.write('RIFF', 0); b.writeUInt32LE(36 + n, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
    b.writeUInt32LE(8000, 24); b.writeUInt32LE(16000, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n, 40);
    return new Uint8Array(b);
  };
  let calls = 0;
  const speak = async () => { calls++; return {audio: wav(1.5), ext: 'wav', words: [{w: 'hello', t0: 0, t1: 0.5}]}; };
  const spec = {provider: 'minimax', voice: 'V', lang: 'en', speed: 1, lines: [{id: 'l1', say: 'Hello'}]};
  const first = await run(spec, dir, speak);
  assert.equal(calls, 1);
  assert.equal(first.l1.duration, 1.5);
  assert.deepEqual(JSON.parse(readFileSync(join(dir, first.l1.file.replace('.wav', '.words2.json')), 'utf8')), [{w: 'hello', t0: 0, t1: 0.5}]);
  assert.deepEqual(await run(spec, dir, speak), first);
  assert.equal(calls, 1, 'cached');
  await run({...spec, voice: 'V2'}, dir, speak);
  assert.equal(calls, 2, 'another voice is another clip');
  assert.ok(existsSync(join(dir, first.l1.file)));
});

test('the published package speaks a third-party voice: the script is built beside main.js and runs under plain node', () => {
  const build = spawnSync(process.execPath, ['packages/cli/scripts/bundle.mjs'], {encoding: 'utf8'});
  assert.equal(build.status, 0, build.stderr);
  const dist = join(process.cwd(), 'packages/cli/dist/packages/cli/src');
  assert.ok(existsSync(join(dist, 'voice_lines.js')));
  const dir = mkdtempSync(join(tmpdir(), 'vt-pkg-voice-'));
  // a provider that answers with a tenth of a second of silence (a 16-bit mono WAV)
  const wav = Buffer.alloc(44 + 1600);
  wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(1600, 40);
  mkdirSync(dir, {recursive: true});
  writeFileSync(join(dir, 'silent.mjs'), `export default async () => ({audio: Buffer.from('${wav.toString('base64')}', 'base64'), ext: 'wav'});`);
  writeFileSync(join(dir, 'doc.tsx'), `import {Doc, Scene, Line} from '@visotalk/jsx';
export default <Doc id="pkg" title="Pkg" lang="zh-CN" voice="./silent.mjs:me"><Scene id="s1"><Line id="l1">Hello there.</Line></Scene></Doc>;`);
  // `node`, with none of the flags the repository's own scripts are started with
  const r = spawnSync('node', [join(dist, 'main.js'), 'prepare', join(dir, 'doc.tsx')], {encoding: 'utf8', env: {...process.env, NODE_OPTIONS: ''}});
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /narration: 1 line\(s\)/);
  const voice = JSON.parse(readFileSync(join(dir, '.visotalk/pkg/voice.json'), 'utf8'));
  assert.match(voice.l1.audio, /^audio\/[0-9a-f]{12}\.m4a$/);
  assert.equal(voice.l1.key, voice.l1.audio.slice(6, 18));
});
