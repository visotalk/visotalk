// Shared colours, spectrum data and geometry for the sky explainer.
import {random} from '@visotalk/runtime';

export const RED = '#FF4B3E';
export const ORANGE = '#FF8A2B';
export const YELLOW = '#FFD438';
export const GREEN = '#5FD37A';
export const CYAN = '#3FD0D9';
export const BLUE = '#4C8CFF';
export const VIOLET = '#A97BFF';
export const PALE = '#FFEDB0';
export const SANS = 'var(--vt-sans)';

export const SPECTRUM = [
  {key: 'red', color: RED, name: '红'},
  {key: 'orange', color: ORANGE, name: '橙'},
  {key: 'yellow', color: YELLOW, name: '黄'},
  {key: 'green', color: GREEN, name: '绿'},
  {key: 'cyan', color: CYAN, name: '青'},
  {key: 'blue', color: BLUE, name: '蓝'},
  {key: 'violet', color: VIOLET, name: '紫'},
];

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));

/** Linear mix of two hex colours. */
export function mix(a: string, b: string, t: number) {
  const k = Math.max(0, Math.min(1, t));
  const A = hex(a);
  const B = hex(b);
  const c = A.map((v, i) => Math.round(v + (B[i] - v) * k));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/** Deterministic molecule field: the same key gives the same dots. */
export function molecules(key: string, count: number, w: number, h: number, pad = 30) {
  const r = random(key);
  return Array.from({length: count}, () => ({
    x: Math.round(pad + r() * (w - 2 * pad)),
    y: Math.round(pad + r() * (h - 2 * pad)),
    s: 5 + Math.round(r() * 6),
  }));
}

/** Rays leaving a point in every direction. */
export function rays(x: number, y: number, count: number, len: number) {
  return Array.from({length: count}, (_, i) => {
    const a = (i / count) * Math.PI * 2 + 0.4;
    const l = len * (0.75 + ((i * 7) % 5) * 0.1);
    return {x1: x, y1: y, x2: Math.round(x + Math.cos(a) * l), y2: Math.round(y + Math.sin(a) * l)};
  });
}

/** The Earth in the side view: a huge circle whose top is the ground under the observer. */
export const E = {CX: 1490, CY: 6600, RG: 6000, RA: 6220};
export const surfY = (x: number) => E.CY - Math.sqrt(E.RG * E.RG - (x - E.CX) ** 2);
export const topY = (x: number) => E.CY - Math.sqrt(E.RA * E.RA - (x - E.CX) ** 2);

/** The band of air between the ground and its top, from x0 to x1. */
export function bandPath(x0: number, x1: number, floor = 776, steps = 44) {
  const topPts: string[] = [];
  const botPts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const x = x0 + ((x1 - x0) * i) / steps;
    topPts.push(`${Math.round(x)},${Math.round(topY(x))}`);
    botPts.push(`${Math.round(x)},${Math.min(floor, Math.round(surfY(x)))}`);
  }
  return `M${topPts.join(' L')} L${botPts.reverse().join(' L')} Z`;
}

/** The ground below the surface, from x0 to x1. */
export function groundPath(x0: number, x1: number, floor = 776, steps = 44) {
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const x = x0 + ((x1 - x0) * i) / steps;
    pts.push(`${Math.round(x)},${Math.min(floor, Math.round(surfY(x)))}`);
  }
  return `M${pts.join(' L')} L${x1},${floor} L${x0},${floor} Z`;
}

/** A straight beam split into short segments, tinted from white to `to` along its length. */
export function beamSegments(x1: number, y1: number, x2: number, y2: number, tint: number, to: string, count = 48) {
  return Array.from({length: count}, (_, i) => {
    const t0 = i / count;
    const t1 = (i + 1) / count;
    return {
      key: i,
      x1: x1 + (x2 - x1) * t0,
      y1: y1 + (y2 - y1) * t0,
      x2: x1 + (x2 - x1) * t1,
      y2: y1 + (y2 - y1) * t1,
      color: mix('#FFFFFF', to, Math.min(1, t0 * tint * 1.45)),
    };
  });
}
