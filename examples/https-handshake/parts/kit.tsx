// Look: a night-time network schematic. Ground #0A1120, paper ink #F1EAD9, one amber accent #F2B44C
// for trust and the secure path; failure in brick #E06B5E; ciphertext in steel #8FB6D6.
// Hanken Grotesk 700 at 82 px for headings, Inter 28-34 px for key lines and labels, JetBrains Mono for
// addresses and bytes. Every picture is drawn on the same link between a browser (left) and a server (right);
// the certificate is the one sheet of paper, and the key exchange is a colour sum on that same link.
import type {ReactNode} from 'react';

export const C = {
  ground: '#0A1120', panel: '#111C2E', panel2: '#16243A', edge: '#25344C',
  ink: '#F1EAD9', quiet: '#93A1B5', faint: '#4A5B72',
  accent: '#F2B44C', accentSoft: 'rgba(242,180,76,0.14)',
  bad: '#E06B5E', badSoft: 'rgba(224,107,94,0.14)',
  cipher: '#8FB6D6', cipherSoft: 'rgba(143,182,214,0.12)',
  paper: '#F3EBD9', paperInk: '#1D2A3D', paperQuiet: '#6B7280',
  teal: '#4FD1C5',
};
export const F = {display: 'var(--vt-display)', sans: 'var(--vt-sans)', mono: 'var(--vt-mono)'};
export const T = {
  kicker: {fontSize: 21, fontWeight: 700, letterSpacing: 5.5},
  title: {fontSize: 78, fontWeight: 700, lineHeight: 1.02, letterSpacing: -1},
  key: {fontSize: 29, fontWeight: 400, lineHeight: 1.35},
  label: {fontSize: 24, fontWeight: 500, lineHeight: 1.3},
  small: {fontSize: 20, fontWeight: 500, letterSpacing: 1.5},
  mono: {fontSize: 23, fontWeight: 400},
};

// A padlock. `shut` 0 opens the shackle, 1 closes it. `bad` paints it brick for a failed check.
export const Padlock = ({size = 64, shut = 1, color = C.accent}: {size?: number; shut?: number; color?: string}) => (
  <svg viewBox="0 0 100 126" width={size} height={size * 1.26} style={{display: 'block', overflow: 'visible'}}>
    <g transform={`rotate(${(1 - shut) * -27} 73 53)`} style={{transformOrigin: '73px 53px'}}>
      <path d="M30 53 V37 a20 20 0 0 1 40 0 V53" fill="none" stroke={color} strokeWidth="9" strokeLinecap="round" />
    </g>
    <rect x="15" y="50" width="70" height="62" rx="13" fill={color} />
    <rect x="15" y="96" width="70" height="16" rx="8" fill="rgba(0,0,0,0.14)" />
    <circle cx="50" cy="75" r="7.5" fill={C.ground} />
    <rect x="46.3" y="78" width="7.4" height="20" rx="3.7" fill={C.ground} />
  </svg>
);

// The painted ground every scene stands on.
export const Ground = ({warm = 0}: {warm?: number}) => (
  <div style={{position: 'absolute', inset: 0, background: `radial-gradient(1500px 950px at ${64 + warm * 8}% 22%, #17263C 0%, #0C1524 56%, #0A1120 100%)`}}>
    <div style={{
      position: 'absolute', inset: 0, opacity: 0.55,
      backgroundImage: 'radial-gradient(#22324A 1px, transparent 1.2px)', backgroundSize: '34px 34px',
    }} />
  </div>
);

// The scene frame: a fixed corner (step, heading, key line) and the drawing below it.
export const Frame = ({step, title, keyLine, children}: {step: string; title: string; keyLine: string; children: ReactNode}) => (
  <div style={{position: 'absolute', inset: 0}}>
    <Ground />
    <div style={{position: 'absolute', left: 120, top: 56, width: 980}}>
      <div style={{...T.kicker, fontFamily: F.sans, color: C.accent, textTransform: 'uppercase'}}>{step}</div>
      <div style={{...T.title, fontFamily: F.display, color: C.ink, marginTop: 12}}>{title}</div>
      <div style={{...T.key, fontFamily: F.sans, color: C.quiet, marginTop: 12, width: 860}}>{keyLine}</div>
    </div>
    {children}
  </div>
);

// A browser window: chrome, address bar with a padlock, and a faint sign-in page behind it.
export const Browser = ({x = 120, y = 300, w = 430, h = 340, address = 'yourbank.com', secure = 0, bad = 0, dim = 0, label}: {
  x?: number; y?: number; w?: number; h?: number; address?: string; secure?: number; bad?: number; dim?: number; label?: string;
}) => {
  const k = w / 430;
  const barH = 52 * k;
  const pk = Math.min(k, 1.55);
  return (
    <>
      <div style={{
        position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: 16 * k, overflow: 'hidden',
        background: C.panel, border: `1px solid ${bad ? C.bad : C.edge}`, opacity: 1 - dim * 0.5,
        boxShadow: '0 26px 60px rgba(0,0,0,0.42)',
      }}>
        <div style={{height: barH, background: C.panel2, borderBottom: `1px solid ${C.edge}`, display: 'flex', alignItems: 'center', padding: `0 ${16 * k}px`, gap: 9 * k}}>
          {[0, 1, 2].map((i) => <span key={i} style={{width: 10 * k, height: 10 * k, borderRadius: 5 * k, background: '#3C4F68'}} />)}
          <div style={{
            marginLeft: 10 * k, flex: 1, height: 31 * k, borderRadius: 8 * k, background: C.ground,
            border: `1px solid ${bad ? C.bad : C.edge}`, display: 'flex', alignItems: 'center', gap: 8 * k, padding: `0 ${10 * k}px`,
          }}>
            <Padlock size={13 * k} shut={secure} color={bad ? C.bad : secure > 0.5 ? C.accent : C.faint} />
            <span style={{fontFamily: F.mono, fontSize: 15 * k, color: bad ? C.bad : secure > 0.5 ? C.ink : C.quiet, letterSpacing: -0.3}}>{address}</span>
          </div>
        </div>
        <div style={{padding: `${20 * pk}px ${20 * k}px`}}>
          <div style={{width: '46%', height: 13 * pk, borderRadius: 6 * pk, background: '#24344A'}} />
          <div style={{marginTop: 10 * pk, width: '70%', height: 7 * pk, borderRadius: 4 * pk, background: '#1B2A3D'}} />
          <div style={{marginTop: 7 * pk, width: '62%', height: 7 * pk, borderRadius: 4 * pk, background: '#1B2A3D'}} />
          <div style={{marginTop: 20 * pk, width: '100%', height: 34 * pk, borderRadius: 6 * pk, border: `1px solid ${C.edge}`, background: '#0E1928'}} />
          <div style={{marginTop: 9 * pk, width: '100%', height: 34 * pk, borderRadius: 6 * pk, border: `1px solid ${C.edge}`, background: '#0E1928'}} />
          <div style={{marginTop: 14 * pk, width: 120 * pk, height: 32 * pk, borderRadius: 6 * pk, background: bad ? 'rgba(224,107,94,0.2)' : 'rgba(242,180,76,0.18)', border: `1px solid ${bad ? C.bad : 'rgba(242,180,76,0.45)'}`}} />
        </div>
        {bad > 0.02 && (
          <div style={{
            position: 'absolute', left: 0, right: 0, top: barH, bottom: 0, background: 'rgba(8,14,24,0.9)', opacity: bad,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 * k,
          }}>
            <svg viewBox="0 0 40 36" width={44 * k} height={40 * k}>
              <path d="M20 3 L38 34 H2 Z" fill="none" stroke={C.bad} strokeWidth="3" strokeLinejoin="round" />
              <line x1="20" y1="13" x2="20" y2="24" stroke={C.bad} strokeWidth="3.6" strokeLinecap="round" />
              <circle cx="20" cy="29.5" r="1.9" fill={C.bad} />
            </svg>
            <div style={{fontFamily: F.sans, fontSize: 22 * k, fontWeight: 700, color: C.bad}}>Not secure</div>
            <div style={{fontFamily: F.mono, fontSize: 13 * k, color: C.quiet}}>certificate invalid</div>
          </div>
        )}
      </div>
      {label && (
        <div style={{position: 'absolute', left: x, top: y + h + 16 * k, width: w, textAlign: 'center', fontFamily: F.sans, fontSize: 21, color: C.quiet, letterSpacing: 0.3}}>{label}</div>
      )}
    </>
  );
};

// A small server rack with a label, for the far end of the link.
export const Server = ({x = 1460, y = 290, w = 340, h = 380, label = 'the website', active = 0}: {
  x?: number; y?: number; w?: number; h?: number; label?: string; active?: number;
}) => {
  const k = w / 340;
  return (
    <>
      <div style={{
        position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: 14 * k, background: C.panel,
        border: `1px solid ${C.edge}`, boxShadow: '0 26px 60px rgba(0,0,0,0.42)', padding: 14 * k, boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column', gap: 12 * k,
      }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{
            flex: 1, borderRadius: 8 * k, background: C.panel2, border: `1px solid ${C.edge}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `0 ${12 * k}px`,
          }}>
            <div style={{display: 'flex', gap: 5 * k}}>
              {[0, 1, 2, 3].map((j) => (
                <span key={j} style={{width: 3.5 * k, height: 20 * k, borderRadius: 2 * k, background: '#2C3E56'}} />
              ))}
            </div>
            <div style={{display: 'flex', gap: 7 * k, alignItems: 'center'}}>
              <span style={{width: 7 * k, height: 7 * k, borderRadius: 4 * k, background: i === 0 ? C.accent : '#2C3E56', opacity: i === 0 ? 0.35 + active * 0.65 : 0.9}} />
              <span style={{width: 7 * k, height: 7 * k, borderRadius: 4 * k, background: '#2C3E56'}} />
            </div>
          </div>
        ))}
      </div>
      <div style={{position: 'absolute', left: x - 20, top: y + h + 14 * k, width: w + 40, textAlign: 'center'}}>
        <div style={{fontFamily: F.sans, fontSize: 21, color: C.quiet}}>{label}</div>
        <div style={{fontFamily: F.mono, fontSize: 18, color: C.faint, marginTop: 4}}>yourbank.com</div>
      </div>
    </>
  );
};

// The link between the two ends. `lit` warms it; `broken` cuts it and turns it brick.
export const Wire = ({y = 470, x1 = 552, x2 = 1458, lit = 0, broken = 0, breakAt = 0.5}: {y?: number; x1?: number; x2?: number; lit?: number; broken?: number; breakAt?: number}) => {
  const mid = x1 + (x2 - x1) * breakAt;
  const color = broken > 0.5 ? C.bad : C.accent;
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
      {broken > 0.5 ? (
        <>
          <line x1={x1} y1={y} x2={mid - 46} y2={y} stroke={C.edge} strokeWidth={4} strokeLinecap="round" />
          <line x1={mid + 46} y1={y} x2={x2} y2={y} stroke={C.edge} strokeWidth={4} strokeLinecap="round" />
          <circle cx={mid} cy={y} r={21} fill={C.ground} stroke={C.bad} strokeWidth={3} />
          <path d={`M${mid - 9} ${y - 9} L${mid + 9} ${y + 9} M${mid + 9} ${y - 9} L${mid - 9} ${y + 9}`} stroke={C.bad} strokeWidth={4} strokeLinecap="round" />
        </>
      ) : (
        <>
          <line x1={x1} y1={y} x2={x2} y2={y} stroke={C.edge} strokeWidth={4} strokeLinecap="round" />
          <line x1={x1} y1={y} x2={x2} y2={y} stroke={color} strokeWidth={4} strokeLinecap="round" opacity={lit} />
        </>
      )}
      {[0.2, 0.35, 0.5, 0.65, 0.8].map((f) => (
        <circle key={f} cx={x1 + (x2 - x1) * f} cy={y} r={4} fill={broken > 0.5 ? C.bad : lit > 0.5 ? C.accent : C.edge} opacity={lit > 0.5 ? 0.9 : 0.7} />
      ))}
    </svg>
  );
};

// A key: drawn dashed while it is still a shape, solid when the two ends have built it.
export const Key = ({size = 66, color = '#4FD1C5', formed = 1, dim = 0}: {size?: number; color?: string; formed?: number; dim?: number}) => {
  const w = size, h = size * 0.54;
  const s = {fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const};
  return (
    <svg viewBox="0 0 104 56" width={w} height={h} style={{display: 'block', opacity: 1 - dim}}>
      <g opacity={1 - formed} stroke="#465A75" strokeWidth={7} strokeDasharray="3 9">
        <circle cx="24" cy="28" r="17" {...s} />
        <path d="M41 28 H96 M78 28 V42 M90 28 V38" {...s} />
      </g>
      <g opacity={formed} transform={`translate(52 28) scale(${0.9 + 0.1 * formed}) translate(-52 -28)`} stroke={color} strokeWidth={7}>
        <circle cx="24" cy="28" r="17" {...s} />
        <path d="M41 28 H96 M78 28 V42 M90 28 V38" {...s} />
      </g>
    </svg>
  );
};
