/** counter: a number with format and unit; countUp animates from 0. */
import React from 'react';
import {resolveValue, type CounterObject} from '@visotalk/ir';
import {easeInOutCubic} from '../../motion';
import {formatValue, usePathView, useScope} from '../context';
import {TEXT_STYLES} from './Text';
import {C, F} from '../../theme';
import type {PrimitiveProps} from './common';

export const Counter: React.FC<PrimitiveProps<CounterObject>> = ({id, o}) => {
  const v = usePathView(id);
  const scope = useScope();
  const value = Number(resolveValue(o.value, scope));
  const shown = v.entrance === 'countUp' ? value * easeInOutCubic(v.entranceProgress ?? 1) : value;
  const colour = o.style === 'data' ? C.data : o.style === 'op' ? C.op : o.style === 'grad' ? C.grad : undefined;
  return (
    <div data-path={id} style={{textAlign: 'center'}}>
      <div style={{...TEXT_STYLES.stat, fontSize: 88, ...(colour ? {color: colour} : {}), fontVariantNumeric: 'tabular-nums'}}>
        {formatValue(shown, o.format ?? '0')}
        {o.unit && /^[A-Za-z]{2,}/.test(o.unit) ? ` ${o.unit}` : (o.unit ?? '')}
      </div>
      {o.caption && <div style={{fontFamily: F.mono, fontSize: 26, color: C.muted}}>{o.caption}</div>}
    </div>
  );
};
