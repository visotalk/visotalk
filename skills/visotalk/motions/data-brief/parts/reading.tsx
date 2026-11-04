import {clamp, fmt, ticks, textW, stepDecimals, GUIDE} from './brief.ts';

export const meta = {
  name: {en: 'Reading', 'zh-CN': '关键数字'},
  purpose: 'data',
  line: 'One figure large with its decimals, its change, and a scale past its references.',
  fits: 'a rate or total against a target or an earlier year',
  params: {
    w: {type: 'px', default: 1680, doc: 'the width'},
    h: {type: 'px', default: 540, doc: 'the height it may use: the figure is set smaller before the scale passes it'},
    value: {type: 'number', doc: 'the figure; tween it to count'},
    decimals: {type: 'number', default: 0, doc: 'digits after the point, as many as the narration says'},
    unit: {type: 'text', default: '', doc: 'after the figure, smaller: %, years, 万人'},
    tickUnit: {type: 'text', default: '', doc: 'after each tick of the scale: %; empty when the unit is a word, said once by the figure'},
    label: {type: 'text', default: '', doc: 'what it measures, above it'},
    change: {type: 'text', default: '', doc: 'the change, signed, in its own unit: +0.9 years'},
    changeBase: {type: 'text', default: '', doc: 'what the change is against: vs 2022 (77.5)'},
    scaleMin: {type: 'number', default: 0, doc: 'the scale\'s start; above 0 the scale is drawn broken at its left end, so a cut scale is never mistaken for a whole one'},
    scaleMax: {type: 'number', default: 100, doc: 'the scale\'s end'},
    scaleStep: {type: 'number', default: 10, doc: 'between its ticks'},
    refs: {type: 'list', default: [], doc: '{value, label}: references marked on the scale; their labels stack when they are close'},
    fill: {type: 'progress', default: 1, doc: '0 to 1: the scale filled to the figure, from zero when the scale crosses it, else from its start'},
    guideLabel: {type: 'text', default: '', doc: 'the reading guide\'s tab, riding the head of the fill: 2024; empty for no guide'},
  },
  preview: 23.1,
};

type Ref = {value: number; label: string};

export function Reading({w = 1680, h = 540, value, decimals = 0, unit = '', tickUnit = unit === '%' ? '%' : '', label = '', change = '', changeBase = '', scaleMin = 0, scaleMax = 100, scaleStep = 10, refs = [], fill = 1, guideLabel = ''}: {w?: number; h?: number; value: number; decimals?: number; unit?: string; tickUnit?: string; label?: string; change?: string; changeBase?: string; scaleMin?: number; scaleMax?: number; scaleStep?: number; refs?: Ref[]; fill?: number; guideLabel?: string}) {
  const [whole, frac] = fmt(value, decimals).split('.');
  // the figure is as large as the row allows once the change beside it has its room
  const changeW = change ? Math.max(textW(change, 54) + 80, textW(changeBase, 28) + 40) : 0;
  const room = w - changeW - 64;
  const want = textW(whole + (frac !== undefined ? '.' + frac : ''), 300) * 0.92 + textW(unit, 120) + 14;
  const big = Math.max(150, Math.min(300, Math.floor(300 * room / Math.max(1, want))));
  const pad = 14, track = w - 2 * pad;
  const X = (v: number) => Math.round(pad + (clamp((v - scaleMin) / (scaleMax - scaleMin))) * track);
  // the fill runs from zero when the scale crosses it (an anomaly, a change), else from the scale's start
  const origin = scaleMin < 0 && scaleMax > 0 ? 0 : scaleMin;
  const at = origin + clamp(fill) * (value - origin);
  const up = !change.startsWith('-') && !change.startsWith('−');
  // reference labels sit on the scale's top, beside their own dashed line (right, else left) and off every other line,
  // every other label and the guide's tab; one that finds no room in a row climbs to the next
  const tabW = textW(guideLabel, 26, true) + 30;
  const sorted = [...refs].sort((a, b) => a.value - b.value);
  // the guide comes to rest on the figure, so its strip and its tab are kept clear where they will stop
  const restX = Math.min(X(value) - 28, w - tabW);
  const boxes: [number, number, number][] = guideLabel ? [[X(value) - 30, X(value) + 30, 0], [restX - 4, restX + tabW + 4, 1]] : [];
  const place = sorted.map((r) => {
    const lw = textW(r.label, 27), x = X(r.value);
    for (let row = 0; row < 4; row++) {
      for (const [a, b] of [[x + 10, x + 10 + lw], [x - 10 - lw, x - 10]]) {
        if (a < 0 || b > w) continue;
        const crosses = sorted.some((o) => o !== r && X(o.value) >= a - 8 && X(o.value) <= b + 8);
        const touches = boxes.some(([p, q, rr]) => rr === row && a < q + 16 && b > p - 16);
        if (!crosses && !touches) { boxes.push([a, b, row]); return {x: a, row}; }
      }
    }
    // no free place: the top row, slid inside the width
    const row = 3; boxes.push([0, 0, row]);
    return {x: Math.max(0, Math.min(x + 10, w - lw)), row};
  });
  const climb = Math.max(0, ...place.map((p) => p.row)) * 36;
  const base = 70 + climb;
  // the figure gives up size before the scale is pushed past the height the part was given
  const fig = Math.min(big, Math.floor((h - 260 - climb) / 0.86));
  return (
    <div style={{position: 'relative', width: w, fontFamily: 'var(--font-sans)', color: 'var(--color-text)'}}>
      <div style={{fontSize: 34, fontWeight: 600}}>{label}</div>
      <div style={{display: 'flex', alignItems: 'flex-end', gap: 64, marginTop: 4}}>
        {/* the figure: light and large, its decimals as present as its whole part */}
        <div style={{display: 'flex', alignItems: 'baseline', fontFamily: 'var(--font-display)', fontWeight: 300, lineHeight: 0.86, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.035em', whiteSpace: 'nowrap'}}>
          <span style={{fontSize: fig}}>{whole}</span>
          {frac !== undefined && <span style={{fontSize: fig, color: 'var(--color-data)'}}>.{frac}</span>}
          {unit && <span style={{fontSize: Math.round(fig * 0.4), fontWeight: 400, marginLeft: Math.round(fig * 0.06), letterSpacing: 0, color: 'var(--color-muted)'}}>{unit}</span>}
        </div>
        {change && (
          <div style={{paddingBottom: 26, borderLeft: '2px solid var(--color-text)', paddingLeft: 26, whiteSpace: 'nowrap'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 14, fontSize: 54, fontWeight: 700, fontVariantNumeric: 'tabular-nums'}}>
              <svg width={30} height={30}><path d={up ? 'M15 3L28 27H2z' : 'M15 27L28 3H2z'} fill="var(--color-text)" /></svg>{change}
            </div>
            {changeBase && <div style={{fontSize: 28, color: 'var(--color-muted)', marginTop: 8}}>{changeBase}</div>}
          </div>
        )}
      </div>
      {/* the scale: a ruled track filled from its start to the figure, its references dashed across it */}
      <svg width={w} height={base + 104} style={{display: 'block', marginTop: 34, overflow: 'visible'}}>
        {sorted.map((r, i) => (
          <g key={r.label}>
            <line x1={X(r.value)} x2={X(r.value)} y1={base - 26 - place[i].row * 36} y2={base + 44} stroke="var(--color-text)" strokeWidth={2.5} strokeDasharray="6 5" />
            <text x={place[i].x} y={base - 10 - place[i].row * 36} fontSize={27} fontWeight={600} fill="var(--color-text)" stroke="var(--color-bg)" strokeWidth={8} paintOrder="stroke" strokeLinejoin="round">{r.label}</text>
          </g>
        ))}
        <rect x={pad} y={base + 10} width={track} height={26} fill="var(--color-panel2)" />
        <rect x={Math.min(X(origin), X(at))} y={base + 10} width={Math.abs(X(at) - X(origin))} height={26} fill="var(--color-data)" />
        {origin !== scaleMin && <line x1={X(origin)} x2={X(origin)} y1={base + 2} y2={base + 44} stroke="var(--color-text)" strokeWidth={2.5} />}
        {scaleMin > 0 && (
          <g stroke="var(--color-bg)" strokeWidth={6}>
            <line x1={pad + 18} x2={pad + 30} y1={base + 42} y2={base + 4} />
            <line x1={pad + 28} x2={pad + 40} y1={base + 42} y2={base + 4} />
          </g>
        )}
        {guideLabel && (() => {
          const gx = Math.max(28, Math.min(w - 28, X(at)));
          return (
          <g>
            <rect x={gx - 28} y={base - 34} width={56} height={92} fill={GUIDE.fill} />
            <line x1={gx - 28} x2={gx - 28} y1={base - 34} y2={base + 58} stroke={GUIDE.edge} strokeWidth={GUIDE.width} />
            <line x1={gx + 28} x2={gx + 28} y1={base - 34} y2={base + 58} stroke={GUIDE.edge} strokeWidth={GUIDE.width} />
            <rect x={Math.max(0, Math.min(gx - 28, w - tabW))} y={base - 74} width={tabW} height={40} fill={GUIDE.edge} />
            <text x={Math.max(0, Math.min(gx - 28, w - tabW)) + 15} y={base - 46} fontFamily="var(--font-mono)" fontSize={26} fontWeight={700} fill="var(--color-bg)">{guideLabel}</text>
          </g>
          );
        })()}
        {ticks(scaleMin, scaleMax, scaleStep).map((v) => (
          <g key={v}>
            <line x1={X(v)} x2={X(v)} y1={base + 36} y2={base + 50} stroke="var(--color-text)" strokeWidth={2} />
            <text x={X(v)} y={base + 86} textAnchor={v === scaleMin ? 'start' : v === scaleMax ? 'end' : 'middle'} fontFamily="var(--font-mono)" fontSize={26} fill="var(--color-muted)">{fmt(v, stepDecimals(scaleStep))}{tickUnit}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}
