import {useProp} from '@visotalk/runtime';

// The chain that failed: the sync service reaches the storage cluster through one certificate,
// which expires at 09:12 and cuts the link.
const Box = ({x, label, sub}: {x: number; label: string; sub: string}) => (
  <g transform={`translate(${x} 0)`}>
    <rect x={0} y={60} width={300} height={220} rx={18} fill="var(--vt-panel)" stroke="var(--vt-border)" strokeWidth={3} />
    <text x={150} y={140} fill="var(--vt-text)" fontSize={40} fontFamily="var(--vt-sans)" fontWeight={700} textAnchor="middle">{label}</text>
    <text x={150} y={198} fill="var(--vt-muted)" fontSize={28} fontFamily="var(--vt-sans)" textAnchor="middle">{sub}</text>
  </g>
);

export const CertLink = () => {
  const expired = useProp('expired', 0);
  const dead = expired > 0.5;
  return (
    <svg viewBox="0 0 1720 520" width="100%" height="100%">
      <Box x={0} label="同步服务" sub="Nook 后端" />
      <Box x={1420} label="存储集群" sub="笔记数据" />

      <line x1={300} y1={170} x2={600} y2={170} stroke={dead ? 'var(--vt-bad)' : 'var(--vt-data)'} strokeWidth={8} />
      <line x1={1120} y1={170} x2={1420} y2={170} stroke={dead ? 'var(--vt-bad)' : 'var(--vt-data)'} strokeWidth={8} />

      <rect x={600} y={26} width={520} height={288} rx={22} fill="var(--vt-panel)" stroke={dead ? 'var(--vt-bad)' : 'var(--vt-border)'} strokeWidth={dead ? 6 : 3} />
      <rect x={600} y={26} width={520} height={288} rx={22} fill="var(--vt-bad)" opacity={0.16 * expired} />
      <text x={636} y={86} fill="var(--vt-muted)" fontSize={28} fontFamily="var(--vt-sans)">TLS 证书</text>
      <text x={636} y={150} fill="var(--vt-text)" fontSize={42} fontFamily="var(--vt-sans)" fontWeight={700}>一年前手工签发</text>
      <text x={636} y={230} fill={dead ? 'var(--vt-bad)' : 'var(--vt-text)'} fontSize={54} fontFamily="var(--vt-sans)" fontWeight={700}>09:12 过期</text>
      <text x={636} y={286} fill="var(--vt-bad)" fontSize={30} fontFamily="var(--vt-sans)" opacity={expired}>连接被切断</text>
    </svg>
  );
};

// Nine certificates renew themselves on a ring; one was never put on it.
export const RenewalRing = () => {
  const out = useProp('out', 0);
  const R = 172, CX = 210, CY = 225;
  const dots = Array.from({length: 9}).map((_, i) => {
    const a = (i / 9) * Math.PI * 2 - Math.PI / 2;
    return {x: CX + R * Math.cos(a), y: CY + R * Math.sin(a)};
  });
  const a0 = -Math.PI / 2 + 0.42;
  const sx = CX + R * Math.cos(a0);
  const sy = CY + R * Math.sin(a0);
  return (
    <svg viewBox="0 0 700 480" width="100%" height="100%">
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--vt-good)" strokeWidth={3} strokeDasharray="10 14" opacity={0.8} />
      {dots.map((d, i) => (
        <circle key={i} cx={Math.round(d.x)} cy={Math.round(d.y)} r={16} fill="var(--vt-good)" />
      ))}
      <text x={CX} y={CY - 14} fill="var(--vt-text)" fontSize={36} fontFamily="var(--vt-sans)" textAnchor="middle" fontWeight={700}>自动续期</text>
      <text x={CX} y={CY + 34} fill="var(--vt-muted)" fontSize={28} fontFamily="var(--vt-sans)" textAnchor="middle">其余证书</text>

      <g style={{transform: `translate(${215 * out}px, ${70 * out}px)`}}>
        <circle cx={sx} cy={sy} r={20} fill="var(--vt-bad)" />
        <text x={sx + 36} y={sy + 12} fill="var(--vt-bad)" fontSize={34} fontFamily="var(--vt-sans)" fontWeight={700}>这张证书</text>
        <text x={sx + 34} y={sy + 58} fill="var(--vt-muted)" fontSize={28} fontFamily="var(--vt-sans)" opacity={out}>不在续期系统里</text>
      </g>
    </svg>
  );
};

// No owner, no alarm.
export const Missing = () => {
  const rows = ['负责人 · 没有人续期', '监控 · 没有任何告警'];
  return (
    <div style={{display: 'flex', gap: 56, fontFamily: 'var(--vt-sans)'}}>
      {rows.map((r) => (
        <div key={r} style={{display: 'flex', alignItems: 'center', gap: 18}}>
          <svg width={46} height={46} viewBox="0 0 44 44">
            <circle cx={22} cy={22} r={20} fill="none" stroke="var(--vt-bad)" strokeWidth={3.5} />
            <path d="M14 14 l16 16 M30 14 l-16 16" stroke="var(--vt-bad)" strokeWidth={4} strokeLinecap="round" />
          </svg>
          <span style={{fontSize: 38, color: 'var(--vt-text)'}}>{r}</span>
        </div>
      ))}
    </div>
  );
};
