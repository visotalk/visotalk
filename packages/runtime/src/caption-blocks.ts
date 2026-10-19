/**
 * The caption block of `exports.captions: 'words'`: the spoken words, a few lines of them in the lower half of a tall frame, each appearing on the second it
 * is said, the whole block cleared when the next one starts. A block ends at a scene change, when the next word would pass `limit` letters, at a sentence end
 * once it holds more than half of that, or at a pause once it holds a fifth. Word times come from the aligner or the voice provider when their count matches
 * the caption's words, else from each word's share of the line's letters.
 */
import type {Compiled} from '@visotalk/ir';

export interface BlockWord {w: string; t0: number; t1: number; /** the line it belongs to */ line: string}
export interface Block {from: number; to: number; words: BlockWord[]}

const SENTENCE = /[.!?…]["')\]]*$/;
const PAUSE = 0.6;

export function captionBlocks(c: Compiled, limit = 96): Block[] {
  const blocks: Block[] = [];
  let cur: Block | null = null, chars = 0, scene = '', last: BlockWord | null = null;
  for (const sc of c.scenes) {
    for (const line of sc.lines) {
      const tokens = line.text.split(/\s+/).filter(Boolean);
      if (!tokens.length) continue;
      const aligned = line.words && line.words.length === tokens.length ? line.words : undefined;
      const total = tokens.reduce((n, t) => n + t.length, 0);
      let spent = 0;
      tokens.forEach((w, i) => {
        const t0 = line.from + (aligned ? aligned[i].t0 : (spent / total) * line.duration);
        spent += w.length;
        const t1 = line.from + (aligned ? aligned[i].t1 : (spent / total) * line.duration);
        const word: BlockWord = {w, t0, t1, line: line.id};
        const over = chars + w.length + 1 > limit;
        const ended = last !== null && SENTENCE.test(last.w) && chars > limit / 2;
        const paused = last !== null && t0 - last.t1 > PAUSE && chars > limit / 5;
        if (!cur || sc.id !== scene || over || ended || paused) {
          if (cur) cur.to = sc.id !== scene ? Math.max(cur.to, last!.t1 + 0.3) : t0;
          blocks.push(cur = {from: t0, to: t1 + 0.3, words: []});
          chars = 0;
        }
        cur.words.push(word);
        cur.to = Math.max(cur.to, t1 + 0.3);
        chars += w.length + 1;
        scene = sc.id;
        last = word;
      });
    }
  }
  return blocks;
}
