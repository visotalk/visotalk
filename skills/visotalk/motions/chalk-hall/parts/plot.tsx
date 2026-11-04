import React from 'react';
import {CHALK, ChalkDefs, handLine, handShape, strokeGrain, unit, type Chalk, type Pt} from './chalk.ts';
import {ChalkLine} from './line.tsx';
import {Chalked} from './hand.ts';

export const meta = {
  name: {en: 'Chalk axes', 'zh-CN': '坐标图'},
  purpose: 'data',
  line: 'Hand-chalked axes with their numbers, points plotted one by one, curves or bars drawn on them, blue guides dashed and named.',
  fits: 'a function\'s graph; two crossing curves; a quantity by year as bars or a line',
  params: {
    width: {type: 'px', doc: 'the box\'s width'},
    height: {type: 'px', doc: 'the box\'s height'},
    x: {type: '[min, max]', doc: 'the x range; the y axis stands at x 0 when 0 is inside it, else at min'},
    y: {type: '[min, max]', doc: 'the y range; the x axis lies at y 0 when 0 is inside it, else at min'},
    step: {type: '[dx, dy]', default: [1, 1], doc: 'the distance between ticks on each axis, in its units'},
    numbers: {type: 'boolean', default: true, doc: 'the ticks\' numbers; false for axes that are only named (supply and demand)'},
    names: {type: '[x, y]', default: ['x', 'y'], doc: 'the axes\' names, with their units if any'},
    axes: {type: 'progress', default: 1, doc: '0 to 1: the axes chalked, then their numbers'},
    curves: {type: '{points, chalk?, label?, dashed?, weight?}[]', default: [], doc: 'curves or straight runs as [x, y] in the axes\' units in drawing order, each named at its end: a graph, a rise-and-run triangle, a tangent'},
    draw: {type: 'number', default: 99, doc: 'how many curves are drawn so far, with fractions mid-curve: tween 0 to 1, then to 2'},
    bars: {type: '{at, value, label?, name?, chalk?}[]', default: [], doc: 'bars raised from the x axis at an x, each with its value written above it (label, or the value) and its category under the axis (name: Q1, a brand)'},
    grown: {type: 'number', default: 99, doc: 'how many bars are raised so far, with fractions mid-bar'},
    bar: {type: 'number', default: 0.6, doc: 'a bar\'s width in x units'},
    points: {type: '{at, label?, chalk?, place?, dot?}[]', default: [], doc: 'points plotted on the axes, each with a label set above, below, left or right; dot false writes only the label there'},
    plotted: {type: 'number', default: 99, doc: 'how many points are plotted so far, with fractions while a label is written'},
    guides: {type: '{x? | y?, label?}[]', default: [], doc: 'dashed blue lines at an x or a y: an axis of symmetry, a target, a baseline'},
    guide: {type: 'progress', default: 1, doc: '0 to 1: how much of the guides is drawn'},
  },
  preview: 36.5,
};

type Place = 'above' | 'below' | 'left' | 'right' | 'above-left' | 'above-right' | 'below-left' | 'below-right';
type Point = {at: Pt; label?: string; chalk?: Chalk; place?: Place; dot?: boolean};
type Guide = {x?: number; y?: number; label?: string};
type Curve = {points: Pt[]; chalk?: Chalk; label?: string; dashed?: boolean; weight?: number};
type Bar = {at: number; value: number; label?: string; name?: string; chalk?: Chalk};

const OFFSET: Record<Place, [string, number, number]> = {
  above: ['translate(-50%, -100%)', 0, -18], below: ['translate(-50%, 0)', 0, 16], left: ['translate(-100%, -50%)', -22, 0], right: ['translate(0, -50%)', 22, 0],
  'above-left': ['translate(-100%, -100%)', -14, -12], 'above-right': ['translate(0, -100%)', 14, -12], 'below-left': ['translate(-100%, 0)', -14, 12], 'below-right': ['translate(0, 0)', 14, 12],
};

/** A tick's number as a hand writes it: no floating-point tail, a true minus */
const num = (v: number) => String(Number(v.toFixed(6))).replace('-', '−');
/** The ticks from min to max, every `step`, leaving out where the axes cross */
const ticks = ([a, b]: [number, number], step: number, skip: number) => {
  const out: number[] = [];
  for (let v = Math.ceil(a / step - 1e-9) * step; v < b - step * 0.25; v += step) if (Math.abs(v - skip) > step * 1e-6) out.push(Number(v.toFixed(6)));
  return out;
};

export function Plot({width, height, x, y, step = [1, 1], numbers = true, names = ['x', 'y'], axes = 1, curves = [], draw = 99, bars = [], grown = 99, bar = 0.6, points = [], plotted = 99, guides = [], guide = 1}: {width: number; height: number; x: [number, number]; y: [number, number]; step?: [number, number]; numbers?: boolean; names?: [string, string]; axes?: number; curves?: Curve[]; draw?: number; bars?: Bar[]; grown?: number; bar?: number; points?: Point[]; plotted?: number; guides?: Guide[]; guide?: number}) {
  // room for the numbers left of the y axis and under the x axis when the axes stand at the edge of the range
  const ox = x[0] < 0 && x[1] > 0 ? 0 : x[0], oy = y[0] < 0 && y[1] > 0 ? 0 : y[0];
  const left = ox === x[0] ? (numbers ? 96 : 40) : 36, bottom = oy === y[0] ? 74 : 36, pad = 36;
  const sx = (v: number) => left + ((v - x[0]) / (x[1] - x[0])) * (width - left - pad);
  const sy = (v: number) => height - bottom - ((v - y[0]) / (y[1] - y[0])) * (height - bottom - pad);
  const o: Pt = [sx(ox), sy(oy)];
  const xs = ticks(x, step[0], ox), ys = ticks(y, step[1], oy);
  const shown = unit((axes - 0.75) / 0.25), tick = 9;
  const dots = strokeGrain([points.length ? points.map((p) => [sx(p.at[0]), sy(p.at[1])] as Pt) : [[0, 0]]], 24, 'dots');
  const marks: Pt[][] = [...xs.map((v) => [[sx(v), o[1] - tick], [sx(v), o[1] + tick]] as Pt[]), ...ys.map((v) => [[o[0] - tick, sy(v)], [o[0] + tick, sy(v)]] as Pt[])];
  // a label is written by the chalk hand once what it names is there: `a` and `b` are the two conditions, each 0 to 1
  const label = (t: string, at: Pt, place: Place, size: number, chalk: Chalk, key: string | number, a = 1, b = 1) => {
    const [tr, dx, dy] = OFFSET[place], write = Math.min(unit(a), unit(b));
    return write <= 0 ? null : <Chalked key={key} pieces={[{text: t, size, chalk}]} write={write} seed={`plot/${key}/${t}`}
      style={{position: 'absolute', left: at[0] + dx, top: at[1] + dy, transform: tr}} />;
  };
  const crossAtZero = ox === 0 && oy === 0;
  // the corner where the axes meet is numbered only when it falls on a tick
  const onTick = (v: number, d: number) => Math.abs(v / d - Math.round(v / d)) < 1e-6;
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width, height}}>
      <ChalkDefs />
      <ChalkLine width={width} height={height} weight={6} arrow draw={unit(axes / 0.38)} strokes={[handLine([sx(x[0]) - (ox === x[0] ? 0 : 10), o[1]], [width - 4, o[1]], 'x-axis', 0.004)]} />
      <ChalkLine width={width} height={height} weight={6} arrow draw={unit((axes - 0.38) / 0.38)} strokes={[handLine([o[0], sy(y[0]) + (oy === y[0] ? 0 : 10)], [o[0], 4], 'y-axis', 0.004)]} />
      {numbers && shown > 0 && marks.length > 0 && <ChalkLine width={width} height={height} weight={4} draw={shown} strokes={marks} />}
      {numbers && xs.map((v) => label(num(v), [sx(v), o[1] + 4], v < 0 && crossAtZero ? 'below-left' : 'below', 30, 'white', `x${v}`, shown))}
      {numbers && ys.map((v) => label(num(v), [o[0] - 4, sy(v)], 'left', 30, 'white', `y${v}`, shown))}
      {numbers && crossAtZero && label('O', [o[0], o[1] + 4], 'below-left', 34, 'white', 'o', shown)}
      {numbers && !crossAtZero && onTick(ox, step[0]) && label(num(ox), [o[0], o[1] + 4], 'below', 30, 'white', 'x0', shown)}
      {numbers && !crossAtZero && onTick(oy, step[1]) && label(num(oy), [o[0] - 4, o[1]], 'left', 30, 'white', 'y0', shown)}
      {names[0] && label(names[0], [width - 4, o[1] + 6], 'below-left', 40, 'white', 'xn', shown)}
      {names[1] && label(names[1], [o[0] + 18, 22], 'right', 40, 'white', 'yn', shown)}
      {guides.map((g, i) => {
        const s = g.x !== undefined ? [[sx(g.x), sy(y[1]) + 30], [sx(g.x), sy(y[0])]] as Pt[] : [[sx(x[0]), sy(g.y!)], [sx(x[1]), sy(g.y!)]] as Pt[];
        return (
          <React.Fragment key={`g${i}`}>
            <ChalkLine width={width} height={height} chalk="blue" weight={5} dashed draw={guide} strokes={[s]} />
            {g.label && guide >= 1 && label(g.label, g.x !== undefined ? s[0] : s[1], g.x !== undefined ? 'right' : 'above-left', 36, 'blue', `gl${i}`)}
          </React.Fragment>
        );
      })}
      {bars.map((b, i) => {
        const g = unit(grown - i);
        if (g <= 0) return null;
        const half = (sx(bar) - sx(0)) / 2, cx = sx(b.at), top = sy(oy + (b.value - oy) * g), chalk = b.chalk ?? 'white';
        const box: Pt[] = [[cx - half, o[1]], [cx - half, top], [cx + half, top], [cx + half, o[1]]];
        // the bar's face hatched in its chalk, as a teacher shades one in, under its outline
        const hatch: Pt[][] = [];
        for (let k = cx - half - (o[1] - top); k < cx + half; k += 22) {
          const a: Pt = [Math.max(cx - half, k), o[1] - Math.max(0, cx - half - k)], b2: Pt = [Math.min(cx + half, k + (o[1] - top)), o[1] - Math.min(o[1] - top, cx + half - k)];
          if (b2[0] > a[0]) hatch.push([a, b2]);
        }
        return (
          <React.Fragment key={`b${i}`}>
            <div style={{opacity: 0.45}}><ChalkLine width={width} height={height} chalk={chalk} weight={3} strokes={hatch} /></div>
            <ChalkLine width={width} height={height} chalk={chalk} weight={5} strokes={[handShape(box, `bar${i}`).slice(0, -1)]} />
            {label(b.label ?? num(b.value), [cx, top - 4], 'above', 34, chalk, `bl${i}`, unit((grown - i - 0.85) / 0.15))}
            {b.name && label(b.name, [cx, o[1] + 6], 'below', 32, chalk, `bn${i}`, shown)}
          </React.Fragment>
        );
      })}
      {curves.map((c, i) => {
        const d = unit(draw - i), pts = c.points.map(([a, b]) => [sx(a), sy(b)] as Pt), end = pts[pts.length - 1];
        if (d <= 0 || pts.length < 2) return null;
        return (
          <React.Fragment key={`c${i}`}>
            <ChalkLine width={width} height={height} weight={c.weight ?? 7} chalk={c.chalk ?? 'white'} dashed={c.dashed} draw={d} strokes={[pts]} />
            {c.label && label(c.label, end, 'right', 38, c.chalk ?? 'white', `cl${i}`, unit((draw - i - 0.9) / 0.1))}
          </React.Fragment>
        );
      })}
      <svg width={width} height={height} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        {dots.el}
        <g filter={`url(#${dots.id})`}>
          {points.slice(0, Math.ceil(plotted)).map((p, i) => p.dot !== false && <circle key={i} cx={sx(p.at[0])} cy={sy(p.at[1])} r={12} fill={CHALK[p.chalk ?? 'white']} />)}
        </g>
      </svg>
      {points.slice(0, Math.ceil(plotted)).map((p, i) => p.label && label(p.label, [sx(p.at[0]), sy(p.at[1])], p.place ?? 'above', 38, p.chalk ?? 'white', `p${i}`, 1, plotted - i))}
    </div>
  );
}
