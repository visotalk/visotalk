import {clamp, fmt, textW, GUIDE} from './brief.ts';

export const meta = {
  name: {en: 'Split bar', 'zh-CN': '构成条'},
  purpose: 'compare',
  line: 'Parts of a whole as ruled bars, shares named and valued; the guide frames one.',
  fits: "shares past five; one year's split against another's",
  params: {
    w: {type: 'px', default: 1680, doc: 'the width'},
    names: {type: 'list', doc: 'the shares\' names, in the order they are laid from the left'},
    rows: {type: 'list', doc: '{label, parts}: one bar each, parts in the order of names and in the bar\'s unit; a row sums to its whole'},
    total: {type: 'number', default: 0, doc: 'the whole every bar is a share of: 100 for percentages; 0 for each row\'s own sum'},
    suffix: {type: 'text', default: '%', doc: 'after every figure'},
    decimals: {type: 'number', default: 0, doc: 'digits after the point'},
    barH: {type: 'px', default: 92, doc: 'each bar\'s height'},
    grow: {type: 'progress', default: 1, doc: '0 to 1: the bars drawn from the left'},
    share: {type: 'number', default: -1, doc: 'the share the guide frames, by its index in names; -1 for none'},
    row: {type: 'number', default: 0, doc: 'the row the guide frames it in; tween it to move between years'},
    atLabel: {type: 'text', default: '', doc: 'the guide\'s tab'},
  },
  preview: 48.8,
};

type Row = {label: string; parts: number[]};

/** Does a figure at x of width tw on level lvl touch one already set there? */
const taken2 = (below: unknown[], x: number, tw: number, lvl: number) => (below as [number, number, number][]).some(([a, b, l]) => l === lvl && x < b + 12 && x + tw > a - 12);

export function Split({w = 1680, names = [], rows = [], total = 0, suffix = '%', decimals = 0, barH = 92, grow = 1, share = -1, row = 0, atLabel = ''}: {w?: number; names?: string[]; rows?: Row[]; total?: number; suffix?: string; decimals?: number; barH?: number; grow?: number; share?: number; row?: number; atLabel?: string}) {
  const labelW = rows.some((r) => r.label) ? Math.max(...rows.map((r) => textW(r.label, 32))) + 40 : 0;
  const barW = w - labelW;
  const gap = 4, rowGap = 104, top = 150;
  const g = 1 - Math.pow(1 - clamp(grow), 3);
  // where each share starts and ends in each row, in px from the bar's left
  const spans = rows.map((r) => {
    const sum = total || r.parts.reduce((a, b) => a + b, 0) || 1;
    let x = 0;
    return r.parts.map((p) => { const a = x; x += (p / sum) * barW; return [a, x] as [number, number]; });
  });
  const Y = (i: number) => top + i * (barH + rowGap);
  const grey = (k: number) => (k % 2 ? 'var(--color-panel2)' : 'var(--color-faint)');
  const on = share >= 0;
  const rk = Math.max(0, Math.min(rows.length - 1, Math.round(row)));
  const gy = Y(0) + row * (barH + rowGap);
  const gs = on && spans[rk] ? spans[rk][share] : [0, 0];
  const h = Y(rows.length - 1) + barH + 104;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{display: 'block', overflow: 'visible', fontFamily: 'var(--font-sans)'}}>
      {/* the shares named once, over the first bar, where each begins */}
      {(() => {
        // names that fit over their share sit on it; the others climb rows until they touch no other name
        const taken: [number, number, number][] = [];
        return names.map((n, k) => {
          const s = spans[0]?.[k];
          if (!s) return null;
          const lit = on && k === share;
          const nameW = textW(n, 30);
          const x = labelW + Math.min(s[0] + 2, barW - nameW);
          let lvl = 0;
          while (taken.some(([a, b, l]) => l === lvl && x < b + 24 && x + nameW > a - 24) && lvl < 3) lvl++;
          taken.push([x, x + nameW, lvl]);
          return (
            <g key={n} opacity={clamp(grow * 3 - 1.5)}>
              {lvl > 0 && !taken.some(([a, b, l]) => l < lvl && x + 1 >= a - 4 && x + 1 <= b + 4) && <line x1={x + 1} x2={x + 1} y1={top - 10 - lvl * 36} y2={top} stroke="var(--color-faint)" strokeWidth={1.5} />}
              <text x={x + (lvl > 0 ? 8 : 0)} y={top - 22 - lvl * 36} fontSize={30} fontWeight={lit ? 700 : 500} fill={lit ? 'var(--color-data)' : 'var(--color-muted)'}>{n}</text>
            </g>
          );
        });
      })()}
      {rows.map((r, i) => (
        <g key={r.label + i}>
          {r.label && <text x={0} y={Y(i) + barH / 2 + 11} fontFamily="var(--font-mono)" fontSize={32} fontWeight={i === rk && on ? 700 : 500} fill="var(--color-text)">{r.label}</text>}
          {(() => { const below: unknown[] = []; return spans[i].map(([a, b], k) => {
            const x0 = labelW + a * g, x1 = labelW + b * g - (k < spans[i].length - 1 ? gap : 0);
            const lit = on && k === share && i === rk;
            const v = `${fmt(r.parts[k], decimals)}${suffix}`;
            const vw = textW(v, 34, true);
            const inside = x1 - x0 >= vw + 24;
            return (
              <g key={k}>
                <rect x={x0} y={Y(i)} width={Math.max(0, x1 - x0)} height={barH} fill={lit ? 'var(--color-data)' : grey(k)} />
                {g > 0.85 && (inside
                  ? <text x={x0 + 18} y={Y(i) + barH / 2 + 12} fontFamily="var(--font-mono)" fontSize={34} fontWeight={lit ? 700 : 500} fill={lit ? 'var(--color-bg)' : 'var(--color-text)'}>{v}</text>
                  : (() => {
                    // a figure under a narrow share drops a level until it touches no figure before it, on a short leader
                    const tx = Math.min(x0, w - textW(v, 28, true));
                    let lvl = 0;
                    while (lvl < 4 && taken2(below, tx, textW(v, 28, true), lvl)) lvl++;
                    below.push([tx, tx + textW(v, 28, true), lvl]);
                    return (
                      <g>
                        {lvl > 0 && <line x1={tx + 1} x2={tx + 1} y1={Y(i) + barH + 4} y2={Y(i) + barH + 12 + lvl * 32} stroke="var(--color-faint)" strokeWidth={1.5} />}
                        <text x={tx + (lvl > 0 ? 8 : 0)} y={Y(i) + barH + 36 + lvl * 32} fontFamily="var(--font-mono)" fontSize={28} fontWeight={lit ? 700 : 400} fill={lit ? 'var(--color-data)' : 'var(--color-muted)'}>{v}</text>
                      </g>
                    );
                  })())}
              </g>
            );
          }); })()}
        </g>
      ))}
      {on && gs[1] > gs[0] && (
        <g>
          <rect x={labelW + gs[0] * g} y={gy - 16} width={Math.max(0, (gs[1] - gs[0]) * g)} height={barH + 32} fill={GUIDE.fill} />
          <line x1={labelW + gs[0] * g} x2={labelW + gs[0] * g} y1={gy - 16} y2={gy + barH + 16} stroke={GUIDE.edge} strokeWidth={GUIDE.width} />
          <line x1={labelW + gs[1] * g - gap} x2={labelW + gs[1] * g - gap} y1={gy - 16} y2={gy + barH + 16} stroke={GUIDE.edge} strokeWidth={GUIDE.width} />
          {atLabel && (
            <g>
              <rect x={Math.min(labelW + gs[0] * g, w - textW(atLabel, 26, true) - 30)} y={gy - 56} width={textW(atLabel, 26, true) + 30} height={40} fill={GUIDE.edge} />
              <text x={Math.min(labelW + gs[0] * g, w - textW(atLabel, 26, true) - 30) + 15} y={gy - 28} fontFamily="var(--font-mono)" fontSize={26} fontWeight={700} fill="var(--color-bg)">{atLabel}</text>
            </g>
          )}
        </g>
      )}
    </svg>
  );
}
