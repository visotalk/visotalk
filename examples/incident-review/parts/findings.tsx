import {Obj, useProp} from '@visotalk/runtime';

const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

const CROSS = ({color}: {color: string}) => (
  <svg width={40} height={40} viewBox="0 0 40 40">
    <line x1={10} y1={10} x2={30} y2={30} stroke={color} strokeWidth={6} strokeLinecap="round" />
    <line x1={30} y1={10} x2={10} y2={30} stroke={color} strokeWidth={6} strokeLinecap="round" />
  </svg>
);

// Two failures, then the one design that held, sliding in beneath them.
export const Ledger = () => {
  const bad1 = clamp(useProp('bad1', 0));
  const bad2 = clamp(useProp('bad2', 0));
  const good = clamp(useProp('good', 0));
  const row: React.CSSProperties = {position: 'absolute', left: 0, width: 1600, borderRadius: 16, background: 'var(--vt-panel)', border: '2px solid var(--vt-border)', boxSizing: 'border-box', display: 'flex', alignItems: 'center', padding: '0 40px', gap: 34};
  return (
    <div style={{position: 'relative', width: 1600, height: 640, fontFamily: 'var(--vt-sans)', color: 'var(--vt-text)'}}>
      <div style={{position: 'absolute', left: 0, top: 0, fontSize: 26, letterSpacing: 4, color: 'var(--vt-bad)'}}>WHAT WENT BADLY</div>
      <Obj id="bad-1" style={{...row, top: 54, height: 128, opacity: bad1, borderColor: 'var(--vt-bad)'}}>
        <CROSS color="var(--vt-bad)" />
        <span style={{fontSize: 42}}>One certificate lived outside automatic renewal.</span>
        <span style={{marginLeft: 'auto', fontSize: 28, color: 'var(--vt-muted)'}}>nobody knew</span>
      </Obj>
      <Obj id="bad-2" style={{...row, top: 202, height: 128, opacity: bad2, borderColor: 'var(--vt-bad)'}}>
        <CROSS color="var(--vt-bad)" />
        <span style={{fontSize: 42}}>The error hid its own cause.</span>
        <span style={{marginLeft: 'auto', fontSize: 28, color: 'var(--vt-bad)', fontFamily: 'var(--vt-mono)'}}>25 min</span>
      </Obj>

      <Obj id="good-row" style={{...row, top: 388, height: 148, opacity: good, borderColor: 'var(--vt-good)', background: 'var(--vt-panel2)'}}>
        <div style={{width: 40, height: 40, borderRadius: 20, background: 'var(--vt-good)'}} />
        <div>
          <div style={{fontSize: 42}}>Every edit stayed on the device.</div>
          <div style={{fontSize: 26, color: 'var(--vt-muted)', marginTop: 8}}>nothing was lost</div>
        </div>
      </Obj>
      <div style={{position: 'absolute', left: 0, top: 348, fontSize: 26, letterSpacing: 4, color: 'var(--vt-good)', opacity: good}}>WHAT HELD</div>
    </div>
  );
};
