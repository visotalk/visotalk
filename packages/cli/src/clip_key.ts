/**
 * The name of a narration clip: a hash of what it was made from (voice, speed, language, the words), so the same words in the same voice are spoken once, here or
 * in a bundle. Kept apart from `voice_lines.ts` (a script that runs when it is the entry file) and `project.ts` so both can name a clip without running anything.
 */
import {createHash} from 'node:crypto';

const sha = (s: string) => createHash('sha1').update(s).digest('hex').slice(0, 12);

/** A third-party provider's clip (`voice_lines.ts`) */
export const clipKey = (spec: {provider: string; voice: string; speed: number; lang: string}, say: string) => sha(`${spec.provider}|${spec.voice}|${spec.speed}|${spec.lang}|${say}`);

/** A Kokoro clip: the formula of `tts_lines.py`, so a prepared line is recognised without running the model */
export const kokoroKey = (voice: string, speed: number, lang: 'en-us' | 'cmn', say: string) => sha(lang === 'en-us' ? `${voice}|${speed}|${say}` : `${voice}|${speed}|${lang}|${say}`);
