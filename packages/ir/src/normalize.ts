/** Text normaliser: caption text → spoken text (`say`). Explicit `say` wins; otherwise the voice lexicon applies. */
import type {Line, VisoDoc} from './spec.ts';

export function sayOf(doc: VisoDoc, line: Line): string {
  if (line.say) return line.say;
  let s = line.text;
  for (const [word, spoken] of Object.entries(doc.voice?.lexicon ?? {})) {
    if (!word) continue;
    // a word boundary only where the word itself ends in a letter or digit: `\b` never matches next to "C++" or a Chinese word
    const before = /^\w/.test(word) ? '(?<!\\w)' : '';
    const after = /\w$/.test(word) ? '(?!\\w)' : '';
    s = s.replace(new RegExp(`${before}${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}${after}`, 'gi'), () => spoken);
  }
  return s;
}
