/**
 * shape: a rect, circle, line or path at its own place on the canvas (canvas px), whatever slot it sits in. `shapeBox` is where its ink is, which
 * the stage uses as the object's frame; the numbers are tweenable, `draw` reveals the outline.
 */
import React from 'react';
import {ICONS, type ShapeObject} from '@visotalk/ir';
import {C, F} from '../../theme';
import type {Box} from '../patterns';
import {lookColour, type PrimitiveProps} from './common';

const PAD = 24;

/** The frame of a shape on the canvas: its box, the span of a line (with room for the stroke and arrowhead), or the whole canvas for a path */
export function shapeBox(o: ShapeObject, canvas: {w: number; h: number}): Box {
  if (o.shape === 'line') {
    const x1 = o.x1 ?? 0, y1 = o.y1 ?? 0, x2 = o.x2 ?? x1, y2 = o.y2 ?? y1;
    return {x: Math.min(x1, x2) - PAD, y: Math.min(y1, y2) - PAD, w: Math.abs(x2 - x1) + 2 * PAD, h: Math.abs(y2 - y1) + 2 * PAD};
  }
  if (o.shape === 'path') return {x: 0, y: 0, w: canvas.w, h: canvas.h};
  const square = o.shape === 'icon' || o.shape === 'svg' ? o.w : undefined; // an icon or a drawing with one side given is square
  return {x: o.x ?? 0, y: o.y ?? 0, w: Math.max(o.w ?? o.h ?? 0, 1), h: Math.max(o.h ?? square ?? 0, 1)};
}

const SVG_TAGS = new Set(['svg', 'g', 'path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon']);
const SVG_ATTRS = ['d', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'width', 'height', 'x1', 'y1', 'x2', 'y2', 'points', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin',
  'fill-rule', 'clip-rule', 'opacity', 'fill-opacity', 'stroke-opacity', 'transform'];
const camel = (n: string) => n.replace(/-(\w)/g, (_, c: string) => c.toUpperCase());

/** The markup of an `svg` shape as React elements: only the tags and attributes of a drawing (no script, style, link, image or gradient reference), so a document cannot smuggle anything in */
function svgNode(el: Element, key: string): React.ReactNode {
  const tag = el.tagName.toLowerCase();
  if (!SVG_TAGS.has(tag)) return null;
  const props: Record<string, unknown> = {key};
  for (const n of SVG_ATTRS) {
    const v = el.getAttribute(n);
    if (v !== null && !/url\s*\(/i.test(v)) props[camel(n)] = v;
  }
  return React.createElement(tag === 'svg' ? 'g' : tag, props, ...Array.from(el.children).map((c, i) => svgNode(c, `${key}.${i}`)));
}

/** The viewBox and the elements of an `svg` shape's markup */
function parseSvg(markup: string): {box: [number, number, number, number]; body: React.ReactNode} | undefined {
  const root = new DOMParser().parseFromString(markup, 'image/svg+xml').documentElement;
  if (!root || root.tagName.toLowerCase() !== 'svg') return undefined;
  const vb = (root.getAttribute('viewBox') ?? '0 0 24 24').split(/[\s,]+/).map(Number);
  const box = (vb.length === 4 && vb.every(Number.isFinite) ? vb : [0, 0, 24, 24]) as [number, number, number, number];
  return {box, body: Array.from(root.children).map((c, i) => svgNode(c, String(i)))};
}

export const Shape: React.FC<PrimitiveProps<ShapeObject> & {origin: {x: number; y: number}}> = ({id, o, box, origin}) => {
  const look = o.look ?? {};
  const closed = o.shape === 'rect' || o.shape === 'circle';
  const stroke = look.stroke ? lookColour(look.stroke) : closed ? C.border : o.shape === 'line' ? C.muted : C.data;
  const fill = look.fill ? lookColour(look.fill) : closed ? C.panel2 : 'none';
  const sw = look.strokeWidth ?? (o.shape === 'line' ? 5 : 3);
  const draw = Math.min(1, Math.max(0, o.draw ?? 1));
  const outline = {stroke, strokeWidth: sw, fill, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, pathLength: 1,
    strokeDasharray: 1, strokeDashoffset: 1 - draw, opacity: draw > 0 ? 1 : 0};
  let body: React.ReactNode = null;
  if (o.shape === 'rect') body = <rect x={sw / 2} y={sw / 2} width={Math.max(box.w - sw, 0)} height={Math.max(box.h - sw, 0)} rx={look.radius ?? 16} {...outline} />;
  else if (o.shape === 'circle') body = <ellipse cx={box.w / 2} cy={box.h / 2} rx={Math.max(box.w / 2 - sw / 2, 0)} ry={Math.max(box.h / 2 - sw / 2, 0)} {...outline} />;
  else if (o.shape === 'line') {
    const x1 = (o.x1 ?? 0) - origin.x, y1 = (o.y1 ?? 0) - origin.y, x2 = (o.x2 ?? 0) - origin.x, y2 = (o.y2 ?? 0) - origin.y;
    const len = Math.hypot(x2 - x1, y2 - y1) || 1, ux = (x2 - x1) / len, uy = (y2 - y1) / len, h = 8 + sw * 2.2;
    const ex = x1 + (x2 - x1) * draw, ey = y1 + (y2 - y1) * draw;
    body = (
      <>
        <line x1={x1} y1={y1} x2={o.arrow ? ex - ux * h * 0.6 : ex} y2={o.arrow ? ey - uy * h * 0.6 : ey} stroke={stroke} strokeWidth={sw} strokeLinecap="round" opacity={draw > 0 ? 1 : 0} />
        {o.arrow && draw > 0.02 && <polygon points={`${ex},${ey} ${ex - ux * h - uy * h * 0.5},${ey - uy * h + ux * h * 0.5} ${ex - ux * h + uy * h * 0.5},${ey - uy * h - ux * h * 0.5}`} fill={stroke} />}
      </>
    );
  } else if (o.shape === 'path' && o.path) body = <path d={o.path} {...outline} />;
  else if (o.shape === 'icon' && o.icon && ICONS[o.icon]) {
    // the icon's own grid is 24 units: scale it into the box, and give the stroke in units of that grid
    const iconStroke = look.stroke ? lookColour(look.stroke) : C.text;
    body = (
      <g transform={`scale(${box.w / 24} ${box.h / 24})`}>
        {ICONS[o.icon].map((d, i) => <path key={i} d={d} {...outline} stroke={iconStroke} strokeWidth={look.strokeWidth ?? 2} fill={look.fill ? lookColour(look.fill) : 'none'} />)}
      </g>
    );
  } else if (o.shape === 'svg' && o.svg) {
    const parsed = parseSvg(o.svg);
    if (parsed) {
      const [vx, vy, vw, vh] = parsed.box, k = Math.min(box.w / vw, box.h / vh);
      body = <g transform={`translate(${(box.w - vw * k) / 2 - vx * k} ${(box.h - vh * k) / 2 - vy * k}) scale(${k})`} opacity={draw}>{parsed.body}</g>;
    }
  }
  const fontSize = look.size ?? 36;
  return (
    <svg data-path={id} data-free="1" width={box.w} height={box.h} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
      {body}
      {o.text && closed && (
        <text x={box.w / 2} y={box.h / 2} textAnchor="middle" dominantBaseline="central" fontSize={fontSize} fontWeight={look.weight ?? 600}
          fontFamily={look.font ? F[look.font] : F.sans} fill={look.color ? lookColour(look.color) : C.text}>{o.text}</text>
      )}
    </svg>
  );
};
