/**
 * card: kicker, title, body and/or field rows; fills its box. Styles:
 *   default, accent   panel with kicker / title / body, or a title bar with field rows
 *   meta              field rows as "label ........ value" in running text (book facts, specs)
 *   stats, stats-accent  title, then each field as a large figure with its label underneath
 *   cover             a typographic book cover: title, body (subtitle), kicker (author) at the foot
 *   strike, emph      a "not … / but …" pair: kicker + title, struck through and muted, or outlined in the accent
 *   lowerThird        documentary label on media: accent bar, title and body (sub) with shadows, no panel
 *   overlayStat       translucent panel on media: title as a large figure, body as its label
 *   bare              no panel: kicker as a muted line, title as a large claim, body as small print
 * Fields and `card#field` sub-parts take entrances (appear) individually.
 */
import React from 'react';
import {resolveValue, type CardObject, type Field} from '@visotalk/ir';
import {formatValue, usePathView, useScope} from '../context';
import {C, F} from '../../theme';
import {FieldRow} from './Field';
import {entranceStyle, type PrimitiveProps} from './common';

const SHADOW = '0 2px 18px rgba(0,0,0,0.6)';

const Part: React.FC<{path: string; style?: React.CSSProperties; children: React.ReactNode}> = ({path, style, children}) => {
  const v = usePathView(path);
  return <div data-path={path} style={{...style, ...entranceStyle(v.presence, v.entrance, v.entranceProgress)}}>{children}</div>;
};

export const Card: React.FC<PrimitiveProps<CardObject>> = ({id, o}) => {
  const scope = useScope();
  const s = (v: unknown) => (v === undefined ? undefined : String(resolveValue(v as string, scope)));
  const fv = (f: Field) => formatValue(resolveValue(f.value, scope), f.format);
  const style = o.style ?? 'default';
  const fill: React.CSSProperties = {width: '100%', height: '100%', boxSizing: 'border-box'};

  if (style === 'lowerThird') {
    return (
      <div data-path={id} style={{...fill, borderLeft: `6px solid ${C.grad}`, paddingLeft: 24, display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
        <div style={{fontFamily: F.sans, fontSize: 54, fontWeight: 800, color: '#fff', textShadow: SHADOW, lineHeight: 1.1}}>{s(o.title)}</div>
        {o.body !== undefined && <div style={{fontFamily: F.sans, fontSize: 30, color: 'rgba(255,255,255,0.88)', marginTop: 6, textShadow: SHADOW}}>{s(o.body)}</div>}
      </div>
    );
  }
  if (style === 'overlayStat') {
    return (
      <div data-path={id} style={{...fill, background: 'rgba(0,0,0,0.55)', borderRadius: 18, padding: '24px 36px', border: `2px solid ${C.grad}`,
        display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
        <div style={{fontFamily: F.sans, fontSize: 96, fontWeight: 800, color: '#fff', lineHeight: 1, whiteSpace: 'nowrap'}}>{s(o.title)}</div>
        <div style={{fontFamily: F.sans, fontSize: 30, color: 'rgba(255,255,255,0.85)', marginTop: 8}}>{s(o.body)}</div>
      </div>
    );
  }
  if (style === 'bare') {
    return (
      <div data-path={id} style={{...fill}}>
        {o.kicker !== undefined && <div style={{fontFamily: F.sans, fontSize: 30, color: C.muted}}>{s(o.kicker)}</div>}
        <div style={{fontFamily: F.sans, fontSize: 58, fontWeight: 800, color: C.text, marginTop: 12, lineHeight: 1.15}}>{s(o.title)}</div>
        {o.body !== undefined && <div style={{fontFamily: F.sans, fontSize: 24, color: C.faint, marginTop: 24}}>{s(o.body)}</div>}
      </div>
    );
  }
  if (style === 'cover') {
    return (
      <div data-path={id} style={{...fill, borderRadius: 10, background: `linear-gradient(160deg, ${C.panel2} 0%, ${C.bg} 100%)`, border: `1px solid ${C.border}`,
        boxShadow: '30px 30px 80px rgba(0,0,0,0.5)', padding: 50, display: 'flex', flexDirection: 'column', justifyContent: 'space-between'}}>
        <div>
          <div style={{fontFamily: F.sans, fontSize: 96, fontWeight: 800, color: C.text, lineHeight: 1}}>{s(o.title)}</div>
          <div style={{fontFamily: F.sans, fontSize: 30, color: C.muted, marginTop: 24, lineHeight: 1.35}}>{s(o.body)}</div>
        </div>
        <div style={{fontFamily: F.sans, fontSize: 34, fontWeight: 600, color: C.grad}}>{s(o.kicker)}</div>
      </div>
    );
  }
  if (style === 'meta') {
    return (
      <div data-path={id} style={{...fill}}>
        {o.fields?.map((f) => (
          <Part key={f.id} path={`${id}#${f.id}`} style={{display: 'flex', justifyContent: 'space-between', gap: 40, borderBottom: `1px solid ${C.border}`, padding: '16px 0'}}>
            <span style={{fontFamily: F.sans, fontSize: 32, color: C.muted, whiteSpace: 'nowrap'}}>{f.label}</span>
            <span style={{fontFamily: F.sans, fontSize: 32, fontWeight: 600, color: C.text, textAlign: 'right'}}>{fv(f)}</span>
          </Part>
        ))}
      </div>
    );
  }
  if (style === 'stats' || style === 'stats-accent') {
    const colour = style === 'stats-accent' ? C.grad : C.muted;
    return (
      <div data-path={id} style={{...fill, background: C.panel, border: `2px solid ${colour}`, borderRadius: 22, padding: '40px 46px'}}>
        <div style={{fontFamily: F.sans, fontSize: 40, fontWeight: 700, color: C.text}}>{s(o.title)}</div>
        {o.fields?.map((f) => (
          <Part key={f.id} path={`${id}#${f.id}`} style={{marginTop: 30}}>
            <div style={{fontFamily: F.sans, fontSize: style === 'stats-accent' ? 104 : 88, fontWeight: 800, color: colour, lineHeight: 1}}>{fv(f)}</div>
            <div style={{fontFamily: F.sans, fontSize: 30, color: C.muted, marginTop: 6}}>{f.label}</div>
          </Part>
        ))}
      </div>
    );
  }
  if (style === 'strike' || style === 'emph') {
    const strike = style === 'strike';
    return (
      <div data-path={id} style={{...fill, background: strike ? C.panel : C.panel2, border: strike ? `1px solid ${C.border}` : `2px solid ${C.grad}`, borderRadius: 22, padding: 44}}>
        <div style={{fontFamily: F.sans, fontSize: 30, color: strike ? C.muted : C.grad}}>{s(o.kicker)}</div>
        <div style={{fontFamily: F.sans, fontSize: 56, fontWeight: 800, color: strike ? C.muted : C.text, textDecoration: strike ? 'line-through' : 'none',
          marginTop: 8, lineHeight: 1.15}}>{s(o.title)}</div>
      </div>
    );
  }

  const accent = style === 'accent';
  return (
    <div data-path={id} style={{...fill, background: C.panel, border: `${accent ? 2 : 1}px solid ${accent ? C.good : C.border}`,
      borderRadius: 20, padding: o.fields ? 0 : '30px 36px', overflow: 'hidden', display: 'flex', flexDirection: 'column'}}>
      {o.fields ? (
        <>
          {o.title !== undefined && <div style={{height: 64, display: 'flex', alignItems: 'center', padding: '0 24px', fontFamily: F.mono, fontSize: 32, fontWeight: 700, color: C.text}}>{s(o.title)}</div>}
          {o.fields.map((f) => <FieldRow key={f.id} path={`${id}#${f.id}`} field={f} tone={f.id === 'grad' ? 'grad' : f.id === 'op' || f.id === 'prev' ? 'text' : 'data'} />)}
        </>
      ) : (
        <>
          {o.kicker !== undefined && <div style={{fontFamily: F.mono, fontSize: 24, color: C.good}}>{s(o.kicker)}</div>}
          {o.title !== undefined && <div style={{fontFamily: F.sans, fontSize: 42, fontWeight: 700, color: C.text, marginTop: 8, lineHeight: 1.15}}>{s(o.title)}</div>}
          {o.body !== undefined && <div style={{fontFamily: F.sans, fontSize: 28, color: C.muted, marginTop: 12, lineHeight: 1.35}}>{s(o.body)}</div>}
        </>
      )}
    </div>
  );
};
