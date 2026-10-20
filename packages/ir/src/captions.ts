/**
 * The caption track a video is uploaded with (`exports.captions: 'sidecar'`): SRT, five words a cue at most.
 *
 * Five is over-cut on purpose: a cue sized to the screen parks a paragraph under a picture that is already moving, and a viewer who glances up has to find
 * their place in it. A line is cut at the strongest boundary near its middle (a sentence end, then clause punctuation, then the middle), so twelve words go
 * 4 / 4 / 4 and never 5 / 5 / 2. Times come from the words the aligner or the voice provider heard when their count matches the caption's words, else from
 * the share of the line's duration each cue's letters make.
 */
import type {Compiled} from './timeline.ts';

const MAX_WORDS = 5;
const SENTENCE = /[.!?…]["')\]]*$/;
const CLAUSE = /[,;:—–]["')\]]*$/;

/** Cut `words` into pieces of at most MAX_WORDS, at the boundary nearest the middle that is strongest */
export function cut(words: string[]): string[][] {
  if (words.length <= MAX_WORDS) return [words];
  const mid = words.length / 2;
  const inner = Array.from({length: words.length - 1}, (_, i) => i + 1);   // a cut before word i
  const best = (re: RegExp) => inner.filter((i) => re.test(words[i - 1])).sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid))[0];
  const at = best(SENTENCE) ?? best(CLAUSE) ?? Math.round(mid);
  // a boundary so far off-centre that one half is still too long is worse than the middle: cut again there
  const i = Math.max(at, words.length - at) > MAX_WORDS * 2 ? Math.round(mid) : at;
  return [...cut(words.slice(0, i)), ...cut(words.slice(i))];
}

const stamp = (t: number) => {
  const ms = Math.round(t * 1000);
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${p(Math.floor(ms / 3_600_000))}:${p(Math.floor(ms / 60_000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
};

export function captionsSrt(c: Compiled): string {
  const cues: Array<{from: number; to: number; text: string}> = [];
  for (const line of c.scenes.flatMap((s) => s.lines)) {
    const tokens = line.text.split(/\s+/).filter(Boolean);
    if (!tokens.length) continue;
    const pieces = cut(tokens);
    const aligned = line.words && line.words.length === tokens.length ? line.words : undefined;
    const letters = pieces.map((p) => p.join(' ').length);
    const total = letters.reduce((a, b) => a + b, 0);
    let k = 0, spent = 0;
    for (const [i, piece] of pieces.entries()) {
      const first = k, last = k + piece.length - 1;
      k += piece.length;
      const from = aligned ? line.from + aligned[first].t0 : line.from + (spent / total) * line.duration;
      spent += letters[i];
      const to = aligned ? line.from + aligned[last].t1 : line.from + (spent / total) * line.duration;
      cues.push({from, to, text: piece.join(' ')});
    }
  }
  return cues.map((q, i) => `${i + 1}\n${stamp(q.from)} --> ${stamp(q.to)}\n${q.text}`).join('\n\n') + '\n';
}
