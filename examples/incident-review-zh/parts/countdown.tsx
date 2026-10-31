import {useProp} from '@visotalk/runtime';

// Minutes of the outage, counted up on the words.
export const DownMinutes = () => {
  const value = useProp('value', 0);
  return (
    <div style={{display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 22, fontFamily: 'var(--vt-sans)', color: 'var(--vt-warn)'}}>
      <span style={{fontSize: 132, lineHeight: 1, fontWeight: 700, letterSpacing: '-0.02em'}}>{Math.round(value)}</span>
      <span style={{fontSize: 46, fontWeight: 500, color: 'var(--vt-muted)'}}>分钟</span>
    </div>
  );
};

// The three questions the review answers, as a quiet rail under the picture.
export const Chapters = () => (
  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'var(--vt-sans)', fontSize: 34, color: 'var(--vt-muted)'}}>
    <span>发生了什么</span>
    <span>为什么重要</span>
    <span>接下来做什么</span>
  </div>
);
