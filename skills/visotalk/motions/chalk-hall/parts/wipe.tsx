import React from 'react';
import {seededRandom} from '@motionhub/runtime';
import {ChalkDefs, unit} from './chalk.ts';

export const meta = {
  name: {en: 'Wipe', 'zh-CN': '擦黑板'},
  purpose: 'transition',
  line: 'The board wiped for the next idea: the eraser sweeps down and up in columns, leaving streaks and a ghost.',
  fits: 'a new topic; a worked example cleared; a wrong idea wiped away',
  params: {
    progress: {type: 'progress', default: 0, doc: '0 to 1: how much of the board is wiped; tween it across the sentence that turns. It repaints with the Slate board\'s own surface, so the board must be beneath'},
    band: {type: 'px', default: 210, doc: 'the eraser\'s width, one column per pass'},
    ghost: {type: 'progress', default: 0.12, doc: 'how much of the old board still shows through the haze'},
  },
  preview: 25.0,
};

// the eraser works the whole writing area, down to the top of the caption band; nothing is written below it
const W = 1920, H = 945;

/**
 * Full-board overlay, placed at 0, 0 and above what it wipes. The covered area is filled with the board's own lit surface
 * (the Slate board's gradient, so the seam cannot be seen), then streaked with the eraser's dust.
 */
export function Wipe({progress = 0, band: wanted = 210, ghost = 0.12}: {progress?: number; band?: number; ghost?: number}) {
  if (progress <= 0) return null;
  const band = W / Math.round(W / wanted);
  const passes = Math.round(W / band), run = unit(progress) * passes, done = Math.floor(run), t = run - done;
  const col = (x: number) => ({x: Math.max(0, x - 6), width: Math.min(W, x + band + 6) - Math.max(0, x - 6)});
  const bands = Array.from({length: Math.min(done, passes)}, (_, i) => <rect key={i} {...col(i * band)} y={0} height={H} fill="url(#wipe-fade)" />);
  const down = done % 2 === 0, reach = 50 + t * (H - 130);
  // the eraser stays inside the writing area: its felt and its shadow never reach the caption band
  const ex = done * band, ey = Math.min(H - 110, down ? reach : H - reach);
  if (done < passes) bands.push(<rect key="now" {...col(ex)} y={down ? 0 : Math.max(0, ey - 50)} height={down ? Math.min(H, ey + 50) : H - Math.max(0, ey - 50)} fill="url(#wipe-fade)" />);
  // the same area as a path, for the smear underneath the repaint: what was written is not lifted cleanly, it is dragged into a blur
  const rects: [number, number, number, number][] = Array.from({length: Math.min(done, passes)}, (_, i) => [col(i * band).x, 0, col(i * band).width, H]);
  if (done < passes) rects.push([col(ex).x, down ? 0 : Math.max(0, ey - 50), col(ex).width, down ? Math.min(H, ey + 50) : H - Math.max(0, ey - 50)]);
  const smear = rects.map(([x, y, w, hh]) => `M${x.toFixed(1)} ${y.toFixed(1)}h${w.toFixed(1)}v${hh.toFixed(1)}h${(-w).toFixed(1)}z`).join(' ');
  const r = seededRandom(`chalk-hall/wipe/${done}`);
  // dust shaken off the felt: under the eraser going down, above it trailing when it comes up
  const falling = Array.from({length: 36}, () => {
    const fy = r() * r() * 230;
    return {x: ex + 12 + r() * (band - 24), y: ey + (down ? 30 + fy : 40 + fy), s: 0.5 + r() * 1.1, o: (0.12 + r() * 0.3) * (1 - fy / 240)};
  });
  const ew = band - 28;
  return (
    <>
    <div style={{position: 'absolute', left: 0, top: 0, width: W, height: H, clipPath: done >= passes ? undefined : `path('${smear}')`, backdropFilter: 'blur(9px)'}} />
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', left: 0, top: 0}}>
      <ChalkDefs />
      <defs>
        <linearGradient id="wipe-fade" gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={0} y2={H}>
          <stop offset="0.95" stopColor="#fff" />
          <stop offset="1" stopColor="#fff" stopOpacity={0} />
        </linearGradient>
        {/* the felt's edge is soft and a little ragged, never a ruled line */}
        <filter id="wipe-edge" filterUnits="userSpaceOnUse" x={-40} y={-40} width={W + 80} height={H + 80}>
          <feTurbulence type="fractalNoise" baseFrequency="0.02 0.12" numOctaves={2} seed={9} result="rag" />
          <feDisplacementMap in="SourceGraphic" in2="rag" scale={18} xChannelSelector="R" yChannelSelector="G" result="ragged" />
          <feGaussianBlur in="ragged" stdDeviation={4} />
        </filter>
        <mask id="wipe-covered" maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}><g filter="url(#wipe-edge)">{bands}</g></mask>
        <filter id="wipe-film" x={0} y={0} width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.028 0.004" numOctaves={2} seed={5} />
          <feColorMatrix type="matrix" values="0 0 0 0 0.92  0 0 0 0 0.94  0 0 0 0 0.9  1.25 0 0 0 -0.35" />
        </filter>
        {/* the chalk a pass pushes to its sides: a faint, wavering lighter seam */}
        <filter id="wipe-ridge" x="-300%" y="-2%" width="700%" height="104%">
          <feTurbulence type="fractalNoise" baseFrequency="0.004 0.03" numOctaves={2} seed={13} result="wave" />
          <feDisplacementMap in="SourceGraphic" in2="wave" scale={22} xChannelSelector="R" yChannelSelector="G" result="wavy" />
          <feGaussianBlur in="wavy" stdDeviation={3} />
        </filter>
        <filter id="wipe-fibre" x={0} y={0} width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.9 0.04" numOctaves={2} seed={3} />
          <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 0.97  1.8 0 0 0 -0.7" />
        </filter>
        <filter id="wipe-grain" x={0} y={0} width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.35" numOctaves={3} seed={6} />
          <feColorMatrix type="matrix" values="0 0 0 0 0.16  0 0 0 0 0.1  0 0 0 0 0.06  1.6 0 0 0 -0.55" />
        </filter>
        <linearGradient id="wipe-felt" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c9c8c1" />
          <stop offset="1" stopColor="#8f918c" />
        </linearGradient>
        <linearGradient id="wipe-back" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4a4038" />
          <stop offset="1" stopColor="#2b2520" />
        </linearGradient>
      </defs>
      {/* once the whole board is wiped the mask is the board, so it is left out: it is the costliest thing here */}
      <g mask={done >= passes ? undefined : 'url(#wipe-covered)'}>
        {/* what was written is lifted, all but a ghost; the felt leaves a pale streaked film along its way */}
        <rect width={W} height={H} fill="url(#board-light)" opacity={1 - ghost} />
        <rect width={W} height={H} filter="url(#board-mottle)" opacity={0.1} />
        <rect width={W} height={H} filter="url(#board-tooth)" opacity={0.18} />
        <rect width={W} height={H} filter="url(#wipe-film)" opacity={0.06} />
        <rect width={W} height={H} fill="url(#board-edge)" />
      </g>
      {/* each seam filtered on its own, so the filter works a narrow strip rather than the whole board */}
      <g opacity={0.32}>
        {Array.from({length: Math.min(done, passes) + 1}, (_, i) => i).filter((i) => i > 0 && i * band < W).map((i) => {
          // not every pass leaves a seam, and none runs the full height
          const q = seededRandom(`chalk-hall/wipe/seam/${i}`), top = 20 + q() * 260, len = 220 + q() * (H - 340 - top);
          return q() < 0.35 ? null : <rect key={i} x={i * band - 2 - q() * 3} y={top} width={3 + q() * 4} height={len} rx={3} fill="var(--color-text)" opacity={0.08 + q() * 0.1} filter="url(#wipe-ridge)" />;
        })}
      </g>
      {done < passes && (
        <g>
          {falling.filter((f) => f.y < H - 4).map((f, i) => <circle key={i} cx={f.x.toFixed(1)} cy={f.y.toFixed(1)} r={f.s.toFixed(2)} fill="var(--color-text)" opacity={Math.max(0, f.o).toFixed(2)} />)}
          <g transform={`translate(${ex + 14} ${ey - 44}) rotate(${down ? -4 : 4} ${ew / 2} 44)`}>
            <rect x={10} y={18} width={ew} height={88} rx={14} fill="#000" opacity={0.45} filter="url(#chalk-haze)" />
            {/* the wooden back with its grain and a worn bevel, then the felt pad seen at its edge, its fibres white with chalk */}
            <rect x={0} y={0} width={ew} height={62} rx={10} fill="url(#wipe-back)" />
            <rect x={0} y={0} width={ew} height={62} rx={10} filter="url(#wipe-grain)" />
            <rect x={8} y={4} width={ew - 16} height={5} rx={2.5} fill="#fff" opacity={0.12} />
            <rect x={4} y={50} width={ew - 8} height={6} fill="#000" opacity={0.25} />
            <rect x={-3} y={54} width={ew + 6} height={34} rx={5} fill="url(#wipe-felt)" />
            <rect x={-3} y={54} width={ew + 6} height={34} rx={5} filter="url(#wipe-fibre)" opacity={0.85} />
            <rect x={-3} y={80} width={ew + 6} height={8} rx={4} fill="#fff" opacity={0.35} filter="url(#chalk-haze)" />
          </g>
        </g>
      )}
    </svg>
    </>
  );
}
