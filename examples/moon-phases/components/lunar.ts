/** Shared drawing for the Moon components: the lit part of a disc seen from Earth, and the Moon's constant grey patches. */
export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
export const ease = (k: number) => 1 - (1 - clamp(k)) ** 3;
export const px = Math.round;
export const CREAM = '#efe8cf';
export const DEG = Math.PI / 180;

/** Path of the part of a disc that is lit, for an orbit angle in degrees (0 = new moon, 180 = full, waxing lit on the right). */
export function litPath(g: CanvasRenderingContext2D, cx: number, cy: number, r: number, angle: number) {
  const a = ((angle % 360) + 360) % 360;
  const waxing = a <= 180;
  const t = Math.cos(a * DEG);
  g.beginPath();
  // the limb: a semicircle on the lit side, top to bottom
  g.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2, !waxing);
  // the terminator: half an ellipse back from bottom to top
  const k = waxing ? t : -t;
  const n = 48;
  for (let i = 0; i <= n; i++) {
    const phi = (i / n) * Math.PI;
    g.lineTo(cx + r * k * Math.sin(phi), cy + r * Math.cos(phi));
  }
  g.closePath();
}

/** The same grey patches on every disc: the near side never changes. */
export function maria(g: CanvasRenderingContext2D, cx: number, cy: number, r: number, alpha: number) {
  const blobs: [number, number, number][] = [[-0.3, -0.35, 0.28], [0.25, -0.2, 0.22], [-0.1, 0.15, 0.2], [0.35, 0.3, 0.17], [-0.45, 0.25, 0.14], [0.05, -0.6, 0.12]];
  g.save();
  g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.clip();
  g.fillStyle = `rgba(110,106,92,${alpha})`;
  for (const [x, y, s] of blobs) { g.beginPath(); g.arc(cx + x * r, cy + y * r, s * r, 0, Math.PI * 2); g.fill(); }
  g.restore();
}
