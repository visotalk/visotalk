// The visible spectrum, in order, with a colour per band. Shared by the scenes that show light split up.
export const COLS = [
  {id: 'red', hex: '#ff4d4d', name: 'red'},
  {id: 'orange', hex: '#ff922b', name: 'orange'},
  {id: 'yellow', hex: '#ffd43b', name: 'yellow'},
  {id: 'green', hex: '#51cf66', name: 'green'},
  {id: 'blue', hex: '#3b82f6', name: 'blue'},
  {id: 'violet', hex: '#a855f7', name: 'violet'},
];

// A sine wave as an SVG path, so a wavelength is a number the document can tween.
export const wavePath = (y0: number, lambda: number, amp: number, x0: number, x1: number, phase = 0, step = 6) => {
  const y = (x: number) => Math.round((y0 + amp * Math.sin((2 * Math.PI * (x - x0)) / lambda + phase)) * 100) / 100;
  let d = `M ${x0} ${y(x0)}`;
  for (let x = x0 + step; x <= x1; x += step) d += ` L ${x} ${y(x)}`;
  return d;
};

export const mix = (a: number[], b: number[], t: number) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
export const css = (c: number[], alpha = 1) => `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
