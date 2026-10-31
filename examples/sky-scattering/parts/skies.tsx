import {Obj, useProp} from '@visotalk/runtime';

// The sky: a day gradient, a dusk gradient laid over it, and a wash of black that drains the
// colour out. Two numbers drive it: `phase` (how far toward dusk) and `grey` (how far drained).
// A cross-fade of two real gradients rather than a mix of three colours, so the sunset keeps
// its deep orange band instead of turning mauve on the way.
const DAY = 'linear-gradient(180deg, #2a6fc4 0%, #4b8fd6 38%, #8fbdf0 72%, #cfe6ff 100%)';
const DUSK = 'linear-gradient(180deg, #24175e 0%, #6b2560 26%, #c43a24 62%, #f2762c 82%, #ffb45e 100%)';

export const SkyPanel = () => {
  const phase = useProp('phase', 0);
  const grey = useProp('grey', 0);
  return (
    <div style={{position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: DAY}}>
      <div style={{position: 'absolute', inset: 0, background: DUSK, opacity: phase}} />
      <div style={{position: 'absolute', inset: 0, background: '#000000', opacity: grey * 0.82}} />
    </div>
  );
};

// The Sun itself: plain white, and it stays white whichever sky is behind it.
export const SunDisc = () => (
  <div style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
    <Obj id="disc" style={{
      width: 170, height: 170, borderRadius: '50%',
      background: 'radial-gradient(circle, #ffffff 52%, rgba(255,255,255,0.30) 74%, rgba(255,255,255,0) 100%)',
    }} />
  </div>
);
