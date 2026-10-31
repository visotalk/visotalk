// Look: an observatory's star chart at night. Ground #0D1320, ink #EEF2F8, one accent #F2B44C for the comet and the figure the line names;
// Newsreader 600 at 104 px for headings, the sans at 38 px for the key line; the chart sits on a panel lit from behind by a soft amber glow.
// The palette, the type scale and the scene frame below are that line in code, and every scene uses them. The ground and the faces are also
// the theme's tokens in doc.tsx, so the player paints the same ground and build embeds the heading face.
import type {ReactNode} from 'react';

export const C = {
  // ground is also the theme's bg in doc.tsx, so a scene fades in from it
  ground: '#0D1320', panel: '#141C2D', edge: '#26314A',
  ink: '#EEF2F8', quiet: '#8C98B0', accent: '#F2B44C', glow: 'rgba(242, 180, 76, 0.16)',
};
export const F = {display: 'var(--vt-display)', sans: 'var(--vt-sans)', mono: 'var(--vt-mono)'};
// the type scale: size and weight per role
export const T = {
  kicker: {fontSize: 24, fontWeight: 700, letterSpacing: 5},
  title: {fontSize: 104, fontWeight: 600, lineHeight: 1.02},
  key: {fontSize: 38, fontWeight: 400, lineHeight: 1.35},
  figure: {fontSize: 260, fontWeight: 700, lineHeight: 1},
  label: {fontSize: 30, fontWeight: 400},
};

// The scene frame: a copy column on the left (kicker, title, key line, an optional extra such as a formula),
// and the figure in a lit panel on the right, 1040 x 720.
export const Frame = ({kicker, title, keyLine, extra, children}: {kicker: string; title: string; keyLine: string; extra?: ReactNode; children: ReactNode}) => (
  <div style={{position: 'absolute', inset: 0, background: `radial-gradient(1100px 760px at 72% 42%, #1A2540, ${C.ground})`}}>
    <div style={{position: 'absolute', left: 120, top: 150, width: 560, display: 'flex', flexDirection: 'column', gap: 26}}>
      <div style={{...T.kicker, fontFamily: F.sans, color: C.accent, textTransform: 'uppercase'}}>{kicker}</div>
      <div style={{...T.title, fontFamily: F.display, color: C.ink}}>{title}</div>
      <div style={{...T.key, fontFamily: F.sans, color: C.quiet}}>{keyLine}</div>
      {extra}
    </div>
    <div style={{
      position: 'absolute', left: 760, top: 120, width: 1040, height: 720, borderRadius: 24, overflow: 'hidden',
      background: `linear-gradient(160deg, ${C.panel}, ${C.ground})`, border: `1px solid ${C.edge}`,
      boxShadow: `0 30px 80px rgba(0, 0, 0, 0.45), 0 0 140px ${C.glow}`,
    }}>{children}</div>
  </div>
);
