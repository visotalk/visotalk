/**
 * Clock: the single source of time for a document.
 *
 * - live mode (web player): advances from requestAnimationFrame; play / pause / seek / rate.
 * - driven mode (exporter): time only changes through seek(); nothing in the page reads wall time.
 * - a live clock waits while a hold is pending (`hold`): media that must be loaded at the time on screen. It stays "playing"
 *   and picks up where it stood when the last hold settles.
 *
 * Time is continuous seconds. Frames exist only in the exporter.
 */
export type ClockMode = 'live' | 'driven';

type Listener = () => void;

export class Clock {
  readonly mode: ClockMode;
  duration: number;
  private t = 0;
  private playing = false;
  private rate = 1;
  private last = 0;
  private raf = 0;
  private listeners = new Set<Listener>();
  private holds = new Set<Promise<unknown>>();
  private source?: () => number | undefined;

  constructor(duration: number, mode: ClockMode) {
    this.duration = duration;
    this.mode = mode;
  }

  /** The document changed under the clock (the web player was handed a new one): the time stays where it is, inside the new length. */
  setDuration(duration: number): void {
    this.duration = duration;
    if (this.t > duration) this.t = duration;
    if (this.t >= duration) this.playing = false;
    this.emit();
  }

  subscribe = (fn: Listener): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getTime = (): number => this.t;
  isPlaying = (): boolean => this.playing;
  /** True while playback waits for media to load (see `hold`) */
  isBuffering = (): boolean => this.holds.size > 0;

  /** Time stands still until `p` settles. Every media element that is not ready at the time on screen registers one. */
  hold(p: Promise<unknown>): void {
    if (this.holds.has(p)) return;
    this.holds.add(p);
    const done = () => { if (this.holds.delete(p)) this.emit(); };
    p.then(done, done);
    this.emit();
  }

  /**
   * While playing, time keeps to `source` when it has a reading (the film's soundtrack, as its element plays it): the picture follows the sound instead of drifting
   * from it. A reading within a frame of where the clock would be is left alone, so the picture moves smoothly; `undefined` removes the source.
   */
  setSource(source?: () => number | undefined): void {
    this.source = source;
  }

  seek(t: number): void {
    const next = Math.min(Math.max(0, t), this.duration);
    if (next === this.t) return;
    this.t = next;
    this.emit();
  }

  play(): void {
    if (this.mode !== 'live' || this.playing) return;
    if (this.t >= this.duration) this.t = 0;
    this.playing = true;
    this.last = performance.now();
    const tick = (now: number) => {
      if (!this.playing) return;
      if (this.holds.size > 0) {
        this.last = now;
        this.raf = requestAnimationFrame(tick);
        return;
      }
      const dt = ((now - this.last) / 1000) * this.rate;
      this.last = now;
      const heard = this.source?.();
      const next = this.t + dt;
      this.t = Math.min(this.duration, heard !== undefined && Math.abs(heard - next) > 1 / 60 ? heard : next);
      if (this.t >= this.duration) this.playing = false;
      this.emit();
      if (this.playing) this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
    this.emit();
  }

  pause(): void {
    this.playing = false;
    cancelAnimationFrame(this.raf);
    this.emit();
  }

  setRate(rate: number): void {
    this.rate = rate;
  }

  private emit(): void {
    for (const fn of this.listeners) fn();
  }
}
