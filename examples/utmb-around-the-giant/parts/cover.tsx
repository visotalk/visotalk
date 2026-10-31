import {Obj, useAsset, useProp} from '@visotalk/runtime';
import {C, F, T} from './kit.tsx';

// Scene "place": the cover is a real frame of the race above the Chamonix valley. The photo drifts in slowly; the altitude
// bracket on the right is the one figure the first line gives, and the "since 2003" tag lands on the second line.
export const Cover = () => {
  const px = useProp('px', 62);
  const py = useProp('py', 42);
  const photo = useAsset('cover-photo');
  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden', background: C.ground}}>
      <img src={photo} alt="" style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
        objectPosition: `${px}% ${py}%`,
      }} />
      <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(8,13,17,0.94) 0%, rgba(8,13,17,0.72) 30%, rgba(8,13,17,0.16) 58%, rgba(8,13,17,0.02) 78%, rgba(8,13,17,0.42) 100%)'}} />
      <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(8,13,17,0.88) 0%, rgba(8,13,17,0.15) 26%, transparent 46%)'}} />

      <div style={{position: 'absolute', left: 88, top: 96, width: 940}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 15, marginBottom: 22}}>
          <span style={{width: 4, height: 22, background: C.accent}} />
          <span style={{...T.kicker, fontFamily: F.mono, color: C.accent}}>CHAMONIX · FRENCH ALPS</span>
        </div>
        <div style={{fontFamily: F.display, fontWeight: 800, fontSize: 224, lineHeight: 0.8, color: C.ink, letterSpacing: 2}}>UTMB</div>
        <div style={{fontFamily: F.sans, fontWeight: 500, fontSize: 44, color: C.ink, marginTop: 30, letterSpacing: 0.4}}>Ultra-Trail du Mont-Blanc</div>
        <div style={{fontFamily: F.sans, fontSize: 29, color: C.quiet, marginTop: 16, maxWidth: 560}}>One loop. Three countries. Ten thousand metres of climbing.</div>
        <Obj id="since" style={{display: 'inline-flex', alignItems: 'center', gap: 12, marginTop: 30, padding: '9px 16px', border: `1px solid ${C.accent}`, borderRadius: 3}}>
          <span style={{width: 7, height: 7, background: C.accent}} />
          <span style={{fontFamily: F.mono, fontSize: 22, fontWeight: 700, letterSpacing: 3, color: C.accent}}>SINCE 2003</span>
        </Obj>
      </div>

      <Obj id="alt" style={{position: 'absolute', left: 1460, top: 176, width: 300, height: 520}}>
        <div style={{position: 'absolute', left: 240, top: 38, width: 2, height: 388, background: 'rgba(241,237,230,0.55)'}} />
        <div style={{position: 'absolute', left: 240, top: 38, width: 26, height: 2, background: C.accent}} />
        <div style={{position: 'absolute', left: 240, top: 424, width: 26, height: 2, background: 'rgba(241,237,230,0.55)'}} />
        <div style={{position: 'absolute', left: 0, top: 0, width: 250, textAlign: 'right'}}>
          <div style={{fontFamily: F.mono, fontSize: 20, letterSpacing: 3, color: C.quiet}}>MONT BLANC</div>
          <div style={{fontFamily: F.display, fontWeight: 800, fontSize: 58, lineHeight: 1.05, color: C.accent}}>4,808 m</div>
        </div>
        <div style={{position: 'absolute', left: 0, top: 396, width: 250, textAlign: 'right'}}>
          <div style={{fontFamily: F.display, fontWeight: 800, fontSize: 46, lineHeight: 1.05, color: C.ink}}>1,035 m</div>
          <div style={{fontFamily: F.mono, fontSize: 20, letterSpacing: 3, color: C.quiet}}>CHAMONIX</div>
        </div>
      </Obj>

      <div style={{position: 'absolute', left: 88, bottom: 44, fontFamily: F.sans, fontSize: 21, color: 'rgba(241,237,230,0.62)', letterSpacing: 0.3}}>
        The UTMB course above the Chamonix valley · photo: Anthospace / Wikimedia Commons, CC BY-SA 4.0
      </div>
    </div>
  );
};
