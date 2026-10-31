import React from 'react';
import {useProp} from '@visotalk/runtime';

// The name, stamped as a fiction; the three actions it stands for; then the note the call to action asks for.
const Trio = ({step}: {step: number}) => {
  const item = (i: number) => Math.max(0, Math.min(1, step - i));
  const box = (i: number): React.CSSProperties => ({
    opacity: item(i), transform: `translateY(${(1 - item(i)) * 18}px)`,
  });
  return (
    <div style={{display: 'flex', alignItems: 'flex-start', gap: 76}}>
      <div style={box(0)}>
        <svg width={150} height={150} viewBox="0 0 104 104">
          <rect x={8} y={14} width={64} height={80} rx={8} fill="none" stroke="#1D2330" strokeWidth={4} />
          <line x1={22} y1={40} x2={58} y2={40} stroke="#1F6FD0" strokeWidth={5} strokeLinecap="round" />
          <line x1={22} y1={58} x2={48} y2={58} stroke="#1D2330" strokeWidth={4} strokeOpacity={0.4} strokeLinecap="round" />
          <line x1={22} y1={74} x2={40} y2={74} stroke="#1D2330" strokeWidth={4} strokeOpacity={0.4} strokeLinecap="round" />
        </svg>
        <div style={{fontSize: 34, color: '#1D2330', opacity: 0.62, marginTop: 16}}>capture</div>
      </div>
      <div style={box(1)}>
        <svg width={150} height={150} viewBox="0 0 104 104">
          <path d="M18 36 L86 36 L86 70 L18 70 Z" fill="none" stroke="#1D2330" strokeWidth={4} />
          <path d="M18 36 L4 52 L18 68" fill="none" stroke="#1D2330" strokeWidth={4} strokeLinejoin="round" />
          <circle cx={34} cy={53} r={6} fill="#1F6FD0" />
        </svg>
        <div style={{fontSize: 34, color: '#1D2330', opacity: 0.62, marginTop: 16}}>tag</div>
      </div>
      <div style={box(2)}>
        <svg width={150} height={150} viewBox="0 0 104 104">
          <circle cx={44} cy={44} r={30} fill="none" stroke="#1D2330" strokeWidth={5} />
          <line x1={66} y1={66} x2={94} y2={94} stroke="#1D2330" strokeWidth={6} strokeLinecap="round" />
        </svg>
        <div style={{fontSize: 34, color: '#1D2330', opacity: 0.62, marginTop: 16}}>search</div>
      </div>
    </div>
  );
};

const LINE = 'one thought, written down';

export const Close = () => {
  const mark = useProp('mark', 0);
  const trio = useProp('trio', 0);
  const card = useProp('card', 0);
  const write = useProp('write', 0);
  const tag = useProp('tag', 0);
  const shown = LINE.slice(0, Math.round(write * LINE.length));

  return (
    <div style={{position: 'absolute', inset: 0, fontFamily: 'var(--vt-sans)'}}>
      <div style={{position: 'absolute', left: 170, top: 106, fontSize: 94, fontWeight: 700, color: '#1D2330', letterSpacing: -1.5}}>
        Nook Notes
      </div>
      <div style={{position: 'absolute', left: 176, top: 228, width: 300, height: 4, background: '#1F6FD0', opacity: mark}} />

      {/* the stamp: this is a fiction */}
      <div style={{
        position: 'absolute', left: 172, top: 268, opacity: mark,
        transform: `rotate(${-2.5}deg) scale(${0.92 + mark * 0.08})`, transformOrigin: 'left center',
        border: '4px solid #B7791F', borderRadius: 8, padding: '10px 24px',
      }}>
        <span style={{fontSize: 36, fontWeight: 700, color: '#B7791F', letterSpacing: 2, fontFamily: 'var(--vt-mono)'}}>FICTIONAL EXAMPLE</span>
      </div>

      {/* the three actions it is an example of */}
      <div style={{position: 'absolute', left: 1090, top: 300, opacity: 1 - card * 0.9}}>
        <Trio step={trio} />
      </div>

      {/* the action, drawn as the note it asks for */}
      <div style={{
        position: 'absolute', left: 172, top: 430, width: 1500, height: 380,
        borderRadius: 18, background: '#FFFDF6', border: '2px solid rgba(29,35,48,0.55)',
        borderTop: '16px solid #1F6FD0', boxShadow: '0 18px 38px rgba(29,35,48,0.12)',
        boxSizing: 'border-box', padding: '38px 42px', opacity: card,
        transform: `translateY(${(1 - card) * 28}px)`,
      }}>
        <div style={{fontSize: 62, fontWeight: 700, color: '#1D2330', lineHeight: 1.3, minHeight: 84}}>{shown}</div>
        <div style={{marginTop: 26, display: 'flex', gap: 18, opacity: tag, transform: `scale(${0.9 + tag * 0.1})`, transformOrigin: 'left center', width: 'max-content'}}>
          <div style={{height: 68, padding: '0 30px', display: 'inline-flex', alignItems: 'center', borderRadius: 34, border: '3px solid #1F6FD0', background: '#EAF2FC'}}>
            <span style={{fontSize: 38, fontWeight: 600, color: '#12437E'}}>#idea</span>
          </div>
          <div style={{height: 68, padding: '0 30px', display: 'inline-flex', alignItems: 'center', borderRadius: 34, border: '3px solid #1F6FD0', background: '#EAF2FC'}}>
            <span style={{fontSize: 38, fontWeight: 600, color: '#12437E'}}>#home</span>
          </div>
        </div>
      </div>
    </div>
  );
};
