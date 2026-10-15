/**
 * Markup: how an IR document is written. It is a static subset of TSX (tags, attributes, literals), read and never run, so it
 * is data, not code: `parseMarkup` compiles it to the engine's internal `VisoDoc`, and `printMarkup` prints a document back.
 * An object is referred to by its id as a string; the file may be wrapped as `export default <Doc …>…</Doc>;`.
 *
 *   export default <Doc id="demo" title="Demo" lang="en">
 *     <Chip id="tag" text="ETag: v7a1c" style="mono"/>
 *     <Scene id="s" pattern="title" slots={{title: "title", aside: "tag"}}>
 *       <Beat id="b1">
 *         <Line id="l1">The server attaches a tag called an <Stamp on="tag">ETag</Stamp>.</Line>
 *       </Beat>
 *     </Scene>
 *   </Doc>;
 *
 * An element inside a `<Line>` is an action anchored on the words it wraps: it compiles to a mark in the line's `say` and an
 * action on that mark. Everything else maps field by field: an object tag is an object (its `id` is the key), `<Node>`,
 * `<Edge>`, `<Field>`, `<Item>`, `<Step>` and `<Run>` are the elements of the array property of their parent.
 */
import type {VisoDoc} from './spec.ts';
import {SPEC_VERSION} from './spec.ts';
import {parseSay, wordSpans} from './marks.ts';
import {sayOf} from './normalize.ts';

export class MarkupError extends Error {
  line: number;
  col: number;
  constructor(message: string, line: number, col: number) {
    super(message);
    this.line = line;
    this.col = col;
  }
}

export interface Loc {
  line: number;
  col: number;
}

type Val = string | number | boolean | null | Val[] | {[k: string]: Val};
interface Attr {
  name: string;
  value: Val;
  loc: Loc;
}
interface El {
  tag: string;
  attrs: Attr[];
  kids: Array<El | Txt>;
  loc: Loc;
}
interface Txt {
  text: string;
  loc: Loc;
}

const OBJECTS: Record<string, string> = {
  Text: 'text', Shape: 'shape', Connector: 'connector', Image: 'image', Video: 'video', Card: 'card', Chip: 'chip', Counter: 'counter',
  Math: 'math', Code: 'code', Terminal: 'terminal', Graph: 'graph', Chart: 'chart', Timeline: 'timeline', Steps: 'steps', Credits: 'credits',
};
const MOTIONS: Record<string, string> = {
  Appear: 'appear', Disappear: 'disappear', Morph: 'morph', Set: 'set', Tween: 'tween', Highlight: 'highlight', Typewriter: 'typewriter', CountUp: 'countUp',
  DrawIn: 'drawIn', Flow: 'flow', KenBurns: 'kenBurns', Stamp: 'stamp', Wipe: 'wipe', Crossfade: 'crossfade',
};
const ARRAYS: Record<string, string> = {Node: 'nodes', Edge: 'edges', Field: 'fields', Item: 'items', Step: 'steps', Run: 'runs'};
const PRESETS: Record<string, [number, number]> = {'16x9': [1920, 1080], '9x16': [1080, 1920], '1x1': [1080, 1080]};
const ENTITIES: Record<string, string> = {lt: '<', gt: '>', amp: '&', quot: '"', apos: "'"};

const decode = (s: string) => s.replace(/&(#\d+|[a-z]+);/g, (m, e: string) => (e[0] === '#' ? String.fromCharCode(Number(e.slice(1))) : ENTITIES[e] ?? m));
const encodeText = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\{/g, '&#123;').replace(/\}/g, '&#125;');

// ------------------------------------------------------------------------------------------------ parser

class Parser {
  i = 0;
  imports: Array<{name: string; module: string; loc: Loc}> = [];
  starts: number[] = [0];
  s: string;
  constructor(src: string) {
    this.s = src;
    const s = src;
    for (let k = 0; k < s.length; k++) if (s[k] === '\n') this.starts.push(k + 1);
  }
  loc(at = this.i): Loc {
    let lo = 0, hi = this.starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (this.starts[mid] <= at) lo = mid; else hi = mid - 1;
    }
    return {line: lo + 1, col: at - this.starts[lo] + 1};
  }
  fail(msg: string, at = this.i): never {
    const l = this.loc(at);
    throw new MarkupError(msg, l.line, l.col);
  }
  skip() {
    for (;;) {
      while (/\s/.test(this.s[this.i] ?? '')) this.i++;
      if (!this.comment()) return;
    }
  }
  /** `{/* … *\/}` or `/* … *\/`: consumed, true */
  comment(): boolean {
    const braced = /^\{\s*\/\*/.exec(this.s.slice(this.i, this.i + 40));
    if (!braced && !this.s.startsWith('/*', this.i)) return false;
    const e = this.s.indexOf('*/', this.i);
    if (e < 0) this.fail('comment is never closed with */');
    this.i = e + 2;
    if (braced) {
      while (/\s/.test(this.s[this.i] ?? '')) this.i++;
      this.expect('}');
    }
    return true;
  }
  expect(c: string) {
    if (!this.s.startsWith(c, this.i)) this.fail(`expected "${c}" but found ${this.s[this.i] === undefined ? 'the end of the file' : `"${this.s[this.i]}"`}`);
    this.i += c.length;
  }
  document(): El {
    this.skip();
    // the import of the tags is for the editor and `tsc`; the engine knows the tags and reads nothing else
    // and a component is an import of its module, which registers it: `import {Moon} from './components/moon.ts';` then `<Moon id="view" phase={0}/>`
    while (this.s.startsWith('import ', this.i)) {
      const rest = this.s.slice(this.i);
      const tags = /^import\s*\{[^}]*\}\s*from\s*(['"])@visotalk\/jsx\1\s*;?/.exec(rest);
      const comp = /^import\s*\{\s*([A-Z][A-Za-z0-9]*)\s*\}\s*from\s*(['"])(\.{1,2}\/[^'"]+)\2\s*;?/.exec(rest);
      const m = tags ?? comp;
      if (!m) this.fail(`a document imports its tags from '@visotalk/jsx' and a component from its module: "import { Moon } from './components/moon.ts';"; nothing else`);
      if (comp && !tags) this.imports.push({name: comp[1], module: comp[3], loc: this.loc()});
      this.i += m[0].length;
      this.skip();
    }
    if (this.s.startsWith('export default', this.i)) { this.i += 'export default'.length; this.skip(); }
    const paren = this.s[this.i] === '(';
    if (paren) { this.i++; this.skip(); }
    const el = this.element();
    this.skip();
    if (paren) { this.expect(')'); this.skip(); }
    if (this.s[this.i] === ';') { this.i++; this.skip(); }
    if (this.i < this.s.length) this.fail('only one root element (<Doc>) is allowed');
    return el;
  }
  element(): El {
    const at = this.i;
    this.expect('<');
    const name = /^[A-Za-z][A-Za-z0-9]*/.exec(this.s.slice(this.i))?.[0];
    if (!name) this.fail('expected an element name after "<"');
    this.i += name.length;
    const el: El = {tag: name, attrs: [], kids: [], loc: this.loc(at)};
    for (;;) {
      this.skip();
      if (this.s.startsWith('/>', this.i)) { this.i += 2; return el; }
      if (this.s[this.i] === '>') { this.i++; break; }
      const a = this.i;
      const an = /^[A-Za-z_$][A-Za-z0-9_$:-]*/.exec(this.s.slice(this.i))?.[0];
      if (!an) this.fail(`unexpected "${this.s[this.i] ?? 'end of file'}" in the <${name}> tag: expected an attribute, ">" or "/>"`);
      this.i += an.length;
      let value: Val = true;
      if (this.s[this.i] === '=') { this.i++; value = this.attrValue(); }
      if (el.attrs.some((x) => x.name === an)) this.fail(`attribute "${an}" is given twice on <${name}>`, a);
      el.attrs.push({name: an, value, loc: this.loc(a)});
    }
    for (;;) {
      const t = this.i;
      let comment = false;
      while (this.i < this.s.length && this.s[this.i] !== '<') {
        if (this.s[this.i] === '{' && /^\{\s*\/\*/.test(this.s.slice(this.i, this.i + 40))) { comment = true; break; }
        if (this.s[this.i] === '{' || this.s[this.i] === '}') this.fail(`"${this.s[this.i]}" in text: write &#${this.s.charCodeAt(this.i)}; or move the value into an attribute`);
        this.i++;
      }
      if (this.i > t) el.kids.push({text: decode(this.s.slice(t, this.i)), loc: this.loc(t)});
      if (comment) { this.comment(); continue; }
      if (this.i >= this.s.length) this.fail(`<${name}> opened at ${el.loc.line}:${el.loc.col} is never closed`, this.i);
      if (this.s.startsWith('</', this.i)) {
        const c = this.i;
        this.i += 2;
        const cn = /^[A-Za-z][A-Za-z0-9]*/.exec(this.s.slice(this.i))?.[0] ?? '';
        this.i += cn.length;
        this.skip();
        this.expect('>');
        if (cn !== name) this.fail(`</${cn}> does not match <${name}> opened at ${el.loc.line}:${el.loc.col}`, c);
        return el;
      }
      el.kids.push(this.element());
    }
  }
  attrValue(): Val {
    const c = this.s[this.i];
    if (c === '"' || c === "'") return this.jsxString();
    if (c === '{') {
      this.i++;
      const v = this.value();
      this.skip();
      this.expect('}');
      return v;
    }
    return this.fail('an attribute value is "text" or {value}');
  }
  /** An attribute's own string, as JSX reads it: no escapes, entities only (a quote is &quot;, or the value goes in {"…"}) */
  jsxString(): string {
    const q = this.s[this.i++];
    const e = this.s.indexOf(q, this.i);
    if (e < 0) this.fail('string is never closed');
    const out = this.s.slice(this.i, e);
    this.i = e + 1;
    return decode(out);
  }
  /** A string inside {…}: JavaScript's, with escapes */
  string(): string {
    const q = this.s[this.i++];
    let out = '';
    for (;;) {
      const ch = this.s[this.i];
      if (ch === undefined) this.fail('string is never closed');
      if (ch === q) { this.i++; return decode(out); }
      if (ch === '\\') {
        const n = this.s[this.i + 1];
        out += n === 'n' ? '\n' : n === 't' ? '\t' : n;
        this.i += 2;
        continue;
      }
      out += ch;
      this.i++;
    }
  }
  value(): Val {
    this.skip();
    const c = this.s[this.i];
    if (c === '{') return this.object();
    if (c === '[') return this.array();
    if (c === '"' || c === "'") return this.string();
    const rest = this.s.slice(this.i);
    const num = /^-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/.exec(rest)?.[0];
    if (num) { this.i += num.length; return Number(num); }
    const id = /^[A-Za-z_$][A-Za-z0-9_$-]*/.exec(rest)?.[0];
    if (id) {
      this.i += id.length;
      if (id === 'true') return true;
      if (id === 'false') return false;
      if (id === 'null') return null;
      return this.fail(`"${id}" is a name, and a document holds no variables: an object is referred to by its id as a string, "${id}"`, this.i - id.length);
    }
    return this.fail(`expected a value but found ${c === undefined ? 'the end of the file' : `"${c}"`}`);
  }
  object(): Val {
    this.expect('{');
    const o: {[k: string]: Val} = {};
    for (;;) {
      this.skip();
      if (this.s[this.i] === '}') { this.i++; return o; }
      let key: string | undefined;
      if (this.s[this.i] === '"' || this.s[this.i] === "'") key = this.string();
      else {
        key = /^[A-Za-z_$][A-Za-z0-9_$-]*/.exec(this.s.slice(this.i))?.[0];
        if (key === undefined) this.fail('expected a key (a name or "text") in the object');
        this.i += key.length;
      }
      this.skip();
      this.expect(':');
      o[key] = this.value();
      this.skip();
      if (this.s[this.i] === ',') this.i++;
      else if (this.s[this.i] !== '}') this.fail('expected "," or "}" in the object');
    }
  }
  array(): Val {
    this.expect('[');
    const a: Val[] = [];
    for (;;) {
      this.skip();
      if (this.s[this.i] === ']') { this.i++; return a; }
      a.push(this.value());
      this.skip();
      if (this.s[this.i] === ',') this.i++;
      else if (this.s[this.i] !== ']') this.fail('expected "," or "]" in the array');
    }
  }
}

// ------------------------------------------------------------------------------------------------ compiler

const META_EXTRA = ['description', 'sources', 'generator', 'created', 'updated'];
const DOC_ATTRS = ['spec', 'id', 'title', 'lang', ...META_EXTRA, 'theme', 'tokens', 'voice', 'speed', 'lexicon', 'canvas', 'pacing'];
const SCENE_ATTRS = ['id', 'title', 'pattern', 'slots', 'options'];
const BEAT_ATTRS = ['id', 'hold', 'duration', 'pattern', 'slots', 'options', 'interactions'];
const LINE_ATTRS = ['id', 'text', 'say', 'live', 'i18n'];
const STATE_ATTRS = ['target', 'visible', 'emphasis', 'props'];
const ACTION_ATTRS = ['on', 'id', 'dur', 'stagger', 'easing', 'params', 'during', 'at', 'after', 'line', 'word', 'mark', 'edge', 'offset'];

type Obj = {[k: string]: unknown};

const flat = (kids: Array<El | Txt>): string => kids.map((k) => ('text' in k ? k.text : flat(k.kids))).join('');

/** Marks sit between whitespace-separated words: a boundary inside "file." moves to the start (opening) or end (closing) of that word */
function snapMarks(marked: string): string {
  const MARK = /\{([#/@])([a-z][a-z0-9_-]*)\}/g;
  let clean = '';
  const marks: Array<{sigil: string; name: string; at: number; n: number}> = [];
  let last = 0;
  for (const m of marked.matchAll(MARK)) {
    clean += marked.slice(last, m.index);
    marks.push({sigil: m[1], name: m[2], at: clean.length, n: marks.length});
    last = m.index! + m[0].length;
  }
  clean += marked.slice(last);
  if (!marks.length) return marked;
  const spans = wordSpans(clean);
  for (const k of marks) {
    const w = spans.find((x) => k.at > x.start && k.at < x.end);
    if (w) k.at = k.sigil === '/' ? w.end : w.start;
  }
  marks.sort((a, b) => a.at - b.at || (a.sigil === '/' ? 0 : 1) - (b.sigil === '/' ? 0 : 1) || a.n - b.n);
  let out = '';
  let pos = 0;
  for (const k of marks) {
    out += clean.slice(pos, k.at) + `{${k.sigil}${k.name}}`;
    pos = k.at;
  }
  return out + clean.slice(pos);
}

const kebab = (name: string) => name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

class Compiler {
  locs = new Map<string, Loc>();
  root: El;
  /** component tags: the imported name → its registration */
  components = new Map<string, {id: string; module: string; export: string; contract: string}>();
  constructor(root: El, imports: Array<{name: string; module: string; loc: Loc}>) {
    this.root = root;
    for (const i of imports) {
      if (OBJECTS[i.name] || MOTIONS[i.name] || ARRAYS[i.name] || ['Doc', 'Scene', 'Beat', 'Line', 'State', 'Canvas', 'Preset', 'Asset'].includes(i.name)) this.fail(`"${i.name}" is a tag of the document; give the component another name`, i.loc);
      this.components.set(i.name, {id: kebab(i.name), module: i.module, export: i.name, contract: 'visotalk/timed@1'});
    }
  }

  fail(msg: string, loc: Loc): never {
    throw new MarkupError(msg, loc.line, loc.col);
  }
  attrs(el: El, allowed: string[], what = `<${el.tag}>`): Obj {
    const o: Obj = {};
    for (const a of el.attrs) {
      if (!allowed.includes(a.name)) this.fail(`${what} has no attribute "${a.name}"; it takes: ${allowed.join(', ')}`, a.loc);
      o[a.name] = a.value;
    }
    return o;
  }
  noText(el: El) {
    for (const k of el.kids) if ('text' in k && k.text.trim()) this.fail(`text is only allowed inside <Line>; found "${k.text.trim().slice(0, 30)}" in <${el.tag}>`, k.loc);
  }
  elements(el: El): El[] {
    this.noText(el);
    return el.kids.filter((k): k is El => 'tag' in k);
  }

  /** An object element, or an element of an array property: attributes as fields, child elements as arrays */
  asObject(el: El): Obj {
    const o: Obj = {};
    for (const a of el.attrs) o[a.name] = a.value;
    for (const k of this.elements(el)) {
      const prop = ARRAYS[k.tag];
      if (!prop) this.fail(`<${k.tag}> cannot be inside <${el.tag}>; an object can hold ${Object.keys(ARRAYS).map((t) => `<${t}>`).join(', ')}`, k.loc);
      ((o[prop] ??= []) as Obj[]).push(this.asObject(k));
    }
    return o;
  }
  object(el: El, doc: Obj) {
    const props = this.asObject(el);
    const id = props.id;
    if (typeof id !== 'string') this.fail(`<${el.tag}> needs an id, e.g. <${el.tag} id="name" …>`, el.loc);
    delete props.id;
    const objects = doc.objects as Obj;
    if (id in objects) this.fail(`object id "${id}" is declared twice`, el.loc);
    const comp = this.components.get(el.tag);
    if (comp) {
      // a component tag: its attributes are the component's props, except the three every object has
      const {label, style, ...rest} = props;
      objects[id] = {type: 'component', component: comp.id, ...(label !== undefined && {label}), ...(style !== undefined && {style}), props: rest};
    } else objects[id] = {type: OBJECTS[el.tag], ...props};
    this.locs.set(`/objects/${id}`, el.loc);
  }

  compile(): VisoDoc {
    const root = this.root;
    if (root.tag !== 'Doc') this.fail(`the root element must be <Doc>, not <${root.tag}>`, root.loc);
    const a = this.attrs(root, [...DOC_ATTRS, 'exports', 'params', 'flow', 'overrides']);
    for (const k of ['id', 'title', 'lang']) if (typeof a[k] !== 'string') this.fail(`<Doc> needs ${k}="…" (id, title and lang)`, root.loc);
    const doc: Obj = {spec: a.spec ?? SPEC_VERSION, meta: {id: a.id, title: a.title, lang: a.lang, ...Object.fromEntries(META_EXTRA.filter((k) => a[k] !== undefined).map((k) => [k, a[k]]))}};
    let presets: Array<{id: string; width: number; height: number}> | undefined;
    if (a.canvas !== undefined) {
      presets = String(a.canvas).split(',').map((s) => s.trim()).map((id) => {
        const p = PRESETS[id];
        if (!p) this.fail(`canvas "${id}" is not one of ${Object.keys(PRESETS).join(', ')}; or write <Canvas><Preset id width height/></Canvas>`, root.loc);
        return {id, width: p[0], height: p[1]};
      });
    }
    const scenes: Obj[] = [];
    const assets: Obj[] = [];
    doc.objects = {};
    for (const k of this.elements(root)) {
      if (k.tag === 'Canvas') presets = this.elements(k).map((p) => this.attrs(p, ['id', 'width', 'height']) as {id: string; width: number; height: number});
      else if (k.tag === 'Asset') assets.push(this.asObject(k));
      else if (k.tag === 'Scene') scenes.push(this.scene(k, doc));
      else if (OBJECTS[k.tag] || this.components.has(k.tag)) this.object(k, doc);
      else this.fail(`<${k.tag}> cannot be inside <Doc>; use <Canvas>, <Asset>, <Scene> or an object (${Object.keys(OBJECTS).map((t) => `<${t}>`).join(' ')})`, k.loc);
    }
    doc.canvas = {presets: presets ?? [{id: '16x9', width: 1920, height: 1080}]};
    if (a.theme !== undefined) doc.theme = {id: a.theme, ...(a.tokens !== undefined && {tokens: a.tokens})};
    if (a.voice !== undefined) doc.voice = {voice: a.voice, ...(a.speed !== undefined && {speed: a.speed}), ...(a.lexicon !== undefined && {lexicon: a.lexicon})};
    if (a.pacing !== undefined) doc.pacing = a.pacing;
    if (assets.length) doc.assets = assets;
    if (this.components.size) doc.components = [...this.components.values()];
    for (const k of ['params', 'flow', 'overrides', 'exports']) if (a[k] !== undefined) doc[k] = a[k];
    doc.scenes = scenes;
    const order = ['spec', 'meta', 'canvas', 'theme', 'voice', 'pacing', 'assets', 'components', 'params', 'objects', 'scenes', 'flow', 'overrides', 'exports'];
    const out: Obj = {};
    for (const k of order) if (doc[k] !== undefined) out[k] = doc[k];
    return out as unknown as VisoDoc;
  }

  pattern(a: Obj, el: El, scene: boolean): Obj | undefined {
    if (a.pattern !== undefined && typeof a.pattern !== 'string') this.fail(`pattern is the name of a pattern, a string: pattern="dag"; the slots go in slots={{…}}, and a beat that only patches the pattern has no pattern attribute`, el.loc);
    if (a.pattern === undefined && a.slots === undefined && a.options === undefined) return undefined;
    if (a.pattern === undefined && scene) this.fail(`<Scene> with slots needs pattern="…" (title, board, dag, compare, steps, timeline, grid, codeOutput, photoStory, split, full)`, el.loc);
    return {...(a.pattern !== undefined && {kind: a.pattern}), ...(a.slots !== undefined && {slots: a.slots}), ...(a.options !== undefined && {options: a.options})};
  }

  scene(el: El, doc: Obj): Obj {
    const a = this.attrs(el, SCENE_ATTRS);
    if (typeof a.id !== 'string') this.fail('<Scene> needs id="…"', el.loc);
    this.locs.set(`/scenes/${a.id}`, el.loc);
    const scene: Obj = {id: a.id, ...(a.title !== undefined && {title: a.title})};
    const pat = this.pattern(a, el, true);
    if (pat) scene.pattern = pat;
    const beats: Obj[] = [];
    for (const k of this.elements(el)) {
      if (k.tag === 'Beat') beats.push(this.beat(k, a.id, doc));
      else if (OBJECTS[k.tag] || this.components.has(k.tag)) this.object(k, doc);
      else this.fail(`<${k.tag}> cannot be inside <Scene>; use <Beat>, or declare an object (it is shared by the whole document)`, k.loc);
    }
    scene.beats = beats;
    return scene;
  }

  beat(el: El, sceneId: unknown, doc: Obj): Obj {
    const a = this.attrs(el, BEAT_ATTRS);
    if (typeof a.id !== 'string') this.fail('<Beat> needs id="…"', el.loc);
    const base = `/scenes/${sceneId}/beats/${a.id}`;
    this.locs.set(base, el.loc);
    const beat: Obj = {id: a.id};
    for (const k of ['duration', 'hold']) if (a[k] !== undefined) beat[k] = a[k];
    const pat = this.pattern(a, el, false);
    if (pat) beat.pattern = pat;
    const lines: Obj[] = [];
    const state: Obj = {};
    const actions: Obj[] = [];
    for (const k of this.elements(el)) {
      if (k.tag === 'Line') lines.push(this.line(k, base, actions));
      else if (k.tag === 'State') {
        const s = this.attrs(k, STATE_ATTRS);
        if (s.target === undefined) this.fail('<State> needs target={object} (or "object#part")', k.loc);
        const {target, ...props} = s;
        for (const t of [target].flat() as string[]) { state[t] = props; this.locs.set(`${base}/state/${t}`, k.loc); }
      } else if (MOTIONS[k.tag]) {
        this.locs.set(`${base}/actions/${actions.length}`, k.loc);
        actions.push(this.action(k, undefined, base));
      } else if (OBJECTS[k.tag]) this.object(k, doc);
      else this.fail(`<${k.tag}> cannot be inside <Beat>; use <Line>, <State>, or a motion (${Object.keys(MOTIONS).map((t) => `<${t}>`).join(' ')})`, k.loc);
    }
    if (lines.length) beat.lines = lines;
    if (Object.keys(state).length) beat.state = state;
    if (actions.length) beat.actions = actions;
    if (a.interactions !== undefined) beat.interactions = a.interactions;
    return beat;
  }

  /** Text and inline actions → the caption, the spoken text with marks, and one action per inline element */
  line(el: El, base: string, actions: Obj[]): Obj {
    const a = this.attrs(el, LINE_ATTRS);
    if (typeof a.id !== 'string') this.fail('<Line> needs id="…"', el.loc);
    const lineBase = `${base}/lines/${a.id}`;
    this.locs.set(lineBase, el.loc);
    let count = 0;
    let marked = '';
    let plain = '';
    const walk = (kids: Array<El | Txt>) => {
      for (const k of kids) {
        if ('text' in k) { marked += k.text; plain += k.text; continue; }
        if (!MOTIONS[k.tag]) this.fail(`<${k.tag}> cannot be inside <Line>; only text and motions (${Object.keys(MOTIONS).map((t) => `<${t}>`).join(' ')}) wrapped around the words that trigger them`, k.loc);
        const act = this.action(k, String(a.id), lineBase);
        const at = act.at as Obj;
        const name = `m${++count}`;
        at.mark = name;
        const range = act.during === true || at.edge !== undefined || /\S\s+\S/.test(flat(k.kids).trim());
        marked += range ? `{#${name}}` : `{@${name}}`;
        this.locs.set(`${base}/actions/${actions.length}`, k.loc);
        actions.push(act);
        walk(k.kids);
        if (range) marked += `{/${name}}`;
      }
    };
    walk(el.kids);
    const squash = (s: string) => s.replace(/\s+/g, ' ').trim();
    if (/\{@m\d+\}$/.test(squash(marked))) this.fail(`<Line id="${a.id}"> ends in a motion with nothing after it to anchor on; wrap the words it should fire on: <Appear on="x">words</Appear>`, el.loc);
    marked = snapMarks(squash(marked));
    plain = squash(plain);
    const line: Obj = {id: a.id};
    if (a.say !== undefined && (count || plain)) this.fail('<Line say="…"> takes its text from the attribute: leave the element empty (use <Line id text say/>)', el.loc);
    if (a.say !== undefined) {
      line.text = a.text ?? parseSay(String(a.say)).say;
      line.say = a.say;
    } else {
      const text = a.text !== undefined ? String(a.text) : plain;
      if (!text) this.fail(`<Line id="${a.id}"> has no text`, el.loc);
      line.text = text;
      if (count || (a.text !== undefined && a.text !== plain && plain)) line.say = marked;
    }
    for (const k of ['live', 'i18n']) if (a[k] !== undefined) line[k] = a[k];
    return line;
  }

  action(el: El, lineId: string | undefined, where: string): Obj {
    // <Set> and <Tween> take the props they change as attributes: <Tween on="view" phase={0.5}>; a prop named like an attribute of the action goes in params={{props: {…}}}
    const takesProps = el.tag === 'Set' || el.tag === 'Tween';
    const own = takesProps ? el.attrs.filter((x) => ACTION_ATTRS.includes(x.name)) : el.attrs;
    const props = takesProps ? Object.fromEntries(el.attrs.filter((x) => !ACTION_ATTRS.includes(x.name)).map((x) => [x.name, x.value])) : {};
    const a = this.attrs({...el, attrs: own}, ACTION_ATTRS);
    const hint = (k: string) => (takesProps ? `; if ${'`'}${k}${'`'} is a prop of the component, write it as params={{props: {${k}: …}}}` : '');
    if (a.on === undefined) this.fail(`<${el.tag}> needs on={object} (the thing that moves); e.g. <${el.tag} on={tag}>…</${el.tag}>`, el.loc);
    const act: Obj = {target: a.on, motion: MOTIONS[el.tag]};
    let at: Obj;
    if (lineId !== undefined) {
      if (a.at !== undefined || a.after !== undefined || a.line !== undefined || a.word !== undefined || a.mark !== undefined) this.fail(`<${el.tag}> inside a <Line> is anchored on the words it wraps: drop at, after, line, word and mark${hint(['mark', 'word', 'line', 'after', 'at'].find((k) => a[k] !== undefined) ?? 'mark')}`, el.loc);
      at = {line: lineId};
    } else if (a.after !== undefined) {
      if (typeof a.after !== 'string') this.fail(`after="…" is the id of another action, a string`, el.loc);
      if (a.at !== undefined || a.line !== undefined || a.word !== undefined || a.mark !== undefined) this.fail(`<${el.tag}> has one position: after="id", or at, or line with word or mark`, el.loc);
      at = {after: a.after};
    } else if (typeof a.at === 'string') {
      if (a.at !== 'start' && a.at !== 'end') this.fail(`at="${a.at}" is not "start" or "end" (the beat's start or end); to anchor on words, wrap them in a motion inside <Line>`, el.loc);
      if (a.line !== undefined || a.word !== undefined || a.mark !== undefined) this.fail(`at="${a.at}" is the beat's own position, so line, word and mark beside it would be ignored${hint(['mark', 'word', 'line'].find((k) => a[k] !== undefined) ?? 'mark')}`, el.loc);
      at = {beat: a.at};
    } else if (a.at !== undefined) at = a.at as Obj;
    else if (a.line !== undefined) {
      at = {line: a.line};
      if (a.word !== undefined) at.word = a.word;
      if (a.mark !== undefined) at.mark = a.mark;
    } else this.fail(`<${el.tag}> needs a position: wrap words inside <Line>, or give at="start" / at="end" (the beat's), or line="…" and word="…"`, el.loc);
    if (a.edge !== undefined && a.edge !== 'start' && a.edge !== 'end') this.fail(`edge="…" is "start" or "end" (which end of the words the action fires on)${hint('edge')}`, el.loc);
    if (a.edge !== undefined) at.edge = a.edge;
    if (a.offset !== undefined) at.offset = a.offset;
    act.at = at;
    for (const k of ['dur', 'stagger', 'easing', 'during', 'id']) if (a[k] !== undefined) act[k] = a[k];
    const params = {...(a.params as Obj | undefined)};
    if (Object.keys(props).length) params.props = {...(params.props as Obj | undefined), ...props};
    if (Object.keys(params).length) act.params = params;
    void where;
    return act;
  }
}

export function parseMarkup(src: string): {doc: VisoDoc; locs: Map<string, Loc>} {
  const parser = new Parser(src);
  const root = parser.document();
  const c = new Compiler(root, parser.imports);
  const doc = c.compile();
  return {doc, locs: c.locs};
}

/** The source position of the nearest part of the document an issue's path points into */
export function locate(locs: Map<string, Loc>, path: string): Loc | undefined {
  for (let p = path; p; p = p.slice(0, Math.max(0, p.lastIndexOf('/')))) {
    const l = locs.get(p);
    if (l) return l;
  }
  return undefined;
}

// ------------------------------------------------------------------------------------------------ printer

function lit(v: unknown, ind = ''): string {
  if (v === null || typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (typeof v === 'string') return JSON.stringify(v);
  const one = Array.isArray(v) ? `[${v.map((x) => lit(x, ind)).join(', ')}]` : `{${Object.entries(v as Obj).map(([k, x]) => `${/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(k) ? k : JSON.stringify(k)}: ${lit(x, ind)}`).join(', ')}}`;
  if (one.length + ind.length <= 100) return one;
  const inner = ind + '  ';
  if (Array.isArray(v)) return `[\n${v.map((x) => inner + lit(x, inner)).join(',\n')}\n${ind}]`;
  return `{\n${Object.entries(v as Obj).map(([k, x]) => `${inner}${/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(k) ? k : JSON.stringify(k)}: ${lit(x, inner)}`).join(',\n')}\n${ind}}`;
}
function attr(name: string, v: unknown, ind: string): string {
  if (v === true) return name;
  // JSX reads an attribute's own string without escapes: a quote, a backslash or a newline puts the value in {…}
  if (typeof v === 'string' && !/["\\\n]/.test(v)) return `${name}="${v.replace(/&/g, '&amp;')}"`;
  return `${name}={${lit(v, ind)}}`;
}
/** The tags a print wrote, for its import line */
let used = new Set<string>();
function open(tag: string, attrs: Array<[string, unknown]>, ind: string, close: string): string {
  used.add(tag);
  const parts = attrs.filter(([, v]) => v !== undefined).map(([n, v]) => attr(n, v, ind + '  '));
  const one = `<${tag}${parts.length ? ' ' + parts.join(' ') : ''}${close}`;
  if (one.length + ind.length <= 120 && !one.includes('\n')) return one;
  return `<${tag}\n${parts.map((p) => `${ind}  ${p}`).join('\n')}\n${ind}${close}`;
}

const TAG_OF = Object.fromEntries(Object.entries(OBJECTS).map(([t, k]) => [k, t]));
const MOTION_TAG = Object.fromEntries(Object.entries(MOTIONS).map(([t, k]) => [k, t]));
const ARRAY_TAG = Object.fromEntries(Object.entries(ARRAYS).map(([t, k]) => [k, t]));

function printItem(tag: string, o: Obj, ind: string, parentType: string): string {
  const {id, ...rest} = o;
  const arrays = Object.entries(rest).filter(([k, v]) => ARRAY_TAG[k] && Array.isArray(v) && v.every((x) => typeof x === 'object' && x !== null && !Array.isArray(x)) && !(parentType === 'chart'));
  const attrs: Array<[string, unknown]> = [...(id !== undefined ? [['id', id] as [string, unknown]] : []), ...Object.entries(rest).filter(([k]) => !arrays.some(([a]) => a === k))];
  if (!arrays.length) return ind + open(tag, attrs, ind, '/>');
  const kids = arrays.flatMap(([k, v]) => (v as Obj[]).map((x) => printItem(ARRAY_TAG[k], x, ind + '  ', tag.toLowerCase())));
  return `${ind}${open(tag, attrs, ind, '>')}\n${kids.join('\n')}\n${ind}</${tag}>`;
}

function printAction(a: Obj, ind: string, inline: boolean): string {
  const at = a.at as Obj;
  const attrs: Array<[string, unknown]> = [['on', a.target]];
  if (!inline) {
    if ('after' in at) {
      attrs.push(['after', at.after]);
      if (at.edge !== undefined) attrs.push(['edge', at.edge]);
      if (at.offset !== undefined) attrs.push(['offset', at.offset]);
    } else if ('beat' in at && !at.ref) { attrs.push(['at', at.beat]); if (at.offset !== undefined) attrs.push(['offset', at.offset]); }
    else if ('line' in at && at.word !== undefined && typeof at.word !== 'number' && at.mark === undefined) { attrs.push(['line', at.line], ['word', at.word]); if (at.edge !== undefined) attrs.push(['edge', at.edge]); if (at.offset !== undefined) attrs.push(['offset', at.offset]); }
    else if ('line' in at && at.mark !== undefined && at.word === undefined) { attrs.push(['line', at.line], ['mark', at.mark]); if (at.edge !== undefined) attrs.push(['edge', at.edge]); if (at.offset !== undefined) attrs.push(['offset', at.offset]); }
    else if ('line' in at && at.word === undefined && at.mark === undefined) { attrs.push(['line', at.line]); if (at.edge !== undefined) attrs.push(['edge', at.edge]); if (at.offset !== undefined) attrs.push(['offset', at.offset]); }
    else attrs.push(['at', at]);
  } else {
    if (at.edge !== undefined) attrs.push(['edge', at.edge]);
    if (at.offset !== undefined) attrs.push(['offset', at.offset]);
  }
  for (const k of ['dur', 'stagger', 'easing', 'during', 'id']) if (a[k] !== undefined) attrs.push([k, a[k]]);
  // <Set> and <Tween> write the props they change as attributes, unless a prop is named like one of the action's own
  const params = {...(a.params as Obj | undefined)};
  if ((a.motion === 'set' || a.motion === 'tween') && params.props && typeof params.props === 'object' && !Object.keys(params.props as Obj).some((k) => ACTION_ATTRS.includes(k))) {
    for (const [k, v] of Object.entries(params.props as Obj)) attrs.push([k, v]);
    delete params.props;
  }
  if (Object.keys(params).length) attrs.push(['params', params]);
  return open(MOTION_TAG[a.motion as string], attrs, ind, inline ? '>' : '/>');
}

/** The words an action's anchor covers in the spoken text, or undefined when it cannot be written around words */
function spanOf(a: Obj, line: Obj, doc: VisoDoc, clean: string, marks: ReturnType<typeof parseSay>['marks']): [number, number] | undefined {
  const at = a.at as Obj;
  const spans = wordSpans(clean);
  if (typeof at.mark === 'string') {
    const m = marks.find((x) => x.name === at.mark);
    return m ? [spans[m.from].start, spans[m.to].end] : undefined;
  }
  if (typeof at.word === 'number') return spans[at.word] ? [spans[at.word].start, spans[at.word].end] : undefined;
  if (typeof at.word === 'string') {
    const phrase = at.word;
    if (!line.say && sayOf(doc, line as never) !== line.text) return undefined;
    const i = clean.toLowerCase().indexOf(phrase.toLowerCase());
    if (i < 0) return undefined;
    const from = spans.findIndex((s) => s.end > i), to = spans.findIndex((s) => s.start >= i + phrase.length) - 1;
    const last = to < 0 ? spans.length - 1 : to;
    if (from < 0 || last < from || spans[from].start !== i) return undefined;
    return [spans[from].start, spans[last].end];
  }
  return undefined;
}

function printLine(line: Obj, beatActions: Obj[], doc: VisoDoc, ind: string, rest: Obj[]): string {
  const extra: Array<[string, unknown]> = (['live', 'i18n'] as const).filter((k) => line[k] !== undefined).map((k) => [k, line[k]]);
  const raw = () => `${ind}${open('Line', [['id', line.id], ['text', line.text], ...(line.say ? [['say', line.say] as [string, unknown]] : []), ...extra], ind, '/>')}`;
  const mine = beatActions.filter((a) => (a.at as Obj).line === line.id);
  const clean = line.say ? parseSay(String(line.say)).say : String(line.text);
  const marks = line.say ? parseSay(String(line.say)).marks : [];
  const used = new Set(mine.map((a) => (a.at as Obj).mark));
  if (marks.some((m) => !used.has(m.name))) { rest.push(...mine); return raw(); }
  const items = mine.map((a, i) => ({a, i, span: spanOf(a, line, doc, clean, marks)}));
  if (items.some((x) => !x.span)) { rest.push(...mine); return raw(); }
  const sorted = [...items].sort((x, y) => x.span![0] - y.span![0] || y.span![1] - x.span![1] || x.i - y.i);
  const stack: Array<[number, number]> = [];
  for (const it of sorted) {
    while (stack.length && stack[stack.length - 1][1] <= it.span![0]) stack.pop();
    if (stack.length && it.span![1] > stack[stack.length - 1][1]) { rest.push(...mine); return raw(); }
    stack.push(it.span!);
  }
  // an action that is a point or whose range is written as `during` keeps its anchor kind: only `during`/`edge` make a range
  for (const it of items) {
    const at = it.a.at as Obj, m = typeof at.mark === 'string' ? marks.find((x) => x.name === at.mark) : undefined;
    if (m?.kind === 'point' && (it.a.during === true || at.edge !== undefined)) { rest.push(...mine); return raw(); }
  }
  let body = '';
  let pos = 0;
  const opens = new Map<number, typeof sorted>();
  const closes = new Map<number, typeof sorted>();
  for (const it of sorted) {
    (opens.get(it.span![0]) ?? opens.set(it.span![0], []).get(it.span![0])!).push(it);
    (closes.get(it.span![1]) ?? closes.set(it.span![1], []).get(it.span![1])!).unshift(it);
  }
  const cuts = [...new Set([...opens.keys(), ...closes.keys()])].sort((x, y) => x - y);
  for (const c of cuts) {
    body += encodeText(clean.slice(pos, c));
    pos = c;
    for (const it of closes.get(c) ?? []) body += `</${MOTION_TAG[it.a.motion as string]}>`;
    for (const it of opens.get(c) ?? []) body += printAction(it.a, ind, true);
  }
  body += encodeText(clean.slice(pos));
  const attrs: Array<[string, unknown]> = [['id', line.id], ...(line.text !== clean ? [['text', line.text] as [string, unknown]] : []), ...extra];
  return `${ind}${open('Line', attrs, ind, '>')}${body}</Line>`;
}

export function printMarkup(doc: VisoDoc): string {
  used = new Set();
  const d = doc as unknown as Obj & {meta: Obj; canvas: {presets: Array<Obj>}; objects: Obj; scenes: Array<Obj>};
  const out: string[] = [];
  const presetIds = d.canvas.presets.map((p) => p.id as string);
  const standard = d.canvas.presets.every((p) => PRESETS[p.id as string]?.[0] === p.width && PRESETS[p.id as string]?.[1] === p.height);
  const theme = d.theme as Obj | undefined, voice = d.voice as Obj | undefined;
  // a registered component is imported by its module and used as a tag named by its export
  const comps = ((d.components as Obj[] | undefined) ?? []).map((c) => ({id: c.id as string, module: c.module as string, name: (c.export as string | undefined) ?? (c.id as string).split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join('')}));
  const compName = new Map(comps.map((c) => [c.id, c.name]));
  const docAttrs: Array<[string, unknown]> = [
    ['spec', d.spec], ['id', d.meta.id], ['title', d.meta.title], ['lang', d.meta.lang], ...META_EXTRA.map((k) => [k, d.meta[k]] as [string, unknown]),
    ['theme', theme?.id], ['tokens', theme?.tokens], ['voice', voice?.voice], ['speed', voice?.speed], ['lexicon', voice?.lexicon],
    ['canvas', standard ? presetIds.join(',') : undefined], ['pacing', d.pacing],
    ...(['params', 'flow', 'overrides', 'exports'] as const).map((k) => [k, d[k]] as [string, unknown]),
  ];
  out.push('export default ' + open('Doc', docAttrs, '', '>'));
  if (!standard) out.push('  <Canvas>', ...d.canvas.presets.map((p) => '    ' + open('Preset', [['id', p.id], ['width', p.width], ['height', p.height]], '    ', '/>')), '  </Canvas>');
  for (const a of (d.assets as Obj[] | undefined) ?? []) out.push(printItem('Asset', a, '  ', 'asset'));
  out.push('');
  for (const [id, o] of Object.entries(d.objects)) {
    const {type, ...props} = o as Obj;
    if (type === 'component') {
      const {component, label, style, props: own} = props as {component: string; label?: string; style?: string; props?: Obj};
      const name = compName.get(component);
      if (!name) throw new Error(`object "${id}" uses the component "${component}", which is not in \`components\``);
      if (own && ['id', 'label', 'style'].some((k) => k in own)) throw new Error(`a prop of the component "${component}" is named id, label or style, which a tag takes for itself`);
      out.push('  ' + open(name, [['id', id], ['label', label], ['style', style], ...Object.entries(own ?? {})], '  ', '/>'));
    } else out.push(printItem(TAG_OF[type as string], {id, ...props}, '  ', type as string));
  }
  for (const s of d.scenes) {
    out.push('');
    const pat = s.pattern as Obj | undefined;
    out.push('  ' + open('Scene', [['id', s.id], ['title', s.title], ['pattern', pat?.kind], ['slots', pat?.slots], ['options', pat?.options]], '  ', '>'));
    for (const b of s.beats as Obj[]) {
      const bp = b.pattern as Obj | undefined;
      out.push('    ' + open('Beat', [['id', b.id], ['duration', b.duration], ['hold', b.hold], ['pattern', bp?.kind], ['slots', bp?.slots], ['options', bp?.options], ['interactions', b.interactions]], '    ', '>'));
      for (const [t, st] of Object.entries((b.state as Obj | undefined) ?? {})) out.push('      ' + open('State', [['target', t], ...Object.entries(st as Obj)], '      ', '/>'));
      const actions = (b.actions as Obj[] | undefined) ?? [];
      const rest: Obj[] = [];
      for (const l of (b.lines as Obj[] | undefined) ?? []) out.push(printLine(l, actions, doc, '      ', rest));
      const inline = new Set(actions.filter((a) => !rest.includes(a) && 'line' in (a.at as Obj) && ((b.lines as Obj[]) ?? []).some((l) => l.id === (a.at as Obj).line)));
      for (const a of actions) if (!inline.has(a)) out.push('      ' + printAction(a, '      ', false));
      out.push('    </Beat>');
    }
    out.push('  </Scene>');
  }
  out.push('</Doc>;', '');
  const body = out.join('\n');
  const tags = [...used].filter((t) => !compName.has(t) && ![...compName.values()].includes(t)).sort();
  const imports = [`import {${tags.join(', ')}} from '@visotalk/jsx';`, ...comps.map((c) => `import {${c.name}} from ${JSON.stringify(c.module)};`)];
  return `${imports.join('\n')}\n\n${body}`;
}
