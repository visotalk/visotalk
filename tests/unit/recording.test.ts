/** A continuous recording owns time, including all silence; captions cannot change speech or anchors. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMarkup, solve, validate, checkOverlay, localize, type VoiceManifest } from '../../packages/ir/src/index.ts';
const source = `import {Doc,Scene,Line,Asset} from '@visotalk/jsx';
export default <Doc id="recorded" title="Recorded" lang="en" voice="recording:take" pacing={{lead:10,hold:10,tail:10,grid:10}}>
<Asset id="take" kind="audio" src="media/take.wav" analysis={{duration:12}} license={{id:'user-owned',obligations:[]}}/>
<Scene id="first"><Line id="one" span={{start:2,end:4}} words={[{w:'Hello',t0:0,t1:1},{w:'world',t0:1,t1:2}]}>Hello world.</Line></Scene>
<Scene id="second"><Line id="two" span={{start:7,end:8}} words={[{w:'Again',t0:0,t1:1}]}>Again.</Line></Scene>
</Doc>;`;
const voice: VoiceManifest = { one: { duration: 2, audio: '' }, two: { duration: 1, audio: '' } };
test('recording silence stays on the shared clock and the full file is scheduled once', () => {
  const doc = parseMarkup(source).doc;
  assert.deepEqual(validate(doc), []);
  const c = solve(doc, voice, 30000 / 1001);
  assert.equal(c.duration, 12);
  assert.deepEqual(c.recording, { audio: 'media/take.wav', duration: 12 });
  assert.deepEqual(
    c.scenes.flatMap((s) => s.lines.map((l) => l.from)),
    [2, 7],
  );
  assert.equal(c.scenes[0].from, 0);
  assert.equal(c.scenes[0].lines[0].audio, undefined);
});
test('a caption overlay preserves the exact original speech, words and spans', () => {
  const doc = parseMarkup(source).doc,
    overlay = { lang: 'fr', lines: { one: { text: 'Bonjour le monde.' }, two: { text: 'Encore.' } } };
  assert.deepEqual(checkOverlay(doc, overlay), []);
  const translated = localize(doc, overlay);
  assert.equal(translated.scenes[0].lines[0].say, 'Hello world.');
  const times = (d: typeof doc) => solve(d, voice).scenes.flatMap((s) => s.lines.map(({ text, ...line }) => line));
  assert.deepEqual(times(translated), times(doc));
  assert.equal(checkOverlay(doc, { ...overlay, voice: { voice: 'new' } })[0].code, 'recording.overlay');
});
test('overlaps and missing measured words cannot silently become estimated recording timings', () => {
  const doc = parseMarkup(source).doc;
  doc.scenes[1].lines[0].span = { start: 3, end: 8 };
  assert.ok(validate(doc).some((i) => i.code === 'recording.span'));
  delete doc.scenes[0].lines[0].words;
  assert.ok(validate(doc).some((i) => i.code === 'recording.words'));
});

test('old saved documents remain readable while recorded speech cannot be retimed by an edit', async () => {
  const { recordingChange, applyEdits, recordingLines } = await import('../../packages/ir/src/index.ts');
  const before = parseMarkup(source).doc;
  const changed = structuredClone(before);
  changed.scenes[0].lines[0].span!.start = 1;
  assert.match(recordingChange(before, changed)!, /tim/);
  const caption = applyEdits(source, [{ op: 'caption', scene: 'first', line: 'one', text: 'A new caption' }]);
  assert.equal(recordingChange(before, parseMarkup(caption).doc), null);
  const old = structuredClone(before);
  old.spec = '0.6.0';
  old.voice = { voice: 'minimax:test' };
  old.scenes.forEach((s) =>
    s.lines.forEach((l) => {
      delete l.span;
      delete l.words;
    }),
  );
  assert.deepEqual(validate(old), []);
  assert.equal(
    recordingLines(
      [
        { text: 'Hello', start: 1, end: 2 },
        { text: 'again.', start: 5, end: 6 },
      ],
      8,
    ).length,
    2,
  );
  assert.throws(() => recordingLines([{ text: 'Hi', start: 2, end: 1 }], 8), /invalid/);
});

test('scenes with no speech take their time from the recording: an intro, a break and an outro of music', () => {
  const doc = parseMarkup(source.replace('<Scene id="first">', '<Scene id="intro"/><Scene id="first">').replace('<Scene id="second">', '<Scene id="break"/><Scene id="second">').replace('</Doc>', '<Scene id="outro"/></Doc>')).doc;
  assert.deepEqual(validate(doc), []);
  const c = solve(doc, voice, 30);
  assert.deepEqual(c.scenes.map((s) => [s.id, s.from, s.end]), [['intro', 0, 2], ['first', 2, 4], ['break', 4, 7], ['second', 7, 8], ['outro', 8, 12]]);
  doc.scenes[0].duration = 3;
  assert.ok(validate(doc).some((i) => i.code === 'recording.duration'), 'the recording, not an attribute, says how long a scene is');
});

test('a scene says where the presenter is when they are not where the document says', () => {
  const doc = parseMarkup(source.replace('voice="recording:take"', 'voice="recording:take" keepClear={[{x:0,y:0,w:600,h:900}]}').replace('<Scene id="second">', '<Scene id="second" keepClear={[]}>')).doc;
  assert.deepEqual(validate(doc), []);
  assert.deepEqual(doc.scenes[1].keepClear, []);
  doc.scenes[1].keepClear = [{ x: 0, y: 0, w: 'wide' } as never];
  assert.ok(validate(doc).some((i) => i.code === 'canvas.keep-clear'));
});

test('a sentence too long for one caption breaks after a comma, not inside a word', async () => {
  const { recordingLines } = await import('../../packages/ir/src/index.ts');
  // fourteen seconds of one sentence: "ab, cd, ef" at a second a character, a comma after b and after d
  const units = ['a', 'b,', 'c', 'd,', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n.'].map((text, i) => ({ text, start: i, end: i + 0.9 }));
  const lines = recordingLines(units, 20);
  assert.deepEqual(lines.map((l) => l.say), ['a b, c d,', 'e f g h i j k l m n.']);
  assert.deepEqual(lines.map((l) => l.span), [{ start: 0, end: 3.9 }, { start: 4, end: 13.9 }]);
});

test('a presenter seen in some shots only is kept clear in those shots', async () => {
  const { keepClearAt } = await import('../../packages/ir/src/index.ts');
  const doc = parseMarkup(source.replace('voice="recording:take"', 'voice="recording:take" keepClear={[{x:600,y:100,w:700,h:800,from:3.3,to:7.9},{x:600,y:100,w:700,h:800,from:16.5}]}')).doc;
  assert.deepEqual(validate(doc), []);
  assert.equal(keepClearAt(doc, doc.scenes[0], 2).length, 0);
  assert.equal(keepClearAt(doc, doc.scenes[0], 5).length, 1);
  assert.equal(keepClearAt(doc, doc.scenes[0], 7.9).length, 0);
  assert.equal(keepClearAt(doc, doc.scenes[0], 20).length, 1);
  doc.canvas.keepClear![0].to = 2;
  assert.ok(validate(doc).some((i) => i.code === 'canvas.keep-clear'));
});

test('measured English words keep their sentences and their spaces', async () => {
  const { recordingLines } = await import('../../packages/ir/src/index.ts');
  const units = ['The ', 'mile ', 'lies. ', 'It ', 'waits. ', 'Too ', 'slow, ', 'too ', 'tired.'].map((text, i) => ({ text, start: i * 0.4, end: i * 0.4 + 0.3 }));
  assert.deepEqual(recordingLines(units, 8).map((l) => l.say), ['The mile lies.', 'It waits.', 'Too slow, too tired.']);
  assert.deepEqual(recordingLines([{ text: '\u6570\uff0c', start: 0, end: 0.2 }, { text: '\u4e00', start: 0.2, end: 0.4 }, { text: '\u6837\u3002', start: 0.4, end: 0.6 }], 2).map((l) => l.say), ['\u6570\uff0c\u4e00\u6837\u3002']);
});

test('long continuous narration with looping effects remains synchronized across mix blocks', async () => {
  const {mkdtempSync,rmSync}=await import('node:fs');
  const {execFileSync}=await import('node:child_process');
  const {tmpdir}=await import('node:os');
  const {join}=await import('node:path');
  const {muxAudio,ENV_HZ}=await import('../../packages/exporter/src/index.ts');
  const dir=mkdtempSync(join(tmpdir(),'visotalk-recording-block-'));
  try {
    execFileSync('ffmpeg',['-y','-v','error','-f','lavfi','-i','sine=f=330:d=0.7',join(dir,'effect.wav')]);
    const length=32.032;
    await muxAudio(undefined,join(dir,'effects.mp3'),0,length,{narration:[],sounds:[{src:'effect.wav',at:0,loop:true}],envelopes:[Array(Math.ceil(length*ENV_HZ)+2).fill(0.5)]} as never,dir);
    const read=(start:number)=>{
      const bytes=execFileSync('ffmpeg',['-v','error','-i',join(dir,'effects.mp3'),'-ss',String(start),'-t','0.2','-f','f32le','-ac','1','pipe:1']);
      const samples=new Float32Array(bytes.buffer,bytes.byteOffset,bytes.length/4);
      return Math.sqrt(samples.reduce((sum,x)=>sum+x*x,0)/samples.length);
    };
    assert.ok(Math.abs(read(29.8)-read(30.1))<0.002,'a block boundary does not reset or drop the effect');
    const duration=Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','csv=p=0',join(dir,'effects.mp3')]).toString());
    assert.ok(Math.abs(duration-length)<0.1);
  } finally {rmSync(dir,{recursive:true,force:true});}
});

test('a filmed recording lists where its picture cuts, and the outline says so', async () => {
  const { mkdtempSync, rmSync } = await import('node:fs');
  const { execFileSync } = await import('node:child_process');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { videoCuts, recordingOutline } = await import('../../packages/cli/src/recording.ts');
  const dir = mkdtempSync(join(tmpdir(), 'visotalk-cuts-'));
  try {
    const file = join(dir, 'shots.mp4');
    // three shots, red, a moving test card and blue, cut at 1 s and 2.5 s
    execFileSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'color=red:s=320x180:r=30:d=1', '-f', 'lavfi', '-i', 'testsrc2=s=320x180:r=30:d=1.5', '-f', 'lavfi', '-i', 'color=blue:s=320x180:r=30:d=1',
      '-filter_complex', '[0:v][1:v][2:v]concat=n=3:v=1[v]', '-map', '[v]', '-pix_fmt', 'yuv420p', file]);
    assert.deepEqual(videoCuts(file).map((t) => Math.round(t * 10) / 10), [1, 2.5]);
    assert.match(recordingOutline([{ id: 'l1', text: 'x', span: { start: 0.2, end: 3 } }], 3.5, [1, 2.5]), /cuts to a new shot at 1\.0, 2\.5 s \(3 shots\)/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a trim the person asked for cuts hesitations and long silences, and keeps what is said in sync', async () => {
  const { trimPlan, trimLines, isFiller, recordingLines } = await import('../../packages/ir/src/index.ts');
  // "So, um, the price" with a 3 s silence before "is high."
  const lines = recordingLines([
    { text: 'So,', start: 1, end: 1.3 }, { text: 'um,', start: 1.5, end: 1.9 }, { text: 'the', start: 2.1, end: 2.3 }, { text: 'price', start: 2.3, end: 2.8 },
    { text: 'is', start: 5.8, end: 6 }, { text: 'high.', start: 6, end: 6.5 },
  ], 9);
  assert.ok(isFiller('um,') && isFiller('\u5443') && !isFiller('umbrella'));
  const keep = trimPlan(lines, 9, { fillers: true, pauses: 0.8, fps: 30 });
  // the opening second and the ending are kept; "um" goes; the 3 s silence keeps 0.8 s
  assert.deepEqual(keep, [[0, 1.5], [1.9, 3.2], [5.4, 9]]);
  const trimmed = trimLines(lines, keep);
  assert.equal(trimmed.map((l) => l.say).join(' '), 'So, the price is high.');
  const words = trimmed.flatMap((l) => l.words!.map((w) => [w.w, +(l.span!.start + w.t0).toFixed(3)]));
  // after the cut, "the" is said 0.4 s sooner and "is" 2.6 s sooner
  assert.deepEqual(words, [['So,', 1], ['the', 1.7], ['price', 1.9], ['is', 3.2], ['high.', 3.4]]);
  assert.deepEqual(trimPlan(lines, 9, { fps: 30 }), [[0, 9]], 'nothing asked, nothing cut');
});

test('the guard lets through a trim that matches its cut, and nothing else', async () => {
  const { recordingChange, trimPlan, trimLines } = await import('../../packages/ir/src/index.ts');
  const before = parseMarkup(source).doc;
  const keep = trimPlan(before.scenes.flatMap((s) => s.lines), 12, { pauses: 0.8, fps: 30 });
  const after = structuredClone(before);
  const lines = trimLines(before.scenes.flatMap((s) => s.lines), keep);
  after.scenes.forEach((s) => (s.lines = s.lines.map((l) => lines.find((x) => x.id === l.id)!)));
  after.assets![0] = { ...after.assets![0], src: 'media/take-trimmed.wav', trim: { source: 'media/take.wav', keep }, analysis: { duration: keep.reduce((t, [a, b]) => t + b - a, 0) } };
  assert.equal(recordingChange(before, after), null);
  const forged = structuredClone(after);
  forged.scenes[1].lines[0].span = { start: 1, end: 2 };
  assert.match(recordingChange(before, forged)!, /exactly what the cut leaves/);
  const longer = structuredClone(after);
  longer.assets![0].analysis!.duration = 12;
  assert.match(recordingChange(before, longer)!, /as long as they are/);
});

test('a trim cuts picture and sound at the same frame edges into one file as long as what was kept', async () => {
  const { mkdtempSync, rmSync } = await import('node:fs');
  const { execFileSync } = await import('node:child_process');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { cutRecording, recordingProbe } = await import('../../packages/cli/src/recording.ts');
  const dir = mkdtempSync(join(tmpdir(), 'visotalk-trim-'));
  try {
    const take = join(dir, 'take.mp4'), out = join(dir, 'take-trimmed.mp4');
    execFileSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'testsrc2=s=320x180:r=30000/1001:d=4', '-f', 'lavfi', '-i', 'sine=f=440:d=4', '-shortest', '-pix_fmt', 'yuv420p', '-c:a', 'aac', take]);
    cutRecording(take, out, [[0, 1.001], [2.002, 3.003]], true, '30000/1001');
    const cut = recordingProbe(out);
    assert.equal(cut.frames, 60);
    assert.ok(Math.abs(cut.duration - 2.002) < 0.05, `${cut.duration} s`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a trim decided after the lines were grouped and a caption corrected keeps both, and costs no second recognition', async () => {
  const { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } = await import('node:fs');
  const { execFileSync } = await import('node:child_process');
  const { createHash } = await import('node:crypto');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { recordingCmd } = await import('../../packages/cli/src/recording.ts');
  const dir = mkdtempSync(join(tmpdir(), 'visotalk-retrim-'));
  const key = process.env.MINIMAX_API_KEY;
  delete process.env.MINIMAX_API_KEY;
  try {
    mkdirSync(join(dir, 'media'));
    const take = join(dir, 'media', 'take.wav');
    execFileSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'sine=f=220:d=8', take]);
    const hash = createHash('sha256').update(readFileSync(take)).digest('hex').slice(0, 16);
    mkdirSync(join(dir, '.visotalk', 'recordings'), { recursive: true });
    // the recognizer's answer, cached as a first run leaves it: "So, um, the price. It is high." with a 3 s silence
    const recognition = createHash('sha256').update(JSON.stringify(['asr-1.0', 'en', process.env.MINIMAX_BASE_URL ?? 'https://api.minimax.io', 'word', 1])).digest('hex').slice(0, 16);
    writeFileSync(join(dir, '.visotalk', 'recordings', `${hash}-${recognition}.json`), JSON.stringify([
      { text: 'So, ', start: 1, end: 1.3 }, { text: 'um, ', start: 1.5, end: 1.9 }, { text: 'the ', start: 2.1, end: 2.3 }, { text: 'price. ', start: 2.3, end: 2.8 },
      { text: 'It ', start: 5.8, end: 6 }, { text: 'is ', start: 6, end: 6.2 }, { text: 'high.', start: 6.2, end: 6.6 },
    ]));
    const doc = join(dir, 'doc.tsx');
    await recordingCmd([take, '--out', doc]);
    assert.match(readFileSync(doc, 'utf8'), /would cut 1 hesitation\(s\) and shorten 1 silence/);
    // the script step: two scenes, and a caption the person corrected
    writeFileSync(doc, readFileSync(doc, 'utf8').replace('<Scene id="recorded">', '<Scene id="ask" title={"The question"}>').replace('<Line id="line-2"', '</Scene>\n<Scene id="answer">\n<Line id="line-2" text={"It is HIGH."}'));
    await recordingCmd([take, '--out', doc, '--trim', 'fillers,pauses']);
    const after = parseMarkup(readFileSync(doc, 'utf8')).doc;
    assert.deepEqual(after.scenes.map((s) => [s.id, s.title, s.lines.map((l) => l.id)]), [['ask', 'The question', ['line-1']], ['answer', undefined, ['line-2']]]);
    assert.equal(after.scenes[1].lines[0].text, 'It is HIGH.');
    assert.equal(after.scenes[0].lines[0].say, 'So, the price.');
    assert.equal(after.assets![0].src, 'media/take-trimmed.wav');
    assert.equal(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_name', '-of', 'csv=p=0', join(dir, 'media', 'take-trimmed.wav')], { encoding: 'utf8' }).trim(), 'pcm_s16le');
  } finally {
    if (key !== undefined) process.env.MINIMAX_API_KEY = key;
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the word at a moment between two timed words is the last one said, not the whole unspaced line', async () => {
  const { wordAt } = await import('../../packages/ir/src/qa.ts');
  const say = '\u4ef7\u683c\u662f\u4e09\u4e07\u4e03';
  const src = `import {Doc,Scene,Line,Asset} from '@visotalk/jsx';\nexport default <Doc id="r" title="R" lang="zh-CN" voice="recording:a"><Asset id="a" kind="audio" src="a.mp3" analysis={{duration:3}} license={{id:'user-owned',obligations:[]}}/><Scene id="s"><Line id="l" span={{start:0,end:2}} words={[{w:'\u4ef7\u683c',t0:0,t1:0.4},{w:'\u662f',t0:0.4,t1:0.6},{w:'\u4e09\u4e07\u4e03',t0:1.2,t1:2}]}>${say}</Line></Scene></Doc>;`;
  const doc = parseMarkup(src).doc;
  const c = solve(doc, { l: { duration: 2, audio: '' } } as VoiceManifest);
  assert.deepEqual(wordAt(c, 0.9), { line: 'l', word: '\u662f' });
  assert.deepEqual(wordAt(c, 1.5), { line: 'l', word: '\u4e09\u4e07\u4e03' });
});


test('a failed later ASR segment retries only missing segments and keeps absolute word times', async () => {
  const { mkdtempSync, rmSync } = await import('node:fs');
  const { execFileSync } = await import('node:child_process');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { transcribeRecording } = await import('../../packages/cli/src/recording.ts');
  const dir = mkdtempSync(join(tmpdir(), 'visotalk-segment-'));
  const key = process.env.MINIMAX_API_KEY;
  const originalFetch = globalThis.fetch;
  process.env.MINIMAX_API_KEY = 'test';
  let calls = 0;
  try {
    const take = join(dir, 'take.flac');
    execFileSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=16000:cl=mono', '-t', '471', take]);
    globalThis.fetch = async () => {
      calls++;
      return calls === 2 ? new Response('', { status: 503 }) : Response.json({ segments: [{ text: 'Hello.', start: 0, end: 0.5 }] });
    };
    const cache = join(dir, 'cache', 'transcript.json');
    await assert.rejects(transcribeRecording(take, 471, 'en', cache), /503/);
    const units = await transcribeRecording(take, 471, 'en', cache);
    assert.equal(calls, 3, 'the first successful segment is never requested twice');
    assert.deepEqual(units.map((u) => u.start), [0, 470]);
    await transcribeRecording(take, 471, 'en', cache);
    assert.equal(calls, 3, 'a completed transcript makes no provider request');
  } finally {
    globalThis.fetch = originalFetch;
    if (key === undefined) delete process.env.MINIMAX_API_KEY; else process.env.MINIMAX_API_KEY = key;
    rmSync(dir, { recursive: true, force: true });
  }
});
