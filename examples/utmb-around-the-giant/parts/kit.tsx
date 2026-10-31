// Look: an alpine race poster at dusk. Ground #0B1116, bone ink #F1EDE6, one signal orange #FF5C35 for the race and the figure
// a line names, glacier cyan #8FD3E3 for the mountain and for measured comparison. Big Shoulders Display 800 for headings and
// giant figures, Hanken Grotesk for running text, JetBrains Mono for data labels. The film is made of topographic lines, marker
// tape and route maps: the ground carries faint contours, every scene is a plate on that ground.
import type {ReactNode} from 'react';

export const C = {
  ground: '#0B1116', panel: '#101A20', panel2: '#152128', edge: '#26343C',
  ink: '#F1EDE6', quiet: '#93A2AA', faint: '#4A5A62',
  accent: '#FF5C35', ice: '#8FD3E3', warm: '#E4A46A',
};

export const F = {
  display: 'var(--vt-display)',
  sans: 'var(--vt-sans)',
  mono: 'var(--vt-mono)',
};

export const T = {
  kicker: {fontSize: 21, fontWeight: 700, letterSpacing: 5.5},
  title: {fontSize: 88, fontWeight: 800, lineHeight: 0.94},
  key: {fontSize: 30, fontWeight: 400, lineHeight: 1.42},
  figure: {fontSize: 136, fontWeight: 800, lineHeight: 1},
  label: {fontSize: 26, fontWeight: 400, lineHeight: 1.35},
  small: {fontSize: 24, fontWeight: 500, letterSpacing: 1.2},
};

// deterministic pseudo-noise for the contour rings: the same key gives the same drawing every time
const wave = (a: number, k: number, p: number) => Math.sin(a * k + p);

const ring = (cx: number, cy: number, rx: number, ry: number, seed: number) => {
  const pts: string[] = [];
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    const k = 1 + 0.09 * wave(a, 3, seed) + 0.05 * wave(a, 7, seed * 1.7) + 0.02 * wave(a, 11, seed * 0.6);
    pts.push(`${(cx + rx * k * Math.cos(a)).toFixed(1)},${(cy + ry * k * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join('L')}Z`;
};

const CONTOURS = [
  ...Array.from({length: 9}, (_, i) => ring(1340, 360, 150 + i * 92, 96 + i * 54, i * 0.9)),
  ...Array.from({length: 6}, (_, i) => ring(430, 760, 90 + i * 70, 54 + i * 40, 2 + i * 1.3)),
];

// the film's ground: a dusk sky over the massif, with the contour plate the whole film sits on
export const Ground = () => (
  <div style={{position: 'absolute', inset: 0, background: `radial-gradient(1250px 820px at 70% 30%, #17242C 0%, ${C.ground} 66%)`, overflow: 'hidden'}}>
    <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{position: 'absolute', inset: 0}}>
      {CONTOURS.map((d, i) => (
        <path key={i} d={d} fill="none" stroke={i % 3 === 1 ? C.ice : C.ink} strokeWidth={1.2} opacity={i % 3 === 1 ? 0.045 : 0.035} />
      ))}
    </svg>
    <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(900px 620px at 30% 108%, rgba(255,92,53,0.07), transparent 70%)'}} />
  </div>
);

// the scene frame: kicker and heading at the same top-left anchor in every scene
export const Head = ({kicker, title, sub, w = 900, size = 86, top = 46}: {kicker: string; title: string; sub?: ReactNode; w?: number; size?: number; top?: number}) => (
  <div style={{position: 'absolute', left: 80, top, width: w}}>
    <div style={{display: 'flex', alignItems: 'center', gap: 15, marginBottom: 15}}>
      <span style={{width: 4, height: 21, background: C.accent}} />
      <span style={{...T.kicker, fontFamily: F.mono, color: C.accent, textTransform: 'uppercase'}}>{kicker}</span>
    </div>
    <div style={{...T.title, fontSize: size, fontFamily: F.display, color: C.ink}}>{title}</div>
    {sub ? <div style={{...T.key, fontFamily: F.sans, color: C.quiet, marginTop: 14, maxWidth: Math.min(w, 640)}}>{sub}</div> : null}
  </div>
);

// a small mono tag with a leader rule, used for callouts on maps and charts
export const Tag = ({children, color = C.accent}: {children: ReactNode; color?: string}) => (
  <span style={{fontFamily: F.mono, fontSize: 24, fontWeight: 700, letterSpacing: 1.5, color, textTransform: 'uppercase'}}>{children}</span>
);

// hex colour interpolation, for skies and data marks that change with a tweened prop
export const mix = (a: string, b: string, p: number) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const q = Math.max(0, Math.min(1, p));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * q)).join(',')})`;
};
