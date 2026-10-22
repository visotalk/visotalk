/**
 * The CJK fonts a document can name, and how a build embeds them. A document picks a face by naming its family in the theme's font stacks
 * (`tokens={{fonts: {sans: '"Noto Serif SC", sans-serif', mono: …}}}`); a Chinese, Japanese or Korean document that names none gets the sans
 * face of its language, so the page never depends on which fonts the machine has. `visotalk doctor --fix` downloads the files (pinned by size
 * and SHA-256, all under the SIL Open Font License) into ~/.visotalk/fonts, and `build` cuts each one down to the characters the document
 * holds, as a WOFF2 beside the player: a few tens of kilobytes instead of the whole face. Han glyphs differ by language, so Japanese and
 * Korean have their own sans.
 */
import {spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, statSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {themeTokens, type VisoDoc} from '@visotalk/ir';

export interface CjkFont {
  /** the name in the stack: `"Noto Serif SC"` */
  family: string;
  /** the language it is the default sans of, if it is */
  defaultFor?: 'zh' | 'ja' | 'ko';
  file: string;
  url: string;
  bytes: number;
  sha256: string;
  /** the weights the file holds: a variable face is a range, a single weight one number (bold is then synthesised) */
  weight: string;
}

const NOTO = 'https://raw.githubusercontent.com/notofonts/noto-cjk';
export const CJK_FONTS: CjkFont[] = [
  {family: 'Noto Sans SC', defaultFor: 'zh', file: 'NotoSansSC-VF.ttf', url: `${NOTO}/Sans2.004/Sans/Variable/TTF/Subset/NotoSansSC-VF.ttf`, bytes: 17773132, sha256: 'd68bafcb48a2707749396aa12bbbd833cb70401f3a9a689fd2902c7e0d295964', weight: '100 900'},
  {family: 'Noto Sans JP', defaultFor: 'ja', file: 'NotoSansJP-VF.ttf', url: `${NOTO}/Sans2.004/Sans/Variable/TTF/Subset/NotoSansJP-VF.ttf`, bytes: 9590732, sha256: 'f4b373b226668ee33a6e54b02823dcd2d1209f17159f777421ae8c2275160369', weight: '100 900'},
  {family: 'Noto Sans KR', defaultFor: 'ko', file: 'NotoSansKR-VF.ttf', url: `${NOTO}/Sans2.004/Sans/Variable/TTF/Subset/NotoSansKR-VF.ttf`, bytes: 10415420, sha256: '9e1d729e7e2b36f9ef439da102f8c134c10aabe46f1c843bf0aca5c043b86f76', weight: '100 900'},
  {family: 'Noto Serif SC', file: 'NotoSerifSC-VF.ttf', url: `${NOTO}/Serif2.003/Serif/Variable/TTF/Subset/NotoSerifSC-VF.ttf`, bytes: 25125232, sha256: '5326cfb097e3ab26fcb39329752b5c0a439bf8d5c4649520e4b492939c352a09', weight: '200 900'},
  {family: 'LXGW WenKai', file: 'LXGWWenKai-Regular.ttf', url: 'https://github.com/lxgw/LxgwWenKai/releases/download/v1.530/LXGWWenKai-Regular.ttf', bytes: 25928940, sha256: '2d73eea94ad808999d90c0000c239a84a33b09d4bc6ab6c5b8bbf1eda8a7fc8b', weight: '400'},
];

export const fontFile = (dir: string, f: CjkFont) => join(dir, f.file);
export const isInstalled = (dir: string, f: CjkFont) => existsSync(fontFile(dir, f)) && statSync(fontFile(dir, f)).size === f.bytes;

const mentions = (stack: string, family: string) => stack.includes(`"${family}"`) || stack.includes(`'${family}'`);
const slug = (family: string) => family.toLowerCase().replace(/[^a-z0-9]+/g, '-');

/** The stack with `family` before its generic fallback: `"Inter", sans-serif` → `"Inter", "Noto Sans SC", sans-serif` */
const withFamily = (stack: string, family: string) => stack.replace(/^(.*?)(?:,?\s*(sans-serif|serif|monospace))?\s*$/, (_, names: string, generic?: string) => [names, `"${family}"`, generic].filter(Boolean).join(', '));

const languageOf = (lang: string): 'zh' | 'ja' | 'ko' | undefined => (/^(zh|zho|chi|cmn)([-_]|$)/i.test(lang) ? 'zh' : /^(ja|jpn)([-_]|$)/i.test(lang) ? 'ja' : /^(ko|kor)([-_]|$)/i.test(lang) ? 'ko' : undefined);

/** The fonts a document uses, and the sans stack to draw with: the families it names, else the default sans of its language, else nothing (the stack is left as it is) */
export function fontPlan(doc: Pick<VisoDoc, 'theme' | 'meta'>): {fonts: CjkFont[]; sans: string} {
  const {sans, mono} = themeTokens(doc.theme).fonts;
  const named = CJK_FONTS.filter((f) => mentions(sans, f.family) || mentions(mono, f.family));
  if (named.length) return {fonts: named, sans};
  const language = languageOf(doc.meta.lang);
  const fallback = language && CJK_FONTS.find((f) => f.defaultFor === language);
  return fallback ? {fonts: [fallback], sans: withFamily(sans, fallback.family)} : {fonts: [], sans};
}

/**
 * Cut each font down to `text` (and the Latin, punctuation and full-width blocks, so words typed in the web editor later still draw) with fontTools, and write
 * `fonts/<family>.woff2` and the `@font-face` rules to `out`. Returns the file name of the rules.
 */
export function writeFontFaces(fonts: CjkFont[], fontsDir: string, python: string, text: string, out: string): string {
  mkdirSync(join(out, 'fonts'), {recursive: true});
  const chars = new Set([...text.replace(/[\u0000-\u001f]/g, '')]);
  for (let c = 0x20; c < 0x7f; c++) chars.add(String.fromCharCode(c));
  for (const [from, to] of [[0x2000, 0x206f], [0x3000, 0x303f], [0xff00, 0xffef]]) for (let c = from; c <= to; c++) chars.add(String.fromCodePoint(c));
  const textFile = join(out, 'fonts', 'text.txt');
  writeFileSync(textFile, [...chars].join(''));
  const rules = fonts.map((f) => {
    if (!isInstalled(fontsDir, f)) throw new Error(`the font "${f.family}" is not installed in ${fontsDir}: run visotalk doctor --fix`);
    const name = `${slug(f.family)}.woff2`;
    const cut = spawnSync(python, ['-m', 'fontTools.subset', fontFile(fontsDir, f), `--text-file=${textFile}`, '--flavor=woff2', '--layout-features=*', `--output-file=${join(out, 'fonts', name)}`], {encoding: 'utf8'});
    if (cut.status !== 0) throw new Error(`could not cut "${f.family}" down to the document's characters (${python} -m fontTools.subset; doctor --fix installs fonttools and brotli): ${cut.stderr.trim().split('\n').slice(-2).join(' ')}`);
    return `@font-face {font-family: "${f.family}"; src: url(./fonts/${name}) format("woff2"); font-weight: ${f.weight}; font-style: normal;}`;
  });
  writeFileSync(join(out, 'fonts.css'), `${rules.join('\n')}\n`);
  return 'fonts.css';
}
