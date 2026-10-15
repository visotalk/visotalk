/**
 * Object frame: positions an object at its box and applies motions that work for every primitive —
 * entrances (appear, stamp, wipe, crossfade), exits (disappear, optionally `toward` another object), highlight pulse,
 * and emphasis (dim / focus). Primitive-specific motions (drawIn, typewriter, countUp, flow, kenBurns) are left to
 * the primitive.
 */
import React from 'react';
import type {Compiled} from '@visotalk/ir';
import {clamp01, easeInOutCubic, easeOutCubic} from '../motion';
import type {Box} from './patterns';

const PRIMITIVE_ENTRANCES = new Set(['drawIn', 'typewriter', 'countUp']);

export function frameStyle(c: Compiled, id: string, t: number, box: Box, boxes: Record<string, Box>, view: {
  presence: number; entrance?: string; entranceProgress?: number; motions: Record<string, number | undefined>;
}): React.CSSProperties {
  const style: React.CSSProperties = {position: 'absolute', left: box.x, top: box.y, width: box.w, height: box.h};
  // exits: the latest disappear action that has started
  const exit = [...c.actions].reverse().find((a) => a.path === id && a.motion === 'disappear' && t >= a.start);
  if (exit) {
    const p = clamp01((t - exit.start) / exit.dur);
    if (p >= 1) return {...style, visibility: 'hidden', opacity: 0};
    const toward = typeof exit.params.toward === 'string' ? boxes[exit.params.toward] : undefined;
    const e = easeInOutCubic(p);
    if (toward) {
      const dx = toward.x + toward.w / 2 - (box.x + box.w / 2), dy = toward.y + toward.h / 2 - (box.y + box.h / 2);
      return {...style, opacity: 1 - e, transform: `translate(${dx * e}px, ${dy * e}px) scale(${1 - 0.6 * e})`};
    }
    return {...style, opacity: 1 - e, transform: `translateY(${-12 * e}px)`};
  }
  if (view.presence <= 0) return {...style, visibility: 'hidden', opacity: 0};
  const m = view.entrance && !PRIMITIVE_ENTRANCES.has(view.entrance) ? view.entrance : undefined;
  const p = view.entranceProgress ?? 1;
  if (m === 'stamp') {
    const e = easeOutCubic(p);
    Object.assign(style, {opacity: e, transform: `scale(${1.5 - 0.5 * e})`});
  } else if (m === 'wipe') {
    Object.assign(style, {clipPath: `inset(0 ${(1 - easeOutCubic(p)) * 100}% 0 0)`});
  } else if (m === 'crossfade') {
    Object.assign(style, {opacity: easeInOutCubic(p)});
  } else if (m) {
    Object.assign(style, {opacity: view.presence, transform: `translateY(${(1 - easeOutCubic(view.presence)) * 18}px)`});
  }
  const hl = view.motions.highlight;
  if (hl !== undefined && hl <= 1) {
    const pulse = Math.sin(Math.PI * hl);
    style.filter = `drop-shadow(0 0 ${18 * pulse}px rgba(232,236,244,${0.55 * pulse}))`;
  }
  return style;
}
