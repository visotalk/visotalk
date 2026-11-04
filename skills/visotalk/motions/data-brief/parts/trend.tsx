import {clamp, held, ink, fmt, ticks, spread, textW, hits, stepDecimals, niceEvery, GUIDE} from './brief.ts';

export const meta = {
  name: {en: 'Trend', 'zh-CN': '折线图'},
  purpose: 'data',
  line: 'A line chart on a real scale, series named at their ends; the guide on the year said.',
  fits: 'a value over time; a peak or a low',
  params: {
    w: {type: 'px', default: 1680, doc: 'the chart\'s width'},
    h: {type: 'px', default: 520, doc: 'the chart\'s height'},
    categories: {type: 'list', doc: 'the labels along the base, one per value, evenly spaced: years (a long annual series is fine: labels thin themselves to round strides)'},
    series: {type: 'list', doc: '{label, values} for each line; the values in the scale\'s unit'},
    min: {type: 'number', default: 0, doc: 'the scale\'s floor'},
    max: {type: 'number', default: 100, doc: 'the scale\'s top'},
    step: {type: 'number', default: 20, doc: 'between gridlines'},
    prefix: {type: 'text', default: '', doc: 'before every figure: $'},
    suffix: {type: 'text', default: '', doc: 'after every figure: k, %'},
    decimals: {type: 'number', default: 0, doc: 'digits after the point in labels'},
    focus: {type: 'number', default: 0, doc: 'the index of the series in the highlight; between two while it passes'},
    draw: {type: 'progress', default: 1, doc: '0 to 1: the lines drawn from the first category to the last, their names riding the ends'},
    band: {type: 'object', default: null, doc: '{from, to, label}: a period shaded behind the lines, by category index'},
    note: {type: 'object', default: null, doc: '{series, at, lines, dx, dy}: a leader from a point (series and category index) to a note dx, dy px away'},
    noteDraw: {type: 'progress', default: 1, doc: '0 to 1: the point ringed, the leader drawn, then the note set'},
    at: {type: 'number', default: -1, doc: 'the category the reading guide stands on, every series read off where it crosses; tween it to slide along; on the last category the end labels are its reading; -1 for no guide'},
    atLabel: {type: 'text', default: '', doc: 'the guide\'s tab: 2021 · PEAK'},
  },
  preview: 12.6,
};

type Series = {label: string; values: number[]};
type Band = {from: number; to: number; label?: string} | null;
type Note = {series: number; at: number; lines: string[]; dx: number; dy: number} | null;

export function Trend({w = 1680, h = 520, categories = [], series = [], min = 0, max = 100, step = 20, prefix = '', suffix = '', decimals = 0, focus = 0, draw = 1, band = null, note = null, noteDraw = 1, at = -1, atLabel = ''}: {w?: number; h?: number; categories?: string[]; series?: Series[]; min?: number; max?: number; step?: number; prefix?: string; suffix?: string; decimals?: number; focus?: number; draw?: number; band?: Band; note?: Note; noteDraw?: number; at?: number; atLabel?: string}) {
  const pl = 150, pt = 64, pb = 64;
  // room at the right for the longest series name, so direct labels stay in the box
  const pr = Math.max(200, Math.min(Math.round(w * 0.32), 64 + Math.max(0, ...series.map((x) => textW(x.label, 28) * 1.04))));
  const n = categories.length;
  const X = (i: number) => Math.round(pl + (i / Math.max(1, n - 1)) * (w - pl - pr));
  const Y = (v: number) => Math.round(pt + (1 - (v - min) / (max - min)) * (h - pt - pb));
  const head = clamp(draw) * (n - 1);
  const label = (v: number, dp = decimals) => `${prefix}${fmt(v, dp)}${suffix}`;

  // each line up to the head, and where its head is
  const drawn = series.map((s) => {
    const k = Math.floor(head), f = head - k;
    const pts: [number, number][] = [];
    for (let i = 0; i <= k && i < n; i++) pts.push([X(i), Y(s.values[i])]);
    if (k < n - 1 && f > 0) pts.push([Math.round(X(k) + (X(k + 1) - X(k)) * f), Math.round(Y(s.values[k]) + (Y(s.values[k + 1]) - Y(s.values[k])) * f)]);
    const value = k < n - 1 ? s.values[k] + (s.values[k + 1] - s.values[k]) * f : s.values[n - 1];
    return {pts, end: pts[pts.length - 1], value};
  });
  const ends = spread(drawn.map((d) => d.end[1]), 64, pt + 24, h - pb);
  // the series in the highlight is drawn last, over the others
  const order = series.map((_, i) => i).sort((a, b) => held(a, focus) - held(b, focus));

  const nt = clamp(noteDraw * 2.2), nl = clamp(noteDraw * 2.2 - 0.5), nx = clamp(noteDraw * 2.2 - 1.2);

  // the reading guide: a strip on one category, every series read where it crosses it
  const gx = at >= 0 ? X(0) + at * (X(1) - X(0)) : 0, gw = 64;
  const readAt = (s: Series) => { const k = Math.min(n - 2, Math.max(0, Math.floor(at))), f = at - k; return s.values[k] + (s.values[k + 1] - s.values[k]) * f; };
  const reads = at >= 0 && at < n - 1.02 ? series.map(readAt) : [];
  // each reading is set beside its crossing, on whichever side of the guide and of the point keeps it off every line and every other reading
  const lines = drawn.map((d) => d.pts);
  const rect = (x0: number, y0: number, x1: number, y1: number): [number, number][] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]];
  // the direct labels at the lines' ends are marks too
  const taken: [number, number][][] = drawn.map((d, i) => rect(d.end[0] + 40, ends[i] - 30, d.end[0] + 44 + Math.max(textW(series[i].label, 28), textW(label(d.value), 26, true)), ends[i] + 34));
  if (at >= 0 && atLabel) taken.push(rect(Math.round(gx - gw / 2) - 4, pt - 54, Math.round(gx - gw / 2) + Math.max(gw, textW(atLabel, 26, true) + 30) + 4, pt - 2));
  const readBox = reads.map((v) => {
    const tw = textW(label(v), 28, true), cy = Y(v);
    const right = Math.round(gx + gw / 2 + 12), left = Math.round(gx - gw / 2 - 12 - tw);
    const tries: [number, number][] = [-14, -44, 16, -74, 46].flatMap((dy) => [[right, cy + dy], [left, cy + dy]] as [number, number][]);
    const inside = ([x, y]: [number, number]) => y >= pt - 50 && y + 30 <= h - pb && x >= pl && x + tw <= w;
    const free = tries.find((p) => inside(p) && !hits([p[0], p[1], p[0] + tw, p[1] + 30], [...lines, ...taken], 5)) ?? tries.find(inside) ?? tries[0];
    taken.push(rect(free[0], free[1], free[0] + tw, free[1] + 30));
    return free;
  });
  const np = note ? [X(note.at), Y(series[note.series].values[note.at])] : [0, 0];
  // the note goes where it was asked, or to the first mirror of that place (across the point, then to its other side) that lies on no line and inside the chart
  const noteBox = (dx: number, dy: number) => {
    if (!note) return [0, 0, 0, 0] as [number, number, number, number];
    const tw = Math.max(...note.lines.map((t, k) => textW(t, 28) * (k ? 1 : 1.06))), x = np[0] + dx + (dx >= 0 ? 10 : -10 - tw);
    const top = dy < 0 ? np[1] + dy - note.lines.length * 36 : np[1] + dy + 4;
    return [x, top, x + tw, top + note.lines.length * 36 + 4] as [number, number, number, number];
  };
  const tabBox: [number, number][][] = at >= 0 && atLabel ? [rect(Math.round(gx - gw / 2) - 6, pt - 56, Math.round(gx - gw / 2) + Math.max(gw, textW(atLabel, 26, true) + 30) + 6, pt)] : [];
  const outside = (b: [number, number, number, number]) => b[1] < 0 || b[3] > h - pb || b[0] < pl || b[2] > w || hits(b, tabBox, 4);
  const tries = note ? [1, 1.7, 2.5].flatMap((k) => [[note.dx, note.dy * k], [note.dx, -note.dy * k], [-note.dx, note.dy * k], [-note.dx, -note.dy * k]]) : [[0, 0]];
  const [ndx, ndy] = tries.find(([dx, dy]) => !outside(noteBox(dx, dy)) && !hits(noteBox(dx, dy), lines, 4)) ?? tries.find(([dx, dy]) => !outside(noteBox(dx, dy))) ?? tries[0];
  const elbow = note ? [np[0] + ndx, np[1] + ndy] : [0, 0];
  const legLen = note ? Math.max(1, Math.hypot(ndx, ndy)) : 0;
  const tabW = Math.max(gw, textW(atLabel, 26, true) + 30);
  // the categories along the base, thinned to every k-th when they would touch
  const every = niceEvery(Math.ceil((Math.max(...categories.map((c) => textW(c, 26, true)), 0) + 24) / Math.max(1, (w - pl - pr) / Math.max(1, n - 1))));
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{display: 'block', overflow: 'visible', fontFamily: 'var(--font-sans)'}}>
      {band && (
        <g>
          <rect x={X(band.from)} y={pt - 6} width={X(band.to) - X(band.from)} height={h - pb - pt + 6} fill="var(--color-panel)" />
          {band.label && <text x={X(band.from) + 14} y={h - pb - 16} fontSize={26} fontWeight={600} fill="var(--color-muted)">{band.label}</text>}
        </g>
      )}
      {at >= 0 && <rect x={Math.round(gx - gw / 2)} y={pt - 6} width={gw} height={h - pb - pt + 6} fill={GUIDE.fill} />}
      {/* the scale: each gridline carries its own figure, set on the line at the left */}
      {ticks(min, max, step).map((v) => (
        <g key={v}>
          <line x1={0} x2={w - pr + 40} y1={Y(v)} y2={Y(v)} stroke={v === min ? 'var(--color-text)' : 'var(--color-border)'} strokeWidth={v === min ? 2.5 : 1.5} />
          <text x={0} y={Y(v) - 12} fontFamily="var(--font-mono)" fontSize={26} fill="var(--color-muted)">{label(v, stepDecimals(step))}</text>
        </g>
      ))}
      {categories.map((c, i) => (
        <g key={c}>
          <line x1={X(i)} x2={X(i)} y1={h - pb} y2={h - pb + 10} stroke="var(--color-text)" strokeWidth={2} />
          {(i % every === 0 || i === n - 1) && (i === n - 1 || n - 1 - i >= every) && <text x={X(i)} y={h - pb + 46} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={26} fill="var(--color-muted)">{c}</text>}
        </g>
      ))}
      {order.map((i) => {
        const d = drawn[i], wgt = held(i, focus);
        if (d.pts.length < 2) return null;
        return <polyline key={i} points={d.pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={ink(wgt, 'var(--color-faint)')} strokeWidth={3 + wgt * 2.5} strokeLinejoin="round" strokeLinecap="round" />;
      })}
      {at >= 0 && (
        <g>
          <line x1={Math.round(gx - gw / 2)} x2={Math.round(gx - gw / 2)} y1={pt - 6} y2={h - pb} stroke={GUIDE.edge} strokeWidth={GUIDE.width} />
          <line x1={Math.round(gx + gw / 2)} x2={Math.round(gx + gw / 2)} y1={pt - 6} y2={h - pb} stroke={GUIDE.edge} strokeWidth={GUIDE.width} />
          {atLabel && <rect x={Math.round(gx - gw / 2)} y={pt - 50} width={tabW} height={44} fill={GUIDE.edge} />}
          {atLabel && <text x={Math.round(gx - gw / 2) + 15} y={pt - 19} fontFamily="var(--font-mono)" fontSize={26} fontWeight={700} fill="var(--color-bg)">{atLabel}</text>}
          {reads.map((v, i) => {
            const wgt = held(i, focus);
            return (
              <g key={i}>
                <circle cx={Math.round(gx)} cy={Y(v)} r={7} fill="var(--color-bg)" stroke={ink(wgt, 'var(--color-muted)')} strokeWidth={3} />
                <text x={readBox[i][0]} y={readBox[i][1] + 24} fontFamily="var(--font-mono)" fontSize={28} fontWeight={wgt > 0.5 ? 700 : 400} fill={ink(wgt, 'var(--color-muted)')} stroke="var(--color-bg)" strokeWidth={8} paintOrder="stroke" strokeLinejoin="round">{label(v)}</text>
              </g>
            );
          })}
        </g>
      )}
      {/* direct labels: the name and the latest figure at each line's head */}
      {drawn.map((d, i) => {
        const wgt = held(i, focus);
        const c = ink(wgt, 'var(--color-muted)');
        return (
          <g key={i}>
            <circle cx={d.end[0]} cy={d.end[1]} r={5 + wgt * 2} fill={ink(wgt, 'var(--color-faint)')} />
            <line x1={d.end[0] + 12} x2={d.end[0] + 36} y1={d.end[1]} y2={ends[i]} stroke="var(--color-faint)" strokeWidth={1.5} />
            <text x={d.end[0] + 44} y={ends[i] - 4} fontSize={28} fontWeight={wgt > 0.5 ? 700 : 500} fill={c}>{series[i].label}</text>
            <text x={d.end[0] + 44} y={ends[i] + 28} fontFamily="var(--font-mono)" fontSize={26} fontWeight={wgt > 0.5 ? 700 : 400} fill={c}>{label(d.value)}</text>
          </g>
        );
      })}
      {note && nt > 0 && (
        <g>
          <circle cx={np[0]} cy={np[1]} r={14} fill="none" stroke="var(--color-text)" strokeWidth={2.5} strokeDasharray={`${(nt * 88).toFixed(1)} 88`} transform={`rotate(-90 ${np[0]} ${np[1]})`} />
          <line x1={np[0] + (ndx / legLen) * 16} y1={np[1] + (ndy / legLen) * 16} x2={np[0] + (ndx / legLen) * (16 + nl * (legLen - 16))} y2={np[1] + (ndy / legLen) * (16 + nl * (legLen - 16))} stroke="var(--color-text)" strokeWidth={2} />
          <g opacity={nx}>
            {note.lines.map((t, k) => (
              <text key={k} x={elbow[0] + (ndx >= 0 ? 10 : -10)} y={elbow[1] + (ndy < 0 ? -(note.lines.length - 1 - k) * 36 - 4 : 30 + k * 36)} textAnchor={ndx >= 0 ? 'start' : 'end'} fontSize={28} fontWeight={k === 0 ? 700 : 400} fill="var(--color-text)" stroke="var(--color-bg)" strokeWidth={8} paintOrder="stroke" strokeLinejoin="round">{t}</text>
            ))}
          </g>
        </g>
      )}
    </svg>
  );
}
