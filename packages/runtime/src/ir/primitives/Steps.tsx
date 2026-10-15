/**
 * steps: a list of items. `highlight` on `steps#item` makes it active (persistent); `set {props: {state: "done"}}`
 * strikes it through; `appear` on an item hides it until then.
 * Styles: points (default; inactive items dimmed), labels (large mono titles), commands / commands-new (boxed mono
 * rows; the second is outlined in the accent colour).
 */
import React from 'react';
import {motionStart, propsAt, viewOwn, type StepsObject} from '@visotalk/ir';
import {useDocTime} from '../../react';
import {clamp01, easeOutCubic} from '../../motion';
import {useIR} from '../context';
import {C, F} from '../../theme';
import type {PrimitiveProps} from './common';

export const Steps: React.FC<PrimitiveProps<StepsObject>> = ({id, o, box}) => {
  const {c} = useIR();
  const t = useDocTime();
  const style = o.style ?? 'points';
  const gap = style === 'points' ? 46 : 40;
  return (
    <div data-path={id} style={{width: box.w, display: 'flex', flexDirection: 'column', gap}}>
      {o.items.map((it) => {
        const path = `${id}#${it.id}`;
        const v = viewOwn(c, path, t);
        const hl = motionStart(c, path, 'highlight');
        const on = hl === undefined ? (o.dimInactive === false ? 1 : it.state === 'active' ? 1 : 0) : clamp01((t - hl) / 0.27);
        const state = (propsAt(c, path, t).state as string | undefined) ?? it.state;
        const enter = v.entrance === 'appear' ? easeOutCubic(v.entranceProgress ?? 1) : 1;
        const shown: React.CSSProperties = {opacity: v.presence <= 0 ? 0 : enter, transform: `translateY(${(1 - enter) * 16}px)`};
        if (style === 'labels') {
          return (
            <div key={it.id} data-path={path} style={shown}>
              <div style={{fontFamily: F.mono, fontSize: 40, fontWeight: 700, color: C.good}}>{it.title}</div>
              {it.sub && <div style={{fontFamily: F.sans, fontSize: 28, color: C.muted, marginTop: 6}}>{it.sub}</div>}
            </div>
          );
        }
        if (style === 'commands' || style === 'commands-new') {
          const done = state === 'done';
          const fresh = style === 'commands-new';
          return (
            <div key={it.id} data-path={path} style={{...shown, fontFamily: F.mono, fontSize: 34, color: done ? C.muted : C.text, background: fresh ? C.panel2 : C.panel,
              border: `${fresh ? 2 : 1}px solid ${fresh ? C.good : C.border}`, borderRadius: 12, padding: '22px 28px', textDecoration: done ? 'line-through' : 'none'}}>
              {it.title}
            </div>
          );
        }
        const dim = o.dimInactive === false ? 1 : 0.25 + 0.75 * on;
        return (
          <div key={it.id} data-path={path} style={{...shown, opacity: (shown.opacity as number) * dim, borderLeft: `4px solid ${on > 0.5 ? C.good : C.border}`, padding: '6px 0 6px 22px'}}>
            <div style={{fontFamily: F.sans, fontSize: 34, fontWeight: 700, color: C.text, textDecoration: state === 'done' ? 'line-through' : 'none'}}>{it.title}</div>
            {it.sub && <div style={{fontFamily: F.mono, fontSize: 22, color: C.muted, marginTop: 4}}>{it.sub}</div>}
          </div>
        );
      })}
    </div>
  );
};
