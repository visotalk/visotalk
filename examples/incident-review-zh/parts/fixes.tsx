import {Obj, useProp} from '@visotalk/runtime';

type Fix = {n: number; title: string; owner: string; due: string; hero?: boolean};

const FIXES: Fix[] = [
  {n: 1, title: '所有证书纳入自动续期', owner: '平台组', due: '10 月 31 日', hero: true},
  {n: 2, title: '到期前 30 天告警', owner: '平台组', due: '10 月 24 日'},
  {n: 3, title: 'TLS 失败写明原因', owner: '同步组', due: '11 月 7 日'},
];

// Three rows, each with its owner and date; the first is the one that prevents the outage.
export const FixList = () => {
  const reveal = useProp('reveal', 0);
  const hero = useProp('hero', 0);
  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: 28, fontFamily: 'var(--vt-sans)', width: '100%'}}>
      {FIXES.map((f, i) => {
        const shown = reveal >= i * 0.5;
        const em = f.hero ? 1 - hero * 0.55 : 1;
        return (
          <div
            key={f.n}
            style={{
              display: 'grid',
              gridTemplateColumns: '92px 1fr 210px 250px',
              alignItems: 'center',
              columnGap: 28,
              padding: '38px 40px',
              boxSizing: 'border-box',
              borderRadius: 20,
              background: f.hero ? 'var(--vt-panel)' : 'var(--vt-panel2)',
              border: f.hero ? '3px solid var(--vt-data)' : '3px solid var(--vt-border)',
              opacity: shown ? em : 0,
            }}
          >
            <span style={{fontSize: 54, fontWeight: 700, color: f.hero ? 'var(--vt-data)' : 'var(--vt-muted)'}}>{f.n}</span>
            <span style={{fontSize: 42, fontWeight: 700, color: 'var(--vt-text)'}}>{f.title}</span>
            <span style={{fontSize: 30, color: 'var(--vt-muted)'}}>{f.owner}</span>
            <span style={{fontSize: 30, color: 'var(--vt-muted)'}}>截止 {f.due}</span>
          </div>
        );
      })}
    </div>
  );
};

// The outage that will not happen, once certificates renew themselves.
export const Prevented = () => {
  const cross = useProp('cross', 0);
  return (
    <svg viewBox="0 0 1000 220" width="100%" height="100%">
      <circle cx={92} cy={110} r={64} fill="none" stroke={cross > 0.5 ? 'var(--vt-good)' : 'var(--vt-bad)'} strokeWidth={7} />
      <path
        d={cross > 0.5 ? 'M60 112 l24 26 l46 -54' : 'M64 82 l56 56 M120 82 l-56 56'}
        fill="none"
        stroke={cross > 0.5 ? 'var(--vt-good)' : 'var(--vt-bad)'}
        strokeWidth={10}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text x={196} y={100} fill="var(--vt-text)" fontSize={52} fontFamily="var(--vt-sans)" fontWeight={700}>这次故障</text>
      <text x={196} y={168} fill="var(--vt-good)" fontSize={42} fontFamily="var(--vt-sans)">不会再发生</text>
    </svg>
  );
};
