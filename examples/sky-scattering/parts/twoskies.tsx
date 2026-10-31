import {useProp} from '@visotalk/runtime';

// One sky, split down the middle: the same air seen at two angles. On the left the Sun is high
// and blue reaches the eye from everywhere; on the right it sits on the horizon, its light has
// crossed far more air, and what arrives is red. `rays` lights the blue directions, `red` warms
// the right-hand sky.
export const TwoSkies = () => {
  const rays = useProp('rays', 0);
  const red = useProp('red', 0);
  return (
    <div style={{position: 'relative', width: '100%', height: '100%', overflow: 'hidden', fontFamily: 'var(--vt-sans)'}}>
      {/* left: noon */}
      <div style={{position: 'absolute', left: 0, top: 0, width: '50%', height: '100%',
        background: 'linear-gradient(180deg, #1b4c9c 0%, #3f86d4 48%, #a8cdf2 88%, #e6f2ff 100%)'}} />
      {/* right: dusk */}
      <div style={{position: 'absolute', right: 0, top: 0, width: '50%', height: '100%',
        background: 'linear-gradient(180deg, #191233 0%, #4a1f4e 30%, #a83526 66%, #f2762c 88%, #ffbf72 100%)',
        opacity: 0.35 + 0.65 * red}} />

      <div style={{position: 'absolute', left: 0, top: 0, width: '50%', height: '100%', opacity: rays}}>
        {[10, 24, 38, 52, 66, 80, 94].map((p, i) => (
          <div key={i} style={{position: 'absolute', left: `${p}%`, top: 0, width: 5, height: '100%',
            background: 'linear-gradient(180deg, rgba(160,215,255,0) 0%, rgba(190,230,255,0.9) 100%)'}} />
        ))}
      </div>

      {/* the divider and the two Suns */}
      <div style={{position: 'absolute', left: '50%', top: 0, width: 2, height: '100%', background: 'rgba(255,255,255,0.28)'}} />
      <div style={{position: 'absolute', left: '25%', top: '12%', width: 96, height: 96, marginLeft: -48, borderRadius: '50%',
        background: '#ffffff', boxShadow: '0 0 90px 30px rgba(255,255,255,0.5)'}} />
      <div style={{position: 'absolute', left: '75%', bottom: '24%', width: 110, height: 110, marginLeft: -55,
        borderRadius: '50%', background: '#ffd8a0', boxShadow: '0 0 110px 40px rgba(255,150,70,0.7)', opacity: red}} />

      <div style={{position: 'absolute', left: '25%', bottom: '7%', width: '50%', marginLeft: '-25%', textAlign: 'center',
        fontSize: 54, fontWeight: 700, color: '#ffffff', letterSpacing: 1}}>blue arrives</div>
      <div style={{position: 'absolute', left: '75%', bottom: '7%', width: '50%', marginLeft: '-25%', textAlign: 'center',
        fontSize: 54, fontWeight: 700, color: '#ffe9d2', letterSpacing: 1}}>blue does not</div>
    </div>
  );
};
