import React from 'react';
import {resolveValue, type RunStyle, type TextObject, type TextStyle} from '@visotalk/ir';
import {usePathView, useScope} from '../context';
import {C, F} from '../../theme';
import {boxStyle, lookText, type PrimitiveProps} from './common';

/** Text styles of the default theme */
export const TEXT_STYLES: Record<TextStyle, React.CSSProperties> = {
  title: {fontFamily: F.sans, fontSize: 76, fontWeight: 700, lineHeight: 1.12, color: C.text, letterSpacing: -0.5},
  hero: {fontFamily: F.sans, fontSize: 104, fontWeight: 700, lineHeight: 1.05, color: C.text, letterSpacing: -1},
  subtitle: {fontFamily: F.sans, fontSize: 40, fontWeight: 400, lineHeight: 1.35, color: C.muted},
  body: {fontFamily: F.sans, fontSize: 40, lineHeight: 1.4, color: C.text},
  kicker: {fontFamily: F.mono, fontSize: 26, letterSpacing: 2, textTransform: 'uppercase', color: C.muted},
  caption: {fontFamily: F.sans, fontSize: 28, color: C.muted},
  stat: {fontFamily: F.mono, fontSize: 64, fontWeight: 700, color: C.good},
  quote: {fontFamily: F.sans, fontSize: 52, fontStyle: 'italic', lineHeight: 1.3, color: C.text},
  question: {fontFamily: F.sans, fontSize: 52, fontWeight: 700, color: C.muted, textAlign: 'center'},
  mega: {fontFamily: F.sans, fontSize: 240, fontWeight: 800, color: C.good, letterSpacing: -6, textAlign: 'center', lineHeight: 1},
  brand: {fontFamily: F.sans, fontSize: 104, fontWeight: 800, color: C.good, lineHeight: 1},
  url: {fontFamily: F.mono, fontSize: 52, fontWeight: 700, color: C.text, textAlign: 'center'},
  statement: {fontFamily: F.sans, fontSize: 40, fontWeight: 700, color: C.text, textAlign: 'center'},
  note: {fontFamily: F.sans, fontSize: 30, color: C.good},
  footer: {fontFamily: F.mono, fontSize: 24, color: C.muted, textAlign: 'center'},
  headline: {fontFamily: F.sans, fontSize: 64, fontWeight: 700, color: C.text, textAlign: 'center'},
  monoHero: {fontFamily: F.mono, fontSize: 150, fontWeight: 700, color: C.text, letterSpacing: -4, textAlign: 'center', lineHeight: 1},
  centerSub: {fontFamily: F.sans, fontSize: 36, color: C.muted, textAlign: 'center'},
  formula: {fontFamily: F.mono, fontSize: 52, fontWeight: 700, color: C.grad},
  rule: {fontFamily: F.mono, fontSize: 28, color: C.grad},
  callout: {fontFamily: F.sans, fontSize: 44, fontWeight: 700, color: C.grad},
  label: {fontFamily: F.sans, fontSize: 36, color: C.muted},
  sweep: {fontFamily: F.mono, fontSize: 28, color: C.op, textAlign: 'center'},
  display: {fontFamily: F.sans, fontSize: 210, fontWeight: 800, color: C.text, letterSpacing: -4, lineHeight: 1.1, textAlign: 'center'},
  eyebrow: {fontFamily: F.sans, fontSize: 40, letterSpacing: 10, textTransform: 'uppercase', color: C.muted, textAlign: 'center'},
  byline: {fontFamily: F.sans, fontSize: 44, color: C.text, textAlign: 'center'},
  claim: {fontFamily: F.sans, fontSize: 58, fontWeight: 800, lineHeight: 1.15, color: C.text},
  failStat: {fontFamily: F.sans, fontSize: 64, fontWeight: 800, color: C.bad},
  overlayHero: {fontFamily: F.sans, fontSize: 110, fontWeight: 800, color: '#fff', textAlign: 'center', textShadow: '0 4px 30px rgba(0,0,0,0.6)'},
  overlayNote: {fontFamily: F.sans, fontSize: 24, color: 'rgba(255,255,255,0.8)', textShadow: '0 2px 12px rgba(0,0,0,0.6)'},
  /** multi-line small print (credits); newlines in the text are kept */
  small: {fontFamily: F.sans, fontSize: 21, lineHeight: 1.45, color: C.text, whiteSpace: 'pre-line', overflowWrap: 'anywhere'},
  smallMono: {fontFamily: F.mono, fontSize: 16, lineHeight: 1.9, color: C.muted, whiteSpace: 'pre-line', wordBreak: 'break-all'},
};

const RUN_STYLES: Record<RunStyle, React.CSSProperties> = {
  accent: {color: C.good}, bad: {color: C.bad}, light: {color: C.muted, fontWeight: 400}, data: {color: C.data}, grad: {color: C.grad}, op: {color: C.op}, muted: {color: C.muted}, mono: {fontFamily: F.mono},
};

export const Text: React.FC<PrimitiveProps<TextObject>> = ({id, o, box}) => {
  const v = usePathView(id);
  const scope = useScope();
  const style = TEXT_STYLES[(o.style ?? 'body') as TextStyle] ?? TEXT_STYLES.body;
  let content: React.ReactNode = String(resolveValue(o.text, scope));
  if (v.entrance === 'typewriter') {
    const s = String(content);
    content = s.slice(0, Math.round(s.length * (v.entranceProgress ?? 1)));
  }
  return (
    <div data-path={id} style={{...boxStyle(box), height: undefined, ...style, ...lookText(o.look), textWrap: 'balance' as React.CSSProperties['textWrap'],
      WebkitLineClamp: o.maxLines}}>
      {o.runs ? o.runs.map((r, i) => <span key={i} style={RUN_STYLES[r.style as RunStyle] ?? {}}>{String(resolveValue(r.text, scope))}</span>) : content}
    </div>
  );
};
