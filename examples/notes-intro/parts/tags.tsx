import React from 'react';
import {useProp} from '@visotalk/runtime';

// A note on the page; tags stitch onto its lower edge, one after another, as words you would look under.
const TAGS = ['work', 'recipe', 'idea', 'later'];
const TAG_X = [200, 500, 800, 1100];

export const Tags = () => {
  const note = useProp('note', 0);
  const tags = useProp('tags', 0);

  return (
    <div style={{position: 'absolute', inset: 0, fontFamily: 'var(--vt-sans)'}}>
      {/* the note, large: this scene is about one note */}
      <div style={{
        position: 'absolute', left: 160, top: 90, width: 1440, height: 570,
        borderRadius: 18, background: '#FFFDF6', border: '2px solid rgba(29,35,48,0.55)',
        borderLeft: '16px solid #1F6FD0', boxShadow: '0 20px 44px rgba(29,35,48,0.12)',
        boxSizing: 'border-box', padding: '52px 58px',
        opacity: note, transform: `translateY(${(1 - note) * 30}px)`,
      }}>
        <div style={{fontSize: 76, fontWeight: 700, color: '#1D2330', lineHeight: 1.26}}>Call the plumber back</div>
        <div style={{marginTop: 34, height: 12, width: '54%', borderRadius: 6, background: '#1D2330', opacity: 0.12}} />
        <div style={{marginTop: 18, height: 12, width: '38%', borderRadius: 6, background: '#1D2330', opacity: 0.12}} />
      </div>

      {/* tags stitch onto the note's bottom edge */}
      {TAGS.map((t, i) => {
        const a = Math.max(0, Math.min(1, (tags - i * 0.8) / 0.55));
        return (
          <div key={t} style={{position: 'absolute', left: TAG_X[i], top: 700, opacity: a}}>
            <svg width={6} height={54} style={{position: 'absolute', left: 52, top: -54}}>
              <line x1={3} y1={0} x2={3} y2={50} stroke="#1F6FD0" strokeWidth={3} strokeDasharray="7 7" opacity={a} />
            </svg>
            <div style={{
              height: 92, padding: '0 34px', display: 'inline-flex', alignItems: 'center',
              borderRadius: 46, border: '3px solid #1F6FD0', background: '#EAF2FC',
              transform: `scale(${0.84 + a * 0.16})`, transformOrigin: 'center',
            }}>
              <span style={{fontSize: 46, fontWeight: 600, color: '#12437E'}}>#{t}</span>
            </div>
          </div>
        );
      })}

    </div>
  );
};
