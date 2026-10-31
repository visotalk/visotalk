import {Obj, useProp} from '@visotalk/runtime';

const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

// One certificate on the wire between the two services.
export const CertLink = () => {
  const wire = clamp(useProp('wire', 0));
  const cert = clamp(useProp('cert', 0));
  const broke = clamp(useProp('broke', 0));
  const X0 = 250;
  const X1 = 1300;
  const Y = 150;
  const CX = 900;
  return (
    <div style={{position: 'relative', width: 1600, height: 460, fontFamily: 'var(--vt-sans)', color: 'var(--vt-text)'}}>
      <Obj id="svc" style={{position: 'absolute', left: X0 - 240, top: Y - 84, width: 240, height: 168, borderRadius: 16, border: '3px solid var(--vt-border)', background: 'var(--vt-panel)'}}>
        <div style={{position: 'absolute', left: 24, top: 40, fontSize: 34, fontWeight: 700}}>sync</div>
        <div style={{position: 'absolute', left: 24, top: 90, fontSize: 26, color: 'var(--vt-muted)'}}>service</div>
      </Obj>
      <Obj id="store" style={{position: 'absolute', left: X1, top: Y - 84, width: 250, height: 168, borderRadius: 16, border: '3px solid var(--vt-border)', background: 'var(--vt-panel)'}}>
        <div style={{position: 'absolute', left: 24, top: 40, fontSize: 34, fontWeight: 700}}>storage</div>
        <div style={{position: 'absolute', left: 24, top: 90, fontSize: 26, color: 'var(--vt-muted)'}}>cluster</div>
      </Obj>
      <svg width={1600} height={460} viewBox="0 0 1600 460" style={{position: 'absolute', left: 0, top: 0}}>
        <line x1={X0 + 10} y1={Y} x2={X0 + 10 + (X1 - X0 - 20) * wire} y2={Y} stroke={broke > 0.5 ? 'var(--vt-bad)' : 'var(--vt-border)'} strokeWidth={8} strokeLinecap="round" />
        {broke > 0.01 && (
          <g stroke="var(--vt-bad)" strokeWidth={8} strokeLinecap="round" opacity={broke}>
            <line x1={CX - 22} y1={Y - 22} x2={CX + 22} y2={Y + 22} />
            <line x1={CX - 22} y1={Y + 22} x2={CX + 22} y2={Y - 22} />
          </g>
        )}
        <g opacity={clamp(cert)}>
          <g transform={`translate(${CX - 46} ${Y - 150})`}>
            <rect x={0} y={0} width={92} height={116} rx={10} fill="var(--vt-panel2)" stroke={broke > 0.5 ? 'var(--vt-bad)' : 'var(--vt-data)'} strokeWidth={5} />
            <rect x={18} y={22} width={56} height={7} rx={3} fill="var(--vt-muted)" />
            <rect x={18} y={40} width={56} height={7} rx={3} fill="var(--vt-muted)" />
            <rect x={18} y={58} width={34} height={7} rx={3} fill="var(--vt-muted)" />
            <circle cx={46} cy={92} r={13} fill={broke > 0.5 ? 'var(--vt-bad)' : 'var(--vt-good)'} />
          </g>
          <line x1={CX} y1={Y - 34} x2={CX} y2={Y - 6} stroke="var(--vt-muted)" strokeWidth={4} />
          <text x={CX + 74} y={Y - 84} fill="var(--vt-text)" fontSize={34} fontFamily="var(--vt-sans)">certificate</text>
          <text x={CX + 74} y={Y - 44} fill="var(--vt-muted)" fontSize={28} fontFamily="var(--vt-sans)">its proof of identity</text>
        </g>
      </svg>
      <div style={{position: 'absolute', left: X0 - 10, top: Y + 44, fontSize: 28, color: 'var(--vt-muted)', fontFamily: 'var(--vt-mono)', letterSpacing: 3}}>TLS</div>
      <div style={{position: 'absolute', left: 0, top: 388, width: 1600, textAlign: 'center', fontSize: 34, color: broke > 0.5 ? 'var(--vt-bad)' : 'var(--vt-good)'}}>
        {broke > 0.5 ? 'expired 09:12' : 'trusted connection'}
      </div>
    </div>
  );
};

const IN_RING = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const CX = 600;
const CY = 330;
const R = 268;

// Eleven certificates go round the renewal system; one was issued by hand and sits outside it.
export const RenewRing = () => {
  const draw = clamp(useProp('draw', 0));
  const dots = clamp(useProp('dots', 0));
  const stray = clamp(useProp('stray', 0));
  const silent = clamp(useProp('silent', 0));
  return (
    <div style={{position: 'relative', width: 1600, height: 700, fontFamily: 'var(--vt-sans)', color: 'var(--vt-text)'}}>
      <svg width={1600} height={700} viewBox="0 0 1600 700" style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--vt-border)" strokeWidth={5} strokeDasharray={2 * Math.PI * R} strokeDashoffset={2 * Math.PI * R * (1 - draw)} />
        {IN_RING.map((i, k) => {
          const a = (k / IN_RING.length) * Math.PI * 2 - Math.PI / 2;
          const x = Math.round(CX + R * Math.cos(a));
          const y = Math.round(CY + R * Math.sin(a));
          const on = dots > (k + 1) / IN_RING.length;
          return (
            <g key={i} opacity={on ? 1 : 0.18}>
              <circle cx={x} cy={y} r={17} fill={on ? 'var(--vt-good)' : 'var(--vt-faint)'} />
              {on && <path d={`M ${x - 8} ${y} l 6 7 l 11 -13`} stroke="#0B1A10" strokeWidth={4} fill="none" strokeLinecap="round" />}
            </g>
          );
        })}
        <text x={CX} y={CY - 22} fill="var(--vt-text)" fontSize={50} fontFamily="var(--vt-sans)" textAnchor="middle" fontWeight={700} opacity={clamp(draw * 2)}>
          automatic
        </text>
        <text x={CX} y={CY + 42} fill="var(--vt-text)" fontSize={50} fontFamily="var(--vt-sans)" textAnchor="middle" fontWeight={700} opacity={clamp(draw * 2)}>
          renewal
        </text>
        <g opacity={stray}>
          <line x1={CX + R * 0.72} y1={CY - R * 0.7} x2={1240} y2={170} stroke="var(--vt-bad)" strokeWidth={4} strokeDasharray="10 12" />
          <g transform="translate(1246 114)">
            <rect x={0} y={0} width={92} height={116} rx={10} fill="var(--vt-panel2)" stroke="var(--vt-bad)" strokeWidth={5} />
            <rect x={18} y={22} width={56} height={7} rx={3} fill="var(--vt-muted)" />
            <rect x={18} y={40} width={56} height={7} rx={3} fill="var(--vt-muted)" />
            <circle cx={46} cy={92} r={13} fill="var(--vt-bad)" />
          </g>
          <text x={1366} y={150} fill="var(--vt-bad)" fontSize={34} fontFamily="var(--vt-sans)">issued by hand</text>
          <text x={1366} y={194} fill="var(--vt-muted)" fontSize={28} fontFamily="var(--vt-sans)">a year earlier</text>
          <text x={1366} y={238} fill="var(--vt-muted)" fontSize={28} fontFamily="var(--vt-sans)">outside the system</text>
        </g>
      </svg>
      <Obj id="bells" style={{position: 'absolute', left: 300, top: 648, width: 600, textAlign: 'center', whiteSpace: 'nowrap', opacity: silent}}>
        <div style={{display: 'flex', justifyContent: 'center', gap: 18, fontSize: 30, color: 'var(--vt-bad)'}}><span>no renewal</span><span style={{color: 'var(--vt-faint)'}}>·</span><span>no warning</span></div>
      </Obj>
    </div>
  );
};
