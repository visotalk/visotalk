import React from 'react';
import {seededRandom, useTokens} from '@motionhub/runtime';
import {ChalkDefs} from './chalk.ts';
import {Chalked} from './hand.ts';

export const meta = {
  name: {en: 'Slate board', 'zh-CN': '黑板'},
  purpose: 'ground',
  line: 'A matte green-black slate lit from above, hazed by earlier wipes, the chalk tray at its foot.',
  fits: 'every scene; a new idea is the board wiped, never a new ground',
  params: {
    ghost: {type: 'progress', default: 0.5, doc: '0 to 1: how much of earlier lessons the wiping left: the eraser\'s arcs, and the remnants'},
    remnants: {type: '(text | {text, at})[]', default: [], doc: 'a few words or formulas from the last board, still faintly there after the wipe; at [x, y] puts one clear of this board\'s writing, else it takes a slot near the edges'},
    tray: {type: 'boolean', default: true, doc: 'the aluminium tray with the four chalks along the bottom edge'},
  },
  preview: 26.2,
};

const W = 1920, H = 1080;
/** where the last board's remnants sit: towards the edges, where a hurried wipe misses most */
const SLOTS: [number, number][] = [[130, 700], [1340, 150], [1250, 720], [120, 300], [820, 130]];

/** The eraser's old passes: broad, soft swaths swept across the board in long arcs, a few of them crossing */
function swaths(seed: string) {
  const r = seededRandom(`chalk-hall/board/${seed}`);
  return Array.from({length: 7}, (_, i) => {
    // kept inside the board and above the caption band, stroke width included
    const w = 170 + r() * 80, lean = (r() - 0.5) * 300, x = 220 + i * 250 + (r() - 0.5) * 100, top = w / 2 + r() * 80, bottom = 900 - w / 2 - r() * 60;
    const k = (v: number) => Math.max(w / 2 + 10, Math.min(W - w / 2 - 10, v)).toFixed(0);
    return {d: `M${k(x)} ${top.toFixed(0)} C ${k(x + 110 + lean * 0.3)} ${(top + 260).toFixed(0)}, ${k(x - 100 + lean)} ${(bottom - 260).toFixed(0)}, ${k(x + lean)} ${bottom.toFixed(0)}`,
      w, o: 0.5 + r() * 0.5};
  });
}

/**
 * The aluminium tray along the foot with the four chalks lying in it, their ends worn pale, in a little of
 * their own dust. It is painted as an image in the board's own backdrop: it sits under the caption band, where nothing may be
 * drawn, and is part of the ground rather than something on it. The chalks take the theme's colours.
 */
function trayImage(chalks: string[]) {
  const sticks: [number, number, number][] = [[1180, 96, -1.5], [1306, 72, 2], [1410, 84, -0.8], [1528, 60, 1.2]];
  const r = seededRandom('chalk-hall/board/tray');
  const dust = Array.from({length: 90}, () => `<circle cx="${(1080 + r() * 600).toFixed(0)}" cy="${(29 + r() * 7).toFixed(1)}" r="${(0.6 + r() * 1.3).toFixed(1)}" fill="#f2f0e6" opacity="${(0.15 + r() * 0.4).toFixed(2)}"/>`).join('');
  const stick = ([x, w, a]: [number, number, number], i: number) => `<g transform="rotate(${a} ${x + w / 2} 26)">
    <rect x="${x + 3}" y="25" width="${w}" height="13" rx="6" fill="#000" opacity=".35"/>
    <rect x="${x}" y="18" width="${w}" height="15" rx="7" fill="${chalks[i]}"/>
    <rect x="${x}" y="18" width="${w}" height="15" rx="7" fill="url(#lit)"/>
    <ellipse cx="${x + w - 3}" cy="25.5" rx="3.4" ry="7" fill="#fff" opacity=".28"/></g>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="48" viewBox="0 0 1920 48">
    <defs><linearGradient id="lit" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".32"/></linearGradient>
    <linearGradient id="al" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a3a9a6"/><stop offset=".12" stop-color="#646a68"/><stop offset=".55" stop-color="#3a3f3e"/><stop offset="1" stop-color="#232726"/></linearGradient>
    <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></linearGradient></defs>
    <rect width="1920" height="16" fill="url(#shade)"/><rect y="14" width="1920" height="34" fill="url(#al)"/><rect y="14" width="1920" height="1.5" fill="#d7dcd9" opacity=".55"/>
    <rect y="36" width="1920" height="1" fill="#000" opacity=".35"/>${dust}${sticks.map(stick).join('')}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 0 1032px / 1920px 48px no-repeat`;
}

type Remnant = string | {text: string; at: [number, number]};

export function Board({ghost = 0.5, remnants = [], tray = true}: {ghost?: number; remnants?: Remnant[]; tray?: boolean}) {
  const bands = swaths('swaths');
  const {color = {}} = useTokens();
  const chalks = [color.text ?? '#EDEBE2', color.grad ?? '#F3D57A', color.op ?? '#F2A39E', color.data ?? '#9FCBE2'];
  const r = seededRandom('chalk-hall/board/remnants');
  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden', background: 'var(--color-bg)'}}>
      <ChalkDefs />
      {/* the lit slate and its mottling are painted by divs so the ground can run under the captions; what is drawn stays above y 900 */}
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(1630px 917px at 960px 194px, var(--color-panel) 0%, var(--color-bg) 62%, var(--color-panel2) 100%)'}} />
      <div style={{position: 'absolute', inset: 0, filter: 'url(#board-mottle)', opacity: 0.1}} />
      <svg width={W} height={900} viewBox={`0 0 ${W} 900`} style={{position: 'absolute', left: 0, top: 0}}>
        <defs>
          <radialGradient id="board-light" gradientUnits="userSpaceOnUse" cx={960} cy={194} r={1630} gradientTransform="translate(960 194) scale(1 0.5625) translate(-960 -194)">
            <stop offset="0" stopColor="var(--color-panel)" />
            <stop offset="0.62" stopColor="var(--color-bg)" />
            <stop offset="1" stopColor="var(--color-panel2)" />
          </radialGradient>
          {/* the light and the edge as gradients too, for the Wipe, which repaints the board where it has wiped */}
          <filter id="board-mottle" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.0032 0.0045" numOctaves={4} seed={8} />
            <feColorMatrix type="matrix" values="0 0 0 0 0.85  0 0 0 0 0.92  0 0 0 0 0.88  0.9 0 0 0 -0.38" />
          </filter>
          <radialGradient id="board-edge" gradientUnits="userSpaceOnUse" cx={960} cy={486} r={1440} gradientTransform="translate(960 486) scale(1 0.5625) translate(-960 -486)">
            <stop offset="0.6" stopColor="#000" stopOpacity={0} />
            <stop offset="1" stopColor="#000" stopOpacity={0.42} />
          </radialGradient>
          <filter id="board-soft" filterUnits="userSpaceOnUse" x={-200} y={-200} width={2320} height={1480}>
            <feGaussianBlur stdDeviation={34} />
          </filter>
          <filter id="board-tooth" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={1} seed={2} />
            <feColorMatrix type="matrix" values="0 0 0 0 0.9  0 0 0 0 0.95  0 0 0 0 0.92  0.55 0 0 0 -0.22" />
          </filter>
        </defs>
        {/* earlier wipes: soft swaths of chalk film, faintly streaked along the eraser's way */}
        <g opacity={0.075 * ghost} filter="url(#board-soft)">
          {bands.map((b, i) => <path key={i} d={b.d} fill="none" stroke="#fff" strokeWidth={b.w} strokeOpacity={b.o} strokeLinecap="round" />)}
        </g>
        <g opacity={0.03 * ghost} filter="url(#chalk-smear)">
          {bands.map((b, i) => <path key={i} d={b.d} fill="none" stroke="#fff" strokeWidth={b.w * 0.8} strokeLinecap="round" />)}
        </g>
      </svg>
      <div style={{position: 'absolute', inset: 0, filter: 'url(#board-tooth)', opacity: 0.18}} />
      {/* the edges fall into shadow */}
      <div style={{position: 'absolute', inset: 0, background: `${tray ? `${trayImage(chalks)}, ` : ''}radial-gradient(1440px 810px at 960px 486px, transparent 60%, rgba(0, 0, 0, 0.42) 100%)`}} />
      {remnants.map((rem, i) => {
        const t = typeof rem === 'string' ? rem : rem.text, [x, y] = typeof rem === 'string' ? SLOTS[i % SLOTS.length] : rem.at;
        return (
          <Chalked key={i} pieces={[{text: t, size: 70 + r() * 24}]} seed={`remnant/${i}`}
            style={{position: 'absolute', left: x, top: y, transform: `rotate(${((r() - 0.5) * 4).toFixed(2)}deg)`, opacity: 0.13 * ghost, filter: 'blur(2.5px)'}} />
        );
      })}
    </div>
  );
}
