/** Drawing shared by the Moon parts: a lit disc, the Moon's grey patches, labels, and the layer every part draws on. All SVG, so frames can be measured. */
import React from 'react';
import {Obj, useProp, useSceneDuration, useTheme, useTime} from '@visotalk/runtime';

export const CREAM = '#efe8cf';
export const NIGHT = '#343a52';

/** The colours that are not theme tokens: the Moon, the Sun's label, the shadow and the frame. The dark ones are the film's own; a light theme (a paper ground) gets its own. */
export interface Palette {
  light: boolean;
  lit: [string, string];
  night: string;
  /** the moon's outline (a disc on a pale ground needs one) */
  rim: string;
  moonLabel: string;
  sunLabel: string;
  earthLabel: string;
  earthHalo: string;
  frame: string;
  frameNight: string;
  shadow: string;
  rays: number;
  /** the film's own blue, amber, red, grey and white, and the near-black behind a label's outline (the light theme uses its tokens) */
  data: string;
  warn: string;
  bad: string;
  muted: string;
  text: string;
  ink: string;
}
const DARK: Palette = {light: false, lit: ['#fff8e0', CREAM], night: NIGHT, rim: 'var(--vt-border)', moonLabel: '#efe8cf', sunLabel: '#ffc94d', earthLabel: '#f4f6fb', earthHalo: '#070914', frame: '#10131f', frameNight: '#2b3047', shadow: 'rgba(0,0,0,0.5)', rays: 0.35,
  data: '#7ab8ff', warn: '#ffc94d', bad: '#ff7a6b', muted: '#8d97ad', text: '#f4f6fb', ink: '#070914'};
const LIGHT: Palette = {light: true, lit: ['#fffdf4', '#fbefc4'], night: '#8d97b5', rim: '#5a6277', moonLabel: 'var(--vt-text)', sunLabel: 'var(--vt-warn)', earthLabel: '#ffffff', earthHalo: '#1b2b52', frame: '#E4DED0', frameNight: '#9aa3bd', shadow: 'rgba(29,35,48,0.28)', rays: 0.4,
  data: 'var(--vt-data)', warn: 'var(--vt-warn)', bad: 'var(--vt-bad)', muted: 'var(--vt-muted)', text: 'var(--vt-text)', ink: 'var(--vt-bg)'};

/** The palette for the theme being drawn: the light one when the ground is pale */
export function usePalette(): Palette {
  const bg = useTheme().colors.bg.replace('#', '');
  const lightness = [0, 2, 4].reduce((n, i) => n + parseInt(bg.slice(i, i + 2), 16), 0) / 3;
  return lightness > 128 ? LIGHT : DARK;
}
export const DEG = Math.PI / 180;
export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

/**
 * The canvas is 1920 x 1080; every layer draws in those coordinates, above y = 880 (the captions use the band below). The picture slowly closes in over a scene
 * (3.5% by its end, about the centre), while the kicker and the note stay put.
 */
export const Layer = ({children}: {children: React.ReactNode}) => {
  const {lit} = usePalette();
  const x = clamp(useTime() / useSceneDuration());
  return (
    <svg viewBox="0 0 1920 1080" width="100%" height="100%" style={{display: 'block'}}>
      <defs>
        <radialGradient id="moon-cream" cx=".35" cy=".35" r=".8"><stop offset="0" stopColor={lit[0]} /><stop offset="1" stopColor={lit[1]} /></radialGradient>
      </defs>
      <g style={{transform: `scale(${1 + 0.035 * x})`, transformOrigin: '960px 540px'}}>{children}</g>
    </svg>
  );
};

/** A label with an outline in the background colour, so a line passing behind it does not cut the letters */
export const Label = ({x, y, children, fill, size = 54, anchor = 'middle', halo}: {x: number; y: number; children: React.ReactNode; fill?: string; size?: number; anchor?: 'start' | 'middle' | 'end'; halo?: string}) => {
  const pal = usePalette();
  return (
    <text x={x} y={y} textAnchor={anchor} dominantBaseline="central" fontSize={size} fontWeight={700} fontFamily="var(--vt-sans)" fill={fill ?? pal.text}
      stroke={halo ?? pal.ink} strokeWidth={14} strokeLinejoin="round" paintOrder="stroke">{children}</text>
  );
};

/** The lit part of a disc seen from Earth; phase 0 is the new moon, 90 first quarter, 180 full moon, 270 last quarter (the lit side is on the right while it waxes) */
export function litPath(cx: number, cy: number, r: number, phase: number): string {
  const a = ((phase % 360) + 360) % 360;
  const waxing = a <= 180;
  const k = (waxing ? 1 : -1) * Math.cos(a * DEG);
  // the limb is a semicircle on the lit side, the terminator an ellipse of half-width r * k running back from bottom to top
  let d = `M${cx} ${cy - r}A${r} ${r} 0 0 ${waxing ? 1 : 0} ${cx} ${cy + r}`;
  const n = 48;
  for (let i = 1; i <= n; i++) {
    const phi = (i / n) * Math.PI;
    d += `L${(cx + r * k * Math.sin(phi)).toFixed(2)} ${(cy + r * Math.cos(phi)).toFixed(2)}`;
  }
  return `${d}Z`;
}

/** The half of a disc that faces the Sun, which is on the left */
export const sunHalf = (cx: number, cy: number, r: number) => `M${cx} ${cy - r}A${r} ${r} 0 0 0 ${cx} ${cy + r}Z`;

/** A polyline along a circle from angle `from` to `to` (degrees, clockwise from the top), for an outline that draws itself */
export function arc(cx: number, cy: number, r: number, from: number, to: number): string {
  const n = Math.max(2, Math.ceil(Math.abs(to - from) / 4));
  let d = '';
  for (let i = 0; i <= n; i++) {
    const t = (from + ((to - from) * i) / n) * DEG;
    d += `${i ? 'L' : 'M'}${(cx + r * Math.sin(t)).toFixed(2)} ${(cy - r * Math.cos(t)).toFixed(2)}`;
  }
  return d;
}

/** The same grey patches on every disc: the near side never changes. [x, y, radius] in units of the disc radius */
const MARIA: [number, number, number][] = [[-0.3, -0.35, 0.28], [0.25, -0.2, 0.22], [-0.1, 0.15, 0.2], [0.35, 0.3, 0.17], [-0.45, 0.25, 0.14], [0.05, -0.6, 0.12]];

/** A disc whose lit part is `lit` (a path); `tint` (0 to 1) reddens it, as in a lunar eclipse. `id` names the clip path and must be unique in the document */
export function MoonFace({id, cx, cy, r, lit, night, maria = false, tint = 0, stroke}: {
  id: string; cx: number; cy: number; r: number; lit: string; night?: string; maria?: boolean; tint?: number; stroke?: string;
}) {
  const pal = usePalette();
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={night ?? pal.night} />
      <clipPath id={id}><path d={lit} /></clipPath>
      <g clipPath={`url(#${id})`}>
        <circle cx={cx} cy={cy} r={r} fill="url(#moon-cream)" />
        {maria && MARIA.map(([x, y, s], i) => <circle key={i} cx={cx + x * r} cy={cy + y * r} r={s * r} fill="rgba(110,106,92,0.35)" />)}
      </g>
      {tint > 0 && <circle cx={cx} cy={cy} r={r} fill="rgb(150,50,35)" opacity={0.85 * tint} />}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={stroke ?? pal.rim} strokeWidth={3} />
    </g>
  );
}

const DISC_Y = 500, DISC_R = 150;
const DISCS = [{id: 'sliver', phase: 40, x: 384}, {id: 'half', phase: 100, x: 960}, {id: 'full-disc', phase: 180, x: 1536}];

/**
 * Three discs of the Moon (a sliver, a half, a full disc) that turn out to be one sphere. The part `phases` takes `whole`: 0 shows only what is lit,
 * 1 shows the dark rest of the sphere and the one dashed circle round each disc. The discs are targets named after the words that bring them in.
 */
export function PhaseDiscs() {
  const whole = useProp('phases', 'whole', 0), pal = usePalette();
  return (
    <Layer>
      {DISCS.map((d) => (
        <Obj key={d.id} id={d.id} as="g">
          <MoonFace id={`${d.id}-lit`} cx={d.x} cy={DISC_Y} r={DISC_R} lit={litPath(d.x, DISC_Y, DISC_R, d.phase)} maria night={pal.light ? pal.night : `rgba(70,76,96,${0.35 + 0.35 * whole})`} stroke={pal.light ? pal.rim : 'none'} />
          {whole > 0 && <path d={arc(d.x, DISC_Y, DISC_R + 16, 0, 360 * whole)} fill="none" stroke={pal.data} strokeWidth={4} strokeDasharray="14 12" />}
          <Label x={d.x} y={DISC_Y + DISC_R + 80} fill={pal.muted}>{d.id === 'full-disc' ? 'full' : d.id}</Label>
        </Obj>
      ))}
    </Layer>
  );
}
