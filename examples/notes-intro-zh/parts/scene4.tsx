// Scene 4 — find it again: one remembered word, typed in, the note returns; tag and keyword both reach it.
import {useProp, Obj} from '@visotalk/runtime';
import {C, sans, Tag} from './ui.tsx';

const NOTE = '把首页推荐位砍掉试试';
const WORD = '推荐位';

export const Recall = () => {
  const kw = useProp('kw', 0);      // 0..1: the word has flown into the field
  const result = useProp('result', 0); // the note comes back
  const field = useProp('field', 0);
  const before = NOTE.slice(0, NOTE.indexOf(WORD));
  const after = NOTE.slice(NOTE.indexOf(WORD) + WORD.length);
  return (
    <div style={{width: '100%', height: '100%', position: 'relative'}}>
      {/* the search field */}
      <div style={{position: 'absolute', left: 130, top: 30, width: 1200, height: 96, boxSizing: 'border-box', border: `2px solid ${C.border}`, borderRadius: 48, background: C.paper, display: 'flex', alignItems: 'center', gap: 20, padding: '0 32px', opacity: field, boxShadow: '0 10px 30px rgba(80,60,20,0.07)'}}>
        <svg width="32" height="32" viewBox="0 0 34 34" style={{flex: 'none'}}>
          <circle cx="14" cy="14" r="10" fill="none" stroke={C.faint} strokeWidth="3" />
          <path d="M22 22 L31 31" stroke={C.faint} strokeWidth="3" strokeLinecap="round" />
        </svg>
        <span style={{fontFamily: sans, fontSize: 34, color: kw > 0.5 ? C.ink : C.faint, letterSpacing: 1}}>{kw > 0.5 ? WORD : '搜索笔记'}</span>
        <span style={{width: 3, height: 40, background: C.accent, opacity: kw > 0.5 && result < 0.1 ? 1 : 0}} />
      </div>

      {/* the one remembered word, before it goes in */}
      <Obj id="qword" style={{position: 'absolute', left: 420, top: 330}}>
        <div style={{fontFamily: sans, fontSize: 132, lineHeight: 1, fontWeight: 700, color: C.accent, letterSpacing: 4, opacity: 1 - kw}}>{WORD}</div>
      </Obj>

      {/* the note it brings back */}
      <Obj id="hit" style={{position: 'absolute', left: 170, top: 230, width: 1120, opacity: result}}>
        <div style={{background: C.paper, border: `2px solid ${C.accent}55`, borderLeft: `8px solid ${C.accent}`, borderRadius: 18, padding: '38px 44px 34px', boxShadow: '0 22px 50px rgba(80,60,20,0.13)'}}>
          <div style={{fontFamily: sans, fontSize: 56, lineHeight: 1.4, color: C.ink}}>
            {before}<span style={{background: 'rgba(194,87,31,0.18)', color: C.accent, fontWeight: 700, padding: '0 4px', borderRadius: 4}}>{WORD}</span>{after}
          </div>
          <div style={{marginTop: 20, display: 'flex', gap: 12}}>
            <Tag label="产品" color={C.blue} size={29} />
            <Tag label="灵感" color={C.accent} size={29} />
          </div>
        </div>
      </Obj>
    </div>
  );
};

// Two routes into the same note: the tag you gave it, the word you remember.
export const Paths = () => {
  const p = useProp('p', 0);
  return (
    <div style={{width: '100%', height: '100%', position: 'relative'}}>
      <svg width="1120" height="320" viewBox="0 0 1120 320" style={{position: 'absolute', left: 0, top: 0}}>
        <path d="M340 62 C 490 62, 560 160, 680 160" fill="none" stroke={C.blue} strokeWidth="4" strokeDasharray="360" strokeDashoffset={360 * (1 - p)} />
        <path d="M360 258 C 500 258, 570 160, 680 160" fill="none" stroke={C.accent} strokeWidth="4" strokeDasharray="360" strokeDashoffset={360 * (1 - p)} />
        <circle cx="680" cy="160" r={14 * p} fill={C.ink} />
      </svg>

      <div style={{position: 'absolute', left: 0, top: 20, opacity: p}}>
        <Tag label="标签 · 产品" color={C.blue} size={42} />
      </div>
      <div style={{position: 'absolute', left: 20, top: 226, opacity: p}}>
        <Tag label="关键词 · 推荐位" color={C.accent} size={42} />
      </div>

      <div style={{position: 'absolute', left: 716, top: 106, opacity: p}}>
        <div style={{background: C.paper, border: `2px solid ${C.border}`, borderRadius: 16, padding: '24px 34px', fontFamily: sans, fontSize: 40, color: C.ink, whiteSpace: 'nowrap'}}>同一条笔记</div>
      </div>
    </div>
  );
};
