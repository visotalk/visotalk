// Scene "certificate": a paper certificate comes out of the site; three checks light on three words;
// on "forged" it becomes a bad copy and on "stops" the link is cut.
import {Obj, useProp} from '@visotalk/runtime';
import {Browser, C, F, Frame, Server, Wire} from './kit.tsx';

const Check = ({id, x, y, bad}: {id: string; x: number; y: number; bad: number}) => (
  <Obj id={id} style={{position: 'absolute', left: x + 4, top: y + 4, width: 30, height: 30}}>
    <svg viewBox="0 0 30 30" width={30} height={30}>
      <circle cx="15" cy="15" r="15" fill={bad > 0.5 ? C.bad : C.accent} />
      <path d="M8.5 15.5 L13 20 L21.5 10.5" fill="none" stroke={C.paperInk} strokeWidth="3.4"
        strokeLinecap="round" strokeLinejoin="round" opacity={1 - bad} />
      <path d="M9.5 9.5 L20.5 20.5 M20.5 9.5 L9.5 20.5" fill="none" stroke={C.paperInk} strokeWidth="3.4"
        strokeLinecap="round" opacity={bad} />
    </svg>
  </Obj>
);

const Ring = ({x, y}: {x: number; y: number}) => (
  <div style={{position: 'absolute', left: x, top: y, width: 38, height: 38, borderRadius: 19, border: '2px solid #C9BFA9'}} />
);

export const Cert = () => {
  const bad = useProp('bad', 0);
  const broken = useProp('broken', 0);
  return (
    <Frame step="02 · the certificate" title="Checking the passport"
      keyLine="A domain, a key, and someone who vouches for both.">
      <Wire y={480} x1={410} x2={1522} lit={1} broken={broken} breakAt={0.06} />
      <Browser x={90} y={330} w={360} h={330} label="your browser" address="https://yourbank.com" bad={bad} />
      <Server x={1518} y={330} w={330} h={350} active={1} />

      <Obj id="card" style={{
        position: 'absolute', left: 560, top: 300, width: 800, height: 470, borderRadius: 6,
        background: C.paper, overflow: 'hidden',
        border: `1px solid ${bad > 0.3 ? C.bad : '#D8CDB6'}`,
        boxShadow: '0 34px 90px rgba(0,0,0,0.5)',
      }}>
        <div style={{position: 'absolute', left: 40, top: 24, fontFamily: F.mono, fontSize: 17, letterSpacing: 4.5, color: C.paperQuiet}}>CERTIFICATE</div>
        <div style={{position: 'absolute', right: 40, top: 24, fontFamily: F.mono, fontSize: 15, letterSpacing: 2, color: C.paperQuiet}}>X.509</div>

        <div style={{position: 'absolute', left: 40, top: 58, fontFamily: F.mono, fontSize: 50, fontWeight: 700, color: C.paperInk, opacity: 1 - bad}}>yourbank.com</div>
        <div style={{position: 'absolute', left: 40, top: 58, fontFamily: F.mono, fontSize: 44, fontWeight: 700, color: C.bad, opacity: bad}}>yourbank-secure.com</div>
        <div style={{position: 'absolute', left: 40, top: 126, fontFamily: F.sans, fontSize: 17, color: C.paperQuiet}}>the name the certificate is for</div>

        <div style={{position: 'absolute', left: 40, top: 170, right: 40, height: 1, background: '#D8CDB6'}} />

        <div style={{position: 'absolute', left: 40, top: 190, fontFamily: F.mono, fontSize: 15, letterSpacing: 2.5, color: C.paperQuiet}}>ISSUED BY</div>
        <div style={{position: 'absolute', left: 40, top: 212, fontFamily: F.sans, fontSize: 27, color: C.paperInk, opacity: 1 - bad}}>Example Certificate Authority</div>
        <div style={{position: 'absolute', left: 40, top: 212, fontFamily: F.sans, fontSize: 27, color: C.bad, opacity: bad}}>Unknown signer</div>

        <div style={{position: 'absolute', left: 40, top: 272, fontFamily: F.mono, fontSize: 15, letterSpacing: 2.5, color: C.paperQuiet}}>VALID</div>
        <div style={{position: 'absolute', left: 40, top: 294, fontFamily: F.sans, fontSize: 27, color: C.paperInk, opacity: 1 - bad}}>1 Oct 2025 — 1 Oct 2026</div>
        <div style={{position: 'absolute', left: 40, top: 294, fontFamily: F.sans, fontSize: 27, color: C.bad, opacity: bad}}>outside its valid dates</div>

        <svg width={800} height={470} style={{position: 'absolute', left: 0, top: 0}}>
          <g opacity={1 - bad}>
            <circle cx={680} cy={392} r={62} fill="none" stroke={C.accent} strokeWidth={2} />
            <circle cx={680} cy={392} r={54} fill="none" stroke={C.accent} strokeWidth={1} strokeDasharray="2 6" />
            <text x={680} y={382} textAnchor="middle" fontFamily="var(--vt-mono)" fontSize={15} fill={C.accent} letterSpacing={2}>SIGNED</text>
            <path d="M660 396 l14 14 l28 -30" fill="none" stroke={C.accent} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
          </g>
          <g opacity={bad}>
            <circle cx={680} cy={392} r={62} fill="none" stroke={C.bad} strokeWidth={2} />
            <path d="M656 368 L704 416 M704 368 L656 416" stroke={C.bad} strokeWidth={6} strokeLinecap="round" />
          </g>
        </svg>

        <Ring x={722} y={64} /><Check id="check-name" x={722} y={64} bad={bad} />
        <Ring x={722} y={196} /><Check id="check-sig" x={722} y={196} bad={bad} />
        <Ring x={722} y={286} /><Check id="check-dates" x={722} y={286} bad={bad} />

        <div style={{
          position: 'absolute', left: 56, top: 348, padding: '12px 24px', border: `5px solid ${C.bad}`, borderRadius: 8,
          color: C.bad, fontFamily: F.sans, fontWeight: 700, fontSize: 44, letterSpacing: 6,
          transform: `rotate(-13deg) scale(${0.86 + bad * 0.14})`, transformOrigin: 'center', opacity: bad * 0.92,
        }}>FORGED</div>
      </Obj>
    </Frame>
  );
};
