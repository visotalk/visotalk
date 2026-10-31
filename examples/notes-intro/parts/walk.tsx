import React from 'react';
import {useProp} from '@visotalk/runtime';

// The walk home: an idea travels along a dotted road and fades into an empty dashed frame.
const pos = (t: number) => {
  const x = 210 + t * 990;
  const y = 520 - Math.sin(t * Math.PI) * 200;
  return {x, y};
};

const pts = Array.from({length: 61}, (_, i) => {
  const p = pos(i / 60);
  return `${Math.round(p.x)},${Math.round(p.y)}`;
}).join(' ');

const CARDS = [true, false, true, false];

const NoteCard = ({shown, tag, tilt}: {shown: number; tag: boolean; tilt: number}) => (
  <div style={{
    width: 200, height: 176, borderRadius: 14, background: '#FFFDF6',
    border: '2px solid rgba(29,35,48,0.50)', borderTop: '12px solid #1F6FD0',
    boxShadow: '0 12px 26px rgba(29,35,48,0.10)',
    opacity: shown,
    transform: `translateY(${(1 - shown) * 34}px) rotate(${tilt}deg)`,
    padding: '16px 16px', boxSizing: 'border-box',
  }}>
    <div style={{height: 9, width: '80%', background: '#1D2330', opacity: 0.55, borderRadius: 4}} />
    <div style={{marginTop: 13, height: 8, width: '94%', background: '#1D2330', opacity: 0.20, borderRadius: 4}} />
    <div style={{marginTop: 11, height: 8, width: '58%', background: '#1D2330', opacity: 0.20, borderRadius: 4}} />
    {tag ? <div style={{marginTop: 22, height: 24, width: 74, borderRadius: 12, border: '2px solid #1F6FD0', opacity: 0.7}} /> : null}
  </div>
);

export const Walk = () => {
  const walk = useProp('walk', 0);
  const idea = useProp('idea', 1);
  const slot = useProp('slot', 0);
  const notes = useProp('notes', 0);
  const p = pos(walk);

  return (
    <div style={{position: 'absolute', inset: 0, fontFamily: 'var(--vt-sans)'}}>
      <svg viewBox="0 0 1920 880" width="1920" height="880" style={{position: 'absolute', left: 0, top: 0}}>
        {/* the road home */}
        <polyline points={pts} fill="none" stroke="#1D2330" strokeOpacity={0.26} strokeWidth={4} strokeDasharray="2 16" strokeLinecap="round" />

        {/* nowhere quick to put it: an empty frame at the end of the road */}
        <g opacity={slot}>
          <rect x={1148} y={368} width={300} height={210} rx={14} fill="none" stroke="#1D2330" strokeOpacity={0.5} strokeWidth={4} strokeDasharray="13 13" />
        </g>

        {/* the idea, on its way */}
        <g opacity={idea}>
          <circle cx={p.x} cy={p.y} r={86} fill="#1F6FD0" fillOpacity={0.12} />
          <circle cx={p.x} cy={p.y} r={42} fill="#1F6FD0" />
          <text x={p.x} y={p.y + 14} textAnchor="middle" fontFamily="var(--vt-sans)" fontSize={30} fontWeight={700} fill="#FFFFFF">idea</text>
        </g>
      </svg>

      {/* small thoughts, each worth keeping */}
      <div style={{position: 'absolute', left: 150, top: 610, display: 'flex', gap: 38}}>
        {CARDS.map((tag, i) => (
          <NoteCard key={i} shown={Math.max(0, Math.min(1, notes * 3.1 - i * 0.62))} tag={tag} tilt={tag ? -1.4 : 1.2} />
        ))}
      </div>
    </div>
  );
};
