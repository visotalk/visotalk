// Scene "cover": the title, and a padlock that clicks shut on the first mention of it. Frame 0 is the poster.
import {Obj, useProp} from '@visotalk/runtime';
import {C, F, Padlock, Ground} from './kit.tsx';

export const Cover = () => {
  const shut = useProp('shut', 0);
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <Ground warm={1} />
      <div style={{
        position: 'absolute', left: 1230, top: 120, width: 660, height: 760,
        background: `radial-gradient(330px 330px at 50% 52%, rgba(242,180,76,0.15), rgba(242,180,76,0) 70%)`,
      }} />
      <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0, opacity: 0.5}}>
        <circle cx={1560} cy={505} r={250} fill="none" stroke={C.edge} strokeWidth={1.5} />
        <circle cx={1560} cy={505} r={312} fill="none" stroke={C.edge} strokeWidth={1} strokeDasharray="2 12" />
        {[0, 1, 2, 3].map((i) => (
          <line key={i} x1={1560 + 250 * Math.cos(i * 1.57)} y1={505 + 250 * Math.sin(i * 1.57)}
            x2={1560 + 286 * Math.cos(i * 1.57)} y2={505 + 286 * Math.sin(i * 1.57)} stroke={C.edge} strokeWidth={2} />
        ))}
      </svg>
      <div style={{position: 'absolute', left: 121, top: 168, display: 'flex', alignItems: 'center', gap: 18}}>
        <span style={{width: 46, height: 3, background: C.accent, borderRadius: 2}} />
        <span style={{...kitKicker, fontFamily: F.sans, color: C.accent}}>A plain-english explainer</span>
      </div>
      <div style={{position: 'absolute', left: 118, top: 216, width: 1080, fontFamily: F.display, fontWeight: 700, fontSize: 104, lineHeight: 1.04, letterSpacing: -2.6, color: C.ink}}>
        What happens<br />when a browser<br />opens an HTTPS site
      </div>
      <div style={{position: 'absolute', left: 122, top: 588, fontFamily: F.sans, fontSize: 33, color: C.quiet}}>
        The TLS handshake, in plain English.
      </div>
      <Obj id="cover-lock" style={{position: 'absolute', left: 1340, top: 232}}>
        <Padlock size={440} shut={shut} />
      </Obj>
    </div>
  );
};

const kitKicker = {fontSize: 21, fontWeight: 700, letterSpacing: 5.5, textTransform: 'uppercase' as const};
