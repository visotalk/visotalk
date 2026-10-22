/**
 * Media in the web player: what a clip, a sound or a video must satisfy before the clock may go on, and what is fetched ahead of its time.
 * Time stands still through `Clock.hold` while an element that the playhead is on cannot show or play yet; the export has its own barrier (`readiness.ts`).
 */
import type {Clock} from './clock';
import type {Asset} from '@visotalk/ir';

/**
 * Resolves once a media element has the data to show or play where it stands: no seek in flight and `need` readyState
 * (2 = the current frame, 3 = enough to play on). A broken element, or one that gives no sign within `timeoutMs`, resolves
 * too, so a bad file or a stalled network never freezes the player.
 */
export function mediaReady(el: HTMLMediaElement, need = 3, timeoutMs = 5000): Promise<void> {
  const ok = () => !el.seeking && el.readyState >= need;
  if (ok()) return Promise.resolve();
  return new Promise((resolve) => {
    const events = ['seeked', 'canplay', 'loadeddata', 'error', 'abort'];
    const finish = () => {
      clearTimeout(timer);
      for (const e of events) el.removeEventListener(e, check);
      resolve();
    };
    const check = () => { if (ok() || el.error) finish(); };
    const timer = setTimeout(() => { console.warn(`media not ready after ${timeoutMs}ms, playing on: ${el.currentSrc || el.src}`); finish(); }, timeoutMs);
    for (const e of events) el.addEventListener(e, check);
  });
}

/** Enough data to play on where the element stands, with no seek in flight */
export const mediaReadyNow = (el: HTMLMediaElement) => !el.seeking && el.readyState >= 3;

/** How far an element may be from where the clock says it should be before it is moved: while paused (a seek landed), and while playing (drift) */
const PAUSED_EPS = 0.1;
const PLAYING_EPS = 0.4;

/**
 * Keeps an audio element with the clock at `want` seconds into the file: moves it after a seek or when it drifts, holds the clock until it can play there
 * (once per move, `state.held`), and pauses it while the clock waits. Returns true when the element should be playing now; the caller starts it.
 * `loopLength` is the file's length for a looping sound, whose wrap from the end to the start is not drift.
 */
export function follow(clock: Clock, el: HTMLMediaElement, state: {held: boolean}, want: number, loopLength = 0): boolean {
  const off = Math.abs(el.currentTime - want);
  const wrapped = loopLength > 0 && Math.abs(off - loopLength) < PLAYING_EPS;
  if (off > (el.paused ? PAUSED_EPS : PLAYING_EPS) && !wrapped) {
    el.currentTime = want;
    state.held = false;
  }
  if (!state.held && !mediaReadyNow(el)) {
    state.held = true;
    clock.hold(mediaReady(el));
  }
  if (clock.isBuffering()) {
    if (!el.paused) el.pause();
    return false;
  }
  return true;
}

// The document does not say where in time a part shows an image or a video (the part's code does), so every one is fetched from the start: an
// image whole, a video as far as the browser's own preload takes it. Narration and sounds are small and load as soon as their `Audio` is made.
const warmed = new Map<string, HTMLImageElement | HTMLVideoElement>();

/** Starts the fetch of every image and video of the document, once per address; the elements are kept so the browser does not drop the request. */
export function warm(assets: Asset[], base: string): void {
  for (const a of assets) {
    const url = base + a.src;
    if (warmed.has(url)) continue;
    if (a.kind === 'image') {
      const img = new Image();
      img.src = url;
      void img.decode().catch(() => {});
      warmed.set(url, img);
    } else if (a.kind === 'video') {
      const v = document.createElement('video');
      v.preload = 'auto';
      v.muted = true;
      v.src = url;
      warmed.set(url, v);
    }
  }
}
