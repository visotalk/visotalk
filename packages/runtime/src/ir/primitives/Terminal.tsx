/**
 * terminal: each step is typed (typewriter action on `term#step`) and then prints its captured output.
 * Output must be real captured text (spec rule); the newest lines stay in view.
 */
import React from 'react';
import type {TerminalObject} from '@visotalk/ir';
import {useDocTime} from '../../react';
import {useIR} from '../context';
import {C, F, NO_LIGA} from '../../theme';
import type {PrimitiveProps} from './common';

export const Terminal: React.FC<PrimitiveProps<TerminalObject>> = ({id, o, box}) => {
  const {c} = useIR();
  const t = useDocTime();
  const size = o.style === 'small' ? 22 : 24;
  const rows: React.ReactNode[] = [];
  for (const s of o.steps) {
    const a = c.actions.find((x) => x.path === `${id}#${s.id}` && (x.motion === 'typewriter' || x.motion === 'appear'));
    if (!a || t < a.start) continue;
    const typeDur = a.motion === 'typewriter' ? Math.min(1.4, 0.3 + s.cmd.length * 0.03) : 0;
    const p = typeDur ? Math.min(1, (t - a.start) / typeDur) : 1;
    const n = Math.floor(s.cmd.length * p);
    const typing = n < s.cmd.length;
    rows.push(
      <div key={`c${s.id}`} data-path={`${id}#${s.id}`} style={{color: C.text}}>
        <span style={{color: C.good}}>$ </span>
        {s.cmd.slice(0, n)}
        {typing && <span style={{background: C.text, color: C.bg}}> </span>}
      </div>,
    );
    if (!typing && t >= a.start + typeDur + 0.2) {
      s.out.forEach((line, j) => rows.push(<div key={`o${s.id}-${j}`} style={{color: line.trim().startsWith('+') ? C.good : C.muted}}>{line || ' '}</div>));
    }
  }
  return (
    <div data-path={id} style={{width: box.w, height: box.h, background: '#0F131B', border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden',
      boxShadow: '0 30px 80px rgba(0,0,0,0.45)', display: 'flex', flexDirection: 'column'}}>
      <div style={{height: 46, flex: 'none', display: 'flex', alignItems: 'center', gap: 10, padding: '0 18px', background: C.panel2, borderBottom: `1px solid ${C.border}`}}>
        {['#FF5F57', '#FEBC2E', '#28C840'].map((col) => <div key={col} style={{width: 14, height: 14, borderRadius: 7, background: col, opacity: 0.85}} />)}
        <div style={{flex: 1, textAlign: 'center', fontFamily: F.mono, fontSize: 18, color: C.muted, marginRight: 60}}>{o.title ?? 'zsh'}</div>
      </div>
      <div style={{flex: 1, minHeight: 0, padding: '20px 28px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', overflow: 'hidden'}}>
        <div style={{fontFamily: F.mono, fontSize: size, lineHeight: 1.5, whiteSpace: 'pre', ...NO_LIGA}}>{rows}</div>
      </div>
    </div>
  );
};
