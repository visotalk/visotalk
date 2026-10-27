/**
 * Markup: how an IR document is written. The file is a TSX module; the engine reads its skeleton, a static subset (tags, attributes, literals), and never
 * runs it, so lines, parts and animations are data: `parseMarkup` compiles them to the engine's internal `VisoDoc`. What a part draws is React, found
 * by its closing tag and kept as source; the code before `export default` is the module's own and is not read.
 *
 *   import {Doc, Scene, Line, Part, Animation, Appear, Tween} from '@visotalk/jsx';
 *
 *   export default <Doc id="demo" title="Demo" lang="en" canvas="16x9">
 *     <Scene id="intro">
 *       <Line id="l1">One billion people, counted.</Line>
 *       <Part id="bar"><div {...useTarget("fill")}/></Part>
 *       <Animation>
  *         <Appear target="bar" line="l1" word="billion"/>
  *         <Tween target="fill" to={{w: 1100}} line="l1" word="counted" dur={1.4}/>
 *       </Animation>
 *     </Scene>
 *   </Doc>;
 */
import {normalizeWord, occurrenceAt, tweenable} from './timeline.ts';
import type {Action, ActionAnchor, Anchor, Asset, Line, MotionKind, Part, Scene, Sound, VisoDoc} from './spec.ts';
import {SPEC_VERSION} from './spec.ts';

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
  /** where the attribute is written: its name through the end of its value */
  start: number;
  end: number;
}
export interface El {
  tag: string;
  attrs: Attr[];
  kids: Array<El | Txt>;
  loc: Loc;
  /** where the element is written: `<`, the end of the opening tag, the start of the closing tag (`openEnd` when it has none), and past it */
  start: number;
  openEnd: number;
  closeStart: number;
  end: number;
  /** `<Part>` only: the source of its children */
  body?: string;
}
interface Txt {
  text: string;
  loc: Loc;
}

const MOTIONS: Record<string, MotionKind> = {Appear: 'appear', Disappear: 'disappear', Tween: 'tween', Set: 'set'};
const PRESETS: Record<string, [number, number]> = {'16x9': [1920, 1080], '9x16': [1080, 1920], '1x1': [1080, 1080]};
const ENTITIES: Record<string, string> = {lt: '<', gt: '>', amp: '&', quot: '"', apos: "'"};

/** A table lookup that ignores the prototype: `<constructor>` and `&constructor;` are not in the table */
const own = <T>(table: Record<string, T>, key: string): T | undefined => (Object.hasOwn(table, key) ? table[key] : undefined);

const decode = (s: string) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
  if (e[0] !== '#') return own(ENTITIES, e) ?? m;
  const cp = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : Number(e.slice(1));
  return cp <= 0x10ffff ? String.fromCodePoint(cp) : m;
});

// ------------------------------------------------------------------------------------------------ parser

class Parser {
  i = 0;
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
  /** Source before `export default <Doc`: the module's own code (imports, helpers, data), which the document never reads */
  prelude = '';
  document(): El {
    const m = /^[ \t]*export[ \t]+default[ \t\n]*(\(?)[ \t\n]*(?=<Doc[\s>/])/m.exec(this.s);
    if (!m) this.fail('a document is `export default <Doc …>…</Doc>;`: no `export default <Doc` found');
    this.prelude = this.s.slice(0, m.index);
    this.i = m.index + m[0].length;
    const paren = m[1] === '(';
    const el = this.element();
    this.skip();
    if (paren) { this.expect(')'); this.skip(); }
    if (this.s[this.i] === ';') { this.i++; this.skip(); }
    if (this.i < this.s.length) this.fail('only one root element (<Doc>) is allowed; module code goes before `export default`');
    return el;
  }
  element(): El {
    const at = this.i;
    this.expect('<');
    const name = /^[A-Za-z][A-Za-z0-9]*/.exec(this.s.slice(this.i))?.[0];
    if (!name) this.fail('expected an element name after "<"');
    this.i += name.length;
    const el: El = {tag: name, attrs: [], kids: [], loc: this.loc(at), start: at, openEnd: at, closeStart: at, end: at};
    for (;;) {
      this.skip();
      if (this.s.startsWith('/>', this.i)) { this.i += 2; el.openEnd = el.closeStart = el.end = this.i; return el; }
      if (this.s[this.i] === '>') { this.i++; el.openEnd = this.i; break; }
      const a = this.i;
      const an = /^[A-Za-z_$][A-Za-z0-9_$:-]*/.exec(this.s.slice(this.i))?.[0];
      if (!an) this.fail(`unexpected "${this.s[this.i] ?? 'end of file'}" in the <${name}> tag: expected an attribute, ">" or "/>"`);
      this.i += an.length;
      let value: Val = true;
      if (this.s[this.i] === '=') { this.i++; value = this.attrValue(); }
      if (el.attrs.some((x) => x.name === an)) this.fail(`attribute "${an}" is given twice on <${name}>`, a);
      el.attrs.push({name: an, value, loc: this.loc(a), start: a, end: this.i});
    }
    if (name === 'Part') {
      // the body is React: the engine does not read it, it finds the end of it (a part holds no other Part)
      const close = this.s.indexOf('</Part>', this.i);
      if (close < 0) this.fail(`<Part> opened at ${el.loc.line}:${el.loc.col} is never closed with </Part>`, this.i);
      el.body = this.s.slice(this.i, close);
      el.closeStart = close;
      this.i = close + '</Part>'.length;
      el.end = this.i;
      return el;
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
        el.closeStart = c;
        el.end = this.i;
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
        const hex = /^(?:u\{([0-9a-fA-F]+)\}|u([0-9a-fA-F]{4})|x([0-9a-fA-F]{2}))/.exec(this.s.slice(this.i + 1, this.i + 12));
        if (hex) {
          const cp = parseInt(hex[1] ?? hex[2] ?? hex[3], 16);
          if (cp > 0x10ffff) this.fail(`\\${hex[0]} is not a character`, this.i);
          out += String.fromCodePoint(cp);
          this.i += 1 + hex[0].length;
          continue;
        }
        out += n === 'n' ? '\n' : n === 't' ? '\t' : n === 'r' ? '\r' : n;
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

const META_EXTRA = ['description', 'poster', 'sources', 'generator', 'created', 'updated'];
const DOC_ATTRS = ['spec', 'id', 'title', 'lang', ...META_EXTRA, 'theme', 'tokens', 'voice', 'speed', 'lexicon', 'canvas', 'pacing', 'texts', 'exports'];
const SCENE_ATTRS = ['id', 'title', 'duration'];
const PART_ATTRS = ['id', 'x', 'y', 'w', 'h', 'z'];
const LINE_ATTRS = ['id', 'text', 'hold'];
/** What every motion takes; `set` and `tween` take, besides these, the props they change as attributes */
const SOUND_ATTRS = ['id', 'asset', 'dur', 'until', 'volume', 'loop', 'fadeIn', 'fadeOut', 'duck', 'at', 'line', 'word', 'nth', 'mark', 'edge', 'offset'];
const ACTION_ATTRS = ['target', 'to', 'id', 'dur', 'until', 'stagger', 'easing', 'repeat', 'yoyo', 'at', 'after', 'line', 'word', 'nth', 'mark', 'edge', 'offset'];

type Obj = {[k: string]: unknown};

class Compiler {
  locs = new Map<string, Loc>();
  /** the same paths as `locs`, with the element they point at */
  spans = new Map<string, El>();
  /** per `scene/line`: the phrase and occurrence each of its marks wraps */
  marks = new Map<string, Map<string, {word: string; nth: number}>>();
  root: El;
  constructor(root: El) {
    this.root = root;
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
  /** Seconds, pixels and counts are numbers: `hold="1"` is a string, which `>= 0` accepts and the solver then concatenates */
  numbers(el: El, o: Obj, keys: string[]) {
    for (const k of keys) {
      const v = o[k];
      if (v !== undefined && !(typeof v === 'number' && Number.isFinite(v))) this.fail(`${k} of <${el.tag}> is a number: write ${k}={…}, not ${k}="…"`, el.attrs.find((x) => x.name === k)?.loc ?? el.loc);
    }
  }
  elements(el: El, textOk = false): El[] {
    if (!textOk) for (const k of el.kids) if ('text' in k && k.text.trim()) this.fail(`text is only allowed inside <Line>; found "${k.text.trim().slice(0, 30)}" in <${el.tag}>`, k.loc);
    return el.kids.filter((k): k is El => 'tag' in k);
  }
  asObject(el: El): Obj {
    const o: Obj = {};
    for (const a of el.attrs) o[a.name] = a.value;
    this.elements(el);
    return o;
  }

  compile(): VisoDoc {
    const root = this.root;
    if (root.tag !== 'Doc') this.fail(`the root element must be <Doc>, not <${root.tag}>`, root.loc);
    this.spans.set('/', root);
    const a = this.attrs(root, DOC_ATTRS);
    for (const k of ['id', 'title', 'lang']) if (typeof a[k] !== 'string') this.fail(`<Doc> needs ${k}="…" (id, title and lang)`, root.loc);
    const doc: Obj = {spec: a.spec ?? SPEC_VERSION, meta: {id: a.id, title: a.title, lang: a.lang, ...Object.fromEntries(META_EXTRA.filter((k) => a[k] !== undefined).map((k) => [k, a[k]]))}};
    let presets: Array<{id: string; width: number; height: number}> | undefined;
    if (a.canvas !== undefined) {
      presets = String(a.canvas).split(',').map((s) => s.trim()).map((id) => {
        const p = own(PRESETS, id);
        if (!p) this.fail(`canvas "${id}" is not one of ${Object.keys(PRESETS).join(', ')}; or write <Canvas><Preset id width height/></Canvas>`, root.loc);
        return {id, width: p[0], height: p[1]};
      });
    }
    const scenes: Scene[] = [];
    const assets: Asset[] = [];
    const parts: Part[] = [];
    for (const k of this.elements(root)) {
      if (k.tag === 'Canvas') {
        presets = this.elements(k).map((p) => {
          const o = this.attrs(p, ['id', 'width', 'height']);
          this.numbers(p, o, ['width', 'height']);
          return o as {id: string; width: number; height: number};
        });
      }
      else if (k.tag === 'Asset') assets.push(this.asObject(k) as unknown as Asset);
      else if (k.tag === 'Part') parts.push(this.part(k, 'doc'));
      else if (k.tag === 'Scene') scenes.push(this.scene(k));
      else this.fail(`<${k.tag}> cannot be inside <Doc>; use <Canvas>, <Asset>, <Part> (on screen in every scene) or <Scene>`, k.loc);
    }
    doc.canvas = {presets: presets ?? [{id: '16x9', width: 1920, height: 1080}]};
    const attrLoc = (name: string) => root.attrs.find((x) => x.name === name)?.loc ?? root.loc;
    if (a.tokens !== undefined && a.theme === undefined) this.fail('tokens override a theme: add theme="…" (e.g. theme="visotalk/dark")', attrLoc('tokens'));
    for (const k of ['speed', 'lexicon']) if (a[k] !== undefined && a.voice === undefined) this.fail(`${k} belongs to the voice: add voice="…"`, attrLoc(k));
    if (a.theme !== undefined) doc.theme = {id: a.theme, ...(a.tokens !== undefined && {tokens: a.tokens})};
    if (a.voice !== undefined) doc.voice = {voice: a.voice, ...(a.speed !== undefined && {speed: a.speed}), ...(a.lexicon !== undefined && {lexicon: a.lexicon})};
    if (a.pacing !== undefined) doc.pacing = a.pacing;
    if (a.texts !== undefined) doc.texts = a.texts;
    if (assets.length) doc.assets = assets;
    if (parts.length) doc.parts = parts;
    doc.scenes = scenes;
    if (a.exports !== undefined) doc.exports = a.exports;
    const order = ['spec', 'meta', 'canvas', 'theme', 'voice', 'pacing', 'texts', 'assets', 'parts', 'scenes', 'exports'];
    const out: Obj = {};
    for (const k of order) if (doc[k] !== undefined) out[k] = doc[k];
    return out as unknown as VisoDoc;
  }

  part(el: El, scene: string): Part {
    const a = this.attrs(el, PART_ATTRS);
    if (typeof a.id !== 'string') this.fail('<Part> needs id="…"', el.loc);
    this.locs.set(scene === 'doc' ? `/parts/${a.id}` : `/scenes/${scene}/parts/${a.id}`, el.loc);
    this.spans.set(scene === 'doc' ? `/parts/${a.id}` : `/scenes/${scene}/parts/${a.id}`, el);
    this.numbers(el, a, ['x', 'y', 'w', 'h', 'z']);
    const {id, ...box} = a;
    return {id, ...box, ...(el.body !== undefined && el.body.trim() && {body: el.body.trim()})} as Part;
  }

  scene(el: El): Scene {
    const a = this.attrs(el, SCENE_ATTRS);
    if (typeof a.id !== 'string') this.fail('<Scene> needs id="…"', el.loc);
    this.numbers(el, a, ['duration']);
    const id = a.id;
    this.locs.set(`/scenes/${id}`, el.loc);
    this.spans.set(`/scenes/${id}`, el);
    const lines: Line[] = [];
    const parts: Part[] = [];
    const animations: Action[] = [];
    const sounds: Sound[] = [];
    const actionLocs = new Map<Action, Loc>();
    for (const k of this.elements(el)) {
      if (k.tag === 'Line') lines.push(this.line(k, id));
      else if (k.tag === 'Part') parts.push(this.part(k, id));
      else if (k.tag === 'Animation') {
        this.attrs(k, []);
        for (const m of this.elements(k)) {
          if (!own(MOTIONS, m.tag)) this.fail(`<${m.tag}> cannot be inside <Animation>; use ${Object.keys(MOTIONS).map((t) => `<${t}>`).join(', ')}`, m.loc);
          const action = this.action(m);
          // the validator addresses an action by its id when it has one, else by its place
          this.locs.set(`/scenes/${id}/animations/${animations.length}`, m.loc);
          this.spans.set(`/scenes/${id}/animations/${animations.length}`, m);
          if (action.id) {
            this.locs.set(`/scenes/${id}/animations/${action.id}`, m.loc);
            this.spans.set(`/scenes/${id}/animations/${action.id}`, m);
          }
          animations.push(action);
          actionLocs.set(action, m.loc);
        }
      } else if (k.tag === 'Sound') {
        const sound = this.sound(k);
        this.locs.set(`/scenes/${id}/sounds/${sounds.length}`, k.loc);
        this.spans.set(`/scenes/${id}/sounds/${sounds.length}`, k);
        sounds.push(sound);
        actionLocs.set(sound as unknown as Action, k.loc);
      } else this.fail(`<${k.tag}> cannot be inside <Scene>; use <Line>, <Part>, <Animation> or <Sound>`, k.loc);
    }
    // mark="name" is the phrase and occurrence the line's <Mark> wraps
    for (const action of [...animations, ...sounds] as Action[]) {
      const at = action.at as {line?: string; mark?: string; word?: string; nth?: number};
      if (at.mark === undefined) continue;
      const found = this.marks.get(`${id}/${at.line}`)?.get(at.mark);
      if (!found) {
        const known = [...(this.marks.get(`${id}/${at.line}`)?.keys() ?? [])];
        this.fail(`line "${at.line}" has no <Mark id="${at.mark}">${known.length ? ` (it has: ${known.join(', ')})` : ': wrap the phrase in the line with <Mark id="…">'}`, actionLocs.get(action)!);
      }
      delete at.mark;
      at.word = found.word;
      if (found.nth > 1) at.nth = found.nth;
    }
    return {id, ...(a.title !== undefined && {title: a.title as string}), lines, ...(a.duration !== undefined && {duration: a.duration as number}), parts, animations, ...(sounds.length && {sounds})};
  }

  line(el: El, scene: string): Line {
    const a = this.attrs(el, LINE_ATTRS);
    if (typeof a.id !== 'string') this.fail('<Line> needs id="…"', el.loc);
    this.numbers(el, a, ['hold']);
    this.locs.set(`/scenes/${scene}/lines/${a.id}`, el.loc);
    this.spans.set(`/scenes/${scene}/lines/${a.id}`, el);
    let spoken = '';
    const marked: Array<{id: string; from: number; to: number; loc: Loc}> = [];
    for (const k of el.kids) {
      if (!('tag' in k)) {
        spoken += k.text;
        continue;
      }
      if (k.tag !== 'Mark') this.fail(`<${k.tag}> cannot be inside <Line>: a line holds the words spoken, and what happens on them is written in <Animation>; only <Mark id="…"> may wrap a phrase to hang an action on`, k.loc);
      const m = this.attrs(k, ['id']);
      if (typeof m.id !== 'string') this.fail('<Mark> needs id="…": the name an action uses (mark="…")', k.loc);
      if (marked.some((x) => x.id === m.id)) this.fail(`<Mark id="${m.id}"> twice in line "${a.id}"`, k.loc);
      let inner = '';
      for (const j of k.kids) {
        if ('tag' in j) this.fail('<Mark> holds the words only', j.loc);
        inner += j.text;
      }
      marked.push({id: m.id, from: spoken.length, to: spoken.length + inner.length, loc: k.loc});
      spoken += inner;
    }
    const squash = (s: string) => s.replace(/\s+/g, ' ');
    const say = squash(spoken).trim();
    if (!say) this.fail(`<Line id="${a.id}"> holds no words: write what is spoken inside the tag`, el.loc);
    // a mark is the phrase it wraps and which occurrence of it that is: the same word and nth an author could have written
    const byId = new Map<string, {word: string; nth: number}>();
    for (const m of marked) {
      const word = squash(spoken.slice(m.from, m.to)).trim();
      const from = squash(spoken.slice(0, m.from + spoken.slice(m.from, m.to).search(/\S|$/))).trimStart().length;
      if (!normalizeWord(word)) this.fail(`<Mark id="${m.id}"> holds no words: wrap the words an action hangs on`, m.loc);
      const nth = occurrenceAt(say, word, from);
      if (nth === undefined) this.fail(`<Mark id="${m.id}"> must wrap whole words: "${word}" starts or ends inside a word`, m.loc);
      byId.set(m.id, {word, nth});
    }
    this.marks.set(`${scene}/${a.id}`, byId);
    const text = (a.text as string | undefined) ?? say;
    return {id: a.id, text, ...(text !== say && {say}), ...(a.hold !== undefined && {hold: a.hold as number})};
  }

  /** Where a motion or a sound starts: one of a word of a line (`line`, with `word` or `mark`, `nth`), `after` another action (motions only), or `at` seconds into the scene, "start" or "end" */
  anchor(el: El, a: Obj, allowAfter: boolean): ActionAnchor {
    const anchors = (['line', ...(allowAfter ? ['after'] : []), 'at'] as const).filter((k) => a[k] !== undefined);
    if (anchors.length !== 1) this.fail(`<${el.tag}> needs exactly one of line (with word), ${allowAfter ? 'after, ' : ''}or at: when does it start?`, el.loc);
    if (a.word !== undefined && a.line === undefined) this.fail('word needs line="…": the line whose words it names', el.loc);
    if ((a.nth !== undefined) && a.word === undefined) this.fail('nth needs word="…"', el.loc);
    if (a.mark !== undefined && a.line === undefined) this.fail('mark needs line="…": the line that holds the <Mark>', el.loc);
    if (a.mark !== undefined && (a.word !== undefined || a.nth !== undefined)) this.fail('mark names the phrase: it replaces word and nth', el.loc);
    let at: ActionAnchor;
    if (a.after !== undefined) at = {after: a.after as string, ...(a.edge !== undefined && {edge: a.edge as 'start' | 'end'}), ...(a.offset !== undefined && {offset: a.offset as number})};
    else if (a.line !== undefined) at = {line: a.line as string, ...(a.mark !== undefined && {mark: a.mark}), ...(a.word !== undefined && {word: a.word as string}), ...(a.nth !== undefined && {nth: a.nth as number}), ...(a.edge !== undefined && {edge: a.edge as 'start' | 'end'}), ...(a.offset !== undefined && {offset: a.offset as number})};
    else if (typeof a.at === 'number') at = {at: a.at + ((a.offset as number | undefined) ?? 0)};
    else if (a.at === 'start' || a.at === 'end') at = {scene: a.at, ...(a.offset !== undefined && {offset: a.offset as number})};
    else this.fail('at is seconds from the start of the scene, "start" or "end"', el.loc);
    return at;
  }

  /** Where an action or a sound ends: "start" or "end" of the scene, seconds into it, or an anchor object: {line, word?, nth?, edge?, offset?}, {scene, offset?} or {at} */
  until(el: El, v: unknown): Anchor | undefined {
    if (v === undefined) return undefined;
    if (v === 'start' || v === 'end') return {scene: v};
    if (typeof v === 'number') return {at: v};
    const o = v as Record<string, unknown>;
    const keys = (allowed: string[]) => o && typeof o === 'object' && !Array.isArray(o) && Object.keys(o).every((k) => allowed.includes(k));
    const offset = o?.offset === undefined || typeof o.offset === 'number';
    if (keys(['line', 'word', 'nth', 'edge', 'offset']) && typeof o.line === 'string' && (o.word === undefined || typeof o.word === 'string') && (o.nth === undefined || typeof o.nth === 'number') && (o.edge === undefined || o.edge === 'start' || o.edge === 'end') && offset) return o as Anchor;
    if (keys(['scene', 'offset']) && (o.scene === 'start' || o.scene === 'end') && offset) return o as Anchor;
    if (keys(['at']) && typeof o.at === 'number') return o as Anchor;
    this.fail('until is "end", "start", seconds into the scene, or {{line: "id", word: "…", nth?, edge?, offset?}} or {{scene: "end", offset: 1.5}}', el.loc);
  }

  sound(el: El): Sound {
    const a: Obj = this.attrs(el, SOUND_ATTRS);
    this.elements(el);
    this.numbers(el, a, ['dur', 'volume', 'fadeIn', 'fadeOut', 'duck', 'offset', 'nth', ...(typeof a.at === 'string' ? [] : ['at'])]);
    if (typeof a.asset !== 'string') this.fail('<Sound> needs asset="id": an <Asset kind="audio"> of the document', el.loc);
    if (a.loop !== undefined && typeof a.loop !== 'boolean') this.fail('loop is true or false: <Sound loop …/>', el.loc);
    const at = this.anchor(el, a, false);
    const until = this.until(el, a.until);
    return {
      ...(a.id !== undefined && {id: a.id as string}), asset: a.asset, at: at as Anchor,
      ...(a.dur !== undefined && {dur: a.dur as number}), ...(until && {until}), ...(a.volume !== undefined && {volume: a.volume as number}), ...(a.loop !== undefined && {loop: a.loop}),
      ...(a.fadeIn !== undefined && {fadeIn: a.fadeIn as number}), ...(a.fadeOut !== undefined && {fadeOut: a.fadeOut as number}), ...(a.duck !== undefined && {duck: a.duck as number}),
    };
  }

  action(el: El): Action {
    const motion = own(MOTIONS, el.tag)!;
    const takesProps = motion === 'set' || motion === 'tween';
    const a = this.attrs(el, ACTION_ATTRS);
    if (a.to !== undefined && !takesProps) this.fail(`<${el.tag}> does not take to; use <Tween> or <Set> to change values`, el.loc);
    if (takesProps && (a.to === null || typeof a.to !== 'object' || Array.isArray(a.to))) this.fail(`<${el.tag}> needs to={{name: value}}`, el.loc);
    const to = a.to as Record<string, unknown> | undefined;
    if (to) for (const [name, value] of Object.entries(to)) {
      if (!(motion === 'tween' ? tweenable(value) && (typeof value !== 'number' || Number.isFinite(value)) : typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value)))) this.fail(`${name} of <${el.tag}>.to is ${motion === 'tween' ? 'a number, a colour or a length such as "12px"' : 'a number, a string or true/false'}`, el.loc);
    }
    this.elements(el);
    this.numbers(el, a, ['dur', 'stagger', 'offset', 'nth', 'repeat', ...(typeof a.at === 'string' ? [] : ['at'])]);
    if (a.target === undefined || !(typeof a.target === 'string' || (Array.isArray(a.target) && a.target.every((x) => typeof x === 'string')))) this.fail(`<${el.tag}> needs target="id" (a part, or an element a part registers), or target={["id", "id"]}`, el.loc);
    const at = this.anchor(el, a, true);
    const until = this.until(el, a.until);
    return {
      ...(a.id !== undefined && {id: a.id as string}), motion, target: a.target as string | string[], at,
      ...(a.dur !== undefined && {dur: a.dur as number}), ...(until && {until}), ...(a.stagger !== undefined && {stagger: a.stagger as number}), ...(a.easing !== undefined && {easing: a.easing as Action['easing']}),
      ...(a.repeat !== undefined && {repeat: a.repeat as number}), ...(a.yoyo !== undefined && {yoyo: a.yoyo as boolean}),
      ...(takesProps && to && {to: to as Action['to']}),
    };
  }
}

export interface Parsed {
  doc: VisoDoc;
  locs: Map<string, Loc>;
  /** Where each scene, line, part and animation is written, by the same paths as `locs` */
  spans: Map<string, El>;
  /** The module's own code before `export default`: imports, helpers, data. Parts can use it, the engine does not read it. */
  prelude: string;
}

export function parseMarkup(src: string): Parsed {
  const parser = new Parser(src);
  const root = parser.document();
  const c = new Compiler(root);
  const doc = c.compile();
  return {doc, locs: c.locs, spans: c.spans, prelude: parser.prelude};
}

/** The source position of the nearest part of the document an issue's path points into */
export function locate(locs: Map<string, Loc>, path: string): Loc | undefined {
  for (let p = path; p; p = p.slice(0, Math.max(0, p.lastIndexOf('/')))) {
    const l = locs.get(p);
    if (l) return l;
  }
  return undefined;
}

/**
 * The words a document's parts draw with `useText(id, base)`, found in its source without running it: the ids and the `base` each was written with, in the
 * order they first appear. Only calls whose id and base are plain string literals count; a person edits those, in `<Doc texts>`, and a call that builds
 * its words is the author's own business.
 */
export function textsOf(source: string): Array<{id: string; base: string}> {
  const found = new Map<string, string>();
  const call = /\buseText\(\s*(?:'([^'\\\n]*)'|"([^"\\\n]*)")\s*,\s*(?:'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`([^`$\\]*)`)\s*\)/g;
  for (const m of source.matchAll(call)) {
    const id = m[1] ?? m[2];
    const raw = m[3] ?? m[4] ?? m[5];
    if (!found.has(id)) found.set(id, raw.replace(/\\(.)/g, (_, c: string) => (c === 'n' ? '\n' : c)));
  }
  return [...found].map(([id, base]) => ({id, base}));
}
