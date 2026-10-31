import {Obj, useProp} from '@visotalk/runtime';

const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const CELLS = Array.from({length: 100}, (_, i) => i);
const AFFECTED = [12, 13, 21, 22, 30, 31, 38, 47, 55, 64, 73, 82];

// One hundred squares, each one percent of the people who opened Nook; twelve of them saw the banner.
export const Share = () => {
  const lit = useProp('lit', 0);
  const pct = useProp('value', 0);
  const accounts = useProp('count', 0);
  const showAccounts = useProp('accounts', 0);
  return (
    <div style={{position: 'relative', width: 760, height: 700, fontFamily: 'var(--vt-sans)'}}>
      <div style={{position: 'absolute', left: 0, top: 0, display: 'grid', gridTemplateColumns: 'repeat(10, 56px)', gap: 8}}>
        {CELLS.map((i) => {
          const on = AFFECTED.indexOf(i);
          const isOn = on >= 0 && on < Math.round(lit * 12);
          return <div key={i} style={{width: 56, height: 56, borderRadius: 9, background: isOn ? 'var(--vt-bad)' : 'var(--vt-panel2)', border: isOn ? 'none' : '1px solid var(--vt-border)', opacity: isOn ? 1 : 0.75}} />;
        })}
      </div>
      <div style={{position: 'absolute', left: 0, top: 632, fontSize: 26, color: 'var(--vt-muted)', letterSpacing: 2}}>EACH SQUARE = 1% OF PEOPLE WHO OPENED NOOK</div>
      <div style={{position: 'absolute', left: 816, top: 0, width: 800}}>
        <div style={{display: 'flex', alignItems: 'baseline', gap: 6, color: 'var(--vt-bad)', fontSize: 230, fontWeight: 700, lineHeight: 0.95, letterSpacing: -8, fontVariantNumeric: 'tabular-nums'}}>
          {Math.round(pct)}<span style={{fontSize: 120}}>%</span>
        </div>
        <div style={{marginTop: 22, fontSize: 34, color: 'var(--vt-muted)'}}>saw a “Couldn’t sync” banner</div>
        <div style={{marginTop: 74, opacity: clamp(showAccounts), borderTop: '2px solid var(--vt-border)', paddingTop: 34}}>
          <div style={{fontSize: 118, fontWeight: 700, color: 'var(--vt-text)', lineHeight: 1, fontVariantNumeric: 'tabular-nums', letterSpacing: -3}}>
            {Math.round(accounts).toLocaleString('en-US')}
          </div>
          <div style={{marginTop: 12, fontSize: 34, color: 'var(--vt-muted)'}}>accounts</div>
        </div>
      </div>
    </div>
  );
};

// The same moment from two sides: what the person holds, and what the service reports.
export const TwoViews = () => {
  const app = useProp('app', 0);
  const svc = useProp('service', 0);
  return (
    <div style={{position: 'relative', width: 1600, height: 600, fontFamily: 'var(--vt-sans)', color: 'var(--vt-text)'}}>
      <div style={{position: 'absolute', left: 0, top: 0, width: 700}}>
        <div style={{fontSize: 26, color: 'var(--vt-muted)', letterSpacing: 3}}>THEIR APP</div>
        <div style={{position: 'relative', marginTop: 26, width: 420, height: 460, borderRadius: 34, border: '3px solid var(--vt-border)', background: 'var(--vt-panel)', opacity: clamp(app)}}>
          <div style={{position: 'absolute', left: 30, top: 40, width: 360, height: 92, borderRadius: 14, background: 'var(--vt-bad)'}}>
            <div style={{position: 'absolute', left: 28, top: 27, fontSize: 34, fontWeight: 700, color: '#2A0B0B'}}>Couldn’t sync</div>
          </div>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{position: 'absolute', left: 30, top: 176 + i * 62, width: i === 3 ? 250 : 340, height: 22, borderRadius: 11, background: 'var(--vt-faint)'}} />
          ))}
        </div>
        <div style={{marginTop: 26, fontSize: 32, color: 'var(--vt-bad)'}}>looks broken</div>
      </div>
      <div style={{position: 'absolute', left: 860, top: 0, width: 740}}>
        <div style={{fontSize: 26, color: 'var(--vt-muted)', letterSpacing: 3}}>THE SERVICE</div>
        <div style={{position: 'relative', marginTop: 26, width: 700, height: 460, borderRadius: 20, border: '3px solid var(--vt-border)', background: 'var(--vt-panel)', padding: 30, boxSizing: 'border-box', opacity: clamp(svc)}}>
          {['sync', 'storage', 'api', 'queue'].map((n, i) => (
            <div key={n} style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 92, borderBottom: i < 3 ? '1px solid var(--vt-border)' : 'none'}}>
              <span style={{fontSize: 30, fontFamily: 'var(--vt-mono)', color: 'var(--vt-text)'}}>{n}</span>
              <span style={{fontSize: 28, color: 'var(--vt-good)'}}>● up · nominal</span>
            </div>
          ))}
        </div>
        <div style={{marginTop: 26, fontSize: 32, color: 'var(--vt-good)'}}>looks fine</div>
      </div>
    </div>
  );
};
