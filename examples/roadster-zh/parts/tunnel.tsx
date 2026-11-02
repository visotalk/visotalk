// Shared numbers of the Wind Tunnel style: the palette, easing, and the air itself.
//
// The air is ideal flow past the test car, worked out once and kept as streamlines. The car is stood in for by an ellipsoid
// (semi-axes A along the flow, B up, C across, centred CY above the floor); squashing space by those axes turns it into a unit
// sphere, whose flow is known exactly: phi = X (1 + 1 / (2 r^3)). A mirror sphere under the floor keeps the air from passing
// through the floor. A streamline traced in the squashed space and stretched back is tangent to the ellipsoid, so smoke never
// enters the car. Two cases are kept: the floor OPEN (a gap under the car the air can pass through) and SEALED (skirts down:
// the ellipsoid reaches the floor and the air goes round). World units are metres; the air flows towards +x.

export const V = {
  bg: 'var(--vt-bg)', panel: 'var(--vt-panel)', panel2: 'var(--vt-panel2)', border: 'var(--vt-border)',
  text: 'var(--vt-text)', muted: 'var(--vt-muted)', faint: 'var(--vt-faint)',
  low: 'var(--vt-data)', high: 'var(--vt-grad)', force: 'var(--vt-warn)', good: 'var(--vt-good)',
  sans: 'var(--vt-sans)', mono: 'var(--vt-mono)', display: 'var(--vt-display)',
};
// the same colours as literals, for three.js
export const HEX = {low: '#4FD1FF', high: '#FF8A3D', force: '#FFC24D', smoke: '#E8EEF5', calm: '#7F93B2', bg: '#04070C'};

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const mix = (a: number, b: number, k: number) => a + (b - a) * k;
export const easeOut = (k: number) => 1 - Math.pow(1 - clamp(k), 3);
export const easeInOut = (k: number) => {
  const x = clamp(k);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
/** 0..1 inside [a, b] of a progress */
export const phase = (p: number, a: number, b: number) => clamp((p - a) / (b - a));
export const DEG = Math.PI / 180;

/** Lettering for instruments: tracked capitals in the display face. */
export const plate = (size: number) => ({fontFamily: V.display, fontSize: size, fontWeight: 600, letterSpacing: size * 0.08, textTransform: 'uppercase' as const});

/** A small fixed-seed generator: the same numbers on every machine and every frame. */
export function seeded(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = Math.imul(s ^ (s >>> 15), 2246822507) ^ Math.imul(s ^ (s >>> 13), 3266489909);
    s ^= s >>> 16;
    return (s >>> 0) / 4294967296;
  };
}

// ── the car's measurements, shared by the body, the flow and the floor map ─────────────────────────────────────────────────────────

export const CAR = {
  length: 4.5, half: 2.25, width: 1.98, wheelX: 1.42, wheelZ: 0.83, wheelR: 0.36, sill: 0.14,
  /** the chamber under the floor that the fans empty: its half length and half width */
  chamberX: 1.7, chamberZ: 0.8,
};

export type Field = {A: number; B: number; C: number; CY: number};
export const OPEN: Field = {A: 2.42, B: 0.56, C: 1.1, CY: 0.68};     // a gap of 0.12 m under the car
export const SEALED: Field = {A: 2.42, B: 0.66, C: 1.1, CY: 0.66};   // the skirts are down: the body meets the floor

/** The velocity at (x, y, z) for a free stream of 1 towards +x, and the speed there (1 far away). */
export function velocity(f: Field, x: number, y: number, z: number): [number, number, number, number] {
  const X = x / f.A, Z = z / f.C;
  let ux = 1, uy = 0, uz = 0;
  for (const Y of [(y - f.CY) / f.B, (y + f.CY) / f.B]) {   // the body, and its mirror under the floor
    const r2 = X * X + Y * Y + Z * Z, r = Math.sqrt(r2), r5 = r2 * r2 * r;
    ux += 1 / (2 * r2 * r) - (3 * X * X) / (2 * r5);
    uy += -(3 * X * Y) / (2 * r5);
    uz += -(3 * X * Z) / (2 * r5);
  }
  // back to world space: a step of the squashed flow, stretched by the axes
  const vx = ux * f.A, vy = uy * f.B, vz = uz * f.C;
  const speed = Math.sqrt(ux * ux + uy * uy + uz * uz);
  const n = Math.sqrt(vx * vx + vy * vy + vz * vz) || 1;
  return [vx / n, vy / n, vz / n, speed];
}

/** Inside the ellipsoid (or under the floor): where no smoke may go. */
export const inside = (f: Field, x: number, y: number, z: number) =>
  y < 0 || (x / f.A) ** 2 + ((y - f.CY) / f.B) ** 2 + (z / f.C) ** 2 < 1;

export type Streamline = {pts: Float32Array; speed: Float32Array; n: number; length: number};

/** Trace one streamline from a seed upstream to x1, in steps of about `ds` metres (midpoint rule). */
export function trace(f: Field, x0: number, y0: number, z0: number, x1 = 16, ds = 0.06): Streamline {
  const pts: number[] = [], sp: number[] = [];
  let x = x0, y = y0, z = z0;
  for (let i = 0; i < 2000 && x < x1; i++) {
    const [ax, ay, az, s] = velocity(f, x, y, z);
    pts.push(x, y, z);
    sp.push(s);
    const [bx, by, bz] = velocity(f, x + ax * ds / 2, y + ay * ds / 2, z + az * ds / 2);
    x += bx * ds; y += by * ds; z += bz * ds;
    if (y < 0.012) y = 0.012;
  }
  return {pts: new Float32Array(pts), speed: new Float32Array(sp), n: sp.length, length: sp.length * ds};
}

/** Linear map of the speed ratio to the smoke's colour: slow air (high pressure) warm, free stream pale, fast air (low pressure) cyan. */
export function speedColor(s: number, out: [number, number, number] = [0, 0, 0]) {
  const calm = [0.50, 0.58, 0.70], high = [1.0, 0.54, 0.24], low = [0.31, 0.82, 1.0];
  if (s < 1) {
    const k = clamp((1 - s) / 0.55);
    for (let i = 0; i < 3; i++) out[i] = mix(calm[i], high[i], k);
  } else {
    const k = clamp((s - 1) / 0.45);
    for (let i = 0; i < 3; i++) out[i] = mix(calm[i], low[i], k);
  }
  return out;
}

/** The pressure coefficient of ideal flow: 1 where the air stops, 0 in the free stream, negative where it speeds up. */
export const cp = (speed: number) => 1 - speed * speed;
