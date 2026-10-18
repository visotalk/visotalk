/**
 * Time solver + compiler: IR (semantic time) → absolute seconds.
 *
 * Inputs: the document and the measured duration of every narration line (TTS). Word anchors use the line's word
 * timings when present (forced alignment), otherwise the character position of the phrase in the spoken text.
 */
import type {Action, Easing, Id, MotionKind, VisoDoc} from './spec.ts';
import {sayOf} from './normalize.ts';

/** Default pacing (seconds); documents override it with `pacing` */
export const DEFAULT_PACING = {lead: 0.4, hold: 0.4, tail: 0.8};

/** Per line: the clip, its length and, when the clip was aligned, word times (seconds from the clip start). */
export type VoiceManifest = Record<string, {duration: number; audio: string; words?: Array<{w: string; t0: number; t1: number; p?: number}>}>;

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
  props: Record<string, number | string | boolean>;
}

export interface Compiled {
  /** frames per second the events are snapped to (see `snap`) */
  fps: number;
  duration: number;
  scenes: TScene[];
  actions: TAction[];
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
  return {fps, duration: sn(cursor), scenes, actions};
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
    } else if ('line' in at) {
      const line = e.sc.lines.find((l) => l.id === at.line);
      if (!line) throw new Error(`line "${at.line}" is not in scene "${e.sc.id}"`);
      t = wordTime(line, at.word, at.edge ?? 'start', at.nth) + (at.offset ?? 0);
    } else if ('at' in at) t = e.sc.from + at.at;
    else t = (at.scene === 'start' ? e.sc.from : e.sc.end) + (at.offset ?? 0);
    visiting.delete(e.a);
    starts.set(e.a, t);
    return t;
  };
  const endOf = (e: Entry): number => {
    const last = snap(fps, startOf(e) + ([e.a.on].flat().length - 1) * (e.a.stagger ?? 0));
    return e.a.motion === 'set' ? last : last + (e.a.dur ?? MOTION_DUR[e.a.motion]);
  };
  entries.forEach(startOf);
  return starts;
}

function compileScene(scene: VisoDoc['scenes'][number], sc: TScene, fps: number, starts: Map<Action, number>, actions: TAction[]) {
  for (const a of scene.animations) {
    const start = starts.get(a)!;
    [a.on].flat().forEach((on, k) => {
      actions.push({scene: sc.id, on, motion: a.motion, start: snap(fps, start + k * (a.stagger ?? 0)), dur: a.dur ?? MOTION_DUR[a.motion], easing: a.easing, props: a.props ?? {}});
    });
  }
}

// ------------------------------------------------------------------------------------------------ evaluation at t

const clamp01 = (p: number) => Math.min(1, Math.max(0, p));

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
export const easeAt = (e: Easing | undefined, p: number): number =>
  e === 'linear' ? p : e === 'easeIn' ? p * p * p : e === 'easeOut' ? 1 - (1 - p) ** 3 : e === 'easeInOut' || e === undefined ? (p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2) : p;

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

/** The value of a prop of a target at t: `set` and `tween` actions in time order over `base`; a tween runs from the value the earlier ones reached, and of a prop with no number before it jumps */
export function propAt(c: Compiled, on: Id, name: string, t: number, base: number | string | boolean = 0, scene?: Id): number | string | boolean {
  let value: number | string | boolean = base;
  let tween: {from: number; to: number; start: number; dur: number; easing?: Easing} | undefined;
  const valueAt = (time: number): number | string | boolean => {
    if (!tween) return value;
    const p = tween.dur > 0 ? clamp01((time - tween.start) / tween.dur) : 1;
    return p >= 1 ? tween.to : tween.from + (tween.to - tween.from) * easeAt(tween.easing, p);
  };
  const events = actionsOf(c, on, scene).filter((a) => (a.motion === 'set' || a.motion === 'tween') && a.props[name] !== undefined && a.start <= t);
  for (const a of events) {
    const to = a.props[name];
    const from = valueAt(a.start);
    if (a.motion === 'tween' && typeof to === 'number' && typeof from === 'number') {
      value = to;
      tween = {from, to, start: a.start, dur: a.dur, easing: a.easing ?? 'easeInOut'};
    } else {
      value = to;
      tween = undefined;
    }
  }
  return valueAt(t);
}
