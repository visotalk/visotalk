/**
 * The Sun, the Earth and the Moon seen from above the north pole, and the Moon as we see it from Earth. Each layer of the picture is its own part, and every
 * part is drawn from one geometry: the Sun is fixed on the left, the Earth sits at the centre, the Moon goes round it counter-clockwise, and the half of the
 * Moon that faces the Sun is the lit half. A scene declares the layers it shows; they all read where the Moon is from the part `moon`.
 *
 * The numbers the document changes (each on the part named before the dot):
 *   moon.angle      where the Moon is on its orbit, in degrees: 0 new moon (between the Earth and the Sun), 90 first quarter, 180 full moon, 270 last quarter, 360 new moon again.
 *                   The phase seen from Earth is this same angle. A lap is written 0 to 360, and a Set back to 0 afterwards changes nothing on screen.
 *   moon.focus      1: the Moon is a big ball held up in front of the lamp; 0 (the start): it is on its orbit
 *   moon.glow       how bright the halo round the lit half is
 *   moon.face       0 to 1: the mark on the side of the Moon that always faces the Earth
 *   orbit.draw      0 to 1: how much of the orbit circle is drawn (1 to start)
 *   shadow.reach    0 to 1: how far the Earth's shadow reaches
 *   sightline.emphasis  0 to 1: how strongly the line from the Earth to the Moon is drawn
 *   days.value      the count of days, 0 to 29.5
 * and three texts: earth.text and moon.text (the labels) and phase-name.text (the name of the phase, in the frame on the right).
 * The Sun's label (`sun-tag`) and the Moon's (`moon-tag`) are targets inside their parts, so a scene can bring a label in on its own word.
 */
import React from 'react';
import {Obj, useProp} from '@visotalk/runtime';
import {DEG, Label, Layer, MoonFace, arc, clamp, litPath, sunHalf, usePalette} from './moon.tsx';

const SUN = {x: 282, y: 520, r: 92};
const EARTH = {x: 960, y: 520, r: 80};
const ORBIT_R = 240;
const MOON_R = 42;
/** the Moon as a ball held up in front of the lamp */
const BALL = {x: 1250, y: 520, r: 160};
/** the Moon as seen from Earth */
const VIEW = {x: 1660, y: 520, r: 140};
const SHADOW_LENGTH = 480;
const SUN_COLOR = '#ffc94d';
/** the gap between the line of sight and the discs it joins */
const GAP = 16;

type Disc = {x: number; y: number; r: number};

/** The Moon's centre and radius: on its orbit at `angle`, or at `focus` 1 the ball in front of the lamp. At angle 0 it is left of the Earth, at 90 below it, at 180 right of it. */
function moonAt(angle: number, focus: number): Disc {
  const a = angle * DEG;
  const x = EARTH.x - ORBIT_R * Math.cos(a), y = EARTH.y + ORBIT_R * Math.sin(a);
  return {x: x + (BALL.x - x) * focus, y: y + (BALL.y - y) * focus, r: MOON_R + (BALL.r - MOON_R) * focus};
}

/** Where the Moon is now, from the part `moon` (every layer that depends on it reads the same two numbers) */
function useMoon(): Disc & {angle: number; focus: number} {
  const angle = useProp('moon', 'angle', 0), focus = useProp('moon', 'focus', 0);
  return {...moonAt(angle, focus), angle, focus};
}

/** The orbit, as a circle drawn from the new-moon position round to `angle` */
const orbitArc = (from: number, to: number) => arc(EARTH.x, EARTH.y, ORBIT_R, -90 - from, -90 - to);

/** Half the width of the Earth's shadow x pixels from the Earth: a band as wide as the Earth that narrows a little */
const shadowHalfWidth = (x: number) => EARTH.r * (1 - 0.25 * (x - EARTH.x) / SHADOW_LENGTH);

/** The Earth's shadow, drawn to `reach` (0 to 1) of its length. It starts where the Earth's disc narrows past its label, so the disc (drawn over it) keeps its text clear. */
function shadowPath(reach: number): string {
  const x0 = EARTH.x + EARTH.r * 0.75, c = Math.sqrt(EARTH.r * EARTH.r - (x0 - EARTH.x) ** 2);
  const end = EARTH.x + SHADOW_LENGTH * reach, hw = shadowHalfWidth(end);
  return `M${x0} ${EARTH.y - c}L${end} ${EARTH.y - hw}L${end} ${EARTH.y + hw}L${x0} ${EARTH.y + c}Z`;
}

/** How much of the Moon is inside the Earth's shadow, 0 to 1, from where the shadow reaches (`shadow.reach`) and where the Moon is */
function useEclipse(m: Disc & {focus: number}): number {
  const length = useProp('shadow', 'reach', 0);
  if (m.x <= EARTH.x || m.x > EARTH.x + SHADOW_LENGTH * length) return 0;
  return clamp((shadowHalfWidth(m.x) + m.r - Math.abs(m.y - EARTH.y)) / (2 * m.r)) * (1 - m.focus);
}

/** Where a label goes: just outside the Moon, on the side away from the Earth, or under the ball. Smooth in the Moon's position, so it never jumps. */
function labelAt(m: Disc, focus: number, text: string, size: number) {
  let ux = (m.x - EARTH.x) * (1 - focus), uy = (m.y - EARTH.y) * (1 - focus) + focus * ORBIT_R;
  const d = Math.hypot(ux, uy) || 1;
  ux /= d; uy /= d;
  const halfW = (text.length * size * 0.56) / 2, halfH = size * 0.6;
  const away = m.r + 16 + Math.abs(ux) * halfW + Math.abs(uy) * halfH;
  return {x: m.x + ux * away, y: m.y + uy * away};
}

/** The orbit circle, drawn to `draw` (0 to 1) of the way round */
export function Orbit() {
  const draw = useProp('draw', 1);
  return <Layer>{draw > 0 && <path d={orbitArc(0, 360 * draw)} fill="none" stroke="var(--vt-muted)" strokeWidth={3} strokeDasharray="10 12" opacity={0.6} />}</Layer>;
}

/** The Earth's shadow, drawn to `reach` (0 to 1) of its length */
export function Shadow() {
  const reach = useProp('reach', 0), pal = usePalette();
  return <Layer>{reach > 0 && <path d={shadowPath(reach)} fill={pal.shadow} stroke="var(--vt-muted)" strokeWidth={3} strokeDasharray="12 10" />}</Layer>;
}

/** The lamp's parallel rays reaching the ball. A ray stops where it hits the ball. */
export function Rays() {
  const m = useMoon(), pal = usePalette();
  return (
    <Layer>
      {[-120, -80, -40, 0, 40, 80, 120].map((dy) => {
        const y = SUN.y + dy, off = y - m.y;
        const to = Math.abs(off) < m.r ? m.x - Math.sqrt(m.r * m.r - off * off) : m.x - m.r;
        return <line key={dy} x1={SUN.x + SUN.r * 2 + 6} y1={y} x2={to} y2={y} stroke={SUN_COLOR} strokeWidth={3} opacity={pal.rays} />;
      })}
    </Layer>
  );
}

/** The Sun: a disc with a halo and a corona, and its label (`sun-tag`) */
export function Sun() {
  const pal = usePalette();
  const corona = Array.from({length: 16}, (_, i) => {
    const a = i * 22.5 * DEG, len = i % 2 ? 20 : 36, w = 0.11;
    const p = (r: number, da: number) => `${(SUN.x + r * Math.cos(a + da)).toFixed(1)},${(SUN.y + r * Math.sin(a + da)).toFixed(1)}`;
    return `${p(SUN.r + 6, -w)} ${p(SUN.r + 6 + len, 0)} ${p(SUN.r + 6, w)}`;
  });
  return (
    <Layer>
      <defs>
        <radialGradient id="sun-core"><stop offset="0" stopColor="#fff6c8" /><stop offset=".6" stopColor={SUN_COLOR} /><stop offset="1" stopColor="#ff9d2e" /></radialGradient>
        <radialGradient id="sun-halo"><stop offset="0" stopColor={SUN_COLOR} stopOpacity=".45" /><stop offset="1" stopColor={SUN_COLOR} stopOpacity="0" /></radialGradient>
      </defs>
      <circle cx={SUN.x} cy={SUN.y} r={SUN.r * 2} fill="url(#sun-halo)" />
      {corona.map((points, i) => <polygon key={i} points={points} fill={SUN_COLOR} opacity={0.85} />)}
      <circle cx={SUN.x} cy={SUN.y} r={SUN.r} fill="url(#sun-core)" />
      <Obj id="sun-tag" as="g"><Label x={SUN.x} y={SUN.y + SUN.r + 80} fill={pal.light ? pal.sunLabel : SUN_COLOR}>Sun</Label></Obj>
    </Layer>
  );
}

/** The Earth with its day side to the Sun and its label, whose text the document may change (`earth.text`) */
export function Earth() {
  const tag = useProp('text', 'Earth'), pal = usePalette();
  return (
    <Layer>
      <defs>
        <linearGradient id="earth-day" x1="0" x2="1"><stop offset="0" stopColor="#5fa0e8" /><stop offset="1" stopColor="#2d5fa8" /></linearGradient>
        <clipPath id="earth-lit"><path d={sunHalf(EARTH.x, EARTH.y, EARTH.r)} /></clipPath>
      </defs>
      <circle cx={EARTH.x} cy={EARTH.y} r={EARTH.r} fill="#1b2b52" />
      <g clipPath="url(#earth-lit)">
        <circle cx={EARTH.x} cy={EARTH.y} r={EARTH.r} fill="url(#earth-day)" />
        <g fill="rgba(90,170,110,0.9)"><circle cx={EARTH.x - 30} cy={EARTH.y - 24} r={16} /><circle cx={EARTH.x - 14} cy={EARTH.y + 30} r={10} /></g>
      </g>
      <Label x={EARTH.x} y={EARTH.y} fill={pal.earthLabel} halo={pal.earthHalo} size={28}>{tag}</Label>
    </Layer>
  );
}

/** The line of sight from the Earth to the Moon, drawn more strongly as `emphasis` (0 to 1) grows */
export function Sightline() {
  const m = useMoon(), emphasis = useProp('emphasis', 0);
  const dx = m.x - EARTH.x, dy = m.y - EARTH.y, d = Math.hypot(dx, dy) || 1;
  return (
    <Layer>
      <line x1={EARTH.x + (dx / d) * (EARTH.r + GAP)} y1={EARTH.y + (dy / d) * (EARTH.r + GAP)} x2={m.x - (dx / d) * (m.r + GAP)} y2={m.y - (dy / d) * (m.r + GAP)}
        stroke="var(--vt-data)" strokeWidth={2 + 3 * emphasis} opacity={0.35 + 0.65 * emphasis} />
    </Layer>
  );
}

/** The Moon at eight points of its orbit, lit on the same half each time. The targets are ghost0 .. ghost7, one every 45 degrees. */
export function Ghosts() {
  return (
    <Layer>
      {Array.from({length: 8}, (_, i) => {
        const g = moonAt(i * 45, 0);
        return <Obj key={i} id={`ghost${i}`} as="g"><MoonFace id={`ghost${i}-lit`} cx={g.x} cy={g.y} r={g.r} lit={sunHalf(g.x, g.y, g.r)} /></Obj>;
      })}
    </Layer>
  );
}

/** The dashed rim between the lit half of the Moon and the dark half */
export function Rim() {
  const m = useMoon();
  return <Layer><line x1={m.x} y1={m.y - m.r - 22} x2={m.x} y2={m.y + m.r + 22} stroke="var(--vt-warn)" strokeWidth={4} strokeDasharray="10 8" /></Layer>;
}

/** Last night's Moon: an outline at the new-moon position and the arc the Moon has moved along since */
export function Yesterday() {
  const m = useMoon(), then = moonAt(0, 0);
  return (
    <Layer>
      <circle cx={then.x} cy={then.y} r={MOON_R} fill="none" stroke="var(--vt-muted)" strokeWidth={4} strokeDasharray="6 6" opacity={0.55} />
      <path d={orbitArc(0, m.angle)} fill="none" stroke="var(--vt-warn)" strokeWidth={8} />
    </Layer>
  );
}

/** The Moon (or the ball), with the mark on the side that faces the Earth and its label (`moon-tag`, whose text is `moon.text`) */
export function Moon() {
  const pal = usePalette();
  const angle = useProp('angle', 0), focus = useProp('focus', 0), glow = useProp('glow', 0.6), face = useProp('face', 0), tag = useProp('text', 'Moon');
  const m = moonAt(angle, focus), tint = useEclipse({...m, focus});
  const at = labelAt(m, focus, tag, 32);
  const dx = EARTH.x - m.x, dy = EARTH.y - m.y, d = Math.hypot(dx, dy) || 1;
  return (
    <Layer>
      <g style={{filter: `drop-shadow(-6px 0 ${14 * glow}px rgba(255,201,77,${0.9 * glow}))`}}>
        <MoonFace id="moon-lit" cx={m.x} cy={m.y} r={m.r} lit={sunHalf(m.x, m.y, m.r)} tint={tint} />
      </g>
      {face > 0 && (
        <g opacity={face * (1 - focus)}>
          <circle cx={m.x + (dx / d) * m.r * 0.62} cy={m.y + (dy / d) * m.r * 0.62} r={9} fill="var(--vt-warn)" />
          <circle cx={m.x + (dx / d) * m.r * 0.62} cy={m.y + (dy / d) * m.r * 0.62} r={17} fill="none" stroke="var(--vt-warn)" strokeWidth={3} />
        </g>
      )}
      <Obj id="moon-tag" as="g"><Label x={at.x} y={at.y} fill={pal.moonLabel}>{tag}</Label></Obj>
    </Layer>
  );
}

/** The frame on the right: the Moon as we see it from Earth (its phase is the Moon's angle) */
export function View() {
  const m = useMoon(), tint = useEclipse(m), pal = usePalette();
  return (
    <Layer>
      <circle cx={VIEW.x} cy={VIEW.y} r={VIEW.r + 22} fill={pal.frame} stroke="var(--vt-data)" strokeWidth={3} />
      <MoonFace id="view-lit" cx={VIEW.x} cy={VIEW.y} r={VIEW.r} lit={litPath(VIEW.x, VIEW.y, VIEW.r, m.angle)} night={pal.frameNight} maria tint={tint} stroke={pal.light ? pal.rim : 'none'} />
      <Label x={VIEW.x} y={VIEW.y + VIEW.r + 62} fill="var(--vt-data)" size={30}>What we see</Label>
    </Layer>
  );
}

/** The name of the phase above the frame (`phase-name.text`) */
export function PhaseName() {
  return <Layer><Label x={VIEW.x} y={VIEW.y - VIEW.r - 100} fill="var(--vt-data)" size={48}>{useProp('text', 'New moon')}</Label></Layer>;
}

/** The count of days above the frame (`days.value`) */
export function Days() {
  return <Layer><Label x={VIEW.x} y={VIEW.y - VIEW.r - 100} fill="var(--vt-data)" size={64}>{useProp('value', 0).toFixed(1)} days</Label></Layer>;
}
