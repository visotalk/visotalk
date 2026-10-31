// Scene "coded": one message leaves the browser readable, is locked at the edge, crosses as hex,
// and unlocks at the site. The listener below records the same hex and can only stare at it.
import {Obj, useProp} from '@visotalk/runtime';
import {Browser, C, F, Frame, Server, Wire} from './kit.tsx';

const HEX = ['8f 3a c1 7e 04 b8', '6d 22 e9 51 a0 4c', 'f3 17 5b d8 62 9e'];

export const Coded = () => {
  const locked = useProp('locked', 0);
  return (
    <Frame step="04 · the message" title="Talking in code"
      keyLine="Everything after the handshake travels encrypted.">
      <Wire y={496} x1={592} x2={1362} lit={1} />
      <Browser x={100} y={300} w={480} h={390} label="your browser" address="https://yourbank.com" secure={1} />
      <Server x={1360} y={300} w={460} h={400} active={1} />

      <Obj id="msg" style={{
        position: 'absolute', left: 360, top: 440, width: 280, height: 112, borderRadius: 12,
        background: '#132034', border: `1px solid ${locked > 0.5 ? C.cipher : C.accent}`,
        boxShadow: locked > 0.5 ? '0 0 34px rgba(143,182,214,0.18)' : '0 0 34px rgba(242,180,76,0.22)',
        padding: '14px 16px', boxSizing: 'border-box', overflow: 'hidden',
      }}>
        <div style={{opacity: 1 - locked}}>
          <div style={{fontFamily: F.mono, fontSize: 14, letterSpacing: 2, color: C.accent}}>MESSAGE</div>
          <div style={{fontFamily: F.mono, fontSize: 22, color: C.ink, marginTop: 9}}>password ••••••••</div>
        </div>
        <div style={{position: 'absolute', left: 16, top: 14, right: 16, opacity: locked}}>
          <div style={{fontFamily: F.mono, fontSize: 14, letterSpacing: 2, color: C.cipher}}>ENCRYPTED</div>
          {HEX.slice(0, 2).map((h, i) => (
            <div key={h} style={{fontFamily: F.mono, fontSize: 17, color: C.cipher, marginTop: i === 0 ? 8 : 3, opacity: 0.95}}>{h}</div>
          ))}
        </div>
      </Obj>

      <Obj id="intact" style={{
        position: 'absolute', left: 1084, top: 382, width: 300, height: 38, display: 'flex', alignItems: 'center', gap: 11,
        fontFamily: F.sans, fontSize: 22, color: C.accent,
      }}>
        <svg viewBox="0 0 24 24" width={24} height={24}>
          <circle cx="12" cy="12" r="11" fill="none" stroke={C.accent} strokeWidth="2" />
          <path d="M6.5 12.5 L10.5 16.5 L17.5 8" fill="none" stroke={C.accent} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        arrived unchanged
      </Obj>

      <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
        <Obj as="g" id="tap">
          <line x1={960} y1={498} x2={960} y2={656} stroke={C.faint} strokeWidth={2} strokeDasharray="4 5" />
          <circle cx={960} cy={498} r={6} fill={C.cipher} />
        </Obj>
      </svg>

      <Obj id="listener" style={{position: 'absolute', left: 740, top: 636, width: 460, height: 232}}>
        <div style={{textAlign: 'center', fontFamily: F.sans, fontSize: 20, color: C.quiet}}>a snoop on the same Wi-Fi</div>
        <div style={{
          position: 'absolute', left: 20, top: 30, width: 420, height: 162, borderRadius: 10,
          background: '#0C1626', border: `1px solid ${C.edge}`, boxShadow: '0 0 30px rgba(0,0,0,0.5)',
        }}>
          <div style={{position: 'absolute', left: 16, top: 11, fontFamily: F.mono, fontSize: 12, letterSpacing: 2, color: C.faint}}>RECORDED</div>
          <Obj id="recorded" style={{position: 'absolute', left: 16, top: 36, width: 250, height: 96}}>
            {HEX.map((h) => (
              <div key={h} style={{fontFamily: F.mono, fontSize: 17, color: C.cipher, marginBottom: 6}}>{h}</div>
            ))}
          </Obj>
          <Obj id="gib" style={{position: 'absolute', left: 272, top: 34, width: 120, height: 120}}>
            <div style={{fontFamily: F.display, fontSize: 76, fontWeight: 700, color: '#5E6E84', lineHeight: 1, textAlign: 'center'}}>?</div>
            <div style={{fontFamily: F.sans, fontSize: 19, color: C.cipher, textAlign: 'center', marginTop: 4}}>gibberish</div>
          </Obj>
        </div>
        <div style={{position: 'absolute', left: 0, top: 198, width: 460, height: 12, borderRadius: 6, background: '#2B3B52'}} />
      </Obj>
    </Frame>
  );
};
