/**
 * image and video objects. Both fill their box, can be dimmed for text on top, and carry an attribution tag when the
 * asset's license names one. Images take `kenBurns` actions ({from, to}: [scale, x%, y%], linear over the action);
 * videos start playing when they become present (packages/ir/src/media.ts) and render through <Video>.
 */
import React, {useMemo} from 'react';
import {videoStart, videoUse, type Compiled, type ImageObject, type VideoObject, type VisoDoc} from '@visotalk/ir';
import {useDocTime, useSceneFrom} from '../../react';
import {Video as VideoView} from '../../Video';
import {useIR} from '../context';
import {F} from '../../theme';
import type {PrimitiveProps} from './common';

type KB = [number, number, number];

/** Ken Burns state at t: the latest kenBurns action that has started, else the first one's `from` */
function kenBurnsAt(c: Compiled, id: string, t: number): KB | undefined {
  const kbs = c.actions.filter((a) => a.path === id && a.motion === 'kenBurns').sort((a, b) => a.start - b.start);
  if (!kbs.length) return undefined;
  const cur = [...kbs].reverse().find((a) => t >= a.start) ?? kbs[0];
  const from = (cur.params.from as KB | undefined) ?? [1, 50, 50];
  const to = (cur.params.to as KB | undefined) ?? [1.1, 50, 50];
  const p = cur.dur > 0 ? Math.min(1, Math.max(0, (t - cur.start) / cur.dur)) : 1;
  return [0, 1, 2].map((k) => from[k] + (to[k] - from[k]) * p) as KB;
}

export function creditOf(doc: VisoDoc, asset: string): string | undefined {
  const a = doc.assets?.find((x) => x.id === asset);
  if (!a?.license.attribution) return undefined;
  return `${a.license.attribution} · ${a.license.id}`;
}

export const CreditTag: React.FC<{text: string}> = ({text}) => (
  <div style={{position: 'absolute', right: 14, bottom: 12, fontFamily: F.sans, fontSize: 18, color: 'rgba(255,255,255,0.85)', background: 'rgba(0,0,0,0.55)',
    padding: '4px 10px', borderRadius: 6, whiteSpace: 'nowrap'}}>
    {text}
  </div>
);

const Frame: React.FC<{id: string; o: ImageObject | VideoObject; children: React.ReactNode}> = ({id, o, children}) => {
  const {doc} = useIR();
  const credit = o.credit === false ? undefined : creditOf(doc, o.asset);
  return (
    <div data-path={id} style={{position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: '#000', borderRadius: o.style === 'rounded' ? 16 : 0}}>
      {children}
      {o.dim ? <div style={{position: 'absolute', inset: 0, background: `rgba(0,0,0,${o.dim})`}} /> : null}
      {credit && <CreditTag text={credit} />}
    </div>
  );
};

export const Image: React.FC<PrimitiveProps<ImageObject>> = ({id, o}) => {
  const {c, assetUrl} = useIR();
  const t = useDocTime();
  const kb = kenBurnsAt(c, id, t);
  const style: React.CSSProperties = {display: 'block', width: '100%', height: '100%', objectFit: o.fit ?? 'cover'};
  if (kb) Object.assign(style, {objectPosition: `${kb[1]}% ${kb[2]}%`, transform: `scale(${kb[0]})`, transformOrigin: `${kb[1]}% ${kb[2]}%`});
  return (
    <Frame id={id} o={o}>
      <img alt={o.label ?? ''} src={assetUrl(o.asset)} style={style} />
    </Frame>
  );
};

export const Video: React.FC<PrimitiveProps<VideoObject>> = ({id, o}) => {
  const {c} = useIR();
  const from = useSceneFrom();
  const start = useMemo(() => videoStart(c, id, c.scenes.find((s) => s.from === from)!), [c, id, from]);
  return (
    <Frame id={id} o={o}>
      <VideoView use={videoUse(o)} start={start} fit={o.fit ?? 'cover'} path={id} />
    </Frame>
  );
};
