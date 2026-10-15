/**
 * QA helpers that need only the document and its solved timeline: sample frames per beat, and static checks.
 * Frame checks on rendered layout live in @visotalk/exporter (qa.ts).
 */
import type {ObjectDef, VisoDoc} from './spec.ts';
import {alignedSpan, ENTRANCES, normalizeWord, view, viewOwn, wordTime, type Compiled, type TLine} from './timeline.ts';
import {sceneObjectIds} from './patterns.ts';

export interface Sample {
  frame: number;
  /** "scene/beat@fraction" or "scene@0.4s" */
  at: string;
}

/** Frames at fractions of every beat (entrances, mid-beat, settled), plus 0.4 s into each scene */
export function sampleFrames(c: Compiled, fps: number, perBeat = 3): Sample[] {
  const out = new Map<number, string>();
  const last = Math.round(c.duration * fps) - 1;
  const fr = (t: number) => Math.min(last, Math.max(0, Math.floor(t * fps)));
  for (const s of c.scenes) {
    out.set(fr(s.from + 0.4), `${s.id}@0.4s`);
    for (const b of s.beats) {
      for (let k = 0; k < perBeat; k++) {
        const f = (k + 1) / (perBeat + 1);
        out.set(fr(b.from + f * (b.end - b.from)), `${s.id}/${b.id}@${f.toFixed(2)}`);
      }
    }
  }
  return [...out].sort((a, b) => a[0] - b[0]).map(([frame, at]) => ({frame, at}));
}

export interface QaIssue {
  code: string;
  at: string;
  objects: string[];
  message: string;
  fix?: string;
  /** reveal.*: how far off its word the object comes on screen, seconds (negative: before the word) */
  off?: number;
}

/** Static checks: objects placed in a scene that are never visible during it (a missing entrance, or hidden by a stale state), and reveals off their word */
export function staticQa(doc: VisoDoc, c: Compiled): QaIssue[] {
  const issues: QaIssue[] = [];
  doc.scenes.forEach((scene, i) => {
    const sc = c.scenes[i];
    if (!sc) return;
    for (const id of sceneObjectIds(scene)) {
      let seen = false;
      for (let t = sc.from; t < sc.from + sc.duration && !seen; t += 0.05) seen = viewOwn(c, id, t).presence > 0;
      if (!seen) issues.push({code: 'never-visible', at: scene.id, objects: [id], message: `"${id}" is placed in scene "${scene.id}" but never visible in it`, fix: 'give it an entrance (appear, stamp, ...) in a beat of this scene, or a beat state `{"visible": true}`'});
    }
  });
  return [...issues, ...revealIssues(doc, c), ...numberIssues(doc, c), ...briefIssues(doc, c)];
}

/** An object that is on screen for less than this (seconds) before something takes it away is reported: the viewer has not had time to see it and understand it */
const MIN_SEEN = 2;

/** Objects on screen for less than MIN_SEEN seconds in one go, whether a `disappear`, a pattern change or the end of the scene takes them away */
function briefIssues(doc: VisoDoc, c: Compiled): QaIssue[] {
  const issues: QaIssue[] = [];
  doc.scenes.forEach((scene, i) => {
    const sc = c.scenes[i];
    if (!sc) return;
    for (const id of sceneObjectIds(scene)) {
      let from: number | undefined;
      const end = sc.from + sc.duration;
      for (let t = sc.from; t <= end + 0.05; t += 0.05) {
        const on = t < end && viewOwn(c, id, t).presence > 0.05;
        if (on && from === undefined) from = t;
        if (!on && from !== undefined) {
          if (t - from < MIN_SEEN - 0.1) {
            issues.push({
              code: 'visible.brief', at: scene.id, objects: [id],
              message: `"${id}" is on screen for ${(t - from).toFixed(1)} s (${from.toFixed(1)}-${t.toFixed(1)} s) before it goes: too short to see and understand`,
              fix: `keep it on screen for ${MIN_SEEN} s or more: move its \`disappear\` or the pattern change later, give the last beat of the scene a \`hold\` (<Beat hold={1.5}>) so the scene outlasts the narration, or merge it into the next picture. A flash that is the point is allowed: say so in the design's motion answer`,
            });
          }
          from = undefined;
        }
      }
    }
  });
  return issues;
}

/** A reveal this far from the word that names it is reported (seconds) */
const REVEAL_TOLERANCE = 0.3;
/** Text styles that frame a scene rather than depict what a line names */
const HEADINGS = new Set(['kicker', 'eyebrow', 'title', 'display', 'byline', 'footer', 'question']);

/** The text an object, or one of its parts, shows: what a narration can name. `prefix` parts are commands, named by their first words. */
function labelsOf(id: string, o: ObjectDef): Array<{path: string; label: string; prefix?: boolean}> {
  const str = (v: unknown) => (typeof v === 'string' ? v : undefined);
  const out: Array<{path: string; label?: string; prefix?: boolean}> = [];
  switch (o.type) {
    case 'text': if (!HEADINGS.has(o.style ?? '')) out.push({path: id, label: str(o.text)}); break;
    case 'chip': out.push({path: id, label: str(o.text)}); break;
    case 'shape': out.push({path: id, label: str(o.text)}); break;
    case 'card': out.push({path: id, label: str(o.title)}); break;
    case 'counter': out.push({path: id, label: o.caption}); break;
    case 'steps': for (const i of o.items) out.push({path: `${id}#${i.id}`, label: i.title}); break;
    case 'timeline': for (const i of o.items) out.push({path: `${id}#${i.id}`, label: i.label}); break;
    case 'terminal': for (const s of o.steps) out.push({path: `${id}#${s.id}`, label: s.cmd, prefix: true}); break;
    case 'graph':
      for (const n of o.nodes) out.push({path: `${id}#${n.id}`, label: n.says ?? str(n.label)});
      for (const e of o.edges) if (e.says) out.push({path: `${id}#${e.id}`, label: e.says});
      break;
  }
  return out.filter((x): x is {path: string; label: string; prefix?: boolean} => !!x.label);
}

/** Where a line says a label: its whole text as consecutive words (a command: its first two or more words). Numbers are never matched: they are spoken as words. */
function mentions(label: string, prefix: boolean | undefined, lines: TLine[]): Array<{from: number; to: number; line: string; phrase: string}> {
  const tokens = label.split(/\s+/).filter((w) => normalizeWord(w));
  const out: Array<{from: number; to: number; line: string; phrase: string}> = [];
  if (!tokens.length) return out;
  for (const line of lines) {
    const say = line.say.split(/\s+/).filter((w) => normalizeWord(w));
    for (let len = tokens.length; len >= (prefix ? 2 : tokens.length); len--) {
      const at = say.findIndex((_, i) => tokens.slice(0, len).every((w, k) => normalizeWord(w) === normalizeWord(say[i + k] ?? '')));
      if (at < 0) continue;
      const phrase = say.slice(at, at + len).join(' ');
      try { out.push({from: wordTime(line, phrase, 'start'), to: wordTime(line, phrase, 'end'), line: line.id, phrase}); } catch { /* not locatable: no claim */ }
      break;
    }
  }
  return out;
}

/**
 * Reveals that miss the word that names them: an object (or part) whose text a line says, but which is first on screen more
 * than REVEAL_TOLERANCE outside the span of the nearest time it is said. Objects never visible are reported by staticQa.
 */
export function revealIssues(doc: VisoDoc, c: Compiled): QaIssue[] {
  const issues: QaIssue[] = [];
  doc.scenes.forEach((scene, i) => {
    const sc = c.scenes[i];
    if (!sc) return;
    const lines = sc.beats.flatMap((b) => b.lines);
    for (const id of sceneObjectIds(scene)) {
      const o = doc.objects[id];
      if (!o) continue;
      for (const {path, label, prefix} of labelsOf(id, o)) {
        const said = mentions(label, prefix, lines);
        if (!said.length) continue;
        let shown: number | undefined;
        for (let t = sc.from; t < sc.from + sc.duration && shown === undefined; t += 1 / 30) if (view(c, path, t).presence > 0.05) shown = t;
        if (shown === undefined) continue;
        // an entrance on the word is a reveal; so is a highlight on a steps item that is dimmed until then (dimInactive, the default)
        const dimmed = o.type === 'steps' && o.dimInactive !== false;
        const cues = c.actions.filter((a) => a.path === path && (ENTRANCES.has(a.motion) || (dimmed && a.motion === 'highlight'))).map((a) => a.start);
        const gap = (m: {from: number; to: number}) => (shown! < m.from ? shown! - m.from : shown! > m.to ? shown! - m.to : 0);
        if (said.some((m) => cues.some((t) => t >= m.from - REVEAL_TOLERANCE && t <= m.to + REVEAL_TOLERANCE))) continue;
        const near = said.reduce((a, b) => (Math.abs(gap(b)) < Math.abs(gap(a)) ? b : a));
        const off = gap(near);
        if (Math.abs(off) <= REVEAL_TOLERANCE) continue;
        const early = off < 0;
        issues.push({
          code: early ? 'reveal.early' : 'reveal.late', at: `${scene.id}/${near.line}`, objects: [path], off,
          message: `"${path}" ("${label}") is first on screen at ${shown.toFixed(2)} s, ${Math.abs(off).toFixed(2)} s ${early ? 'before' : 'after'} line "${near.line}" says "${near.phrase}" (${near.from.toFixed(2)}-${near.to.toFixed(2)} s)`,
          fix: early ? 'give it an entrance (appear, stamp, ...) anchored on that word; an object that is on screen from the start counts as shown' : 'anchor its entrance on that word',
        });
      }
    }
  });
  return issues;
}


/** The first time a path is on screen in a scene, or undefined */
function firstShown(c: Compiled, path: string, from: number, to: number): number | undefined {
  for (let t = from; t < to; t += 1 / 30) if (view(c, path, t).presence > 0.05) return t;
  return undefined;
}

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

/** An integer below a million as English words, the way a narrator says it (with and without "and" after "hundred") */
function cardinal(n: number): string[][] {
  const small = (m: number): string[] => (m < 20 ? [ONES[m]] : m % 10 ? [TENS[Math.floor(m / 10)], ONES[m % 10]] : [TENS[m / 10]]);
  const below1000 = (m: number): string[][] => {
    if (m < 100) return [small(m)];
    const head = [ONES[Math.floor(m / 100)], 'hundred'];
    return m % 100 ? [[...head, ...small(m % 100)], [...head, 'and', ...small(m % 100)]] : [head];
  };
  if (n < 1000) return below1000(n);
  const head = [...below1000(Math.floor(n / 1000))[0], 'thousand'];
  return n % 1000 ? below1000(n % 1000).flatMap((r) => [[...head, ...r], [...head, 'and', ...r]]) : [head];
}

/** How a number is spoken: a cardinal, and for a year ("eighteen oh four", "twenty twenty two") the pairs */
function spokenForms(n: number): string[][] {
  const forms = cardinal(n);
  if (n >= 1100 && n <= 2099 && n % 100 && !(n >= 2000 && n < 2010)) {
    const hi = Math.floor(n / 100), lo = n % 100;
    forms.push([...cardinal(hi)[0], ...(lo < 10 ? ['oh', ONES[lo]] : cardinal(lo)[0])]);
  } else if (n >= 1100 && n <= 2099 && !(n % 100)) forms.push([...cardinal(n / 100)[0], 'hundred']);
  return forms;
}

/** Whole numbers of two or more digits a string shows (a lone digit is usually a list index; not ordinals, not a number glued to letters) */
const numbersIn = (text: string): number[] => [...text.matchAll(/(?<![\w.])\d[\d,]{0,6}(?![\w])/g)].map((m) => Number(m[0].replace(/,/g, ''))).filter((n) => n >= 10 && n < 1_000_000);

/** The strings an object shows, with the part they belong to */
function shownText(id: string, o: ObjectDef): Array<{path: string; text: string}> {
  const strs = (...v: unknown[]) => v.filter((x): x is string => typeof x === 'string').join(' ');
  switch (o.type) {
    case 'text': case 'chip': return [{path: id, text: strs(o.text)}];
    case 'card': return [{path: id, text: strs(o.kicker, o.title, o.body, ...(o.fields ?? []).map((f) => `${f.label} ${f.value}`))}];
    case 'timeline': return o.items.map((i) => ({path: `${id}#${i.id}`, text: strs(i.label, i.date)}));
    case 'steps': return o.items.map((i) => ({path: `${id}#${i.id}`, text: strs(i.title)}));
    default: return [];
  }
}

/**
 * A figure on screen before the narration says it: an object or part that shows a number (1927, 123) and is first visible more than
 * REVEAL_TOLERANCE before the line speaks it ("nineteen twenty seven"). The label checks cannot see this, since a number is spoken as words.
 */
export function numberIssues(doc: VisoDoc, c: Compiled): QaIssue[] {
  const issues: QaIssue[] = [];
  doc.scenes.forEach((scene, i) => {
    const sc = c.scenes[i];
    if (!sc) return;
    const lines = sc.beats.flatMap((b) => b.lines);
    for (const id of sceneObjectIds(scene)) {
      const o = doc.objects[id];
      if (!o) continue;
      for (const {path, text} of shownText(id, o)) {
        const spoken: Array<{from: number; line: string; phrase: string}> = [];
        for (const n of numbersIn(text)) for (const line of lines) {
          const say = line.say.replace(/-/g, ' ').split(/\s+/).filter((w) => normalizeWord(w));
          for (const form of spokenForms(n)) {
            const at = say.findIndex((_, k) => form.every((w, j) => normalizeWord(say[k + j] ?? '') === w));
            if (at < 0) continue;
            const phrase = say.slice(at, at + form.length).join(' ');
            try { spoken.push({from: wordTime(line, phrase, 'start'), line: line.id, phrase}); } catch { /* not locatable: no claim */ }
            break;
          }
        }
        if (!spoken.length) continue;
        const shown = firstShown(c, path, sc.from, sc.from + sc.duration);
        const first = spoken.reduce((a, b) => (b.from < a.from ? b : a));
        if (shown === undefined || shown >= first.from - REVEAL_TOLERANCE) continue;
        issues.push({
          code: 'reveal.number-early', at: `${scene.id}/${first.line}`, objects: [path],
          message: `"${path}" shows a figure and is on screen at ${shown.toFixed(2)} s, ${(first.from - shown).toFixed(2)} s before line "${first.line}" says "${first.phrase}" (${first.from.toFixed(2)} s)`,
          fix: 'anchor its entrance on the spoken figure; if it must come earlier, show the figure itself later (a counter, a separate chip) or leave it out',
        });
      }
    }
  });
  return issues;
}

/** The line and the spoken word at time t, for labelling a sampled frame; none in a pause or in a beat without narration */
export function wordAt(c: Compiled, t: number): {line: string; word: string} | undefined {
  for (const sc of c.scenes) for (const b of sc.beats) for (const l of b.lines) {
    if (t < l.from || t >= l.from + l.duration) continue;
    const w = l.words?.find((x) => t >= l.from + x.t0 && t < l.from + x.t1);
    if (w) return {line: l.id, word: w.w};
    const words = l.say.split(/\s+/).filter(Boolean);
    return {line: l.id, word: words[Math.min(words.length - 1, Math.floor(((t - l.from) / l.duration) * words.length))]};
  }
  return undefined;
}

/** An aligned word with a probability below this is not trusted for sync */
const WEAK_ALIGNMENT = 0.5;

/**
 * How much the word anchors rest on: lines with anchors but no word times (placed by character position, up to half a second off),
 * and anchored words the aligner was unsure of (a letter spoken by its name, a word it could not hear) or could not time (no letters).
 * Needs the voice manifest, so it is not part of staticQa.
 */
export function alignmentIssues(doc: VisoDoc, c: Compiled): QaIssue[] {
  const issues: QaIssue[] = [];
  const estimated: string[] = [];
  const seen = new Set<string>();
  doc.scenes.forEach((scene, si) => scene.beats.forEach((beat, bi) => {
    const lines = c.scenes[si]?.beats[bi]?.lines ?? [];
    for (const a of beat.actions ?? []) {
      if (!('line' in a.at) || (a.at.word === undefined && a.at.mark === undefined)) continue;
      const at = a.at;
      const line = lines.find((l) => l.id === at.line);
      if (!line) continue;
      if (!line.words?.length) {
        if (!estimated.includes(line.id)) estimated.push(line.id);
        continue;
      }
      const mark = at.mark === undefined ? undefined : line.marks?.find((m) => m.name === at.mark);
      const span = mark ? {first: mark.from, last: mark.to} : alignedSpan(line, at.word!);
      if (!span) continue;
      const ends = a.during ? [span.first, span.last] : [at.edge === 'end' ? span.last : span.first];
      for (const i of ends) {
        const key = `${line.id}:${i}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const w = line.words[i], p = w?.p;
        if (typeof p === 'number' ? p >= WEAK_ALIGNMENT : !line.words.some((x) => typeof x.p === 'number')) continue;
        issues.push({
          code: 'align.weak', at: `${scene.id}/${line.id}`, objects: [a.target].flat(),
          message: typeof p === 'number'
            ? `an anchor on "${w.w}" in line "${line.id}" rests on a weak alignment (p = ${p.toFixed(2)}): the reveal can be off by several tenths of a second`
            : `an anchor on "${w?.w}" in line "${line.id}" rests on a word that has no time of its own (no letters)`,
          fix: typeof p === 'number' ? 'anchor on a clearer neighbouring word, or write the word out in `say` the way it is pronounced' : 'spell the number or symbol out in `say`, or anchor on the word next to it',
        });
      }
    }
  }));
  if (estimated.length) {
    issues.push({
      code: 'align.estimated', at: 'document', objects: [],
      message: `line${estimated.length > 1 ? 's' : ''} ${estimated.slice(0, 8).map((l) => `"${l}"`).join(', ')}${estimated.length > 8 ? ` and ${estimated.length - 8} more` : ''} ha${estimated.length > 1 ? 've' : 's'} no word times, so word anchors in ${estimated.length > 1 ? 'them are' : 'it are'} placed by character position and can be off by half a second`,
      fix: 'run `visotalk prepare` with torch and torchaudio installed (English only); otherwise keep an anchored word near the start of its line',
    });
  }
  return issues;
}
