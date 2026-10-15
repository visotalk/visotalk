/** Text normaliser: caption text → spoken text (`say`). Explicit `say` wins; otherwise the voice lexicon applies. */
import type {Line, VisoDoc} from './spec.ts';
import {parseSay} from './marks.ts';

export function sayOf(doc: VisoDoc, line: Line): string {
  if (line.say) return parseSay(line.say).say;
  let s = line.text;
  for (const [word, spoken] of Object.entries(doc.voice?.lexicon ?? {})) {
    s = s.replace(new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'), spoken);
  }
  return s;
}
