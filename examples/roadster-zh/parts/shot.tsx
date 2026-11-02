// The film's one camera move while the car drives: from the start of the road, past the curl and up the wall, to under the ledge
// where it stops, seen from beside the road like a person at the launch. A smooth curve through a few framings, so the camera never
// stops between them; after the stop every scene moves the camera by tweening the part's own camera props from wherever it is.
import {TRACK_AT, onTrack} from './world.tsx';

export type Cam = {yaw: number; pitch: number; dist: number; tx: number; ty: number; tz: number};

/** Where the car starts (on the floor, well short of the curl) and stops (on the ledge, upside down): distance along the road. */
export const ROAD = {from: -40, to: TRACK_AT.ledge + 2.5};

// the drive's speed over its time `u` (0 to 1): it launches hard (the first 15%), holds its speed up the wall and brakes over the top
// (the last 30%); each ramp is a half cosine, so the speed never jumps
const ACC = 0.15, BRK = 0.3, AREA = 1 - ACC / 2 - BRK / 2;
/** Its speed at `u`, as a share of the fastest. */
export function speed(u: number) {
  const k = Math.min(1, Math.max(0, u));
  if (k < ACC) return (1 - Math.cos(Math.PI * k / ACC)) / 2;
  if (k > 1 - BRK) return (1 + Math.cos(Math.PI * (k - 1 + BRK) / BRK)) / 2;
  return 1;
}
/** Distance along the road at `u`: the integral of that speed, scaled to run from `ROAD.from` to `ROAD.to`. */
export function along(u: number) {
  const k = Math.min(1, Math.max(0, u));
  let d: number;
  if (k < ACC) d = k / 2 - ACC / (2 * Math.PI) * Math.sin(Math.PI * k / ACC);
  else if (k <= 1 - BRK) d = ACC / 2 + (k - ACC);
  else { const w = k - 1 + BRK; d = ACC / 2 + (1 - BRK - ACC) + w / 2 + BRK / (2 * Math.PI) * Math.sin(Math.PI * w / BRK); }
  return ROAD.from + (ROAD.to - ROAD.from) * d / AREA;
}

/** The car's middle at distance `s`. */
export const carAt = (s: number) => onTrack(s, 0, 0.6, 0);

// framings at times of the drive, aimed at the car where it is then (plus an offset) or at a fixed point: the start beside the car
// (the title), a chase from behind as it launches, ahead of it at the curl, the wall, the top, the stop
const near = (u: number, dx: number, dy: number) => { const [x, y] = carAt(along(u)); return {tx: x + dx, ty: y + dy, tz: 0}; };
const KEYS: Array<[number, Cam]> = [
  [0, {yaw: 150, pitch: 6, dist: 13, ...near(0, 8, 1.6)}],
  [0.2, {yaw: 118, pitch: 4, dist: 11, ...near(0.2, 0, 0.5)}],
  [0.45, {yaw: 150, pitch: 2, dist: 14, ...near(0.45, -4, 1.8)}],
  [0.6, {yaw: 165, pitch: 0, dist: 18, tx: -1.5, ty: 4.5, tz: 0}],
  [0.7, {yaw: 172, pitch: -6, dist: 17, tx: -2, ty: 6.5, tz: 0}],
  [0.8, {yaw: 178, pitch: -12, dist: 14, tx: -0.8, ty: 10, tz: 0}],
  [1, {yaw: 186, pitch: -16, dist: 12, tx: 2.2, ty: 11.0, tz: 0}],
];
/** The close look once it has stopped (the second line's "hangs"); the riddle scene sets the camera props to these same numbers as it takes over. */
export const HANG: Cam = {yaw: 190, pitch: -12, dist: 9.6, tx: 2.5, ty: 11.3, tz: 0};

const FIELDS = ['yaw', 'pitch', 'dist', 'tx', 'ty', 'tz'] as const;
/** The camera at `u`: a monotone cubic through the framings, so it eases through each without halting. */
export function driveCam(u: number): Cam {
  const k = Math.min(1, Math.max(0, u));
  let i = 0;
  while (i < KEYS.length - 2 && k > KEYS[i + 1][0]) i++;
  const [u0, a] = KEYS[i], [u1, b] = KEYS[i + 1], h = u1 - u0, f = (k - u0) / h;
  const slope = (j: number, key: keyof Cam) => {
    // the tangent at a framing: the average of the slopes either side, zero at the two ends (it starts and stops at rest)
    if (j === 0 || j === KEYS.length - 1) return 0;
    const [p, pc] = KEYS[j - 1], [q, qc] = KEYS[j + 1];
    return (qc[key] - pc[key]) / (q - p);
  };
  const out = {} as Cam;
  for (const key of FIELDS) {
    const m0 = slope(i, key) * h, m1 = slope(i + 1, key) * h;
    const f2 = f * f, f3 = f2 * f;
    out[key] = (2 * f3 - 3 * f2 + 1) * a[key] + (f3 - 2 * f2 + f) * m0 + (-2 * f3 + 3 * f2) * b[key] + (f3 - f2) * m1;
  }
  return out;
}
