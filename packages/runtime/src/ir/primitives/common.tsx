import type React from 'react';
import {easeOutCubic} from '../../motion';
import type {Box} from '../patterns';
import type {Look} from '@visotalk/ir';
import {C, F, type ColorToken} from '../../theme';

export interface PrimitiveProps<O> {
  id: string;
  o: O;
  box: Box;
}

/** Visual treatment of presence and entrance motions shared by all primitives */
export function entranceStyle(presence: number, motion?: string, p = 1): React.CSSProperties {
  if (presence <= 0) return {opacity: 0, visibility: 'hidden'};
  if (motion === 'stamp') {
    const e = easeOutCubic(p);
    return {opacity: e, transform: `scale(${1.6 - 0.6 * e})`};
  }
  if (motion === 'wipe') return {clipPath: `inset(0 ${(1 - easeOutCubic(p)) * 100}% 0 0)`};
  return {opacity: presence, transform: presence < 1 ? `translateY(${(1 - easeOutCubic(presence)) * 16}px)` : undefined};
}

export const boxStyle = (b: Box): React.CSSProperties =>
  b.natural ? {position: 'relative', width: 'max-content', maxWidth: b.w} : {position: 'absolute', left: b.x, top: b.y, width: b.w, height: b.h};

/** A theme colour name (`data`, `grad`, `muted`...) or any CSS colour */
export const lookColour = (c: string) => (c in C ? C[c as ColorToken] : c);
const colour = lookColour;

/** The text part of an object's `look`: size, colour, weight, font, alignment and padding */
export const lookText = (l?: Look): React.CSSProperties => ({
  ...(l?.size !== undefined && {fontSize: l.size}),
  ...(l?.color && {color: colour(l.color)}),
  ...(l?.weight !== undefined && {fontWeight: l.weight}),
  ...(l?.font && {fontFamily: F[l.font]}),
  ...(l?.align && {textAlign: l.align}),
  ...(l?.padding !== undefined && {padding: l.padding, boxSizing: 'border-box' as const}),
});

/** The panel part of an object's `look`: background, border and corner radius */
export const lookPanel = (l?: Look): React.CSSProperties => ({
  ...(l?.background && {background: colour(l.background)}),
  ...(l?.border && {border: `2px solid ${colour(l.border)}`, boxSizing: 'border-box' as const}),
  ...(l?.radius !== undefined && {borderRadius: l.radius}),
});
