/**
 * The fonts a document can name, and how a build embeds them: the CJK faces, Newsreader (a display serif for a Latin-script film that
 * wants the weight a system sans lacks), and the faces the built-in styles use. A document picks a face by naming its family in the theme's font stacks
 * (`tokens={{fonts: {sans: '"Noto Serif SC", sans-serif', mono: …}}}`); a Chinese, Japanese or Korean document that names none gets the sans
 * face of its language, so the page never depends on which fonts the machine has. `visotalk doctor --fix` downloads the files (pinned by size
 * and SHA-256, all under the SIL Open Font License) into ~/.visotalk/fonts, and `build` cuts each one down to the characters the document
 * holds, as a WOFF2 beside the player: a few tens of kilobytes instead of the whole face. Han glyphs differ by language, so Japanese and
 * Korean have their own sans.
 */
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync, mkdirSync, readFileSync, statSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {themeTokens, type VisoDoc} from '@visotalk/ir';

export interface Font {
  /** the name in the stack: `"Noto Serif SC"` */
  family: string;
  /** the language it is the default sans of, if it is */
  defaultFor?: 'zh' | 'ja' | 'ko';
  /** the italic of a family, embedded beside its upright whenever the family is named */
  style?: 'italic';
  file: string;
  url: string;
  bytes: number;
  sha256: string;
  /** the weights the file holds: a variable face is a range, a single weight one number (bold is then synthesised) */
  weight: string;
}

const NOTO = 'https://raw.githubusercontent.com/notofonts/noto-cjk';
const GOOGLE_FONTS = 'https://raw.githubusercontent.com/google/fonts/45e3d5269e4a17d823f6d84470bc084dc5ae46f6/ofl';
export const FONTS: Font[] = [
  {family: 'Noto Sans SC', defaultFor: 'zh', file: 'NotoSansSC-VF.ttf', url: `${NOTO}/Sans2.004/Sans/Variable/TTF/Subset/NotoSansSC-VF.ttf`, bytes: 17773132, sha256: 'd68bafcb48a2707749396aa12bbbd833cb70401f3a9a689fd2902c7e0d295964', weight: '100 900'},
  {family: 'Noto Sans JP', defaultFor: 'ja', file: 'NotoSansJP-VF.ttf', url: `${NOTO}/Sans2.004/Sans/Variable/TTF/Subset/NotoSansJP-VF.ttf`, bytes: 9590732, sha256: 'f4b373b226668ee33a6e54b02823dcd2d1209f17159f777421ae8c2275160369', weight: '100 900'},
  {family: 'Noto Sans KR', defaultFor: 'ko', file: 'NotoSansKR-VF.ttf', url: `${NOTO}/Sans2.004/Sans/Variable/TTF/Subset/NotoSansKR-VF.ttf`, bytes: 10415420, sha256: '9e1d729e7e2b36f9ef439da102f8c134c10aabe46f1c843bf0aca5c043b86f76', weight: '100 900'},
  {family: 'Noto Serif SC', file: 'NotoSerifSC-VF.ttf', url: `${NOTO}/Serif2.003/Serif/Variable/TTF/Subset/NotoSerifSC-VF.ttf`, bytes: 25125232, sha256: '5326cfb097e3ab26fcb39329752b5c0a439bf8d5c4649520e4b492939c352a09', weight: '200 900'},
  {family: 'LXGW WenKai', file: 'LXGWWenKai-Regular.ttf', url: 'https://github.com/lxgw/LxgwWenKai/releases/download/v1.530/LXGWWenKai-Regular.ttf', bytes: 25928940, sha256: '2d73eea94ad808999d90c0000c239a84a33b09d4bc6ab6c5b8bbf1eda8a7fc8b', weight: '400'},
  {family: 'Newsreader', file: 'Newsreader-VF.ttf', url: `${GOOGLE_FONTS}/newsreader/Newsreader%5Bopsz,wght%5D.ttf`, bytes: 451664, sha256: '8a08d13f8a6c0d51be379a60af84f945f65369a67e509ee3c3bdcc421254d7c1', weight: '200 800'},
  {family: 'Newsreader', style: 'italic', file: 'Newsreader-Italic-VF.ttf', url: `${GOOGLE_FONTS}/newsreader/Newsreader-Italic%5Bopsz,wght%5D.ttf`, bytes: 495684, sha256: '796668611f80b64d5adf182fde3b6f29ed83b4e7cbec7b96937e84ac01364792', weight: '200 800'},
  // the built-in styles' faces (skills/visotalk/styles): red-pencil's hand, lab-notebook's hand and text, stage-light's figures and text, on-air's text
  {family: 'Caveat', file: 'Caveat-VF.ttf', url: `${GOOGLE_FONTS}/caveat/Caveat%5Bwght%5D.ttf`, bytes: 403648, sha256: '0bdb6b660482d31531b3945849fba5916b3ef8695da7024a9e6b9ee3c4157988', weight: '400 700'},
  {family: 'Shantell Sans', file: 'ShantellSans-VF.ttf', url: `${GOOGLE_FONTS}/shantellsans/ShantellSans%5BBNCE,INFM,SPAC,wght%5D.ttf`, bytes: 1284736, sha256: 'd98a7913853f78d71aa0b86daf66b5eddb5a3266c07bfd51ef70632b88c41084', weight: '300 800'},
  {family: 'Atkinson Hyperlegible Next', file: 'AtkinsonHyperlegibleNext-VF.ttf', url: `${GOOGLE_FONTS}/atkinsonhyperlegiblenext/AtkinsonHyperlegibleNext%5Bwght%5D.ttf`, bytes: 114552, sha256: '5a455d1cfa099b601ab70751bb9673e8fe1854dc4500c80e1a220d0d75e31745', weight: '200 800'},
  {family: 'Big Shoulders Display', file: 'BigShouldersDisplay-VF.ttf', url: `${GOOGLE_FONTS}/bigshouldersdisplay/BigShouldersDisplay%5Bwght%5D.ttf`, bytes: 219532, sha256: '60e208dc276a1c35fc5b62e94f9fb959c40c11783a9eb7548175c14b1fbeb720', weight: '100 900'},
  {family: 'Hanken Grotesk', file: 'HankenGrotesk-VF.ttf', url: `${GOOGLE_FONTS}/hankengrotesk/HankenGrotesk%5Bwght%5D.ttf`, bytes: 132892, sha256: '813b3f8fa0965405669a89b38e51bbefd95eef6b8e20d1cb2d8c10cce062662f', weight: '100 900'},
];

/** Faces every player carries (`@visotalk/runtime` bundles them), so a document may name them without the catalogue */
const BUNDLED = ['Inter', 'JetBrains Mono'];
/** Faces that draw Han characters: a Chinese or Japanese document that names none of them gets its language's sans beside the faces it names */
const HAN = new Set(['Noto Sans SC', 'Noto Sans JP', 'Noto Sans KR', 'Noto Serif SC', 'LXGW WenKai']);
const GENERIC = /^(serif|sans-serif|monospace|cursive|fantasy|system-ui|math|emoji|fangsong|ui-[a-z-]+)$/i;

/** The family names of a font stack, in order: `"Big Shoulders Display", sans-serif` → ['Big Shoulders Display', 'sans-serif'] */
const families = (stack: string) => stack.split(',').map((f) => f.trim().replace(/^["']|["']$/g, '')).filter(Boolean);

/**
 * The faces a document names that no player can be sure to have: neither in the catalogue nor bundled, nor a generic family. Such a face is drawn with
 * whatever the viewer's machine has, so the preview, the video and a viewer's screen can differ; the CLI says so instead of letting it pass silently.
 */
export function unavailableFonts(doc: Pick<VisoDoc, 'theme'>): string[] {
  const {sans, mono, display} = themeTokens(doc.theme).fonts;
  const known = new Set([...BUNDLED, ...FONTS.map((f) => f.family)]);
  return [...new Set([sans, mono, display ?? ''].flatMap(families).filter((f) => !GENERIC.test(f) && !known.has(f)))];
}
export const fontWarning = (names: string[]) => names.length
  ? `font.unavailable: ${names.map((n) => `"${n}"`).join(', ')} ${names.length > 1 ? 'are' : 'is'} not a face a player carries, so each viewer sees their own machine's stand-in. Faces the engine embeds: ${[...BUNDLED, ...new Set(FONTS.map((f) => f.family))].join(', ')}.`
  : '';

export const fontFile = (dir: string, f: Font) => join(dir, f.file);
export const isInstalled = (dir: string, f: Font) => existsSync(fontFile(dir, f)) && statSync(fontFile(dir, f)).size === f.bytes;

const mentions = (stack: string, family: string) => stack.includes(`"${family}"`) || stack.includes(`'${family}'`);
const slug = (family: string) => family.toLowerCase().replace(/[^a-z0-9]+/g, '-');

/** The stack with `family` before its generic fallback: `"Inter", sans-serif` → `"Inter", "Noto Sans SC", sans-serif` */
const withFamily = (stack: string, family: string) => stack.replace(/^(.*?)(?:,?\s*(sans-serif|serif|monospace))?\s*$/, (_, names: string, generic?: string) => [names, `"${family}"`, generic].filter(Boolean).join(', '));

const languageOf = (lang: string): 'zh' | 'ja' | 'ko' | undefined => (/^(zh|zho|chi|cmn)([-_]|$)/i.test(lang) ? 'zh' : /^(ja|jpn)([-_]|$)/i.test(lang) ? 'ja' : /^(ko|kor)([-_]|$)/i.test(lang) ? 'ko' : undefined);

/**
 * The fonts a document uses, and the sans and display stacks to draw with: the families it names in any of its three stacks, and, for a Chinese,
 * Japanese or Korean document that names no face for its script, its language's sans added to the sans and display stacks. A family the document's
 * own code names in quotes (a part's `fontFamily: '"Noto Serif SC", serif'`, passed in `source`) is embedded beside them, so a heading face is never
 * left to whatever the viewer's machine has.
 */
export function fontPlan(doc: Pick<VisoDoc, 'theme' | 'meta'>, source = ''): {fonts: Font[]; sans: string; display?: string} {
  const {sans, mono, display} = themeTokens(doc.theme).fonts;
  const named = FONTS.filter((f) => [sans, mono, display ?? ''].some((stack) => mentions(stack, f.family)));
  const inSource = FONTS.filter((f) => !named.includes(f) && mentions(source, f.family));
  const language = languageOf(doc.meta.lang);
  const fallback = language && !named.some((f) => HAN.has(f.family)) ? FONTS.find((f) => f.defaultFor === language) : undefined;
  if (!fallback) return {fonts: [...named, ...inSource], sans, ...(display && {display})};
  return {fonts: [...named, fallback, ...inSource.filter((f) => f !== fallback)], sans: withFamily(sans, fallback.family), ...(display && {display: withFamily(display, fallback.family)})};
}

/**
 * Cut each font down to `text` (and the Latin, punctuation and full-width blocks, so words typed in the web editor later still draw) with fontTools, and write
 * `fonts/<family>.woff2` and the `@font-face` rules to `out`. Returns the file name of the rules.
 */
export function writeFontFaces(fonts: Font[], fontsDir: string, python: string, text: string, out: string): string {
  mkdirSync(join(out, 'fonts'), {recursive: true});
  const chars = new Set([...text.replace(/[\u0000-\u001f]/g, '')]);
  for (let c = 0x20; c < 0x7f; c++) chars.add(String.fromCharCode(c));
  for (const [from, to] of [[0x2000, 0x206f], [0x3000, 0x303f], [0xff00, 0xffef]]) for (let c = from; c <= to; c++) chars.add(String.fromCodePoint(c));
  const textFile = join(out, 'fonts', 'text.txt');
  writeFileSync(textFile, [...chars].join(''));
  const rules = fonts.map((f) => {
    if (!isInstalled(fontsDir, f)) throw new Error(`the font "${f.family}" is not installed in ${fontsDir}: run visotalk doctor --fix`);
    const name = `${slug(f.family)}${f.style ? `-${f.style}` : ''}.woff2`;
    // cutting a CJK face takes seconds and every still, sheet and qa builds the player: a face cut from the same file to the same characters is kept
    const src = fontFile(fontsDir, f), made = statSync(src);
    const key = createHash('sha256').update(JSON.stringify([src, made.size, made.mtimeMs, [...chars].sort().join('')])).digest('hex');
    const keyFile = join(out, 'fonts', `${name}.key`);
    const rule = `@font-face {font-family: "${f.family}"; src: url(./fonts/${name}) format("woff2"); font-weight: ${f.weight}; font-style: ${f.style ?? 'normal'};}`;
    if (existsSync(join(out, 'fonts', name)) && existsSync(keyFile) && readFileSync(keyFile, 'utf8') === key) return rule;
    const cut = spawnSync(python, ['-m', 'fontTools.subset', src, `--text-file=${textFile}`, '--flavor=woff2', '--layout-features=*', `--output-file=${join(out, 'fonts', name)}`], {encoding: 'utf8'});
    if (cut.status !== 0) throw new Error(`could not cut "${f.family}" down to the document's characters (${python} -m fontTools.subset; doctor --fix installs fonttools and brotli): ${cut.stderr.trim().split('\n').slice(-2).join(' ')}`);
    writeFileSync(keyFile, key);
    return rule;
  });
  writeFileSync(join(out, 'fonts.css'), `${rules.join('\n')}\n`);
  return 'fonts.css';
}
