import {Obj, useProp, useAsset} from '@visotalk/runtime';
import {C} from './common.tsx';

// Scene 1: the deck's cover. The leaf picture on the right; the name of the thing on the left.
export const CoverPic = () => {
  const glow = useProp('glow', 0);
  const url = useAsset('leaf-hero');
  // the sun in the picture sits at 0.84, 0.19 of it
  return (
    <div style={{position: 'relative', width: '100%', height: '100%'}}>
      <img src={url} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover'}} />
      <Obj id="sun-glow" style={{position: 'absolute', left: '74%', top: '2%', width: '22%', height: '34%', borderRadius: '50%', background: C.sun, filter: 'blur(40px)', opacity: 0, transform: `scale(${1 + glow * 1.2})`}} />
    </div>
  );
};

export const CoverTitle = () => (
  <div style={{fontFamily: 'var(--vt-sans)', color: C.ink}}>
    <div style={{fontSize: 104, lineHeight: 1.12, fontWeight: 700, letterSpacing: 2}}>一片叶子</div>
    <div style={{fontSize: 104, lineHeight: 1.12, fontWeight: 700, color: C.deep, letterSpacing: 2}}>怎样制造食物</div>
    <div style={{width: 300, height: 3, background: C.sun, marginTop: 34, marginBottom: 6}} />
  </div>
);

export const CoverQuestion = () => (
  <div style={{display: 'flex', alignItems: 'baseline', gap: 18, fontFamily: 'var(--vt-sans)', color: C.soft}}>
    <span style={{fontSize: 50}}>它靠什么活着</span>
    <span style={{fontSize: 62, color: C.sun, fontWeight: 700}}>？</span>
  </div>
);

export const BigLight = () => {
  const s = useProp('s', 0);
  return (
    <div style={{fontFamily: 'var(--vt-sans)', color: C.leaf, fontSize: 250, lineHeight: 1, fontWeight: 700, opacity: s, transform: `translateY(${(1 - s) * 24}px)`}}>光</div>
  );
};

export const NameBlock = () => (
  <div style={{fontFamily: 'var(--vt-sans)', color: C.ink}}>
    <div style={{fontSize: 132, fontWeight: 700, color: C.deep, lineHeight: 1, letterSpacing: 4}}>光合作用</div>
    <div style={{fontSize: 44, color: C.soft, marginTop: 26}}>阳光 + 空气 + 水 → 糖</div>
  </div>
);
