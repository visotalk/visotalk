/**
 * code: monospaced lines without ligatures (== must not render as ═).
 * `highlight` actions mark lines (`params.lines`, `params.color`); `set` replaces `lines`; `lang: "sh"` adds prompts;
 * `typewriter` reveals the block character by character.
 */
import React from 'react';
import {motionProgress, propsAt, type CodeObject} from '@visotalk/ir';
import {useDocTime} from '../../react';
import {useIR, usePathView} from '../context';
import {C, F, NO_LIGA, alpha} from '../../theme';
import type {PrimitiveProps} from './common';

const COLORS: Record<string, string> = {good: C.good, data: C.data, grad: C.grad, op: C.op, warn: C.warn, bad: C.bad};

export const Code: React.FC<PrimitiveProps<CodeObject>> = ({id, o}) => {
  const {c} = useIR();
  const t = useDocTime();
  const v = usePathView(id);
  const props = propsAt(c, id, t);
  const lines = (props.lines as string[] | undefined) ?? o.lines;
  const hlAction = [...c.actions].reverse().find((a) => a.path === id && a.motion === 'highlight' && a.start <= t);
  const hp = motionProgress(c, id, 'highlight', t) ?? 0;
  const hlLines = new Set((hlAction?.params.lines as number[] | undefined) ?? []);
  const hlColor = COLORS[(hlAction?.params.color as string) ?? 'good'] ?? C.good;
  const size = Number(props.size ?? (o.style === 'small' ? 22 : 26));
  const shell = o.lang === 'sh';
  let budget = v.entrance === 'typewriter' ? Math.round(lines.join('\n').length * (v.entranceProgress ?? 1)) : Infinity;
  return (
    <div data-path={id} style={{width: '100%', height: '100%', display: 'flex', flexDirection: 'column'}}>
      {o.file && <div style={{fontFamily: F.mono, fontSize: 24, color: C.muted, marginBottom: 12}}>{o.file}</div>}
      <div style={{fontFamily: F.mono, fontSize: size, lineHeight: 1.55, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14,
        padding: '22px 28px', whiteSpace: 'pre', color: C.text, overflow: 'hidden', ...NO_LIGA}}>
        {lines.map((l, i) => {
          const shown = l.slice(0, Math.max(0, budget));
          budget -= l.length + 1;
          const lit = hlLines.has(i) && hp > 0;
          return (
            <div key={i} data-line={i} style={{background: lit ? alpha(hlColor, 0x22 / 255) : 'transparent', boxShadow: lit ? `inset 4px 0 0 ${hlColor}` : 'none',
              margin: '0 -28px', padding: '0 28px', color: l.trim().startsWith('#') ? C.muted : C.text}}>
              {shell && !l.startsWith('#') && l ? <span style={{color: C.good}}>{o.prompt ?? '$ '}</span> : null}
              {shown || ' '}
            </div>
          );
        })}
      </div>
    </div>
  );
};
