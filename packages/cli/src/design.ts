import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';

/**
 * The design of a scene is worked through one question at a time, before the document exists: `visotalk design doc.tsx <scene>` asks the next
 * question and `--answer` records the answer, in order, so the ledger shows what was asked, answered and when. `still` refuses a scene until
 * all are answered and prints them back for the review. The checks are about form only (enough words, two options, sizes in px).
 */
export const DESIGN_STEPS: {id: string; ask: string; words?: number; check?: (a: string) => string | undefined}[] = [
  {id: 'thing', ask: 'THE THING ITSELF. What does each sentence of this scene point at in the world, and which concrete things will you draw (real names, lines, values; each with its own colour, icon or shape)? If a sentence names a feeling or a situation, which metaphor draws it? Leave an aside (a passing comparison) to the narration. Say which of the things are better as a real picture, logo or clip to fetch than drawn.'},
  {id: 'ideas', ask: 'IDEAS. Only pose options here, and do not choose: two or more ways to show it that differ in kind, written (a), (b)…, each with its point of view, the one thing it makes the viewer see or feel, and what it costs to build. At least one must be something a slide deck cannot do.',
    check: (a) => (!(/\(a\)/i.test(a) && /\(b\)/i.test(a)) ? 'write at least two ideas, labelled (a) and (b)' : /\b(i chose|i choose|chosen|chose|i pick|go with|i'll use|the winner)\b/i.test(a) ? 'do not choose here: pose the options, the decision is the next question' : undefined)},
  {id: 'reflect', ask: 'REFLECT. The decision is made here: which idea (name it, (a), (b)…), and why. What would a viewer who has never heard of the subject understand from it that they would not from the others? Say what you give up by not choosing the others.',
    check: (a) => (/\([a-z]\)/i.test(a) ? undefined : 'name the idea you choose: (a), (b)…')},
  {id: 'board', ask: 'BOARD. The chosen picture as a storyboard, one entry per sentence of the scene, in order, layout, motion and words together. For each sentence: what is on stage and where (the biggest thing and the next, sizes in px; what aligns to what; where the empty space is on purpose; the slot or coordinates; clear of the captions, below y 900), what arrives, moves or leaves, and on which word each fires and why that word. One subject on stage at a time: what a sentence replaces leaves before the new thing arrives. Which sentence says replaces, grows, becomes or moves, and which Tween, Morph or DrawIn does it (an Appear is a pop). What each motion means. Which objects continue from the previous scene (the same ids, not drawn again).',
    words: 40, check: (a) => (/\d/.test(a) ? undefined : 'give sizes or coordinates in px')},
];

interface Entry {answer: string; at: string}
interface Scene {steps: Record<string, Entry>; log: {step: string; at: string}[]}
const file = (doc: string) => join(dirname(resolve(doc)), '.visotalk', 'design.json');
const read = (doc: string): Record<string, Scene> => (existsSync(file(doc)) ? JSON.parse(readFileSync(file(doc), 'utf8')) : {});

const next = (s?: Scene) => DESIGN_STEPS.find((d) => !s?.steps[d.id]);
/** An answer sent sooner than this after the previous one was not thought about: one question per command, and a batch is refused */
export const MIN_GAP_MS = 5000;

/**
 * Ask the next question of a scene, or record `answer` to the step `step` names. A step already answered is answered again (the design
 * changed); a step that is not the next one is refused, so an answer cannot land on the wrong question after a refusal.
 */
export function design(doc: string, scene: string, a: {answer?: string; step?: string}, now = Date.now()): {text: string; ok: boolean} {
  if (!/^[a-z][a-z0-9_-]*$/.test(scene)) return {ok: false, text: `a scene id is lower-case letters, digits, - and _ (got "${scene}")`};
  const all = read(doc);
  const s = (all[scene] ??= {steps: {}, log: []});
  const upcoming = next(s);
  if (a.answer === undefined) {
    if (!upcoming) return {ok: true, text: `scene "${scene}": all ${DESIGN_STEPS.length} steps answered; build it, and change the design here (--step <step> --answer "…") when the picture changes`};
    return {ok: true, text: `scene "${scene}", step ${DESIGN_STEPS.indexOf(upcoming) + 1} of ${DESIGN_STEPS.length}\n${upcoming.ask}\n\nanswer with: visotalk design ${doc} ${scene} --step ${upcoming.id} --answer "…"`};
  }
  const step = DESIGN_STEPS.find((d) => d.id === a.step);
  if (!step) return {ok: false, text: `--step names the question you are answering: one of ${DESIGN_STEPS.map((d) => d.id).join(', ')}${upcoming ? ` (the next is "${upcoming.id}")` : ''}`};
  if (upcoming && DESIGN_STEPS.indexOf(step) > DESIGN_STEPS.indexOf(upcoming)) return {ok: false, text: `step "${step.id}" comes after "${upcoming.id}": answer that one first`};
  const last = s.log[s.log.length - 1];
  if (last && now - Date.parse(last.at) < MIN_GAP_MS) return {ok: false, text: `not recorded: the previous answer was ${((now - Date.parse(last.at)) / 1000).toFixed(1)} s ago. Answer one question per command, after reading it and thinking about the previous answer`};
  const text = a.answer.trim();
  const problem = text.split(/\s+/).filter(Boolean).length < (step.words ?? 12) ? `say more: at least ${step.words ?? 12} words, so that it can be checked against the picture later` : step.check?.(text);
  if (problem) return {ok: false, text: `step "${step.id}" not recorded: ${problem}`};
  const at = new Date(now).toISOString();
  s.steps[step.id] = {answer: text, at};
  s.log.push({step: step.id, at});
  mkdirSync(dirname(file(doc)), {recursive: true});
  writeFileSync(file(doc), JSON.stringify(all, null, 1));
  const n = next(s);
  return {ok: true, text: n ? `recorded "${step.id}". Next: visotalk design ${doc} ${scene}` : `recorded "${step.id}". Scene "${scene}" is designed: write it into the document, then still, read, review`};
}

/** The answers of a scene, in order, or what is missing */
export function designOf(doc: string, scene: string): {text?: string; missing?: string} {
  const s = read(doc)[scene];
  const n = next(s);
  if (n) return {missing: `scene "${scene}" has no design for step ${DESIGN_STEPS.indexOf(n) + 1} of ${DESIGN_STEPS.length} (${n.id}): visotalk design ${doc} ${scene}`};
  return {text: DESIGN_STEPS.map((d) => `${d.id.toUpperCase()}: ${s!.steps[d.id].answer}`).join('\n')};
}
