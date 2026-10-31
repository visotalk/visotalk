// Scene 6 — one action: the idea written down, one tag added.
import {useProp} from '@visotalk/runtime';
import {C, sans, Tag} from './ui.tsx';

const SENTENCE = '明天试试把入口放小一点';

export const Call = () => {
  const chars = useProp('chars', 0);
  const tag = useProp('tag', 0);
  const shown = SENTENCE.slice(0, Math.round(chars));
  return (
    <div style={{width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 40}}>
      <div style={{fontFamily: sans, fontSize: 30, letterSpacing: 6, color: C.muted}}>今晚的第一个想法</div>
      <div style={{background: C.paper, border: `2px solid ${C.border}`, borderRadius: 20, padding: '46px 52px', boxShadow: '0 24px 60px rgba(80,60,20,0.12)'}}>
        <div style={{display: 'flex', alignItems: 'center', minHeight: 92}}>
          <span style={{fontFamily: sans, fontSize: 62, color: shown ? C.ink : C.faint, letterSpacing: 1, lineHeight: 1.2}}>{shown || '写一句话'}</span>
          <span style={{width: 4, height: 64, marginLeft: 4, background: C.accent}} />
        </div>
        <div style={{display: 'flex', gap: 12, marginTop: 26, height: 58, alignItems: 'center'}}>
          <div style={{opacity: tag, transform: `translateY(${(1 - tag) * 10}px)`}}>
            <Tag label="灵感" color={C.accent} size={27} />
          </div>
          <div style={{opacity: 1 - tag, fontFamily: sans, fontSize: 25, color: C.faint, letterSpacing: 1}}>再加一个标签</div>
        </div>
      </div>
    </div>
  );
};
