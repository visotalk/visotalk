// Scene "keys": the colour sum. Each end picks a private colour, the public pieces cross once,
// and both ends' keys fill with the same teal while the listener below gets only a question mark.
import {Obj, useProp} from '@visotalk/runtime';
import {C, F, Frame, Key} from './kit.tsx';

const Station = ({x, side, formed}: {x: number; side: 'l' | 'r'; formed: number}) => {
  const privX = side === 'l' ? 64 : 340;
  const pubX = side === 'l' ? 340 : 64;
  const privColor = side === 'l' ? C.accent : '#6C9BE8';
  return (
    <div style={{
      position: 'absolute', left: x, top: 270, width: 480, height: 400, borderRadius: 16,
      background: C.panel, border: `1px solid ${C.edge}`, boxShadow: '0 26px 60px rgba(0,0,0,0.42)',
    }}>
      <div style={{position: 'absolute', left: 26, top: 22, display: 'flex', alignItems: 'center', gap: 13}}>
        {side === 'l' ? (
          <svg width={28} height={24} viewBox="0 0 26 22">
            <rect x="1" y="1" width="24" height="20" rx="3" fill="none" stroke={C.quiet} strokeWidth="1.6" />
            <line x1="1" y1="7" x2="25" y2="7" stroke={C.quiet} strokeWidth="1.6" />
          </svg>
        ) : (
          <svg width={28} height={24} viewBox="0 0 26 22">
            <rect x="1" y="1" width="24" height="20" rx="3" fill="none" stroke={C.quiet} strokeWidth="1.6" />
            <line x1="5" y1="8" x2="21" y2="8" stroke={C.quiet} strokeWidth="1.6" />
            <line x1="5" y1="14" x2="21" y2="14" stroke={C.quiet} strokeWidth="1.6" />
          </svg>
        )}
        <span style={{fontFamily: F.sans, fontSize: 23, color: C.quiet}}>{side === 'l' ? 'your browser' : 'the website'}</span>
      </div>

      <Obj id={`priv-${side}`} style={{
        position: 'absolute', left: privX, top: 88, width: 76, height: 76, borderRadius: 38,
        background: privColor, boxShadow: `0 0 38px ${privColor}55`,
      }} />
      <div style={{position: 'absolute', left: privX - 17, top: 178, width: 110, textAlign: 'center', fontFamily: F.sans, fontSize: 19, letterSpacing: 1.2, color: C.quiet}}>private</div>

      <div style={{position: 'absolute', left: 222, top: 100, fontFamily: F.sans, fontSize: 44, color: C.faint}}>+</div>

      <div style={{position: 'absolute', left: pubX, top: 88, width: 76, height: 76, borderRadius: 38, border: `2px dashed ${C.edge}`, boxSizing: 'border-box'}} />
      <div style={{position: 'absolute', left: pubX - 17, top: 178, width: 110, textAlign: 'center', fontFamily: F.sans, fontSize: 19, letterSpacing: 1.2, color: C.quiet}}>public</div>

      <div style={{position: 'absolute', left: 40, top: 242, right: 40, height: 1, background: C.edge}} />
      <div style={{position: 'absolute', left: 140, top: 256}}><Key size={86} formed={formed} color={C.teal} /></div>
      <div style={{position: 'absolute', left: 244, top: 272, fontFamily: F.sans, fontSize: 22, color: formed > 0.5 ? C.teal : C.faint}}>the key</div>
    </div>
  );
};

export const Keys = () => {
  const formed = useProp('formed', 0);
  return (
    <Frame step="03 · the key" title="Agreeing on a key"
      keyLine="Both ends build one secret; only public pieces cross.">
      <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
        <line x1={722} y1={396} x2={1198} y2={396} stroke={C.edge} strokeWidth={3} strokeLinecap="round" />
        {[0.25, 0.5, 0.75].map((f) => <circle key={f} cx={722 + 476 * f} cy={396} r={3.5} fill={C.edge} />)}
      </svg>

      <Station x={240} side="l" formed={formed} />
      <Station x={1200} side="r" formed={formed} />
      <Obj id="pub-l" style={{position: 'absolute', left: 580, top: 358, width: 76, height: 76, borderRadius: 38, background: '#F5A65B', boxShadow: '0 0 34px rgba(245,166,91,0.3)'}} />
      <Obj id="pub-r" style={{position: 'absolute', left: 1264, top: 358, width: 76, height: 76, borderRadius: 38, background: '#9BD3A0', boxShadow: '0 0 34px rgba(155,211,160,0.3)'}} />

      <Obj id="nosend" style={{position: 'absolute', left: 874, top: 286, width: 172, height: 106}}>
        <svg viewBox="0 0 120 70" width={120} height={70} style={{display: 'block', margin: '0 auto'}}>
          <g stroke={C.teal} strokeWidth={7} fill="none" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="24" cy="35" r="17" />
            <path d="M41 35 H96 M78 35 V49 M90 35 V45" />
          </g>
          <line x1="8" y1="66" x2="112" y2="6" stroke={C.bad} strokeWidth={5} strokeLinecap="round" />
        </svg>
        <div style={{marginTop: 6, textAlign: 'center', fontFamily: F.sans, fontSize: 19, color: C.bad}}>never sent</div>
      </Obj>

      <Obj id="same" style={{position: 'absolute', left: 720, top: 506, width: 480, height: 84}}>
        <div style={{textAlign: 'center', fontFamily: F.mono, fontSize: 22, letterSpacing: 2.5, color: C.teal}}>SAME KEY</div>
        <div style={{position: 'relative', marginTop: 14, borderTop: `2px dashed ${C.teal}`, opacity: 0.9}} />
      </Obj>

      <Obj id="listener" style={{position: 'absolute', left: 720, top: 686, width: 480, height: 194}}>
        <div style={{textAlign: 'center', fontFamily: F.sans, fontSize: 20, color: C.quiet}}>someone on the same Wi-Fi</div>
        <div style={{
          position: 'absolute', left: 20, top: 30, width: 440, height: 148, borderRadius: 10,
          background: '#0C1626', border: `1px solid ${C.edge}`, boxShadow: '0 0 30px rgba(0,0,0,0.5)',
        }}>
          <div style={{position: 'absolute', left: 16, top: 10, fontFamily: F.mono, fontSize: 14, letterSpacing: 2, color: C.faint}}>CAPTURED</div>
          <div style={{position: 'absolute', left: 16, top: 46, width: 32, height: 32, borderRadius: 16, background: '#F5A65B'}} />
          <div style={{position: 'absolute', left: 56, top: 46, width: 32, height: 32, borderRadius: 16, background: '#9BD3A0'}} />
          <div style={{position: 'absolute', left: 104, top: 38, fontFamily: F.sans, fontSize: 34, color: C.faint}}>=</div>
          <div style={{position: 'absolute', left: 158, top: 8, fontFamily: F.display, fontSize: 78, fontWeight: 700, color: '#5E6E84', lineHeight: 1}}>?</div>
          <div style={{position: 'absolute', left: 16, top: 108, fontFamily: F.mono, fontSize: 18, color: C.faint}}>two public colours, no key</div>
          <Obj id="no" style={{position: 'absolute', left: 150, top: 14, width: 88, height: 88}}>
            <svg viewBox="0 0 88 88" width={88} height={88}>
              <path d="M18 18 L70 70 M70 18 L18 70" stroke={C.bad} strokeWidth="7" strokeLinecap="round" />
            </svg>
          </Obj>
        </div>
        <div style={{position: 'absolute', left: 0, top: 182, width: 480, height: 12, borderRadius: 6, background: '#2B3B52'}} />
      </Obj>
    </Frame>
  );
};
