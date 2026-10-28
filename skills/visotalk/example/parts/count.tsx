import {useProp} from '@visotalk/runtime';

// A number that counts up: the document tweens `value` on the words; the part only draws it.
export const Count = ({unit}: {unit: string}) => {
  const value = useProp('value', 0);
  return (
    <div style={{display: 'flex', alignItems: 'baseline', gap: 32, fontFamily: 'var(--vt-sans)', color: 'var(--vt-data)'}}>
      <span style={{fontSize: 320, lineHeight: 1, fontWeight: 700}}>{Math.round(value)}</span>
      <span style={{fontSize: 72, color: 'var(--vt-muted)'}}>{unit}</span>
    </div>
  );
};
