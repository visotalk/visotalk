import {Obj, useProp} from '@visotalk/runtime';

// One hundred dots: each is one percent of the people who opened Nook. The twelve that saw the error light up.
const COLS = 10, N = 100, CELL = 70, R = 21;

export const Affected = () => {
  const pct = useProp('pct', 0);
  return (
    <svg viewBox="0 0 700 700" width="100%" height="100%">
      {Array.from({length: N}).map((_, i) => {
        const c = i % COLS;
        const r = Math.floor(i / COLS);
        const on = c < 4 && r < 3;
        const lit = on && i < Math.round(pct);
        return (
          <circle
            key={i}
            cx={35 + c * CELL}
            cy={35 + r * CELL}
            r={R}
            fill={on ? (lit ? 'var(--vt-warn)' : 'var(--vt-panel2)') : 'var(--vt-muted)'}
            opacity={on ? (lit ? 1 : 0.85) : 0.16}
          />
        );
      })}
      <text x={35 + 4 * CELL + 16} y={35 + 2 * CELL + 16} fill="var(--vt-warn)" fontSize={54} fontFamily="var(--vt-sans)" fontWeight={700}>12%</text>
      <text x={0} y={674} fill="var(--vt-muted)" fontSize={30} fontFamily="var(--vt-sans)">每个圆点 = 1% 打开 Nook 的人</text>
    </svg>
  );
};

// The twelve percent as a figure, with what it means in accounts.
export const Accounts = () => {
  const value = useProp('value', 0);
  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: 10, fontFamily: 'var(--vt-sans)'}}>
      <div style={{display: 'flex', alignItems: 'baseline', gap: 14}}>
        <span style={{fontSize: 200, lineHeight: 1, fontWeight: 700, color: 'var(--vt-warn)', letterSpacing: '-0.03em'}}>{Math.round(value).toLocaleString('en-US')}</span>
      </div>
      <div style={{fontSize: 44, color: 'var(--vt-muted)'}}>个账号</div>
    </div>
  );
};

// Nothing lost: the changes waited on the device and went up whole.
export const NoLoss = () => {
  const draw = useProp('draw', 0);
  return (
    <svg viewBox="0 0 760 300" width="100%" height="100%">
      <circle cx={110} cy={150} r={66} fill="none" stroke="var(--vt-good)" strokeWidth={7} />
      <path d="M76 152 l26 28 l48 -56" fill="none" stroke="var(--vt-good)" strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={130} strokeDashoffset={130 * (1 - draw)} />
      <text x={214} y={128} fill="var(--vt-text)" fontSize={62} fontFamily="var(--vt-sans)" fontWeight={700}>零条笔记丢失</text>
      <text x={216} y={196} fill="var(--vt-muted)" fontSize={36} fontFamily="var(--vt-sans)">改动先存在设备上，恢复后补传</text>
    </svg>
  );
};
