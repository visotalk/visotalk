import {after, test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync, spawnSync} from 'node:child_process';
import {existsSync, mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {CHROME_ARGS, chromeArgs, gpuGl} from '../../packages/exporter/src/chrome.ts';

test('render --gpu: ANGLE on each platform\'s own graphics API, never left for Chrome to pick; without it the flags are the deterministic set', () => {
  assert.deepEqual(gpuGl('win32').slice(0, 2), ['--use-gl=angle', '--use-angle=d3d11']);
  assert.deepEqual(gpuGl('darwin').slice(0, 2), ['--use-gl=angle', '--use-angle=metal']);
  assert.deepEqual(gpuGl('linux').slice(0, 2), ['--use-gl=angle', '--use-angle=gl-egl']);
  assert.deepEqual(chromeArgs(1, false), CHROME_ARGS, 'goldens are drawn with exactly these');
  const gpu = chromeArgs(2, true, 'win32');
  assert.equal(gpu.filter((a) => a.startsWith('--use-angle=')).length, 1, 'one ANGLE backend, not SwiftShader beside it');
  assert.ok(gpu.includes('--force-device-scale-factor=2') && !gpu.includes('--disable-gpu-rasterization') && gpu.includes('--enable-gpu-rasterization'));
});

test('render: browsers are sized to the cores, the memory and the frames, and say what bounded them', async () => {
  const {autoConcurrency} = await import('../../packages/exporter/src/render.ts');
  assert.deepEqual(autoConcurrency({frames: 12000, cores: 12, memoryMb: 64000}), {browsers: 12, bound: 'cores'}, 'one a core');
  assert.deepEqual(autoConcurrency({frames: 12000, cores: 16, memoryMb: 16000}), {browsers: 5, bound: 'memory'}, 'half of 16 GB at 1.5 GB a browser');
  assert.deepEqual(autoConcurrency({frames: 12000, cores: 16, memoryMb: 16000, scale: 2}), {browsers: 2, bound: 'memory'}, 'a 4K page needs more');
  assert.deepEqual(autoConcurrency({frames: 90, cores: 16, memoryMb: 64000}), {browsers: 3, bound: 'frames'}, 'at least 30 frames a browser');
  assert.deepEqual(autoConcurrency({frames: 99999, cores: 96, memoryMb: 512000}), {browsers: 16, bound: 'limit'});
  assert.equal(autoConcurrency({frames: 1, cores: 2, memoryMb: 1000}).browsers, 1, 'never fewer than one');
  assert.equal(autoConcurrency({frames: 9000, cores: 1, memoryMb: 64000}).browsers, 1, 'one core: still one browser');
  assert.deepEqual(autoConcurrency({frames: 9000, cores: 16, memoryMb: 512000}), {browsers: 16, bound: 'cores'}, 'a tie names the first bound');
});

const hasFfmpeg = (() => {
  try { execFileSync('ffmpeg', ['-version'], {stdio: 'ignore'}); return true; } catch { return false; }
})();

test('render: the encoder takes frames as browsers finish them and writes them in order; a failure stops every browser waiting on it', {skip: !hasFfmpeg && 'no ffmpeg'}, async () => {
  const {streamEncoder} = await import('../../packages/exporter/src/render.ts');
  const dir = mkdtempSync(join(tmpdir(), 'vt-enc-'));
  after(() => rmSync(dir, {recursive: true, force: true}));
  // six frames, each a grey a shade lighter than the one before
  const shade = (k: number) => execFileSync('ffmpeg', ['-loglevel', 'error', '-f', 'lavfi', '-i', `color=c=0x${(k * 40).toString(16).padStart(2, '0').repeat(3)}:s=64x64`, '-frames:v', '1', '-f', 'image2pipe', '-c:v', 'png', 'pipe:1']);
  const frames = Array.from({length: 6}, (_, k) => shade(k));
  const out = join(dir, 'v.mp4');
  const enc = streamEncoder('png', 6, out, 30, 10);
  // three browsers, frames interleaved, each finishing at its own pace
  await Promise.all([0, 1, 2].map(async (c) => {
    for (const k of [c, c + 3]) {
      await new Promise((r) => setTimeout(r, (2 - c) * 15));
      await enc.write(10 + k, frames[k]);
    }
  }));
  await enc.close();
  const luma = execFileSync('ffmpeg', ['-loglevel', 'error', '-i', out, '-vf', 'scale=1:1,format=gray', '-f', 'rawvideo', 'pipe:1']);
  assert.equal(luma.length, 6, 'every frame, once');
  for (let k = 1; k < 6; k++) assert.ok(luma[k] > luma[k - 1], `frame ${k} after frame ${k - 1}: ${[...luma]}`);

  const broken = streamEncoder('png', 3, out, 30);
  const waiting = broken.write(2, frames[2]);
  broken.fail(new Error('browser 0 crashed'));
  await assert.rejects(waiting, /browser 0 crashed/, 'a browser waiting for an earlier frame is woken with the error');
  await assert.rejects(broken.close(), /browser 0 crashed/);
  assert.ok(existsSync(out), 'the last good video is left where it was');

  const garbage = streamEncoder('png', 2, join(dir, 'g.mp4'), 30);
  await assert.rejects(async () => { await garbage.write(0, Buffer.from('not a png')); await garbage.close(); }, /ffmpeg exited/, 'ffmpeg\'s own error, not EPIPE');
  assert.ok(!existsSync(join(dir, 'g.mp4')) && !existsSync(join(dir, 'g.part.mp4')), 'nothing half-written is left');
});

test('render in segments: cut at whole multiples of the segment from the film\'s start, so a range shares the names of the whole film\'s', async () => {
  const {segmentPlan} = await import('../../packages/exporter/src/render.ts');
  assert.deepEqual(segmentPlan(0, 7000), [[0, 3000], [3000, 6000], [6000, 7000]]);
  assert.deepEqual(segmentPlan(2500, 6100), [[2500, 3000], [3000, 6000], [6000, 6100]]);
  assert.deepEqual(segmentPlan(0, 3000), [[0, 3000]], 'a whole segment, not one and an empty one');
  assert.deepEqual(segmentPlan(10, 25, 10), [[10, 20], [20, 25]]);
});

test('render in segments: a segment is reused only for the same player and the options that change a frame', async () => {
  const {segmentFingerprint} = await import('../../packages/exporter/src/render.ts');
  const {writeFileSync, mkdirSync} = await import('node:fs');
  const dist = mkdtempSync(join(tmpdir(), 'vt-fp-'));
  after(() => rmSync(dist, {recursive: true, force: true}));
  mkdirSync(join(dist, 'assets'));
  writeFileSync(join(dist, 'index.html'), '<p>a</p>');
  writeFileSync(join(dist, 'assets', 'app-1.js'), '');
  const a = segmentFingerprint(dist, 'HeadlessChrome/1', {fps: 30, format: 'jpeg'});
  assert.equal(segmentFingerprint(dist, 'HeadlessChrome/1', {fps: 30, format: 'jpeg'}), a);
  assert.notEqual(segmentFingerprint(dist, 'HeadlessChrome/1', {fps: 30, format: 'jpeg', scale: 2}), a, 'the scale');
  assert.notEqual(segmentFingerprint(dist, 'HeadlessChrome/1', {fps: 30, format: 'png'}), a, 'the frame format');
  assert.notEqual(segmentFingerprint(dist, 'HeadlessChrome/1', {fps: 30, format: 'jpeg', gpu: true}), a, 'the GPU');
  assert.notEqual(segmentFingerprint(dist, 'HeadlessChrome/2', {fps: 30, format: 'jpeg'}), a, 'another Chrome');
  writeFileSync(join(dist, 'player.html'), '');
  writeFileSync(join(dist, 'artifact.json'), '{}');
  assert.equal(segmentFingerprint(dist, 'HeadlessChrome/1', {fps: 30, format: 'jpeg'}), a, 'what build --artifact adds is not read by a render');
  writeFileSync(join(dist, 'assets', 'app-2.js'), '');
  const b = segmentFingerprint(dist, 'HeadlessChrome/1', {fps: 30, format: 'jpeg'});
  assert.notEqual(b, a, 'a new file of the player, named by its content');
  writeFileSync(join(dist, 'index.html'), '<p>b</p>');
  assert.notEqual(segmentFingerprint(dist, 'HeadlessChrome/1', {fps: 30, format: 'jpeg'}), b, 'the page');
});

test('render in segments: a segment counts as done only with all its frames, and segments join without encoding again, each on a key frame', {skip: !hasFfmpeg && 'no ffmpeg'}, async () => {
  const {joinSegments, segmentDone, streamEncoder} = await import('../../packages/exporter/src/render.ts');
  const {writeFileSync, mkdirSync} = await import('node:fs');
  const dir = mkdtempSync(join(tmpdir(), "vt-seg-it's "));
  after(() => rmSync(dir, {recursive: true, force: true}));
  mkdirSync(join(dir, 'fp'));
  const grey = execFileSync('ffmpeg', ['-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=gray:s=64x64', '-frames:v', '1', '-f', 'image2pipe', '-c:v', 'png', 'pipe:1']);
  const segment = async (name: string, frames: number) => {
    const enc = streamEncoder('png', frames, join(dir, 'fp', name), 30);
    for (let i = 0; i < frames; i++) await enc.write(i, grey);
    await enc.close();
    return join(dir, 'fp', name);
  };
  const files = [await segment('000000-000040.mp4', 40), await segment('000040-000070.mp4', 30)];
  assert.equal(await segmentDone(files[1], 30), true);
  assert.equal(await segmentDone(files[1], 31), false, 'a segment short of its frames is rendered again');
  assert.equal(await segmentDone(join(dir, 'fp', 'none.mp4'), 30), false);
  const cut = join(dir, 'fp', 'cut.mp4');
  writeFileSync(cut, readFileSync(files[0]).subarray(0, 2000));
  assert.equal(await segmentDone(cut, 40), false, 'a cut-off file is not whole');
  const out = join(dir, 'video.mp4');
  await joinSegments(files, out, true);
  const frames = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'packet=pts_time,flags', '-of', 'csv=p=0', out], {encoding: 'utf8'}).trim().split('\n');
  assert.equal(frames.length, 70, 'every frame of both, once');
  const keys = frames.map((l, i) => (l.includes('K') ? i : -1)).filter((i) => i >= 0);
  assert.ok(keys.includes(0) && keys.includes(40), `a key frame where each segment starts: ${keys}`);
  assert.ok(!existsSync(join(dir, 'video.part.mp4')));
});

test('still --zoom: x,y,w,h in stage pixels; the region is cut from the full-size frame and stops at its edge', async (t) => {
  const {parseZoom, cropImage} = await import('../../packages/exporter/src/sheet.ts');
  assert.deepEqual(parseZoom('100, 200,640,360'), {x: 100, y: 200, w: 640, h: 360});
  assert.throws(() => parseZoom('100,200,640'), /four whole numbers/);
  assert.throws(() => parseZoom('0,0,-5,100'), /four whole numbers/);
  assert.throws(() => parseZoom('0,0,20,100'), /at least 40 x 40/);
  const frame = spawnSync('ffmpeg', ['-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc=size=1920x1080', '-frames:v', '1', '-f', 'image2pipe', '-c:v', 'png', '-'], {maxBuffer: 64 << 20});
  if (frame.status !== 0) return t.skip('no ffmpeg');
  // a PNG's width and height are the two big-endian words after the IHDR tag
  const size = (b: Buffer) => [b.readUInt32BE(16), b.readUInt32BE(20)];
  assert.deepEqual(size(cropImage(frame.stdout, {x: 100, y: 200, w: 640, h: 360})), [640, 360]);
  assert.deepEqual(size(cropImage(frame.stdout, {x: 1600, y: 900, w: 640, h: 360})), [320, 180], 'clipped at the right and bottom edges');
});

test('render: a frame step that never ends stops with the frame and its time, not a closed target minutes later', async () => {
  const {drawn} = await import('../../packages/exporter/src/render.ts');
  assert.equal(await drawn(3, 30, Promise.resolve('ok'), 50), 'ok');
  await assert.rejects(drawn(150, 30, new Promise(() => {}), 50), /^Error: frame 150 \(5\.00 s\) did not finish drawing in 0\.05 s: .*renders itself/);
});
