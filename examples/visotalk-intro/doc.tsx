import {Doc, Asset, Scene, Line, Part, Animation, Appear, Disappear, Tween, Set, Sound} from '@visotalk/jsx';
import {useProp, useAsset, useDocTime, useTarget, useTheme, useText, Obj} from '@visotalk/runtime';
import {OLDEST} from './oldest-light.ts';

/*
 * The narration is the timeline: VisoTalk introduced by the person who made it, made with VisoTalk. One picture runs through the first half: a
 * sentence written across the frame, with the pictures it explains hung from its words by threads. Pinned to a ruler of seconds instead, the pictures
 * fall behind when a word is added; hung on the words, they follow every rewrite, voice and language.
 */

// ---- helpers ----------------------------------------------------------------
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => {const x = clamp(t); return x * x * (3 - 2 * x);};
const frac = (v: number) => v - Math.floor(v);
const hash = (i: number, k = 0) => frac(Math.sin(i * 12.9898 + k * 78.233) * 43758.5453);
const typed = (s: string, n: number) => s.slice(0, Math.max(0, Math.round(n)));

const SANS = 'var(--vt-sans)';
const MONO = 'var(--vt-mono)';
const TEXT = 'var(--vt-text)';
const MUTED = 'var(--vt-muted)';
const FAINT = 'var(--vt-faint)';
const PANEL = 'var(--vt-panel)';
const BORDER = 'var(--vt-border)';
const CUE = 'var(--vt-grad)'; // the word an action hangs on
const DATA = 'var(--vt-data)';
const GOOD = 'var(--vt-good)';
const BAD = 'var(--vt-bad)';
const VIOLET = 'var(--vt-op)';
const AMBER = 'var(--vt-warn)';
const CREAM = '#efe8cf';
const NIGHT = '#2b3047';
const BG = 'var(--vt-bg)';
const PANEL2 = 'var(--vt-panel2)';
const tint = (c: string, pct: number) => `color-mix(in srgb, ${c} ${pct}%, transparent)`;
/** Code is coloured from the theme: tags in the data blue, attributes in green, strings in amber */
const CODE = {tag: DATA, attr: GOOD, str: AMBER};

// ---- the brand ----------------------------------------------------------------

/** docs/brand/lockup.svg as parts, so it can be drawn the way the site draws it: a copy of the lockup the site generates */
const LOCKUP: {viewBox: string; corners: string[]; play: string; wordmarkTransform: string; letters: Array<{d: string; right: number; blue: boolean}>} = {"viewBox": "5 5.7 234.05 51.3", "corners": ["M8 22V10h12", "M44 10h12v12", "M56 34v12h-12", "M20 46h-4l-8 8V34"], "play": "M26.97 20.35L39.57 28L26.97 35.65Z", "wordmarkTransform": "translate(74.82 3)", "letters": [{"d": "M9.06 39.07 0.68 16.93H7.5L12.99 34.73H12.42L17.88 16.93H24.7L16.33 39.07Z", "right": 24.7, "blue": true}, {"d": "M27.88 39.07V16.93H33.99V39.07ZM30.94 14.28Q29.11 14.28 28 13.18Q26.9 12.07 26.9 10.24Q26.9 8.4 28 7.3Q29.11 6.2 30.94 6.2Q32.78 6.2 33.88 7.3Q34.98 8.4 34.98 10.24Q34.98 12.07 33.88 13.18Q32.78 14.28 30.94 14.28Z", "right": 34.98, "blue": true}, {"d": "M48.37 39.61Q45.87 39.61 43.66 38.89Q41.44 38.16 39.93 36.62Q38.42 35.08 38 32.61L43.57 31.51Q43.76 33.38 44.9 34.33Q46.04 35.28 48.14 35.28Q50.17 35.28 51.16 34.47Q52.15 33.66 52.15 32.57Q52.15 31.61 51.38 30.91Q50.6 30.21 48.73 29.93L46.71 29.6Q45.54 29.42 44.19 29.09Q42.84 28.77 41.65 28.13Q40.46 27.48 39.7 26.34Q38.95 25.2 38.95 23.38Q38.95 21.19 40.12 19.63Q41.3 18.06 43.39 17.23Q45.47 16.39 48.18 16.39Q50.66 16.39 52.71 17.11Q54.76 17.84 56.14 19.25Q57.52 20.66 57.93 22.73L52.36 23.88Q52.21 23.03 51.81 22.29Q51.41 21.55 50.59 21.1Q49.78 20.64 48.37 20.64Q46.79 20.64 45.86 21.26Q44.93 21.87 44.93 22.93Q44.93 23.71 45.45 24.21Q45.98 24.7 46.89 25Q47.8 25.3 48.95 25.51L51.25 25.9Q53.01 26.18 54.6 26.88Q56.19 27.59 57.19 28.9Q58.19 30.21 58.19 32.35Q58.19 34.71 56.91 36.33Q55.63 37.95 53.41 38.78Q51.19 39.61 48.37 39.61Z", "right": 58.19, "blue": true}, {"d": "M72.71 39.61Q69.36 39.61 66.81 38.14Q64.26 36.66 62.83 34.04Q61.4 31.42 61.4 27.99Q61.4 24.56 62.83 21.95Q64.26 19.33 66.81 17.86Q69.36 16.39 72.71 16.39Q76.07 16.39 78.62 17.86Q81.17 19.33 82.61 21.95Q84.04 24.56 84.04 28Q84.04 31.44 82.61 34.05Q81.17 36.67 78.61 38.14Q76.06 39.61 72.71 39.61ZM72.72 35.11Q75.01 35.11 76.33 33.2Q77.65 31.29 77.65 28Q77.65 24.71 76.33 22.8Q75 20.89 72.72 20.89Q70.43 20.89 69.11 22.8Q67.79 24.71 67.79 28Q67.79 31.3 69.11 33.2Q70.43 35.11 72.72 35.11Z", "right": 84.04, "blue": true}, {"d": "M94.5 39.07Q92.03 39.07 90.71 37.88Q89.4 36.68 89.4 34.42V21.4H86.23V16.93H89.4V12.58L95.51 11.1V16.93H99.6V21.4H95.51V33.46Q95.51 34.14 95.7 34.37Q95.9 34.6 96.53 34.6H99.92V39.07Z", "right": 99.92, "blue": false}, {"d": "M110.36 39.6Q108.24 39.6 106.46 38.86Q104.67 38.12 103.59 36.63Q102.52 35.15 102.52 32.94Q102.52 30.56 103.9 28.9Q105.28 27.23 107.9 26.36Q110.51 25.49 114.23 25.49H117.35L116.98 26.05V24.78Q116.98 22.58 116.19 21.51Q115.39 20.44 113.54 20.44Q111.77 20.44 110.84 21.37Q109.9 22.31 109.7 24.03L103.48 22.95Q103.81 21.11 105.05 19.62Q106.3 18.13 108.49 17.25Q110.69 16.36 113.89 16.36Q116.82 16.36 118.85 17.3Q120.88 18.23 121.94 20.33Q123 22.43 123 25.93V33.46Q123 34.14 123.19 34.37Q123.39 34.6 124.02 34.6H125.02V39.07H122.1Q119.72 39.07 118.47 37.87Q117.23 36.66 117.23 34.42V33.38L118.3 33.78Q118.03 34.67 117.51 35.67Q116.99 36.67 116.09 37.57Q115.19 38.46 113.79 39.03Q112.39 39.6 110.36 39.6ZM112.12 35.43Q113.56 35.43 114.66 34.77Q115.77 34.11 116.4 32.79Q117.04 31.47 117.04 29.51V29.02H114.46Q112.27 29.02 111.04 29.6Q109.82 30.17 109.33 31Q108.84 31.83 108.84 32.62Q108.84 33.24 109.13 33.89Q109.43 34.54 110.14 34.99Q110.85 35.43 112.12 35.43Z", "right": 125.02, "blue": false}, {"d": "M134.17 39.07Q131.69 39.07 130.38 37.88Q129.06 36.68 129.06 34.42V8.31H135.17V33.46Q135.17 34.14 135.36 34.37Q135.56 34.6 136.19 34.6H137.9V39.07Z", "right": 137.9, "blue": false}, {"d": "M141.78 39.07V8.31H147.89V25.45L156.44 16.93H163.42L155.08 25.22L163.73 39.07H156.92L150.98 29.43L147.89 32.51V39.07Z", "right": 163.73, "blue": false}]};
const LK = LOCKUP.viewBox.split(' ').map(Number);
const WORD_X = Number(/translate\(([\d.]+)/.exec(LOCKUP.wordmarkTransform)?.[1] ?? 0);
/** Where each corner, the play triangle and the mark scale from: the centres (and the mark's foot) of their boxes in the lockup's units */
const CORNER_O = [[14, 16], [50, 16], [50, 40], [14, 44]];
const CORNER_D = [[9, 9, -35], [-9, 9, 35], [-9, -9, -35], [9, -9, 35]];
/** When each letter of "visotalk" is typed, in ms after the typing starts, as on the site */
const TYPED_AT = [0, 120, 215, 335, 450, 560, 665, 780];
const TYPE_START = 1050;
/** How long the lockup takes to draw itself, in ms */
export const LOCKUP_MS = TYPE_START + 780 + 320;

/** A value along keyframes [at 0–1, value], straight between them */
const kf = (p: number, keys: Array<[number, number]>) => {
  if (p <= keys[0][0]) return keys[0][1];
  for (let k = 1; k < keys.length; k++) if (p <= keys[k][0]) return lerp(keys[k - 1][1], keys[k][1], (p - keys[k - 1][0]) / (keys[k][0] - keys[k - 1][0]));
  return keys[keys.length - 1][1];
};
const backOut = (p: number) => 1 + 2.7 * (p - 1) ** 3 + 1.7 * (p - 1) ** 2;

/**
 * docs/brand/lockup.svg in its dark-ground colours ("viso" in the mark's blue, "talk" in the text colour), drawn the way the site's header draws
 * it once per load (the site's `.lk-*` styles): the four corners fly in, the play triangle pops, the mark hops, then the word is
 * typed under a caret. `draw` runs 0 to 1 over LOCKUP_MS; at 1 it is the still lockup.
 */
function Lockup({width, draw = 1}: {width: number; draw?: number}) {
  // the mark's blue of docs/brand/tokens.json for the ground it sits on
  const MARK = useTheme().colors.bg.toLowerCase() === '#f6f3ea' ? '#0e4f9c' : '#6fb4f5';
  const t = draw * LOCKUP_MS;
  const hop = clamp((t - 880) / 560);
  const hopY = kf(hop, [[0, 0], [0.3, -5], [0.62, 0], [1, 0]]);
  const hopSx = kf(hop, [[0, 1], [0.3, 0.97], [0.62, 1.05], [0.82, 0.99], [1, 1]]);
  const hopSy = kf(hop, [[0, 1], [0.3, 1.05], [0.62, 0.93], [0.82, 1.02], [1, 1]]);
  const pop = clamp((t - 520) / 520);
  const popS = kf(pop, [[0, 0], [0.35, 1.3], [0.65, 0.9], [0.85, 1.04], [1, 1]]);
  const caret = (() => {
    const tt = t - TYPE_START;
    if (tt < -260 || tt >= 780 + 300 || draw >= 1) return null;
    const i = TYPED_AT.filter((a: number) => tt >= a).length - 1; // the letters typed so far (TYPED_AT ascends)
    return i < 0 ? -4.2 + 0.68 : LOCKUP.letters[i].right + 1.5;
  })();
  return (
    <svg width={width} height={(width * LK[3]) / LK[2]} viewBox={LOCKUP.viewBox} style={{overflow: 'visible'}}>
      <g transform={`translate(32 54) translate(0 ${hopY}) scale(${hopSx} ${hopSy}) translate(-32 -54)`}>
        <g fill="none" stroke={MARK} strokeWidth={5} strokeLinejoin="miter">
          {LOCKUP.corners.map((d, i) => {
            const p = clamp((t - i * 85) / 560), e = backOut(p), [ox, oy] = CORNER_O[i], [dx, dy, r] = CORNER_D[i];
            return <path key={d} d={d} opacity={clamp(p / 0.18)} transform={`translate(${dx * (1 - e)} ${dy * (1 - e)}) translate(${ox} ${oy}) rotate(${r * (1 - e)}) scale(${0.2 + 0.8 * e}) translate(${-ox} ${-oy})`} />;
          })}
        </g>
        <path d={LOCKUP.play} fill={TEXT} stroke={TEXT} strokeWidth={2.7} strokeLinejoin="round" opacity={clamp(pop / 0.35)} transform={`translate(33.27 28) scale(${popS}) translate(-33.27 -28)`} />
      </g>
      <g transform={LOCKUP.wordmarkTransform}>
        {LOCKUP.letters.map((l, i) => {
          const p = clamp((t - TYPE_START - TYPED_AT[i]) / 200);
          return <path key={l.d} d={l.d} fill={l.blue ? MARK : TEXT} opacity={p > 0 ? 1 : 0} transform={`translate(0 ${kf(p, [[0, 3], [0.55, -0.6], [1, 0]])})`} />;
        })}
      </g>
      {caret !== null && <rect x={WORD_X + caret} y={11.3} width={2.2} height={30.8} fill={TEXT} />}
    </svg>
  );
}

// ---- the ground and the chapter -------------------------------------------------

/** One slow ground behind the whole film: a faint dot grid and two soft blooms of the brand's blue and violet drifting over it */
function Backdrop() {
  const t = useDocTime();
  const bloom = (cx: number, cy: number, color: string, a: number) => `radial-gradient(ellipse 46% 56% at ${cx}% ${cy}%, color-mix(in srgb, ${color} ${a}%, transparent) 0%, transparent 100%)`;
  return (
    <div style={{position: 'absolute', inset: 0, background: [
      `radial-gradient(${tint(TEXT, 7)} 1.5px, transparent 1.6px) 0 0 / 48px 48px`,
      bloom(22 + 10 * Math.sin(t * 0.06), 28 + 8 * Math.cos(t * 0.05), DATA, 16),
      bloom(80 + 8 * Math.cos(t * 0.05), 74 + 10 * Math.sin(t * 0.07), VIOLET, 14),
      BG,
    ].join(', ')}} />
  );
}

/** Where the film is: a number and a name in one corner, the same type throughout */
function Chapter() {
  const n = useProp('n', '01');
  const n0 = useProp('n', '01');
  const name = useText(`chapter-${n0}`, useProp('name', 'The problem'));
  return (
    <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', gap: 16, fontFamily: MONO, fontSize: 24, letterSpacing: '0.08em', textTransform: 'uppercase'}}>
      <span style={{color: CUE}}>{n}</span>
      <span style={{width: 28, height: 2, background: FAINT}} />
      <span style={{color: MUTED}}>{name}</span>
    </div>
  );
}

// ---- the rail: a sentence, and the pictures hung on its words --------------------

type Tok = {t: string; pic?: PicId; k?: 'ins' | 'ins2'};
type PicId = 'moon' | 'earth' | 'sun' | 'half';
const EN: Tok[] = [
  {t: 'The'}, {t: 'Moon', pic: 'moon'}, {t: 'slowly', k: 'ins'}, {t: 'circles'}, {t: 'Earth', pic: 'earth'}, {t: 'as'}, {t: 'the'},
  {t: 'Sun', pic: 'sun'}, {t: 'always', k: 'ins2'}, {t: 'lights'}, {t: 'half.', pic: 'half'},
];
const ZH: Tok[] = [
  {t: '月亮', pic: 'moon'}, {t: '缓缓地', k: 'ins'}, {t: '绕着'}, {t: '地球', pic: 'earth'}, {t: '转，'}, {t: '太阳', pic: 'sun'}, {t: '总是', k: 'ins2'}, {t: '照亮'}, {t: '它的'}, {t: '一半。', pic: 'half'},
];
const JA: Tok[] = [
  {t: '月が', pic: 'moon'}, {t: 'ゆっくり'}, {t: '地球を', pic: 'earth'}, {t: '回り、'}, {t: '太陽が', pic: 'sun'}, {t: 'いつも'}, {t: '半分を', pic: 'half'}, {t: '照らす。'},
];
const FR: Tok[] = [
  {t: 'La'}, {t: 'Lune', pic: 'moon'}, {t: 'tourne'}, {t: 'autour'}, {t: 'de'}, {t: 'la'}, {t: 'Terre,', pic: 'earth'}, {t: 'le'}, {t: 'Soleil', pic: 'sun'}, {t: 'en'}, {t: 'éclaire'}, {t: 'la'}, {t: 'moitié.', pic: 'half'},
];
const DE: Tok[] = [
  {t: 'Der'}, {t: 'Mond', pic: 'moon'}, {t: 'kreist'}, {t: 'um'}, {t: 'die'}, {t: 'Erde,', pic: 'earth'}, {t: 'die'}, {t: 'Sonne', pic: 'sun'}, {t: 'erhellt'}, {t: 'die'}, {t: 'Hälfte.', pic: 'half'},
];
/**
 * The sentence in each language, in its own face, at its own width per character (of the type size). The film's own language is the one typed in
 * and rewritten (`rail-base`, English unless an overlay says otherwise); the translations it switches through are `rail-others`, in the order a
 * language picker lists them: by each language's own name, Latin script first. Only the base language's `ins` words are typed in later.
 */
type Lang = {toks: Tok[]; label: string; font: string; cw: number; gap: number};
const LANGS: Record<string, Lang> = {
  de: {toks: DE, label: 'Deutsch', font: 'var(--vt-mono)', cw: 0.6, gap: 0.54},
  en: {toks: EN, label: 'English', font: 'var(--vt-mono)', cw: 0.6, gap: 0.54},
  fr: {toks: FR, label: 'Français', font: 'var(--vt-mono)', cw: 0.6, gap: 0.54},
  ja: {toks: JA, label: '日本語', font: '"Noto Sans JP", var(--vt-sans)', cw: 1.04, gap: 0.5},
  zh: {toks: ZH, label: '中文', font: '"Noto Sans SC", var(--vt-sans)', cw: 1.04, gap: 0.5},
};
function useRailLangs() {
  const base = LANGS[useText('rail-base', 'en')];
  const others = useText('rail-others', 'de,fr,ja,zh').split(',').map((id) => LANGS[id]);
  return {base, others, baseLabel: useText('rail-base-label', 'EN')};
}
const FS = 64; // the sentence's type size, before it is fitted to the frame
const PIC_Y = 330; // centre of the pictures, at the top
const PIC_R = 54;
const ROW_Y = 570; // centre of the sentence, under them
const WAVE_Y = 650; // the spoken sentence's waveform, under the sentence
const RULER_Y = 730; // the ruler of seconds, at the bottom
/** The band the sentence's letters fill: a thread from the ruler stops short of it and starts again above it */
const TEXT_TOP = ROW_Y - FS * 0.8, TEXT_BOTTOM = ROW_Y + FS * 0.6;
const PX_PER_S = 300; // where a word is said, for the timestamps: a second of narration is this many px of the sentence

/** Where each word of a sentence sits: its centre, left edge and width, centred on the frame */
function layout(toks: Tok[], cw: number, gap: number, f: (k?: Tok['k']) => number, fit = 1) {
  const w = toks.map((t) => [...t.t].length * cw * f(t.k) * fit);
  const g = toks.map((t) => gap * f(t.k) * fit);
  const total = w.reduce((a, b) => a + b, 0) + g.slice(1).reduce((a, b) => a + b, 0);
  let x = 960 - total / 2;
  return toks.map((t, i) => {
    if (i > 0) x += g[i];
    const left = x;
    x += w[i];
    return {left, w: w[i], cx: left + w[i] / 2, total};
  });
}
/** How much a sentence must shrink to stay inside the frame's margins */
const fitOf = (lay: Array<{total: number}>) => Math.min(1, 1680 / lay[0].total);

/** A small picture of a sky body: the Moon, the Earth, the Sun, or a half-lit Moon */
function Body({id, x, y, r}: {id: PicId; x: number; y: number; r: number}) {
  if (id === 'sun') {
    return (
      <g>
        {Array.from({length: 12}, (_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return <line key={i} x1={x + Math.cos(a) * r * 1.05} y1={y + Math.sin(a) * r * 1.05} x2={x + Math.cos(a) * r * 1.32} y2={y + Math.sin(a) * r * 1.32} stroke="#ffc94d" strokeWidth={5} strokeLinecap="round" />;
        })}
        <circle cx={x} cy={y} r={r * 0.92} fill="#ffc94d" />
        <circle cx={x - r * 0.25} cy={y - r * 0.25} r={r * 0.4} fill="#ffe6a0" opacity={0.6} />
      </g>
    );
  }
  if (id === 'earth') {
    return (
      <g>
        <circle cx={x} cy={y} r={r} fill="#2d6fc4" />
        <path d={`M${x - r * 0.6} ${y - r * 0.3} q${r * 0.3} ${-r * 0.4} ${r * 0.6} ${-r * 0.1} t${r * 0.3} ${r * 0.4} q${-r * 0.4} ${r * 0.3} ${-r * 0.9} ${r * 0.1}z`} fill="#4fae6e" />
        <path d={`M${x + r * 0.1} ${y + r * 0.35} q${r * 0.3} ${-r * 0.2} ${r * 0.55} ${r * 0.05} q${-r * 0.2} ${r * 0.35} ${-r * 0.55} ${r * 0.2}z`} fill="#4fae6e" />
      </g>
    );
  }
  const lit = id === 'half'
    ? `M${x} ${y - r} A${r} ${r} 0 0 1 ${x} ${y + r} Z`
    : `M${x} ${y - r} A${r} ${r} 0 0 1 ${x} ${y + r} A${r * 0.55} ${r} 0 0 0 ${x} ${y - r} Z`;
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={NIGHT} />
      <path d={lit} fill={CREAM} />
    </g>
  );
}

/** The frame's sentence, typed in and then rewritten, re-voiced and translated, with the four pictures hanging below it */
function Rail() {
  const type = useProp('type', 0);
  const thread = useProp('thread', 0);
  const ruler = useProp('ruler', 0);
  const pinned = useProp('pinned', 0);
  const ins = useProp('ins', 0);
  const late = useProp('late', 0);
  const ins2 = useProp('ins2', 0);
  const pace = useProp('pace', 1);
  const lang = useProp('lang', 0);
  const wave = useProp('wave', 0);
  const marks = useProp('marks', 0);
  const stamps = useProp('stamps', 0);
  const hl = useProp('hl', 0);
  const ok = useProp('ok', 0);
  const head = useProp('head', 0);
  const spd = useProp('spd', '');
  const langs = useProp('langs', 0);
  const dark = useProp('dark', 0);
  const sunlight = useTarget('sunlight');
  const frame = useTarget('script-frame');
  const {base: B, others: OTHER, baseLabel} = useRailLangs();
  const EN = B.toks;
  const speedLabel = useText('voice-speed', 'voice speed');

  const cw = FS * B.cw, gap = FS * B.gap;
  const f = (a: number, b: number) => (k?: Tok['k']) => (k === 'ins' ? a : k === 'ins2' ? b : 1);
  const enFit = Math.min(fitOf(layout(EN, cw, gap, f(ins, ins2))), 1800 / layout(EN, cw, gap * pace, f(ins, ins2))[0].total);
  const pinFit = fitOf(layout(EN, cw, gap, f(0, 0)));
  const en = layout(EN, cw, gap * pace, f(ins, ins2), enFit);
  const pin = layout(EN, cw, gap, f(0, 0), pinFit);
  // lang runs 0 (English) to 3 (Korean); each language is shown alone around its whole number, fading out before the next fades in
  const otherFit = OTHER.map((o) => fitOf(layout(o.toks, FS * o.cw, FS * o.gap, () => 1)));
  const others = OTHER.map((o, k) => layout(o.toks, FS * o.cw, FS * o.gap * pace, () => 1, otherFit[k]));
  const lays = [en, ...others];
  const toks = [EN, ...OTHER.map((o) => o.toks)];
  const shownOf = (k: number) => smooth(1 - 2 * Math.abs(lang - k));
  const riseOf = (k: number) => (lang < k ? 40 : -40) * (1 - shownOf(k));
  const lo = Math.min(OTHER.length - 1, Math.floor(lang)), mix = smooth(lang - lo);
  const at = (k: number, id: PicId) => lays[k][toks[k].findIndex((t) => t.pic === id)];
  const where = (id: PicId) => {
    const a = at(lo, id), b = at(lo + 1, id);
    const wx = lerp(a.cx, b.cx, mix);
    const wl = lerp(a.left, b.left, mix);
    return {word: wx, left: wl, pin: pin[EN.findIndex((t) => t.pic === id)].cx, x: lerp(wx, pin[EN.findIndex((t) => t.pic === id)].cx, pinned)};
  };
  const rowLeft = lerp(lays[lo][0].left, lays[lo + 1][0].left, mix);

  // the sentence types in, word by word
  const chars = EN.filter((t) => !t.k).map((t) => [...t.t].length + 1);
  const totalChars = chars.reduce((a, b) => a + b, 0);
  let seen = 0;
  const shown = EN.map((t) => {
    if (t.k) return t.t;
    const start = seen;
    seen += [...t.t].length + 1;
    return typed(t.t, type * totalChars - start);
  });

  return (
    <div style={{position: 'absolute', inset: 0}}>
      {/* the ruler of seconds that timeline tools pin pictures to */}
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, opacity: ruler}}>
        <line x1={160} y1={RULER_Y} x2={160 + 1600 * smooth(ruler)} y2={RULER_Y} stroke={MUTED} strokeWidth={2} />
        {Array.from({length: 17}, (_, i) => 160 + i * 100).filter((x) => x <= 160 + 1600 * smooth(ruler)).map((x, i) => (
          <g key={x}>
            <line x1={x} y1={RULER_Y - (i % 2 ? 8 : 14)} x2={x} y2={RULER_Y + (i % 2 ? 8 : 14)} stroke={MUTED} strokeWidth={2} />
            {i % 2 === 0 && <text x={x} y={RULER_Y + 42} textAnchor="middle" fontFamily="var(--vt-mono)" fontSize={20} fill="var(--vt-muted)">{`0:${String(i / 2).padStart(2, '0')}`}</text>}
          </g>
        ))}
      </svg>

      {/* the waveform of the spoken sentence: one burst per word, as long as the word is said */}
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
        {lays.map((lay, s) => ({toks: toks[s], lay, a: shownOf(s)})).map(({toks, lay, a}, s) => a > 0.01 && toks.map((t, i) => {
          const fk = t.k === 'ins' ? ins : t.k === 'ins2' ? ins2 : 1;
          if (fk < 0.02) return null;
          const n = Math.max(3, Math.round(lay[i].w / 9));
          return (
            <g key={`${s}-${i}`} opacity={a}>
              {Array.from({length: n}, (_, b) => {
                const x = lay[i].left + (b + 0.5) * (lay[i].w / n);
                const reveal = clamp(wave * 1.4 - (x - 160) / 1600 * 0.4);
                if (reveal < 0.01) return null;
                const h = (8 + 30 * Math.abs(Math.sin(b * 0.9 + i * 1.7)) * (0.6 + 0.4 * hash(b, i))) * reveal;
                return <line key={b} x1={x} y1={WAVE_Y - h / 2} x2={x} y2={WAVE_Y + h / 2} stroke={DATA} strokeWidth={4} strokeLinecap="round" opacity={0.75} />;
              })}
              {marks > 0 && <line x1={lay[i].left} y1={WAVE_Y - 32} x2={lay[i].left} y2={WAVE_Y + 32} stroke={CUE} strokeWidth={2} opacity={marks} />}
            </g>
          );
        }))}
      </svg>

      {/* the sentence as a line of the agent's script */}
      <div {...frame} style={{...frame.style, position: 'absolute', left: 90, right: 90, top: ROW_Y - 120, height: 196, borderRadius: 18, border: `2px solid ${BORDER}`, background: tint(PANEL, 55)}}>
        <div style={{position: 'absolute', left: 24, top: 12, fontFamily: MONO, fontSize: 22, letterSpacing: '0.08em', color: VIOLET}}>{useText('frame-label', 'THE NARRATION · LINE 1')}</div>
      </div>
      {/* the playhead: the narration moving along its own words */}
      {head > 0 && head < 1 && (() => {
        const last = en[en.length - 1];
        const x = lerp(en[0].left, last.left + last.w, head);
        return (
          <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
            <line x1={x} y1={ROW_Y - 70} x2={x} y2={ROW_Y + 60} stroke={CUE} strokeWidth={4} />
            <circle cx={x} cy={ROW_Y - 76} r={9} fill={CUE} />
          </svg>
        );
      })()}
      {spd !== '' && (
        <div style={{position: 'absolute', left: 960, top: 116, transform: 'translateX(-50%)', padding: '8px 22px', borderRadius: 999, border: `2px solid ${DATA}`, fontFamily: MONO, fontSize: 30, color: DATA, whiteSpace: 'pre'}}>{`${speedLabel} ${spd}`}</div>
      )}
      {/* the words */}
      {EN.map((t, i) => {
        const fk = t.k === 'ins' ? ins : t.k === 'ins2' ? ins2 : 1;
        const isIns = !!t.k;
        const lit = t.pic === 'moon' ? hl : 0;
        return (
          <div key={`en-${i}`} style={{position: 'absolute', left: en[i].cx, top: ROW_Y - FS * 0.7, transform: `translateX(-50%) scale(${isIns ? 0.6 + 0.4 * fk : 1})`,
            opacity: (isIns ? fk : 1) * shownOf(0), marginTop: riseOf(0), fontFamily: B.font, fontSize: FS * enFit, fontWeight: 700, whiteSpace: 'pre', lineHeight: 1.4,
            color: isIns ? GOOD : lit > 0 ? CUE : TEXT, textShadow: lit > 0 ? `0 0 ${24 * lit}px color-mix(in srgb, ${CUE} 60%, transparent)` : undefined}}>
            {isIns && t.k === 'ins' && late > 0 ? <span style={{color: BAD}}>{shown[i]}</span> : shown[i]}
          </div>
        );
      })}
      {OTHER.map((o, k) => shownOf(k + 1) > 0.01 && o.toks.map((t, i) => (
        <div key={`${k}-${i}`} style={{position: 'absolute', left: others[k][i].cx, top: ROW_Y - FS * 0.72 + riseOf(k + 1), transform: 'translateX(-50%)', opacity: shownOf(k + 1),
          fontFamily: o.font, fontSize: FS * otherFit[k], fontWeight: 700, whiteSpace: 'pre', lineHeight: 1.4, color: TEXT}}>{t.t}</div>
      )))}
      {/* the language switch: which of the document's languages is playing */}
      {langs > 0 && (
        <div style={{position: 'absolute', left: 960, top: WAVE_Y + 100, transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 10, padding: 8, borderRadius: 999, border: `2px solid ${BORDER}`, background: PANEL, opacity: langs}}>
          {[baseLabel, ...OTHER.map((o) => o.label)].map((l, k) => {
            const on = Math.abs(lang - k) < 0.5;
            // every chip the same height with its label centred in it, whatever face draws the label
            return <span key={l} style={{display: 'flex', alignItems: 'center', height: 46, padding: '0 22px', lineHeight: 1, borderRadius: 999, fontFamily: k ? OTHER[k - 1].font : B.font, fontSize: 28, fontWeight: 700, color: on ? '#14100c' : MUTED, background: on ? CUE : 'transparent'}}>{l}</span>;
          })}
          <span style={{display: 'flex', alignItems: 'center', height: 46, padding: '0 16px', lineHeight: 1, fontFamily: MONO, fontSize: 28, color: MUTED}}>…</span>
        </div>
      )}

      {/* the pictures, each a target, with the thread or the pin that holds it */}
      {(['moon', 'earth', 'sun', 'half'] as PicId[]).map((id) => (
        <Pic key={id} id={id} w={where(id)} thread={thread} ruler={ruler} pinned={pinned} late={late} ok={ok} stamps={stamps} rowLeft={rowLeft} hl={id === 'moon' ? hl : 0} dark={dark} />
      ))}
      {/* the Sun comes on: its glow, a beam to each body, and the half of each body that faces it lit */}
      <div {...sunlight} style={{...sunlight.style, position: 'absolute', inset: 0}}>
        {(() => {
          const sx = where('sun').x;
          return (
            <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
              <defs>
                <radialGradient id="sunglow"><stop offset="0%" stopColor="#ffd77a" stopOpacity={0.55} /><stop offset="100%" stopColor="#ffd77a" stopOpacity={0} /></radialGradient>
              </defs>
              <circle cx={sx} cy={PIC_Y} r={PIC_R * 2} fill="url(#sunglow)" />
              {(['moon', 'earth', 'half'] as PicId[]).map((id) => {
                const x = where(id).x, faces = x < sx ? 1 : 0;
                return (
                  <g key={id}>
                    <line x1={sx} y1={PIC_Y} x2={x} y2={PIC_Y} stroke="#ffd77a" strokeWidth={PIC_R * 1.6} strokeOpacity={0.07} />
                    <clipPath id={`lit-${id}`}><path d={`M${x} ${PIC_Y - PIC_R - 2} A${PIC_R + 2} ${PIC_R + 2} 0 0 ${faces} ${x} ${PIC_Y + PIC_R + 2} Z`} /></clipPath>
                    <g clipPath={`url(#lit-${id})`}>{id === 'earth' ? <Body id="earth" x={x} y={PIC_Y} r={PIC_R} /> : <circle cx={x} cy={PIC_Y} r={PIC_R} fill={CREAM} />}</g>
                  </g>
                );
              })}
              <Body id="sun" x={sx} y={PIC_Y} r={PIC_R} />
            </svg>
          );
        })()}
      </div>
    </div>
  );
}

function Pic({id, w, thread, ruler, pinned, late, ok, stamps, rowLeft, hl, dark}: {id: PicId; w: {word: number; left: number; pin: number; x: number}; thread: number; ruler: number; pinned: number; late: number; ok: number; stamps: number; rowLeft: number; hl: number; dark: number}) {
  const tgt = useTarget(`pic-${id}`);
  const off = Math.abs(w.word - w.x);
  const wrong = late > 0 && off > 6;
  const color = wrong ? BAD : ok > 0 ? GOOD : hl > 0 ? CUE : MUTED;
  // the thread runs up from the word to the picture; pinned, it runs up from the ruler's pin instead, around the sentence's letters
  const topY = TEXT_TOP;
  const fromX = lerp(w.word, w.x, pinned * smooth(ruler));
  const fromY = lerp(topY, RULER_Y - 14, pinned * smooth(ruler));
  const toY = PIC_Y + PIC_R + 10;
  const y2 = lerp(fromY, toY, smooth(thread));
  const xAt = (y: number) => lerp(fromX, w.x, (fromY - y) / Math.max(1, fromY - toY));
  const segs: Array<[number, number]> = fromY > TEXT_BOTTOM && y2 < TEXT_TOP ? [[fromY, TEXT_BOTTOM + 8], [TEXT_TOP - 8, y2]] : [[fromY, y2]];
  const secs = (w.left - rowLeft) / PX_PER_S + 0.4;
  return (
    <div {...tgt} style={{...tgt.style, position: 'absolute', inset: 0}}>
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
        {thread > 0 && segs.map(([a, b], k) => <line key={k} x1={xAt(a)} y1={a} x2={xAt(b)} y2={b} stroke={color} strokeWidth={wrong ? 4 : 3} strokeLinecap="round" />)}
        {pinned > 0.05 && ruler > 0.05 && <path d={`M${w.x} ${RULER_Y - 12} l10 12 l-10 12 l-10 -12z`} fill={wrong ? BAD : AMBER} opacity={pinned * ruler} />}
        {wrong && <g opacity={late}>
          <line x1={w.x} y1={RULER_Y - 40} x2={w.word} y2={RULER_Y - 40} stroke={BAD} strokeWidth={3} />
          <path d={`M${w.word} ${RULER_Y - 40} l-12 -8 v16z`} fill={BAD} />
        </g>}
        <Body id={id} x={w.x} y={PIC_Y} r={PIC_R} />
        {dark > 0 && <circle cx={w.x} cy={PIC_Y} r={PIC_R * (id === 'sun' ? 1.4 : 1.02)} fill="#0b0e14" opacity={0.86 * dark} />}
        {dark > 0 && <circle cx={w.x} cy={PIC_Y} r={PIC_R} fill="none" stroke={FAINT} strokeWidth={2} opacity={dark} />}
        {hl > 0 && <circle cx={w.x} cy={PIC_Y} r={PIC_R + 14} fill="none" stroke={CUE} strokeWidth={4} opacity={hl} />}
        {ok > 0 && <circle cx={w.x} cy={PIC_Y} r={PIC_R + 14} fill="none" stroke={GOOD} strokeWidth={4} opacity={ok} />}
      </svg>
      {stamps > 0 && (
        <div style={{position: 'absolute', left: w.x, top: PIC_Y - PIC_R - 70, transform: 'translateX(-50%)', fontFamily: MONO, fontSize: 34, color: DATA, opacity: stamps, whiteSpace: 'pre'}}>
          {`${secs.toFixed(1)} s`}
        </div>
      )}
    </div>
  );
}

/** One line of the document, set as code, with the attribute that hangs it on a word lit */
function CodeLine({parts}: {parts: Array<[string, string]>}) {
  const COLOR: Record<string, string> = {...CODE, cue: CUE, p: MUTED};
  return (
    <div style={{fontFamily: MONO, fontSize: 40, whiteSpace: 'pre'}}>
      {parts.map(([k, s], i) => <span key={i} style={{color: COLOR[k] ?? TEXT, ...(k === 'cue' && {background: 'color-mix(in srgb, var(--vt-grad) 18%, transparent)', borderRadius: 6, padding: '2px 4px'})}}>{s}</span>)}
    </div>
  );
}

// ---- one source, every language ----------------------------------------------------

/** The document and the language files laid over it: one doc.tsx, and a file of translated lines for each language */
function LangFiles() {
  const chip = (label: string, color: string) => (
    <span style={{padding: '12px 26px', borderRadius: 999, border: `3px solid ${color}`, fontFamily: MONO, fontSize: 34, color: TEXT, background: PANEL, whiteSpace: 'pre'}}>{label}</span>
  );
  return (
    <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 22}}>
      <Obj id="lang-src" style={{display: 'flex'}}>{chip('● doc.tsx', CUE)}</Obj>
      <Obj id="lang-over" style={{display: 'flex', alignItems: 'center', gap: 22}}>
        <span style={{fontFamily: MONO, fontSize: 34, color: MUTED}}>+</span>
        {chip('doc.de.json', BORDER)}{chip('doc.fr.json', BORDER)}{chip('doc.ja.json', BORDER)}{chip('doc.zh-CN.json', BORDER)}<span style={{fontFamily: MONO, fontSize: 34, color: MUTED}}>…</span>
      </Obj>
    </div>
  );
}

// ---- the opening: an agent drawing the sky in code ---------------------------------

const SKY_CODE = [
  '// an agent writes the picture as code',
  'export function Sky() {',
  '  const t = useTime() * 0.6;',
  '  return (',
  '    <svg viewBox="0 0 800 700">',
  '      <circle cx={300} cy={360} r={80} fill="#2d6fc4" />',
  '      <circle cx={660} cy={150} r={60} fill="#ffc94d" />',
  '      <circle cx={300 + 170 * Math.cos(t)}',
  '              cy={360 + 170 * Math.sin(t)} r={34} />',
  '    </svg>',
  '  );',
  '}',
];
const SKY_ENDS = SKY_CODE.reduce<number[]>((a, l) => [...a, (a[a.length - 1] ?? 0) + l.length + 1], []);

/** A code editor typing a picture, and beside it the picture it draws: the Earth, the Sun, then a Moon that starts to orbit */
function Coder() {
  const code = useProp('code', 0);
  const orbit = useProp('orbit', 0);
  const t = useDocTime();
  const n = code * SKY_ENDS[SKY_ENDS.length - 1];
  const done = (k: number) => smooth((n - SKY_ENDS[k] + 6) / 6);
  const paint = (l: string) => {
    const parts = l.split(/("[^"]*"|\{[^}]*\}|<\/?\w+|\/\/.*)/).filter(Boolean);
    return parts.map((q, i) => <span key={i} style={{color: q.startsWith('//') ? MUTED : q.startsWith('"') ? CODE.str : q.startsWith('{') ? CODE.attr : q.startsWith('<') ? CODE.tag : TEXT}}>{q}</span>);
  };
  let left = n;
  const ex = 1310, ey = 560, a = t * 0.9 * orbit;
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <div style={{position: 'absolute', left: 100, top: 170, width: 860, height: 720, boxSizing: 'border-box', borderRadius: 20, background: PANEL, border: `2px solid ${BORDER}`, padding: '20px 34px'}}>
        <div style={{display: 'flex', gap: 10, marginBottom: 26}}>{['#ff6b6b', '#ffd166', '#4ade80'].map((c) => <span key={c} style={{width: 13, height: 13, borderRadius: 7, background: c, opacity: 0.8}} />)}<span style={{marginLeft: 14, fontFamily: MONO, fontSize: 20, color: MUTED}}>sky.tsx</span></div>
        {SKY_CODE.map((l, k) => {
          const shown = l.slice(0, Math.max(0, Math.min(l.length, Math.round(left))));
          left -= l.length + 1;
          return <div key={k} style={{fontFamily: MONO, fontSize: 23, lineHeight: 1.85, whiteSpace: 'pre', minHeight: 44}}>{paint(shown)}{left < 0 && left > -l.length - 2 && code < 1 && <span style={{color: CUE}}>▍</span>}</div>;
        })}
      </div>
      <div style={{position: 'absolute', left: 1000, top: 170, width: 820, height: 720, borderRadius: 20, border: `2px dashed ${BORDER}`}}>
        <div style={{position: 'absolute', left: 24, top: 16, fontFamily: MONO, fontSize: 20, color: MUTED}}>{useText('preview', 'preview')}</div>
      </div>
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
        <g opacity={done(5)} transform={`translate(${ex} ${ey}) scale(${0.6 + 0.4 * done(5)}) translate(${-ex} ${-ey})`}><Body id="earth" x={ex} y={ey} r={80} /></g>
        <g opacity={done(6)}><Body id="sun" x={1660} y={350} r={60} /></g>
        {done(8) > 0 && <circle cx={ex} cy={ey} r={170} fill="none" stroke={FAINT} strokeWidth={2} strokeDasharray="4 10" opacity={done(8)} />}
        <g opacity={done(8)}><Body id="moon" x={ex + 170 * Math.cos(a + 2.4)} y={ey + 170 * Math.sin(a + 2.4)} r={34} /></g>
      </svg>
    </div>
  );
}

// ---- meet VisoTalk ---------------------------------------------------------------

/** The product, alone in the middle of the frame: the lockup drawing itself, what it is, and its one rule */
function Intro() {
  const draw = useProp('draw', 0);
  return (
    <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 46}}>
      <Lockup width={940} draw={draw} />
      <Obj id="intro-tag" style={{fontFamily: SANS, fontSize: 52, color: MUTED}}>{useText('tagline', 'An agent skill for explainer videos')}</Obj>
      <Obj id="intro-rule" style={{marginTop: 40, fontFamily: SANS, fontWeight: 800, fontSize: 76, letterSpacing: '-0.03em', color: TEXT}}>{useText('rule-a', 'Narration is the new ')}<span style={{color: CUE}}>{useText('rule-b', 'timeline')}</span>{useText('rule-c', '.')}</Obj>
    </div>
  );
}

// ---- let there be light: the clock against the word --------------------------------

/**
 * "Let there be…" and "light!" as the engine lays them out: the first line, its two-second hold, then the second (narration/voice.json; the
 * same words are said twice, so both passes share them). The clock's pin is where "light!" would fall without the pause.
 */
const PAUSE = 2;
/** The strip's words and their times (seconds from "Let there be…"), from the texts so that each language gives its own narration's numbers */
function useLightWords() {
  const num = (id: string, base: string) => Number(useText(id, base));
  const dur = num('clk-let-dur', '0.9288');
  return {
    let: {text: useText('clk-let', 'Let there be…'), from: num('clk-let-from', '0.039'), to: num('clk-let-to', '0.659'), dur},
    light: {text: useText('clk-light', 'light!'), from: dur + PAUSE + num('clk-light-from', '0.039'), to: dur + PAUSE + num('clk-light-to', '0.465')},
  };
}
const PIN_AT = 1.2;
const CLK = {x0: 330, px: 320, span: 4.4};

/** The code under each pass: a timeline's way, a second checked against the clock, then VisoTalk's, the word the light hangs on */
function GagCode() {
  return (
    <div style={{position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
      <Obj id="gag-clock" style={{position: 'absolute', display: 'flex', alignItems: 'center', gap: 26}}>
        <span style={{fontFamily: MONO, fontSize: 26, color: AMBER, whiteSpace: 'pre'}}>{useText('gag-clock', 'timeline code')}</span>
        <CodeLine parts={[['p', '{'], ['attr', 'time'], ['p', ' >= '], ['cue', '1.2'], ['p', ' && '], ['tag', '<Sunlight />'], ['p', '}']]} />
      </Obj>
      <Obj id="gag-word" style={{position: 'absolute', display: 'flex', alignItems: 'center', gap: 26}}>
        <span style={{fontFamily: MONO, fontSize: 26, color: GOOD, whiteSpace: 'pre'}}>VisoTalk</span>
        <CodeLine parts={[['p', '<'], ['tag', 'Appear'], ['attr', ' on'], ['p', '='], ['str', '"sunlight"'], ['attr', ' line'], ['p', '='], ['str', '"l14"'], ['cue', ` word="${useText('gag-anchor', 'light')}"`], ['p', ' />']]} />
      </Obj>
    </div>
  );
}

/** A strip under the sky: the narration's words filling in as they are said, a ruler of seconds, the playhead, and the pin the Sun's light hangs on */
function LightClock() {
  const clk = useProp('clk', 0);
  const hang = useProp('hang', 0);
  const early = useTarget('early');
  const X = (t: number) => CLK.x0 + t * CLK.px;
  const {let: LET, light: LIGHT} = useLightWords();
  const pauseText = useText('clk-pause', 'pause');
  const pinAt = useText('clk-pin-at', `sunlight · at ${PIN_AT} s`);
  const pinWord = useText('clk-pin-word', 'sunlight · on the word');
  const earlyText = useText('clk-early', 'too early');
  const secs = useText('clk-secs', 's');
  const words: Array<[string, number, number]> = [[LET.text, LET.from, LET.to], [LIGHT.text, LIGHT.from, LIGHT.to]];
  const pinX = lerp(X(PIN_AT), X(LIGHT.from), smooth(hang));
  const BY = 846, BH = 48, RY = 956, LY = 1040;
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
        <text x={CLK.x0 - 30} y={BY + 33} textAnchor="end" fontFamily="var(--vt-mono)" fontSize={27} fill="var(--vt-muted)">{useText('clk-voice', 'voice')}</text>
        <text x={CLK.x0 - 30} y={RY + 8} textAnchor="end" fontFamily="var(--vt-mono)" fontSize={27} fill="var(--vt-muted)">{useText('clk-clock', 'clock')}</text>
        {/* the words: an outline once the script is known (the second pass), filled as they are said */}
        {words.map(([w, t0, t1]) => {
          const said = clamp((clk - t0) / Math.max(0.05, t1 - t0));
          const x = X(t0), wd = Math.max([...w].length * 16.5 + 26, (t1 - t0) * CLK.px);
          if (said <= 0 && hang < 0.5) return null;
          return (
            <g key={w}>
              <rect x={x} y={BY} width={wd} height={BH} rx={6} fill="none" stroke={w === LIGHT.text && hang > 0.5 ? GOOD : FAINT} strokeWidth={2} strokeDasharray={said > 0 ? undefined : '5 6'} />
              <rect x={x} y={BY} width={wd * said} height={BH} rx={6} fill={DATA} opacity={0.5} />
              <text x={x + 12} y={BY + 33} fontFamily="var(--vt-mono)" fontSize={27} fill="var(--vt-text)">{w}</text>
            </g>
          );
        })}
        {clk > LET.dur + 0.2 && <text x={X(LET.dur + PAUSE / 2)} y={BY - 14} textAnchor="middle" fontFamily="var(--vt-mono)" fontStyle="italic" fontSize={27} fill="var(--vt-muted)" opacity={smooth((clk - LET.dur - 0.2) * 3)}>{pauseText}</text>}
        {/* the ruler of seconds */}
        <line x1={X(0)} y1={RY} x2={X(CLK.span)} y2={RY} stroke={MUTED} strokeWidth={2} />
        {Array.from({length: Math.floor(CLK.span * 2) + 1}, (_, k) => k / 2).map((t) => (
          <g key={t}>
            <line x1={X(t)} y1={RY - (t % 1 ? 6 : 11)} x2={X(t)} y2={RY + (t % 1 ? 6 : 11)} stroke={MUTED} strokeWidth={2} />
            {t % 1 === 0 && <text x={X(t)} y={RY + 38} textAnchor="middle" fontFamily="var(--vt-mono)" fontSize={24} fill="var(--vt-muted)">{`${t} ${secs}`}</text>}
          </g>
        ))}
        {/* the pin: on the ruler at a second, or hung from the word */}
        {hang > 0.02 && <line x1={X(LIGHT.from) + 2} y1={BY + BH} x2={pinX} y2={RY - 14} stroke={GOOD} strokeWidth={3} opacity={smooth(hang)} />}
        <g transform={`translate(${pinX} ${RY})`}>
          <path d="M0 -14 l13 14 l-13 14 l-13 -14z" fill={hang > 0.5 ? GOOD : AMBER} />
          <circle cx={0} cy={-26} r={9} fill="#ffc94d" />
          <text x={0} y={LY - RY} textAnchor="middle" fontFamily="var(--vt-mono)" fontSize={27} fill={hang > 0.5 ? 'var(--vt-good)' : 'var(--vt-warn)'}>{hang > 0.5 ? pinWord : pinAt}</text>
        </g>
        {/* the playhead */}
        {clk > 0 && clk < CLK.span && <line x1={X(clk)} y1={BY - 16} x2={X(clk)} y2={RY + 16} stroke={CUE} strokeWidth={3} />}
      </svg>
      <div {...early} style={{...early.style, position: 'absolute', left: X(PIN_AT) + 190, top: LY - 31, width: 220, fontFamily: MONO, fontWeight: 700, fontSize: 30, color: BAD}}>{earlyText}</div>
    </div>
  );
}

// ---- the document: its tags, each doing what it says --------------------------------

/** A small document, line by line: what each line is, and which of the narration's tags lights it */
const DOC_LINES: Array<{parts: Array<[string, string]>; tag?: string}> = [
  {parts: [['tag', '<Scene'], ['attr', ' id'], ['p', '='], ['str', '"growth"'], ['tag', '>']], tag: 'scene'},
  {parts: [['p', '  '], ['tag', '<Line'], ['attr', ' id'], ['p', '='], ['str', '"l1"'], ['tag', '>'], ['t', 'Sales tripled in a year.'], ['tag', '</Line>']], tag: 'line'},
  {parts: [['p', '  '], ['tag', '<Part'], ['attr', ' id'], ['p', '='], ['str', '"chart"'], ['tag', '>'], ['t', '<Bars data={SALES} />'], ['tag', '</Part>']], tag: 'part'},
  {parts: [['p', '  '], ['tag', '<Appear'], ['attr', ' target'], ['p', '='], ['str', '"chart"'], ['a', ' line="l1" word="sales"'], ['tag', ' />']], tag: 'appear'},
  {parts: [['p', '  '], ['tag', '<Tween'], ['attr', ' target'], ['p', '='], ['str', '"bar-4"'], ['attr', ' to'], ['p', '='], ['str', '{{h: 3}}'], ['a', ' line="l1" word="tripled"'], ['tag', ' />']], tag: 'tween'},
  {parts: [['p', '  '], ['tag', '<Set'], ['attr', ' target'], ['p', '='], ['str', '"label"'], ['attr', ' to'], ['p', '='], ['str', '{{text: "×3"}}'], ['a', ' line="l1" word="tripled"'], ['tag', ' />']], tag: 'set'},
  {parts: [['p', '  '], ['tag', '<Disappear'], ['attr', ' target'], ['p', '='], ['str', '"chart"'], ['a', ' line="l1" edge="end"'], ['tag', ' />']], tag: 'disappear'},
  {parts: [['tag', '</Scene>']], tag: 'scene'},
];
const SALES = [1, 1.3, 1.6, 1];
const SAY = ['Sales', 'tripled', 'in', 'a', 'year.'];

/** The document on the left; on the right, what it makes: the line being said, and the chart its tags bring in, grow, label and clear */
function DocTags() {
  const type = useProp('type', 0);
  const hl = useProp('hl', '');
  const spoken = useProp('say', 0);
  const ghost = useProp('ghost', 0);
  const grow = useProp('grow', 0);
  const label = useProp('label', '');
  const anchors = useProp('anchors', 0);
  const chart = useTarget('v-chart');
  const lit = hl.split(',');
  // the sample line, its two anchored words and the gap between words, in the overlay's language
  const say = useText('doc-say', SAY.join(' ')).split(' ');
  const sep = useText('doc-sep', ' ');
  const w1 = useText('doc-word-1', 'sales'), w2 = useText('doc-word-2', 'tripled');
  const local = (q: string) => q.replace(SAY.join(' '), say.join(sep)).replace('word="sales"', `word="${w1}"`).replace('word="tripled"', `word="${w2}"`);
  const COLOR: Record<string, string> = {...CODE, p: MUTED, t: TEXT, a: GOOD};
  const X0 = 1130, BASE = 760, W = 110, GAP = 50, UNIT = 110;
  const bars = SALES.map((v, i) => (i === 3 ? lerp(1, 3, grow) : v));
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <div style={{position: 'absolute', left: 80, top: 170, width: 930, height: 720, boxSizing: 'border-box', borderRadius: 20, background: PANEL, border: `2px solid ${BORDER}`, padding: '24px 30px'}}>
        <div style={{fontFamily: MONO, fontSize: 20, color: MUTED, marginBottom: 22}}>doc.tsx</div>
        {DOC_LINES.map((l, k) => {
          const on = lit.includes(l.tag ?? '');
          return (
            <div key={k} style={{fontFamily: MONO, fontSize: 21.5, lineHeight: 1.6, whiteSpace: 'pre', padding: '6px 12px', margin: '0 -12px', borderRadius: 8, opacity: smooth(type * DOC_LINES.length - k),
              background: on ? 'color-mix(in srgb, var(--vt-grad) 16%, transparent)' : 'transparent', boxShadow: on ? `inset 4px 0 0 ${CUE}` : 'none'}}>
              {l.parts.map(([c, q], i) => <span key={i} style={{color: COLOR[c], ...(c === 'a' && anchors > 0 && {color: CUE, fontWeight: 700})}}>{local(q)}</span>)}
            </div>
          );
        })}
      </div>
      <div style={{position: 'absolute', left: 1050, top: 170, width: 790, height: 720, boxSizing: 'border-box', borderRadius: 20, border: `2px dashed ${BORDER}`}}>
        <div style={{position: 'absolute', left: 24, top: 16, fontFamily: MONO, fontSize: 20, color: MUTED}}>{useText('what-it-plays', 'what it plays')}</div>
        <div style={{position: 'absolute', left: 0, right: 0, top: 70, display: 'flex', justifyContent: 'center', gap: 16, fontFamily: SANS, fontSize: 46, fontWeight: 700, opacity: smooth(spoken * 8)}}>
          {say.map((w, i) => {
            const hot = anchors > 0 && (i === 0 || i === 1);
            return <span key={i} style={{color: hot ? CUE : spoken * say.length > i + 0.2 ? TEXT : FAINT}}>{w}</span>;
          })}
        </div>
        {anchors > 0 && (
          <div style={{position: 'absolute', left: 0, right: 0, top: 150, display: 'flex', justifyContent: 'center', gap: 70, fontFamily: MONO, fontSize: 24, color: CUE, opacity: anchors}}>
            <span>↑ Appear</span><span>↑ Tween · Set</span><span style={{color: MUTED}}>end · Disappear ↑</span>
          </div>
        )}
      </div>
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, opacity: ghost * (1 - anchors)}}>
        {SALES.map((v, i) => <rect key={i} x={X0 + i * (W + GAP)} y={BASE - v * UNIT} width={W} height={v * UNIT} rx={6} fill="none" stroke={FAINT} strokeWidth={2} strokeDasharray="6 8" />)}
        <text x={X0 + 2 * (W + GAP)} y={BASE + 60} textAnchor="middle" fontFamily="var(--vt-mono)" fontSize={24} fill="var(--vt-muted)">{useText('bars-label', '<Bars />  ordinary React')}</text>
      </svg>
      <div {...chart} style={{...chart.style, position: 'absolute', inset: 0}}>
        <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
          <line x1={X0 - 30} y1={BASE} x2={X0 + 4 * (W + GAP) - 20} y2={BASE} stroke={MUTED} strokeWidth={2} />
          {bars.map((v, i) => <rect key={i} x={X0 + i * (W + GAP)} y={BASE - v * UNIT} width={W} height={v * UNIT} rx={6} fill={i === 3 ? CUE : DATA} opacity={i === 3 ? 1 : 0.7} />)}
          {label !== '' && <text x={X0 + 3 * (W + GAP) + W / 2} y={BASE - bars[3] * UNIT - 22} textAnchor="middle" fontFamily="var(--vt-sans)" fontWeight={800} fontSize={48} fill="var(--vt-text)">{label}</text>}
        </svg>
      </div>
    </div>
  );
}

// ---- what can hang on a word ---------------------------------------------------------

const KINDS = [
  {id: 'kind-react', word: 'a React element', label: '<React />', code: '<Part><Bars /></Part>'},
  {id: 'kind-video', word: 'a video clip', label: '“a video clip”', code: '<Asset kind="video" />'},
  {id: 'kind-music', word: 'the music', label: '“the music”', code: '<Sound loop />'},
  {id: 'kind-sfx', word: 'a sound effect', label: '“a sound effect”', code: '<Sound asset="ding" />'},
];

/** The four kinds of thing a part can be, each under the words that name it: a React drawing, a video clip, the music, a sound effect */
function Kinds() {
  const t = useDocTime();
  const cover = useAsset('oldest-cover');
  const XS = [270, 730, 1190, 1650];
  const tile = (k: number) => {
    if (k === 0) return (
      <svg width={300} height={170}>{[1, 1.3, 1.6, 2.6].map((v, i) => <rect key={i} x={30 + i * 64} y={150 - v * 52} width={44} height={v * 52} rx={5} fill={i === 3 ? CUE : DATA} opacity={i === 3 ? 1 : 0.7} />)}</svg>
    );
    if (k === 1) return (
      <div style={{position: 'relative', width: 300, height: 170, overflow: 'hidden', borderRadius: 10}}>
        <img src={cover} style={{width: 300, height: 170, objectFit: 'cover', transform: `scale(${1.05 + 0.08 * frac(t / 6)})`}} />
        <div style={{position: 'absolute', left: 0, bottom: 0, height: 5, width: `${100 * frac(t / 6)}%`, background: CUE}} />
      </div>
    );
    if (k === 2) return (
      <svg width={300} height={170}>{Array.from({length: 30}, (_, i) => {
        const h = 20 + 50 * Math.abs(Math.sin(i * 0.7 + t * 3)) * (0.5 + 0.5 * Math.abs(Math.sin(i * 0.23 + t)));
        return <line key={i} x1={10 + i * 9.6} y1={85 - h / 2} x2={10 + i * 9.6} y2={85 + h / 2} stroke={VIOLET} strokeWidth={5} strokeLinecap="round" />;
      })}</svg>
    );
    return (
      <svg width={300} height={170}>
        <line x1={10} y1={85} x2={290} y2={85} stroke={FAINT} strokeWidth={3} />
        {[-3, -2, -1, 0, 1, 2, 3].map((d) => <line key={d} x1={150 + d * 12} y1={85 - (70 - Math.abs(d) * 20)} x2={150 + d * 12} y2={85 + (70 - Math.abs(d) * 20)} stroke={AMBER} strokeWidth={6} strokeLinecap="round" />)}
      </svg>
    );
  };
  return (
    <div style={{position: 'absolute', inset: 0}}>
      {KINDS.map((k, i) => (
        <Obj key={k.id} id={k.id} style={{position: 'absolute', left: XS[i] - 200, top: 330, width: 400, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
          <div style={{fontFamily: i === 0 ? MONO : SANS, fontWeight: 700, fontSize: 38, color: CUE, whiteSpace: 'pre'}}>{useText(k.id, k.label)}</div>
          <svg width={4} height={90}><line x1={2} y1={0} x2={2} y2={90} stroke={CUE} strokeWidth={3} /></svg>
          <div style={{padding: 20, borderRadius: 18, background: PANEL, border: `2px solid ${BORDER}`}}>{tile(i)}</div>
          <div style={{marginTop: 22, fontFamily: MONO, fontSize: 24, color: MUTED, whiteSpace: 'pre'}}>{k.code}</div>
        </Obj>
      ))}
    </div>
  );
}

// ---- the long film: The Oldest Light, as its engine timed it -----------------------

const MOVEMENTS = [
  {name: 'I · The Fog', from: 0, to: 3, color: '#6c8cbf'},
  {name: 'II · Against the Current', from: 3, to: 6, color: '#7fa7a0'},
  {name: 'III · First Light', from: 6, to: 9, color: '#c9a35c'},
  {name: 'IV · Arrival', from: 9, to: 13, color: '#b57f9e'},
];
const BAR = 10 / 3; // 72 BPM, four beats a bar
const L0 = 220, L1 = 1760;
const SX = (s: number) => L0 + (s / 430) * (L1 - L0);

/** The first long film made this way, as it was published: its cover and its title */
function Cover() {
  const img = useAsset('oldest-cover');
  const avatar = useAsset('suosi-avatar');
  return (
    <div style={{position: 'absolute', left: 960, top: 150, transform: 'translateX(-50%)', width: 1020}}>
      <div style={{position: 'relative'}}>
        <img src={img} style={{width: 1020, height: 574, borderRadius: 16, display: 'block', boxShadow: '0 30px 90px rgba(0,0,0,0.55)'}} />
        <div style={{position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: 110, height: 78, borderRadius: 22, background: 'rgba(11,14,20,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <svg width={36} height={40}><path d="M2 2l32 18-32 18z" fill="#fff" /></svg>
        </div>
        <div style={{position: 'absolute', right: 14, bottom: 14, padding: '4px 10px', borderRadius: 6, background: 'rgba(0,0,0,0.8)', fontFamily: MONO, fontSize: 22, color: '#fff'}}>7:06</div>
      </div>
      <div style={{marginTop: 24, fontFamily: SANS, fontWeight: 700, fontSize: 40, color: TEXT}}>{useText('cover-title', 'The Oldest Light')}</div>
      <div style={{marginTop: 14, display: 'flex', alignItems: 'center', gap: 16}}>
        <img src={avatar} style={{width: 56, height: 56, borderRadius: 28, display: 'block'}} />
        <div>
          <div style={{fontFamily: SANS, fontSize: 28, color: TEXT}}>{useText('cover-by', 'made by')} <b>SuoSi</b> <span style={{color: MUTED}}>{useText('cover-langs', '· English and Chinese')}</span></div>
          <div style={{fontFamily: MONO, fontSize: 24, color: CUE, marginTop: 2}}>youtu.be/NwVljptltZg</div>
        </div>
      </div>
    </div>
  );
}

/** The Oldest Light as a document (its built English document): each scene with its lines, animations and sounds, and one scene opened line by line */
const OUTLINE: Array<[string, number, number, number]> = [
  ['fog', 0, 9, 1], ['soup', 7, 21, 7], ['clearing', 0, 2, 1], ['depart', 1, 11, 3], ['current', 7, 15, 2], ['turn', 0, 11, 2], ['balloon', 7, 11, 2],
  ['meanwhile', 1, 7, 1], ['lights', 0, 5, 67], ['approach', 0, 9, 4], ['noise', 9, 21, 21], ['year', 2, 7, 8], ['now', 5, 15, 4],
];
const SOUP: Array<[string, number, number]> = [
  ['This is the universe when it was less than…', 0, 0],
  ['There were no stars yet. The whole universe…', 2, 0],
  ['Have you ever seen a street lamp in thick fog?', 3, 1],
  ['Its light scatters off countless tiny droplets…', 0, 0],
  ['The early universe was like that. Light kept…', 3, 0],
  ['Then, as the universe cooled to around 3,000…', 6, 5],
  ['The fog lifted. For the first time, light…', 5, 0],
];

function Outline() {
  const rows = useProp('rows', 0);
  const open = useProp('open', 0);
  const marks = (n: number, c: string, shape: 'dot' | 'note') => Array.from({length: Math.min(n, 9)}, (_, k) => (
    <span key={k} style={{display: 'inline-block', width: 12, height: 12, marginLeft: 5, borderRadius: shape === 'dot' ? 6 : 2, background: c, transform: shape === 'note' ? 'rotate(45deg)' : undefined}} />
  ));
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <div style={{position: 'absolute', left: 110, top: 150, fontFamily: MONO, fontSize: 28, color: TEXT, whiteSpace: 'pre'}}>
        {'The Oldest Light · doc.tsx   '}<span style={{color: MUTED}}>13 scenes · 39 lines · </span><span style={{color: CUE}}>144 animations</span><span style={{color: MUTED}}> · </span><span style={{color: AMBER}}>123 sounds</span>
      </div>
      <div style={{position: 'absolute', left: 110, top: 220, width: 560}}>
        {OUTLINE.map(([id, l, a, so], i) => (
          <div key={id} style={{display: 'flex', alignItems: 'center', height: 50, padding: '0 16px', borderRadius: 10, opacity: smooth(rows * 13 - i),
            background: id === 'soup' && open > 0 ? tint(CUE, 14) : 'transparent', fontFamily: MONO, fontSize: 24, color: TEXT}}>
            <span style={{width: 40, color: MUTED}}>{String(i + 1).padStart(2, '0')}</span>
            <span style={{width: 190}}>{id}</span>
            <span style={{width: 110, color: MUTED}}>{l ? `${l} lines` : 'music'}</span>
            <span style={{color: CUE, width: 80}}>{`◆ ${a}`}</span>
            <span style={{color: AMBER}}>{`♪ ${so}`}</span>
          </div>
        ))}
      </div>
      <div style={{position: 'absolute', left: 720, top: 220, width: 1100, height: 650, boxSizing: 'border-box', padding: '22px 30px', borderRadius: 18, background: PANEL, border: `2px solid ${BORDER}`, opacity: open}}>
        <div style={{fontFamily: MONO, fontSize: 22, color: MUTED, marginBottom: 14}}>{'<Scene id="soup">'}</div>
        {SOUP.map(([text, a, so], i) => (
          <div key={i} style={{display: 'flex', alignItems: 'center', gap: 16, padding: '14px 0', borderTop: i ? `1px solid ${BORDER}` : 'none', opacity: smooth(open * 8 - i)}}>
            <span style={{fontFamily: MONO, fontSize: 20, color: MUTED, width: 40}}>{`l${i + 1}`}</span>
            <span style={{flex: 1, fontFamily: SANS, fontSize: 25, color: TEXT, whiteSpace: 'nowrap'}}>{text}</span>
            <span style={{width: 190, textAlign: 'right'}}>{marks(a, CUE, 'dot')}{marks(so, AMBER, 'note')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LongFilm() {
  const strip = useProp('strip', 0);
  const mov = useProp('mov', 0);
  const zhRow = useProp('zh', 0);
  const lines = useProp('lines', 0);
  const dots = useProp('dots', 0);
  const grow = useProp('grow', 0);
  const calm = useProp('calm', 0);
  const bars = useProp('bars', 0);
  const snap = useProp('snap', 0);
  const both = useProp('both', 0);
  const total = useProp('total', 0);
  const zoom = useProp('zoom', 0);
  const [, soupFrom, soupTo] = OLDEST.en.scenes[1];
  const soupLines = OLDEST.en.lines.map((l, i) => ({i, from: l[0], to: l[1]})).filter((l) => l.from >= soupFrom - 0.01 && l.to <= soupTo + 0.01);
  const GROW_LINE = soupLines[1].i; // the second line of "soup"
  const shift = BAR * smooth(grow);
  const row = (lang: 'en' | 'zh', y: number, a: number, live: boolean) => {
    const d = OLDEST[lang];
    const growAt = d.lines[GROW_LINE][1];
    const sh = (t: number) => (live && t >= growAt - 0.01 ? t + shift : t);
    const end = sh(d.scenes[d.scenes.length - 1][2]);
    return (
      <g opacity={a}>
        <rect x={L0} y={y - 26} width={Math.max(0, (SX(end) - L0) * smooth(strip))} height={52} rx={8} fill={tint(TEXT, 4)} stroke={BORDER} strokeWidth={2} />
        {d.scenes.map(([id, from, to], i) => {
          const x0 = SX(i === 0 ? from : sh(from)), x1 = SX(sh(to) + (live && i === 1 ? shift : 0) * 0 );
          if (x0 > L0 + (L1 - L0) * smooth(strip)) return null;
          const m = MOVEMENTS.find((mv) => i >= mv.from && i < mv.to)!;
          return (
            <g key={id}>
              <rect x={x0 + 2} y={y - 22} width={Math.max(0, x1 - x0 - 4)} height={44} rx={6} fill={m.color} opacity={0.18 + 0.5 * mov} />
              <line x1={x1} y1={y - 34} x2={x1} y2={y + 34} stroke={TEXT} strokeWidth={snap * (lang === 'en' || both > 0 ? 3 : 0)} opacity={lang === 'en' ? snap : both} />
            </g>
          );
        })}
        {d.lines.map(([from, to], i) => {
          const grown = live && i === GROW_LINE ? to + shift : sh(to);
          const x0 = SX(sh(from)), x1 = SX(grown);
          return (
            <g key={i} opacity={lines}>
              <rect x={x0} y={y - 6} width={Math.max(2, x1 - x0)} height={12} rx={3} fill={live && i === GROW_LINE && grow > 0 ? GOOD : TEXT} opacity={0.85} />
              <circle cx={lerp(x0, x1, 0.3 + 0.4 * hash(i, 9))} cy={y - 16} r={5} fill={CUE} opacity={dots} />
            </g>
          );
        })}
        <text x={L0 - 24} y={y + 10} textAnchor="end" fontFamily={lang === 'zh' ? '"Noto Sans SC", var(--vt-sans)' : 'var(--vt-sans)'} fontWeight={700} fontSize={30} fill="var(--vt-text)">{lang === 'zh' ? '中文' : 'EN'}</text>
        <text x={SX(end) + 18} y={y + 10} fontFamily="var(--vt-mono)" fontSize={28} fill="var(--vt-muted)" opacity={total}>{lang === 'zh' ? '6:43' : live && grow > 0.5 ? '7:09' : '7:06'}</text>
      </g>
    );
  };
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
      {/* the music's bars, a line every four beats at seventy-two a minute */}
      {Array.from({length: 130}, (_, i) => i * BAR).filter((t) => t <= 430).map((t, i) => (
        <line key={i} x1={SX(t)} y1={360} x2={SX(t)} y2={700} stroke={DATA} strokeWidth={1.5} opacity={0.35 * bars} />
      ))}
      {MOVEMENTS.map((m) => {
        const d = OLDEST.en;
        const x0 = SX(d.scenes[m.from][1]), x1 = SX(d.scenes[m.to - 1][2]);
        return (
          <g key={m.name} opacity={mov}>
            <line x1={x0 + 4} y1={340} x2={x1 - 4} y2={340} stroke={m.color} strokeWidth={4} />
            <text x={x0 + 4} y={MOVEMENTS.indexOf(m) % 2 ? 278 : 318} fontFamily="var(--vt-sans)" fontSize={28} fontWeight={700} fill={m.color}>{m.name}</text>
          </g>
        );
      })}
      {row('en', 450, 1, true)}
      {row('zh', 590, zhRow, false)}
      {/* the zoom: scene two, "soup", line by line, with the dot of each animation on its line */}
      <g opacity={zoom}>
        {(() => {
          const ZX = (t: number) => 260 + ((t - soupFrom) / (soupTo - soupFrom + 6)) * 1400;
          return (
            <g>
              <path d={`M${SX(soupFrom)} 478 L260 700 M${SX(soupTo)} 478 L1660 700`} stroke={FAINT} strokeWidth={2} strokeDasharray="6 8" fill="none" />
              <rect x={240} y={700} width={1440} height={150} rx={14} fill={tint(PANEL, 92)} stroke={BORDER} strokeWidth={2} />
              <text x={262} y={736} fontFamily="var(--vt-mono)" fontSize={24} fill="var(--vt-muted)">{useText('soup-label', 'scene 2 · soup · its lines')}</text>
              {soupLines.map((l, k) => {
                const grown = l.i === GROW_LINE;
                const sh = l.i > GROW_LINE ? shift : 0;
                const x0 = ZX(l.from + sh), x1 = ZX(l.to + sh + (grown ? shift : 0));
                return (
                  <g key={l.i}>
                    <rect x={x0} y={780} width={Math.max(4, x1 - x0 - 8)} height={18} rx={4} fill={grown && grow > 0 ? GOOD : TEXT} opacity={0.85} />
                    <circle cx={lerp(x0, x1, 0.3 + 0.4 * hash(l.i, 9))} cy={764} r={8} fill={CUE} />
                    <line x1={lerp(x0, x1, 0.3 + 0.4 * hash(l.i, 9))} y1={772} x2={lerp(x0, x1, 0.3 + 0.4 * hash(l.i, 9))} y2={780} stroke={CUE} strokeWidth={2} />
                    {k === 0 && <text x={x0} y={828} fontFamily="var(--vt-mono)" fontSize={20} fill="var(--vt-muted)">a line</text>}
                  </g>
                );
              })}
            </g>
          );
        })()}
      </g>
      <g opacity={calm}>
        <text x={960} y={910} textAnchor="middle" fontFamily="var(--vt-sans)" fontSize={34} fill="var(--vt-good)">one line longer · the later lines move, each animation still on its word</text>
      </g>
      <g opacity={snap}>
        <text x={L1} y={740} textAnchor="end" fontFamily="var(--vt-mono)" fontSize={26} fill="var(--vt-data)">{useText('bpm-label', '72 BPM · every scene ends on a bar')}</text>
      </g>
    </svg>
  );
}

// ---- the workflow ------------------------------------------------------------------

const STATIONS = ['script', 'voice', 'frames', 'checks', 'captions', 'play · render'];
const SX6 = (i: number) => 230 + i * 292;

/** The station names, from the overlay's `station-1` … `station-6` when it carries them */
function useStations() {
  return STATIONS.map((s, i) => useText(`station-${i + 1}`, s));
}

function Flow() {
  const names = useStations();
  const draw = useProp('draw', 0);
  const step = useProp('step', 0);
  const last = useProp('last', 0);
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
        <line x1={SX6(0)} y1={820} x2={lerp(SX6(0), SX6(5), smooth(draw))} y2={820} stroke={BORDER} strokeWidth={4} />
        <line x1={SX6(0)} y1={820} x2={SX6(Math.max(0, Math.min(5, step - 1)))} y2={820} stroke={CUE} strokeWidth={4} opacity={step > 1 ? 1 : 0} />
        {STATIONS.map((s, i) => {
          const on = step >= i + 1 || (i === 5 && last > 0);
          const vis = smooth(draw * 6 - i);
          return (
            <g key={s} opacity={vis}>
              {on && <circle cx={SX6(i)} cy={820} r={46} fill={CUE} opacity={0.18} />}
              <circle cx={SX6(i)} cy={820} r={34} fill={on ? CUE : BG} stroke={on ? CUE : MUTED} strokeWidth={3} />
              <StationIcon i={i} x={SX6(i)} y={820} color={on ? '#14100c' : 'var(--vt-muted)'} />
              <text x={SX6(i)} y={900} textAnchor="middle" fontFamily="var(--vt-mono)" fontSize={26} fill={on ? 'var(--vt-text)' : 'var(--vt-muted)'}>{names[i]}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** The symbol inside a workflow station: a page, a waveform, a film frame, a tick, a caption, a play button */
function StationIcon({i, x, y, color}: {i: number; x: number; y: number; color: string}) {
  const st = {fill: 'none', stroke: color, strokeWidth: 3, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const};
  if (i === 0) return <g {...st}><path d={`M${x - 11} ${y - 15}h15l7 7v23h-22z`} /><path d={`M${x - 6} ${y - 2}h12M${x - 6} ${y + 5}h12`} /></g>;
  if (i === 1) return <g {...st}>{[-12, -6, 0, 6, 12].map((dx, k) => <path key={k} d={`M${x + dx} ${y - [5, 11, 15, 9, 4][k]}v${2 * [5, 11, 15, 9, 4][k]}`} />)}</g>;
  if (i === 2) return <g {...st}><rect x={x - 16} y={y - 12} width={32} height={24} rx={3} /><path d={`M${x - 16} ${y - 5}h32M${x - 16} ${y + 5}h32`} /></g>;
  if (i === 3) return <g {...st}><path d={`M${x - 13} ${y + 1}l9 9l17 -19`} strokeWidth={4} /></g>;
  if (i === 4) return <text x={x} y={y + 8} textAnchor="middle" fontFamily="var(--vt-sans)" fontWeight={800} fontSize={22} fill={color}>CC</text>;
  return <path d={`M${x - 8} ${y - 13}l20 13l-20 13z`} fill={color} />;
}

/** A card above a station: what that step makes */
function Card({id, i, h = 560, children}: {id: string; i: number; h?: number; children: React.ReactNode}) {
  const x = i % 2 ? 990 : 110;
  const names = useStations();
  return (
    <Obj id={id} style={{position: 'absolute', left: x, top: 130, width: 820, height: Math.min(h, 620), boxSizing: 'border-box', padding: 34, borderRadius: 22, background: PANEL, border: `2px solid ${BORDER}`, boxShadow: '0 30px 80px rgba(0,0,0,0.4)', overflow: 'hidden'}}>
      <div style={{fontFamily: MONO, fontSize: 22, letterSpacing: '0.08em', textTransform: 'uppercase', color: CUE, marginBottom: 22}}>{`${i + 1} · ${names[i]}`}</div>
      {children}
    </Obj>
  );
}

function FlowCards() {
  const frames = useFrames();
  const capLine = useText('cap-line', 'Rewrite a line, and the picture follows.');
  const capAlt = [useText('cap-alt-1', 'Réécrivez une ligne, l’image suit.'), useText('cap-alt-2', '一行を書き換えれば、絵がついてくる。'), useText('cap-alt-3', '改写一句，画面跟着走。')];
  const voiceWords = useText('voice-words', 'rewrite a line and the picture follows').split(' ');
  const issues = useProp('issues', 0);
  const flash = useProp('flash', 0);
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <Card id="card-script" i={0}>
        <div style={{fontFamily: MONO, fontSize: 25, lineHeight: 1.7, whiteSpace: 'pre', color: TEXT}}>
          <span style={{color: CODE.tag}}>{'<Scene '}</span><span style={{color: CODE.attr}}>id</span>=<span style={{color: CODE.str}}>"proof"</span><span style={{color: CODE.tag}}>{'>\n'}</span>
          {'  '}<span style={{color: CODE.tag}}>{'<Line '}</span><span style={{color: CODE.attr}}>id</span>=<span style={{color: CODE.str}}>"l18"</span><span style={{color: CODE.tag}}>{'>'}</span>{useText('script-line', 'Rewrite a line…')}<span style={{color: CODE.tag}}>{'</Line>\n'}</span>
          {'  '}<span style={{color: CODE.tag}}>{'<Part '}</span><span style={{color: CODE.attr}}>id</span>=<span style={{color: CODE.str}}>"rail"</span><span style={{color: CODE.tag}}>{'>'}</span>{'<Rail />'}<span style={{color: CODE.tag}}>{'</Part>\n'}</span>
          {'  '}<span style={{color: CODE.tag}}>{'<Tween '}</span><span style={{color: CODE.attr}}>target</span>=<span style={{color: CODE.str}}>"rail"</span>{' to={{ins2: 1}}\n         '}<span style={{color: CUE}}>{`word="${useText('script-anchor', 'rewrite a line')}"`}</span><span style={{color: CODE.tag}}>{' />\n'}</span>
          <span style={{color: CODE.tag}}>{'</Scene>'}</span>
        </div>
      </Card>
      <Card id="card-voice" i={1}>
        <div style={{fontFamily: MONO, fontSize: 26, color: MUTED, marginBottom: 26}}>{useText('voice-label', 'l18 · spoken, then timed word by word')}</div>
        <svg width={752} height={300}>
          {voiceWords.map((wd, i, all) => {
            const x0 = 6 + (i / all.length) * 740, x1 = 6 + ((i + 1) / all.length) * 740 - 12;
            return (
              <g key={i}>
                {Array.from({length: Math.max(3, Math.round((x1 - x0) / 10))}, (_, b) => {
                  const x = x0 + b * 10 + 5, h = 20 + 90 * Math.abs(Math.sin(b * 0.8 + i * 2.1));
                  return <line key={b} x1={x} y1={120 - h / 2} x2={x} y2={120 + h / 2} stroke={DATA} strokeWidth={5} strokeLinecap="round" />;
                })}
                <line x1={x0} y1={200} x2={x0} y2={232} stroke={CUE} strokeWidth={3} />
                <text x={x0 + 4} y={262} fontFamily="var(--vt-mono)" fontSize={21} fill="var(--vt-text)">{wd}</text>
                <text x={x0 + 6} y={292} fontFamily="var(--vt-mono)" fontSize={20} fill="var(--vt-muted)">{(1.6 + i * 0.36).toFixed(2)}</text>
              </g>
            );
          })}
        </svg>
      </Card>
      <Card id="card-frames" i={2}>
        <div style={{fontFamily: MONO, fontSize: 26, color: MUTED, marginBottom: 20}}>visotalk sheet doc.tsx</div>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14}}>
          {frames.map((src, i) => <img key={i} src={src} style={{width: '100%', aspectRatio: '16 / 9', borderRadius: 8, border: `2px solid ${BORDER}`, display: 'block', boxSizing: 'border-box'}} />)}
        </div>
      </Card>
      <Card id="card-checks" i={3}>
        <div style={{fontFamily: MONO, fontSize: 30, lineHeight: 1.75, whiteSpace: 'pre', color: TEXT}}>
          <span style={{color: MUTED}}>$ </span>{'visotalk qa doc.tsx\n'}
          <span style={{opacity: issues}}><span style={{color: BAD}}>✗ text-overlap </span>{'  proof/l18\n'}<span style={{color: MUTED}}>{'  "picture" drawn over "follows"\n'}</span></span>
          <span style={{opacity: flash}}><span style={{color: BAD}}>✗ visible.brief</span>{'  document/l25\n'}<span style={{color: MUTED}}>{'  label on screen for 1.4 s'}</span></span>
        </div>
      </Card>
      <Card id="card-captions" i={4} h={620}>
        <div style={{display: 'flex', flexDirection: 'column', gap: 20}}>
          <div style={{fontFamily: MONO, fontSize: 24, color: TEXT, whiteSpace: 'pre'}}><span style={{color: CODE.tag}}>{'<Line '}</span>{`id="l18">\n  ${capLine}`}</div>
          <Obj id="out-caption" style={{alignSelf: 'flex-start', padding: '12px 22px', borderRadius: 10, background: 'rgba(0,0,0,0.6)', fontFamily: SANS, fontSize: 30, color: '#fff'}}>{capLine}</Obj>
          <Obj id="out-srt" style={{fontFamily: MONO, fontSize: 24, lineHeight: 1.5, color: MUTED, whiteSpace: 'pre'}}>{`18\n00:01:31,240 --> 00:01:33,610\n${capLine}`}</Obj>
          <Obj id="out-zh" style={{display: 'flex', flexDirection: 'column', gap: 8, fontSize: 28, color: TEXT}}>
            <span style={{fontFamily: SANS}}>{capAlt[0]}</span>
            <span style={{fontFamily: '"Noto Sans JP", var(--vt-sans)'}}>{capAlt[1]}</span>
            <span style={{fontFamily: '"Noto Sans SC", var(--vt-sans)'}}>{capAlt[2]}</span>
          </Obj>
        </div>
      </Card>
    </div>
  );
}

/** Eight moments of this film, in order: the frames the agent looks at, and the ones the close calls back */
function useFrames() {
  return [useAsset('frame-1'), useAsset('frame-2'), useAsset('frame-3'), useAsset('frame-4'), useAsset('frame-5'), useAsset('frame-6'), useAsset('frame-7'), useAsset('frame-8')];
}

// ---- the player on the web ---------------------------------------------------------

/** The little film the player plays: three sentences, the seconds each starts and ends, and the line of its source that says it */
const PLAY = [
  {say: 'The Moon circles Earth.', from: 0, to: 3},
  {say: 'The Sun lights half of it.', from: 3, to: 6},
  {say: 'A month is one full orbit.', from: 6, to: 9},
];

/**
 * The player on visotalk.dev, playing: a sky whose Moon moves with the player's own clock (`pt`, seconds), the sentence being said, the
 * seek bar, and the document below with the line being played lit. Pausing stops `pt`; jumping to a sentence sets it.
 */
function WebPlayer() {
  const pt = useProp('pt', 0);
  const nofile = useProp('nofile', 0);
  const live = useProp('live', 0);
  const pause = useProp('pause', 0);
  const jump = useProp('jump', 0);
  const src = useProp('src', 0);
  const L = 580, T = 170, IW = 760, SH = 428, total = 9;
  const says = PLAY.map((p, i) => useText(`play-${i + 1}`, p.say));
  const sep = useText('play-sep', ' ');
  const k = Math.max(0, PLAY.findIndex((p) => pt >= p.from && pt < p.to));
  const cur = PLAY[k];
  const words = says[k].split(' ');
  const said = (pt - cur.from) / (cur.to - cur.from - 0.6) * words.length;
  const ex = L + 330, ey = T + 200, a = pt * 0.7 + 2.4, mm = (v: number) => `0:${String(Math.floor(v)).padStart(2, '0')}`;
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <div style={{position: 'absolute', left: L - 20, top: T - 64, width: IW + 40, height: 760 + 84, borderRadius: 18, background: PANEL2, border: `2px solid ${BORDER}`, boxShadow: '0 40px 100px rgba(0,0,0,0.25)'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 10, height: 44, padding: '0 18px'}}>
          {['#ff6b6b', '#ffd166', '#4ade80'].map((c) => <span key={c} style={{width: 13, height: 13, borderRadius: 7, background: c, opacity: 0.8}} />)}
          <span style={{marginLeft: 18, flex: 1, height: 28, borderRadius: 8, background: PANEL, fontFamily: MONO, fontSize: 18, color: MUTED, display: 'flex', alignItems: 'center', paddingLeft: 14}}>visotalk.dev/examples/moon</span>
        </div>
      </div>
      {/* the film */}
      <div style={{position: 'absolute', left: L, top: T, width: IW, height: SH, borderRadius: 6, background: '#0b0e14', overflow: 'hidden'}}>
        <svg width={IW} height={SH} style={{position: 'absolute', inset: 0}}>
          <circle cx={ex - L} cy={ey - T} r={130} fill="none" stroke="rgba(230,235,242,0.18)" strokeWidth={2} strokeDasharray="3 8" />
          <Body id="earth" x={ex - L} y={ey - T} r={58} />
          <Body id="sun" x={IW - 110} y={110} r={44} />
          <Body id={pt >= 3 ? 'half' : 'moon'} x={ex - L + 130 * Math.cos(a)} y={ey - T + 130 * Math.sin(a)} r={26} />
        </svg>
        <div style={{position: 'absolute', left: 0, right: 0, bottom: 22, display: 'flex', justifyContent: 'center'}}>
          <span style={{padding: '8px 18px', borderRadius: 8, background: 'rgba(13,15,20,0.86)', fontFamily: SANS, fontSize: 26, whiteSpace: 'pre'}}>
            {words.map((w, i) => <span key={i} style={{color: i < said ? '#74b9f6' : '#fff'}}>{(i ? sep : '') + w}</span>)}
          </span>
        </div>
      </div>
      {/* the controls */}
      <div style={{position: 'absolute', left: L, top: T + SH + 10, width: IW, height: 40, display: 'flex', alignItems: 'center', gap: 16}}>
        {pause > 0.5
          ? <svg width={22} height={24}><path d="M3 2l18 10-18 10z" fill={TEXT} /></svg>
          : <svg width={22} height={24}><rect x={3} y={2} width={6} height={20} fill={TEXT} /><rect x={13} y={2} width={6} height={20} fill={TEXT} /></svg>}
        <div style={{position: 'relative', flex: 1, height: 8, borderRadius: 4, background: tint(TEXT, 14)}}>
          {PLAY.slice(1).map((p) => <span key={p.from} style={{position: 'absolute', left: `${(p.from / total) * 100}%`, top: -3, width: 2, height: 14, background: MUTED}} />)}
          <span style={{position: 'absolute', left: 0, top: 0, height: 8, width: `${(pt / total) * 100}%`, borderRadius: 4, background: CUE}} />
          <span style={{position: 'absolute', left: `calc(${(pt / total) * 100}% - 8px)`, top: -4, width: 16, height: 16, borderRadius: 8, background: CUE}} />
        </div>
        <span style={{fontFamily: MONO, fontSize: 20, color: MUTED}}>{`${mm(pt)} / ${mm(total)}`}</span>
      </div>
      {/* the document, the line being played lit */}
      <div style={{position: 'absolute', left: L, top: T + SH + 64, width: IW, height: 760 - SH - 64, boxSizing: 'border-box', padding: '14px 20px', borderRadius: 6, background: PANEL, fontFamily: MONO, fontSize: 21, lineHeight: 1.65, whiteSpace: 'pre'}}>
        <div style={{color: CODE.tag}}>{'<Scene id="moon">'}</div>
        {PLAY.map((p, i) => (
          <div key={i} style={{margin: '0 -20px', padding: '0 20px', background: i === k ? tint(CUE, 16) : 'transparent', boxShadow: i === k ? `inset 4px 0 0 ${CUE}` : 'none'}}>
            <span style={{color: CODE.tag}}>{'  <Line '}</span><span style={{color: CODE.attr}}>id</span>=<span style={{color: CODE.str}}>{`"l${i + 1}"`}</span><span style={{color: CODE.tag}}>{'>'}</span><span style={{color: TEXT}}>{says[i].split(' ').join(sep)}</span>
          </div>
        ))}
        <div><span style={{color: CODE.tag}}>{'  <Appear '}</span><span style={{color: CODE.attr}}>target</span>=<span style={{color: CODE.str}}>"moon"</span> <span style={{color: k === 0 ? CUE : CODE.attr}}>{`word="${useText('play-anchor', 'Moon')}"`}</span><span style={{color: CODE.tag}}>{' />'}</span></div>
      </div>
      <div style={{position: 'absolute', left: L + 24, top: T + 20, padding: '8px 16px', borderRadius: 8, background: CUE, color: '#14100c', fontFamily: MONO, fontSize: 22, fontWeight: 700, opacity: live}}>LIVE · doc.tsx</div>
      <div style={{position: 'absolute', left: L + IW / 2 - 50, top: T + 150, width: 100, height: 100, borderRadius: 50, background: 'rgba(11,14,20,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, opacity: pause}}>
        <span style={{width: 14, height: 44, background: '#fff', borderRadius: 3}} /><span style={{width: 14, height: 44, background: '#fff', borderRadius: 3}} />
      </div>
      <div style={{position: 'absolute', left: L + IW + 50, top: T + SH + 132, fontFamily: SANS, fontSize: 34, color: CUE, opacity: jump}}>{useText('play-jump', '← jump to a sentence')}</div>
      <div style={{position: 'absolute', left: L + IW + 50, top: T + SH + 72, fontFamily: SANS, fontSize: 34, color: TEXT, opacity: src}}>{useText('play-src', '← its source, as it plays')}</div>
      <div style={{position: 'absolute', left: 150, top: T + 160, width: 360, fontFamily: SANS, fontSize: 34, lineHeight: 1.35, color: TEXT, opacity: nofile}}>
        <span style={{fontFamily: MONO, color: BAD, textDecoration: 'line-through'}}>film.mp4</span><br />{useText('play-nofile', 'the page plays the film itself')}
      </div>
    </div>
  );
}

function Mp4() {
  const frames = useProp('frames', 0);
  const shots = useFrames();
  return (
    <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 46}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 30, padding: '30px 44px', borderRadius: 20, background: PANEL, border: `2px solid ${BORDER}`}}>
        <svg width={70} height={86}><path d="M4 4h44l18 18v60H4z" fill="none" stroke={TEXT} strokeWidth={4} /><path d="M26 34l20 12-20 12z" fill={CUE} /></svg>
        <div>
          <div style={{fontFamily: MONO, fontSize: 44, color: TEXT}}>visotalk-intro.mp4</div>
          <div style={{fontFamily: MONO, fontSize: 26, color: MUTED, marginTop: 8}}>1920 × 1080 · 30 fps · captions.srt</div>
        </div>
      </div>
      <div style={{display: 'flex', gap: 14, opacity: frames}}>
        {shots.map((src, i) => (
          <img key={i} src={src} style={{width: 192, height: 108, borderRadius: 6, border: `2px solid ${BORDER}`, boxSizing: 'border-box', opacity: smooth(frames * 8 - i)}} />
        ))}
      </div>
    </div>
  );
}

// ---- the close -----------------------------------------------------------------------

const ECHO = [
  {w: 'code', c: TEXT}, {w: 'timeline', c: AMBER}, {w: 'light', c: CUE}, {w: 'voice', c: DATA},
  {w: 'language', c: TEXT}, {w: 'tags', c: VIOLET}, {w: 'music', c: '#c9a35c'}, {w: 'page', c: GOOD},
];

function Echo() {
  const words = ECHO.map((e) => useText(`echo-${e.w}`, e.w));
  const threads = useProp('threads', 0);
  const shots = useFrames();
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
        {ECHO.map((e, i) => {
          const x = 200 + i * 217, k = smooth(threads * 8 - i);
          return <line key={e.w} x1={x} y1={510} x2={x} y2={lerp(510, 672, k)} stroke="var(--vt-faint)" strokeWidth={3} strokeDasharray="2 9" strokeLinecap="round" />;
        })}
      </svg>
      {ECHO.map((e, i) => {
        const x = 200 + i * 217, k = smooth(threads * 8 - i);
        return (
          <div key={e.w}>
            <div style={{position: 'absolute', left: x, top: 448, transform: 'translateX(-50%)', fontFamily: MONO, fontWeight: 700, fontSize: 40, color: k > 0.5 ? CUE : TEXT}}>{words[i]}</div>
            <img src={shots[i]} style={{position: 'absolute', left: x - 100, top: 680, width: 200, height: 112, borderRadius: 6, border: `3px solid ${e.c}`, boxSizing: 'border-box', opacity: k}} />
          </div>
        );
      })}
    </div>
  );
}

function Command() {
  const chars = useProp('chars', 0);
  const cmd = 'npx skills add visotalk/visotalk -g';
  return (
    <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <div style={{width: 1180, borderRadius: 18, background: PANEL, border: `2px solid ${BORDER}`, boxShadow: '0 40px 100px rgba(0,0,0,0.45)'}}>
        <div style={{display: 'flex', gap: 10, padding: '18px 22px'}}>{['#ff6b6b', '#ffd166', '#4ade80'].map((c) => <span key={c} style={{width: 13, height: 13, borderRadius: 7, background: c, opacity: 0.8}} />)}</div>
        <div style={{padding: '18px 44px 46px', fontFamily: MONO, fontSize: 50, color: TEXT, whiteSpace: 'pre'}}>
          <span style={{color: GOOD}}>$ </span>{typed(cmd, chars * cmd.length)}<span style={{color: CUE, opacity: chars < 1 ? 1 : 0}}>▍</span>
        </div>
      </div>
    </div>
  );
}

function EndCard() {
  const draw = useProp('draw', 0);
  return (
    <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 56}}>
      <Lockup width={800} draw={draw} />
      <Obj id="end-title" style={{marginTop: 20, fontFamily: SANS, fontWeight: 800, fontSize: 96, letterSpacing: '-0.035em', color: TEXT}}>
        {useText('rule-a', 'Narration is the new ')}<span style={{color: CUE}}>{useText('rule-b', 'timeline')}</span>{useText('rule-c', '.')}
      </Obj>
      <Obj id="end-tag" style={{display: 'flex', alignItems: 'center', gap: 28, fontSize: 38}}>
        <span style={{fontFamily: SANS, color: MUTED}}>{useText('tagline', 'An agent skill for explainer videos')}</span>
        <span style={{width: 2, height: 34, background: FAINT}} />
        <span style={{fontFamily: MONO, color: CUE}}>visotalk.dev</span>
      </Obj>
    </div>
  );
}

// ---- the document --------------------------------------------------------------------

export default <Doc id="visotalk-intro" title="Narration is the new timeline" lang="en" poster={236.6} theme="visotalk/dark" canvas="16x9"
  tokens={{fonts: {sans: '"Inter", "Noto Sans SC", "Noto Sans JP", sans-serif', mono: '"JetBrains Mono", monospace'}}}
  voice="minimax:English_Explanatory_Man" speed={1.1} exports={{variants: [{preset: "16x9"}], fps: 30, captions: "sidecar"}}>
  <Asset id="suosi-avatar" kind="image" src="suosi-avatar.jpg" source="https://avatars.githubusercontent.com/u/264293696" license={{id: "user-owned", obligations: []}} />
  <Asset id="oldest-cover" kind="image" src="oldest-cover.jpg" source="The Oldest Light (English cover, still --time 411.5)" license={{id: "user-owned", obligations: []}} />
  {/* A product-film music track, not in the repository (somebody else's track, 4 MB): python3 make-music.py fetches it into audio/music.mp3 (gitignored) */}
  <Asset id="music" kind="audio" src="audio/music.mp3" source="https://pixabay.com/music/corporate-tutorial-technology-182513/"
    license={{id: "pixabay-content", attribution: "Tutorial technology by PaulYudin, Pixabay", url: "https://pixabay.com/service/license-summary/", obligations: []}} />
  <Asset id="say-4" kind="audio" src="say-zh.mp3" source="MiniMax, Chinese (Mandarin)_News_Anchor" license={{id: "user-owned", obligations: []}} />
  <Asset id="say-3" kind="audio" src="say-ja.mp3" source="MiniMax, Japanese_KindLady" license={{id: "user-owned", obligations: []}} />
  <Asset id="say-2" kind="audio" src="say-fr.mp3" source="MiniMax, French_Female_News Anchor" license={{id: "user-owned", obligations: []}} />
  <Asset id="say-1" kind="audio" src="say-de.mp3" source="MiniMax, German_SweetLady" license={{id: "user-owned", obligations: []}} />
  <Asset id="chime" kind="audio" src="chime.mp3" source="make-music.py (generated beside the film)" license={{id: "user-owned", obligations: []}} />
  <Asset id="light" kind="audio" src="light.mp3" source="make-music.py (generated beside the film)" license={{id: "user-owned", obligations: []}} />
  <Asset id="ding" kind="audio" src="ding.mp3" source="make-music.py (generated beside the film)" license={{id: "user-owned", obligations: []}} />
  <Asset id="tick" kind="audio" src="tick.mp3" source="make-music.py (generated beside the film)" license={{id: "user-owned", obligations: []}} />
  <Asset id="miss" kind="audio" src="miss.mp3" source="make-music.py (generated beside the film)" license={{id: "user-owned", obligations: []}} />
  <Asset id="swoosh" kind="audio" src="swoosh.mp3" source="make-music.py (generated beside the film)" license={{id: "user-owned", obligations: []}} />
  <Asset id="frame-1" kind="image" src="frame-1.jpg" license={{id: "user-owned", obligations: []}} />
  <Asset id="frame-2" kind="image" src="frame-2.jpg" license={{id: "user-owned", obligations: []}} />
  <Asset id="frame-3" kind="image" src="frame-3.jpg" license={{id: "user-owned", obligations: []}} />
  <Asset id="frame-4" kind="image" src="frame-4.jpg" license={{id: "user-owned", obligations: []}} />
  <Asset id="frame-5" kind="image" src="frame-5.jpg" license={{id: "user-owned", obligations: []}} />
  <Asset id="frame-6" kind="image" src="frame-6.jpg" license={{id: "user-owned", obligations: []}} />
  <Asset id="frame-7" kind="image" src="frame-7.jpg" license={{id: "user-owned", obligations: []}} />
  <Asset id="frame-8" kind="image" src="frame-8.jpg" license={{id: "user-owned", obligations: []}} />

  <Part id="ground" z={-10}><Backdrop /></Part>
  <Part id="chapter" x={96} y={48} w={900} h={44} z={5}><Chapter /></Part>
  <Part id="rail"><Rail /></Part>
  <Part id="badge" x={1584} y={50} w={240} h={52} z={5}>{() => <div style={{opacity: 0.8}}><Lockup width={200} /></div>}</Part>

  <Scene id="problem">
    <Line id="l1">Today's AI agents are remarkably good at making videos the way they make websites: they write code that draws, and code that moves.</Line>
    <Line id="l2">But an explainer also has a voice. The moment the picture has to keep up with the narration, it falls apart.</Line>
    <Line id="l3">Most video tools are built on a timeline. Every animation is pinned to a second.</Line>
    <Line id="l4" hold={1.2}>So change one sentence, and every animation after it lands a beat late.</Line>
    <Part id="coder"><Coder /></Part>
    <Animation>
      <Appear target={["ground", "chapter"]} at="start" dur={0} />
      <Appear target="coder" at="start" dur={0.6} />
      <Tween target="coder" to={{code: 1}} line="l1" word="ai agents" until={{line: "l1", word: "code that draws", edge: "end"}} easing="linear" />
      <Tween target="coder" to={{orbit: 1}} line="l1" word="code that moves" dur={1.2} />
      <Disappear target="coder" line="l2" word="but an explainer" dur={0.5} />
      <Appear target="rail" line="l2" word="but an explainer" offset={0.5} dur={0} />
      <Appear target="script-frame" line="l2" word="also has a voice" dur={0.5} />
      <Tween target="rail" to={{type: 1}} line="l2" word="also has a voice" dur={1.3} easing="linear" />
      <Tween target="rail" to={{head: 1}} line="l2" word="the moment" dur={2.52} easing="linear" />
      {/* the playhead crosses the sentence in a fixed 2.52 s (so this holds in every language); each picture comes in as it passes the picture's word (0.13, 0.43, 0.68, 0.95 of the way) */}
      <Appear target="pic-moon" line="l2" word="the moment" offset={0.33} dur={0.25} />
      <Appear target="pic-earth" line="l2" word="the moment" offset={1.07} dur={0.25} />
      <Appear target="pic-sun" line="l2" word="the moment" offset={1.73} dur={0.25} />
      <Appear target="pic-half" line="l2" word="the moment" offset={2.38} dur={0.25} />
      <Disappear target="script-frame" line="l3" word="built on a timeline" />
      <Tween target="rail" to={{ruler: 1}} line="l3" word="built on a timeline" dur={1.1} easing="easeOut" />
      <Set target="rail" to={{pinned: 1}} line="l3" word="pinned" />
      <Tween target="rail" to={{thread: 1}} line="l3" word="pinned" dur={0.8} />
      <Tween target="rail" to={{ins: 1}} line="l4" word="change one sentence" dur={0.9} />
      <Tween target="rail" to={{late: 1}} line="l4" word="a beat late" dur={0.5} />
    </Animation>
    <Sound asset="ding" line="l2" word="the moment" offset={0.33} volume={-13} />
    <Sound asset="ding" line="l2" word="the moment" offset={1.07} volume={-13} />
    <Sound asset="ding" line="l2" word="the moment" offset={1.73} volume={-13} />
    <Sound asset="ding" line="l2" word="the moment" offset={2.38} volume={-13} />
    <Sound asset="miss" line="l4" word="a beat late" volume={-12} />
  </Scene>

  <Scene id="question">
    <Line id="l5">So why should an explainer follow the clock at all? It already has a timeline: its narration.</Line>
    <Line id="l6" hold={1.2}>Hang each picture on the word that says it, and what you hear is what you see.</Line>
    <Part id="hear" x={0} y={850} w={1920} h={140}>{() => (
      <div style={{textAlign: 'center', fontFamily: SANS, fontWeight: 800, fontSize: 76, letterSpacing: '-0.03em', color: TEXT}}>{useText('hear-a', 'What you hear is what you ')}<span style={{color: CUE}}>{useText('hear-b', 'see')}</span>{useText('hear-c', '.')}</div>
    )}</Part>
    <Animation>
      <Set target="chapter" to={{n: "02", name: "The question"}} at="start" />
      <Tween target="rail" to={{wave: 1}} line="l5" word="its narration" dur={1.2} easing="linear" />
      <Tween target="rail" to={{marks: 1}} line="l5" word="its narration" offset={0.6} dur={0.5} />
      <Tween target="rail" to={{ruler: 0, late: 0}} line="l6" word="hang each picture" dur={0.7} />
      <Tween target="rail" to={{pinned: 0}} line="l6" word="on the word" dur={1.1} easing="easeInOutBack(1.4)" />
      <Appear target="hear" line="l6" word="what you hear" dur={0.6} />
    </Animation>
    <Sound asset="tick" line="l6" word="on the word" offset={0.5} volume={-10} />
  </Scene>

  <Scene id="meet">
    <Line id="l7" text="This is what VisoTalk was built to solve. It's an agent skill for explainer videos.">This is what Veezo Talk was built to solve. It's an agent skill for explainer videos.</Line>
    <Line id="l8" hold={1.4}>Its one rule: narration is the new timeline.</Line>
    <Part id="intro"><Intro /></Part>
    <Animation>
      <Disappear target={["rail", "chapter"]} at="start" dur={0.5} />
      <Appear target="intro" at="start" dur={0} />
      <Tween target="intro" to={{draw: 1}} at="start" offset={0.3} dur={2.15} easing="linear" />
      <Appear target="intro-tag" line="l7" word="an agent skill" dur={0.6} />
      <Appear target="intro-rule" line="l8" word="narration" dur={0.6} />
    </Animation>
    {/* the music comes in once VisoTalk's rule has been said: 8 dB under the voice, 3 dB further back while it speaks */}
    <Sound asset="music" line="l8" edge="end" loop volume={-8} duck={3} fadeIn={1.2} fadeOut={4} />
    <Sound asset="swoosh" at="start" offset={0.3} volume={-12} />
    <Sound asset="ding" at="start" offset={0.82} volume={-12} />
  </Scene>

  <Scene id="light">
    <Line id="l9">Watch the Sun. On a timeline, its light is pinned to a second.</Line>
    <Line id="l10" hold={2}>Let there be…</Line>
    <Line id="l11" hold={1.2}>light!</Line>
    <Line id="l12">Oops. The pause moved the word, but not the light. Now, hang the light on the word.</Line>
    <Line id="l13" hold={2}>Let there be…</Line>
    <Line id="l14" hold={0.6}>light!</Line>
    <Line id="l15" hold={1}>OK, you're good.</Line>
    <Line id="l16">Nothing waits for a second, or a frame. Every animation waits for a word.</Line>
    <Line id="l17" hold={1}>The engine speaks the script, times each word, and solves the timeline from them.</Line>
    <Part id="clock"><LightClock /></Part>
    <Part id="gagcode" x={0} y={680} w={1920} h={100}><GagCode /></Part>
    <Part id="nope" x={0} y={825} w={1920} h={80}>{() => (
      <div style={{display: 'flex', justifyContent: 'center', gap: 60, fontFamily: MONO, fontSize: 46}}>
        <Obj id="nope-s" style={{color: MUTED, textDecoration: 'line-through', textDecorationColor: BAD, textDecorationThickness: 4}}>{useText('nope-s', 'at 0:02.4')}</Obj>
        <Obj id="nope-f" style={{color: MUTED, textDecoration: 'line-through', textDecorationColor: BAD, textDecorationThickness: 4}}>{useText('nope-f', 'frame #72')}</Obj>
      </div>
    )}</Part>
    <Part id="code" x={0} y={925} w={1920} h={90}>{() => (
      <div style={{display: 'flex', justifyContent: 'center'}}>
        <CodeLine parts={[['p', '<'], ['tag', 'Appear'], ['attr', ' on'], ['p', '='], ['str', '"moon"'], ['attr', ' line'], ['p', '='], ['str', '"l1"'], ['cue', ` word="${useText('play-anchor', 'Moon')}"`], ['p', ' />']]} />
      </div>
    )}</Part>
    <Animation>
      <Set target="chapter" to={{n: "03", name: "Hung on words"}} at="start" />
      <Appear target={["rail", "chapter", "badge"]} at="start" dur={0.6} />
      <Tween target="rail" to={{wave: 0, marks: 0}} at="start" dur={0.4} />
      <Tween target="rail" to={{dark: 1}} line="l9" word="watch the sun" dur={0.8} />
      <Appear target="clock" line="l9" word="on a timeline" dur={0.5} />
      <Appear target="gagcode" line="l9" word="pinned to a second" dur={0} />
      <Appear target="gag-clock" line="l9" word="pinned to a second" />
      <Disappear target="gag-clock" line="l12" word="now" dur={0.4} />
      <Appear target="gag-word" line="l12" word="hang the light on the word" />
      <Disappear id="gag-word-out" target="gag-word" line="l16" dur={0.4} />
      <Disappear target="gagcode" after="gag-word-out" dur={0} />
      <Tween target="clock" to={{clk: 4.4}} line="l10" dur={4.4} easing="linear" />
      <Appear target="sunlight" line="l10" offset={1.2} dur={0.25} />
      <Appear target="early" line="l10" offset={1.45} dur={0.3} />
      <Disappear target={["sunlight", "early"]} line="l12" word="now" dur={0.4} />
      <Set target="clock" to={{clk: 0}} line="l12" word="now" />
      <Tween target="clock" to={{hang: 1}} line="l12" word="hang the light" dur={0.9} easing="easeInOut" />
      <Tween target="clock" to={{clk: 4.4}} line="l13" dur={4.4} easing="linear" />
      <Appear target="sunlight" line="l14" word="light" dur={0.25} />
      <Disappear target="clock" line="l16" dur={0.4} />
      <Appear target="nope" line="l16" word="a second" dur={0} />
      <Appear target="nope-s" line="l16" word="a second" />
      <Appear target="nope-f" line="l16" word="a frame" />
      <Disappear id="nope-out" target={["nope-s", "nope-f"]} line="l16" word="for a word" />
      <Disappear target="nope" after="nope-out" dur={0} />
      <Appear target="code" line="l16" word="every animation" />
      <Tween target="rail" to={{hl: 1}} line="l16" word="for a word" dur={0.4} />
      <Disappear target="code" line="l17" word="speaks the script" />
      <Disappear target="sunlight" line="l17" word="speaks the script" dur={0.6} />
      <Tween target="rail" to={{dark: 0, hl: 0}} line="l17" word="speaks the script" dur={0.6} />
      <Tween target="rail" to={{wave: 1}} line="l17" word="speaks the script" dur={1.2} easing="linear" />
      <Tween target="rail" to={{marks: 1}} line="l17" word="times each word" dur={0.5} />
      <Tween target="rail" to={{stamps: 1}} line="l17" word="solves the timeline" dur={0.6} />
    </Animation>
    <Sound asset="light" line="l10" offset={1.2} volume={-6} />
    <Sound asset="miss" line="l10" offset={1.5} volume={-12} />
    <Sound asset="light" line="l14" word="light" volume={-6} />
  </Scene>

  <Scene id="proof">
    <Line id="l18">Here's what that buys you. Rewrite a line, and the picture follows.</Line>
    <Line id="l19">Give it another voice, slower or faster, and it follows again.</Line>
    <Line id="l20" hold={4.3}>Translate it, and every animation lands on its new word.</Line>
    <Line id="l21" hold={1.6}>One source, every language.</Line>
    <Part id="files" x={0} y={850} w={1920} h={110}><LangFiles /></Part>
    <Animation>
      <Set target="chapter" to={{n: "04", name: "What it buys you"}} at="start" />
      <Tween target="rail" to={{ins2: 1}} line="l18" word="rewrite a line" dur={0.9} />
      <Tween target="rail" to={{ok: 1}} line="l18" word="picture follows" dur={0.4} />
      <Tween target="rail" to={{ok: 0}} line="l19" word="another voice" dur={0.4} />
      <Tween target="rail" to={{pace: 1.45}} line="l19" word="slower" dur={0.5} />
      <Set target="rail" to={{spd: "0.75×"}} line="l19" word="slower" />
      <Tween target="rail" to={{pace: 0.7}} line="l19" word="faster" dur={0.5} />
      <Set target="rail" to={{spd: "1.25×"}} line="l19" word="faster" />
      <Tween target="rail" to={{pace: 1}} line="l19" word="follows again" dur={0.6} />
      <Set target="rail" to={{spd: ""}} line="l19" word="follows again" offset={0.6} />
      <Tween target="rail" to={{langs: 1}} line="l20" word="translate it" dur={0.5} />
      <Tween target="rail" to={{lang: 1}} line="l20" edge="end" offset={0.3} dur={0.5} />
      <Tween target="rail" to={{lang: 2}} line="l20" edge="end" offset={1.3} dur={0.5} />
      <Tween target="rail" to={{lang: 3}} line="l20" edge="end" offset={2.3} dur={0.5} />
      <Tween target="rail" to={{lang: 4}} line="l20" edge="end" offset={3.3} dur={0.5} />
      <Tween target="rail" to={{ok: 1}} line="l20" edge="end" offset={0.8} dur={0.4} />
      <Appear target="files" line="l21" word="one source" dur={0} />
      <Appear target="lang-src" line="l21" word="one source" />
      <Appear target="lang-over" line="l21" word="every language" />
    </Animation>
    {/* each language's name, said in that language (say-1 … say-4, in the order of rail-others: a native MiniMax voice each, see README), as the sentence switches to it */}
    <Sound asset="say-1" line="l20" edge="end" offset={0.3} />
    <Sound asset="say-2" line="l20" edge="end" offset={1.3} />
    <Sound asset="say-3" line="l20" edge="end" offset={2.3} />
    <Sound asset="say-4" line="l20" edge="end" offset={3.3} />
  </Scene>

  <Scene id="document">
    <Line id="l22" text="A VisoTalk film is one document, written with a handful of tags.">A Veezo Talk film is one document, written with a handful of tags.</Line>
    <Line id="l23">A Scene holds Lines: the words the voice will speak.</Line>
    <Line id="l24">A Part is any picture, drawn in ordinary React. Here, a bar chart.</Line>
    <Line id="l25">Appear brings it in on a word. Tween moves it on another. Set changes a value. Disappear clears it away.</Line>
    <Line id="l26">Each one names a line and a word, and that is all the timing there is.</Line>
    <Line id="l27" hold={1.2}>And a part can be anything: a React element, a video clip, the music, a sound effect. Each one hangs on a word.</Line>
    <Part id="doc"><DocTags /></Part>
    <Part id="kinds"><Kinds /></Part>
    <Animation>
      <Set target="chapter" to={{n: "05", name: "The document"}} at="start" />
      <Disappear target="rail" at="start" dur={0.5} />
      <Appear target="doc" at="start" offset={0.3} dur={0.5} />
      <Tween target="doc" to={{type: 1}} line="l22" word="one document" until={{line: "l22", edge: "end"}} easing="linear" />
      <Set target="doc" to={{hl: "scene"}} line="l23" word="a scene" />
      <Set target="doc" to={{hl: "scene,line"}} line="l23" word="holds lines" />
      <Tween target="doc" to={{say: 1}} line="l23" word="the words" until={{line: "l23", edge: "end"}} easing="linear" />
      <Set target="doc" to={{hl: "part"}} line="l24" word="a part" />
      <Tween target="doc" to={{ghost: 1}} line="l24" word="ordinary react" dur={0.6} />
      <Set target="doc" to={{hl: "appear"}} line="l25" word="appear" />
      <Tween target="doc" to={{ghost: 0}} line="l25" word="brings it in" dur={0.3} />
      <Appear target="v-chart" line="l25" word="brings it in" dur={0.5} />
      <Set target="doc" to={{hl: "tween"}} line="l25" word="tween" />
      <Tween target="doc" to={{grow: 1}} line="l25" word="moves it" dur={0.8} />
      <Set target="doc" to={{hl: "set"}} line="l25" word="set changes" />
      <Set target="doc" to={{label: "×3"}} line="l25" word="a value" />
      <Set target="doc" to={{hl: "disappear"}} line="l25" word="disappear" />
      <Disappear target="v-chart" line="l25" word="clears it away" dur={0.5} />
      <Set target="doc" to={{hl: "appear,tween,set,disappear"}} line="l26" word="each one" />
      <Tween target="doc" to={{anchors: 1}} line="l26" word="a line and a word" dur={0.6} />
      <Disappear target="doc" line="l27" dur={0.5} />
      <Appear target="kinds" line="l27" word="a react element" dur={0} />
      <Appear target="kind-react" line="l27" word="a react element" />
      <Appear target="kind-video" line="l27" word="a video clip" />
      <Appear target="kind-music" line="l27" word="the music" />
      <Appear target="kind-sfx" line="l27" word="a sound effect" />
    </Animation>
    <Sound asset="ding" line="l25" word="brings it in" volume={-12} />
    <Sound asset="swoosh" line="l25" word="moves it" volume={-16} />
    <Sound asset="tick" line="l25" word="a value" volume={-11} />
    <Sound asset="swoosh" line="l25" word="clears it away" volume={-18} />
    <Sound asset="ding" line="l27" word="a sound effect" offset={0.15} volume={-9} />
  </Scene>

  <Scene id="long">
    <Line id="l28">The rule matters most when a film gets long.</Line>
    <Line id="l29">The first long film I made this way, The Oldest Light, runs seven minutes, in four movements, in two languages.</Line>
    <Line id="l30">It's scenes of lines, each animation on its word. Rewrite one sentence, and nothing else moves.</Line>
    <Line id="l31">Even the music lands: every scene rounds to whole bars, in both languages.</Line>
    <Line id="l32">Inside, thirteen scenes and thirty-nine lines carry two hundred and sixty-seven animations and sounds, each one under its word.</Line>
    <Line id="l33" hold={1.2}>So even a long film stays a document an agent can find its way around, not one long timeline.</Line>
    <Part id="cover"><Cover /></Part>
    <Part id="film"><LongFilm /></Part>
    <Part id="outline"><Outline /></Part>
    <Animation>
      <Set target="chapter" to={{n: "06", name: "Long form"}} at="start" />
      <Appear target="cover" line="l28" word="gets long" dur={0.7} />
      <Disappear target="cover" line="l29" word="seven minutes" dur={0.5} />
      <Appear target="film" line="l29" word="seven minutes" dur={0} />
      <Tween target="film" to={{strip: 1}} line="l29" word="seven minutes" dur={1.4} easing="easeInOut" />
      <Tween target="film" to={{total: 1}} line="l29" word="seven minutes" offset={0.8} dur={0.5} />
      <Tween target="film" to={{mov: 1}} line="l29" word="four movements" dur={0.8} />
      <Tween target="film" to={{zh: 1}} line="l29" word="two languages" dur={0.8} />
      <Tween target="film" to={{lines: 1}} line="l30" word="scenes of lines" dur={0.8} />
      <Tween target="film" to={{dots: 1}} line="l30" word="on its word" dur={0.6} />
      <Tween target="film" to={{zoom: 1}} line="l30" word="on its word" dur={0.6} />
      <Tween target="film" to={{grow: 1}} line="l30" word="rewrite one sentence" dur={1.0} />
      <Tween target="film" to={{calm: 1}} line="l30" word="nothing else moves" dur={0.6} />
      <Tween target="film" to={{calm: 0, zoom: 0}} line="l31" word="the music" dur={0.4} />
      <Tween target="film" to={{bars: 1}} line="l31" word="the music" dur={0.8} />
      <Tween target="film" to={{snap: 1}} line="l31" word="whole bars" dur={0.6} />
      <Tween target="film" to={{both: 1}} line="l31" word="both languages" dur={0.6} />
      <Disappear target="film" line="l32" dur={0.5} />
      <Appear target="outline" line="l32" offset={0.3} dur={0} />
      <Tween target="outline" to={{rows: 1}} line="l32" word="thirteen scenes" dur={1.4} easing="linear" />
      <Tween target="outline" to={{open: 1}} line="l32" word="each one under its word" dur={1.2} />
    </Animation>
  </Scene>

  <Scene id="workflow">
    <Line id="l34" text="VisoTalk covers the whole workflow of making an explainer, not just the rendering.">Veezo Talk covers the whole workflow of making an explainer, not just the rendering.</Line>
    <Line id="l35">Your agent writes the script and the scenes. The voice is spoken and timed. It looks at its own frames, and a checker flags text that collides, or flashes by too fast.</Line>
    <Line id="l36">Captions, subtitles and other languages come from the same lines.</Line>
    <Line id="l37">And it plays natively on the web. Not a video file: the film itself, live in the page. Pause it, jump to any sentence, read its source.</Line>
    <Line id="l38" hold={0.6}>And of course, it renders to video files.</Line>
    <Part id="flow"><Flow /></Part>
    <Part id="cards"><FlowCards /></Part>
    <Part id="web"><WebPlayer /></Part>
    <Part id="mp4"><Mp4 /></Part>
    <Animation>
      <Set target="chapter" to={{n: "07", name: "The whole workflow"}} at="start" />
      <Appear target="flow" line="l34" dur={0} />
      <Appear target="cards" line="l35" word="your agent" dur={0} />
      <Tween target="flow" to={{draw: 1}} line="l34" until={{line: "l34", word: "whole workflow", edge: "end"}} easing="easeInOut" />
      <Set target="flow" to={{step: 1}} line="l35" word="your agent" />
      <Appear target="card-script" line="l35" word="your agent" />
      <Set target="flow" to={{step: 2}} line="l35" word="the voice" />
      <Disappear target="card-script" line="l35" word="the voice" />
      <Appear target="card-voice" line="l35" word="the voice" />
      <Set target="flow" to={{step: 3}} line="l35" word="it looks" />
      <Disappear target="card-voice" line="l35" word="it looks" />
      <Appear target="card-frames" line="l35" word="it looks" />
      <Set target="flow" to={{step: 4}} line="l35" word="flags" />
      <Disappear target="card-frames" line="l35" word="flags" />
      <Appear target="card-checks" line="l35" word="flags" />
      <Tween target="cards" to={{issues: 1}} line="l35" word="collides" dur={0.3} />
      <Tween target="cards" to={{flash: 1}} line="l35" word="flashes by" dur={0.3} />
      <Set target="flow" to={{step: 5}} line="l36" word="captions" />
      <Disappear target="card-checks" line="l36" word="captions" />
      <Appear target="card-captions" line="l36" word="captions" />
      <Appear target="out-caption" line="l36" word="captions" offset={0.2} />
      <Appear target="out-srt" line="l36" word="subtitles" />
      <Appear target="out-zh" line="l36" word="other languages" />
      <Set target="flow" to={{step: 6}} line="l37" word="plays natively" />
      <Disappear target={["cards", "flow"]} line="l37" word="on the web" />
      <Appear target="web" line="l37" word="on the web" />
      <Tween target="web" to={{pt: 4.4}} line="l37" word="on the web" until={{line: "l37", word: "pause it"}} easing="linear" />
      <Set target="web" to={{pt: 6.05}} line="l37" word="jump to any sentence" />
      <Tween target="web" to={{pt: 8.9}} line="l37" word="jump to any sentence" offset={0.05} until={{line: "l37", edge: "end"}} easing="linear" />
      <Tween target="web" to={{nofile: 1}} line="l37" word="not a video file" dur={0.4} />
      <Tween target="web" to={{live: 1}} line="l37" word="live in the page" dur={0.4} />
      <Tween target="web" to={{pause: 1}} line="l37" word="pause it" dur={0.3} />
      <Tween target="web" to={{pause: 0}} line="l37" word="jump to any sentence" dur={0.3} />
      <Tween target="web" to={{jump: 1}} line="l37" word="jump to any sentence" dur={0.4} />
      <Tween target="web" to={{src: 1}} line="l37" word="read its source" dur={0.4} />
      <Disappear target="web" line="l38" dur={0.3} />
      <Appear target="mp4" line="l38" offset={0.2} dur={0.4} />
      <Tween target="mp4" to={{frames: 1}} line="l38" word="video files" dur={1} easing="linear" />
    </Animation>
    <Sound asset="chime" line="l35" word="your agent" volume={-12} />
    <Sound asset="chime" line="l35" word="the voice" volume={-12} />
    <Sound asset="chime" line="l35" word="it looks" volume={-12} />
    <Sound asset="chime" line="l35" word="flags" volume={-12} />
    <Sound asset="chime" line="l36" word="captions" volume={-12} />
    <Sound asset="chime" line="l37" word="plays natively" volume={-12} />
  </Scene>

  <Scene id="close">
    <Line id="l39">This film was made the same way. Every word you just heard set off something on screen.</Line>
    <Line id="l40" text="VisoTalk is open source. One command adds the skill to your agent.">Veezo Talk is open source. One command adds the skill to your agent.</Line>
    <Line id="l41" hold={5}>Narration is the new timeline.</Line>
    <Part id="echo"><Echo /></Part>
    <Part id="cmd"><Command /></Part>
    <Part id="end"><EndCard /></Part>
    <Animation>
      <Set target="chapter" to={{n: "08", name: "Made with VisoTalk"}} at="start" />
      <Appear target="echo" line="l39" />
      <Tween target="echo" to={{threads: 1}} line="l39" word="every word" until={{line: "l39", edge: "end"}} easing="linear" />
      <Disappear target="echo" line="l40" word="open source" />
      <Appear target="cmd" line="l40" word="one command" />
      <Tween target="cmd" to={{chars: 1}} line="l40" word="adds the skill" dur={1.4} easing="linear" />
      <Disappear target={["cmd", "chapter", "badge"]} line="l41" dur={0.4} />
      <Appear target="end" line="l41" dur={0} />
      <Tween target="end" to={{draw: 1}} line="l41" dur={2.15} easing="linear" />
      <Appear target="end-title" line="l41" word="the new timeline" dur={0.8} />
      <Appear target="end-tag" line="l41" edge="end" offset={1.2} dur={0.8} />
    </Animation>
    <Sound asset="swoosh" line="l41" volume={-12} />
    <Sound asset="ding" line="l41" offset={0.52} volume={-12} />
  </Scene>
</Doc>;
