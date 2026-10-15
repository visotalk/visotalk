/**
 * Clock: the single source of time for a document.
 *
 * - live mode (web player): advances from requestAnimationFrame; play / pause / seek / rate.
 * - driven mode (exporter): time only changes through seek(); nothing in the page reads wall time.
 *
 * Time is continuous seconds. Frames exist only in the exporter.
 */
export type ClockMode = 'live' | 'driven';

type Listener = () => void;

export class Clock {
  readonly mode: ClockMode;
  readonly duration: number;
  private t = 0;
  private playing = false;
  private rate = 1;
  private last = 0;
  private raf = 0;
  private listeners = new Set<Listener>();

  constructor(duration: number, mode: ClockMode) {
    this.duration = duration;
    this.mode = mode;
  }

  subscribe = (fn: Listener): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getTime = (): number => this.t;
  isPlaying = (): boolean => this.playing;

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
      const dt = ((now - this.last) / 1000) * this.rate;
      this.last = now;
      this.t = Math.min(this.duration, this.t + dt);
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
