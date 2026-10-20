/**
 * Time solver + compiler: IR (semantic time) → absolute seconds.
 *
 * Inputs: the document and the measured duration of every narration line (TTS). Word anchors use the line's word
 * timings when present (forced alignment), otherwise the character position of the phrase in the spoken text.
 */
import type {Action, Anchor, Easing, Id, MotionKind, Sound, VisoDoc} from './spec.ts';
import {sayOf} from './normalize.ts';

/** Default pacing (seconds); documents override it with `pacing` */
export const DEFAULT_PACING = {lead: 0.4, hold: 0.4, tail: 0.8};

/**
 * Per line: the clip, its length and, when the clip was aligned, word times (seconds from the clip start). `key` is the content hash of the clip (voice,
 * speed, language and the words), so `prepare` reuses a clip whoever made it, a bundle's included.
 */
export type VoiceManifest = Record<string, {duration: number; audio: string; key?: string; words?: Array<{w: string; t0: number; t1: number; p?: number}>}>;

export interface TLine {
  id: string;
  text: string;
  say: string;
  words?: Array<{w: string; t0: number; t1: number; p?: number}>;
  from: number; // absolute seconds
  duration: number;
  audio?: string;
}
export interface TScene {
  id: string;
  from: number;
  /** frame time at which the scene is over; `from + duration` can differ from it by rounding, so test against `end` */
  end: number;
  duration: number;
  lines: TLine[];
}

/** Default durations per motion (seconds) */
export const MOTION_DUR: Record<MotionKind, number> = {appear: 0.45, disappear: 0.3, tween: 0.6, set: 0};
/** Motions that decide whether a target is on screen */
const PRESENCE = new Set<MotionKind>(['appear', 'disappear']);

export interface TAction {
  scene: Id;
  /** one target of the document's action (an action on several targets compiles to one per target) */
  on: Id;
  motion: MotionKind;
  start: number;
  dur: number;
  easing?: Easing;
  repeat?: number;
  yoyo?: boolean;
  props: Record<string, number | string | boolean>;
}

/** A sound with its start and end in absolute seconds (`end` is the film's end for a looped sound without `dur`; absent for a single play of a file whose length the solver does not know) */
export interface TSound {
  scene: Id;
  asset: Id;
  start: number;
  end?: number;
  volume: number;
  loop: boolean;
  fadeIn: number;
  fadeOut: number;
  duck: number;
}

export interface Compiled {
  /** frames per second the events are snapped to (see `snap`) */
  fps: number;
  duration: number;
  scenes: TScene[];
  actions: TAction[];
  sounds: TSound[];
}

export const DEFAULT_FPS = 30;

/**
 * The frame time of t: the nearest frame boundary, as `n / fps`. Every event the solver emits (scene, line and action starts) is on this grid, and
 * the exporter asks for a frame `n` by computing the very same `n / fps`, so comparing the two is exact and a frame is the whole of a time.
 */
export const snap = (fps: number, t: number): number => Math.round(t * fps + 1e-9) / fps;

/** Solve narration and anchors into times. `fps` defaults to the document's export frame rate (30). */
export function solve(doc: VisoDoc, voice: VoiceManifest, fps: number = doc.exports?.fps ?? DEFAULT_FPS): Compiled {
  const sn = (t: number) => snap(fps, t);
  const scenes: TScene[] = [];
  const pace = {...DEFAULT_PACING, ...(doc.pacing ?? {})};
  let cursor = 0;
  for (const scene of doc.scenes) {
    const from = cursor;
    let t = from + pace.lead;
    const lines: TLine[] = [];
    for (const l of scene.lines) {
      const v = voice[l.id];
      if (!v) throw new Error(`no voice entry for line "${l.id}"`);
      lines.push({id: l.id, text: l.text, say: sayOf(doc, l), words: l.words ?? v.words, from: sn(t), duration: v.duration, audio: v.audio});
      t += v.duration + (l.hold ?? pace.hold);
    }
    const end = lines.length ? t + pace.tail : from + (scene.duration ?? 0);
    scenes.push({id: scene.id, from: sn(from), end: sn(end), duration: sn(end) - sn(from), lines});
    cursor = end;
  }
  const starts = resolveStarts(doc, scenes, fps);
  const actions: TAction[] = [];
  doc.scenes.forEach((scene, i) => compileScene(scene, scenes[i], fps, starts, actions));
  actions.sort((a, b) => a.start - b.start);
  const duration = sn(cursor);
  const sounds = doc.scenes.flatMap((scene, i) => (scene.sounds ?? []).map((s) => compileSound(s, scenes[i], fps, duration))).sort((a, b) => a.start - b.start);
  return {fps, duration, scenes, actions, sounds};
}

/** Letters and digits of any script, lower-cased, nothing else: how an aligned word and a phrase are compared */
export const normalizeWord = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}']/gu, '');

/** Scripts written without spaces between words: a phrase can start and end between any two of their characters */
const UNSPACED = String.raw`\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}\u30FC`; // U+30FC, the katakana long-vowel mark, is Script=Common: left out it would stick to the punctuation after it
const TOKEN = new RegExp(`[${UNSPACED}]\\p{M}*|[^\\s${UNSPACED}]+`, 'gu');

export interface SpeechToken {
  text: string;
  /** character offset in the spoken text */
  index: number;
}
/** The units a phrase is made of: a word where words are separated by spaces, a character in Chinese, Japanese, Thai and the like (which have no spaces to split on) */
export const speechTokens = (say: string): SpeechToken[] => [...say.matchAll(TOKEN)].map((m) => ({text: m[0], index: m.index!}));

/** What a full-width pause mark adds to the speaking time, in characters' worth: a comma is a breath, a full stop a rest */
const PAUSE: Record<string, number> = {'，': 2, '、': 2, '；': 2, '：': 2, '。': 4, '！': 4, '？': 4, '…': 4};
const pauseBefore = (say: string, at: number): number => [...say.slice(0, at)].reduce((n, c) => n + (PAUSE[c] ?? 0), 0);

/** Where a phrase sits among words: each occurrence as first and last index, where the phrase is the words joined, compared by `normalizeWord` */
function phraseSpans(words: string[], phrase: string): Array<{first: number; last: number}> {
  const q = normalizeWord(phrase);
  const ws = words.map(normalizeWord);
  const out: Array<{first: number; last: number}> = [];
  for (let i = 0; q && i < ws.length; i++) {
    let acc = '';
    for (let j = i; ws[i] && j < ws.length && q.startsWith(acc + ws[j]); j++) {
      acc += ws[j];
      if (acc === q) { out.push({first: i, last: j}); break; }
    }
  }
  return out;
}

const UNSPACED_TEXT = new RegExp(`[${UNSPACED}]`, 'u');

/** The aligned words the nth occurrence of a phrase covers, as first and last index into `line.words`; none without aligned words or when the phrase is not among them */
export function alignedSpan(line: TLine, word: string, nth = 1): {first: number; last: number} | undefined {
  if (!line.words?.length) return undefined;
  const spans = phraseSpans(line.words.map((w) => w.w), word);
  // in Chinese, Japanese and Thai a phrase is any run of characters, which the aligner's words may not follow: the occurrences count as they did before alignment (the
  // document that validated still does), and a phrase the words do not follow is estimated by character
  if (UNSPACED_TEXT.test(line.say) && spans.length !== phraseOffsets(line.say, word).length) return undefined;
  return spans[nth - 1];
}

/** How many times a phrase occurs in a line's spoken text: as aligned words when the line has them, else as the words of `say` */
export function occurrences(line: Pick<TLine, 'say' | 'words'>, word: string): number {
  const aligned = !!line.words?.length && !UNSPACED_TEXT.test(line.say);
  return phraseSpans(aligned ? line.words!.map((w) => w.w) : speechTokens(line.say).map((t) => t.text), word).length;
}

/** Where each occurrence of a phrase sits in the spoken text, as character offsets (the same occurrences `nth` counts); none where it is not */
function phraseOffsets(say: string, word: string): Array<{from: number; to: number}> {
  const tokens = speechTokens(say);
  return phraseSpans(tokens.map((t) => t.text), word).map((s) => ({from: tokens[s.first].index, to: tokens[s.last].index + tokens[s.last].text.length}));
}

/** The spoken text with the phrase an anchor finds marked in brackets ("a [one] hundred"), so an author can see which words and which occurrence the anchor means; undefined when it is not in it */
export function markPhrase(say: string, word: string, nth = 1): string | undefined {
  const at = phraseOffsets(say, word)[nth - 1];
  return at && `${say.slice(0, at.from)}[${say.slice(at.from, at.to)}]${say.slice(at.to)}`;
}

/** Every occurrence of a phrase with a few words round it, for an error that asks which one is meant: ["…the [curve] keeps…", "…and the [curve] is…"] */
export function phraseContexts(say: string, word: string, radius = 18): string[] {
  return phraseOffsets(say, word).map(({from, to}) => `${from > radius ? '…' : ''}${say.slice(Math.max(0, from - radius), from)}[${say.slice(from, to)}]${say.slice(to, to + radius)}${to + radius < say.length ? '…' : ''}`);
}

/** Which occurrence (counting from 1) of a phrase starts at this character of the spoken text; undefined when none does, e.g. the phrase starts inside a word */
export function occurrenceAt(say: string, word: string, from: number): number | undefined {
  const k = phraseOffsets(say, word).findIndex((o) => o.from === from);
  return k < 0 ? undefined : k + 1;
}

/** Time of a phrase in a line (its start or end): from aligned words when the line has them, else a character-position estimate over the words of `say` */
export function wordTime(line: TLine, word: string | undefined, edge: 'start' | 'end', nth = 1): number {
  if (word === undefined) return edge === 'start' ? line.from : line.from + line.duration;
  const span = alignedSpan(line, word, nth);
  if (span) return line.from + (edge === 'start' ? line.words![span.first].t0 : line.words![span.last].t1);
  // the same words `occurrences` counted, so a phrase the validator accepted is found here and a substring of another word is not
  const tokens = speechTokens(line.say);
  const found = phraseSpans(tokens.map((t) => t.text), word)[nth - 1];
  if (!found) throw new Error(`"${word}"${nth > 1 ? ` (occurrence ${nth})` : ''} is not in "${line.say}"`);
  const at = edge === 'start' ? tokens[found.first].index : tokens[found.last].index + tokens[found.last].text.length;
  // position in speaking time: a character each, and the full-width pauses of Chinese and Japanese weigh more (no change for text without them)
  return line.from + (line.duration * (at + pauseBefore(line.say, at))) / (line.say.length + pauseBefore(line.say, line.say.length));
}

/** Where an anchor that names no other action falls, in absolute seconds before snapping */
export function anchorStart(sc: TScene, at: Anchor): number {
  if ('line' in at) {
    const line = sc.lines.find((l) => l.id === at.line);
    if (!line) throw new Error(`line "${at.line}" is not in scene "${sc.id}"`);
    return wordTime(line, at.word, at.edge ?? 'start', at.nth) + (at.offset ?? 0);
  }
  if ('at' in at) return sc.from + at.at;
  return (at.scene === 'start' ? sc.from : sc.end) + (at.offset ?? 0);
}

/**
 * Start time of every action before stagger and snapping. A word, scene-time or scene-edge anchor is solved from its own scene; `after` takes the
 * edge of another action (any scene, resolved depth first), whose end is its latest target's snapped start plus `dur`. `validate` reports the unknown
 * id and the cycle first; here they throw.
 */
export function resolveStarts(doc: VisoDoc, scenes: TScene[], fps: number): Map<Action, number> {
  type Entry = {a: Action; sc: TScene};
  const byId = new Map<string, Entry>();
  const entries: Entry[] = [];
  doc.scenes.forEach((scene, si) => {
    for (const a of scene.animations) {
      const e = {a, sc: scenes[si]};
      entries.push(e);
      if (a.id) byId.set(a.id, e);
    }
  });
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
    } else t = anchorStart(e.sc, at);
    visiting.delete(e.a);
    starts.set(e.a, t);
    return t;
  };
  const endOf = (e: Entry): number => {
    const last = snap(fps, startOf(e) + ([e.a.on].flat().length - 1) * (e.a.stagger ?? 0));
    return e.a.motion === 'set' ? last : last + playTime(e.a);
  };
  entries.forEach(startOf);
  return starts;
}

function compileScene(scene: VisoDoc['scenes'][number], sc: TScene, fps: number, starts: Map<Action, number>, actions: TAction[]) {
  for (const a of scene.animations) {
    const start = starts.get(a)!;
    [a.on].flat().forEach((on, k) => {
      actions.push({scene: sc.id, on, motion: a.motion, start: snap(fps, start + k * (a.stagger ?? 0)), dur: a.dur ?? MOTION_DUR[a.motion], easing: a.easing, ...(a.repeat !== undefined && {repeat: a.repeat}), ...(a.yoyo !== undefined && {yoyo: a.yoyo}), props: a.props ?? {}});
    });
  }
}

function compileSound(s: Sound, sc: TScene, fps: number, filmEnd: number): TSound {
  const start = snap(fps, anchorStart(sc, s.at));
  const end = s.dur !== undefined ? snap(fps, start + s.dur) : s.loop ? filmEnd : undefined;
  return {scene: sc.id, asset: s.asset, start, ...(end !== undefined && {end}), volume: s.volume ?? 0, loop: s.loop ?? false, fadeIn: s.fadeIn ?? 0, fadeOut: s.fadeOut ?? 0, duck: s.duck ?? 0};
}

// ------------------------------------------------------------------------------------------------ evaluation at t

const clamp01 = (p: number) => Math.min(1, Math.max(0, p));

/** How long an action plays: `dur` for each of its plays (a repeat forever counts as one: whatever follows it starts after the first) */
export const playTime = (a: Pick<Action, 'motion' | 'dur' | 'repeat'>): number => (a.dur ?? MOTION_DUR[a.motion]) * (a.repeat !== undefined && a.repeat > 0 ? a.repeat + 1 : 1);

/**
 * The actions on a target, in time order: indexed once per compiled document, since every part asks at every frame. A target in a scene's part lives and
 * dies with the scene (`scene` names it): only that scene's actions reach it. A target in a global part is one thing across scenes (`scene` absent).
 */
const byTarget = new WeakMap<Compiled, Map<string, TAction[]>>();
function actionsOf(c: Compiled, on: Id, scene?: Id): TAction[] {
  let index = byTarget.get(c);
  if (!index) {
    index = new Map();
    for (const a of c.actions) for (const k of [`${a.on}`, `${a.scene}:${a.on}`]) (index.get(k) ?? index.set(k, []).get(k)!).push(a);
    byTarget.set(c, index);
  }
  return index.get(scene === undefined ? on : `${scene}:${on}`) ?? [];
}
const POWER = {Quad: 2, Quart: 4, Quint: 5} as const;
const BACK = 1.70158;
/** Cubic bezier through (0,0), (x1,y1), (x2,y2), (1,1) as the CSS timing function: x found by bisection, then y */
const bezier = (x1: number, y1: number, x2: number, y2: number) => (p: number): number => {
  const at = (u: number, a: number, b: number) => 3 * (1 - u) ** 2 * u * a + 3 * (1 - u) * u * u * b + u ** 3;
  let lo = 0, hi = 1;
  for (let k = 0; k < 28; k++) {
    const mid = (lo + hi) / 2;
    if (at(mid, x1, x2) < p) lo = mid; else hi = mid;
  }
  return at((lo + hi) / 2, y1, y2);
};
const curves = new Map<string, (p: number) => number>();
/** The function behind an easing name; undefined for a name that is not one (`validate` reports it) */
export function easingFn(e: Easing | string | undefined): ((p: number) => number) | undefined {
  if (e === undefined) e = 'easeInOut';
  const known = curves.get(e);
  if (known) return known;
  let f: ((p: number) => number) | undefined;
  const m = /^ease(In|Out|InOut)(Sine|Quad|Quart|Quint|Back)?(?:\((-?[\d.]+)\))?$/.exec(e);
  const bz = /^cubic-bezier\(\s*(-?[\d.]+)[\s,]+(-?[\d.]+)[\s,]+(-?[\d.]+)[\s,]+(-?[\d.]+)\s*\)$/.exec(e);
  if (e === 'linear') f = (p) => p;
  else if (bz) f = bezier(+bz[1], +bz[2], +bz[3], +bz[4]);
  else if (m && (m[3] === undefined || m[2] === 'Back')) {
    const kind = m[1], curve = m[2] ?? 'Cubic';
    const over = m[3] !== undefined ? +m[3] : BACK;
    const inn: (p: number) => number =
      curve === 'Sine' ? (p) => 1 - Math.cos((p * Math.PI) / 2)
      : curve === 'Back' ? (p) => (over + 1) * p ** 3 - over * p ** 2
      : curve === 'Cubic' ? (p) => p ** 3
      : (p) => p ** POWER[curve as keyof typeof POWER];
    // the in and out curves of one family mirror each other; in-out joins the two halves
    f = kind === 'In' ? inn : kind === 'Out' ? (p) => 1 - inn(1 - p) : (p) => (p < 0.5 ? inn(2 * p) / 2 : 1 - inn(2 - 2 * p) / 2);
  }
  if (f) curves.set(e, f);
  return f;
}
export const easeAt = (e: Easing | undefined, p: number): number => (easingFn(e) ?? easingFn('easeInOut')!)(p);

/**
 * How much of a target is on screen at t, 0 to 1. A part (`hidden`) is invisible until its first `appear`; so is any other target whose first appear or
 * disappear is an appear. An appear ramps it towards 1 over the action's `dur`, a disappear towards 0, each from the value it has when the action starts: an appear of
 * what is already there changes nothing, and an action that interrupts a ramp turns it round from where it is. A target no action names is always 1.
 * `scene` is the scene whose part holds the target (see `actionsOf`); absent for a target of a global part.
 */
export function presenceAt(c: Compiled, on: Id, t: number, scene?: Id, hidden = false): number {
  const acts = actionsOf(c, on, scene).filter((a) => PRESENCE.has(a.motion));
  let ramp = {from: hidden || acts[0]?.motion === 'appear' ? 0 : 1, to: 0, start: -Infinity, dur: 0, easing: undefined as Easing | undefined};
  ramp.to = ramp.from;
  const at = (time: number) => (ramp.dur > 0 ? ramp.from + (ramp.to - ramp.from) * easeAt(ramp.easing, clamp01((time - ramp.start) / ramp.dur)) : time >= ramp.start ? ramp.to : ramp.from);
  for (const a of acts) {
    if (t < a.start) break;
    ramp = {from: at(a.start), to: a.motion === 'appear' ? 1 : 0, start: a.start, dur: a.dur, easing: a.easing ?? (a.motion === 'appear' ? 'easeOut' : 'easeInOut')};
  }
  return at(t);
}

type Val = number | string | boolean;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const hsl = (h: number, s: number, l: number): [number, number, number] => {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min((n + h / 30) % 12 - 3, 9 - ((n + h / 30) % 12), 1));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
};
/** A CSS colour as [r, g, b, a] (0 to 255, a 0 to 1): `#rgb`, `#rrggbb`, `#rrggbbaa`, `rgb()`, `rgba()`, `hsl()`, `hsla()` in the comma or the space syntax; undefined for anything else */
export function parseColor(v: string): [number, number, number, number] | undefined {
  const s = v.trim().toLowerCase();
  const hex = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(s);
  if (hex) {
    const h = hex[1].length <= 4 ? [...hex[1]].map((c) => c + c).join('') : hex[1];
    const n = [0, 2, 4, 6].map((k) => (h.length > k ? parseInt(h.slice(k, k + 2), 16) : 255));
    return [n[0], n[1], n[2], n[3] / 255];
  }
  const fn = /^(rgba?|hsla?)\(([^)]+)\)$/.exec(s);
  if (!fn) return undefined;
  const parts = fn[2].split(/[\s,/]+/).filter(Boolean);
  if (parts.length < 3 || parts.length > 4) return undefined;
  const num = (x: string, pct = 1) => (x.endsWith('%') ? (parseFloat(x) / 100) * pct : parseFloat(x));
  const a = parts[3] === undefined ? 1 : clamp(num(parts[3]), 0, 1);
  if (![...parts].every((x) => Number.isFinite(parseFloat(x)))) return undefined;
  if (fn[1].startsWith('rgb')) return [clamp(num(parts[0], 255), 0, 255), clamp(num(parts[1], 255), 0, 255), clamp(num(parts[2], 255), 0, 255), a];
  const [r, g, b] = hsl(((parseFloat(parts[0]) % 360) + 360) % 360, clamp(num(parts[1]), 0, 1), clamp(num(parts[2]), 0, 1));
  return [r, g, b, a];
}
const LENGTH = /^(-?\d*\.?\d+)(px|%|em|rem|vw|vh|deg)$/;
/** What a tween can move: a number, a colour, or a length with a unit */
export const tweenable = (v: unknown): boolean => typeof v === 'number' || (typeof v === 'string' && (parseColor(v) !== undefined || LENGTH.test(v.trim())));

/** `from` towards `to` by k (0 to 1): numbers, colours (blended in sRGB, as "rgba(…)") and lengths of one unit; undefined when the two are not of one kind */
function mixValue(from: Val, to: Val, k: number): Val | undefined {
  if (typeof from === 'number' && typeof to === 'number') return from + (to - from) * k;
  if (typeof from !== 'string' || typeof to !== 'string') return undefined;
  const a = parseColor(from), b = parseColor(to);
  if (a && b) {
    if (k >= 1) return to;
    if (k <= 0) return from;
    const m = a.map((x, n) => x + (b[n] - x) * k);
    return `rgba(${Math.round(m[0])}, ${Math.round(m[1])}, ${Math.round(m[2])}, ${+m[3].toFixed(3)})`;
  }
  const la = LENGTH.exec(from.trim()), lb = LENGTH.exec(to.trim());
  if (la && lb && la[2] === lb[2]) return `${+(parseFloat(la[1]) + (parseFloat(lb[1]) - parseFloat(la[1])) * k).toFixed(4)}${la[2]}`;
  return undefined;
}

/**
 * The value of a prop of a target at t: `set` and `tween` actions in time order over `base`; a tween runs from the value the earlier ones reached, and of a prop with no
 * value of its own kind before it (a number to a colour) jumps. A tween takes numbers, colours and lengths; `repeat` plays it again, `yoyo` back and forth.
 */
export function propAt(c: Compiled, on: Id, name: string, t: number, base: Val = 0, scene?: Id): Val {
  let value: Val = base;
  let tween: {from: Val; to: Val; start: number; dur: number; easing?: Easing; repeat?: number; yoyo?: boolean} | undefined;
  const valueAt = (time: number): Val => {
    if (!tween) return value;
    const plays = !tween.repeat ? 1 : tween.repeat < 0 ? Infinity : tween.repeat + 1;
    const raw = tween.dur > 0 ? Math.max(0, (time - tween.start) / tween.dur) : Infinity;
    let q: number;
    if (raw >= plays) q = tween.yoyo && plays % 2 === 0 ? 0 : 1;
    else {
      const cycle = Math.floor(raw);
      q = raw - cycle;
      if (tween.yoyo && cycle % 2 === 1) q = 1 - q;
    }
    return q >= 1 ? tween.to : q <= 0 ? tween.from : mixValue(tween.from, tween.to, easeAt(tween.easing, q))!;
  };
  const events = actionsOf(c, on, scene).filter((a) => (a.motion === 'set' || a.motion === 'tween') && a.props[name] !== undefined && a.start <= t);
  for (const a of events) {
    const to = a.props[name];
    const from = valueAt(a.start);
    if (a.motion === 'tween' && mixValue(from, to, 0.5) !== undefined) {
      value = to;
      tween = {from, to, start: a.start, dur: a.dur, easing: a.easing ?? 'easeInOut', repeat: a.repeat, yoyo: a.yoyo};
    } else {
      value = to;
      tween = undefined;
    }
  }
  return valueAt(t);
}

/** The time the narration takes to settle before a line starts and to come back after one ends: a step back at once, and a release that holds through the pauses between lines (seconds) */
const DUCK_ATTACK = 0.12;
const DUCK_RELEASE = 0.5;

/** 0 to 1: how much the narration is speaking at t, a ramp in before a line and out after it, the highest of the lines near t */
export function speechAt(c: Compiled, t: number): number {
  let level = 0;
  for (const sc of c.scenes) {
    if (t < sc.from - DUCK_ATTACK || t > sc.end + DUCK_RELEASE) continue;
    for (const l of sc.lines) {
      const end = l.from + l.duration;
      const v = t < l.from - DUCK_ATTACK ? 0 : t < l.from ? clamp01((t - (l.from - DUCK_ATTACK)) / DUCK_ATTACK) : t < end ? 1 : clamp01(1 - (t - end) / DUCK_RELEASE);
      if (v > level) level = v;
    }
  }
  return level;
}

/**
 * The gain of a sound at t, a multiplier on its file (1 is the file as it is): 0 outside it; `volume` in dB; a linear fade in from its start and out to its end;
 * and `duck` dB less in proportion to how much the narration is speaking (`speechAt`). The player scales the sound by this each frame and the exporter
 * samples it into the envelope it multiplies the file by, so a film sounds as it is heard in the player.
 */
export function soundGain(c: Compiled, s: TSound, t: number): number {
  if (t < s.start || (s.end !== undefined && t >= s.end)) return 0;
  let g = 10 ** ((s.volume - s.duck * speechAt(c, t)) / 20);
  if (s.fadeIn > 0) g *= clamp01((t - s.start) / s.fadeIn);
  if (s.fadeOut > 0 && s.end !== undefined) g *= clamp01((s.end - t) / s.fadeOut);
  return g;
}
