import {Obj, useProp} from '@visotalk/runtime';
import {C} from './figures.tsx';

// the title on the opening frame
export const Ctrl = () => {
  const step = useProp('step', 0);
  return (
    <div style={{fontFamily: 'var(--vt-sans)', color: C.dark}}>
      <div style={{fontSize: 30, letterSpacing: 6, textTransform: 'uppercase', color: C.mute, marginBottom: 22}}>Photosynthesis</div>
      <div style={{fontSize: 104, lineHeight: 1.02, fontWeight: 700}}>
        How a leaf<br />makes food
      </div>
      <div style={{marginTop: 30, height: 6, width: 420, background: C.green, opacity: 0.35 + 0.65 * step}} />
      <div style={{marginTop: 26, fontSize: 34, color: C.teal, opacity: step}}>one line, by the end</div>
    </div>
  );
};

// the three ingredients, hung round the deck's leaf picture
const CHIP = ({label, sub, color}: any) => (
  <div style={{fontFamily: 'var(--vt-sans)'}}>
    <div style={{fontSize: 44, fontWeight: 700, color, lineHeight: 1.1}}>{label}</div>
    <div style={{fontSize: 28, color: C.mute, marginTop: 4}}>{sub}</div>
  </div>
);

export const Callouts = () => (
  <>
    <Obj id="c-co2" style={{position: 'absolute', left: 0, top: 72, width: 300}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
        <div style={{width: 74, height: 3, background: C.teal, opacity: 0.5}} />
        <CHIP label="CO₂" sub="out of the air" color={C.teal} />
      </div>
    </Obj>
    <Obj id="c-light" style={{position: 'absolute', left: 520, top: 0, width: 300}}>
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        <CHIP label="Light" sub="from the sun" color={C.amber} />
        <div style={{width: 3, height: 40, background: C.amber, opacity: 0.5, marginTop: 12}} />
      </div>
    </Obj>
    <Obj id="c-water" style={{position: 'absolute', left: 0, top: 300, width: 300}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
        <div style={{width: 74, height: 3, background: C.blue, opacity: 0.5}} />
        <CHIP label="Water" sub="up from the roots" color={C.blue} />
      </div>
    </Obj>
    <Obj id="c-o2" style={{position: 'absolute', left: 620, top: 660, width: 460}}>
      <div style={{fontFamily: 'var(--vt-sans)', fontSize: 34, color: C.green, fontWeight: 700, lineHeight: 1.2}}>and no food comes in at all</div>
    </Obj>
  </>
);
