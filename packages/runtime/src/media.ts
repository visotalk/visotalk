/**
 * Media in the web player: what a clip, a sound or a video must satisfy before the clock may go on, what is fetched ahead of its time, and the sound itself.
 * `MediaScheduler` is the one owner of all three. Time stands still through `Clock.hold` while the narration, the
 * soundtrack, a clip due on screen or a picture on screen is not there yet; the export has its own barrier (`readiness.ts`).
 */
import {mediaPlan, soundGain, type Compiled, type MediaItem, type VisoDoc} from '@visotalk/ir';
import type {Clock} from './clock.ts';
import {within} from './readiness.ts';

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

// ------------------------------------------------------------------------------------------------------------ the scheduler

/** How far ahead of the clock files are fetched (seconds of document time), and how many requests run at once */
const LOOKAHEAD = 10;
const MAX_ACTIVE = 4;
/** Requests the idle connection may spend on what is further ahead, and the decoded total up to which it does */
const IDLE_REQUESTS = 2;
const IDLE_BUDGET = 96e6;
/** How far ahead a sound is handed to the audio clock (a node is made no earlier, so a seek or a hold wastes little) */
const HORIZON = 1.5;
/** A single play that is not decoded when it is due is started late if it arrives within this, and left out after it */
const LATE_START = 0.25;
/** The clock and the audio clock may differ by this much before the clock is taken to have been moved by a seek */
const SEEK_EPS = 0.03;
/** A file longer than this is streamed by an element rather than decoded whole (a stereo minute is 23 MB of samples) */
export const LONG_AUDIO = 60;
/** Decoded pictures and sounds kept at once; past it the ones whose time has gone are let go, oldest first, after `RELEASE_MARGIN` seconds */
const DECODED_BUDGET = 192e6;
const RELEASE_MARGIN = 20;
/** A gain curve is a value every 20 ms */
const CURVE_HZ = 50;
/** A file the player waits for gives up after this, and plays on */
const WAIT_MS = 5000;

/** The gain of a sound over `[from, to]` as the values `setValueCurveAtTime` interpolates between, one every `1 / hz` seconds */
export function gainCurve(gain: (t: number) => number, from: number, to: number, hz = CURVE_HZ): Float32Array {
  const n = Math.max(2, Math.ceil((to - from) * hz) + 1);
  return Float32Array.from({length: n}, (_, i) => gain(from + ((to - from) * i) / (n - 1)));
}

interface Loader {
  url: string;
  kind: 'audio' | 'image' | 'video';
  state: 'idle' | 'loading' | 'ready' | 'failed';
  promise?: Promise<void>;
  /** the narration or picture that the viewer waits for, and the picture or clip no part is known to show (fetched last) */
  critical: boolean;
  speculative: boolean;
  windows: Array<[number, number]>;
  buffer?: AudioBuffer;
  image?: HTMLImageElement;
  video?: HTMLVideoElement;
  taken?: boolean;
  bytes: number;
  hold?: Promise<void>;
}

/** One thing to sound: a narration clip in its line, or a `<Sound>`, with the gain the document gives it */
interface Use {
  kind: 'narration' | 'sound';
  url: string;
  from: number;
  to: number;
  loop: boolean;
  gain?: (t: number) => number;
  /** a file streamed by an element (`LONG_AUDIO`) */
  long?: {el: HTMLAudioElement; node: GainNode; started: boolean; unlocking: boolean; unlocked: boolean};
}

/** What the page tells the scheduler about the document it now shows */
export interface SchedulerDraw {
  doc: VisoDoc;
  compiled: Compiled;
  /** the film's whole soundtrack as one file, relative to the page: played in place of the clips and the sounds */
  mix?: string;
}

/** The environment the scheduler needs of a browser, so a test can give it another */
export interface SchedulerEnv {
  AudioContext?: typeof AudioContext;
  fetch: typeof fetch;
}

/**
 * Everything the web player does about media. Files are loaded once each, keyed by address, in the order the plan needs them (`mediaPlan`), a few at a time:
 * short audio (every narration clip, every sound) is fetched and decoded into one buffer that every use of it plays from; a picture is fetched and decoded;
 * a clip is a `<video>` made ahead and handed to `<Video>`. Sound is the audio context's: each use is a node started at its time on the context's own clock,
 * with the document's gain curve set as automation, and while the nodes run the clock keeps to the context (`Clock.setSource`), so the picture, the narration and
 * the effects share one timebase. A page with a soundtrack, and a sound longer than `LONG_AUDIO`, are streamed by elements instead and moved with the clock.
 * Only what the viewer cannot do without stops the clock: a narration clip, the soundtrack, a clip due on screen (`<Video>`
 * holds on it, once, then plays on) and a picture on screen (which `Player` holds on). A sound never does.
 */
export class MediaScheduler {
  /** what a test or the bench reads: loads started, bytes decoded now, every start of a sound against its time (`late`: seconds of its head that were gone when it began), sounds left out, and the largest gap between clock and audio */
  readonly stats = {loads: 0, decodedBytes: 0, starts: [] as Array<{src: string; due: number; at: number; late: number}>, skipped: 0, maxDriftMs: 0};
  private ctx?: AudioContext;
  private master?: GainNode;
  private loaders = new Map<string, Loader>();
  private longs = new Map<string, NonNullable<Use['long']>>();
  private items: MediaItem[] = [];
  private uses: Use[] = [];
  private mix?: {el: HTMLAudioElement; held: boolean; starting: boolean; unlocking: boolean; unlocked: boolean};
  private muted = true;
  private requests = 0;
  private anchor?: {ctx: number; doc: number};
  private playing = new Map<Use, {src: AudioBufferSourceNode; gain: GainNode} | 'left out'>();
  private evaluating = false;
  private duration = 0;
  private clock: Clock;
  private base: string;
  private env: SchedulerEnv;

  constructor(clock: Clock, base: string, env: SchedulerEnv = {AudioContext: typeof window === 'undefined' ? undefined : window.AudioContext ?? (window as unknown as {webkitAudioContext?: typeof AudioContext}).webkitAudioContext, fetch: (...a) => fetch(...a)}) {
    this.clock = clock;
    this.base = base;
    this.env = env;
    clock.subscribe(() => this.evaluate());
    clock.setSource(() => this.heard());
    if (typeof window !== 'undefined') (window as unknown as {__visotalkMedia: unknown}).__visotalkMedia = this.stats;
  }

  /** Whether there is anything to hear, for the sound button */
  get hasSound(): boolean {
    return this.uses.length > 0 || !!this.mix;
  }

  private context(): AudioContext | undefined {
    if (!this.ctx && this.env.AudioContext) {
      this.ctx = new this.env.AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 1;
      this.master.connect(this.ctx.destination);
      this.ctx.addEventListener('statechange', () => this.evaluate());
    }
    return this.ctx;
  }

  /** The document the page shows now (the first, or one handed over after an edit): what it needs is planned again, and what is already loaded is kept by address */
  set(draw: SchedulerDraw): void {
    this.halt();
    const {doc, compiled: c} = draw;
    this.duration = c.duration;
    const assets = new Map((doc.assets ?? []).map((a) => [a.id, a]));
    this.items = mediaPlan(doc, c, {mix: draw.mix});
    this.uses = [];
    if (draw.mix) {
      if (!this.mix || this.mix.el.getAttribute('src') !== this.base + draw.mix) {
        this.mix?.el.pause();
        const el = new Audio(this.base + draw.mix);
        el.preload = 'auto';
        el.muted = this.muted;
        // a phone fetches nothing for an element before it is played: the file is asked for now, and the element then finds it in the cache (it is named by its content)
        // (not from a page opened as a file: fetch() refuses file://, and the element reads the file itself)
        if (typeof location === 'undefined' || location.protocol !== 'file:') void this.env.fetch(this.base + draw.mix, {priority: 'high'} as RequestInit).then((res) => res.arrayBuffer()).catch(() => undefined);
        this.mix = {el, held: false, starting: false, unlocking: false, unlocked: false};
      }
    } else {
      this.mix?.el.pause();
      this.mix = undefined;
      if(c.recording)this.uses.push({kind:'narration',url:this.base+c.recording.audio,from:0,to:c.duration,loop:false,...(c.duration>LONG_AUDIO&&{long:this.longTrack(this.base+c.recording.audio,false)})});
      for (const sc of c.scenes) for (const l of sc.lines) if (l.audio) this.uses.push({kind: 'narration', url: this.base + l.audio, from: l.from, to: l.from + l.duration, loop: false});
      for (const s of c.sounds) {
        const a = assets.get(s.asset);
        this.uses.push({kind: 'sound', url: this.base + (a?.src ?? s.asset), from: s.start, to: s.end ?? c.duration, loop: s.loop, gain: (t) => soundGain(c, s, t), ...((a?.analysis?.duration ?? 0) > LONG_AUDIO && {long: this.longTrack(this.base + (a?.src ?? s.asset), s.loop)})});
      }
      this.uses.sort((a, b) => a.from - b.from);
    }
    const longUrls = new Set(this.uses.filter((u) => u.long).map((u) => u.url));
    for (const item of this.items) {
      if (item.kind === 'soundtrack') continue;
      const url = this.base + item.src;
      if (longUrls.has(url)) continue;
      let l = this.loaders.get(url);
      if (!l) this.loaders.set(url, (l = {url, kind: item.kind === 'image' ? 'image' : item.kind === 'video' ? 'video' : 'audio', state: 'idle', critical: true, speculative: false, windows: [], bytes: 0}));
      l.windows = item.windows;
      l.critical = item.critical;
      l.speculative = (item.kind === 'image' || item.kind === 'video') && item.windows.length === 1 && item.windows[0][0] === 0 && item.windows[0][1] >= c.duration;
    }
    this.evaluate();
  }

  /** The element that streams a long sound, made once per address (a phone lets an element sound only if it was started from a tap, and a new document keeps the file) */
  private longTrack(url: string, loop: boolean): NonNullable<Use['long']> {
    const known = this.longs.get(url);
    if (known) {
      known.el.loop = loop;
      return known;
    }
    const ctx = this.context()!;
    const el = new Audio(url);
    el.preload = 'auto';
    el.loop = loop;
    const node = ctx.createGain();
    node.gain.value = 0;
    ctx.createMediaElementSource(el).connect(node).connect(this.master!);
    const track = {el, node, started: false, unlocking: false, unlocked: false};
    this.longs.set(url, track);
    return track;
  }

  /** The viewer turns the sound off or on: everything keeps running, silently */
  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.mix) this.mix.el.muted = muted;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(muted ? 0 : 1, this.ctx.currentTime, 0.01);
  }

  /** From the viewer's tap: browsers let the audio context and the elements sound only after one. The clock waits for the warm-up, so the picture never runs ahead of a sound that cannot start yet */
  unlock(): void {
    const ctx = this.ctx;
    if (ctx) {
      this.clock.hold(within(ctx.resume().then(() => this.evaluate()), WAIT_MS, 'the audio context'));
      // the old trick for iOS, where a context sounds after a tap only once something has been started in it
      const blip = ctx.createBufferSource();
      blip.buffer = ctx.createBuffer(1, 1, 22050);
      blip.connect(ctx.destination);
      blip.start(0);
    }
    // a phone fetches no media before it is played: a clip that has nothing yet is started silently once, so its first frame comes
    for (const l of this.loaders.values()) {
      const v = l.video;
      if (v && l.kind === 'video' && v.readyState < 2 && v.paused) void v.play().then(() => { if (!l.taken || this.clock.isBuffering()) v.pause(); }, () => {});
    }
    // and so is every element that sounds
    const elements = [...(this.mix ? [this.mix] : []), ...this.uses.flatMap((u) => (u.long ? [u.long] : []))];
    for (const e of elements) {
      const el = e.el;
      if (e.unlocked) continue;
      e.unlocked = e.unlocking = true;
      el.muted = true;
      const done = () => { el.pause(); el.muted = this.mix?.el === el ? this.muted : false; e.unlocking = false; this.evaluate(); };
      this.clock.hold(within(el.play().then(done, () => { el.muted = false; e.unlocking = false; e.unlocked = false; }), WAIT_MS, el.currentSrc || el.src));
    }
  }

  // -------------------------------------------------------------------------------------------------------- the clock's side

  /** Document time as the sound has it, or undefined while nothing sounds that the clock should keep to */
  private heard(): number | undefined {
    const m = this.mix;
    if (m) return !m.el.paused && !m.el.seeking && !m.unlocking && m.el.readyState >= 3 ? m.el.currentTime : undefined;
    return this.anchor && this.ctx?.state === 'running' ? this.docOf(this.ctx.currentTime) : undefined;
  }

  private docOf = (ctxTime: number) => this.anchor!.doc + (ctxTime - this.anchor!.ctx);
  private ctxOf = (docTime: number) => this.anchor!.ctx + (docTime - this.anchor!.doc);

  /** Called on every change of the clock (every frame while it plays) */
  private evaluate(): void {
    if (this.evaluating) return;
    this.evaluating = true;
    try {
      const t = this.clock.getTime();
      this.pump(t);
      this.demand(t);
      if (this.mix) this.syncMix(t);
      const ctx = this.ctx;
      if (!ctx || !this.uses.length) return;
      const running = this.clock.isPlaying() && !this.clock.isBuffering() && ctx.state === 'running' && t < this.duration;
      if (!running) {
        this.halt();
        return;
      }
      // a clock that is not where the audio clock has it was moved: everything is started again from there
      if (this.anchor && Math.abs(t - this.docOf(ctx.currentTime)) > SEEK_EPS) this.halt();
      this.anchor ??= {ctx: ctx.currentTime, doc: t};
      this.stats.maxDriftMs = Math.max(this.stats.maxDriftMs, Math.abs(t - this.docOf(ctx.currentTime)) * 1000);
      this.play(t);
    } finally {
      this.evaluating = false;
    }
  }

  /** Stops every node and forgets where the audio clock stood: it starts from the clock again when playing goes on */
  private halt(): void {
    for (const p of this.playing.values()) {
      if (p === 'left out') continue;
      p.src.onended = null;
      try { p.src.stop(); } catch { /* not started yet */ }
      p.src.disconnect();
      p.gain.disconnect();
    }
    this.playing.clear();
    this.anchor = undefined;
    for (const u of this.uses) if (u.long && !u.long.el.paused) { u.long.el.pause(); u.long.started = false; }
  }

  // -------------------------------------------------------------------------------------------------------- sounding

  /** Hands the uses that are due within the horizon to the audio context */
  private play(t: number): void {
    for (const u of this.uses) {
      if (u.to <= t) continue;
      if (u.from > t + HORIZON) break;
      if (u.long) { this.playLong(u, u.long, t); continue; }
      if (this.playing.has(u)) continue;
      const l = this.loaders.get(u.url);
      if (!l || l.state === 'failed') { this.playing.set(u, 'left out'); continue; }
      if (l.state !== 'ready') {
        // not here yet: a narration clip has held the clock (`demand`); a single play that is already late by more than a blink is not worth starting
        if (u.from <= t && !u.loop && u.kind === 'sound' && t - u.from > LATE_START) { this.playing.set(u, 'left out'); this.stats.skipped++; }
        continue;
      }
      this.start(u, l.buffer!, t);
    }
  }

  private start(u: Use, buffer: AudioBuffer, t: number): void {
    const ctx = this.ctx!;
    const lead = 0.01; // a node joining part-way is started this far ahead of the audio clock, not at a time that has passed
    const at = u.from > t ? u.from : t + lead;
    const offset = at - u.from;
    const into = u.loop ? offset % buffer.duration : offset;
    if (into >= buffer.duration) { this.playing.set(u, 'left out'); return; }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = u.loop;
    const gain = ctx.createGain();
    src.connect(gain).connect(this.master!);
    const when = Math.max(this.ctxOf(at), ctx.currentTime);
    const natural = u.loop ? Infinity : at + (buffer.duration - into);
    const end = Math.min(u.to, natural);
    if (u.gain && end - at > 0.001) gain.gain.setValueCurveAtTime(gainCurve(u.gain, at, end), when, end - at);
    src.start(when, into);
    if (end < natural) src.stop(this.ctxOf(end));
    src.onended = () => { src.disconnect(); gain.disconnect(); };
    this.playing.set(u, {src, gain});
    if (u.kind === 'sound') this.stats.starts.push({src: u.url, due: u.from, at: this.docOf(when) - offset, late: u.loop ? 0 : offset});
  }

  private playLong(u: Use, long: NonNullable<Use['long']>, t: number): void {
    if (long.unlocking) return;
    const el = long.el;
    long.node.gain.value = u.gain ? u.gain(t) : 1;
    if (t < u.from) return;
    const length = el.duration;
    const want = u.loop && length > 0 ? (t - u.from) % length : t - u.from;
    const off = Math.abs(el.currentTime - want);
    const wrapped = u.loop && length > 0 && Math.abs(off - length) < PLAYING_EPS;
    if (off > (el.paused ? PAUSED_EPS : PLAYING_EPS) && !wrapped) el.currentTime = want;
    if (el.paused && !long.started && !this.clock.isBuffering()) {
      long.started = true;
      void el.play().catch(() => {}).finally(() => { long.started = false; });
    }
  }

  // -------------------------------------------------------------------------------------------------------- the soundtrack

  /** The page's one track is moved and held like a narration clip, plays muted when the viewer turns the sound off, and is the clock's source while it plays */
  private syncMix(t: number): void {
    const m = this.mix!;
    if (m.unlocking) return;
    const el = m.el;
    if (!this.clock.isPlaying() || t >= this.clock.duration) {
      m.held = false;
      if (!el.paused) el.pause();
      return;
    }
    if (follow(this.clock, el, m, t) && el.paused && !m.starting) {
      // the clock waits for the sound to start, so the two begin together
      m.starting = true;
      this.clock.hold(el.play().catch(() => {}).finally(() => { m.starting = false; }));
    }
  }

  // -------------------------------------------------------------------------------------------------------- loading

  /**
   * What the clock is on and has not arrived stops the clock, for a bounded time: a narration clip, and a picture whose part is on screen (a plan window that is known, not the
   * whole film), however the part draws it: `Player` waits for an `<img>`, and this waits for a CSS background too.
   */
  private demand(t: number): void {
    if (!this.clock.isPlaying()) return;
    const wait = (l: Loader) => {
      if (l.state === 'ready' || l.state === 'failed') return;
      l.hold ??= within(this.load(l), WAIT_MS, l.url).finally(() => { l.hold = undefined; });
      this.clock.hold(l.hold);
    };
    for (const u of this.uses) {
      if (u.from > t) break;
      if (u.kind !== 'narration' || u.to <= t) continue;
      const l = this.loaders.get(u.url);
      if (l) wait(l);
    }
    for (const l of this.loaders.values()) if (l.kind === 'image' && !l.speculative && l.windows.some((w) => w[0] <= t && t < w[1])) wait(l);
  }

  /**
   * Starts the loads the next `LOOKAHEAD` seconds need, critical first and then in the order they are needed, as many at once as the budget of requests allows.
   * When that leaves the connection idle it goes on with what comes later, nearest first, on a few requests only (a seek then finds its files here, and a file
   * that has to be asked for at once is not queued behind them) and only while the decoded total is under `IDLE_BUDGET`.
   */
  private pump(t: number): void {
    if (this.requests >= MAX_ACTIVE) return;
    const wanted: Array<{l: Loader; rank: number; at: number; near: boolean}> = [];
    for (const l of this.loaders.values()) {
      if (l.state !== 'idle') continue;
      const w = l.windows.find((x) => x[1] > t);
      if (w) wanted.push({l, rank: l.speculative ? 2 : l.critical ? 0 : 1, at: Math.max(w[0], t), near: w[0] < t + LOOKAHEAD});
    }
    wanted.sort((a, b) => Number(b.near) - Number(a.near) || (a.near ? a.rank - b.rank || a.at - b.at : a.at - b.at || a.rank - b.rank));
    for (const {l, near} of wanted) {
      if (near ? this.requests >= MAX_ACTIVE : this.requests >= IDLE_REQUESTS || this.stats.decodedBytes >= IDLE_BUDGET) break;
      void this.load(l);
    }
    this.release(t);
  }

  private load(l: Loader): Promise<void> {
    if (l.promise) return l.promise;
    l.state = 'loading';
    this.requests++;
    this.stats.loads++;
    const priority = l.critical && !l.speculative ? 'high' : 'low';
    l.promise = (async () => {
      try {
        if (l.kind === 'audio') {
          const res = await this.env.fetch(l.url, {priority} as RequestInit);
          if (!res.ok) throw new Error(`${res.status}`);
          const ctx = this.context();
          if (!ctx) throw new Error('no audio context');
          l.buffer = await ctx.decodeAudioData(await res.arrayBuffer());
          l.bytes = l.buffer.length * l.buffer.numberOfChannels * 4;
        } else if (l.kind === 'image') {
          const img = new Image();
          (img as HTMLImageElement & {fetchPriority: string}).fetchPriority = priority;
          img.decoding = 'async';
          img.src = l.url;
          await img.decode();
          l.image = img;
          l.bytes = img.naturalWidth * img.naturalHeight * 4;
        } else {
          const v = this.video(l);
          // a phone loads nothing until the clip is played: the wait is bounded, and the clip is then the player's to start
          await within(new Promise<void>((ok) => { if (v.readyState >= 2) ok(); else { v.addEventListener('loadeddata', () => ok(), {once: true}); v.addEventListener('error', () => ok(), {once: true}); } }), 3000, l.url);
        }
        l.state = 'ready';
        this.stats.decodedBytes += l.bytes;
      } catch (e) {
        l.state = 'failed';
        console.warn(`media not loaded, playing on without it: ${l.url} (${(e as Error).message})`);
      } finally {
        this.requests--;
        this.evaluate();
      }
    })();
    return l.promise;
  }

  /** Lets go of what has been decoded and is past, oldest first, once there is more than the budget */
  private release(t: number): void {
    if (this.stats.decodedBytes <= DECODED_BUDGET) return;
    const past = [...this.loaders.values()].filter((l) => l.state === 'ready' && l.bytes > 0 && !l.taken && l.windows.every((w) => w[1] < t - RELEASE_MARGIN));
    past.sort((a, b) => a.windows[a.windows.length - 1][1] - b.windows[b.windows.length - 1][1]);
    for (const l of past) {
      if (this.stats.decodedBytes <= DECODED_BUDGET) break;
      this.stats.decodedBytes -= l.bytes;
      l.buffer = l.image = undefined;
      if (l.video) { l.video.removeAttribute('src'); l.video.load(); l.video = undefined; }
      l.bytes = 0;
      l.state = 'idle';
      l.promise = undefined;
    }
  }

  // -------------------------------------------------------------------------------------------------------- clips

  private video(l: Loader): HTMLVideoElement {
    if (!l.video) {
      const v = document.createElement('video');
      v.preload = 'auto';
      v.muted = true;
      v.playsInline = true;
      v.src = l.url;
      l.video = v;
    }
    return l.video;
  }

  /** The `<video>` of a clip, made ahead of its time, for `<Video>` to show; null while another `<Video>` has it (that one makes its own) */
  takeVideo(url: string): HTMLVideoElement | null {
    let l = this.loaders.get(url);
    if (!l) this.loaders.set(url, (l = {url, kind: 'video', state: 'idle', critical: true, speculative: true, windows: [], bytes: 0}));
    if (l.taken) return null;
    l.taken = true;
    return this.video(l);
  }

  returnVideo(url: string): void {
    const l = this.loaders.get(url);
    if (l) l.taken = false;
  }
}
