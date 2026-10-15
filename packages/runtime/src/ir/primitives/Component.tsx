/** component: an L2 `visotalk/timed@1` component drawn in the box its pattern slot gives it, its props set and tweened by the document. */
import React from 'react';
import {ENTRANCES, propsAt, resolveValue, themeTokens, type ComponentObject} from '@visotalk/ir';
import {Timed, useSceneFrom, useDocTime} from '../../react';
import {useIR, useScope} from '../context';
import {C} from '../../theme';
import type {PrimitiveProps} from './common';

export const Component: React.FC<PrimitiveProps<ComponentObject>> = ({id, o, box}) => {
  const {doc, c, components} = useIR();
  const scope = useScope();
  const t = useDocTime();
  const sceneFrom = useSceneFrom();
  const impl = components[o.component];
  if (!impl) return <div style={{color: C.muted}}>[component {o.component}]</div>;
  const base = Object.fromEntries(Object.entries(o.props ?? {}).map(([k, v]) => [k, resolveValue(v as never, scope)]));
  const props = {...base, ...propsAt(c, id, t, base)};
  // seconds since its first entrance in this scene, else since the scene started
  const entered = c.actions.filter((a) => a.path === id && ENTRANCES.has(a.motion) && a.start >= sceneFrom).sort((a, b) => a.start - b.start)[0]?.start ?? sceneFrom;
  return <Timed component={impl} props={props} box={{w: box.w, h: box.h}} local={t - entered} theme={themeTokens(doc.theme)} />;
};
