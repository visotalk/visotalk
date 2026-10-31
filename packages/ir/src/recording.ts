/** MiniMax's measured word/character units become immutable speech lines; silence stays outside their spans. */
import type { Line } from './spec.ts';
export interface RecordedUnit {
  text: string;
  start: number;
  end: number;
  speaker?: string;
}
const ms = (t: number) => Math.round(t * 1000) / 1000;
// escapes, not the characters: a page that does not say it is UTF-8 would read the bundled characters as other ones and refuse the range
const UNSPACED = '\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}\\u3000-\\u303F\\uFF00-\\uFFEF';
const UNSPACED_END = new RegExp(`[${UNSPACED}]$`, 'u'),
  UNSPACED_START = new RegExp(`^[${UNSPACED}]`, 'u');
/** The language a transcript is in, as a document's `lang`: the recognizer is told one, and answers in the language that was spoken */
export const recordingLang = (text: string): 'zh-CN' | 'en' => (/\p{Script=Han}/u.test(text) ? 'zh-CN' : 'en');
export function recordingLines(units: RecordedUnit[], duration: number): Line[] {
  if (!Number.isFinite(duration) || duration <= 0 || duration > 3600) throw new Error('A recording must be between 0 and 3600 seconds');
  const lines: Line[] = [];
  let group: RecordedUnit[] = [];
  let end = 0;
  const flush = () => {
    if (!group.length) return;
    const start = group[0].start,
      last = group[group.length - 1].end;
    // words are spaced unless either side is a script written without spaces (Chinese gives a character, and its punctuation, at a time)
    const say = group.map((w, i) => `${i && !UNSPACED_END.test(group[i - 1].text) && !UNSPACED_START.test(w.text) ? ' ' : ''}${w.text}`).join('');
    lines.push({
      id: `line-${lines.length + 1}`,
      text: say,
      say,
      span: { start, end: last },
      words: group.map((w) => ({ w: w.text, t0: ms(w.start - start), t1: ms(w.end - start) })),
    });
    group = [];
  };
  for (const unit of units) {
    if (
      typeof unit.text !== 'string' ||
      !unit.text.trim() ||
      !Number.isFinite(unit.start) ||
      !Number.isFinite(unit.end) ||
      unit.start < end - 0.001 ||
      unit.end <= unit.start ||
      unit.end > duration + 0.001
    )
      throw new Error('ASR returned invalid or overlapping measured word times');
    if (group.length && (unit.start - end > 0.65 || unit.speaker !== group[group.length - 1].speaker)) flush();
    else if (group.length && unit.end - group[0].start > 12) {
      // a sentence too long for one caption breaks after its last comma, never inside a word (two characters of one Chinese word were split across captions)
      let comma = group.length - 1;
      while (comma >= 0 && !/[,;:，、；：]["'”’)）]*$/.test(group[comma].text)) comma--;
      const rest = comma >= 0 ? group.splice(comma + 1) : [];
      flush();
      group = rest;
    }
    const text = unit.text.trim();
    group.push({ ...unit, text });
    end = unit.end;
    if (/[.!?。！？]["'”’)）]*$/.test(text)) flush();
  }
  flush();
  if (!lines.length) throw new Error('No measured speech was recognized');
  return lines;
}

/** Graphics and captions may change, but the original recording, speech order and measured timing may not. */
export function recordingChange(before: import('./spec.ts').VisoDoc, after: import('./spec.ts').VisoDoc): string | null {
  if (!before.voice?.voice.startsWith('recording:')) return null;
  const asset = (d: typeof before) => d.assets?.find((a) => a.id === d.voice?.voice.slice(10));
  const a = asset(before),
    b = asset(after);
  // a trim the person asked for: a new file cut from this one, whose speech is exactly what the cut leaves of this speech
  if (b?.trim && a && !a.trim && b.trim.source === a.src && after.voice?.voice === before.voice.voice && b.kind === a.kind) {
    const keep = b.trim.keep;
    const ordered = keep.length > 0 && keep.every(([s, e], i) => Number.isFinite(s) && Number.isFinite(e) && s >= 0 && e > s && e <= (a.analysis?.duration ?? 0) + 1e-3 && (i === 0 || s >= keep[i - 1][1]));
    const length = keep.reduce((sum, [s, e]) => sum + e - s, 0);
    if (!ordered || Math.abs((b.analysis?.duration ?? 0) - length) > 0.1) return 'A trimmed recording keeps ordered stretches of its original and is as long as they are.';
    if (JSON.stringify([a.analysis?.width, a.analysis?.height, a.analysis?.fps]) !== JSON.stringify([b.analysis?.width, b.analysis?.height, b.analysis?.fps]))
      return 'A trimmed recording keeps the original video size and frame rate.';
    const said = (lines: Line[]) => lines.map((l) => [l.id, l.say ?? l.text, l.span?.start, l.span?.end, l.words?.map((w) => [w.w, w.t0, w.t1])]);
    if (JSON.stringify(said(after.scenes.flatMap((s) => s.lines))) !== JSON.stringify(said(trimLines(before.scenes.flatMap((s) => s.lines), keep))))
      return 'A trimmed recording speaks exactly what the cut leaves of the original, at the times the cut moves it to.';
    return null;
  }
  if (
    after.voice?.voice !== before.voice.voice ||
    a?.src !== b?.src ||
    a?.kind !== b?.kind ||
    JSON.stringify([
      a?.analysis?.duration,
      a?.analysis?.width,
      a?.analysis?.height,
      a?.analysis?.fps,
      a?.analysis?.frameRate,
      a?.analysis?.frames,
    ]) !==
      JSON.stringify([
        b?.analysis?.duration,
        b?.analysis?.width,
        b?.analysis?.height,
        b?.analysis?.fps,
        b?.analysis?.frameRate,
        b?.analysis?.frames,
      ])
  )
    return 'Keep the original narration recording and its measured media properties.';
  if (
    a?.kind === 'video' &&
    (after.canvas.presets[0].width !== a.analysis?.width ||
      after.canvas.presets[0].height !== a.analysis?.height ||
      after.exports?.fps !== a.analysis?.fps)
  )
    return 'Keep the original video size and frame rate.';
  const speech = (d: typeof before) =>
    d.scenes.flatMap((s) =>
      s.lines.map((l) => [l.id, l.say ?? l.text, l.span?.start, l.span?.end, l.words?.map((w) => [w.w, w.t0, w.t1, w.p ?? null])]),
    );
  if (JSON.stringify(speech(before)) !== JSON.stringify(speech(after)))
    return 'Recorded speech, line order and measured word times are immutable. Edit captions or graphics instead.';
  return null;
}

/** The presenter regions on screen at `t` seconds of the film: the scene's own when it says them, else the document's, each within its `from`–`to` */
export function keepClearAt(doc: import('./spec.ts').VisoDoc, scene: import('./spec.ts').Scene | undefined, t: number): import('./spec.ts').KeepClear[] {
  return (scene?.keepClear ?? doc.canvas.keepClear ?? []).filter((r) => (r.from ?? -Infinity) <= t && t < (r.to ?? Infinity));
}

/** Hesitations a person may ask to have cut from their own recording: whole recognized units only, so a word that merely contains one is kept */
const FILLERS = new Set(['um', 'uh', 'erm', 'uhm', 'hmm', 'mm', '\u5443', '\u55ef']);
const bare = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
export const isFiller = (w: string) => FILLERS.has(bare(w));

export interface TrimOptions {
  /** cut hesitations ("um", "uh" and their Chinese counterparts) */
  fillers?: boolean;
  /** shorten every silence between two words to this many seconds */
  pauses?: number;
  /** frames a second of the picture, so every cut falls between two frames (a sound alone: 100) */
  fps: number;
}

/**
 * The stretches of a recording kept when it is trimmed, in its own seconds: everything but the hesitations asked away and the part of each silence
 * between two words past `pauses`. Silence before the first word and after the last is kept (an opening and an ending), every edge falls on the
 * frame grid, and a stretch shorter than two frames is dropped.
 */
export function trimPlan(lines: Line[], duration: number, o: TrimOptions): Array<[number, number]> {
  const snap = (t: number) => Math.round(t * o.fps) / o.fps;
  const words = lines.flatMap((l) => (l.words ?? []).map((w) => ({ w: w.w, start: l.span!.start + w.t0, end: l.span!.start + w.t1 })));
  const cut: Array<[number, number]> = [];
  const spoken = o.fillers ? words.filter((w) => (isFiller(w.w) ? (cut.push([w.start, w.end]), false) : true)) : words;
  if (o.pauses !== undefined) for (let i = 1; i < spoken.length; i++) {
    const a = spoken[i - 1].end, b = spoken[i].start;
    if (b - a > o.pauses) cut.push([a + o.pauses / 2, b - o.pauses / 2]);
  }
  cut.sort((x, y) => x[0] - y[0]);
  const keep: Array<[number, number]> = [];
  let at = 0;
  for (const [a, b] of cut) {
    if (snap(a) > at) keep.push([at, snap(a)]);
    at = Math.max(at, snap(b));
  }
  if (snap(duration) > at) keep.push([at, snap(duration)]);
  return keep.filter(([a, b]) => b - a >= 2 / o.fps - 1e-9);
}

/** Where a moment of the original lands in the trimmed recording, or undefined when it was cut */
function trimmedTime(keep: Array<[number, number]>, t: number): number | undefined {
  let before = 0;
  for (const [a, b] of keep) {
    if (t >= a - 1e-6 && t <= b + 1e-6) return ms(before + Math.min(Math.max(t, a), b) - a);
    before += b - a;
  }
  return undefined;
}

/**
 * The lines of a trimmed recording, from the original's and what was kept: a word survives only when the whole of it was kept, its times move with
 * what was cut before it, its line is spoken from its first kept word to its last, and a line left with no word goes. Ids stay; a caption that was
 * the speech becomes the new speech, one the person wrote stays theirs.
 */
export function trimLines(lines: Line[], keep: Array<[number, number]>): Line[] {
  return lines.flatMap((l) => {
    const kept = (l.words ?? []).flatMap((w) => {
      // the whole word inside one kept stretch: a word whose ends touch two of them was cut out between them
      const s = l.span!.start + w.t0, e = l.span!.start + w.t1;
      const one = keep.some(([a, b]) => s >= a - 1e-6 && e <= b + 1e-6);
      const t0 = trimmedTime(keep, s), t1 = trimmedTime(keep, e);
      return !one || t0 === undefined || t1 === undefined ? [] : [{ ...w, a: t0, b: t1 }];
    });
    if (!kept.length) return [];
    const start = kept[0].a, end = kept[kept.length - 1].b;
    const say = kept.map((w, i) => `${i && !UNSPACED_END.test(kept[i - 1].w) && !UNSPACED_START.test(w.w) ? ' ' : ''}${w.w}`).join('');
    return [{ ...l, say, text: l.text === (l.say ?? l.text) ? say : l.text, span: { start, end }, words: kept.map(({ a, b, ...w }) => ({ ...w, t0: ms(a - start), t1: ms(b - start) })) }];
  });
}
