import React from 'react';
import {useProp} from '@visotalk/runtime';

// A phone with one line of input; the line is being written into a note on the page, which is kept on "kept".
const TEXT = 'Call the plumber back';

export const Capture = () => {
  const open = useProp('open', 0);
  const chars = useProp('chars', 0);
  const out = useProp('out', 0);
  const typed = TEXT.slice(0, Math.round(chars));
  const slot = useProp('slot', 0);
  const alpha = out;

  return (
    <div style={{position: 'absolute', inset: 0, fontFamily: 'var(--vt-sans)'}}>
      {/* the app, open on one line */}
      <div style={{
        position: 'absolute', left: 150, top: 40, width: 520, height: 800,
        borderRadius: 44, background: '#FFFDF6', border: '3px solid rgba(29,35,48,0.65)',
        boxShadow: '0 22px 50px rgba(29,35,48,0.14)', boxSizing: 'border-box',
        opacity: open, transform: `translateY(${(1 - open) * 50}px) scale(${0.94 + open * 0.06})`,
        overflow: 'hidden',
      }}>
        <div style={{padding: '44px 40px 0', display: 'flex', alignItems: 'center', gap: 14}}>
          <div style={{width: 26, height: 26, borderRadius: 8, background: '#1F6FD0'}} />
          <div style={{fontSize: 30, fontWeight: 700, color: '#1D2330'}}>Nook Notes</div>
        </div>

        <div style={{margin: '70px 40px 0', borderLeft: '5px solid #1F6FD0', paddingLeft: 22, minHeight: 150}}>
          <div style={{fontSize: 54, lineHeight: 1.28, color: '#1D2330', fontWeight: 600, minHeight: 140}}>
            {typed}
            <span style={{display: 'inline-block', width: 4, height: 54, marginLeft: 4, background: '#1F6FD0', verticalAlign: '-8px', opacity: open > 0.6 && chars < TEXT.length ? 1 : 0}} />
          </div>
        </div>

        <div style={{position: 'absolute', left: 40, right: 40, top: 500, height: 2, background: '#1D2330', opacity: 0.12}} />
        <div style={{position: 'absolute', left: 40, top: 556, height: 10, width: '62%', borderRadius: 5, background: '#1D2330', opacity: 0.10}} />
        <div style={{position: 'absolute', left: 40, top: 592, height: 10, width: '44%', borderRadius: 5, background: '#1D2330', opacity: 0.10}} />
        <div style={{position: 'absolute', left: 40, top: 628, height: 10, width: '54%', borderRadius: 5, background: '#1D2330', opacity: 0.10}} />
      </div>

      {/* the line, on its way to becoming a kept note */}
      <svg width={1920} height={880} viewBox="0 0 1920 880" style={{position: 'absolute', left: 0, top: 0, pointerEvents: 'none'}}>
        <path d="M700 300 C 790 230, 830 230, 900 268" fill="none" stroke="#1E9E55" strokeWidth={4} strokeDasharray="10 10" opacity={out * 0.5} />
      </svg>

      {/* the empty place it will be kept in */}
      <div style={{
        position: 'absolute', left: 900, top: 150, width: 860, height: 560, borderRadius: 18,
        border: '4px dashed rgba(29,35,48,0.28)', boxSizing: 'border-box',
        opacity: slot * (1 - out),
      }} />

      {/* the note, on the page */}
      <div style={{
        position: 'absolute', left: 900, top: 150, width: 860, height: 560,
        borderRadius: 18, background: '#FFFDF6', border: '2px solid rgba(29,35,48,0.55)',
        borderTop: `${16 * (0.3 + 0.7 * out)}px solid ${out > 0.5 ? '#1E9E55' : '#1F6FD0'}`,
        boxShadow: '0 18px 38px rgba(29,35,48,0.12)', boxSizing: 'border-box', padding: '46px 48px',
        opacity: alpha, transform: `translateY(${(1 - alpha) * 22}px)`,
      }}>
        <div style={{fontSize: 70, fontWeight: 700, color: '#1D2330', lineHeight: 1.28, minHeight: 90}}>{typed}</div>
        <div style={{marginTop: 34, height: 12, width: '56%', borderRadius: 6, background: '#1D2330', opacity: 0.13}} />
        <div style={{marginTop: 18, height: 12, width: '38%', borderRadius: 6, background: '#1D2330', opacity: 0.13}} />
        <div style={{position: 'absolute', left: 48, bottom: 42, display: 'flex', alignItems: 'center', gap: 16, opacity: out}}>
          <svg width={44} height={44} viewBox="0 0 42 42">
            <circle cx={21} cy={21} r={20} fill="#1E9E55" />
            <path d="M12 22 L18 29 L30 15" fill="none" stroke="#FFFDF6" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div style={{fontSize: 36, color: '#1E9E55', fontWeight: 600}}>kept</div>
        </div>
      </div>
    </div>
  );
};
