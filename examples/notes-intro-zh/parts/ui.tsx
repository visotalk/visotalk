// The notebook world: warm paper, ink, one terracotta accent. Every scene reuses these small pieces.
export const C = {
  ink: '#23201A',
  muted: '#847B69',
  faint: '#B7AC96',
  paper: '#FFFDF6',
  border: '#E1D8C4',
  accent: '#C2571F',
  green: '#2E7D6E',
  blue: '#2B62A8',
  gold: '#B8912E',
};

export const sans = 'var(--vt-sans)';

// A tag chip: one word, a coloured rule on its left, like a tab on a notebook page.
export const Tag = ({label, color = C.green, size = 26}: {label: string; color?: string; size?: number}) => (
  <div style={{display: 'inline-flex', alignItems: 'center', gap: 10, padding: '9px 18px 9px 14px', borderRadius: 999, background: 'rgba(46,125,110,0.08)', border: `1px solid ${color}55`, fontFamily: sans, fontSize: size, color: C.ink, fontWeight: 500}}>
    <span style={{width: 10, height: 10, borderRadius: 5, background: color}} />
    {label}
  </div>
);

// One note: paper, a ruled edge, an optional tag row.
export const Note = ({text, tags = [], w = 520, size = 34, hue = C.paper, rotate = 0, faded = false}: {
  text: string; tags?: string[]; w?: number; size?: number; hue?: string; rotate?: number; faded?: boolean;
}) => (
  <div style={{width: w, boxSizing: 'border-box', background: hue, border: `2px solid ${C.border}`, borderRadius: 16, padding: '26px 30px 24px', transform: `rotate(${rotate}deg)`, boxShadow: faded ? 'none' : '0 14px 34px rgba(80,60,20,0.10)', opacity: faded ? 0.55 : 1}}>
    <div style={{fontFamily: sans, fontSize: size, lineHeight: 1.4, color: C.ink, letterSpacing: 0.2}}>{text}</div>
    {tags.length > 0 && (
      <div style={{display: 'flex', gap: 10, marginTop: 18}}>
        {tags.map((t) => <Tag key={t} label={t} color={t === '产品' ? C.blue : C.accent} size={Math.round(size * 0.68)} />)}
      </div>
    )}
  </div>
);

// A soft light behind the hero object.
export const Glow = ({size = 700, color = C.accent, opacity = 0.1}: {size?: number; color?: string; opacity?: number}) => (
  <div style={{width: size, height: size, borderRadius: size / 2, background: `radial-gradient(circle, ${color} 0%, transparent 68%)`, opacity, filter: 'blur(6px)'}} />
);
