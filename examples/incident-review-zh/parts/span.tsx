import {useProp} from '@visotalk/runtime';

// The 47 minutes of the outage as one bar: the two stretches that mattered (4 min to notice, 25 min to find it) are measured on it.
const X0 = 120, W = 1560, START = 9 * 60 + 12, END = 9 * 60 + 59;
const at = (h: number, m: number) => X0 + (W * ((h * 60 + m) - START)) / (END - START);

export const Span = () => {
  const grow = useProp('grow', 0);
  const a1 = useProp('a1', 0);
  const a2 = useProp('a2', 0);
  const a3 = useProp('a3', 0);
  const m1 = useProp('m1', 0);
  const m2 = useProp('m2', 0);
  return (
    <svg viewBox="0 0 1800 460" width="100%" height="100%">
      <text x={X0} y={96} fill="var(--vt-muted)" fontSize={34} fontFamily="var(--vt-sans)">09:12 证书过期</text>
      <text x={X0 + W} y={96} fill="var(--vt-muted)" fontSize={34} fontFamily="var(--vt-sans)" textAnchor="end">09:59 全部恢复</text>

      <rect x={X0} y={186} width={W * grow} height={44} rx={22} fill="var(--vt-bad)" opacity={0.55} />
      <rect x={at(9, 52)} y={186} width={Math.max(0, (X0 + W - at(9, 52)) * grow)} height={44} rx={22} fill="var(--vt-good)" opacity={0.55} />

      {/* the first 4 minutes: to the alarm */}
      <g style={{opacity: a1}}>
        <line x1={at(9, 16)} y1={160} x2={at(9, 16)} y2={264} stroke="var(--vt-text)" strokeWidth={4} />
        <text x={at(9, 16) + 18} y={272} fill="var(--vt-text)" fontSize={30} fontFamily="var(--vt-sans)">09:16 告警</text>
      </g>
      {/* the next 25: to the certificate found */}
      <g style={{opacity: a2}}>
        <line x1={at(9, 41)} y1={160} x2={at(9, 41)} y2={264} stroke="var(--vt-text)" strokeWidth={4} />
        <text x={at(9, 41) - 18} y={272} fill="var(--vt-text)" fontSize={30} fontFamily="var(--vt-sans)" textAnchor="end">09:41 找到证书</text>
      </g>
      <g style={{opacity: a3}}>
        <line x1={at(9, 52)} y1={160} x2={at(9, 52)} y2={286} stroke="var(--vt-text)" strokeWidth={4} />
        <text x={at(9, 52) + 18} y={324} fill="var(--vt-text)" fontSize={30} fontFamily="var(--vt-sans)">09:52 换证书</text>
      </g>

      {/* the two stretches, as measured lengths */}
      <g style={{opacity: m1}}>
        <path d={`M${at(9, 12)} 372 v-28 H${at(9, 16)} v28`} fill="none" stroke="var(--vt-good)" strokeWidth={5} />
        <text x={(at(9, 12) + at(9, 16)) / 2} y={420} fill="var(--vt-good)" fontSize={34} fontFamily="var(--vt-sans)" textAnchor="middle">4 分钟</text>
      </g>
      <g style={{opacity: m2}}>
        <path d={`M${at(9, 16)} 372 v-28 H${at(9, 41)} v28`} fill="none" stroke="var(--vt-warn)" strokeWidth={5} />
        <text x={(at(9, 16) + at(9, 41)) / 2} y={420} fill="var(--vt-warn)" fontSize={36} fontFamily="var(--vt-sans)" textAnchor="middle" fontWeight={700}>25 分钟 · 定位</text>
      </g>
    </svg>
  );
};

// The log as it was: the cause hidden inside "connection reset".
export const LogWindow = () => {
  const found = useProp('found', 0);
  return (
    <svg viewBox="0 0 760 300" width={760} height={300}>
      <rect x={0} y={0} width={760} height={300} rx={16} fill="var(--vt-panel)" stroke="var(--vt-border)" strokeWidth={3} />
      <rect x={0} y={0} width={760} height={52} rx={16} fill="var(--vt-panel2)" />
      {[0, 1, 2].map((i) => <circle key={i} cx={26 + i * 26} cy={26} r={7} fill="var(--vt-border)" />)}
      <text x={28} y={112} fill="var(--vt-muted)" fontSize={30} fontFamily="var(--vt-mono)">09:12:04 tls handshake</text>
      <text x={28} y={182} fill="var(--vt-text)" fontSize={38} fontFamily="var(--vt-mono)">connection reset by peer</text>
      <text x={28} y={252} fill="var(--vt-muted)" fontSize={28} fontFamily="var(--vt-sans)">没有写：certificate expired</text>
      <rect x={14} y={138} width={640} height={62} rx={10} fill="var(--vt-warn)" opacity={0.3 * found} />
    </svg>
  );
};
