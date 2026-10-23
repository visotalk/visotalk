/**
 * Languages of a document. A document is written in one language; `doc.<lang>.json` beside it is an `Overlay`, holding what another
 * language changes. `checkOverlay` holds it to the document it names, and `localize` makes the document in that language, a plain document every
 * tool after it reads as any other. The solver then times the new words: an action on a word follows that word in every language.
 */
import type {Anchor, Overlay, VisoDoc} from './spec.ts';
import {ID_PATTERN, type Issue} from './validate.ts';

/** The id of a document in a language: the work folder, the narration and a bundle are its own (`photon-one` in `en`: `photon-one-en`) */
export const localizedId = (id: string, lang: string) => `${id}-${lang.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

/** Every word anchor of the document: the line it names and the phrase, where it is used */
function wordAnchors(doc: VisoDoc): Array<{line: string; word: string; at: string}> {
  const out: Array<{line: string; word: string; at: string}> = [];
  const visit = (a: unknown, at: string) => {
    const x = a as {line?: string; word?: string};
    if (x && typeof x.line === 'string' && typeof x.word === 'string') out.push({line: x.line, word: x.word, at});
  };
  for (const sc of doc.scenes) {
    sc.animations.forEach((a, i) => { visit(a.at, `/scenes/${sc.id}/animations/${i}/at`); visit(a.until, `/scenes/${sc.id}/animations/${i}/until`); });
    (sc.sounds ?? []).forEach((s, i) => { visit(s.at, `/scenes/${sc.id}/sounds/${i}/at`); visit(s.until, `/scenes/${sc.id}/sounds/${i}/until`); });
  }
  return out;
}

/** What is wrong with an overlay for this document: a line it lacks or does not have, an anchor phrase it does not translate, an id that names nothing */
export function checkOverlay(doc: VisoDoc, o: Overlay): Issue[] {
  const issues: Issue[] = [];
  const add = (code: string, at: string, message: string, fix?: string) => issues.push({code, at, message, ...(fix ? {fix} : {})});
  if (typeof o?.lang !== 'string' || !o.lang) return [{code: 'overlay.lang', at: '/lang', message: 'an overlay names its language: "lang": "en"'}];
  if (o.lang.toLowerCase() === doc.meta.lang.toLowerCase()) add('overlay.lang', '/lang', `the overlay is in "${o.lang}", the document's own language`);
  const lines = new Map(doc.scenes.flatMap((sc) => sc.lines.map((l) => [l.id, l] as const)));
  const given = o.lines ?? {};
  for (const id of lines.keys()) {
    const l = given[id];
    if (!l) add('overlay.line.missing', `/lines/${id}`, `line "${id}" has no words in "${o.lang}"`, `add "${id}": {"text": "…"}`);
    else if (typeof l.text !== 'string' || !l.text.trim()) add('overlay.line.text', `/lines/${id}/text`, `line "${id}" needs its caption, "text"`);
  }
  for (const id of Object.keys(given)) if (!lines.has(id)) add('overlay.line.unknown', `/lines/${id}`, `the document has no line "${id}"`);
  const used = new Map<string, Set<string>>();
  for (const a of wordAnchors(doc)) {
    if (!used.has(a.line)) used.set(a.line, new Set());
    used.get(a.line)!.add(a.word);
    if (o.anchors?.[a.line]?.[a.word] === undefined) add('overlay.anchor.missing', `/anchors/${a.line}`, `"${a.word}" in line "${a.line}" (${a.at}) has no phrase in "${o.lang}"`, `add "${a.word}": "<the same words in ${o.lang}>" under "${a.line}"`);
  }
  for (const [line, map] of Object.entries(o.anchors ?? {}))
    for (const word of Object.keys(map)) if (!used.get(line)?.has(word)) add('overlay.anchor.unknown', `/anchors/${line}`, `nothing in the document is anchored on "${word}" in line "${line}"`);
  for (const id of Object.keys(o.texts ?? {})) if (!ID_PATTERN.test(id)) add('id.format', `/texts/${id}`, `text id "${id}" is lowercase letters, digits, - and _, starting with a letter`);
  const assets = new Set((doc.assets ?? []).map((a) => a.id));
  for (const id of Object.keys(o.assets ?? {})) if (!assets.has(id)) add('overlay.asset.unknown', `/assets/${id}`, `the document has no asset "${id}"`);
  return issues;
}

/** The document in the overlay's language. Call `checkOverlay` first: an anchor the overlay does not translate is left as the source phrase */
export function localize(doc: VisoDoc, o: Overlay): VisoDoc {
  const d = structuredClone(doc);
  d.meta = {...d.meta, ...o.meta, id: localizedId(doc.meta.id, o.lang), lang: o.lang};
  if (o.voice) d.voice = {...(d.voice ?? {voice: ''}), ...o.voice} as VisoDoc['voice'];
  if (o.fonts) d.theme = {id: d.theme?.id ?? 'visotalk/dark', ...d.theme, tokens: {...d.theme?.tokens, fonts: {...d.theme?.tokens?.fonts, ...o.fonts} as never}};
  if (o.captions) d.exports = {...d.exports, captions: o.captions};
  if (o.texts) d.texts = {...d.texts, ...o.texts};
  for (const a of d.assets ?? []) if (o.assets?.[a.id]) Object.assign(a, o.assets[a.id]);
  for (const sc of d.scenes) {
    sc.lines = sc.lines.map((l) => {
      const t = o.lines[l.id];
      if (!t) return l;
      const {say: _say, words: _words, ...rest} = l;
      return {...rest, text: t.text, ...(t.say !== undefined && {say: t.say}), ...(t.hold !== undefined && {hold: t.hold})};
    });
    const move = (at: Anchor | undefined) => {
      if (!at) return;
      const x = at as {line?: string; word?: string; nth?: number};
      if (typeof x.line !== 'string' || typeof x.word !== 'string') return;
      const to = o.anchors?.[x.line]?.[x.word];
      if (to === undefined) return;
      if (typeof to === 'string') { x.word = to; delete x.nth; } else { x.word = to.word; if (to.nth === undefined) delete x.nth; else x.nth = to.nth; }
    };
    for (const a of sc.animations) { move(a.at as Anchor); move(a.until); }
    for (const s of sc.sounds ?? []) { move(s.at); move(s.until); }
  }
  return d;
}
