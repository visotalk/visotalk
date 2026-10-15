/**
 * Marks: names written into a line's `say`, so an action can be anchored on the words of a phrase without searching for it.
 *   {#name} … {/name}   a range: from the first word after the opening to the last word before the closing
 *   {@name}             a point: the start of the next word
 * `parseSay` strips the markers: the clean text is what is spoken, aligned and compared everywhere else. A mark is stored as
 * indices of the whitespace-separated words of the clean text, which is also how the aligner's `words` are indexed.
 */

export interface Mark {
  name: string;
  kind: 'range' | 'point';
  /** first word of the range, or the word a point sits on (an index into the clean text's words) */
  from: number;
  /** last word of the range; equals `from` for a point */
  to: number;
}

const MARK = /\{([#/@])([a-z][a-z0-9_-]*)\}/y;

/** The words of a text and where they sit: whitespace-separated, so punctuation and digits count as words, like the aligner's */
export function wordSpans(text: string): Array<{start: number; end: number}> {
  return [...text.matchAll(/\S+/g)].map((m) => ({start: m.index!, end: m.index! + m[0].length}));
}

export function parseSay(raw: string): {say: string; marks: Mark[]; errors: string[]} {
  const errors: string[] = [];
  const found: Array<{sigil: string; name: string; at: number}> = [];
  let say = '';
  for (let i = 0; i < raw.length;) {
    MARK.lastIndex = i;
    const m = MARK.exec(raw);
    if (!m) {
      say += raw[i++];
      continue;
    }
    found.push({sigil: m[1], name: m[2], at: say.length});
    i += m[0].length;
    // a marker between two spaces leaves one
    if (/\s$/.test(say) && /\s/.test(raw[i] ?? '')) i++;
  }
  const spans = wordSpans(say);
  const inside = (at: number) => spans.findIndex((s) => at > s.start && at < s.end);
  const next = (at: number) => spans.findIndex((s) => s.start >= at);
  const prev = (at: number) => spans.reduce((last, s, i) => (s.end <= at ? i : last), -1);

  const marks: Mark[] = [];
  const open = new Map<string, number>();
  const used = new Set<string>();
  for (const f of found) {
    const where = `{${f.sigil}${f.name}}`;
    if (inside(f.at) >= 0) { errors.push(`${where} is inside a word: put it between words`); continue; }
    if (f.sigil === '/') {
      const from = open.get(f.name);
      if (from === undefined) { errors.push(`{/${f.name}} closes a range that was not opened`); continue; }
      open.delete(f.name);
      const to = prev(f.at);
      if (to < from) { errors.push(`range "${f.name}" holds no word`); continue; }
      marks.push({name: f.name, kind: 'range', from, to});
      continue;
    }
    if (used.has(f.name)) { errors.push(`mark "${f.name}" is defined twice in the line`); continue; }
    used.add(f.name);
    const at = next(f.at);
    if (at < 0) { errors.push(`${where} has no word after it`); continue; }
    if (f.sigil === '@') marks.push({name: f.name, kind: 'point', from: at, to: at});
    else open.set(f.name, at);
  }
  for (const name of open.keys()) errors.push(`{#${name}} is never closed with {/${name}}`);
  return {say, marks, errors};
}

/** Start or end of a mark, in seconds from the start of the line: from the aligned words when they match the text's words, else by character position */
export function markOffset(mark: Mark, edge: 'start' | 'end', say: string, duration: number, words?: Array<{t0: number; t1: number}>): number {
  const spans = wordSpans(say);
  const index = edge === 'start' || mark.kind === 'point' ? mark.from : mark.to;
  if (words && words.length === spans.length) return edge === 'start' || mark.kind === 'point' ? words[index].t0 : words[index].t1;
  const span = spans[index];
  return (duration * (edge === 'start' || mark.kind === 'point' ? span.start : span.end)) / say.length;
}
