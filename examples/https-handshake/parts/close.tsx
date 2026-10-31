// Scene "close": the address bar, the padlock, and the check that lands on "worked".
import {Obj} from '@visotalk/runtime';
import {Browser, C, F, Frame, Padlock} from './kit.tsx';

export const Close = () => {
  return (
    <Frame step="in the address bar" title="A closed padlock"
      keyLine="It means the handshake finished, and the channel is private.">
      <div style={{
        position: 'absolute', left: 1330, top: 170, width: 480, height: 500,
        background: 'radial-gradient(240px 240px at 50% 50%, rgba(242,180,76,0.16), rgba(242,180,76,0) 70%)',
      }} />
      <Browser x={500} y={320} w={900} h={470} address="https://yourbank.com" secure={1} />
      <Obj id="big-lock" style={{position: 'absolute', left: 1418, top: 258}}>
        <Padlock size={214} shut={1} />
      </Obj>
      <Obj id="tick" style={{position: 'absolute', left: 1578, top: 452, width: 78, height: 78}}>
        <svg viewBox="0 0 78 78" width={78} height={78}>
          <circle cx="39" cy="39" r="39" fill={C.accent} />
          <path d="M21 40 L33 52 L57 26" fill="none" stroke={C.ground} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Obj>
      <Obj id="done" style={{position: 'absolute', left: 500, top: 812, width: 900, justifyContent: 'center', height: 60, display: 'flex', alignItems: 'center', gap: 14}}>
        <span style={{width: 12, height: 12, borderRadius: 6, background: C.accent}} />
        <span style={{fontFamily: F.mono, fontSize: 21, letterSpacing: 1.5, color: C.quiet}}>TLS · encrypted channel</span>
      </Obj>
    </Frame>
  );
};
