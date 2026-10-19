import assert from 'node:assert/strict';
import {existsSync, mkdtempSync, readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {test} from 'node:test';
import {minimax, minimaxWords, run, type MinimaxEntry, type SpeakRequest} from '../../packages/cli/src/voice_lines.ts';
import {narrationLanguage, voiceProvider} from '../../packages/cli/src/project.ts';

const e = (word: string, a: number, b: number): MinimaxEntry => ({word, time_begin: a, time_end: b});

test('voice: "provider:name" names a third-party voice, a bare name is a Kokoro voice', () => {
  assert.deepEqual(voiceProvider('minimax:English_captivating_female1'), {provider: 'minimax', voice: 'English_captivating_female1'});
  assert.deepEqual(voiceProvider('./my-voice.mjs:alice'), {provider: './my-voice.mjs', voice: 'alice'});
  assert.equal(voiceProvider('af_heart'), undefined);
  assert.equal(voiceProvider(undefined), undefined);
  // a provider's voice name says nothing about the language: the document's lang does
  assert.equal(narrationLanguage('zh-CN', 'minimax:zh_voice').tts, 'cmn');
  assert.equal(narrationLanguage('en', 'minimax:zh_voice').tts, 'en-us');
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
