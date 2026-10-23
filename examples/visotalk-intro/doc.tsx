import {Doc, Asset, Scene, Line, Part, Animation, Appear, Disappear, Tween, Set, Sound} from '@visotalk/jsx';
import {useProp, useAsset, useText, Obj} from '@visotalk/runtime';

// ---- helpers ----------------------------------------------------------------
const frac = (v: number) => v - Math.floor(v);
const hash = (i: number, k: number) => frac(Math.sin(i * 12.9898 + k * 78.233) * 43758.5453);
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const typed = (s: string, n: number) => s.slice(0, Math.max(0, Math.round(n)));

const SANS = 'var(--vt-sans)';
const MONO = 'var(--vt-mono)';
// the brand's colours (docs/brand/tokens.json, dark): blue is the signal of playback, violet the editing layer
const AGENT = 'var(--vt-op)'; // violet: the agent
const SKILL = 'var(--vt-warn)'; // amber: the skill
const ENGINE = 'var(--vt-data)'; // blue: the engine
const CUE = 'var(--vt-grad)'; // the word an action hangs on, the playhead
const MARK = '#6fb4f5'; // the logo's frame and the "Viso" of the wordmark

const GOOD = 'var(--vt-good)';
const BAD = 'var(--vt-bad)';

/** The VisoTalk mark (docs/brand/icon.svg) in its dark-ground colours: a `mark` frame and an `ink` play glyph. */
function Mark({size}: {size: number}) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <g fill="none" stroke={MARK} strokeWidth={5} strokeLinejoin="miter">
        <path d="M8 22V10h12" />
        <path d="M44 10h12v12" />
        <path d="M56 34v12h-12" />
        <path d="M20 46h-4l-8 8V34" />
      </g>
      <path d="M26.97 20.35L39.57 28L26.97 35.65Z" fill="var(--vt-text)" stroke="var(--vt-text)" strokeWidth={2.7} strokeLinejoin="round" />
    </svg>
  );
}

/** docs/brand/lockup.svg (the mark and its outlined wordmark) in its dark-ground colours: "Viso" in `mark`, "Talk" in `ink`. */
function Lockup({width}: {width: number}) {
  return (
    <svg width={width} height={(width * 51.3) / 234.05} viewBox="5 5.7 234.05 51.3">
      <g fill="none" stroke={MARK} strokeWidth={5} strokeLinejoin="miter">
        <path d="M8 22V10h12" />
        <path d="M44 10h12v12" />
        <path d="M56 34v12h-12" />
        <path d="M20 46h-4l-8 8V34" />
      </g>
      <path d="M26.97 20.35L39.57 28L26.97 35.65Z" fill="var(--vt-text)" stroke="var(--vt-text)" strokeWidth={2.7} strokeLinejoin="round" />
      <path transform="translate(74.82 3)" fill={MARK} d="M9.06 39.07 0.68 16.93H7.5L12.99 34.73H12.42L17.88 16.93H24.7L16.33 39.07ZM27.88 39.07V16.93H33.99V39.07ZM30.94 14.28Q29.11 14.28 28 13.18Q26.9 12.07 26.9 10.24Q26.9 8.4 28 7.3Q29.11 6.2 30.94 6.2Q32.78 6.2 33.88 7.3Q34.98 8.4 34.98 10.24Q34.98 12.07 33.88 13.18Q32.78 14.28 30.94 14.28ZM48.37 39.61Q45.87 39.61 43.66 38.89Q41.44 38.16 39.93 36.62Q38.42 35.08 38 32.61L43.57 31.51Q43.76 33.38 44.9 34.33Q46.04 35.28 48.14 35.28Q50.17 35.28 51.16 34.47Q52.15 33.66 52.15 32.57Q52.15 31.61 51.38 30.91Q50.6 30.21 48.73 29.93L46.71 29.6Q45.54 29.42 44.19 29.09Q42.84 28.77 41.65 28.13Q40.46 27.48 39.7 26.34Q38.95 25.2 38.95 23.38Q38.95 21.19 40.12 19.63Q41.3 18.06 43.39 17.23Q45.47 16.39 48.18 16.39Q50.66 16.39 52.71 17.11Q54.76 17.84 56.14 19.25Q57.52 20.66 57.93 22.73L52.36 23.88Q52.21 23.03 51.81 22.29Q51.41 21.55 50.59 21.1Q49.78 20.64 48.37 20.64Q46.79 20.64 45.86 21.26Q44.93 21.87 44.93 22.93Q44.93 23.71 45.45 24.21Q45.98 24.7 46.89 25Q47.8 25.3 48.95 25.51L51.25 25.9Q53.01 26.18 54.6 26.88Q56.19 27.59 57.19 28.9Q58.19 30.21 58.19 32.35Q58.19 34.71 56.91 36.33Q55.63 37.95 53.41 38.78Q51.19 39.61 48.37 39.61ZM72.71 39.61Q69.36 39.61 66.81 38.14Q64.26 36.66 62.83 34.04Q61.4 31.42 61.4 27.99Q61.4 24.56 62.83 21.95Q64.26 19.33 66.81 17.86Q69.36 16.39 72.71 16.39Q76.07 16.39 78.62 17.86Q81.17 19.33 82.61 21.95Q84.04 24.56 84.04 28Q84.04 31.44 82.61 34.05Q81.17 36.67 78.61 38.14Q76.06 39.61 72.71 39.61ZM72.72 35.11Q75.01 35.11 76.33 33.2Q77.65 31.29 77.65 28Q77.65 24.71 76.33 22.8Q75 20.89 72.72 20.89Q70.43 20.89 69.11 22.8Q67.79 24.71 67.79 28Q67.79 31.3 69.11 33.2Q70.43 35.11 72.72 35.11Z" />
      <path transform="translate(74.82 3)" fill="var(--vt-text)" d="M94.5 39.07Q92.03 39.07 90.71 37.88Q89.4 36.68 89.4 34.42V21.4H86.23V16.93H89.4V12.58L95.51 11.1V16.93H99.6V21.4H95.51V33.46Q95.51 34.14 95.7 34.37Q95.9 34.6 96.53 34.6H99.92V39.07ZM110.36 39.6Q108.24 39.6 106.46 38.86Q104.67 38.12 103.59 36.63Q102.52 35.15 102.52 32.94Q102.52 30.56 103.9 28.9Q105.28 27.23 107.9 26.36Q110.51 25.49 114.23 25.49H117.35L116.98 26.05V24.78Q116.98 22.58 116.19 21.51Q115.39 20.44 113.54 20.44Q111.77 20.44 110.84 21.37Q109.9 22.31 109.7 24.03L103.48 22.95Q103.81 21.11 105.05 19.62Q106.3 18.13 108.49 17.25Q110.69 16.36 113.89 16.36Q116.82 16.36 118.85 17.3Q120.88 18.23 121.94 20.33Q123 22.43 123 25.93V33.46Q123 34.14 123.19 34.37Q123.39 34.6 124.02 34.6H125.02V39.07H122.1Q119.72 39.07 118.47 37.87Q117.23 36.66 117.23 34.42V33.38L118.3 33.78Q118.03 34.67 117.51 35.67Q116.99 36.67 116.09 37.57Q115.19 38.46 113.79 39.03Q112.39 39.6 110.36 39.6ZM112.12 35.43Q113.56 35.43 114.66 34.77Q115.77 34.11 116.4 32.79Q117.04 31.47 117.04 29.51V29.02H114.46Q112.27 29.02 111.04 29.6Q109.82 30.17 109.33 31Q108.84 31.83 108.84 32.62Q108.84 33.24 109.13 33.89Q109.43 34.54 110.14 34.99Q110.85 35.43 112.12 35.43ZM134.17 39.07Q131.69 39.07 130.38 37.88Q129.06 36.68 129.06 34.42V8.31H135.17V33.46Q135.17 34.14 135.36 34.37Q135.56 34.6 136.19 34.6H137.9V39.07ZM141.78 39.07V8.31H147.89V25.45L156.44 16.93H163.42L155.08 25.22L163.73 39.07H156.92L150.98 29.43L147.89 32.51V39.07Z" />
    </svg>
  );
}

// ---- Scene 1-2: a picture made of pixels, and what happens when you ask for it again --
const COLS = 24;
const ROWS = 12;
const TILE = 50;
const BAR_X = [3, 7, 11, 15, 19];
const BARS = [
  [3, 5, 4, 7, 8],
  [6, 3, 8, 4, 5],
];
const SKY = [
  {h: 222, s: 46},
  {h: 168, s: 40},
];
const BAR_HUE = [
  [18, 28, 38, 24, 34],
  [330, 290, 312, 346, 300],
];

/** Colour [h, s, l] of one tile in picture v (0 or 1): a dusk sky and five bars. */
function tileColor(c: number, r: number, v: number): [number, number, number] {
  const fromBottom = ROWS - 1 - r;
  const bar = BAR_X.findIndex((x) => c >= x && c < x + 3);
  if (bar >= 0 && fromBottom < BARS[v][bar]) return [BAR_HUE[v][bar], 78, 52 + fromBottom * 1.5];
  return [SKY[v].h + r * 2, SKY[v].s, 12 + (r / ROWS) * 16];
}

function Mosaic({baseShuffle, baseFlow}: {baseShuffle: number; baseFlow: number}) {
  const shuffle = useProp('shuffle', baseShuffle);
  const flow = useProp('flow', baseFlow);
  const num = useProp('num', -1);
  const ok = clamp(useProp('ok', 0));
  const tiles = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const i = r * COLS + c;
      const t = clamp(shuffle * 1.8 - hash(i, 7) * 0.8);
      const a = tileColor(c, r, 0);
      const b = tileColor(c, r, 1);
      const jit = (hash(i, 2) - 0.5) * 5;
      const hh = lerp(a[0], b[0], t);
      const ss = lerp(a[1], b[1], t);
      const ll = lerp(a[2], b[2], t) + jit;
      const gone = clamp(flow * 1.8 - hash(i, 3) * 0.8);
      const s = (1 - 0.5 * Math.sin(Math.PI * t)) * (1 - gone);
      tiles.push(
        <rect key={i} x={c * TILE + (TILE * (1 - s)) / 2} y={r * TILE + (TILE * (1 - s)) / 2} width={TILE * s} height={TILE * s} fill={`hsl(${hh} ${ss}% ${ll}%)`} />,
      );
    }
  }
  const scrambling = shuffle > 0.12 && shuffle < 0.8;
  const n = num >= 0 ? Math.round(num) : scrambling ? 10 + Math.floor(hash(Math.floor(shuffle * 40), 5) * 89) : shuffle >= 0.8 ? 47 : 42;
  return (
    <div style={{position: 'relative', width: COLS * TILE, height: ROWS * TILE, borderRadius: 18, overflow: 'hidden'}}>
      <svg width={COLS * TILE} height={ROWS * TILE} style={{position: 'absolute', left: 0, top: 0}}>
        {tiles}
      </svg>
      <Obj id="fig" style={{position: 'absolute', left: 60, top: 36, width: 360, height: 140, borderRadius: 24, background: 'rgba(8,10,16,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <span style={{fontFamily: SANS, fontWeight: 700, fontSize: 112, color: '#fff', letterSpacing: -2, opacity: 1 - clamp(flow * 2)}}>+{n}%</span>
      </Obj>
      <svg width={COLS * TILE} height={ROWS * TILE} style={{position: 'absolute', left: 0, top: 0}}>
        <Obj as="g" id="ring">
          <ellipse opacity={1 - clamp(flow * 3)} cx={240} cy={106} rx={236} ry={96} fill="none" stroke={`color-mix(in srgb, var(--vt-good) ${Math.round(ok * 100)}%, var(--vt-bad))`} strokeWidth={8} />
        </Obj>
      </svg>
    </div>
  );
}

function Regen() {
  return (
    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, width: 420, height: 84, borderRadius: 42, border: '3px solid var(--vt-border)', background: 'var(--vt-panel2)', fontFamily: SANS, fontSize: 38, fontWeight: 700, color: 'var(--vt-text)'}}>
      <Obj id="regen-icon" style={{display: 'flex'}}>
        <svg width={40} height={40} viewBox="0 0 40 40" fill="none" stroke="var(--vt-muted)" strokeWidth={5} strokeLinecap="round">
          <path d="M33 20a13 13 0 1 1-4-9.4" />
          <path d="M31 4v8h-8" />
        </svg>
      </Obj>
      {useText('regen', 'Generate again')}
    </div>
  );
}

// ---- Scene 2: the document -----------------------------------------------------
const CW = 21.6; // one character of the 36 px mono face
const CJK = 36; // and one CJK character, which the mono face lacks
const monoWidth = (s: string) => [...s].reduce((w, c) => w + (c.charCodeAt(0) >= 0x2e80 ? CJK : CW), 0);
const CODE = {fontFamily: MONO, fontSize: 36, color: 'var(--vt-text)', whiteSpace: 'pre' as const, position: 'absolute' as const, left: 60};
const TAG = {color: 'var(--vt-muted)'};

function RowLabel({y, color, children}: {y: number; color: string; children: string}) {
  return (
    <div style={{position: 'absolute', left: 60, top: y, display: 'flex', alignItems: 'center', gap: 14, fontFamily: SANS, fontSize: 28, fontWeight: 700, letterSpacing: 2, color, whiteSpace: 'nowrap'}}>
      <span style={{width: 16, height: 16, borderRadius: 8, background: color}} />
      {children}
    </div>
  );
}

function Sheet() {
  const hi = useProp('hi', 0);
  const grow = useProp('grow', 0);
  const word = (extra: object = {}) => ({color: `color-mix(in srgb, var(--vt-grad) ${Math.round(hi * 100)}%, var(--vt-text))`, fontWeight: 700, ...extra});
  const g = ease(clamp(grow));
  const before = useText('sheet-before', 'Revenue ');
  const doubled = useText('sheet-word', 'doubled');
  const after = useText('sheet-after', ' in March.');
  // where the dashed line leaves the word in the sentence and where it arrives at the word in the anchor below, in this language's widths
  const x1 = 60 + monoWidth(`<Line id="l1">${before}`) + monoWidth(doubled) / 2;
  const x2 = 60 + 35 * CW + monoWidth(doubled) / 2;
  return (
    <div style={{position: 'relative', width: 1500, height: 640, borderRadius: 26, background: 'var(--vt-panel)', border: '2px solid var(--vt-border)'}}>
      <div style={{position: 'absolute', left: 0, top: 0, width: 1500, height: 72, boxSizing: 'border-box', borderRadius: '24px 24px 0 0', background: 'var(--vt-panel2)', borderBottom: '2px solid var(--vt-border)', display: 'flex', alignItems: 'center', gap: 12, paddingLeft: 28}}>
        {['#F87171', '#FBBF24', '#4ADE80'].map((c) => (
          <span key={c} style={{width: 18, height: 18, borderRadius: 9, background: c, opacity: 0.8}} />
        ))}
        <span style={{marginLeft: 20, fontFamily: MONO, fontSize: 30, color: 'var(--vt-muted)'}}>doc.tsx</span>
      </div>
      <Obj id="r-line" style={{position: 'absolute', left: 0, top: 0}}>
        <RowLabel y={104} color="var(--vt-op)">{useText('row-sentence', 'SENTENCE')}</RowLabel>
        <div style={{...CODE, top: 150}}>
          <span style={TAG}>{'<Line id="l1">'}</span>{before}<span style={word()}>{doubled}</span>{after}<span style={TAG}>{'</Line>'}</span>
        </div>
      </Obj>
      <Obj id="r-part" style={{position: 'absolute', left: 0, top: 0}}>
        <RowLabel y={264} color="var(--vt-warn)">{useText('row-picture', 'PICTURE')}</RowLabel>
        <div style={{...CODE, top: 310}}>
          <span style={TAG}>{'<Part id="chart">'}</span>…<span style={TAG}>{'</Part>'}</span>
        </div>
        <div style={{position: 'absolute', left: 1090, top: 110, width: 350, height: 470, borderRadius: 20, border: '2px solid var(--vt-border)', background: 'var(--vt-panel2)'}}>
          <svg width={350} height={470} viewBox="0 0 350 470">
            <line x1={40} y1={400} x2={310} y2={400} stroke="var(--vt-faint)" strokeWidth={3} />
            <rect x={70} y={400 - 130} width={80} height={130} rx={8} fill="var(--vt-data)" opacity={0.55} />
            <rect x={200} y={400 - lerp(130, 260, g)} width={80} height={lerp(130, 260, g)} rx={8} fill="var(--vt-data)" />
            <text x={110} y={444} textAnchor="middle" fontFamily="var(--vt-sans)" fontSize={28} fill="var(--vt-muted)">{useText('feb', 'Feb')}</text>
            <text x={240} y={444} textAnchor="middle" fontFamily="var(--vt-sans)" fontSize={28} fill="var(--vt-muted)">{useText('mar', 'Mar')}</text>
          </svg>
        </div>
      </Obj>
      <Obj id="r-anim" style={{position: 'absolute', left: 0, top: 0}}>
        <RowLabel y={424} color={CUE}>{useText('row-word', 'THE WORD IT ARRIVES ON')}</RowLabel>
        <div style={{...CODE, top: 470}}>
          <span style={TAG}>{'<Appear on="chart" line="l1" word="'}</span>
          <span style={word()}>{doubled}</span>
          <span style={TAG}>{'"/>'}</span>
        </div>
      </Obj>
      <Obj as="div" id="link" style={{position: 'absolute', left: 0, top: 0}}>
        <svg width={1500} height={640} style={{position: 'absolute', left: 0, top: 0}}>
          <path d={`M${x2} 466 V262 Q${x2} 232 ${x2 - 35} 232 H${x1 + 15} Q${x1} 232 ${x1} 216`} fill="none" stroke="var(--vt-grad)" strokeWidth={4} strokeDasharray="10 10" strokeLinecap="round" />
          <path d={`M${x1 - 10} 226 L${x1} 208 L${x1 + 10} 226 Z`} fill="var(--vt-grad)" />
        </svg>
      </Obj>
    </div>
  );
}

// ---- Scene 3: the words are the clock --------------------------------------------
const X0 = 220;
const PPS = 330; // pixels per second on the ruler
// start/end seconds of each word of the sentence before and after the edit (the aligner's job in a real film)
const WORDS = [
  {w: 'Revenue', a: [0, 0.65], b: [0, 0.65]},
  {w: 'quite', a: [0.65, 0.65], b: [0.65, 1.05]},
  {w: 'suddenly', a: [0.65, 0.65], b: [1.05, 1.85]},
  {w: 'doubled', a: [0.65, 1.25], b: [1.85, 2.5]}, // the word the bar rises on
  {w: 'in', a: [1.25, 1.5], b: [2.5, 2.75]},
  {w: 'March', a: [1.5, 2.1], b: [2.75, 3.35]},
];
const PIN_A = 0.65;
const PIN_B = 1.85;
const BAR_BASE = 770;

function Clock() {
  const edit = ease(clamp(useProp('edit', 0)));
  const play = useProp('play', 0);
  const pinT = lerp(PIN_A, PIN_B, edit);
  const pinX = X0 + pinT * PPS;
  const rise = ease(clamp((play - pinT) / 0.5));
  const marH = lerp(150, 300, rise);
  const flash = clamp(1 - Math.abs(play - pinT) / 0.25) * (play > 0 ? 1 : 0);
  const words = [useText('w0', 'Revenue'), useText('w1', 'quite'), useText('w2', 'suddenly'), useText('w3', 'doubled'), useText('w4', 'in'), useText('w5', 'March')];
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, fontFamily: SANS}}>
      <Obj id="chips" style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 400}}>
        {WORDS.map((k, i) => {
          const s = lerp(k.a[0], k.b[0], edit);
          const e = lerp(k.a[1], k.b[1], edit);
          const w = Math.max(0, (e - s) * PPS - 8);
          if (w < 6) return null;
          const pinned = i === 3;
          const added = k.a[0] === k.a[1];
          return (
            <div key={i} style={{position: 'absolute', left: X0 + s * PPS, top: 150, width: w, height: 92, boxSizing: 'border-box', borderRadius: 18, border: `3px ${added ? 'dashed' : 'solid'} ${pinned ? 'var(--vt-grad)' : added ? 'var(--vt-good)' : 'var(--vt-border)'}`, background: pinned ? 'color-mix(in srgb, var(--vt-grad) 16%, var(--vt-panel))' : 'var(--vt-panel)', color: 'var(--vt-text)', fontSize: 44, fontWeight: pinned ? 700 : 400, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', whiteSpace: 'nowrap'}}>
              {words[i]}
            </div>
          );
        })}
      </Obj>
      <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
        <Obj as="g" id="ruler">
          <line x1={X0} y1={290} x2={X0 + 4.4 * PPS} y2={290} stroke="var(--vt-faint)" strokeWidth={4} />
          {Array.from({length: 9}, (_, i) => (
            <line key={i} x1={X0 + i * 0.5 * PPS} y1={290} x2={X0 + i * 0.5 * PPS} y2={i % 2 ? 302 : 316} stroke="var(--vt-faint)" strokeWidth={3} />
          ))}
          {Array.from({length: 5}, (_, i) => (
            <text key={i} x={X0 + i * PPS} y={352} textAnchor="middle" fontFamily="var(--vt-mono)" fontSize={28} fill="var(--vt-muted)">{i}s</text>
          ))}
          <text x={X0 + 4.4 * PPS} y={400} textAnchor="end" fontFamily="var(--vt-sans)" fontSize={28} fill="var(--vt-muted)">{useText('measured', 'measured from the voice')}</text>
        </Obj>
        <Obj as="g" id="link">
          <path d={`M${pinX} 296 V405 H995 V450`} fill="none" stroke="var(--vt-grad)" strokeWidth={4} strokeDasharray="10 10" strokeLinecap="round" opacity={0.9} />
          <circle cx={pinX} cy={290} r={14 + flash * 10} fill="var(--vt-grad)" />
        </Obj>
        {play > 0.01 && <line x1={X0 + play * PPS} y1={130} x2={X0 + play * PPS} y2={316} stroke="var(--vt-text)" strokeWidth={4} opacity={0.75} />}
        <Obj as="g" id="chart">
          <line x1={500} y1={BAR_BASE} x2={1120} y2={BAR_BASE} stroke="var(--vt-faint)" strokeWidth={3} />
          <rect x={560} y={BAR_BASE - 150} width={190} height={150} rx={10} fill="var(--vt-data)" opacity={0.55} />
          <rect x={900} y={BAR_BASE - marH} width={190} height={marH} rx={10} fill="var(--vt-data)" />
          <text x={655} y={BAR_BASE + 52} textAnchor="middle" fontFamily="var(--vt-sans)" fontSize={36} fill="var(--vt-muted)">{useText('feb', 'Feb')}</text>
          <text x={995} y={BAR_BASE + 52} textAnchor="middle" fontFamily="var(--vt-sans)" fontSize={36} fill="var(--vt-muted)">{useText('mar', 'Mar')}</text>
        </Obj>
      </svg>
      <Obj id="zero-a" style={{position: 'absolute', left: 1300, top: 440, width: 500}}>
        <div style={{fontSize: 150, fontWeight: 700, lineHeight: 1, color: 'var(--vt-good)'}}>0</div>
        <div style={{fontSize: 40, color: 'var(--vt-muted)', marginTop: 6}}>{useText('zero-a', 'timestamps to rewrite')}</div>
      </Obj>
      <Obj id="zero-b" style={{position: 'absolute', left: 1300, top: 640, width: 500}}>
        <div style={{fontSize: 150, fontWeight: 700, lineHeight: 1, color: 'var(--vt-good)'}}>0</div>
        <div style={{fontSize: 40, color: 'var(--vt-muted)', marginTop: 6}}>{useText('zero-b', 'videos to generate again')}</div>
      </Obj>
    </div>
  );
}

// ---- Scene 4: one document, three passes ------------------------------------------
const ROWS4 = [{tc: '0:00'}, {tc: '0:04'}, {tc: '0:08'}, {tc: '0:13'}];

function Thumb({i}: {i: number}) {
  return (
    <svg width={200} height={112} viewBox="0 0 200 112">
      <rect width={200} height={112} rx={10} fill="var(--vt-panel2)" />
      {i === 0 && (
        <g>
          <circle cx={100} cy={56} r={24} fill="#FBBF24" />
          {Array.from({length: 8}, (_, k) => {
            const a = (k * Math.PI) / 4;
            return <line key={k} x1={100 + Math.cos(a) * 34} y1={56 + Math.sin(a) * 34} x2={100 + Math.cos(a) * 48} y2={56 + Math.sin(a) * 48} stroke="#FBBF24" strokeWidth={5} strokeLinecap="round" />;
          })}
        </g>
      )}
      {i === 1 && (
        <g>
          {Array.from({length: 14}, (_, k) => (
            <circle key={k} cx={20 + hash(k, 1) * 160} cy={16 + hash(k, 2) * 80} r={6} fill="var(--vt-data)" />
          ))}
          <path d="M16 56H70" stroke="var(--vt-text)" strokeWidth={5} strokeLinecap="round" />
        </g>
      )}
      {i === 2 && (
        <g>
          <circle cx={100} cy={56} r={16} fill="none" stroke="var(--vt-text)" strokeWidth={5} />
          <circle cx={100} cy={56} r={6} fill="var(--vt-data)" />
          {[
            [24, 20],
            [176, 20],
            [24, 92],
            [176, 92],
          ].map(([x, y], k) => (
            <path key={k} d={`M${x} ${y} L${x + (100 - x) * 0.55} ${y + (56 - y) * 0.55}`} stroke="var(--vt-data)" strokeWidth={5} strokeLinecap="round" />
          ))}
        </g>
      )}
      {i === 3 && (
        <g>
          <line x1={10} y1={84} x2={190} y2={84} stroke="var(--vt-faint)" strokeWidth={5} />
          <circle cx={150} cy={76} r={18} fill="var(--vt-grad)" />
          <path d="M150 20 Q60 20 24 76" stroke="var(--vt-text)" strokeWidth={4} fill="none" strokeDasharray="8 8" />
        </g>
      )}
    </svg>
  );
}

function Gear({size, color}: {size: number; color: string}) {
  return (
    <svg width={size} height={size} viewBox="-40 -40 80 80">
      <g fill={color}>
        {Array.from({length: 8}, (_, k) => (
          <rect key={k} x={-6} y={-36} width={12} height={16} rx={2} transform={`rotate(${k * 45})`} />
        ))}
        <circle r={26} />
      </g>
      <circle r={11} fill="var(--vt-bg)" />
    </svg>
  );
}

function Spark({size, color}: {size: number; color: string}) {
  return (
    <svg width={size} height={size} viewBox="-40 -40 80 80">
      <path d="M0-36 C4-10 10-4 36 0 C10 4 4 10 0 36 C-4 10 -10 4 -36 0 C-10 -4 -4 -10 0 -36Z" fill={color} />
    </svg>
  );
}

function Checks({size, color}: {size: number; color: string}) {
  return (
    <svg width={size} height={size} viewBox="-40 -40 80 80" fill="none" stroke={color} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M-34-22l7 7 12-14" />
      <path d="M-34 12l7 7 12-14" />
      <path d="M-4-22H34" />
      <path d="M-4 12H34" />
    </svg>
  );
}

function Role({id, y, color, name, owns, icon}: {id: string; y: number; color: string; name: string; owns: string; icon: any}) {
  return (
    <Obj id={id} style={{position: 'absolute', left: 90, top: y, width: 470, display: 'flex', alignItems: 'center', gap: 28}}>
      <div style={{width: 112, height: 112, borderRadius: 56, border: `4px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none'}}>{icon}</div>
      <div>
        <div style={{fontFamily: SANS, fontSize: 60, fontWeight: 700, color, lineHeight: 1}}>{name}</div>
        <div style={{fontFamily: SANS, fontSize: 32, color: 'var(--vt-muted)', marginTop: 10}}>{owns}</div>
      </div>
    </Obj>
  );
}

function Passes() {
  const type = useProp('type', 0);
  const render = clamp(useProp('render', 0));
  const script = [useText('script-0', 'Light from the Sun looks white.'), useText('script-1', 'Air scatters blue light the most.'), useText('script-2', 'So blue reaches your eyes from every side.'), useText('script-3', 'At sunset the light travels farther.')];
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, fontFamily: SANS}}>
      <Role id="role-agent" y={140} color={AGENT} name={useText('agent', 'Agent')} owns={useText('agent-is', 'the writer')} icon={<Spark size={64} color="var(--vt-op)" />} />
      <Role id="role-skill" y={370} color={SKILL} name={useText('skill', 'Skill')} owns={useText('skill-is', 'the editor with taste')} icon={<Checks size={64} color="var(--vt-warn)" />} />
      <Role id="role-engine" y={600} color={ENGINE} name={useText('engine', 'Engine')} owns={useText('engine-is', 'the crew')} icon={<Gear size={64} color="var(--vt-data)" />} />
      <Obj id="nodeck" style={{position: 'absolute', left: 190, top: 506, display: 'flex', alignItems: 'center', gap: 14, fontFamily: SANS, fontSize: 30, color: 'var(--vt-muted)'}}>
        <svg width={64} height={44} viewBox="0 0 64 44">
          {[0, 1, 2].map((k) => (
            <rect key={k} x={4 + k * 20} y={6} width={16} height={32} rx={3} fill="none" stroke="var(--vt-muted)" strokeWidth={3} />
          ))}
          <path d="M4 40 L60 4" stroke="var(--vt-bad)" strokeWidth={5} strokeLinecap="round" />
        </svg>
        {useText('slide-deck', 'slide deck')}
      </Obj>
      <div style={{position: 'absolute', left: 640, top: 110, width: 960, height: 690, borderRadius: 26, background: 'var(--vt-panel)', border: '2px solid var(--vt-border)', overflow: 'hidden'}}>
        {ROWS4.map((r, i) => (
          <div key={i} style={{position: 'absolute', left: 0, top: 16 + i * 162, width: 960, height: 150, display: 'flex', alignItems: 'center'}}>
            <Obj id={`tc-${i}`} style={{width: 150, textAlign: 'center', fontFamily: MONO, fontSize: 34, color: 'var(--vt-data)'}}>{r.tc}</Obj>
            <div style={{width: 520, fontSize: 38, lineHeight: 1.2, color: 'var(--vt-text)', paddingRight: 20, minHeight: 90}}>{typed(script[i], clamp(type - i) * script[i].length)}</div>
            <Obj id={`thumb-${i}`} style={{position: 'relative', width: 200, height: 112}}>
              <Thumb i={i} />
              <Obj id={`frame-${i}`} style={{position: 'absolute', left: 0, top: 0, width: 200, height: 112, boxSizing: 'border-box', border: '4px solid var(--vt-data)', borderRadius: 14}} />
            </Obj>
          </div>
        ))}
      </div>
      <Obj id="rbar" style={{position: 'absolute', left: 640, top: 826, width: 960, height: 36, display: 'flex', alignItems: 'center', gap: 20}}>
        <span style={{fontFamily: MONO, fontSize: 30, color: 'var(--vt-muted)'}}>final.mp4</span>
        <div style={{flex: 1, height: 14, borderRadius: 7, background: 'var(--vt-panel2)', overflow: 'hidden'}}>
          <div style={{width: `${render * 100}%`, height: 14, background: 'var(--vt-data)'}} />
        </div>
      </Obj>
    </div>
  );
}

// ---- Scene 5: the agent looks at its own work -----------------------------------
const FW = 340;
const FH = 190;
const GX = 244;
const GY = 130;
const PAD = 24;

function MiniFrame({i, fix}: {i: number; fix: number}) {
  const kind = i % 4;
  const color = ['var(--vt-data)', 'var(--vt-op)', 'var(--vt-warn)', 'var(--vt-good)'][kind];
  const titleW = i === 9 ? lerp(430, 200, fix) : 200;
  const cx = i === 4 ? lerp(190, 284, fix) : 270;
  return (
    <g>
      <rect width={FW} height={FH} rx={14} fill="var(--vt-panel)" stroke="var(--vt-border)" strokeWidth={3} />
      <rect x={24} y={24} width={titleW} height={18} rx={9} fill="var(--vt-muted)" opacity={0.7} />
      {kind === 0 && <circle cx={cx} cy={62} r={34} fill={color} />}
      {kind === 1 && [0, 1, 2, 3].map((k) => <rect key={k} x={40 + k * 54} y={150 - (24 + k * 22)} width={36} height={24 + k * 22} rx={6} fill={color} />)}
      {kind === 2 && (
        <g>
          <rect x={24} y={70} width={134} height={58} rx={8} fill={color} opacity={0.85} />
          <rect x={182} y={70} width={134} height={58} rx={8} fill={color} opacity={0.4} />
        </g>
      )}
      {kind === 3 && <polyline points="30,128 90,104 150,116 210,78 280,60" fill="none" stroke={color} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />}
      {i === 4 && <circle cx={cx} cy={62} r={34} fill="var(--vt-warn)" />}
    </g>
  );
}

function Sheet5() {
  const scan = useProp('scan', 0);
  const fix = ease(clamp(useProp('fix', 0)));
  const frames = [];
  for (let i = 0; i < 12; i++) {
    const c = i % 4;
    const r = Math.floor(i / 4);
    const x = GX + c * (FW + PAD);
    const y = GY + r * (FH + PAD);
    const seen = scan > (c + 0.5) / 4;
    const defect = i === 4 || i === 9;
    const bad = defect && seen && fix < 1;
    const tone = bad ? 'var(--vt-bad)' : seen ? 'var(--vt-good)' : 'transparent';
    frames.push(
      <g key={i} transform={`translate(${x} ${y})`}>
        <MiniFrame i={i} fix={fix} />
        <rect x={-6} y={-6} width={FW + 12} height={FH + 12} rx={18} fill="none" stroke={tone} strokeWidth={bad ? 7 : 4} opacity={seen ? 1 : 0} />
        {seen && !defect && <path d="M296 168l10 10 20-24" fill="none" stroke="var(--vt-good)" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />}
        {seen && defect && !bad && <path d="M296 168l10 10 20-24" fill="none" stroke="var(--vt-good)" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />}
        {bad && (
          <g>
            <rect x={20} y={134} width={i === 4 ? 188 : 206} height={44} rx={22} fill="var(--vt-bad)" />
            <text x={i === 4 ? 114 : 123} y={165} textAnchor="middle" fontFamily="var(--vt-sans)" fontSize={28} fontWeight={700} fill="#fff">{i === 4 ? useText('collides', 'text collides') : useText('off-edge', 'off the edge')}</text>
          </g>
        )}
      </g>,
    );
  }
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
      <Obj as="g" id="grid">
        {frames}
      </Obj>
      {scan > 0 && scan < 1.02 && <line x1={GX + scan * (4 * FW + 3 * PAD)} y1={GY - 24} x2={GX + scan * (4 * FW + 3 * PAD)} y2={GY + 3 * FH + 2 * PAD + 24} stroke="var(--vt-data)" strokeWidth={6} strokeLinecap="round" />}
    </svg>
  );
}


// ---- Scene 4: fix the one number --------------------------------------------------
function Diff() {
  const row = {display: 'flex', alignItems: 'center', height: 84, padding: '0 28px', whiteSpace: 'pre' as const, borderRadius: 12};
  return (
    <div style={{width: 720, borderRadius: 24, background: 'var(--vt-panel)', border: '2px solid var(--vt-border)', padding: '36px 24px', boxSizing: 'border-box', fontFamily: MONO, fontSize: 40, color: 'var(--vt-muted)'}}>
      <div style={{...row, height: 70}}>{'<Chart'}</div>
      <Obj id="d-minus" style={{...row, background: 'color-mix(in srgb, var(--vt-bad) 18%, transparent)', color: 'var(--vt-bad)'}}>{'-  label="+42%"'}</Obj>
      <Obj id="d-plus" style={{...row, background: 'color-mix(in srgb, var(--vt-good) 18%, transparent)', color: 'var(--vt-good)'}}>{'+  label="+27%"'}</Obj>
      <div style={{...row, height: 70}}>{'/>'}</div>
    </div>
  );
}

function Unchanged() {
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 22, fontFamily: SANS, fontSize: 46, fontWeight: 700, color: 'var(--vt-good)'}}>
      <svg width={52} height={52} viewBox="0 0 52 52" fill="none" stroke="var(--vt-good)" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 27l12 12 24-26" />
      </svg>
      {useText('unchanged', 'Everything else: unchanged')}
    </div>
  );
}

// ---- Scene 7: films made the same way -----------------------------------------------
const WALL = [
  {id: 'ice', asset: 'p-ice', x: 105, y: 110},
  {id: 'chip', asset: 'p-chip', x: 690, y: 110},
  {id: 'jp', asset: 'p-jp', x: 1275, y: 110},
  {id: 'sonnet', asset: 'p-sonnet', x: 397, y: 490},
  {id: 'app', asset: 'p-app', x: 982, y: 490},
];

function Wall() {
  const glow = clamp(useProp('glow', 0));
  const labels: Record<string, string> = {
    ice: useText('wall-ice', 'Why ice floats'),
    chip: useText('wall-chip', 'From sand to a processor'),
    jp: useText('wall-jp', 'Japan’s population, in Japanese'),
    sonnet: useText('wall-sonnet', 'A sonnet, in type alone'),
    app: useText('wall-app', 'A launch film for an app we made up'),
  };
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, fontFamily: SANS}}>
      {WALL.map((t) => (
        <Obj key={t.id} id={`t-${t.id}`} style={{position: 'absolute', left: t.x, top: t.y, width: 540}}>
          <img src={useAsset(t.asset)} width={540} height={304} style={{display: 'block', borderRadius: 16, boxSizing: 'border-box', border: '4px solid', borderColor: `color-mix(in srgb, var(--vt-grad) ${Math.round(glow * 100)}%, var(--vt-border))`}} />
          <div style={{marginTop: 14, fontSize: 30, color: 'var(--vt-text)', whiteSpace: 'nowrap'}}>{labels[t.id]}</div>
        </Obj>
      ))}
    </div>
  );
}

// ---- Scene 6: one document, three outputs ------------------------------------------
function Pic({w, h}: {w: number; h: number}) {
  const tall = h > w;
  const title = useText('pic-title', 'Revenue');
  const before = useText('sheet-before', 'Revenue ');
  const doubled = useText('sheet-word', 'doubled');
  const after = useText('sheet-after', ' in March.');
  const bars = [0.3, 0.5, 0.68, 1];
  return (
    <div style={{position: 'relative', width: w, height: h, background: 'var(--vt-bg)', fontFamily: SANS, overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: tall ? 24 : 48, top: tall ? 28 : 36, fontSize: tall ? 40 : 56, fontWeight: 700, color: 'var(--vt-text)'}}>{title}</div>
      <div style={{position: 'absolute', left: tall ? 24 : 48, right: tall ? 24 : 48, bottom: tall ? h * 0.46 : 40, top: tall ? 100 : 130, display: 'flex', alignItems: 'flex-end', gap: tall ? 14 : 30}}>
        {bars.map((b, i) => (
          <div key={i} style={{flex: 1, height: `${b * 100}%`, borderRadius: 8, background: i === 3 ? 'var(--vt-grad)' : 'var(--vt-data)', opacity: i === 3 ? 1 : 0.6}} />
        ))}
      </div>
      {tall && (
        <div style={{position: 'absolute', left: 24, right: 24, bottom: 36, fontSize: 40, lineHeight: 1.15, fontWeight: 700, color: 'var(--vt-text)'}}>
          {before}<span style={{color: 'var(--vt-grad)'}}>{doubled}</span>{after}
        </div>
      )}
    </div>
  );
}

function Outputs() {
  const shape = ease(clamp(useProp('shape', 0)));
  const scrub = clamp(useProp('scrub', 0));
  const n = Math.round(useProp('n', 0));
  const fw = Math.round(lerp(960, 304, shape));
  const fh = 540;
  const cx = 960;
  const top = 150;
  const left = cx - fw / 2;
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, fontFamily: SANS}}>
      <Obj id="phone" style={{position: 'absolute', left: cx - 176, top: top - 26, width: 352, height: fh + 52, boxSizing: 'border-box', borderRadius: 48, border: '4px solid var(--vt-border)'}} />
      <Obj id="chrome" style={{position: 'absolute', left: cx - 500, top: top - 74, width: 1000, height: 74 + fh + 120, boxSizing: 'border-box', borderRadius: 22, border: '3px solid var(--vt-border)', background: 'var(--vt-panel)'}}>
        <div style={{position: 'absolute', left: 24, top: 26, display: 'flex', gap: 10}}>
          {[0, 1, 2].map((k) => (
            <span key={k} style={{width: 16, height: 16, borderRadius: 8, background: 'var(--vt-faint)'}} />
          ))}
        </div>
        <div style={{position: 'absolute', left: 140, top: 16, width: 720, height: 36, borderRadius: 18, background: 'var(--vt-panel2)'}} />
      </Obj>
      <Obj id="player" style={{position: 'absolute', left: cx - 470, top: top + fh + 22, width: 940, height: 70, display: 'flex', alignItems: 'center', gap: 20}}>
        <svg width={44} height={44} viewBox="0 0 44 44">
          <rect x={8} y={6} width={9} height={32} rx={3} fill="var(--vt-text)" />
          <rect x={27} y={6} width={9} height={32} rx={3} fill="var(--vt-text)" />
        </svg>
        <div style={{position: 'relative', flex: 1, height: 12, borderRadius: 6, background: 'var(--vt-panel2)'}}>
          <div style={{position: 'absolute', left: 0, top: 0, height: 12, width: `${scrub * 100}%`, borderRadius: 6, background: 'var(--vt-grad)'}} />
          {[0, 1, 2, 3, 4, 5, 6].map((k) => (
            <span key={k} style={{position: 'absolute', left: `${(k / 6) * 100}%`, top: -8, width: 4, height: 28, background: 'var(--vt-faint)'}} />
          ))}
          <span style={{position: 'absolute', left: `calc(${scrub * 100}% - 14px)`, top: -8, width: 28, height: 28, borderRadius: 14, background: 'var(--vt-text)'}} />
        </div>
      </Obj>
      <Obj id="frame" style={{position: 'absolute', left, top, width: fw, height: fh, borderRadius: 14, overflow: 'hidden', boxShadow: '0 0 0 3px var(--vt-border)'}}>
        <Pic w={fw} h={fh} />
      </Obj>
      <Obj id="file" style={{position: 'absolute', left: 1500, top: 300, width: 330, height: 220, borderRadius: 22, border: '3px solid var(--vt-data)', background: 'var(--vt-panel)', padding: 28, boxSizing: 'border-box'}}>
        <div style={{fontFamily: MONO, fontSize: 44, fontWeight: 700, color: 'var(--vt-data)'}}>final.mp4</div>
        <div style={{fontFamily: MONO, fontSize: 30, color: 'var(--vt-muted)', marginTop: 12}}>1920 × 1080</div>
        <div style={{fontFamily: MONO, fontSize: 30, color: 'var(--vt-text)', marginTop: 28}}>{useText('frame-n', 'frame {n}').replace('{n}', String(n).padStart(5, '0'))}</div>
      </Obj>
    </div>
  );
}

// ---- Scene 7: how to start ---------------------------------------------------------
const INSTALL = 'npx skills add visotalk/visotalk -g';

function Terminal() {
  const chars = useProp('chars', 0);
  return (
    <div style={{width: 1200, height: 150, borderRadius: 22, background: 'var(--vt-panel)', border: '2px solid var(--vt-border)', display: 'flex', alignItems: 'center', padding: '0 44px', boxSizing: 'border-box', fontFamily: MONO, fontSize: 46, color: 'var(--vt-text)'}}>
      <span style={{color: 'var(--vt-grad)', marginRight: 24}}>$</span>
      {typed(INSTALL, chars)}
    </div>
  );
}

function Ask() {
  const type = clamp(useProp('type', 0));
  const ask = useText('ask', 'Explain why the sky is blue.');
  return (
    <div style={{width: 1200, height: 150, borderRadius: 22, background: 'var(--vt-panel)', border: '2px solid var(--vt-border)', display: 'flex', alignItems: 'center', gap: 28, padding: '0 44px', boxSizing: 'border-box', fontFamily: SANS, fontSize: 48, color: 'var(--vt-text)'}}>
      <Spark size={56} color="var(--vt-op)" />
      {typed(ask, type * ask.length)}
    </div>
  );
}

function Pill() {
  return (
    <div style={{display: 'inline-flex', alignItems: 'center', gap: 16, height: 64, padding: '0 30px', borderRadius: 32, border: '3px solid var(--vt-good)', fontFamily: SANS, fontSize: 34, fontWeight: 700, color: 'var(--vt-good)'}}>
      <span style={{width: 14, height: 14, borderRadius: 7, background: 'var(--vt-good)'}} />
      {useText('pill', 'Open source · MIT')}
    </div>
  );
}

function Ending() {
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, fontFamily: SANS, textAlign: 'center'}}>
      <Obj id="logo" style={{position: 'absolute', left: 0, top: 295, width: 1920, display: 'flex', justifyContent: 'center'}}>
        <Lockup width={800} />
      </Obj>
      <Obj id="dont" style={{position: 'absolute', left: 0, top: 585, width: 1920, fontSize: 100, fontWeight: 700, color: 'var(--vt-muted)'}}>
        {useText('dont-a', 'Don’t ')}<span style={{textDecoration: 'line-through', textDecorationColor: 'var(--vt-bad)', textDecorationThickness: 8}}>{useText('dont-b', 'paint')}</span>{useText('dont-c', ' the video.')}
      </Obj>
      <Obj id="writeit" style={{position: 'absolute', left: 0, top: 705, width: 1920, fontSize: 200, fontWeight: 700, lineHeight: 1, color: 'var(--vt-text)', letterSpacing: -4}}>
        {useText('writeit', 'Write it.')}
        <div style={{width: 520, height: 12, background: 'var(--vt-grad)', margin: '14px auto 0'}} />
      </Obj>
    </div>
  );
}

export default (
  <Doc id="visotalk-intro" poster={155} title="What is VisoTalk" lang="en" theme="visotalk/dark" canvas="16x9"
    tokens={{
      colors: {bg: '#10151c', panel: '#171e28', panel2: '#1e2733', border: '#2c3747', text: '#e6ebf2', muted: '#98a3b3', faint: '#4b586b', data: '#4aa8f2', grad: '#4aa8f2', op: '#9b86ff', good: '#3dd68c', bad: '#ff6b91', warn: '#ffb020'},
      fonts: {sans: '"Schibsted Grotesk", system-ui, sans-serif', mono: '"JetBrains Mono", monospace'},
    }}>
    <Asset id="p-ice" kind="image" src="media/ice-floats.jpg" license={{id: "user-owned", obligations: []}} />
    <Asset id="p-chip" kind="image" src="media/chip-fab.jpg" license={{id: "user-owned", obligations: []}} />
    <Asset id="p-jp" kind="image" src="media/jp-population.jpg" license={{id: "user-owned", obligations: []}} />
    <Asset id="p-sonnet" kind="image" src="media/sonnet-18.jpg" license={{id: "user-owned", obligations: []}} />
    <Asset id="p-app" kind="image" src="media/app-demo.jpg" license={{id: "user-owned", obligations: []}} />
    {/* The music bed is somebody else's track and stays out of the repository (audio/ is gitignored): curl -o examples/visotalk-intro/audio/music.mp3 https://cdn.pixabay.com/audio/2023/12/22/audio_fa41605e87.mp3 */}
    <Asset id="bed" kind="audio" src="audio/music.mp3" source="https://pixabay.com/music/corporate-tutorial-technology-182513/"
      license={{id: "pixabay-content", attribution: "Tutorial technology by PaulYudin, Pixabay", url: "https://pixabay.com/service/license-summary/", obligations: []}} />

    <Scene id="pain">
      <Line id="l1">Be honest. Have you ever asked an AI to make you an explainer video?</Line>
      <Line id="l2" text="It looks gorgeous. Then you spot it. The chart says 42%. It should say 27%.">It looks gorgeous. Then you spot it. The chart says forty-two percent. It should say twenty-seven.</Line>
      <Line id="l3">One wrong number. So you hit regenerate.</Line>
      <Line id="l4">And everything changes. New colours, new bars, new everything. The number? Still wrong.</Line>
      <Line id="l5" hold={2.6}>That's not editing. That's a slot machine.</Line>
      <Part id="film" x={360} y={110} w={1200} h={600}>{() => <Mosaic baseShuffle={0} baseFlow={0} />}</Part>
      <Part id="regen" x={750} y={750} w={420} h={84}>{() => <Regen />}</Part>
      {/* the bed comes in once the pain has been said and has a few seconds to itself, then sits 8 dB under the voice and steps back 3 dB while it speaks */}
      <Sound asset="bed" line="l5" edge="end" loop volume={-8} duck={3} fadeIn={1.2} fadeOut={4} />
      <Animation>
        <Appear on="film" at="start" dur={0} />
        <Appear on="ring" line="l2" word="chart says" />
        <Appear on="regen" line="l3" word="regenerate" />
        <Tween on="regen-icon" rotate={360} dur={1.6} easing="easeInOut" line="l4" word="everything changes" />
        <Tween on="film" shuffle={1} dur={1.6} easing="easeInOut" line="l4" word="everything changes" />
        <Tween on="regen-icon" rotate={720} dur={1.2} easing="easeInOut" line="l5" word="slot machine" />
      </Animation>
    </Scene>

    <Scene id="document">
      <Line id="l6" text="VisoTalk starts from a different idea.">Veezo Talk starts from a different idea.</Line>
      <Line id="l7">A video is a document.</Line>
      <Line id="l8">A script, the pictures that explain it, and the exact word each picture arrives on.</Line>
      <Part id="pixels" x={360} y={110} w={1200} h={600}>{() => <Mosaic baseShuffle={1} baseFlow={0} />}</Part>
      <Part id="sheet" x={210} y={130} w={1500} h={640}>{() => <Sheet />}</Part>
      <Animation>
        <Appear on="pixels" at="start" dur={0} />
        <Tween on="pixels" flow={1} dur={1.2} easing="easeInOut" line="l6" word="different idea" />
        <Appear on="sheet" line="l7" word="document" />
        <Appear on="r-line" line="l8" word="script" />
        <Appear on="r-part" line="l8" word="pictures" />
        <Appear on="r-anim" line="l8" word="exact word" />
        <Appear on="link" line="l8" word="arrives on" />
        <Tween on="sheet" hi={1} dur={0.5} line="l8" word="arrives on" />
        <Tween on="sheet" grow={1} dur={0.8} easing="easeOut" line="l8" word="arrives on" offset={0.2} />
      </Animation>
    </Scene>

    <Scene id="clock">
      <Line id="l9">Here's the trick. The words are the clock.</Line>
      <Line id="l10" text={'Nobody writes a timestamp. Take the line “Revenue doubled in March.” The bar rises on the word “doubled.”'}>Nobody writes a timestamp. Take the line: revenue doubled in March. The bar rises on the word doubled.</Line>
      <Line id="l11">Now change the sentence. Add two words. The bar moves with its word.</Line>
      <Line id="l12" hold={1}>Nothing to re-time. Nothing to generate again.</Line>
      <Part id="timeline" x={0} y={0} w={1920} h={1080}>{() => <Clock />}</Part>
      <Animation>
        <Appear on="timeline" line="l9" word="words" />
        <Appear on="chips" line="l9" word="words" />
        <Appear on="ruler" line="l9" word="clock" />
        <Appear on="chart" line="l10" word="Take the line" />
        <Appear on="link" line="l10" word="Take the line" offset={0.3} />
        <Tween on="timeline" play={2.2} dur={2.2} easing="linear" line="l10" word="bar rises" />
        <Set on="timeline" play={0} line="l11" word="Now change" />
        <Tween on="timeline" edit={1} dur={1.4} easing="easeInOut" line="l11" word="Add two words" />
        <Tween on="timeline" play={3.2} dur={3.0} easing="linear" line="l11" word="bar moves" />
        <Appear on="zero-a" line="l12" />
        <Appear on="zero-b" line="l12" word="generate" />
      </Animation>
    </Scene>

    <Scene id="fix">
      <Line id="l13" text="So, back to that wrong number. Open the file, change 42 to 27, and you're done.">So, back to that wrong number. Open the file, change forty-two to twenty-seven, and you're done.</Line>
      <Line id="l14" hold={1.2}>One number changes. Everything else stays exactly where it was.</Line>
      <Part id="diff" x={100} y={230} w={720} h={400}>{() => <Diff />}</Part>
      <Part id="film2" x={900} y={190} w={840} h={420}>{() => (
        <div style={{width: 1200, height: 600, transform: 'scale(0.7)', transformOrigin: 'top left'}}>
          <Mosaic baseShuffle={0} baseFlow={0} />
        </div>
      )}</Part>
      <Part id="same" x={900} y={650} w={900} h={70}>{() => <Unchanged />}</Part>
      <Animation>
        <Set on="film2" num={42} at="start" />
        <Appear on="film2" at="start" dur={0.6} />
        <Appear on="diff" line="l13" word="Open the file" />
        <Appear on="d-minus" line="l13" word="forty-two" />
        <Appear on="d-plus" line="l13" word="twenty-seven" />
        <Tween on="film2" num={27} dur={0.9} easing="easeInOut" line="l13" word="twenty-seven" />
        <Tween on="film2" ok={1} dur={0.6} line="l13" word="twenty-seven" />
        <Appear on="same" line="l14" word="Everything else" />
      </Animation>
    </Scene>

    <Scene id="roles">
      <Line id="l15">Your agent is the writer: the research, the script, what to show.</Line>
      <Line id="l16">The skill is the editor with taste: gather the facts first, one change per sentence, and never, ever a slide deck.</Line>
      <Line id="l17" hold={1}>And the engine is the crew: timing, layout, rendering. The same frame, every time.</Line>
      <Part id="passes" x={0} y={0} w={1920} h={1080}>{() => <Passes />}</Part>
      <Animation>
        <Appear on="passes" line="l15" word="agent" />
        <Appear on="role-agent" line="l15" word="agent" />
        <Tween on="passes" type={4} dur={3.4} easing="linear" line="l15" word="research" />
        <Appear on="role-skill" line="l16" word="skill" />
        <Appear on="thumb-0" line="l16" word="one change" />
        <Appear on="thumb-1" line="l16" word="change per" offset={0.1} />
        <Appear on="thumb-2" line="l16" word="per sentence" />
        <Appear on="thumb-3" line="l16" word="sentence" offset={0.3} />
        <Appear on="nodeck" line="l16" word="slide deck" />
        <Appear on="role-engine" line="l17" word="engine" />
        <Appear on={['tc-0', 'tc-1', 'tc-2', 'tc-3']} stagger={0.15} line="l17" word="timing" />
        <Appear on={['frame-0', 'frame-1', 'frame-2', 'frame-3']} stagger={0.15} line="l17" word="layout" />
        <Appear on="rbar" line="l17" word="rendering" />
        <Tween on="passes" render={1} dur={2} easing="easeInOut" line="l17" word="rendering" />
      </Animation>
    </Scene>

    <Scene id="check">
      <Line id="l18">Then it does what a real editor does. It looks.</Line>
      <Line id="l19">Every sentence becomes a frame. A checker catches text that collides, runs off the edge, or flashes by too fast.</Line>
      <Line id="l20" hold={1}>The agent fixes it all before you ever see it.</Line>
      <Part id="inspect" x={0} y={0} w={1920} h={1080}>{() => <Sheet5 />}</Part>
      <Animation>
        <Appear on="inspect" line="l18" word="looks" />
        <Appear on="grid" line="l18" word="looks" dur={0.8} />
        <Tween on="inspect" scan={1.05} dur={3.4} easing="linear" line="l19" word="checker" />
        <Tween on="inspect" fix={1} dur={1.4} easing="easeInOut" line="l20" word="fixes" />
      </Animation>
    </Scene>

    <Scene id="range">
      <Line id="l21">This isn't a one-trick tool. Here is why ice floats, and how a chip is made, from sand.</Line>
      <Line id="l22">Why Japan's population is shrinking, in Japanese. A Shakespeare sonnet, in nothing but type. A phone app's launch film, for an app we made up.</Line>
      <Line id="l23" hold={1.2}>Each one is a single document, written by an agent from one sentence.</Line>
      <Part id="wall" x={0} y={0} w={1920} h={1080}>{() => <Wall />}</Part>
      <Animation>
        <Appear on="wall" line="l21" word="ice floats" />
        <Appear on="t-ice" line="l21" word="ice floats" />
        <Appear on="t-chip" line="l21" word="chip" />
        <Appear on="t-jp" line="l22" word="population" />
        <Appear on="t-sonnet" line="l22" word="sonnet" />
        <Appear on="t-app" line="l22" word="launch film" />
        <Tween on="wall" glow={1} dur={0.8} line="l23" word="single document" />
      </Animation>
    </Scene>

    <Scene id="outputs">
      <Line id="l24">And the same document plays in the browser, with sound, pause, and a jump to any sentence.</Line>
      <Line id="l25">It renders to an MP4, frame for frame.</Line>
      <Line id="l26" hold={1.2}>Or turns vertical for a phone. The picture lays itself out again. Nothing is drawn twice.</Line>
      <Part id="outs" x={0} y={0} w={1920} h={1080}>{() => <Outputs />}</Part>
      <Animation>
        <Appear on="outs" line="l24" word="document" />
        <Appear on="frame" line="l24" word="document" />
        <Appear on="chrome" line="l24" word="browser" />
        <Appear on="player" line="l24" word="pause" />
        <Tween on="outs" scrub={0.62} dur={2.4} easing="easeInOut" line="l24" word="jump to any" />
        <Disappear on={['chrome', 'player']} line="l25" word="renders" />
        <Appear on="file" line="l25" word="MP4" />
        <Tween on="outs" n={1800} dur={2.2} easing="easeOut" line="l25" word="frame for frame" />
        <Disappear on="file" line="l26" word="vertical" />
        <Tween on="outs" shape={1} dur={1.4} easing="easeInOut" line="l26" word="vertical" />
        <Appear on="phone" line="l26" word="phone" />
      </Animation>
    </Scene>

    <Scene id="start">
      <Line id="l27" text="VisoTalk is open source. One command adds the skill to Claude Code, Codex, and other agents.">Veezo Talk is open source. One command adds the skill to Claude Code, Codex, and other agents.</Line>
      <Line id="l28">Then just ask: explain why the sky is blue.</Line>
      <Line id="l29" text="Don't paint the video. Write it. visotalk.dev" hold={2.6}>Don't paint the video. Write it. visotalk dot dev.</Line>
      <Part id="pill" x={360} y={120} w={420} h={70}>{() => <Pill />}</Part>
      <Part id="term" x={360} y={230} w={1200} h={150}>{() => <Terminal />}</Part>
      <Part id="ask" x={360} y={430} w={1200} h={150}>{() => <Ask />}</Part>
      <Part id="ending" x={0} y={0} w={1920} h={1080}>{() => <Ending />}</Part>
      <Animation>
        <Appear on="pill" line="l27" word="open source" />
        <Appear on="term" line="l27" word="One command" />
        <Tween on="term" chars={35} dur={2.2} easing="linear" line="l27" word="One command" offset={0.3} />
        <Appear on="ask" line="l28" word="ask" />
        <Tween on="ask" type={1} dur={1.8} easing="linear" line="l28" word="ask" offset={0.2} />
        <Disappear on={['pill', 'term', 'ask']} line="l29" word="paint" offset={-0.5} />
        <Appear on="ending" line="l29" word="paint" />
        <Appear on="logo" line="l29" word="paint" offset={-0.4} />
        <Appear on="dont" line="l29" word="paint" />
        <Appear on="writeit" line="l29" word="Write" />
      </Animation>
    </Scene>
  </Doc>
);
