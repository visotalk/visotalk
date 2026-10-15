/** chip: a pill label. Styles: default, accent (green outline), stat (large mono figure), muted. */
import React from 'react';
import {resolveValue, type ChipObject, type ChipStyle} from '@visotalk/ir';
import {lookText} from './common';
import {useScope} from '../context';
import {C, F} from '../../theme';
import type {PrimitiveProps} from './common';

const STYLES: Record<ChipStyle, React.CSSProperties> = {
  default: {fontFamily: F.sans, fontSize: 32, color: C.text, background: C.panel2, border: `1px solid ${C.border}`, borderRadius: 999, padding: '10px 26px'},
  tool: {fontFamily: F.mono, fontSize: 40, fontWeight: 700, color: C.text, background: C.panel2, border: `1px solid ${C.border}`, borderRadius: 14, padding: '16px 30px'},
  mono: {fontFamily: F.mono, fontSize: 26, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 999, padding: '8px 20px'},
  accent: {fontFamily: F.sans, fontSize: 32, color: C.good, border: `2px solid ${C.good}`, borderRadius: 999, padding: '10px 26px'},
  stat: {fontFamily: F.mono, fontSize: 64, fontWeight: 700, color: C.good, border: `3px solid ${C.good}`, borderRadius: 18, padding: '10px 30px'},
  badge: {fontFamily: F.mono, fontSize: 30, fontWeight: 700, color: C.bg, background: C.warn, borderRadius: 10, padding: '8px 18px'},
  /** on media */
  overlay: {fontFamily: F.sans, fontSize: 30, fontWeight: 600, color: '#fff', background: 'rgba(0,0,0,0.55)', borderRadius: 999, padding: '8px 22px'},
  overlayBox: {fontFamily: F.sans, fontSize: 36, fontWeight: 700, color: '#fff', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 12, padding: '12px 26px'},
  overlayStatement: {fontFamily: F.sans, fontSize: 38, fontWeight: 700, color: '#fff', background: 'rgba(0,0,0,0.5)', borderRadius: 12, padding: '14px 24px'},
  overlayLabel: {fontFamily: F.sans, fontSize: 24, color: '#fff', background: 'rgba(0,0,0,0.55)', borderRadius: 6, padding: '6px 12px'},
  stamp: {fontFamily: F.sans, fontSize: 96, fontWeight: 900, color: C.good, border: `8px solid ${C.good}`, borderRadius: 16, padding: '4px 40px', letterSpacing: 8,
    background: 'rgba(0,0,0,0.45)', transform: 'rotate(-4deg)'},
  arrow: {fontFamily: F.sans, fontSize: 40, color: C.grad},
  plain: {fontFamily: F.sans, fontSize: 30, color: C.muted},
};

export const Chip: React.FC<PrimitiveProps<ChipObject>> = ({id, o}) => {
  const scope = useScope();
  const align = o.style === 'left' || o.style?.endsWith('-left') ? 'flex-start' : 'center';
  return (
    <div style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: align}}>
      <div data-path={id} style={{whiteSpace: 'nowrap', ...(STYLES[(o.style ?? 'default').replace(/-left$/, '') as ChipStyle] ?? STYLES.default), ...lookText(o.look)}}>{String(resolveValue(o.text, scope))}</div>
    </div>
  );
};
