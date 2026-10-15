/**
 * Credits from document data: media assets whose license names an attribution (with their source and license) and
 * `meta.sources`. Used by the `credits` object, the auto-appended credits scene and the exporters' credits.md.
 */
import type {CreditsObject, ObjectDef, Scene, VisoDoc} from './spec.ts';
import {sceneObjectIds} from './patterns.ts';

export interface CreditEntry {
  asset: string;
  attribution: string;
  license: string;
  licenseUrl?: string;
  source?: string;
}

export function creditsOf(doc: VisoDoc): {media: CreditEntry[]; sources: NonNullable<VisoDoc['meta']['sources']>} {
  const media = (doc.assets ?? [])
    .filter((a) => a.license.attribution)
    .map((a) => ({asset: a.id, attribution: a.license.attribution!, license: a.license.id, licenseUrl: a.license.url, source: a.source}));
  return {media, sources: doc.meta.sources ?? []};
}

/** A license obliges attribution and the document does not place a `credits` object */
export function needsCreditsScene(doc: VisoDoc): boolean {
  if ((doc.exports?.credits ?? 'auto') !== 'auto') return false;
  if (!(doc.assets ?? []).some((a) => a.license.obligations.includes('attribution'))) return false;
  const placed = new Set(doc.scenes.flatMap(sceneObjectIds));
  return !Object.entries(doc.objects).some(([id, o]) => o.type === 'credits' && placed.has(id));
}

export const AUTO_CREDITS_SCENE = 'auto-credits';

/** The document as rendered: with the auto credits scene appended when `needsCreditsScene` */
export function withCredits(doc: VisoDoc): VisoDoc {
  if (!needsCreditsScene(doc)) return doc;
  const objects: Record<string, ObjectDef> = {
    ...doc.objects,
    'auto-credits-title': {type: 'text', text: doc.meta.title, style: 'title'},
    'auto-credits': {type: 'credits'} satisfies CreditsObject,
  };
  const scene: Scene = {
    id: AUTO_CREDITS_SCENE,
    pattern: {kind: 'board', slots: {title: 'auto-credits-title', wide: 'auto-credits'}, options: {band: false, note: false}},
    beats: [{id: 'credits', duration: 5}],
  };
  return {...doc, objects, scenes: [...doc.scenes, scene]};
}

/** credits.md written next to exports */
export function creditsMarkdown(doc: VisoDoc): string {
  const {media, sources} = creditsOf(doc);
  const out = [`# ${doc.meta.title}`, ''];
  if (media.length) {
    out.push('## Media', '');
    for (const m of media) out.push(`- ${m.attribution} · ${m.licenseUrl ? `[${m.license}](${m.licenseUrl})` : m.license}${m.source ? ` · ${m.source}` : ''}`);
    out.push('');
  }
  if (sources.length) {
    out.push('## Sources', '');
    for (const s of sources) out.push(`- ${s.title ? `${s.title}: ` : ''}${s.url}`);
    out.push('');
  }
  return out.join('\n');
}
