#!/usr/bin/env node
/**
 * Write packages/ir/src/vocabulary.json — what `visotalk schema` prints — or, with `--check`, prove the committed copy is current.
 *
 * Nothing in it is written by hand: the object types, their fields, types and comments come from the spec's TypeScript
 * (spec/ir/0.4/ir.ts), the styles from the default theme, the motions from the solver and the pattern slots and their notes
 * from the runtime's layout, so it cannot drift from the code. tests/unit/vocabulary.test.ts runs the same check in the gate.
 */
import {readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
import {HIDING, ENTRANCES, MOTION_DUR} from '../packages/ir/src/timeline.ts';
import {DEFAULT_THEME, THEMES} from '../packages/ir/src/themes.ts';
import {patternSlots} from '../packages/runtime/src/ir/patterns.ts';
import {SPEC_VERSION} from '../packages/ir/src/spec.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const OUT = join(ROOT, 'packages/ir/src/vocabulary.json');
const SPEC = join(ROOT, 'spec/ir/0.4/ir.ts');
const PATTERNS = join(ROOT, 'packages/runtime/src/ir/patterns.ts');

/** The spec types an agent writes by hand, besides the objects */
const TYPES = ['VisoDoc', 'Meta', 'Scene', 'Beat', 'Line', 'Action', 'Anchor', 'ObjectState', 'PatternUse', 'PatternPatch'];

const flat = (s) => s.replace(/\s+/g, ' ').trim();
const docOf = (symbol, checker) => flat(ts.displayPartsToString(symbol.getDocumentationComment(checker)));

export function buildVocabulary() {
  const program = ts.createProgram([SPEC, PATTERNS], {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, allowImportingTsExtensions: true, noEmit: true, skipLibCheck: true});
  const checker = program.getTypeChecker();
  const spec = program.getSourceFile(SPEC);
  const byName = new Map();
  for (const st of spec.statements) if (ts.isInterfaceDeclaration(st) || ts.isTypeAliasDeclaration(st)) byName.set(st.name.text, st);

  const fieldsOf = (decl) => checker.getPropertiesOfType(checker.getTypeAtLocation(decl)).map((p) => {
    const d = p.valueDeclaration;
    return {name: p.name, type: flat(d?.type?.getText(d.getSourceFile()) ?? ''), optional: !!(p.flags & ts.SymbolFlags.Optional), doc: docOf(p, checker)};
  });
  const describe = (name) => {
    const decl = byName.get(name);
    const doc = flat(ts.displayPartsToString(checker.getSymbolAtLocation(decl.name).getDocumentationComment(checker)));
    return ts.isInterfaceDeclaration(decl) ? {doc, fields: fieldsOf(decl)} : {doc, definition: flat(decl.type.getText(spec))};
  };

  // object types: the members of the ObjectDef union, by their `type` literal
  const objects = {};
  for (const member of byName.get('ObjectDef').type.types) {
    const name = member.typeName.text;
    const fields = fieldsOf(byName.get(name));
    const kind = fields.find((f) => f.name === 'type').type.replace(/'/g, '');
    objects[kind] = {interface: name, ...describe(name), styles: THEMES[DEFAULT_THEME].styles[kind] ?? []};
    objects[kind].fields = objects[kind].fields.filter((f) => f.name !== 'type');
  }

  const motions = Object.fromEntries(Object.entries(MOTION_DUR).map(([m, dur]) => [m, {dur: Number.isNaN(dur) ? 'until the target leaves' : dur, entrance: ENTRANCES.has(m), hidesUntilStart: HIDING.has(m)}]));

  // patterns: slot names by asking the layout, notes from the comment above each layout function
  const src = program.getSourceFile(PATTERNS);
  const patterns = {};
  const visit = (node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(src) === 'PATTERNS') {
      for (const prop of node.initializer.properties) {
        const kind = prop.name.getText(src);
        const comment = (ts.getLeadingCommentRanges(src.text, prop.pos) ?? []).map((r) => src.text.slice(r.pos, r.end)).filter((c) => c.startsWith('/**'))
          .map((c) => flat(c.replace(/^\/\*\*|\*\/$/g, '').replace(/^\s*\* ?/gm, ' '))).join(' ');
        patterns[kind] = {slots: patternSlots(kind), doc: comment};
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(src);

  return {
    spec: SPEC_VERSION,
    themes: Object.keys(THEMES), theme: DEFAULT_THEME,
    objects, types: Object.fromEntries(TYPES.map((t) => [t, describe(t)])), motions, patterns,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const text = JSON.stringify(buildVocabulary(), null, 1) + '\n';
  if (process.argv.includes('--check')) {
    if (readFileSync(OUT, 'utf8') !== text) {
      console.error('packages/ir/src/vocabulary.json is stale: run `pnpm vocabulary`');
      process.exit(1);
    }
    console.log('Vocabulary OK.');
  } else {
    writeFileSync(OUT, text);
    console.log(`wrote ${OUT}`);
  }
}
