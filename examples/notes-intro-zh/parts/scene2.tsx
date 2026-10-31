// Scene 2 — capture: one line, type, Enter. No folders to pick first.
import {useProp, Obj} from '@visotalk/runtime';
import {C, sans} from './ui.tsx';

const SENTENCE = '把首页推荐位砍掉试试';

export const Composer = () => {
  const chars = useProp('chars', 0);
  const press = useProp('press', 0);
  const t = useProp('caret', 1);
  const shown = SENTENCE.slice(0, Math.round(chars));
  return (
    <div style={{width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 30}}>
      <div style={{position: 'relative', background: C.paper, border: `2px solid ${C.border}`, borderRadius: 20, padding: '46px 52px', boxShadow: '0 24px 60px rgba(80,60,20,0.12)'}}>
        <div style={{fontFamily: sans, fontSize: 25, letterSpacing: 6, color: C.faint, marginBottom: 20}}>拾记</div>
        <div style={{display: 'flex', alignItems: 'center', minHeight: 96}}>
          <span style={{fontFamily: sans, fontSize: 60, lineHeight: 1.2, color: shown ? C.ink : C.faint, fontWeight: shown ? 500 : 400, letterSpacing: 1}}>
            {shown || '写点什么…'}
          </span>
          <span style={{width: 4, height: 66, marginLeft: 4, background: C.accent, opacity: t}} />
        </div>
      </div>

      <div style={{display: 'flex', alignItems: 'center', gap: 26}}>
        <Obj id="enter-key" style={{width: 210, height: 88, borderRadius: 16, background: C.ink, color: '#FFFDF6', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, fontFamily: sans, fontSize: 30, transform: `translateY(${press * 6}px)`, boxShadow: `0 ${10 - press * 6}px 0 #0E0C08, 0 ${16 - press * 4}px 24px rgba(0,0,0,0.18)`}}>
          回车 ⏎
        </Obj>
        <span style={{fontFamily: sans, fontSize: 30, color: C.muted, opacity: press}}>已记下</span>
      </div>
    </div>
  );
};

// Two things you are not asked to do: pick a folder, or pick a category.
export const Folders = () => {
  const strike = useProp('strike', 0);
  const fade = useProp('fade', 1);
  const chip = (label: string) => (
    <div style={{display: 'flex', alignItems: 'center', gap: 14, padding: '20px 32px', borderRadius: 14, background: '#EFE9DA', border: `2px dashed ${C.faint}`, fontFamily: sans, fontSize: 34, color: C.muted}}>
      <svg width="36" height="30" viewBox="0 0 30 26"><path d="M1 4 h10 l3 4 h15 v17 h-28z" fill="none" stroke={C.faint} strokeWidth="2" /></svg>
      {label}
    </div>
  );
  return (
    <div style={{width: '100%', height: '100%', position: 'relative', opacity: fade}}>
      <div style={{display: 'flex', gap: 56}}>
        {chip('先选文件夹')}
        {chip('先想好分类')}
      </div>
      <svg width="640" height="88" viewBox="0 0 640 88" style={{position: 'absolute', left: 5, top: 17}}>
        <path d="M4 44 C 150 12, 470 76, 630 40" fill="none" stroke={C.accent} strokeWidth="7" strokeLinecap="round" strokeDasharray="660" strokeDashoffset={660 * (1 - strike)} />
      </svg>
    </div>
  );
};
