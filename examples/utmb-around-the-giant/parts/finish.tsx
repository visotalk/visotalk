import {Obj, useAsset, useProp} from '@visotalk/runtime';
import {C, F} from './kit.tsx';

// Scene "finish": the closing photograph. The title arrives on the line about the valley opening; the tagline is the last
// thing said, held over the picture.
export const Finish = () => {
  const px = useProp('px', 58);
  const py = useProp('py', 48);
  const photo = useAsset('finish-photo');
  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden', background: C.ground}}>
      <img src={photo} alt="" style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
        objectPosition: `${px}% ${py}%`,
      }} />
      <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(8,13,17,0.92) 0%, rgba(8,13,17,0.66) 34%, rgba(8,13,17,0.1) 66%, rgba(8,13,17,0.02) 100%)'}} />
      <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(8,13,17,0.9) 0%, rgba(8,13,17,0.2) 28%, transparent 50%)'}} />

      <div style={{position: 'absolute', left: 88, top: 372, width: 980}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 15, marginBottom: 20}}>
          <span style={{width: 4, height: 21, background: C.accent}} />
          <span style={{fontFamily: F.mono, fontSize: 21, fontWeight: 700, letterSpacing: 5.5, color: C.accent}}>THE FINISH</span>
        </div>
        <Obj id="title" style={{fontFamily: F.display, fontWeight: 800, fontSize: 116, lineHeight: 0.92, color: C.ink}}>The mountain waits.</Obj>
        <Obj id="tag" style={{fontFamily: F.mono, fontSize: 24, fontWeight: 700, letterSpacing: 4, color: C.accent, marginTop: 34}}>ONE LOOP · THREE COUNTRIES · ONE LONG NIGHT</Obj>
      </div>

      <div style={{position: 'absolute', left: 88, bottom: 40, fontFamily: F.sans, fontSize: 21, color: 'rgba(241,237,230,0.62)'}}>
        Mont Blanc from la Flégère · photo: Ximonic, Simo Räsänen / Wikimedia Commons, CC BY-SA 3.0
      </div>
    </div>
  );
};
