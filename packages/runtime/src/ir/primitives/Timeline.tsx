/**
 * timeline: dated items on a horizontal track. Status markers: fail ✕, success ✓, unknown ?, pending ○.
 * `drawIn` on the object draws the track left to right (it stops at the last revealed item until then);
 * `appear` on `timeline#item` reveals an item; `highlight` makes it active (persistent); `set {status}` changes it.
 */
import React from 'react';
import {propsAt, viewOwn, type TimelineObject} from '@visotalk/ir';
import {useDocTime} from '../../react';
import {easeOutCubic} from '../../motion';
import {useIR, usePathView} from '../context';
import {C, F} from '../../theme';
import type {PrimitiveProps} from './common';

const MARK: Record<string, {sym: string; color: string; dashed?: boolean}> = {
  fail: {sym: '✕', color: C.bad},
  success: {sym: '✓', color: C.good},
  unknown: {sym: '?', color: C.faint, dashed: true},
  pending: {sym: '', color: C.border},
};

const D = 96;

export const Timeline: React.FC<PrimitiveProps<TimelineObject>> = ({id, o, box}) => {
  const {c} = useIR();
  const t = useDocTime();
  const v = usePathView(id);
  const n = o.items.length;
  const slot = box.w / n;
  const xs = o.items.map((_, i) => slot * (i + 0.5));
  const views = o.items.map((it) => viewOwn(c, `${id}#${it.id}`, t));
  const draw = v.entrance === 'drawIn' ? v.entranceProgress ?? 1 : 1;
  const x0 = xs[0], x1 = xs[n - 1];
  const lineEnd = x0 + (x1 - x0) * easeOutCubic(draw);
  return (
    <div data-path={id} style={{position: 'relative', width: box.w, height: box.h}}>
      <svg width={box.w} height={box.h} style={{position: 'absolute', inset: 0}}>
        <line x1={x0} y1={D / 2} x2={lineEnd} y2={D / 2} style={{stroke: C.border}} strokeWidth={4} />
      </svg>
      {o.items.map((it, i) => {
        const iv = views[i];
        const status = (propsAt(c, `${id}#${it.id}`, t).status as string | undefined) ?? it.status ?? 'pending';
        const m = MARK[status] ?? MARK.pending;
        const enter = iv.presence <= 0 ? 0 : iv.entrance === 'appear' ? easeOutCubic(iv.entranceProgress ?? 1) : 1;
        const lit = iv.motions.highlight !== undefined || c.actions.some((a) => a.path === `${id}#${it.id}` && a.motion === 'highlight' && t >= a.start);
        return (
          <div key={it.id} data-path={`${id}#${it.id}`} style={{position: 'absolute', left: xs[i] - slot / 2, top: 0, width: slot, textAlign: 'center',
            opacity: enter * (status === 'unknown' ? 0.6 : 1), transform: `translateY(${(1 - enter) * 16}px)`}}>
            <div style={{width: D, height: D, borderRadius: D / 2, margin: '0 auto', boxSizing: 'border-box', background: m.dashed ? 'transparent' : C.panel2,
              border: `4px ${m.dashed ? 'dashed' : 'solid'} ${m.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: F.sans, fontSize: 52, fontWeight: 800, color: m.color, boxShadow: lit ? `0 0 0 6px ${C.bg}, 0 0 0 9px ${m.color}` : undefined}}>
              {m.sym}
            </div>
            <div style={{fontFamily: F.sans, fontSize: 30, fontWeight: 700, color: status === 'unknown' ? C.muted : C.text, marginTop: 14}}>{it.label}</div>
            {it.date && <div style={{fontFamily: F.sans, fontSize: 24, color: C.muted}}>{it.date}</div>}
          </div>
        );
      })}
    </div>
  );
};
