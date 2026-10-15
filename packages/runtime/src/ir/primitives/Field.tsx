/**
 * A labelled value row (graph nodes, cards). Numbers use the field's `format`; countUp animates the value; `set` with `props: {value}` changes it.
 * When an active `change` interaction targets the field's path (live player only), the value is scrubbable.
 */
import React, {useRef, useState} from 'react';
import {activeInteractions, propsAt, resolveValue, type Field} from '@visotalk/ir';
import {useDocTime} from '../../react';
import {easeInOutCubic} from '../../motion';
import {formatValue, useIR, usePathView, useScope} from '../context';
import {C, F, NO_LIGA} from '../../theme';
import {entranceStyle} from './common';

export const ROW_H = 54;

export const FieldRow: React.FC<{path: string; field: Field; tone?: 'data' | 'grad' | 'text'}> = ({path, field, tone = 'data'}) => {
  const {c, params, live} = useIR();
  const t = useDocTime();
  const scope = useScope();
  const v = usePathView(path);
  // a `set` action with `props: {value}` on the field's path replaces its value from that moment
  const value = resolveValue((propsAt(c, path, t).value as Field['value'] | undefined) ?? field.value, scope);
  const interaction = live ? activeInteractions(c, t).find((i) => i.target === path && i.event === 'change') : undefined;
  const drag = useRef<{x: number; v: number} | null>(null);
  const [hover, setHover] = useState(false);

  let shown: unknown = value;
  if (v.entrance === 'countUp' && typeof value === 'number') shown = value * easeInOutCubic(v.entranceProgress ?? 1);

  const setParam = interaction?.do.find((d): d is {setParam: string; value: never} => 'setParam' in d);
  const def = setParam ? params.defs[setParam.setParam] : undefined;
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current || !interaction || !def) return;
    const nv = drag.current.v + Math.round((e.clientX - drag.current.x) / 24) * (def.step ?? 0.1);
    for (const eff of interaction.do) {
      if ('setParam' in eff) params.set(eff.setParam, resolveValue(eff.value as number | {$expr: string}, {...scope, value: nv}) as number);
    }
  };
  const colour = tone === 'grad' ? C.grad : tone === 'text' ? C.text : C.data;
  return (
    <div style={{display: 'flex', justifyContent: 'space-between', height: ROW_H, alignItems: 'center', padding: '0 20px',
      borderTop: `1px solid ${C.border}`, ...entranceStyle(v.presence, v.entrance, v.entranceProgress)}}>
      <span style={{fontFamily: F.mono, fontSize: 24, color: C.muted}}>{field.label}</span>
      <span
        data-path={path}
        data-interactive={interaction ? 'scrub' : undefined}
        onPointerDown={interaction ? (e) => ((e.target as Element).setPointerCapture(e.pointerId), (drag.current = {x: e.clientX, v: Number(value)})) : undefined}
        onPointerMove={interaction ? onMove : undefined}
        onPointerUp={interaction ? () => (drag.current = null) : undefined}
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => setHover(false)}
        title={interaction ? 'Drag to change' : undefined}
        style={{fontFamily: F.mono, fontSize: 30, fontWeight: 700, color: colour, ...NO_LIGA, fontVariantNumeric: 'tabular-nums',
          cursor: interaction ? 'ew-resize' : undefined, touchAction: 'none', userSelect: 'none',
          borderBottom: interaction ? `2px dashed ${hover ? C.text : C.muted}` : undefined, padding: '0 4px'}}>
        {formatValue(shown, field.format ?? (typeof value === 'number' ? '0.00' : undefined))}
      </span>
    </div>
  );
};
