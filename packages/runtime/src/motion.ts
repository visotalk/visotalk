/** Time-continuous motion helpers (seconds in, values out). No frame numbers anywhere. */

export const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

export const easeInOutCubic = (x: number): number => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const easeOutCubic = (x: number): number => 1 - Math.pow(1 - x, 3);

/** 0→1 between `at` and `at + dur`, eased */
export const ramp = (t: number, at: number, dur: number, ease = easeInOutCubic): number =>
  ease(clamp01((t - at) / dur));

/**
 * Critically damped spring response 0→1 (closed form, so it can be evaluated at any t).
 * `settle` is the time to reach ~99.9%.
 */
export const spring = (t: number, at: number, settle = 0.5): number => {
  const x = t - at;
  if (x <= 0) return 0;
  const w = 9.2 / settle; // e^{-wx}(1+wx) ≈ 1e-3 at x = settle
  if (x >= settle) return 1;
  return 1 - Math.exp(-w * x) * (1 + w * x);
};
