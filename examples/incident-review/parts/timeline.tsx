import {Obj, useProp} from '@visotalk/runtime';

const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

const ROWS = [
  {id: 'e-start', hhmm: '09:12', text: 'the certificate expires', color: 'var(--vt-bad)'},
  {id: 'e-alert', hhmm: '09:16', text: 'the alert fires', color: 'var(--vt-data)'},
  {id: 'e-found', hhmm: '09:41', text: 'the cause is found', color: 'var(--vt-data)'},
  {id: 'e-fixed', hhmm: '09:52', text: 'a new certificate is out', color: 'var(--vt-data)'},
  {id: 'e-back', hhmm: '09:59', text: 'sync is back for everyone', color: 'var(--vt-good)'},
];

const GAPS = [
  {text: '4 min to notice', color: 'var(--vt-good)'},
  {text: '25 min to understand', color: 'var(--vt-bad)'},
  {text: '11 min to fix', color: 'var(--vt-data)'},
  {text: '', color: 'transparent'},
];

const TOP = 44;
const STEP = 126;
const DOTX = 190;

// The incident as a vertical spine: five moments on one clock, and the three stretches between them.
export const Timeline = () => {
  const draw = clamp(useProp('draw', 0));
  const shown = useProp('shown', 0);
  const drain = clamp(useProp('drain', 0));
  const done = (i: number) => shown > i + 0.001;
  const spineEnd = TOP + (ROWS.length - 1) * STEP;
  const len = spineEnd - TOP;
  return (
    <div style={{position: 'relative', width: 1240, height: 760, fontFamily: 'var(--vt-sans)', color: 'var(--vt-text)'}}>
      <svg width={1240} height={760} viewBox="0 0 1240 760" style={{position: 'absolute', left: 0, top: 0}}>
        <line x1={DOTX} y1={TOP} x2={DOTX} y2={TOP + len * draw} stroke="var(--vt-border)" strokeWidth={6} strokeLinecap="round" />
        {GAPS.map((g, i) => {
          if (!g.text || !done(i + 1)) return null;
          const y0 = TOP + i * STEP + 14;
          const y1 = TOP + (i + 1) * STEP - 14;
          return <line key={i} x1={DOTX} y1={y0} x2={DOTX} y2={y1} stroke={g.color} strokeWidth={10} strokeLinecap="round" opacity={0.55} />;
        })}
        {ROWS.map((r, i) => (
          <circle key={r.id} cx={DOTX} cy={TOP + i * STEP} r={14} fill={done(i) ? r.color : 'var(--vt-faint)'} />
        ))}
      </svg>

      {ROWS.map((r, i) => (
        <div key={r.id}>
          <div style={{position: 'absolute', left: 0, top: TOP + i * STEP - 20, width: 156, textAlign: 'right', fontSize: 38, fontFamily: 'var(--vt-mono)', color: r.color, opacity: done(i) ? 1 : 0.15}}>
            {r.hhmm}
          </div>
          <div style={{position: 'absolute', left: 250, top: TOP + i * STEP - 22, width: 760, fontSize: 42, color: 'var(--vt-text)', opacity: done(i) ? 1 : 0.15}}>
            {r.text}
          </div>
        </div>
      ))}

      {GAPS.map((g, i) =>
        g.text && done(i + 1) ? (
          <div key={i} style={{position: 'absolute', left: 250, top: TOP + i * STEP + 54, height: 38, borderRadius: 19, background: 'var(--vt-panel)', border: `2px solid ${g.color}`, boxSizing: 'border-box', padding: '0 18px', display: 'flex', alignItems: 'center', fontSize: 25, color: g.color}}>
            {g.text}
          </div>
        ) : null,
      )}

      <Obj id="drain" style={{position: 'absolute', left: 250, top: TOP + 4 * STEP + 54, height: 44, padding: '0 20px', borderRadius: 20, background: 'var(--vt-panel2)', display: 'flex', alignItems: 'center', fontSize: 27, color: 'var(--vt-good)', opacity: drain}}>
        queued edits drain in 6 min
      </Obj>
    </div>
  );
};

// The log line as it read at the time, and the reason it hid.
export const LogPanel = () => {
  const reveal = clamp(useProp('reveal', 0));
  return (
    <div style={{position: 'relative', width: 440, height: 340, fontFamily: 'var(--vt-mono)'}}>
      <div style={{position: 'absolute', left: 0, top: 0, width: 440, height: 340, borderRadius: 16, background: 'var(--vt-panel)', border: '2px solid var(--vt-border)', boxSizing: 'border-box', padding: '28px 30px'}}>
        <div style={{fontSize: 22, color: 'var(--vt-muted)', letterSpacing: 1}}>SYNC · 09:14:07</div>
        <div style={{marginTop: 18, fontSize: 26, color: 'var(--vt-text)'}}>tls handshake failed:</div>
        <div style={{marginTop: 10, fontSize: 34, fontWeight: 700, color: reveal > 0.5 ? 'var(--vt-bad)' : 'var(--vt-warn)', lineHeight: 1.15}}>
          {reveal > 0.5 ? 'certificate expired' : 'connection reset'}
        </div>
        <div style={{marginTop: 26, paddingTop: 18, borderTop: '1px solid var(--vt-border)', fontSize: 22, color: 'var(--vt-muted)', lineHeight: 1.4}}>
          {reveal > 0.5 ? 'the reason, at last' : 'says nothing about the cause'}
        </div>
      </div>
    </div>
  );
};
