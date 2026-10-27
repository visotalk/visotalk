/**
 * IR validator (semantic rules). Pure: runs in Node (CLI, agent tool) and in the browser (the web editor).
 * It reads the skeleton of a document: lines, parts and animations. What a part draws is React, which it does not see;
 * whether an action's target exists inside a part is checked after a run (the runtime lists what parts register).
 */
import {THEMES} from './themes.ts';
import {SPEC_VERSION, type Action, type ActionAnchor, type Anchor, type Scene, type Sound, type VisoDoc} from './spec.ts';
import {sayOf} from './normalize.ts';
import {easingFn, occurrences, phraseContexts, playTime, tweenable} from './timeline.ts';

export interface Issue {
  code: string;
  /** JSON-pointer-ish location, id-addressed */
  at: string;
  message: string;
  /** What to change, when the code has one standard answer */
  fix?: string;
}

const FIXES: Record<string, string> = {
  'id.format': 'start with a lowercase letter, then use only a-z, 0-9, _ and -',
  'id.duplicate': 'give every scene, line and action its own id; a part its own within its scene (and not a global part\'s)',
  'part.appear': 'a part is invisible until an appear shows it: <Appear target="id" at="start"/>, or on a word of a line',
  'scene.duration': 'a scene without lines needs `duration` (seconds)',
  'anchor.line': 'anchor a line of the same scene: its id is on a <Line> of the scene that holds the <Animation>',
  'anchor.word': 'write the phrase as it is spoken (case aside, numbers spelled out: the aligner hears "nineteen twenty seven", not 1927)',
  'anchor.ambiguous': 'write a longer phrase that occurs once ("the curve keeps"), say which occurrence with nth={2}, or put a <Mark id> round it in the line',
  'anchor.nth': 'nth counts from 1 and cannot pass the number of times the phrase occurs',
  'anchor.at': '`at` is seconds from the start of the scene, 0 or more',
  'action.id': 'give every action that has an `id` a document-wide unique one: `after` names it',
  'anchor.action': 'name the `id` of an action in the document: <Appear after="id" …/>',
  'action.target': 'name one or more targets: <Appear target="id" …/> or target={["id", "id"]}',
  'anchor.cycle': 'anchor one action of the cycle on a word, a scene time or a scene edge',
  'anchor.after-negative': 'raise `offset` so the action does not start before the action it hangs on',
  'motion.tween': 'a tween needs numbers, colours ("#426894", "hsl(212 46% 68%)") or lengths ("12px"): <Tween target="id" to={{name: 0.5}} at="start"/>',
  'motion.set': 'a set needs values in `to`: <Set target="id" to={{name: 1}} at="start"/>',
  'motion.to': 'appear and disappear take no `to`: change a value with <Set> or <Tween>',
  'motion.easing': 'easing is linear, easeIn, easeOut, easeInOut, one of those with Sine, Quad, Quart, Quint or Back (easeOutQuart, easeOutBack(2.2)), or cubic-bezier(x1, y1, x2, y2)',
  'motion.repeat': '`repeat` (0 or more extra plays, or -1 to go on for the whole film) and `yoyo` belong to <Tween>',
  'motion.time': '`dur`, `stagger` and `hold` are seconds, 0 or more',
  'motion.until': 'end it on a word, a scene time or a scene edge of its own scene, with no `dur`: until="end", until={{line: "l3", word: "the curve"}}, until={{scene: "end", offset: 1.5}}',
  'sound.asset': 'declare the file as <Asset id="…" kind="audio" src="…" license={{…}}/> and name its id: <Sound asset="id" …/>',
  'sound.params': '`volume` and `duck` are dB (numbers), `loop` is true or false, `fadeIn`, `fadeOut` and `dur` are seconds, 0 or more; `fadeOut` needs `dur` or `loop`',
};

/** What an id is: a document's, a scene's, a line's. It names directories and anchors, so it is never a path. */
export const ID_PATTERN = /^[a-z][a-z0-9_-]*$/;
const ID = ID_PATTERN;
/** Seconds, 0 or more; a numeric string passes `>= 0` and then concatenates in the solver, so the type is checked too */
const seconds = (v: unknown) => typeof v === 'number' && v >= 0;

export function validate(doc: VisoDoc): Issue[] {
  const issues: Issue[] = [];
  const add = (code: string, at: string, message: string, fix: string | undefined = FIXES[code]) => issues.push({code, at, message, ...(fix ? {fix} : {})});

  const minor = SPEC_VERSION.split('.').slice(0, 2).join('.');
  if (!doc.spec.startsWith(`${minor}.`)) add('spec.version', '/spec', `spec ${doc.spec} is not ${minor}.x`);
  if (doc.theme && !Object.hasOwn(THEMES, doc.theme.id)) add('theme.unknown', '/theme/id', `unknown theme "${doc.theme.id}" (built-in: ${Object.keys(THEMES).join(', ')})`);
  if (!doc.canvas.presets.length) add('canvas.presets', '/canvas/presets', 'a canvas needs at least one preset (the first is the default)');
  (doc.exports?.variants ?? []).forEach((v, i) => {
    if (!doc.canvas.presets.some((p) => p.id === v.preset)) add('export.variant', `/exports/variants/${i}`, `variant ${i + 1} names the canvas "${v.preset}", which the document does not have (${doc.canvas.presets.map((p) => p.id).join(', ')})`, 'name a canvas of the document, or add it: canvas="16x9,9x16"');
    if (v.theme !== undefined && !Object.hasOwn(THEMES, v.theme)) add('export.variant', `/exports/variants/${i}`, `variant ${i + 1} names the theme "${v.theme}" (built-in: ${Object.keys(THEMES).join(', ')})`);
  });
  for (const k of ['lead', 'hold', 'tail', 'grid'] as const) if (doc.pacing?.[k] !== undefined && !seconds(doc.pacing[k])) add('motion.time', `/pacing/${k}`, `${k} is seconds, 0 or more`);

  for (const [id, text] of Object.entries(doc.texts ?? {})) {
    if (!ID.test(id)) add('id.format', `/texts/${id}`, `text id "${id}" is lowercase letters, digits, - and _, starting with a letter`);
    if (typeof text !== 'string') add('text.value', `/texts/${id}`, `text "${id}" is a string`);
  }

  if (doc.meta.poster !== undefined && !seconds(doc.meta.poster)) add('motion.time', '/meta/poster', 'poster is the second of the film shown as its cover, 0 or more');

  // the document's id names a directory (`.visotalk/<id>/`, in a bundle's archive too): it is a plain id, never a path
  if (!ID.test(doc.meta.id)) add('id.format', '/meta/id', `document id "${doc.meta.id}" is not a valid id`);

  const seen = new Map<string, string>();
  const uniq = (kind: string, id: string, at: string) => {
    if (!ID.test(id)) add('id.format', at, `${kind} id "${id}" is not a valid id`);
    const k = `${kind}:${id}`;
    if (seen.has(k)) add('id.duplicate', at, `${kind} id "${id}" is also at ${seen.get(k)}`);
    else seen.set(k, at);
  };

  const assets = new Set<string>();
  for (const a of doc.assets ?? []) {
    uniq('asset', a.id, `/assets/${a.id}`);
    assets.add(a.id);
  }

  // parts: a global part is declared in <Doc>, a scene's part in its <Scene>; ids are unique within the scene and differ from the global parts'
  const global = new Set<string>();
  for (const p of doc.parts ?? []) {
    uniq('part', p.id, `/parts/${p.id}`);
    global.add(p.id);
  }
  // part id → where an appear shows it: a scene's part by an appear in its scene, a global part by an appear in any scene
  const shown = new Set<string>();
  for (const scene of doc.scenes) for (const a of scene.animations) if (a.motion === 'appear') for (const t of [a.target].flat()) shown.add(global.has(t) ? t : `${scene.id}:${t}`);

  const lineIds = new Set<string>();
  for (const scene of doc.scenes) {
    const sat = `/scenes/${scene.id}`;
    uniq('scene', scene.id, sat);
    if (!scene.lines.length && scene.duration === undefined) add('scene.duration', sat, 'a scene without lines needs a duration');
    if (scene.duration !== undefined && !seconds(scene.duration)) add('motion.time', `${sat}/duration`, 'duration is seconds, 0 or more');
    for (const l of scene.lines) {
      uniq('line', l.id, `${sat}/lines/${l.id}`);
      if (lineIds.has(l.id)) continue;
      lineIds.add(l.id);
      if (l.hold !== undefined && !seconds(l.hold)) add('motion.time', `${sat}/lines/${l.id}/hold`, 'hold is seconds, 0 or more');
    }
    for (const p of scene.parts) {
      const at = `${sat}/parts/${p.id}`;
      uniq(`part@${scene.id}`, p.id, at);
      if (global.has(p.id)) add('id.duplicate', at, `part id "${p.id}" is also a global part (/parts/${p.id})`);
      else if (!shown.has(`${scene.id}:${p.id}`)) add('part.appear', at, `part "${p.id}" is never shown: nothing in scene "${scene.id}" appears it`);
    }
    scene.animations.forEach((a, i) => checkAction(doc, scene, a, `${sat}/animations/${a.id ?? i}`, add));
    (scene.sounds ?? []).forEach((s, i) => checkSound(doc, scene, s, `${sat}/sounds/${i}`, add));
  }
  for (const p of doc.parts ?? []) if (!shown.has(p.id)) add('part.appear', `/parts/${p.id}`, `global part "${p.id}" is never shown: no scene appears it`);
  checkAfter(doc, add);
  return issues;
}

function checkAnchor(doc: VisoDoc, scene: Scene, a: ActionAnchor, at: string, add: (c: string, at: string, m: string) => void) {
  const offset = (a as {offset?: unknown}).offset;
  if (offset !== undefined && !(typeof offset === 'number' && Number.isFinite(offset))) add('motion.time', `${at}/offset`, 'offset is seconds');
  if ('after' in a) return; // checked across the whole document by checkAfter
  if ('at' in a) {
    if (!seconds(a.at)) add('anchor.at', at, `\`at\` ${a.at} is before the start of the scene`);
    return;
  }
  if ('scene' in a) return;
  const line = scene.lines.find((l) => l.id === a.line);
  if (!line) return add('anchor.line', at, `line "${a.line}" is not in scene "${scene.id}"`);
  if (a.nth !== undefined && !(Number.isInteger(a.nth) && a.nth >= 1)) add('anchor.nth', at, `nth ${a.nth} is not a whole number from 1`);
  if (a.word === undefined) return;
  const say = sayOf(doc, line);
  const n = occurrences({say, words: line.words}, a.word);
  if (n === 0) add('anchor.word', at, `"${a.word}" does not occur in the spoken text: "${say}"`);
  else if (a.nth === undefined && n > 1) add('anchor.ambiguous', at, `"${a.word}" occurs ${n} times in line "${line.id}" (${phraseContexts(say, a.word).join(' · ')}): which one?`);
  else if (a.nth !== undefined && a.nth > n) add('anchor.nth', at, `"${a.word}" occurs ${n} time${n > 1 ? 's' : ''} in line "${line.id}", not ${a.nth}`);
}

/** Where an action or a sound ends: an anchor of its own scene, never another action; `wrong` is what else makes it wrong, if anything */
function checkUntil(doc: VisoDoc, scene: Scene, until: Anchor, at: string, add: (c: string, at: string, m: string) => void, wrong?: string) {
  if (wrong) add('motion.until', `${at}/until`, wrong);
  if ('after' in (until as ActionAnchor)) add('motion.until', `${at}/until`, '`until` is a word, a scene time or a scene edge, not another action');
  else checkAnchor(doc, scene, until, `${at}/until`, add);
}

function checkAction(doc: VisoDoc, scene: Scene, a: Action, at: string, add: (c: string, at: string, m: string) => void) {
  if (![a.target].flat().length) add('action.target', `${at}/target`, 'an action with no targets does nothing');
  for (const t of [a.target].flat()) if (!ID.test(t)) add('id.format', `${at}/target`, `target "${t}" is not a valid id`);
  checkAnchor(doc, scene, a.at, `${at}/at`, add);
  for (const k of ['dur', 'stagger'] as const) if (a[k] !== undefined && !seconds(a[k])) add('motion.time', `${at}/${k}`, `${k} is seconds, 0 or more`);
  if (a.until !== undefined) checkUntil(doc, scene, a.until, at, add, a.dur !== undefined ? '`until` replaces `dur`: give one of them' : a.repeat !== undefined ? 'a repeated tween plays `dur` each time, so it takes `dur`, not `until`' : a.motion === 'set' ? 'a set happens at once: it has no `until`' : undefined);
  if (a.easing !== undefined && !easingFn(a.easing)) add('motion.easing', `${at}/easing`, `unknown easing "${a.easing}"`);
  if ((a.repeat !== undefined || a.yoyo !== undefined) && (a.motion !== 'tween' || (a.repeat !== undefined && !(Number.isInteger(a.repeat) && a.repeat >= -1)) || (a.yoyo !== undefined && typeof a.yoyo !== 'boolean'))) add('motion.repeat', at, a.motion === 'tween' ? '`repeat` is a whole number, -1 or more; `yoyo` is true or false' : `${a.motion} does not repeat`);
  const to = a.to ?? {};
  if (a.motion === 'tween' && (!Object.keys(to).length || !Object.values(to).every((v) => tweenable(v) && (typeof v !== 'number' || Number.isFinite(v))))) add('motion.tween', at, 'a tween needs one or more values in `to`, each a number, a colour or a length');
  if (a.motion === 'set' && (!Object.keys(to).length || !Object.values(to).every((v) => typeof v === 'string' || typeof v === 'boolean' || (typeof v === 'number' && Number.isFinite(v))))) add('motion.set', at, 'a set needs one or more number, string or boolean values in `to`');
  if ((a.motion === 'appear' || a.motion === 'disappear') && a.to !== undefined) add('motion.to', at, `${a.motion} takes no to values`);
}

function checkSound(doc: VisoDoc, scene: Scene, s: Sound, at: string, add: (c: string, at: string, m: string) => void) {
  const asset = (doc.assets ?? []).find((a) => a.id === s.asset);
  if (!asset) add('sound.asset', `${at}/asset`, `no asset has the id "${s.asset}"`);
  else if (asset.kind !== 'audio') add('sound.asset', `${at}/asset`, `asset "${s.asset}" is a ${asset.kind}, not audio`);
  if ('after' in (s.at as ActionAnchor)) add('anchor.at', `${at}/at`, 'a sound starts on a word, a scene time or a scene edge, not after an action');
  else checkAnchor(doc, scene, s.at, `${at}/at`, add);
  if (s.until !== undefined) checkUntil(doc, scene, s.until, at, add, s.dur !== undefined || s.loop ? '`until` replaces `dur` (and `loop`): give one of them' : undefined);
  const num = (v: unknown) => v === undefined || (typeof v === 'number' && Number.isFinite(v));
  const secs = (v: unknown) => v === undefined || seconds(v);
  if (!num(s.volume) || !num(s.duck) || !secs(s.dur) || !secs(s.fadeIn) || !secs(s.fadeOut) || (s.loop !== undefined && typeof s.loop !== 'boolean')) add('sound.params', at, 'a sound takes dB for volume and duck, seconds for dur, fadeIn and fadeOut, true or false for loop');
  else if (s.fadeOut !== undefined && s.fadeOut > 0 && s.dur === undefined && s.until === undefined && !s.loop) add('sound.params', at, '`fadeOut` needs `dur` or `until` (the sound ends then) or `loop` (it ends with the film)');
  else if (s.duck !== undefined && s.duck < 0) add('sound.params', at, '`duck` is how many dB it steps back: 0 or more');
}

/** `at.after`: action ids are unique, every reference names one, no chain returns to itself, no one hangs before the action it follows */
function checkAfter(doc: VisoDoc, add: (c: string, at: string, m: string) => void) {
  const byId = new Map<string, Action>();
  const where = new Map<Action, string>();
  for (const scene of doc.scenes) {
    scene.animations.forEach((a, i) => {
      const at = `/scenes/${scene.id}/animations/${a.id ?? i}`;
      where.set(a, at);
      if (!a.id) return;
      if (byId.has(a.id)) add('action.id', at, `action id "${a.id}" is not unique`);
      else byId.set(a.id, a);
    });
  }
  const state = new Map<Action, 'visiting' | 'done'>();
  const visit = (a: Action, path: string[]) => {
    if (state.get(a) === 'done') return;
    state.set(a, 'visiting');
    if ('after' in a.at) {
      const ref = byId.get(a.at.after);
      const at = where.get(a)!;
      if (!ref) add('anchor.action', `${at}/at`, `no action has the id "${a.at.after}"`);
      else if (state.get(ref) === 'visiting') add('anchor.cycle', `${at}/at`, `actions anchored after one another form a cycle: ${[...path, a.id ?? '?', ref.id].join(' → ')}`);
      else {
        // from the head's first target to its edge: the solver's `endOf` is its last target's start plus `dur`
        const stagger = Math.max(0, [ref.target].flat().length - 1) * (ref.stagger ?? 0);
        const span = a.at.edge === 'start' ? 0 : stagger + (ref.motion === 'set' ? 0 : playTime(ref));
        if ((a.at.offset ?? 0) < -span) add('anchor.after-negative', `${at}/at`, `\`offset\` ${a.at.offset} puts the action before the start of "${ref.id}"`);
        visit(ref, [...path, a.id ?? '?']);
      }
    }
    state.set(a, 'done');
  };
  for (const a of where.keys()) visit(a, []);
}
