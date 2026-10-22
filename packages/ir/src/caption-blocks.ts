/**
 * The caption block of `exports.captions: 'words'`: the spoken words, a few lines of them in the lower half of a tall frame, each appearing on the second it
 * is said, the whole block cleared when the next one starts. A block ends at a scene change, when the next word would pass `limit` letters, at a sentence end
 * once it holds more than half of that, or at a pause once it holds a fifth. Word times come from the aligner or the voice provider when their count matches
 * the caption's words, else from each word's share of the line's letters.
 *
 * A language written without spaces (Chinese, Japanese) has no words to split on: each character is one, with the punctuation after it, and appears on
 * its share of the line. A character is as wide as two letters, so a block holds about half as many. The characters of one word (as the platform's `Intl.Segmenter`
 * finds it, a one-character word taken together with the word after it) share a `unit`, and the player keeps a unit on one line, so a line never breaks inside a word. Korean is spaced: its words are whitespace words, timed by the heard word times like English ones, and a Hangul syllable is as wide as a character.
 */
import type {Compiled} from './timeline.ts';

export interface BlockWord {w: string; t0: number; t1: number; /** the line it belongs to */ line: string; /** a character of a language written without spaces: no gap after it */ cjk?: boolean; /** the word it belongs to, among the characters of its line */ unit?: number}
export interface Block {from: number; to: number; words: BlockWord[]}

const SENTENCE = /[.!?…。！？]["')\]」』）]*$/;
const PAUSE = 0.6;
/** Kana and Han: Korean is written with spaces, so its words are whitespace words like English ones, only as wide as a character each */
const CJK = '\\u3040-\\u30ff\\u3400-\\u4dbf\\u4e00-\\u9fff\\uf900-\\ufaff';
const HANGUL = /[\uac00-\ud7af]/g;
const SPLIT = new RegExp(`([${CJK}])|([^\\s${CJK}]+)`, 'gu');
const CJK_ONE = new RegExp(`^[${CJK}]$`, 'u');
/** how many letters a character of a language written without spaces counts for in a block */
const CJK_WEIGHT = 2.2;

/** The words of a caption: whitespace-separated, except that every CJK character is a word (with the `unit` of the word it is in), and punctuation goes with the word before it */
export function captionWords(text: string): Array<{w: string; cjk: boolean; unit?: number}> {
  const out: Array<{w: string; cjk: boolean; unit?: number}> = [];
  let units: number[] | undefined;
  const unitAt = (i: number) => {
    if (!units) {
      units = [];
      let n = 0, joined = false;
      for (const s of new Intl.Segmenter(undefined, {granularity: 'word'}).segment(text)) {
        for (let k = 0; k < s.segment.length; k++) units[s.index + k] = n;
        // the dictionary does not know every compound (it cuts “blue light” into “blue” and “light”), so a one-character word keeps the word after it; punctuation ends a unit
        if (s.isWordLike && s.segment.length === 1 && !joined) joined = true;
        else {
          n++;
          joined = false;
        }
      }
    }
    return units[i];
  };
  let end = -1;
  for (const m of text.matchAll(SPLIT)) {
    const w = m[0], cjk = CJK_ONE.test(w);
    // punctuation right after a CJK character stays with it, so a line never starts with a comma
    if (!cjk && m.index === end && out.at(-1)?.cjk && /^[\p{P}\p{S}]+$/u.test(w)) out[out.length - 1].w += w;
    else out.push({w, cjk, ...(cjk && {unit: unitAt(m.index!)})});
    end = m.index! + w.length;
  }
  return out;
}

export function captionBlocks(c: Compiled, limit = 96): Block[] {
  const blocks: Block[] = [];
  let cur: Block | null = null, chars = 0, scene = '', last: BlockWord | null = null;
  for (const sc of c.scenes) {
    for (const line of sc.lines) {
      const tokens = captionWords(line.text);
      if (!tokens.length) continue;
      const spaced = line.text.split(/\s+/).filter(Boolean);
      const aligned = !tokens.some((t) => t.cjk) && line.words && line.words.length === spaced.length ? line.words : undefined;
      const total = tokens.reduce((n, t) => n + t.w.length, 0);
      let spent = 0;
      tokens.forEach(({w, cjk, unit}, i) => {
        const t0 = line.from + (aligned ? aligned[i].t0 : (spent / total) * line.duration);
        spent += w.length;
        const t1 = line.from + (aligned ? aligned[i].t1 : (spent / total) * line.duration);
        const word: BlockWord = {w, t0, t1, line: line.id, ...(cjk && {cjk, unit})};
        const weight = cjk ? CJK_WEIGHT * w.length : w.length + 1 + (CJK_WEIGHT - 1) * (w.match(HANGUL)?.length ?? 0);
        const over = chars + weight > limit;
        const ended = last !== null && SENTENCE.test(last.w) && chars > limit / 2;
        const paused = last !== null && t0 - last.t1 > PAUSE && chars > limit / 5;
        if (!cur || sc.id !== scene || over || ended || paused) {
          if (cur) cur.to = sc.id !== scene ? Math.max(cur.to, last!.t1 + 0.3) : t0;
          blocks.push(cur = {from: t0, to: t1 + 0.3, words: []});
          chars = 0;
        }
        cur.words.push(word);
        cur.to = Math.max(cur.to, t1 + 0.3);
        chars += weight;
        scene = sc.id;
        last = word;
      });
    }
  }
  return blocks;
}
