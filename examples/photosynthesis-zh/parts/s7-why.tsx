import {useProp, useAsset} from '@visotalk/runtime';
import {C} from './common.tsx';

// Scene 7: why it matters. The deck's own leaf-and-sun picture on the left; on the right three
// consequences, one at a time: the air we breathe, the food we eat, the carbon drawn down.
// Props: `o2`, `food`, `carbon`.
export const WhyItMatters = () => {
  const o2 = useProp('o2', 0);
  const food = useProp('food', 0);
  const carbon = useProp('carbon', 0);
  const url = useAsset('leaf-earth');
  const row = (o: number): React.CSSProperties => ({opacity: o, transform: `translateX(${(1 - o) * 24}px)`});
  return (
    <div style={{width: '100%', height: '100%', position: 'relative', fontFamily: 'var(--vt-sans)'}}>
      <img src={url} style={{position: 'absolute', left: 0, top: 60, width: 820, height: 560, objectFit: 'cover', borderRadius: 8}} />

      <div style={{...row(o2), position: 'absolute', left: 880, top: 110}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 20}}>
          <div style={{width: 60, height: 60, borderRadius: 30, border: `5px solid ${C.water}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, color: C.water, fontWeight: 700}}>O₂</div>
          <div style={{fontSize: 50, color: C.ink, fontWeight: 700}}>你吸进的每一口氧气</div>
        </div>
        <div style={{fontSize: 30, color: C.soft, marginTop: 8, marginLeft: 80}}>几乎都来自它</div>
      </div>

      <div style={{...row(food), position: 'absolute', left: 880, top: 340}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 20}}>
          <div style={{width: 60, height: 60, borderRadius: 12, background: C.sun, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, color: '#fff'}}>饭</div>
          <div style={{fontSize: 46, color: C.ink, fontWeight: 700}}>几乎每一顿饭</div>
        </div>
        <div style={{fontSize: 30, color: C.soft, marginTop: 8, marginLeft: 80}}>都从这一步开始</div>
      </div>

      <div style={{...row(carbon), position: 'absolute', left: 880, top: 570}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 20}}>
          <div style={{width: 60, height: 60, borderRadius: 30, background: C.deep, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, color: '#fff', fontWeight: 700}}>C</div>
          <div style={{fontSize: 46, color: C.ink, fontWeight: 700}}>把碳从空气里拉下来</div>
        </div>
        <div style={{fontSize: 30, color: C.soft, marginTop: 8, marginLeft: 80}}>存进叶子和土壤</div>
      </div>
    </div>
  );
};

// Scene 8: the one line to remember, on the deck's paper, with the leaf.
export const Remember = () => {
  const s = useProp('s', 0);
  const line = useProp('line', 0);
  return (
    <div style={{width: '100%', height: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', fontFamily: 'var(--vt-sans)'}}>
      <div style={{fontSize: 40, color: C.soft, opacity: s * 0.9, letterSpacing: 6}}>记住这一句</div>
      <div style={{width: 120, height: 3, background: C.sun, marginTop: 26, opacity: s, marginBottom: 46}} />
      <div style={{fontSize: 112, color: C.ink, fontWeight: 700, letterSpacing: 4, opacity: s}}>
        叶子把<span style={{color: C.sun}}>光</span>，变成了<span style={{color: C.leaf}}>食物</span>
      </div>
      <div style={{fontSize: 34, color: C.soft, marginTop: 54, opacity: s * 0.85}}>光合作用</div>
      <div style={{position: 'absolute', bottom: 40, width: 200, height: 4, background: C.pale, opacity: line * 0.6}} />
    </div>
  );
};
