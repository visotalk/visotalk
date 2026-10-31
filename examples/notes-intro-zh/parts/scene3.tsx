// Scene 3 — tags: two chips on the note, then notes with the same tag gather into one stack.
import {useProp, Obj} from '@visotalk/runtime';
import {C, sans, Tag} from './ui.tsx';

const SENTENCE = '把首页推荐位砍掉试试';

export const Tagging = () => {
  const p = useProp('p', 0);
  const top = useProp('top', 0);
  return (
    <div style={{width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative'}}>
      <div style={{width: 940, boxSizing: 'border-box', background: C.paper, border: `2px solid ${C.border}`, borderRadius: 20, padding: '54px 60px 46px', boxShadow: '0 22px 50px rgba(80,60,20,0.12)', transform: `translateY(${top * -36}px)`}}>
        <div style={{fontFamily: sans, fontSize: 62, lineHeight: 1.4, color: C.ink, letterSpacing: 0.5}}>{SENTENCE}</div>
        <div style={{display: 'flex', gap: 14, marginTop: 30, height: 66}}>
          <div style={{opacity: p, transform: `translateY(${(1 - p) * 8}px)`}}><Tag label="产品" color={C.blue} size={36} /></div>
          <div style={{opacity: p, transform: `translateY(${(1 - p) * 8}px)`}}><Tag label="灵感" color={C.accent} size={36} /></div>
        </div>
      </div>
      <div style={{marginTop: 34, marginLeft: 4, fontFamily: sans, fontSize: 32, color: C.muted, letterSpacing: 2, opacity: p}}>两个标签，就是分类</div>
    </div>
  );
};

// Loose notes on the page; at l8 the three 产品 notes slide into one stack, the 灵感 note steps aside.
const PILE = [
  {text: '首页推荐位砍掉试试', tag: '产品', from: [560, 40], to: [790, 0]},
  {text: '新用户第一次打开看到什么', tag: '产品', from: [840, 180], to: [790, 156]},
  {text: '标签是不是该自动猜', tag: '产品', from: [520, 350], to: [790, 312]},
  {text: '标题用动词开头', tag: '灵感', from: [900, 410], to: [30, 392]},
];

export const Pile = () => {
  const spread = useProp('spread', 0); // 1 = loose, 0 = gathered
  const count = useProp('count', 0);
  return (
    <div style={{width: '100%', height: '100%', position: 'relative'}}>
      {PILE.map((n, i) => {
        const isProd = n.tag === '产品';
        const x = n.to[0] + (n.from[0] - n.to[0]) * spread;
        const y = n.to[1] + (n.from[1] - n.to[1]) * spread;
        return (
          <Obj key={i} id={`pile-${i}`} style={{position: 'absolute', left: x, top: y, width: 560}}>
            <div style={{background: C.paper, border: `2px solid ${isProd ? C.blue + '40' : C.border}`, borderRadius: 14, padding: '20px 24px 22px', boxShadow: isProd ? '0 12px 26px rgba(80,60,20,0.10)' : '0 10px 22px rgba(80,60,20,0.05)', opacity: isProd ? 1 : 0.8}}>
              <div style={{fontFamily: sans, fontSize: 29, lineHeight: 1.35, color: C.ink}}>{n.text}</div>
              <div style={{marginTop: 12}}><Tag label={n.tag} color={isProd ? C.blue : C.accent} size={21} /></div>
            </div>
          </Obj>
        );
      })}
      <Obj id="pile-rail" style={{position: 'absolute', left: 752, top: 0, width: 5, height: 500, borderRadius: 3, background: C.blue, opacity: count * 0.3}} />
      <Obj id="pile-count" style={{position: 'absolute', left: 34, top: 24, opacity: count}}>
        <div style={{fontFamily: sans, fontSize: 28, letterSpacing: 5, color: C.muted}}>「产品」下</div>
        <div style={{fontFamily: sans, fontSize: 120, lineHeight: 1.05, color: C.blue, fontWeight: 700}}>3<span style={{fontSize: 40, color: C.muted, fontWeight: 400, marginLeft: 10}}>条</span></div>
      </Obj>
    </div>
  );
};
