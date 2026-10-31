/** What `still` measures on a frame: a full-frame ground is not where the picture is, and the presenter's region is taken. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {frameFacts, frameIssues, frameMeasured, type FrameInspection} from '../../packages/exporter/src/index.ts';

const frame = (objects: Array<{id: string; x: number; y: number; w: number; h: number}>, keepClear?: FrameInspection['keepClear']): FrameInspection =>
  ({width: 1920, height: 1080, keepClear, texts: [], objects: objects.map(({id, ...r}) => ({id, box: r, ink: r, opacity: 1, clipped: []}))}) as unknown as FrameInspection;

test('a sky behind everything does not hide where the picture is', () => {
  const facts = frameFacts(frame([{id: 'sky', x: 0, y: 0, w: 1920, h: 1080}, {id: 'gauge', x: 1200, y: 200, w: 500, h: 400}]))!;
  assert.match(facts, /x 1200–1700/);
  assert.match(frameMeasured(frame([{id: 'sky', x: 0, y: 0, w: 1920, h: 1080}, {id: 'gauge', x: 1200, y: 200, w: 500, h: 400}])).empty.join(), /left/);
});

test('a sky that stops at the caption band is still the ground', () => {
  assert.match(frameFacts({...frame([{id: 'sky', x: 0, y: 0, w: 1920, h: 900}, {id: 'gauge', x: 220, y: 100, w: 680, h: 560}]), caption: {x: 0, y: 900, w: 1920, h: 180}} as FrameInspection)!, /x 220–900/);
});

test('a sky that stops above the caption band is the ground in a pause too, when no caption is shown', () => {
  assert.match(frameFacts(frame([{id: 'sky', x: 0, y: 0, w: 1920, h: 900}, {id: 'gauge', x: 220, y: 100, w: 680, h: 560}]))!, /x 220–900/);
});

test('the presenter region counts as taken, so a picture beside the presenter is not pushed to an edge', () => {
  const beside = frame([{id: 'card', x: 1100, y: 200, w: 600, h: 400}], [{x: 200, y: 100, w: 700, h: 900}]);
  assert.deepEqual(frameMeasured(beside).empty, []);
  assert.match(frameFacts(beside)!, /presenter region/);
});

test('over footage nothing is empty, and text that a phone cannot read or a frame may cut is named', () => {
  const f = {...frame([{id: 'super', x: 70, y: 20, w: 360, h: 180}]), height: 694, width: 1528, footage: true,
    texts: [{text: 'MAYBE', rect: {x: 70, y: 20, w: 60, h: 12}, of: 'super'}, {text: 'today?', rect: {x: 70, y: 40, w: 300, h: 80}, of: 'super'}]} as unknown as FrameInspection;
  const m = frameMeasured(f);
  assert.deepEqual(m.empty, []);
  assert.match(m.text.join('\n'), /"MAYBE" is 12 px tall/);
  assert.match(m.text.join('\n'), /"MAYBE" is 20 px from the top edge/);
  assert.ok(!m.text.some((t) => t.startsWith('"today?" is') && t.includes('tall')));
});

test('a part that draws the recording itself is the presenter: a window of them is never reported as drawn over them', () => {
  const f = frame([{id: 'window', x: 985, y: 90, w: 845, h: 774}, {id: 'tag', x: 900, y: 200, w: 300, h: 100}], [{x: 985, y: 90, w: 845, h: 774}]);
  (f.objects[0] as {footage?: boolean}).footage = true;
  assert.deepEqual(frameIssues(f, 0, 'at').filter((i) => i.code === 'keep-clear').map((i) => i.objects), [['tag']]);
});
