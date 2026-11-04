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

/**
 * The Chinese stroke-order data a build may embed (packages/cli/src/strokes.ts): Make Me a Hanzi's medians as the pinned npm package ships them, derived
 * from Arphic's fonts and under their licence, whose text (`ARPHIC_FILE`) goes beside every player that holds the data.
 */
export const STROKES_SOURCE = {pkg: 'hanzi-writer-data', version: '2.0.1', from: 'Make Me a Hanzi', url: 'https://github.com/skishore/makemeahanzi',
  holder: '© 1999 Arphic Technology Co., Ltd.', licence: 'Arphic Public License'} as const;
export const ARPHIC_FILE = 'ARPHICPL.txt';
const strokesCredit = `- Chinese stroke order: ${STROKES_SOURCE.from} (${STROKES_SOURCE.pkg} ${STROKES_SOURCE.version}), from fonts ${STROKES_SOURCE.holder} · ${STROKES_SOURCE.licence} (${ARPHIC_FILE})`;

/**
 * credits.md written next to exports: one line per credit, so several assets cut from one recording are credited once. `strokes`: the player embeds
 * the stroke-order data (it has `ARPHIC_FILE`), which is credited under Data.
 */
export function creditsMarkdown(doc: VisoDoc, opts: {strokes?: boolean} = {}): string {
  const {media, sources} = creditsOf(doc);
  const out = [`# ${doc.meta.title}`, ''];
  if (media.length) {
    out.push('## Media', '');
    out.push(...new Set(media.map((m) => `- ${m.attribution} · ${m.licenseUrl ? `[${m.license}](${m.licenseUrl})` : m.license}${m.source ? ` · ${m.source}` : ''}`)));
    out.push('');
  }
  if (sources.length) {
    out.push('## Sources', '');
    for (const s of sources) out.push(`- ${s.title ? `${s.title}: ` : ''}${s.url}`);
    out.push('');
  }
  if (opts.strokes) out.push('## Data', '', strokesCredit, '');
  return out.join('\n');
}
