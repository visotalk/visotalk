// Scene 1 — the problem: a thought that does not survive, notes that scatter, nothing to find.
import {useProp, useTime, Obj} from '@visotalk/runtime';
import {C, sans, Note} from './ui.tsx';

const THOUGHT = '把首页推荐位砍掉试试';

export const Thought = () => (
  <div style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
    <div style={{position: 'relative', width: 1040, background: C.paper, border: `2px solid ${C.border}`, borderRadius: 6, padding: '48px 60px 54px', transform: 'rotate(-1.4deg)', boxShadow: '0 26px 60px rgba(80,60,20,0.13)'}}>
      <div style={{position: 'absolute', top: -13, left: '50%', marginLeft: -66, width: 132, height: 26, background: 'rgba(194,87,31,0.28)', borderRadius: 3, transform: 'rotate(2deg)'}} />
      <div style={{fontFamily: sans, fontSize: 26, letterSpacing: 7, color: C.faint, marginBottom: 20}}>刚才想到的</div>
      <div style={{fontFamily: sans, fontSize: 70, lineHeight: 1.25, color: C.ink, fontWeight: 700, letterSpacing: 1}}>{THOUGHT}</div>
    </div>
  </div>
);

const Bubble = ({text}: {text: string}) => (
  <div style={{background: '#EAEEF5', border: `2px solid #D3DCEA`, borderRadius: 18, borderBottomLeftRadius: 4, padding: '16px 20px', fontFamily: sans, fontSize: 33, color: C.ink}}>{text}</div>
);

export const Places = () => {
  const dim = useProp('dim', 0);
  return (
    <div style={{position: 'relative', width: '100%', height: '100%', opacity: 1 - dim * 0.62}}>
      <Obj id="c-chat" style={{position: 'absolute', left: 20, top: 80, width: 520}}>
        <div style={{fontFamily: sans, fontSize: 28, color: C.muted, marginBottom: 12, letterSpacing: 3}}>聊天窗口</div>
        <Bubble text={THOUGHT} />
        <div style={{marginTop: 8, marginLeft: 10, fontFamily: sans, fontSize: 25, color: C.faint}}>发给自己</div>
      </Obj>

      <Obj id="c-memo" style={{position: 'absolute', left: 520, top: 10, width: 520, transform: 'rotate(1.6deg)'}}>
        <div style={{fontFamily: sans, fontSize: 28, color: C.muted, marginBottom: 12, letterSpacing: 3}}>备忘录</div>
        <Note text={THOUGHT} w={520} size={33} />
        <div style={{marginTop: 8, fontFamily: sans, fontSize: 25, color: C.faint}}>未命名 · 好多条</div>
      </Obj>

      <Obj id="c-sticky" style={{position: 'absolute', left: 1010, top: 150, width: 470, transform: 'rotate(-3deg)'}}>
        <div style={{fontFamily: sans, fontSize: 28, color: C.muted, marginBottom: 12, letterSpacing: 3}}>便利贴</div>
        <div style={{background: '#F6E4A2', boxShadow: '0 12px 26px rgba(120,90,20,0.16)', padding: '26px 28px 34px', fontFamily: sans, fontSize: 33, lineHeight: 1.4, color: '#3A3120'}}>{THOUGHT}</div>
        <div style={{marginTop: 8, fontFamily: sans, fontSize: 25, color: C.faint}}>贴在显示器边</div>
      </Obj>

      <div style={{position: 'absolute', left: 1440, top: 30, fontFamily: sans, fontSize: 100, color: C.faint, opacity: 0.65}}>?</div>
    </div>
  );
};

// The search that comes too late: a field, a blinking caret, nothing found.
export const LateSearch = () => {
  const t = useTime();
  const on = Math.floor(t * 1.7) % 2 === 0 ? 1 : 0;
  return (
    <div style={{width: '100%', height: '100%'}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 20, height: 92, boxSizing: 'border-box', border: `2px solid ${C.border}`, borderRadius: 46, background: C.paper, padding: '0 32px', boxShadow: '0 10px 30px rgba(80,60,20,0.07)'}}>
        <svg width="32" height="32" viewBox="0 0 34 34" style={{flex: 'none'}}>
          <circle cx="14" cy="14" r="10" fill="none" stroke={C.faint} strokeWidth="3" />
          <path d="M22 22 L31 31" stroke={C.faint} strokeWidth="3" strokeLinecap="round" />
        </svg>
        <span style={{fontFamily: sans, fontSize: 29, color: C.faint}}>想找回来，写在哪里了？</span>
        <span style={{width: 3, height: 38, background: C.accent, opacity: on}} />
      </div>
      <Obj id="q-empty" style={{marginTop: 18, marginLeft: 36, fontFamily: sans, fontSize: 25, color: C.muted, letterSpacing: 2}}>
        搜不到 —— 它们散在三个地方
      </Obj>
    </div>
  );
};
