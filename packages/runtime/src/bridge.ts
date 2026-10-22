/**
 * The web player in a frame: the page that frames it can drive it and read its time.
 *
 * In, from the parent only: `{vt: 'seek', t}`, `{vt: 'play'}`, `{vt: 'pause'}`, and `{vt: 'setDocument', doc, voice}`: the document as the
 * parent now has it, which the player takes in place of its own without a build (the parent decides whether it fits; see `mount`).
 * `{vt: 'sound', on}` is the sound button of a player that is bare (`?bare`): the parent has the controls and tells the player whether the narration is heard.
 * `{vt: 'textAt', req, fx, fy}` asks which words are drawn at a point (fractions of the page); the answer is `{vt: 'text', req, hit}`, `hit` being the words and
 * what they draw, or null where there are none. `{vt: 'textFit', req, words}` asks whether those words, as drawn now, fit; the answer is `{vt: 'fit', req, problem}`.
 * Out, to the parent: `{vt: 'state', t, playing, duration}`, on every change but at most every 50 ms while playing.
 *
 * A player on its own page has no parent and installs nothing. It speaks to `*` because the frame that holds a
 * shared player is sandboxed and has no origin to name; what it sends is the time of a video, and what it hears is
 * only ever the messages above.
 */
import type {Clock} from './clock';

export interface BridgeWindow {
  parent: unknown;
  addEventListener(type: 'message', listener: (e: {source: unknown; data: unknown}) => void): void;
}

export function installParentBridge(clock: Clock, win: BridgeWindow = window as unknown as BridgeWindow, now: () => number = () => performance.now(), onDocument?: (doc: unknown, voice: unknown) => void, text?: {at(fx: number, fy: number): unknown; fit(words: string): string | null}): void {
  const parent = win.parent as {postMessage(message: unknown, target: string): void} | null;
  if (!parent || parent === (win as unknown)) return;
  win.addEventListener('message', (e) => {
    if (e.source !== parent) return;
    const m = e.data as {vt?: unknown; t?: unknown; doc?: unknown; voice?: unknown; req?: unknown; fx?: unknown; fy?: unknown; words?: unknown} | null;
    if (!m || typeof m !== 'object') return;
    if (m.vt === 'seek' && typeof m.t === 'number' && Number.isFinite(m.t)) clock.seek(m.t);
    else if (m.vt === 'play') clock.play();
    else if (m.vt === 'pause') clock.pause();
    else if (m.vt === 'setDocument' && onDocument && m.doc && typeof m.doc === 'object' && m.voice && typeof m.voice === 'object') onDocument(m.doc, m.voice);
    else if (m.vt === 'textAt' && text && typeof m.req === 'number' && typeof m.fx === 'number' && typeof m.fy === 'number') parent.postMessage({vt: 'text', req: m.req, hit: text.at(m.fx, m.fy)}, '*');
    else if (m.vt === 'textFit' && text && typeof m.req === 'number' && typeof m.words === 'string') parent.postMessage({vt: 'fit', req: m.req, problem: text.fit(m.words)}, '*');
  });
  let last = -Infinity;
  const send = () => parent.postMessage({vt: 'state', t: clock.getTime(), playing: clock.isPlaying(), duration: clock.duration}, '*');
  clock.subscribe(() => {
    const t = now();
    if (clock.isPlaying() && t - last < 50) return;
    last = t;
    send();
  });
  send();
}
