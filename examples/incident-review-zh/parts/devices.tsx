import {useProp} from '@visotalk/runtime';

// Two devices holding the same note; the newest change exists on one only while sync is down.
const Note = ({x, y, w, lines, last}: {x: number; y: number; w: number; lines: number; last: string}) => (
  <g transform={`translate(${x} ${y})`}>
    {Array.from({length: lines}).map((_, i) => {
      const isLast = i === lines - 1;
      return (
        <rect
          key={i}
          x={0}
          y={i * 62}
          width={isLast ? w * 0.72 : w}
          height={isLast ? 22 : 16}
          rx={8}
          fill={isLast ? last : 'var(--vt-muted)'}
          opacity={isLast ? 1 : 0.22}
        />
      );
    })}
  </g>
);

const Phone = ({x, lines, last}: {x: number; lines: number; last: string}) => (
  <g transform={`translate(${x} 20)`}>
    <rect width={380} height={600} rx={44} fill="var(--vt-panel)" stroke="var(--vt-border)" strokeWidth={4} />
    <rect x={20} y={58} width={340} height={522} rx={20} fill="var(--vt-panel2)" />
    <rect x={160} y={26} width={60} height={9} rx={5} fill="var(--vt-border)" />
    <rect x={48} y={88} width={150} height={18} rx={9} fill="var(--vt-muted)" opacity={0.4} />
    <Note x={48} y={140} w={284} lines={lines} last={last} />
  </g>
);

export const Devices = () => {
  const gap = useProp('gap', 0);
  const live = gap < 0.5;
  const lx = 860 - 80 * gap;
  const rx = 860 + 80 * gap;
  return (
    <svg viewBox="0 0 1720 660" width={1720} height={660}>
      <Phone x={60} lines={6} last="var(--vt-warn)" />
      <Phone x={1280} lines={5} last="var(--vt-warn)" />

      <line x1={444} y1={320} x2={lx} y2={320} stroke={live ? 'var(--vt-data)' : 'var(--vt-bad)'} strokeWidth={8} strokeLinecap="round" />
      <line x1={rx} y1={320} x2={1276} y2={320} stroke={live ? 'var(--vt-data)' : 'var(--vt-bad)'} strokeWidth={8} strokeLinecap="round" />
      {[500, 600, 700].map((x) => (
        <path key={x} d={`M${x} 302 l20 18 l-20 18`} fill="none" stroke="var(--vt-data)" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" opacity={1 - gap} />
      ))}
      {[1020, 1120, 1220].map((x) => (
        <path key={x} d={`M${x} 302 l20 18 l-20 18`} fill="none" stroke="var(--vt-data)" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" opacity={1 - gap} />
      ))}

      <g opacity={gap}>
        <circle cx={860} cy={320} r={54} fill="var(--vt-bg)" stroke="var(--vt-bad)" strokeWidth={6} />
        <path d="M838 298 l44 44 M882 298 l-44 44" stroke="var(--vt-bad)" strokeWidth={9} strokeLinecap="round" />
      </g>
      <text x={860} y={430} fill="var(--vt-bad)" fontSize={34} fontFamily="var(--vt-sans)" textAnchor="middle" opacity={gap}>同步中断</text>
    </svg>
  );
};
