// Scene "knock": the two ends on the link; the packets exchange on "agree", and the exchange is named
// (a bracket, the wire warming) on "handshake".
import {Obj, useProp} from '@visotalk/runtime';
import {Browser, C, F, Frame, Server, Wire} from './kit.tsx';

const Packet = ({id, left, top, text}: {id: string; left: number; top: number; text: string}) => (
  <Obj id={id} style={{
    position: 'absolute', left, top, width: 204, height: 56, borderRadius: 28,
    background: '#142135', border: `1px solid ${C.accent}`, display: 'flex', alignItems: 'center',
    justifyContent: 'center', gap: 11, fontFamily: F.mono, fontSize: 22, color: C.ink,
    boxShadow: '0 0 28px rgba(242,180,76,0.2)',
  }}>
    <span style={{width: 9, height: 9, borderRadius: 5, background: C.accent}} />
    {text}
  </Obj>
);

export const Knock = () => {
  const lit = useProp('lit', 0);
  return (
    <Frame step="01 · the handshake" title="A short exchange"
      keyLine="Nothing private is sent until both ends agree how to talk.">
      <Wire y={524} x1={662} x2={1412} lit={lit} />
      <Browser x={120} y={320} w={520} h={400} label="your browser" address="https://yourbank.com" />
      <Server x={1420} y={300} w={380} h={470} active={lit} />
      <Packet id="hello" left={648} top={478} text="client hello" />
      <Packet id="reply" left={1206} top={548} text="server hello" />
      <Obj id="hs-bracket" style={{position: 'absolute', left: 686, top: 398, width: 700, height: 80}}>
        <div style={{textAlign: 'center', fontFamily: F.mono, fontSize: 27, color: C.accent, letterSpacing: 1}}>TLS handshake</div>
        <div style={{position: 'relative', marginTop: 15, height: 2, background: C.accent, opacity: 0.9}}>
          <span style={{position: 'absolute', left: 0, top: -7, width: 2, height: 16, background: C.accent}} />
          <span style={{position: 'absolute', right: 0, top: -7, width: 2, height: 16, background: C.accent}} />
        </div>
      </Obj>
    </Frame>
  );
};
