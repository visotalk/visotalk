/**
 * Editing a document's skeleton in its source, for the changes a person makes by hand: the words and the hold of a line, the box of a part, how an
 * animation is timed and where it is anchored, and removing one. Each edit is a splice of the text, found through the spans `parseMarkup` records, so
 * everything else in the file (what a part draws, the module's own code, the layout and comments) is left exactly as it was. Nothing is run.
 *
 * The result is read back and validated: an edit that leaves a document the engine would refuse (a word an animation hangs on that is no longer spoken, an
 * animation another is anchored after) fails with the engine's own message, and nothing is changed.
 */
import {parseMarkup, textsOf, MarkupError} from './markup.ts';
import type {El} from './markup.ts';
import {validate} from './validate.ts';

/** A number to set, or `null` to take the attribute away */
type Num = number | null;

export type Edit =
  /** `say` replaces the words of the line (a line with a <Mark> in it is edited as a whole by the agent, not here) */
  | {op: 'line'; scene: string; line: string; say?: string; hold?: Num}
  /** `scene: null` is a part declared in <Doc> */
  | {op: 'part'; scene: string | null; part: string; box: {x?: Num; y?: Num; w?: Num; h?: Num}}
  /** `animation` is its id, or `#n` for the n-th of the scene (from 0); `set` names attributes: dur, stagger, easing, offset, and a tween's values */
  | {op: 'animation'; scene: string; animation: string; set: Record<string, number | string | null>}
  /** where the animation starts, replaced whole: on a line (and a word of it), after another animation, or at a time */
  | {op: 'anchor'; scene: string; animation: string; to: {line: string; word?: string; nth?: number; edge?: 'start' | 'end'; offset?: number} | {after: string; edge?: 'start' | 'end'; offset?: number} | {at: number | 'start' | 'end'; offset?: number}}
  | {op: 'removeAnimation'; scene: string; animation: string}
  /** the words a part draws with `useText(id, …)`; `say` replaces them, `null` goes back to what the part was written with */
  | {op: 'text'; id: string; say: string | null};

export class EditError extends Error {}

const ANCHOR_ATTRS = ['line', 'word', 'nth', 'edge', 'offset', 'after', 'at', 'mark'];
/** What `animation` may set besides a tween's own values: never the target, the id or the anchor (that is `anchor`) */
const TIMING = ['dur', 'stagger', 'easing', 'repeat', 'yoyo', 'offset', 'edge'];

const attrSource = (name: string, value: number | string): string => {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new EditError(`${name} is not a finite number`);
    return `${name}={${value}}`;
  }
  return /^[A-Za-z0-9_.:-]+$/.test(value) ? `${name}="${value}"` : `${name}={${JSON.stringify(value)}}`;
};

function setAttr(src: string, node: El, name: string, value: number | string | null): string {
  const found = node.attrs.find((a) => a.name === name);
  if (value === null) {
    if (!found) return src;
    let from = found.start;
    while (from > node.start && /\s/.test(src[from - 1])) from--;
    return src.slice(0, from) + src.slice(found.end);
  }
  const text = attrSource(name, value);
  if (found) return src.slice(0, found.start) + text + src.slice(found.end);
  // before the tag closes: `>` or `/>`, and past any space already there
  let at = node.openEnd - (src[node.openEnd - 2] === '/' ? 2 : 1);
  while (at > node.start && /\s/.test(src[at - 1])) at--;
  return `${src.slice(0, at)} ${text}${src.slice(at)}`;
}

/** Text as a <Line> holds it: no braces, and `&` and `<` as entities */
const escapeText = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\{/g, '&#123;').replace(/\}/g, '&#125;');

function find(src: string, path: string, what: string): El {
  const node = parseMarkup(src).spans.get(path);
  if (!node) throw new EditError(`there is no ${what}`);
  return node;
}

const animationPath = (scene: string, ref: string) => `/scenes/${scene}/animations/${ref.startsWith('#') ? ref.slice(1) : ref}`;

function applyOne(src: string, edit: Edit): string {
  switch (edit.op) {
    case 'line': {
      const path = `/scenes/${edit.scene}/lines/${edit.line}`;
      let out = src;
      if (edit.say !== undefined) {
        const node = find(out, path, `line "${edit.line}" in scene "${edit.scene}"`);
        if (node.kids.some((k) => 'tag' in k)) throw new EditError(`line "${edit.line}" has a <Mark> in it: its words are changed by the agent, not by hand`);
        if (!edit.say.trim()) throw new EditError(`line "${edit.line}" would hold no words`);
        if (node.openEnd === node.end) throw new EditError(`line "${edit.line}" has no words to replace`);
        out = out.slice(0, node.openEnd) + escapeText(edit.say.replace(/\s+/g, ' ').trim()) + out.slice(node.closeStart);
      }
      if (edit.hold !== undefined) out = setAttr(out, find(out, path, `line "${edit.line}" in scene "${edit.scene}"`), 'hold', edit.hold);
      return out;
    }
    case 'part': {
      const path = edit.scene === null ? `/parts/${edit.part}` : `/scenes/${edit.scene}/parts/${edit.part}`;
      let out = src;
      for (const key of ['x', 'y', 'w', 'h'] as const) {
        const value = edit.box[key];
        if (value !== undefined) out = setAttr(out, find(out, path, `part "${edit.part}"`), key, value);
      }
      return out;
    }
    case 'animation': {
      const path = animationPath(edit.scene, edit.animation);
      let out = src;
      for (const [name, value] of Object.entries(edit.set)) {
        if (!/^[A-Za-z][A-Za-z0-9]*$/.test(name) || (ANCHOR_ATTRS.includes(name) && !TIMING.includes(name)) || name === 'on' || name === 'id') {
          throw new EditError(`"${name}" is not set here: timing is ${TIMING.join(', ')}; where it starts is an anchor edit`);
        }
        out = setAttr(out, find(out, path, `animation "${edit.animation}" in scene "${edit.scene}"`), name, value);
      }
      return out;
    }
    case 'anchor': {
      const node = find(src, animationPath(edit.scene, edit.animation), `animation "${edit.animation}" in scene "${edit.scene}"`);
      // The old anchor goes and the new one comes in one rewrite of the opening tag: a tag with no anchor is not a document, so there is no step between.
      const kept = node.attrs.filter((a) => !ANCHOR_ATTRS.includes(a.name)).map((a) => src.slice(a.start, a.end));
      const added = Object.entries(edit.to as Record<string, number | string | undefined>).flatMap(([name, value]) => (value === undefined ? [] : [attrSource(name, value)]));
      const closing = node.openEnd === node.end ? '/>' : '>';
      return `${src.slice(0, node.start)}<${node.tag} ${[...kept, ...added].join(' ')}${closing}${src.slice(node.openEnd)}`;
    }
    case 'text': {
      if (!textsOf(src).some((t) => t.id === edit.id)) throw new EditError(`no part draws text "${edit.id}" (useText("${edit.id}", …))`);
      if (edit.say !== null && !edit.say.trim()) throw new EditError(`text "${edit.id}" would hold no words`);
      const root = find(src, '/', 'document');
      const texts = {...parseMarkup(src).doc.texts};
      if (edit.say === null) delete texts[edit.id];
      else texts[edit.id] = edit.say;
      const entries = Object.entries(texts);
      if (!entries.length) return setAttr(src, root, 'texts', null);
      const value = `{{${entries.map(([id, say]) => `${JSON.stringify(id)}: ${JSON.stringify(say)}`).join(', ')}}}`;
      const found = root.attrs.find((a) => a.name === 'texts');
      if (found) return `${src.slice(0, found.start)}texts=${value}${src.slice(found.end)}`;
      const last = root.attrs[root.attrs.length - 1];
      return `${src.slice(0, last.end)}\n  texts=${value}${src.slice(last.end)}`;
    }
    case 'removeAnimation': {
      const node = find(src, animationPath(edit.scene, edit.animation), `animation "${edit.animation}" in scene "${edit.scene}"`);
      let from = node.start;
      while (from > 0 && /[ \t]/.test(src[from - 1])) from--;
      if (src[from - 1] === '\n') from--;
      return src.slice(0, from) + src.slice(node.end);
    }
  }
}

/**
 * Removing an animation moves the ones after it up a place, and `#n` names a place: every other change is made first, while the places are the ones the
 * person was looking at, and the removals last, those by place from the end of the scene back, then those by id.
 */
function inApplyOrder(edits: Edit[]): Edit[] {
  const removal = (e: Edit): e is Extract<Edit, {op: 'removeAnimation'}> => e.op === 'removeAnimation';
  const place = (e: Extract<Edit, {op: 'removeAnimation'}>) => (e.animation.startsWith('#') ? Number(e.animation.slice(1)) : -1);
  const removals = edits.filter(removal).sort((a, b) => place(b) - place(a));
  return [...edits.filter((e) => !removal(e)), ...removals];
}

/** The source with the edits applied in order, or an `EditError` saying why not. */
export function applyEdits(src: string, edits: Edit[]): string {
  let out = src;
  try {
    for (const edit of inApplyOrder(edits)) out = applyOne(out, edit);
    const issues = validate(parseMarkup(out).doc);
    if (issues.length) throw new EditError(`the document would no longer be valid: ${issues[0].message}`);
  } catch (error) {
    if (error instanceof MarkupError) throw new EditError(`the document would no longer read: ${error.message}`);
    throw error;
  }
  return out;
}
