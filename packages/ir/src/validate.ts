/**
 * IR 0.2 validator (semantic rules; structural checks are the JSON Schema's job).
 * Pure: runs in Node (CLI, agent tool) and in the browser (Studio).
 */
import {DEFAULT_THEME, THEMES, styleKnown} from './themes.ts';
import {SPEC_VERSION, type Action, type ActionAnchor, type Beat, type ObjectDef, type Path, type VisoDoc} from './spec.ts';
import {identifiers, isExpr, ExprError} from './expr.ts';
import {sayOf} from './normalize.ts';
import {parseSay} from './marks.ts';
import {ENTRANCES, MOTION_DUR} from './timeline.ts';
import vocabulary from './vocabulary.json' with {type: 'json'};
import {ICONS} from './icons.ts';

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
  'id.duplicate': 'give every object, scene, beat and line its own id',
  'ref.path': 'declare the object in `objects` first; a part is `object#part` (`visotalk schema <type>` lists parts)',
  'shape.icon': 'an icon is a name from the built-in set: `visotalk schema icons` lists them; a drawing of your own is `shape="svg"` with `svg="<svg viewBox=…>…</svg>"`',
  'ref.beat': 'a beat reference is `scene/beat`, both ids from this document',
  'ref.asset': 'declare the asset in `assets` with its `license`, or fix the id',
  'ref.param': 'declare the param in `params`, or fix the name',
  'ref.component': 'register the component in `components`, or fix the id',
  'anchor.line': 'anchor a line of the same beat: its id is in `beat.lines`',
  'anchor.word': 'write the phrase as it is in `say` (case aside, punctuation included), or name the words with a mark: `say` `{#name}…{/name}` and anchor `{"line", "mark": "name"}`',
  'anchor.mark': 'define it in that line\'s `say`: `{#name}…{/name}` or `{@name}`',
  'anchor.both': 'keep `word` or `mark`, not both',
  'action.during': '`during` needs `at: {line, mark}` naming a `{#name}…{/name}` range and an entrance motion (appear, stamp, wipe, typewriter, drawIn, crossfade)',
  'mark.syntax': 'put marks between words, close every `{#name}` with `{/name}`, and define a name once per line',
  'mark.i18n': 'copy the marks of the line\'s `say` into the translation\'s `say`',
  'action.id': 'give every action that has an `id` a document-wide unique one: `at.after` names it',
  'anchor.action': 'name the `id` of an action in the document: `{"after": "id"}`',
  'anchor.cycle': 'anchor one action of the cycle on a word, a mark or a beat',
  'anchor.after-open': 'give the referenced kenBurns a `dur`, or anchor on a word, a mark or a beat',
  'anchor.after-negative': 'raise `offset` so the action does not start before the action it hangs on',
  'motion.tween': 'a tween needs numbers: params.props is {name: number}; in markup <Tween on="id" name={0.5}/>',
  'pattern.kind': 'a pattern is `{kind, slots, options}` with `kind` one of the names `visotalk schema patterns` lists; in markup `pattern="dag"` is a string, never an object',
  'pattern.slot': 'use a slot name of the pattern (`visotalk schema patterns` lists them); an object in an unknown slot is not drawn',
  'beat.duration': 'a beat without lines needs `duration` (seconds)',
  'motion.morph': 'morph needs targets of one object type',
  'expr.parse': 'expressions use numbers, params, `+ - * / %`, comparisons, `? :` and the listed functions',
};

const ID = /^[a-z][a-z0-9_-]*$/;

export interface ParsedPath {
  object: string;
  part?: string;
  field?: string;
}

export const parsePath = (p: Path): ParsedPath => {
  const [object, rest] = p.split('#');
  if (!rest) return {object};
  const [part, field] = rest.split('.');
  return {object, part, field};
};

/** Does `path` name something that exists? */
export function resolvePath(doc: VisoDoc, p: Path): string | null {
  const {object, part, field} = parsePath(p);
  const o = doc.objects[object];
  if (!o) return `unknown object "${object}"`;
  if (!part) return null;
  if (o.type === 'graph') {
    const node = o.nodes.find((n) => n.id === part);
    const edge = o.edges.find((e) => e.id === part);
    if (!node && !edge) return `graph "${object}" has no node or edge "${part}"`;
    if (field && !(node?.fields ?? []).some((f) => f.id === field)) return `node "${part}" has no field "${field}"`;
    return null;
  }
  if (o.type === 'steps' || o.type === 'timeline') return o.items.some((i) => i.id === part) ? null : `no item "${part}"`;
  if (o.type === 'terminal') return o.steps.some((s) => s.id === part) ? null : `no step "${part}"`;
  if (o.type === 'card') return (o.fields ?? []).some((f) => f.id === part) ? null : `no field "${part}"`;
  return `object type "${o.type}" has no addressable parts`;
}

export function validate(doc: VisoDoc): Issue[] {
  const issues: Issue[] = [];
  const add = (code: string, at: string, message: string, fix: string | undefined = FIXES[code]) => issues.push({code, at, message, ...(fix ? {fix} : {})});
  const params = new Set(Object.keys(doc.params ?? {}));

  const minor = SPEC_VERSION.split('.').slice(0, 2).join('.');
  if (!doc.spec.startsWith(`${minor}.`)) add('spec.version', '/spec', `spec ${doc.spec} is not ${minor}.x`);

  // ids
  for (const id of Object.keys(doc.objects)) if (!ID.test(id)) add('id.format', `/objects/${id}`, 'bad id');
  const seen = new Map<string, string>();
  const uniq = (kind: string, id: string, at: string) => {
    const k = `${kind}:${id}`;
    if (seen.has(k)) add('id.duplicate', at, `${kind} id "${id}" also at ${seen.get(k)}`);
    else seen.set(k, at);
  };

  // expressions inside objects
  const checkExpr = (v: unknown, at: string, extra: string[] = []) => {
    if (!isExpr(v)) return;
    try {
      for (const name of identifiers(v.$expr)) {
        if (!params.has(name) && !extra.includes(name)) add('expr.unknown', at, `"${name}" is not a declared param`);
      }
    } catch (e) {
      add('expr.parse', at, (e as ExprError).message);
    }
  };
  const walkValues = (o: unknown, at: string) => {
    if (isExpr(o)) return checkExpr(o, at);
    if (Array.isArray(o)) o.forEach((x, i) => walkValues(x, `${at}/${i}`));
    else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) walkValues(v, `${at}/${k}`);
  };
  if (doc.theme && !THEMES[doc.theme.id]) add('theme.unknown', '/theme/id', `unknown theme "${doc.theme.id}" (built-in: ${Object.keys(THEMES).join(', ')})`);
  const themeId = doc.theme?.id;
  for (const [id, o] of Object.entries(doc.objects)) {
    walkValues(o, `/objects/${id}`);
    checkObjectRefs(doc, id, o, add);
    if (o.style && !styleKnown(themeId, o.type, o.style)) add('style.unknown', `/objects/${id}/style`, `${o.type} style "${o.style}" is not defined by theme "${themeId ?? DEFAULT_THEME}"`, `use one of: ${(THEMES[themeId ?? DEFAULT_THEME]?.styles[o.type] ?? []).join(', ') || 'none (this type has no styles)'}`);
    if (o.type === 'text') {
      (o.runs ?? []).forEach((r, k) => {
        if (r.style && !styleKnown(themeId, 'run', r.style)) add('style.unknown', `/objects/${id}/runs/${k}/style`, `run style "${r.style}" is not defined by theme "${themeId ?? DEFAULT_THEME}"`, `use one of: ${(THEMES[themeId ?? DEFAULT_THEME]?.styles.run ?? []).join(', ')}`);
      });
    }
  }

  const patternSlots = vocabulary.patterns as Record<string, {slots: string[]}>;
  /** kind and slot names of one pattern use; the kind a patch inherits is `inherited` */
  const checkPattern = (p: {kind?: unknown; slots?: Record<string, unknown>}, inherited: string | undefined, at: string): string | undefined => {
    let kind = inherited;
    if (p.kind !== undefined) {
      if (typeof p.kind !== 'string' || !patternSlots[p.kind]) {
        add('pattern.kind', `${at}/kind`, `unknown pattern kind ${JSON.stringify(p.kind)} (patterns: ${Object.keys(patternSlots).join(', ')})`);
        return undefined;
      }
      kind = p.kind;
    }
    if (kind) {
      for (const slot of Object.keys(p.slots ?? {})) {
        if (!patternSlots[kind].slots.includes(slot)) add('pattern.slot', `${at}/slots/${slot}`, `pattern "${kind}" has no slot "${slot}" (slots: ${patternSlots[kind].slots.join(', ')})`);
      }
    }
    return kind;
  };

  const lineIds = new Set<string>();
  for (const scene of doc.scenes) {
    uniq('scene', scene.id, `/scenes/${scene.id}`);
    for (const [slot, ref] of Object.entries(scene.pattern?.slots ?? {})) {
      for (const r of [ref].flat()) if (!doc.objects[r]) add('ref.object', `/scenes/${scene.id}/pattern/slots/${slot}`, `unknown object "${r}"`);
    }
    let hasPattern = !!scene.pattern;
    let kind = scene.pattern ? checkPattern(scene.pattern, undefined, `/scenes/${scene.id}/pattern`) : undefined;
    for (const beat of scene.beats) {
      const at = `/scenes/${scene.id}/beats/${beat.id}`;
      if (beat.pattern) {
        if (!beat.pattern.kind && !hasPattern) add('pattern.patch', `${at}/pattern`, 'a pattern patch (no `kind`) needs a pattern to patch: set one on the scene or an earlier beat');
        hasPattern = true;
        kind = checkPattern(beat.pattern, kind, `${at}/pattern`);
        for (const [slot, ref] of Object.entries(beat.pattern.slots ?? {})) {
          for (const r of [ref ?? []].flat()) if (!doc.objects[r]) add('ref.object', `${at}/pattern/slots/${slot}`, `unknown object "${r}"`);
        }
      }
      uniq(`beat:${scene.id}`, beat.id, at);
      if (!beat.lines?.length && beat.duration === undefined) add('beat.duration', at, 'silent beat needs a duration');
      for (const l of beat.lines ?? []) {
        if (lineIds.has(l.id)) add('id.duplicate', `${at}/lines/${l.id}`, `line id "${l.id}" is not unique`);
        lineIds.add(l.id);
        for (const m of (l.live ?? '').matchAll(/\{([^}]+)\}/g)) checkExpr({$expr: m[1]}, `${at}/lines/${l.id}/live`);
        const marks = parseSay(l.say ?? '');
        for (const e of marks.errors) add('mark.syntax', `${at}/lines/${l.id}/say`, e);
        // a translation carries the same marks, so anchors survive it
        const shape = (ms: Array<{name: string; kind: string}>) => ms.map((m) => `${m.name}:${m.kind}`).sort().join(', ');
        for (const [lang, v] of Object.entries(l.i18n ?? {})) {
          const t = parseSay(v.say ?? '');
          for (const e of t.errors) add('mark.syntax', `${at}/lines/${l.id}/i18n/${lang}/say`, e);
          if (shape(t.marks) !== shape(marks.marks)) add('mark.i18n', `${at}/lines/${l.id}/i18n/${lang}`, `the translation's \`say\` must carry the marks of the line (${shape(marks.marks) || 'none'}), not (${shape(t.marks) || 'none'})`);
        }
      }
      for (const p of Object.keys(beat.state ?? {})) {
        const err = resolvePath(doc, p);
        if (err) add('ref.path', `${at}/state/${p}`, err);
        walkValues(beat.state![p], `${at}/state/${p}`);
      }
      (beat.actions ?? []).forEach((a, i) => checkAction(doc, beat, a, `${at}/actions/${a.id ?? i}`, add));
      for (const it of beat.interactions ?? []) {
        const iat = `${at}/interactions/${it.id}`;
        const err = resolvePath(doc, it.on.target);
        if (err) add('ref.path', `${iat}/on/target`, err);
        for (const eff of it.do) {
          if ('setParam' in eff) {
            if (!params.has(eff.setParam)) add('ref.param', iat, `unknown param "${eff.setParam}"`);
            checkExpr(eff.value, `${iat}/do`, ['value']);
          }
          if ('goto' in eff && !beatExists(doc, eff.goto)) add('ref.beat', iat, `unknown beat "${eff.goto}"`);
          if ('set' in eff) {
            const e2 = resolvePath(doc, eff.set.target);
            if (e2) add('ref.path', iat, e2);
          }
        }
      }
    }
  }

  checkAfter(doc, add);

  for (const ov of doc.overrides ?? []) {
    const at = `/overrides/${ov.id}`;
    for (const k of ov.keys) {
      if ('beat' in k.at && !k.at.ref) add('override.anchor', at, 'beat anchors in overrides need `ref` (scene/beat)');
      if ('beat' in k.at && k.at.ref && !beatExists(doc, k.at.ref)) add('ref.beat', at, `unknown beat "${k.at.ref}"`);
      if ('line' in k.at && !doc.scenes.some((s) => s.beats.some((b) => b.lines?.some((l) => l.id === (k.at as {line: string}).line)))) {
        add('anchor.line', at, `unknown line "${k.at.line}"`);
      }
    }
    const err = resolvePath(doc, ov.target);
    if (err) add('ref.path', at, err);
    if (['x', 'y', 'width', 'height'].includes(ov.prop) && !ov.preset) add('override.preset', at, 'positional override needs a preset');
    if (ov.preset && !doc.canvas.presets.some((p) => p.id === ov.preset)) add('ref.preset', at, `unknown preset "${ov.preset}"`);
  }
  const keys = new Set<string>();
  for (const ov of doc.overrides ?? []) {
    const k = `${ov.target}|${ov.prop}|${ov.preset ?? ''}`;
    if (keys.has(k)) add('override.conflict', `/overrides/${ov.id}`, `second override for ${k}`);
    keys.add(k);
  }
  if (doc.flow) {
    if (!beatExists(doc, doc.flow.start)) add('ref.beat', '/flow/start', `unknown beat "${doc.flow.start}"`);
  }
  return issues;
}

const beatExists = (doc: VisoDoc, ref: string) => {
  const [s, b] = ref.split('/');
  return !!doc.scenes.find((x) => x.id === s)?.beats.some((x) => x.id === b);
};

function checkObjectRefs(doc: VisoDoc, id: string, o: ObjectDef, add: (c: string, at: string, m: string) => void) {
  const at = `/objects/${id}`;
  if ((o.type === 'image' || o.type === 'video') && !(doc.assets ?? []).some((a) => a.id === o.asset)) {
    add('ref.asset', at, `unknown asset "${o.asset}"`);
  }
  if (o.type === 'component' && !(doc.components ?? []).some((c) => c.id === o.component)) add('ref.component', at, `unknown component "${o.component}"`);
  if (o.type === 'chart' && !Array.isArray(o.data) && !(doc.assets ?? []).some((a) => a.id === (o.data as {asset: string}).asset && a.kind === 'data')) {
    add('ref.asset', at, `unknown data asset "${(o.data as {asset: string}).asset}"`);
  }
  if (o.type === 'shape' && o.shape === 'icon' && !(o.icon && ICONS[o.icon])) add('shape.icon', at, o.icon ? `unknown icon "${o.icon}"` : 'an icon shape needs `icon="name"`');
  if (o.type === 'shape' && o.shape === 'svg' && !/<svg[\s>]/.test(o.svg ?? '')) add('shape.icon', at, 'an svg shape needs `svg="<svg viewBox=…>…</svg>"`');
  if (o.type === 'connector') {
    for (const p of [o.from, o.to]) {
      const err = resolvePath(doc, p);
      if (err) add('ref.path', at, err);
    }
  }
  if (o.type === 'graph') {
    const nodes = new Set(o.nodes.map((n) => n.id));
    for (const e of o.edges) if (!nodes.has(e.from) || !nodes.has(e.to)) add('ref.node', `${at}/edges/${e.id}`, 'edge endpoint is not a node');
  }
}

function checkAnchor(doc: VisoDoc, beat: Beat, a: ActionAnchor, at: string, add: (c: string, at: string, m: string) => void) {
  if ('after' in a) return; // checked across the whole document by checkAfter
  if ('beat' in a) {
    if (a.ref && !beatExists(doc, a.ref)) add('ref.beat', at, `unknown beat "${a.ref}"`);
    return;
  }
  const line = beat.lines?.find((l) => l.id === a.line);
  if (!line) return add('anchor.line', at, `line "${a.line}" is not in beat "${beat.id}"`);
  if (a.mark !== undefined) {
    if (a.word !== undefined) add('anchor.both', at, 'an anchor takes `word` or `mark`, not both');
    if (!parseSay(line.say ?? '').marks.some((m) => m.name === a.mark)) add('anchor.mark', at, `mark "${a.mark}" is not defined in the \`say\` of line "${line.id}"`);
  }
  if (typeof a.word === 'string') {
    const say = sayOf(doc, line).toLowerCase();
    if (!say.includes(a.word.toLowerCase())) add('anchor.word', at, `"${a.word}" does not occur in the spoken text: "${sayOf(doc, line)}"`);
  }
}

function checkAction(doc: VisoDoc, beat: Beat, a: Action, at: string, add: (c: string, at: string, m: string) => void) {
  for (const t of [a.target].flat()) {
    const err = resolvePath(doc, t);
    if (err) add('ref.path', `${at}/target`, err);
  }
  checkAnchor(doc, beat, a.at, `${at}/at`, add);
  if (a.during) {
    const mark = 'mark' in a.at && a.at.mark !== undefined ? parseSay(beat.lines?.find((l) => l.id === (a.at as {line: string}).line)?.say ?? '').marks.find((m) => m.name === (a.at as {mark: string}).mark) : undefined;
    if (mark?.kind !== 'range') add('action.during', at, '`during` needs `at` to name a range mark ({#name}…{/name})');
    if (!ENTRANCES.has(a.motion)) add('action.during', at, `\`during\` needs an entrance motion, not "${a.motion}"`);
  }
  if (a.motion === 'tween') {
    const pr = a.params?.props as Record<string, unknown> | undefined;
    if (!pr || typeof pr !== 'object' || !Object.keys(pr).length || !Object.values(pr).every((v) => typeof v === 'number' && Number.isFinite(v))) add('motion.tween', at, 'a tween needs `params.props`: one or more props, each a number');
  }
  if (a.motion === 'morph') {
    const types = new Set([a.target].flat().map((t) => doc.objects[parsePath(t).object]?.type));
    if (types.size > 1) add('motion.morph', at, 'morph between different object types');
    for (const t of [a.target].flat()) {
      const pp = parsePath(t);
      const to = a.params?.to;
      if (doc.objects[pp.object]?.type === 'graph' && pp.part && !pp.field && !(Array.isArray(to) && to.length === 2 && to.every((x) => typeof x === 'number')))
        add('motion.morph', at, `morph on the graph node "${t}" needs \`params.to\`: [x, y], its new position across the graph's region (0 to 1)`);
    }
  }
}

/** `at.after`: action ids are unique, every reference names one, no chain returns to itself, no one hangs on an open-ended kenBurns */
function checkAfter(doc: VisoDoc, add: (c: string, at: string, m: string) => void) {
  const byId = new Map<string, Action>();
  const where = new Map<Action, string>();
  for (const scene of doc.scenes) {
    for (const beat of scene.beats) {
      (beat.actions ?? []).forEach((a, i) => {
        const at = `/scenes/${scene.id}/beats/${beat.id}/actions/${a.id ?? i}`;
        where.set(a, at);
        if (!a.id) return;
        if (byId.has(a.id)) add('action.id', at, `action id "${a.id}" is not unique`);
        else byId.set(a.id, a);
      });
    }
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
        if (a.at.edge !== 'start' && ref.motion === 'kenBurns' && ref.dur === undefined) add('anchor.after-open', `${at}/at`, `"${ref.id}" is a kenBurns without \`dur\`: its length depends on its exit`);
        const span = a.at.edge === 'start' ? 0 : ref.motion === 'set' || ref.motion === 'highlight' ? 0 : (ref.dur ?? MOTION_DUR[ref.motion]);
        if (Number.isFinite(span) && (a.at.offset ?? 0) < -span) add('anchor.after-negative', `${at}/at`, `\`offset\` ${a.at.offset} puts the action before the start of "${ref.id}"`);
        visit(ref, [...path, a.id ?? '?']);
      }
    }
    state.set(a, 'done');
  };
  for (const a of where.keys()) visit(a, []);
}
