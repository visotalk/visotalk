import {Doc, Scene, Line, Part, Animation, Appear, Disappear, Tween, Set} from '@visotalk/jsx';
import {useProp, Obj} from '@visotalk/runtime';

/** The plot: x runs over two periods (0 to 4 pi), the square wave sits at plus and minus one. */
const X0 = 170, PW = 1500, CY = 290, A = 170, TURN = 4 * Math.PI, TERMS = 25;
const px = (x: number) => X0 + (x / TURN) * PW;
const py = (v: number) => CY - v * A;

/** The partial sum of the series: `n` odd harmonics, the last one fading in while n is between two whole numbers. */
function partial(x: number, n: number) {
  let s = 0;
  for (let i = 0; i < TERMS; i++) {
    const w = Math.max(0, Math.min(1, n - i));
    if (w === 0) break;
    const k = 2 * i + 1;
    s += (w * 4 * Math.sin(k * x)) / (Math.PI * k);
  }
  return s;
}
const sumPath = (n: number) => {
  let d = '';
  for (let j = 0; j <= 420; j++) {
    const x = (j / 420) * TURN;
    d += `${j ? 'L' : 'M'}${px(x).toFixed(1)} ${py(partial(x, n)).toFixed(1)}`;
  }
  return d;
};
/** Where the first overshoot after the jump at x = 0 peaks. */
function firstPeak(n: number) {
  let bx = 0.01, bv = -9;
  for (let x = 0.004; x < 0.9; x += 0.004) {
    const v = partial(x, n);
    if (v > bv) { bv = v; bx = x; }
  }
  return {x: bx, v: bv};
}
const SQUARE = `M${px(0)} ${py(-1)}V${py(1)}H${px(Math.PI)}V${py(-1)}H${px(2 * Math.PI)}V${py(1)}H${px(3 * Math.PI)}V${py(-1)}H${px(4 * Math.PI)}`;

const ROWS = [
  {k: 1, hue: 200, frac: '1'},
  {k: 3, hue: 150, frac: '1/3'},
  {k: 5, hue: 50, frac: '1/5'},
  {k: 7, hue: 20, frac: '1/7'},
  {k: 9, hue: 320, frac: '1/9'},
];
const ROW_Y = (r: number) => 590 + r * 52;
const rowPath = (k: number, r: number) => {
  let d = '';
  for (let j = 0; j <= 420; j++) {
    const x = (j / 420) * TURN;
    d += `${j ? 'L' : 'M'}${px(x).toFixed(1)} ${(ROW_Y(r) - (20 * 4 * Math.sin(k * x)) / (Math.PI * k)).toFixed(1)}`;
  }
  return d;
};
const text = {fontFamily: 'var(--vt-sans)', fontWeight: 700} as const;

/** One global picture for the whole film: a ghost square wave, the sum that approaches it, and the sine waves it is built from. */
const Scope = () => {
  const n = useProp('n', 1);
  const draw = useProp('draw', 0);
  const hi = useProp('hi', 0);
  const peak = firstPeak(n);
  const gx = px(peak.x), gy = py(peak.v);
  return (
    <svg viewBox="0 0 1920 880" width={1920} height={880} style={{display: 'block'}}>
      <Obj as="g" id="axis"><line x1={X0 - 20} x2={X0 + PW + 20} y1={CY} y2={CY} stroke="var(--vt-border)" strokeWidth={2} /></Obj>
      <Obj as="g" id="ghost"><path d={SQUARE} fill="none" stroke="var(--vt-muted)" strokeWidth={6} strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} /></Obj>
      <Obj as="g" id="sum"><path d={sumPath(n)} fill="none" stroke="var(--vt-data)" strokeWidth={8} strokeLinejoin="round" strokeLinecap="round" /></Obj>
      <Obj as="g" id="oddtag"><text x={X0} y={52} fontSize={38} fill="var(--vt-text)" style={text}>only odd: 1, 3, 5, 7, 9 …</text></Obj>
      {ROWS.map((r, i) => (
        <g key={r.k}>
          <Obj as="g" id={`row-${r.k}`}>
            <path d={rowPath(r.k, i)} fill="none" stroke={`hsl(${r.hue} 80% 62%)`} strokeWidth={(hi === 1 && r.k <= 3) || (hi === 2 && r.k >= 5) ? 9 : 4} />
            <text x={X0 - 24} y={ROW_Y(i) + 11} fontSize={32} textAnchor="end" fill={`hsl(${r.hue} 80% 68%)`} style={text}>{r.k}×</text>
          </Obj>
          <Obj as="g" id={`ht-${r.k}`}><text x={X0 + PW + 28} y={ROW_Y(i) + 11} fontSize={32} fill={`hsl(${r.hue} 80% 68%)`} style={text}>{r.frac} tall</text></Obj>
        </g>
      ))}
      <Obj as="g" id="more"><text x={X0 + PW / 2} y={ROW_Y(5) + 4} fontSize={34} textAnchor="middle" fill="var(--vt-muted)" style={text}>… and more, up to 17×</text></Obj>
      <Obj as="g" id="gname"><text x={X0 + 330} y={52} fontSize={44} fill="var(--vt-text)" style={text}>the Gibbs phenomenon</text></Obj>
      <Obj as="g" id="ring">
        <line x1={gx - 120} x2={gx + 120} y1={py(1)} y2={py(1)} stroke="var(--vt-muted)" strokeWidth={2} strokeDasharray="8 8" />
        <circle cx={gx} cy={gy} r={26} fill="none" stroke="var(--vt-warn)" strokeWidth={5} />
        <text x={gx + 40} y={gy - 30} fontSize={52} fill="var(--vt-warn)" style={text}>+9%</text>
      </Obj>
    </svg>
  );
};

const Formula = () => {
  const t = {fontFamily: 'var(--vt-mono)', fontWeight: 700, fontSize: 60, color: 'var(--vt-text)'} as const;
  return (
    <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 22, rowGap: 24, whiteSpace: 'nowrap', ...t}}>
      <Obj id="f-lhs" style={{color: 'var(--vt-muted)', width: '100%', fontSize: 52}}>square wave ≈ 4/π ×</Obj>
      <Obj id="f-1" style={{color: 'hsl(200 80% 68%)'}}>sin x</Obj>
      <Obj id="f-3" style={{color: 'hsl(150 80% 68%)'}}>+ sin 3x / 3</Obj>
      <Obj id="f-5" style={{color: 'hsl(50 80% 68%)'}}>+ sin 5x / 5</Obj>
      <Obj id="f-7" style={{color: 'hsl(20 80% 68%)'}}>+ …</Obj>
      <Obj id="f-tag" style={{color: 'var(--vt-data)', width: '100%', fontSize: 48}}>= its Fourier series</Obj>
    </div>
  );
};

export default <Doc id="fourier" poster={30} title="How a Fourier series builds a square wave" lang="en" theme="visotalk/dark" canvas="16x9"
  exports={{variants: [{preset: "16x9"}], fps: 30, captions: "burned"}}>
  <Part id="scope" x={0} y={0} w={1920} h={880}><Scope /></Part>

  <Scene id="hook">
    <Line id="l1">A square wave looks nothing like a sine wave: it jumps, and then it sits perfectly flat.</Line>
    <Line id="l2">Yet add enough sine waves together, and you can build it exactly.</Line>
    <Animation>
      <Appear on={["scope", "axis"]} at="start" />
      <Appear on="ghost" line="l1" word="square wave" />
      <Tween on="scope" draw={1} line="l1" word="square wave" dur={2.2} easing="easeInOut" />
      <Appear on="sum" line="l1" word="sine wave" />
      <Tween on="scope" n={25} line="l2" word="enough sine waves" dur={2.2} easing="easeInOut" />
    </Animation>
  </Scene>

  <Scene id="build">
    <Line id="l3">Start with one sine wave, the fundamental. It already has the right rhythm: up, then down.</Line>
    <Line id="l4">Now add a second one, three times as fast and a third as tall. The corners start to square off.</Line>
    <Line id="l5" hold={1.2}>Add one five times as fast and a fifth as tall, then seven times, and nine.</Line>
    <Animation>
      <Disappear on="sum" at="start" />
      <Set on="scope" n={1} at="start" offset={0.35} />
      <Appear on="sum" line="l3" word="one sine wave" />
      <Appear on="row-1" line="l3" word="one sine wave" />
      <Appear on="row-3" line="l4" word="three times as fast" />
      <Tween on="scope" n={2} line="l4" word="a third as tall" dur={1.4} easing="easeInOut" />
      <Appear on="row-5" line="l5" word="five times as fast" />
      <Tween on="scope" n={3} line="l5" word="five times as fast" dur={1.2} easing="easeInOut" />
      <Appear on="row-7" line="l5" word="seven times" />
      <Tween on="scope" n={4} line="l5" word="seven times" dur={1.0} easing="easeInOut" />
      <Appear on="row-9" line="l5" word="and nine" />
      <Tween on="scope" n={5} line="l5" word="and nine" dur={1.0} easing="easeInOut" />
    </Animation>
  </Scene>

  <Scene id="rule">
    <Line id="l6">The pattern is simple: only odd frequencies, each one shrunk to one over its number.</Line>
    <Line id="l7">With every wave added, the flat tops get flatter and the corners get sharper.</Line>
    <Line id="l7b">The slow waves set the overall shape. The fast, tiny ones sharpen the edges.</Line>
    <Animation>
      <Appear on="oddtag" line="l6" word="only odd frequencies" />
      <Appear on={["ht-1", "ht-3", "ht-5", "ht-7", "ht-9"]} stagger={0.4} line="l6" word="one over its number" />
      <Appear on="more" line="l7" word="every wave added" />
      <Tween on="scope" n={9} line="l7" word="every wave added" dur={3} easing="easeInOut" />
      <Set on="scope" hi={1} line="l7b" word="slow waves" />
      <Set on="scope" hi={2} line="l7b" word="fast, tiny ones" />
    </Animation>
  </Scene>

  <Scene id="overshoot">
    <Line id="l8">Near each jump, the sum always overshoots by about nine percent.</Line>
    <Line id="l9">More waves squeeze the overshoot narrower, but never shorter.</Line>
    <Line id="l9b">This ripple is called the Gibbs phenomenon.</Line>
    <Animation>
      <Set on="scope" hi={0} at="start" />
      <Disappear on="oddtag" at="start" />
      <Appear on="ring" line="l8" word="overshoots" />
      <Tween on="scope" n={25} line="l9" word="more waves" dur={2.6} easing="easeInOut" />
      <Appear on="gname" line="l9b" word="Gibbs phenomenon" />
    </Animation>
  </Scene>

  <Scene id="recipe">
    <Line id="l10">So a square wave is only a stack of sine waves, a recipe of frequencies.</Line>
    <Line id="l11">That recipe is its Fourier series.</Line>
    <Line id="l12" hold={1.5}>Almost any repeating wave has one, from a musical note to a heartbeat.</Line>
    <Part id="formula" x={170} y={590} w={1600} h={290}><Formula /></Part>
    <Animation>
      <Disappear on={["ring", "gname", "more", "oddtag", "row-1", "row-3", "row-5", "row-7", "row-9", "ht-1", "ht-3", "ht-5", "ht-7", "ht-9"]} at="start" />
      <Appear on="formula" at="start" offset={0.3} />
      <Appear on="f-lhs" line="l10" word="square wave" />
      <Appear on="f-1" line="l10" word="stack of sine waves" />
      <Appear on="f-3" line="l10" word="recipe" />
      <Appear on="f-5" line="l10" word="of frequencies" />
      <Appear on="f-7" line="l11" word="That recipe" />
      <Appear on="f-tag" line="l11" word="Fourier series" />
    </Animation>
  </Scene>
</Doc>;
