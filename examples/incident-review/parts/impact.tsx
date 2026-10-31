import {Obj, useProp, useTarget} from '@visotalk/runtime';

const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

// The length of the outage: a red band filling the time between 09:12 and 09:59, and the figure that names it.
export const MinuteBand = () => {
  const span = clamp(useProp('span', 0));
  const count = useProp('value', 0);
  const X0 = 430;
  const X1 = 1580;
  const Y = 118;
  const w = Math.round((X1 - X0) * span);
  return (
    <div style={{position: 'relative', width: 1600, height: 280, fontFamily: 'var(--vt-sans)', color: 'var(--vt-text)'}}>
      <div style={{position: 'absolute', left: 0, top: 2, fontSize: 220, lineHeight: 0.9, fontWeight: 700, color: 'var(--vt-bad)', letterSpacing: -10, fontVariantNumeric: 'tabular-nums'}}>
        {Math.round(count)}
      </div>
      <div style={{position: 'absolute', left: 6, top: 214, fontSize: 42, color: 'var(--vt-muted)'}}>minutes without sync</div>
      <div style={{position: 'absolute', left: X0, top: Y, width: X1 - X0, height: 20, borderRadius: 10, background: 'var(--vt-faint)'}} />
      <div style={{position: 'absolute', left: X0, top: Y, width: w, height: 20, borderRadius: 10, background: 'var(--vt-bad)'}} />
      <div style={{position: 'absolute', left: X0 - 4, top: Y + 32, fontSize: 32, color: 'var(--vt-muted)', fontFamily: 'var(--vt-mono)'}}>09:12</div>
      <div style={{position: 'absolute', left: X1 - 76, top: Y + 32, fontSize: 32, color: 'var(--vt-muted)', fontFamily: 'var(--vt-mono)'}}>09:59</div>
      <div style={{position: 'absolute', left: X0 + (X1 - X0) / 2 - 110, top: Y - 62, fontSize: 30, color: 'var(--vt-muted)', letterSpacing: 3}}>NO SYNC</div>
    </div>
  );
};

const LAP = {x: 0, y: 34, w: 560, h: 330};
const PHONE = {x: 1360, y: 34, w: 210, h: 330};
const QX = 322;
const QY = 270;

// Two devices, the link between them, and the edits that wait on the device until the link comes back.
export const Devices = () => {
  const gap = clamp(useProp('gap', 0));
  const stale = clamp(useProp('stale', 0));
  const flow = clamp(useProp('flow', 0));
  const notch = 96 * gap;
  const MID = 963;
  const wireY = 200;
  const dots = [0, 1, 2, 3];
  return (
    <div style={{position: 'relative', width: 1600, height: 420, fontFamily: 'var(--vt-sans)', color: 'var(--vt-text)'}}>
      <div style={{position: 'absolute', left: 0, top: 0, fontSize: 28, color: 'var(--vt-muted)', letterSpacing: 2}}>THEIR LAPTOP</div>
      <div style={{position: 'absolute', left: PHONE.x + 30, top: 0, fontSize: 28, color: 'var(--vt-muted)', letterSpacing: 2}}>THEIR PHONE</div>

      <Obj id="laptop" style={{position: 'absolute', left: LAP.x, top: LAP.y, width: LAP.w, height: LAP.h, borderRadius: 18, border: '3px solid var(--vt-border)', background: 'var(--vt-panel)'}}>
        <div style={{position: 'absolute', left: 32, top: 30, width: 496, height: 196, borderRadius: 12, background: 'var(--vt-panel2)', border: '2px solid var(--vt-border)'}}>
          <div style={{position: 'absolute', left: 24, top: 20, fontSize: 22, letterSpacing: 3, color: 'var(--vt-muted)'}}>SHARED NOTEBOOK</div>
          {[440, 400, 300].map((wd, i) => (
            <div key={i} style={{position: 'absolute', left: 24, top: 66 + i * 40, width: wd, height: 12, borderRadius: 6, background: 'var(--vt-faint)', opacity: 1 - 0.55 * stale}} />
          ))}
          <div style={{position: 'absolute', left: 24, top: 158, fontSize: 24, color: 'var(--vt-muted)'}}>read · edit</div>
        </div>
        <div style={{position: 'absolute', left: 32, top: 258, fontSize: 22, color: 'var(--vt-good)'}}>edits kept here</div>
      </Obj>

      <Obj id="phone" style={{position: 'absolute', left: PHONE.x, top: PHONE.y, width: PHONE.w, height: PHONE.h, borderRadius: 26, border: '3px solid var(--vt-border)', background: 'var(--vt-panel)'}}>
        <div style={{position: 'absolute', left: 20, top: 24, width: 164, height: 176, borderRadius: 12, background: 'var(--vt-panel2)'}}>
          {[110, 90, 120].map((wd, i) => (
            <div key={i} style={{position: 'absolute', left: 16, top: 20 + i * 34, width: wd, height: 10, borderRadius: 5, background: 'var(--vt-faint)'}} />
          ))}
        </div>
        <div style={{position: 'absolute', left: 20, top: 226, fontSize: 24, color: 'var(--vt-muted)'}}>read · edit</div>
      </Obj>

      <svg width={1600} height={420} viewBox="0 0 1600 420" style={{position: 'absolute', left: 0, top: 0}}>
        <Obj as="g" id="link">
          <line x1={570} y1={wireY} x2={MID - notch} y2={wireY} stroke={gap > 0.02 ? 'var(--vt-bad)' : 'var(--vt-border)'} strokeWidth={7} />
          <line x1={MID + notch} y1={wireY} x2={1350} y2={wireY} stroke={gap > 0.02 ? 'var(--vt-bad)' : 'var(--vt-border)'} strokeWidth={7} />
        </Obj>
        {gap > 0.02 && (
          <g stroke="var(--vt-bad)" strokeWidth={7} strokeLinecap="round">
            <line x1={MID - 26} y1={wireY - 26} x2={MID + 26} y2={wireY + 26} />
            <line x1={MID - 26} y1={wireY + 26} x2={MID + 26} y2={wireY - 26} />
          </g>
        )}
      </svg>

      <Obj id="notebook" style={{position: 'absolute', left: 660, top: 300, width: 320, height: 92, borderRadius: 14, border: '2px solid var(--vt-border)', background: 'var(--vt-panel)'}}>
        <div style={{position: 'absolute', left: 58, top: 14, fontSize: 24, color: 'var(--vt-muted)'}}>shared notebook</div>
        <div style={{position: 'absolute', left: 58, top: 46, fontSize: 26, color: stale > 0.5 ? 'var(--vt-bad)' : 'var(--vt-good)'}}>
          {stale > 0.5 ? 'stalled' : 'syncing'}
        </div>
        <div style={{position: 'absolute', left: 22, top: 34, width: 18, height: 18, borderRadius: 9, background: stale > 0.5 ? 'var(--vt-bad)' : 'var(--vt-good)'}} />
      </Obj>

      <Obj id="queue" style={{position: 'absolute', left: 0, top: 0, width: 1600, height: 420, pointerEvents: 'none'}}>
        {dots.map((i) => {
          const t = clamp((flow - i * 0.13) / 0.55);
          const sx = QX + i * 46;
          const sy = QY;
          const ex = 1408;
          const ey = 56 + i * 56;
          const x = Math.round(sx + (ex - sx) * t);
          const y = Math.round(sy + (ey - sy) * t);
          return <div key={i} style={{position: 'absolute', left: x, top: y, width: 28, height: 28, borderRadius: 6, background: 'var(--vt-data)'}} />;
        })}
      </Obj>
    </div>
  );
};
