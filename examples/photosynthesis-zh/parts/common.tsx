// Shared drawings: the deck's leaf, the sun, and a little curve maths.

export const C = {
  paper: '#fbf5e6',
  ink: '#1f3b36',
  leaf: '#2f8f5b',
  deep: '#0f766e',
  sun: '#f2a93b',
  water: '#4ba3c7',
  pale: '#dcefd9',
  soft: '#5d7a70',
};

// The leaf lies on its own axis: base at the origin, tip 640 to the right.
// A quadratic through (0,0)-(320,-380)-(640,0) gives a blade pointed at both ends,
// and its edge has a closed form, so veins can end exactly on it.
const LEN = 640;
const HALF = 380; // control offset; the blade is 190 wide at its middle
export const edge = (x: number) => {
  const u = Math.min(1, Math.max(0, x / LEN));
  return 2 * HALF * u * (1 - u);
};

export const Leaf = ({
  x, y, s = 1, rot = -22, fill = C.leaf, vein = '#ffffff', opacity = 1,
}: {x: number; y: number; s?: number; rot?: number; fill?: string; vein?: string; opacity?: number}) => {
  const veins = [95, 185, 275, 365, 450, 520];
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`} opacity={opacity}>
      <path d={`M0 0 Q 320 ${-HALF} ${LEN} 0 Q 320 ${HALF} 0 0 Z`} fill={fill} />
      <path d={`M0 0 L ${LEN} 0`} stroke={vein} strokeWidth={5} strokeLinecap="round" fill="none" opacity={0.95} />
      {veins.map((v) => {
        const w = edge(v + 92) * 0.9;
        return (
          <g key={v}>
            <path d={`M${v} 0 Q ${v + 48} ${-w * 0.5} ${v + 92} ${-w}`} stroke={vein} strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.72} />
            <path d={`M${v} 0 Q ${v + 48} ${w * 0.5} ${v + 92} ${w}`} stroke={vein} strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.72} />
          </g>
        );
      })}
    </g>
  );
};

export const Sun = ({x, y, r = 60, glow = 0}: {x: number; y: number; r?: number; glow?: number}) => (
  <g>
    {glow > 0 && <circle cx={x} cy={y} r={r * (1.25 + glow * 1.5)} fill={C.sun} opacity={glow * 0.2} />}
    <circle cx={x} cy={y} r={r} fill={C.sun} />
    {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
      const rad = (a * Math.PI) / 180;
      const x0 = x + Math.cos(rad) * (r + 15);
      const y0 = y + Math.sin(rad) * (r + 15);
      const x1 = x + Math.cos(rad) * (r + 15 + 22 + glow * 10);
      const y1 = y + Math.sin(rad) * (r + 15 + 22 + glow * 10);
      return <line key={a} x1={x0} y1={y0} x2={x1} y2={y1} stroke={C.sun} strokeWidth={8} strokeLinecap="round" />;
    })}
  </g>
);
