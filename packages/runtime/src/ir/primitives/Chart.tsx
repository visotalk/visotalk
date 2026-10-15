/**
 * chart: bar (horizontal; `realtime` = bars fill at the speed of their value from the drawIn action),
 * scatter and heatmap (class colours; heatmap rows are a grid of values in [−1, 1] drawn behind scatter points),
 * line. Data rows come inline or from a data asset (resolved at build time).
 */
import React from 'react';
import {motionProgress, motionStart, type ChartObject} from '@visotalk/ir';
import {useDocTime} from '../../react';
import {easeInOutCubic} from '../../motion';
import {formatValue, useIR} from '../context';
import {C, F} from '../../theme';
import type {PrimitiveProps} from './common';

type Row = Record<string, string | number>;

const Bars: React.FC<{id: string; o: ChartObject; rows: Row[]; w: number}> = ({id, o, rows, w}) => {
  const {c} = useIR();
  const t = useDocTime();
  const x = o.encoding.x ?? 'label', y = o.encoding.y ?? 'value', hl = o.encoding.color ?? 'highlight';
  const max = Math.max(...rows.map((r) => Number(r[y])));
  const start = motionStart(c, id, 'drawIn');
  const started = start !== undefined && t >= start;
  const p = o.realtime ? 0 : easeInOutCubic(motionProgress(c, id, 'drawIn', t) ?? 1);
  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: 34, width: w}}>
      {rows.map((r) => {
        const v = Number(r[y]);
        const shown = o.realtime ? (started ? Math.min(t - start!, v) : 0) : v * p;
        const done = o.realtime ? started && t - start! >= v : p >= 1;
        const lit = Boolean(r[hl]);
        return (
          <div key={String(r[x])} data-path={`${id}#${r[x]}`} style={{display: 'flex', alignItems: 'center', gap: 28}}>
            <div style={{width: 120, fontFamily: F.mono, fontSize: 36, fontWeight: 700, color: C.text, textAlign: 'right'}}>{String(r[x])}</div>
            <div style={{flex: 1, height: 64, background: C.panel, borderRadius: 10, position: 'relative'}}>
              <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.max(0.6, (shown / max) * 100)}%`, background: lit ? C.good : C.faint, borderRadius: 10}} />
            </div>
            <div style={{width: 190, fontFamily: F.mono, fontSize: 40, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: done ? (lit ? C.good : C.text) : C.muted}}>
              {started || !o.realtime ? `${formatValue(shown, shown < 1 ? '0.00' : '0.0')}${o.unit ?? ''}` : ''}
            </div>
          </div>
        );
      })}
    </div>
  );
};


/**
 * scatter (+ heatmap): rows with `kind: "cell"` form a value field drawn behind the points (blue > 0, orange < 0),
 * revealed left to right by the chart's drawIn action; points are drawn from the start.
 */
const Scatter: React.FC<{id: string; o: ChartObject; rows: Row[]; w: number; h: number}> = ({id, o, rows, w, h}) => {
  const {c} = useIR();
  const t = useDocTime();
  const xk = o.encoding.x ?? 'x', yk = o.encoding.y ?? 'y', ck = o.encoding.color ?? 'class', vk = o.encoding.value ?? 'v';
  const pts = rows.filter((r) => r.kind !== 'cell');
  const cells = rows.filter((r) => r.kind === 'cell');
  const all = cells.length ? cells : pts;
  const xs = all.map((r) => Number(r[xk])), ys = all.map((r) => Number(r[yk]));
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const nx = new Set(cells.map((r) => r[xk])).size || 1, ny = new Set(cells.map((r) => r[yk])).size || 1;
  const cw0 = (x1 - x0) / Math.max(1, nx - 1), ch0 = (y1 - y0) / Math.max(1, ny - 1);
  const [bx0, bx1, by0, by1] = cells.length ? [x0 - cw0 / 2, x1 + cw0 / 2, y0 - ch0 / 2, y1 + ch0 / 2] : [x0, x1, y0, y1];
  const aspect = (by1 - by0) / (bx1 - bx0 || 1);
  const W = Math.min(w, h / aspect), H = W * aspect;
  const px = (v: number) => ((v - bx0) / (bx1 - bx0)) * W;
  const py = (v: number) => H - ((v - by0) / (by1 - by0)) * H;
  const reveal = motionStart(c, id, 'drawIn') === undefined ? 1 : easeInOutCubic(motionProgress(c, id, 'drawIn', t) ?? 0);
  const cw = (W / nx) + 0.6, chh = (H / ny) + 0.6;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{display: 'block', background: C.panel, borderRadius: 14, border: `1px solid ${C.border}`}}>
      <defs><clipPath id={`rev-${id}`}><rect x={0} y={0} width={W * reveal} height={H} /></clipPath></defs>
      <g clipPath={`url(#rev-${id})`}>
        {cells.map((r, i) => {
          const v = Number(r[vk]);
          return <rect key={i} x={px(Number(r[xk])) - cw / 2} y={py(Number(r[yk])) - chh / 2} width={cw} height={chh} style={{fill: v > 0 ? C.data : C.grad}} opacity={Math.min(1, Math.abs(v)) * 0.45 + 0.08} />;
        })}
      </g>
      {pts.map((r, i) => <circle key={i} cx={px(Number(r[xk]))} cy={py(Number(r[yk]))} r={8} style={{fill: Number(r[ck]) > 0 ? C.data : C.grad, stroke: C.bg}} strokeWidth={2} />)}
    </svg>
  );
};

export const Chart: React.FC<PrimitiveProps<ChartObject>> = ({id, o, box}) => {
  const rows = Array.isArray(o.data) ? (o.data as Row[]) : [];
  return (
    <div data-path={id} style={{width: box.w, height: box.h}}>
      {o.kind === 'bar' ? <Bars id={id} o={o} rows={rows} w={box.w} /> : <Scatter id={id} o={o} rows={rows} w={box.w} h={box.h} />}
    </div>
  );
};
