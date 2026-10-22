import type {Clock} from './clock';

/**
 * `p` as a promise that never rejects and never outlasts `ms`: what a hold on the clock is made of when the work is not ours (a part's loading, an image),
 * so a request that never answers cannot freeze the player.
 */
export function within(p: Promise<unknown>, ms: number, what: string): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => { console.warn(`${what} not ready after ${ms}ms, playing on`); resolve(); }, ms);
    const done = () => { clearTimeout(timer); resolve(); };
    p.then(done, done);
  });
}

/** How long the web player waits for a part's own loading before it plays on */
const PART_WAIT_MS = 8000;

/**
 * Readiness barrier. A frame may be captured only when every pending hold has resolved:
 * fonts, image decodes, timed-component prepare() and the render that follows it.
 * Given the web player's clock, a hold also stops that clock until it resolves (or `PART_WAIT_MS` passes).
 */
export class Readiness {
  private pending = new Set<Promise<unknown>>();

  private clock: Clock | undefined;

  constructor(clock?: Clock) {
    this.clock = clock;
  }

  /** Register work that must finish before the current frame is complete. */
  hold<T>(p: Promise<T>): Promise<T> {
    this.clock?.hold(within(p, PART_WAIT_MS, 'a part\'s loading'));
    this.pending.add(p);
    const done = () => this.pending.delete(p);
    p.then(done, done);
    return p;
  }

  /** Resolves once no holds are pending, including holds added while waiting. */
  async settle(timeoutMs = 30_000): Promise<void> {
    const start = performance.now();
    // Force style + layout so text in the new frame requests its font faces now.
    void document.body.offsetHeight;
    await document.fonts.ready;
    while (this.pending.size > 0) {
      if (performance.now() - start > timeoutMs) {
        throw new Error(`readiness timeout: ${this.pending.size} hold(s) pending`);
      }
      await Promise.allSettled([...this.pending]);
    }
    // Images present in the DOM must be decoded before capture.
    const imgs = Array.from(document.images).filter((i) => !i.complete || i.naturalWidth === 0);
    await Promise.allSettled(imgs.map((i) => i.decode()));
    const broken = imgs.filter((i) => i.naturalWidth === 0);
    if (broken.length) throw new Error(`image failed to load: ${broken[0].currentSrc || broken[0].src}`);
  }
}
