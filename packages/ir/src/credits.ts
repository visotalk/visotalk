/**
 * Credits from document data: media assets whose license names an attribution (with their source and license) and
 * `meta.sources`, written to credits.md next to exports.
 */
import type {VisoDoc} from './spec.ts';

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
