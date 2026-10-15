/**
 * Time solver + compiler: IR (semantic time) → absolute seconds.
 *
 * Inputs: the document and the measured duration of every narration line (TTS). Word anchors use the line's word
 * timings when present (forced alignment), otherwise the character position of the phrase in the spoken text.
 */
import type {Action, Anchor, Beat, Easing, MotionKind, Path, Scene, VisoDoc} from './spec.ts';
import {sayOf} from './normalize.ts';
import {markOffset, parseSay, type Mark} from './marks.ts';

/** Default pacing (seconds); documents override it with `pacing` */
export const DEFAULT_PACING = {lead: 0.4, gap: 0.3, hold: 0.4, tail: 0.8};

/** Per line: the clip, its length and, when the clip was aligned, word times (seconds from the clip start). */
export type VoiceManifest = Record<string, {duration: number; audio: string; words?: Array<{w: string; t0: number; t1: number; p?: number}>}>;

export interface TLine {
  id: string;
  text: string;
  say: string;
  live?: string;
  words?: Array<{w: string; t0: number; t1: number; p?: number}>;
  /** names written into `say`, as word indices of the clean text */
  marks?: Mark[];
  from: number; // absolute seconds
  duration: number;
  audio?: string;
}
export interface TBeat {
  id: string;
  scene: string;
  from: number;
  end: number;
  lines: TLine[];
}
export interface TScene {
  id: string;
  from: number;
  /** frame time at which the scene is over; `from + duration` can differ from it by rounding, so test against `end` */
  end: number;
  duration: number;
  beats: TBeat[];
}

/** Default durations per motion (seconds) */
export const MOTION_DUR: Record<MotionKind, number> = {
  appear: 0.45, disappear: 0.3, morph: 0.6, set: 0, tween: 0.6, highlight: 0.6, typewriter: 1.0, countUp: 0.8, drawIn: 1.0,
  flow: 0.8, kenBurns: 4, stamp: 0.35, wipe: 0.6, crossfade: 0.5,
};
export const ENTRANCES = new Set<MotionKind>(['appear', 'drawIn', 'stamp', 'typewriter', 'wipe', 'crossfade', 'countUp']);
/** entrances that hide their target until they start (countUp shows its start value instead) */
export const HIDING = new Set<MotionKind>(['appear', 'drawIn', 'stamp', 'typewriter', 'wipe', 'crossfade']);

export interface TAction {
  path: Path;
  motion: MotionKind;
  start: number;
  dur: number;
  beatFrom: number;
  /** an entrance hides its target from here until it starts: its beat start, or the scene start for a first entrance */
  hideFrom: number;
  easing?: Easing;
  params: Record<string, unknown>;
}
export interface TState {
  t: number;
  path: Path;
  visible?: boolean;
  emphasis?: 'none' | 'focus' | 'dim';
  props?: Record<string, unknown>;
}
export interface TInteraction {
  id: string;
  from: number; // active from its beat's start until its `until` boundary
  to: number;
  target: Path;
  event: string;
  do: NonNullable<Beat['interactions']>[number]['do'];
  export: 'ignore' | 'caption' | 'linearize';
}

export interface Compiled {
  /** frames per second the events are snapped to (see `snap`) */
  fps: number;
  duration: number;
  scenes: TScene[];
  actions: TAction[];
  states: TState[];
  interactions: TInteraction[];
}

export const DEFAULT_FPS = 30;

/**
 * The frame time of t: the nearest frame boundary, as `n / fps`. Every event the solver emits (scene, beat and line starts, action
 * starts) is on this grid, and the exporter asks for a frame `n` by computing the very same `n / fps`, so comparing the two is exact
 * and a frame is the whole of a time: the page state at frame n depends on n alone.
 */
export const snap = (fps: number, t: number): number => Math.round(t * fps + 1e-9) / fps;

/** Solve narration, beats and anchors into times. `fps` defaults to the document's export frame rate (30). */
export function solve(doc: VisoDoc, voice: VoiceManifest, fps: number = doc.exports?.fps ?? DEFAULT_FPS): Compiled {
  const sn = (t: number) => snap(fps, t);
  const scenes: TScene[] = [];
  const actions: TAction[] = [];
  const states: TState[] = [];
  const interactions: TInteraction[] = [];
  let cursor = 0;

  const pace = {...DEFAULT_PACING, ...(doc.pacing ?? {})};
  for (const scene of doc.scenes) {
    const sFrom = cursor;
    let t = sFrom + pace.lead;
    const beats: TBeat[] = [];
    scene.beats.forEach((beat, bi) => {
      const bFrom = bi === 0 ? sFrom : t;
      const lines: TLine[] = [];
      for (const l of beat.lines ?? []) {
        const v = voice[l.id];
        if (!v) throw new Error(`no voice entry for line "${l.id}"`);
        lines.push({id: l.id, text: l.text, say: sayOf(doc, l), marks: l.say ? parseSay(l.say).marks : undefined, live: l.live, words: l.words ?? v.words, from: sn(t), duration: v.duration, audio: v.audio});
        t += v.duration + pace.gap;
      }
      let end = lines.length ? t - pace.gap + (beat.hold ?? pace.hold) : bFrom + (beat.duration ?? 0);
      if (bi === scene.beats.length - 1) end += pace.tail;
      t = end;
      beats.push({id: beat.id, scene: scene.id, from: sn(bFrom), end: sn(end), lines});
    });
    const sc: TScene = {id: scene.id, from: sn(sFrom), end: sn(t), duration: sn(t) - sn(sFrom), beats};
    scenes.push(sc);
    cursor = t;
  }
  const allBeats = scenes.flatMap((s) => s.beats);
  const starts = resolveStarts(doc, scenes, allBeats, fps);
  doc.scenes.forEach((scene, i) => compileScene(scene, scenes[i], allBeats, sn(cursor), fps, starts, actions, states, interactions));
  return {fps, duration: sn(cursor), scenes, actions, states, interactions};
}

/** Letters and digits of any script, lower-cased, nothing else: how an aligned word and a phrase are compared */
export const normalizeWord = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}']/gu, '');

/** The aligned words a phrase (or word index) covers, as first and last index into `line.words`; none without aligned words or when the phrase is not among them */
export function alignedSpan(line: TLine, word: string | number): {first: number; last: number} | undefined {
  if (!line.words?.length) return undefined;
  // forced-alignment timings: the phrase is a run of aligned words, compared as letters and digits of any script
  const ws = line.words.map((w) => normalizeWord(w.w));
  if (typeof word === 'number') {
    const i = Math.min(word, ws.length - 1);
    return {first: i, last: i};
  }
  const q = normalizeWord(word);
  for (let i = 0; q && i < ws.length; i++) {
    let acc = '';
    for (let j = i; ws[i] && j < ws.length && q.startsWith(acc + ws[j]); j++) {
      acc += ws[j];
      if (acc === q) return {first: i, last: j};
    }
  }
  return undefined;
}

/** Time of a phrase in a line (its start or end): from aligned words when the line has them, else a character-position estimate */
export function wordTime(line: TLine, word: string | number | undefined, edge: 'start' | 'end'): number {
  if (word === undefined) return edge === 'start' ? line.from : line.from + line.duration;
  const span = alignedSpan(line, word);
  if (span) return line.from + (edge === 'start' ? line.words![span.first].t0 : line.words![span.last].t1);
  const say = line.say;
  let i0: number, i1: number;
  if (typeof word === 'number') {
    const words = [...say.matchAll(/\S+/g)];
    const w = words[Math.min(word, words.length - 1)];
    i0 = w.index!;
    i1 = i0 + w[0].length;
  } else {
    i0 = say.toLowerCase().indexOf(word.toLowerCase());
    if (i0 < 0) throw new Error(`"${word}" not in "${say}"`);
    i1 = i0 + word.length;
  }
  return line.from + (line.duration * (edge === 'start' ? i0 : i1)) / say.length;
}

/** Time of a mark in a line: its first word's start (a point: the word it sits on), or with `end` the last word's end */
export function markTime(line: TLine, name: string, edge: 'start' | 'end'): number {
  const mark = line.marks?.find((m) => m.name === name);
  if (!mark) throw new Error(`mark "${name}" is not in line "${line.id}"`);
  return line.from + markOffset(mark, edge, line.say, line.duration, line.words);
}

export function anchorTime(beat: TBeat, a: Anchor, beats?: TBeat[]): number {
  if ('beat' in a) {
    const b = a.ref && beats ? beats.find((x) => `${x.scene}/${x.id}` === a.ref) ?? beat : beat;
    return (a.beat === 'start' ? b.from : b.end) + (a.offset ?? 0);
  }
  const line = beat.lines.find((l) => l.id === a.line)!;
  if (a.mark !== undefined) return markTime(line, a.mark, a.edge ?? 'start') + (a.offset ?? 0);
  return wordTime(line, a.word, a.edge ?? 'start') + (a.offset ?? 0);
}

/**
 * Start time of every action before stagger and snapping. A word, mark or beat anchor is solved from its own beat; `after` takes the
 * edge of another action (any beat or scene, resolved depth first), whose end is its latest target's snapped start plus `dur`.
 * `validate` reports the unknown id, the cycle and the open-ended `kenBurns` first; here they throw.
 */
function resolveStarts(doc: VisoDoc, scenes: TScene[], beats: TBeat[], fps: number): Map<Action, number> {
  type Entry = {a: Action; tb: TBeat};
  const byId = new Map<string, Entry>();
  const entries: Entry[] = [];
  doc.scenes.forEach((scene, si) => scene.beats.forEach((beat, bi) => {
    for (const a of beat.actions ?? []) {
      const e = {a, tb: scenes[si].beats[bi]};
      entries.push(e);
      if (a.id) byId.set(a.id, e);
    }
  }));
  const starts = new Map<Action, number>();
  const visiting = new Set<Action>();
  const startOf = (e: Entry): number => {
    const known = starts.get(e.a);
    if (known !== undefined) return known;
    if (visiting.has(e.a)) throw new Error(`actions anchored after one another form a cycle at "${e.a.id}"`);
    visiting.add(e.a);
    const at = e.a.at;
    let t: number;
    if ('after' in at) {
      const ref = byId.get(at.after);
      if (!ref) throw new Error(`no action has the id "${at.after}"`);
      t = (at.edge === 'start' ? snap(fps, startOf(ref)) : endOf(ref)) + (at.offset ?? 0);
    } else {
      t = anchorTime(e.tb, at, beats);
    }
    visiting.delete(e.a);
    starts.set(e.a, t);
    return t;
  };
  const endOf = (e: Entry): number => {
    const last = snap(fps, startOf(e) + ([e.a.target].flat().length - 1) * (e.a.stagger ?? 0));
    if (e.a.motion === 'set' || e.a.motion === 'highlight') return last;
    if (e.a.dur === undefined && e.a.motion === 'kenBurns') throw new Error(`action "${e.a.id}" is a kenBurns without dur: its length depends on its exit, so nothing can start after it`);
    return last + (e.a.dur ?? MOTION_DUR[e.a.motion]);
  };
  entries.forEach(startOf);
  return starts;
}

function compileScene(scene: Scene, sc: TScene, beats: TBeat[], docEnd: number, fps: number, starts: Map<Action, number>, actions: TAction[], states: TState[], interactions: TInteraction[]) {
  const first = actions.length, firstState = states.length;
  scene.beats.forEach((beat, bi) => {
    const tb = sc.beats[bi];
    for (const [path, st] of Object.entries(beat.state ?? {})) states.push({t: tb.from, path, ...st});
    for (const a of beat.actions ?? []) {
      const start = starts.get(a)!;
      [a.target].flat().forEach((path, k) => {
        actions.push({path, motion: a.motion, start: snap(fps, start + k * (a.stagger ?? 0)), dur: a.dur ?? (a.motion === 'kenBurns' ? NaN : MOTION_DUR[a.motion]), beatFrom: tb.from, hideFrom: tb.from,
          easing: a.easing, params: (a.params ?? {}) as Record<string, unknown>});
      });
      // during: the target leaves when the marked range ends
      if (a.during && 'mark' in a.at) {
        const end = snap(fps, anchorTime(tb, {...a.at, edge: 'end', offset: undefined}, beats));
        for (const path of [a.target].flat()) actions.push({path, motion: 'disappear', start: end, dur: MOTION_DUR.disappear, beatFrom: tb.from, hideFrom: tb.from, params: {}});
      }
    }
    for (const it of beat.interactions ?? []) {
      const to = it.until === 'beat' ? tb.end : it.until === 'document' ? docEnd : sc.end;
      interactions.push({id: it.id, from: tb.from, to, target: it.on.target, event: it.on.event, do: it.do, export: it.export});
    }
  });
  // kenBurns without `dur` runs until the image leaves: its next exit in this scene, or the scene end
  const sceneEnd = sc.end;
  for (const a of actions.slice(first)) {
    if (!Number.isNaN(a.dur)) continue;
    const exit = actions.slice(first).filter((x) => x.path === a.path && x.motion === 'disappear' && x.start > a.start).sort((x, y) => x.start - y.start)[0];
    a.dur = Math.max(0.1, (exit ? exit.start + exit.dur : sceneEnd) - a.start);
  }
  // hidden until the first entrance: a path whose first presence action in the scene (entrance or exit) is a hiding
  // entrance is hidden from the scene start, unless a state in this scene shows it before that entrance
  const scened = actions.slice(first).filter((a) => ENTRANCES.has(a.motion) || a.motion === 'disappear').sort((a, b) => a.start - b.start || Number(HIDING.has(b.motion)) - Number(HIDING.has(a.motion)));
  const seen = new Set<string>();
  for (const a of scened) {
    if (seen.has(a.path)) continue;
    seen.add(a.path);
    if (!HIDING.has(a.motion)) continue;
    const shown = states.slice(firstState).some((st) => st.path === a.path && st.visible === true && st.t < a.beatFrom);
    if (!shown) a.hideFrom = Math.min(sc.from, a.start);
  }
}

// ------------------------------------------------------------------------------------------------ evaluation at t

const objectOf = (p: Path) => p.split('#')[0];

/** Latest explicit visibility for a path (or its object) at t; undefined = never stated */
function stateVisible(c: Compiled, path: Path, t: number): boolean | undefined {
  let best: TState | undefined;
  for (const s of c.states) if (s.path === path && s.t <= t && s.visible !== undefined && (!best || s.t >= best.t)) best = s;
  return best?.visible;
}

export interface PathView {
  /** 0 = hidden, 1 = fully shown (entrance progress included) */
  presence: number;
  /** active non-entrance motions: motion → progress 0..1 */
  motions: Partial<Record<MotionKind, number>>;
  /** entrance motion currently responsible for presence (for styling) */
  entrance?: MotionKind;
  entranceProgress?: number;
}

/** Visibility and motion progress of a path at time t. Sub-parts inherit their object's presence. */
export function view(c: Compiled, path: Path, t: number): PathView {
  const own = viewOwn(c, path, t);
  if (path.includes('#')) {
    const parent = viewOwn(c, objectOf(path), t);
    return {...own, presence: Math.min(own.presence, parent.presence)};
  }
  return own;
}

/** Like view(), without inheriting the parent object's presence (the object frame already applies it) */
export function viewOwn(c: Compiled, path: Path, t: number): PathView {
  let visible = stateVisible(c, path, t) ?? true;
  let presence = visible ? 1 : 0;
  const motions: PathView['motions'] = {};
  let entrance: MotionKind | undefined, entranceProgress: number | undefined;
  for (const a of c.actions) {
    if (a.path !== path) continue;
    const p = a.dur > 0 ? (t - a.start) / a.dur : t >= a.start ? 1 : 0;
    if (ENTRANCES.has(a.motion)) {
      if (t >= a.hideFrom && t < a.start) {
        if (a.motion !== 'countUp') presence = 0; // entrance pending in this beat: not yet shown
        continue;
      }
      if (t >= a.start) {
        visible = true;
        presence = a.motion === 'countUp' ? presence || 1 : Math.min(1, Math.max(0, p));
        if (p < 1 || a.motion === 'countUp') {
          entrance = a.motion;
          entranceProgress = Math.min(1, Math.max(0, p));
        }
      }
    } else if (a.motion === 'disappear' && t >= a.start) {
      presence = 1 - Math.min(1, Math.max(0, p));
    } else if (t >= a.start && p <= 1) {
      motions[a.motion] = Math.max(0, p);
    }
  }
  return {presence, motions, entrance, entranceProgress};
}

/** Interactions active at time t (export policy filtering is the caller's job) */
export const activeInteractions = (c: Compiled, t: number) => c.interactions.filter((i) => t >= i.from && t < i.to);

export type {Action};

const easeAt = (e: Easing | undefined, p: number): number =>
  e === 'linear' ? p : e === 'easeIn' ? p * p * p : e === 'easeOut' ? 1 - (1 - p) ** 3 : p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2;

/**
 * Effective props of a path at time t: beat-state `props`, `set` actions (`params.props`) and `tween` actions (numbers that reach their value over `dur`,
 * from the value they have when it starts), applied in time order over `base`, the object's own props. Primitives merge these over the object definition, so
 * any property can change over time without new objects. A `tween` of a prop with no number before it jumps to its value.
 */
export function propsAt(c: Compiled, path: Path, t: number, base: Record<string, unknown> = {}): Record<string, unknown> {
  const events: Array<{t: number; props: Record<string, unknown>; tween?: {dur: number; easing?: Easing}}> = [];
  for (const s of c.states) if (s.path === path && s.props && s.t <= t) events.push({t: s.t, props: s.props});
  for (const a of c.actions) {
    if (a.path !== path || a.start > t || (a.motion !== 'set' && a.motion !== 'tween')) continue;
    events.push({t: a.start, props: (a.params.props ?? {}) as Record<string, unknown>, ...(a.motion === 'tween' && {tween: {dur: a.dur, easing: a.easing}})});
  }
  events.sort((a, b) => a.t - b.t);
  const cur = new Map<string, {value: unknown; tween?: {from: number; to: number; start: number; dur: number; easing?: Easing}}>();
  const valueAt = (name: string, time: number): unknown => {
    const e = cur.get(name);
    if (!e) return base[name];
    if (!e.tween) return e.value;
    const {from, to, start, dur, easing} = e.tween;
    const p = dur > 0 ? Math.min(1, Math.max(0, (time - start) / dur)) : 1;
    return p >= 1 ? to : from + (to - from) * easeAt(easing, p);
  };
  for (const ev of events) {
    for (const [name, v] of Object.entries(ev.props)) {
      const from = valueAt(name, ev.t);
      cur.set(name, ev.tween && typeof v === 'number' && typeof from === 'number' ? {value: v, tween: {from, to: v, start: ev.t, dur: ev.tween.dur, easing: ev.tween.easing}} : {value: v});
    }
  }
  return Object.fromEntries([...cur.keys()].map((name) => [name, valueAt(name, t)]));
}

/** Start time of the first action with this motion on a path (or undefined) */
export const motionStart = (c: Compiled, path: Path, motion: MotionKind): number | undefined =>
  c.actions.find((a) => a.path === path && a.motion === motion)?.start;

/** Progress 0..1 of the latest action with this motion on a path that has started by t (persists at 1 afterwards) */
export function motionProgress(c: Compiled, path: Path, motion: MotionKind, t: number): number | undefined {
  let best: TAction | undefined;
  for (const a of c.actions) if (a.path === path && a.motion === motion && a.start <= t && (!best || a.start >= best.start)) best = a;
  if (!best) return undefined;
  return best.dur > 0 ? Math.min(1, (t - best.start) / best.dur) : 1;
}
