// Scene 5 — the honest label: this is a made-up example, and no numbers are claimed.
import {useProp, Obj} from '@visotalk/runtime';
import {C, sans} from './ui.tsx';

export const Stamp = () => {
  const s = useProp('s', 0);
  return (
    <div style={{width: '100%', height: '100%', position: 'relative'}}>
      <div style={{position: 'absolute', left: 0, top: 0, fontFamily: sans, fontSize: 78, lineHeight: 1.32, fontWeight: 700, color: C.ink, letterSpacing: 1}}>
        拾记是一个<br />虚构示例
      </div>
      <Obj id="mark" style={{position: 'absolute', left: 820, top: 96, opacity: s, transform: `rotate(-8deg) scale(${0.9 + s * 0.1})`}}>
        <div style={{border: `5px solid ${C.accent}`, borderRadius: 14, padding: '16px 38px', fontFamily: sans, fontSize: 52, fontWeight: 700, color: C.accent, letterSpacing: 10}}>虚构</div>
      </Obj>
      <div style={{position: 'absolute', left: 4, top: 280, fontFamily: sans, fontSize: 31, color: C.muted, lineHeight: 1.6}}>
        只用来演示：记录工具可以怎样工作。
      </div>
    </div>
  );
};

// No numbers are claimed: two empty slots with a rule struck through them.
export const NoClaims = () => {
  const p = useProp('p', 0);
  const slot = (id: string, label: string, w: number) => (
    <Obj id={id} style={{width: w}}>
      <div style={{fontFamily: sans, fontSize: 30, letterSpacing: 4, color: C.muted, marginBottom: 14}}>{label}</div>
      <div style={{height: 92, borderBottom: `2px solid ${C.border}`, display: 'flex', alignItems: 'flex-end'}}>
        <span style={{fontFamily: sans, fontSize: 68, fontWeight: 700, color: C.faint, lineHeight: 1}}>—</span>
      </div>
      <svg width={w} height="18" viewBox={`0 0 ${w} 18`} style={{marginTop: 4}}>
        <path d={`M4 9 H${w - 4}`} stroke={C.accent} strokeWidth="6" strokeLinecap="round" strokeDasharray={w} strokeDashoffset={w * (1 - p)} />
      </svg>
    </Obj>
  );
  return (
    <div style={{width: '100%', height: '100%'}}>
      <div style={{display: 'flex', gap: 120}}>
        {slot('claim-a', '用户规模', 380)}
        {slot('claim-b', '节省时间实测', 480)}
      </div>
      <div style={{marginTop: 64, fontFamily: sans, fontSize: 42, color: C.ink, lineHeight: 1.5}}>没有数据，就不说数字。</div>
    </div>
  );
};
