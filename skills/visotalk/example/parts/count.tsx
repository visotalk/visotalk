import {Obj, useProp} from '@visotalk/runtime';
import {C, F, Frame, T} from './kit.tsx';

const RETURNS = [1835, 1910, 1986, 2061];

// Scene "return": the frame from the kit; in the panel a number that counts up (the document tweens `value`)
// and the years of its returns, which enter one after another (a stagger in doc.tsx).
export const Return = () => {
  const value = useProp('value', 0);
  return (
    <Frame kicker="A periodic comet" title="Halley's Comet" keyLine="It comes back to the inner Solar System, again and again.">
      <div style={{position: 'absolute', left: 80, top: 90, display: 'flex', alignItems: 'baseline', gap: 28, fontFamily: F.sans}}>
        <span style={{...T.figure, color: C.accent}}>{Math.round(value)}</span>
        <span style={{...T.label, fontSize: 64, color: C.quiet}}>years</span>
      </div>
      <div style={{position: 'absolute', left: 80, right: 80, top: 450, height: 2, background: C.edge}} />
      <div style={{position: 'absolute', left: 80, right: 80, top: 420, display: 'flex', justifyContent: 'space-between'}}>
        {RETURNS.map((y, i) => (
          <Obj key={y} id={`y${i}`} style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22}}>
            <span style={{width: 18, height: 18, marginTop: 22, borderRadius: 9, background: C.accent, boxShadow: `0 0 18px ${C.accent}`}} />
            <span style={{...T.label, fontFamily: F.mono, color: C.ink}}>{y}</span>
          </Obj>
        ))}
      </div>
      <Obj id="note" style={{position: 'absolute', left: 80, top: 600, ...T.label, fontFamily: F.sans, color: C.quiet}}>
        Predicted in 1705 · seen again in 1758
      </Obj>
    </Frame>
  );
};
