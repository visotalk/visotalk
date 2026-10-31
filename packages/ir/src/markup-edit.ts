/**
 * Editing a document's skeleton in its source, for the changes a person makes by hand: the name, place and copies of a scene and removing one, the words
 * and the hold of a line, the box of a part, how an animation is timed and where it is anchored, removing one, and the voice that speaks it. Each edit is a splice of the text, found through the spans `parseMarkup` records, so
 * everything else in the file (what a part draws, the module's own code, the layout and comments) is left exactly as it was. Nothing is run.
 *
 * The result is read back and validated: an edit that leaves a document the engine would refuse (a word an animation hangs on that is no longer spoken, an
 * animation another is anchored after) fails with the engine's own message, and nothing is changed.
 */
import {parseMarkup, textsOf, MarkupError} from './markup.ts';
import type {El} from './markup.ts';
import type {Scene, VisoDoc} from './spec.ts';
import {validate} from './validate.ts';

/** A number to set, or `null` to take the attribute away */
type Num = number | null;

export type Edit =
  /** the scene's name; `null` takes it away (the scene is then called by its id) */
  | {op: 'scene'; scene: string; title: string | null}
  /** the scene goes just before `before`, or last with `null` */
  | {op: 'moveScene'; scene: string; before: string | null}
  /** a copy of the scene goes just after it: the scene, its lines, actions and sounds get new ids (theirs with the first `-n` free for all of them), and what in it names one of them follows */
  | {op: 'duplicateScene'; scene: string}
  | {op: 'removeScene'; scene: string}
  /** `say` replaces the words of the line (a line with a <Mark> in it is edited as a whole by the agent, not here) */
  | {op:'keepClear';regions:Array<{x:number;y:number;w:number;h:number}>}
  | {op:'sound';scene:string;sound:string;set:{volume?:number;duck?:number;fadeIn?:number;fadeOut?:number}}
  | {op:'caption';scene:string;line:string;text:string}
  | {op: 'line'; scene: string; line: string; say?: string; hold?: Num}
  /** `scene: null` is a part declared in <Doc> */
  | {op: 'part'; scene: string | null; part: string; box: {x?: Num; y?: Num; w?: Num; h?: Num}}
  /** `animation` is its id, or `#n` for the n-th of the scene (from 0); `set` changes timing attributes, `to` changes a tween or set's values */
  | {op: 'animation'; scene: string; animation: string; set?: Record<string, number | string | boolean | null>; to?: Record<string, number | string | boolean | null>}
  /** where the animation starts, replaced whole: on a line (and a word of it), after another animation, or at a time */
  | {op: 'anchor'; scene: string; animation: string; to: {line: string; word?: string; nth?: number; edge?: 'start' | 'end'; offset?: number} | {after: string; edge?: 'start' | 'end'; offset?: number} | {at: number | 'start' | 'end'; offset?: number}}
  | {op: 'removeAnimation'; scene: string; animation: string}
  /** the words a part draws with `useText(id, …)`; `say` replaces them, `null` goes back to what the part was written with */
  | {op: 'text'; id: string; say: string | null}
  /** the voice that speaks every line (`<Doc voice>`); its speed and lexicon stay, and `null` takes it away (the engine's default). Every line is spoken again */
  | {op: 'voice'; voice: string | null};

export class EditError extends Error {}

const ANCHOR_ATTRS = ['line', 'word', 'nth', 'edge', 'offset', 'after', 'at', 'mark'];
/** Timing attributes editable without changing the target, id or anchor */
const TIMING = ['dur', 'stagger', 'easing', 'repeat', 'yoyo', 'offset', 'edge'];

const attrSource = (name: string, value: number | string | boolean | object): string => {
  if(typeof value==='object')return `${name}={${JSON.stringify(value)}}`;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new EditError(`${name} is not a finite number`);
    return `${name}={${value}}`;
  }
  if (typeof value === 'boolean') return `${name}={${value}}`;
  return /^[A-Za-z0-9_.:-]+$/.test(value) ? `${name}="${value}"` : `${name}={${JSON.stringify(value)}}`;
};

function setAttr(src: string, node: El, name: string, value: number | string | boolean | object | null): string {
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

/** Where an element is written with the rest of its own line: from the line's start when only space comes before it, through the newline after it */
function chunk(src: string, node: El): [number, number] {
  let from = node.start;
  while (from > 0 && /[ \t]/.test(src[from - 1])) from--;
  if (from > 0 && src[from - 1] !== '\n') from = node.start;
  const to = src[node.end] === '\n' ? node.end + 1 : node.end;
  return [from, to];
}

/** The ids a scene declares: its own, its lines', and its actions' and sounds' that have one */
const idsOf = (scene: Scene) => [scene.id, ...scene.lines.map((l) => l.id), ...[...scene.animations, ...(scene.sounds ?? [])].flatMap((a) => (a.id ? [a.id] : []))];

/** What a copy of the scene adds to every id it declares (`duplicateScene`): `-n`, the first n from 2 that makes none of them one the document has */
export function copySuffix(doc: Pick<VisoDoc, 'scenes'>, scene: string): string {
  const own = doc.scenes.find((s) => s.id === scene);
  if (!own) throw new EditError(`there is no scene "${scene}"`);
  const taken = new Set(doc.scenes.flatMap(idsOf));
  let n = 2;
  while (idsOf(own).some((id) => taken.has(`${id}-${n}`))) n++;
  return `-${n}`;
}

const scenePath = (scene: string) => `/scenes/${scene}`;

/** The scene's text with every id it declares given `suffix`, and the references to them inside it changed with them */
function copyOfScene(src: string, node: El, from: number, to: number, suffix: string, ids: ReadonlySet<string>): string {
  const renamed = (value: unknown) => (typeof value === 'string' && ids.has(value) ? value + suffix : undefined);
  const splices: Array<{start: number; end: number; text: string}> = [];
  const rename = (el: El, names: string[]) => {
    for (const a of el.attrs) {
      const next = names.includes(a.name) ? renamed(a.value) : undefined;
      if (next !== undefined) splices.push({start: a.start, end: a.end, text: attrSource(a.name, next)});
    }
  };
  rename(node, ['id']);
  for (const kid of node.kids) {
    if (!('tag' in kid)) continue;
    if (kid.tag === 'Line') rename(kid, ['id']);
    if (kid.tag === 'Sound') rename(kid, ['id', 'line']);
    if (kid.tag === 'Animation') for (const m of kid.kids) if ('tag' in m) rename(m, ['id', 'line', 'after']);
  }
  let out = src.slice(from, to);
  for (const s of splices.sort((a, b) => b.start - a.start)) out = out.slice(0, s.start - from) + s.text + out.slice(s.end - from);
  return src[to - 1] === '\n' ? out : `\n${out}`;
}

const animationPath = (scene: string, ref: string) => `/scenes/${scene}/animations/${ref.startsWith('#') ? ref.slice(1) : ref}`;

function applyOne(src: string, edit: Edit): string {
  switch (edit.op) {
    case 'scene': {
      if (edit.title !== null && !edit.title.trim()) throw new EditError('a scene\'s name has words; take it away with null');
      return setAttr(src, find(src, scenePath(edit.scene), `scene "${edit.scene}"`), 'title', edit.title === null ? null : edit.title.trim());
    }
    case 'moveScene': {
      if (edit.before === edit.scene) return src;
      const [from, to] = chunk(src, find(src, scenePath(edit.scene), `scene "${edit.scene}"`));
      const moving = src.slice(from, to);
      const rest = src.slice(0, from) + src.slice(to);
      const parsed = parseMarkup(rest);
      let at: number;
      if (edit.before !== null) {
        const target = parsed.spans.get(scenePath(edit.before));
        if (!target) throw new EditError(`there is no scene "${edit.before}"`);
        at = chunk(rest, target)[0];
      } else {
        const last = parsed.doc.scenes.at(-1);
        at = last ? chunk(rest, parsed.spans.get(scenePath(last.id))!)[1] : from;
      }
      const text = at > 0 && rest[at - 1] !== '\n' ? `\n${moving}` : moving;
      return rest.slice(0, at) + text + rest.slice(at);
    }
    case 'duplicateScene': {
      const parsed = parseMarkup(src);
      const node = parsed.spans.get(scenePath(edit.scene));
      if (!node) throw new EditError(`there is no scene "${edit.scene}"`);
      const own = new Set(idsOf(parsed.doc.scenes.find((s) => s.id === edit.scene)!));
      const [from, to] = chunk(src, node);
      return src.slice(0, to) + copyOfScene(src, node, from, to, copySuffix(parsed.doc, edit.scene), own) + src.slice(to);
    }
    case 'removeScene': {
      const parsed = parseMarkup(src);
      if (parsed.doc.scenes.length === 1 && parsed.doc.scenes[0].id === edit.scene) throw new EditError('a document keeps at least one scene');
      const [from, to] = chunk(src, find(src, scenePath(edit.scene), `scene "${edit.scene}"`));
      return src.slice(0, from) + src.slice(to);
    }
    case 'keepClear': return setAttr(src,find(src,'/','document'),'keepClear',edit.regions);
    case 'sound': {
      const parsed=parseMarkup(src),scene=parsed.spans.get(`/scenes/${edit.scene}`);
      const sounds=scene?.kids.filter((k)=>'tag' in k&&k.tag==='Sound')??[];
      const node=edit.sound.startsWith('#')?sounds[Number(edit.sound.slice(1))]:sounds.find((k)=>'tag' in k&&k.attrs.some((a)=>a.name==='id'&&a.value===edit.sound));
      if(!node||!('tag' in node))throw new EditError('No such sound');
      let out=src;
      for(const [key,value] of Object.entries(edit.set)){const fresh=parseMarkup(out).spans.get(`/scenes/${edit.scene}`)!.kids.filter((k)=>'tag' in k&&k.tag==='Sound')[sounds.indexOf(node)];if(!fresh||!('tag' in fresh))throw new EditError('No such sound');out=setAttr(out,fresh,key,value!);}
      return out;
    }
    case 'caption': {if(!edit.text.trim())throw new EditError('A caption cannot be empty');return setAttr(src,find(src,`/scenes/${edit.scene}/lines/${edit.line}`,'line'),'text',edit.text.trim());}
    case 'line': {
      if(parseMarkup(src).doc.voice?.voice.startsWith('recording:'))throw new EditError('Recorded speech cannot be rewritten; edit its caption instead');
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
      for (const [name, value] of Object.entries(edit.set ?? {})) {
        if (!TIMING.includes(name)) {
          throw new EditError(`"${name}" is not set here: timing is ${TIMING.join(', ')}; where it starts is an anchor edit`);
        }
        out = setAttr(out, find(out, path, `animation "${edit.animation}" in scene "${edit.scene}"`), name, value);
      }
      if (edit.to !== undefined) {
        const node = find(out, path, `animation "${edit.animation}" in scene "${edit.scene}"`);
        if (node.tag !== 'Tween' && node.tag !== 'Set') throw new EditError(`${node.tag} does not change values`);
        const values = {...(node.attrs.find((a) => a.name === 'to')?.value as Record<string, number | string | boolean> | undefined)};
        for (const [name, value] of Object.entries(edit.to)) {
          if (!/^[A-Za-z_$][A-Za-z0-9_$-]*$/.test(name) || (value !== null && !['number', 'string', 'boolean'].includes(typeof value))) throw new EditError(`"${name}" is not a value to change`);
          if (value === null) delete values[name];
          else values[name] = value;
        }
        if (!Object.keys(values).length) throw new EditError(`${node.tag} needs at least one value in to`);
        const text = `to={${JSON.stringify(values)}}`;
        const found = node.attrs.find((a) => a.name === 'to');
        if (found) out = out.slice(0, found.start) + text + out.slice(found.end);
        else {
          let at = node.openEnd - (out[node.openEnd - 2] === '/' ? 2 : 1);
          while (at > node.start && /\s/.test(out[at - 1])) at--;
          out = `${out.slice(0, at)} ${text}${out.slice(at)}`;
        }
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
    case 'voice': {
      if (edit.voice !== null && !edit.voice.trim()) throw new EditError('a voice has a name');
      return setAttr(src, find(src, '/', 'document'), 'voice', edit.voice === null ? null : edit.voice.trim());
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
