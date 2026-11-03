import {useTheme} from '@visotalk/runtime';

// The lockup drawing itself: the same drawing as examples/visotalk-intro/doc.tsx, which keeps it inline.
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const TEXT = 'var(--vt-text)';

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
export function Lockup({width, draw = 1}: {width: number; draw?: number}) {
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
