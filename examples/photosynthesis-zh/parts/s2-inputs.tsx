import {Obj, useProp} from '@visotalk/runtime';
import {C, Leaf, Sun, edge} from './common.tsx';

// Scene 2: the deck's leaf, large and on its diagonal, with its three inputs arriving from the three
// directions the deck gives them: light from above, water up from the roots, carbon dioxide in from the air.
const BASE: [number, number] = [420, 640];
const ROT = -19;
const S = 1.44;
const R = (ROT * Math.PI) / 180;
// a point of the leaf's own frame (x along the midrib from the base, y across it) in canvas coordinates
const T = (lx: number, ly: number): [number, number] => [
  Math.round(BASE[0] + S * (lx * Math.cos(R) - ly * Math.sin(R))),
  Math.round(BASE[1] + S * (lx * Math.sin(R) + ly * Math.cos(R))),
];
const MEET = T(330, 0);
const INSIDE = T(400, 45);
const INSIDE2 = T(250, 95);
const LAND = [T(190, -edge(190) * 0.9), T(320, -edge(320) * 0.9), T(460, -edge(460) * 0.9), T(575, -edge(575) * 0.82)];

export const Inputs = () => {
  const sun = useProp('sun', 0);
  const ray = useProp('ray', 0);
  const water = useProp('water', 0);
  const co2 = useProp('co2', 0);
  const meet = useProp('meet', 0);
  const close = useProp('close', 0);

  const wx = 230 + (BASE[0] + 10 - 230) * water;
  const wy = 855 + (BASE[1] + 10 - 855) * water;
  const mol = [[1830, 860], [1870, 790], [1750, 830], [1840, 720]];

  return (
    <svg viewBox="0 0 1920 960" width={1920} height={960}>
      <g opacity={1 - close} transform={`translate(960 560) scale(${(1 - close * 0.28).toFixed(3)}) translate(-960 -560)`}>
        <Leaf x={BASE[0]} y={BASE[1]} s={S} rot={ROT} />

        {/* light */}
        <g opacity={sun}>
          <Sun x={1665} y={190} r={50} glow={ray} />
          <text x={1665} y={316} fill={C.ink} fontSize={40} fontFamily="var(--vt-sans)" textAnchor="middle" fontWeight={700}>光</text>
          {LAND.map((p, i) => {
            const t = Math.max(0, Math.min(1, ray * 1.7 - i * 0.16));
            if (t <= 0) return null;
            const x0 = 1600 - i * 24, y0 = 254 + i * 6;
            const x1 = x0 + (p[0] - x0) * t, y1 = y0 + (p[1] - y0) * t;
            return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} stroke={C.sun} strokeWidth={6} strokeLinecap="round" strokeDasharray="3 15" opacity={0.9} />;
          })}
        </g>

        {/* water, up from the roots into the base of the leaf */}
        <g opacity={water}>
          <path d={`M${wx} ${wy - 52} C${wx + 40} ${wy - 6} ${wx + 40} ${wy + 32} ${wx} ${wy + 32} C${wx - 40} ${wy + 32} ${wx - 40} ${wy - 6} ${wx} ${wy - 52} Z`} fill={C.water} />
          <text x={wx - 52} y={wy + 12} fill={C.deep} fontSize={36} fontFamily="var(--vt-sans)" textAnchor="end">H₂O</text>
          <text x={120} y={560} fill={C.soft} fontSize={34} fontFamily="var(--vt-sans)">水，来自根部</text>
        </g>

        {/* carbon dioxide, in from the air on the underside */}
        <g opacity={co2}>
          {mol.map((p, i) => {
            const t = Math.max(0, Math.min(1, co2 * 1.7 - i * 0.1));
            const dst = i % 2 === 0 ? INSIDE : INSIDE2;
            const x = p[0] + (dst[0] + i * 14 - p[0]) * t;
            const y = p[1] + (dst[1] + i * 10 - p[1]) * t;
            return (
              <g key={i} opacity={Math.min(1, t * 4)}>
                <circle cx={x} cy={y} r={15} fill={C.deep} />
                <text x={x} y={y + 8} fill="#fff" fontSize={18} fontFamily="var(--vt-sans)" textAnchor="middle">C</text>
                <circle cx={x + 22} cy={y + 10} r={9} fill={C.sun} />
                <circle cx={x - 22} cy={y + 10} r={9} fill={C.water} />
              </g>
            );
          })}
          <text x={1706} y={650} fill={C.deep} fontSize={44} fontFamily="var(--vt-sans)" textAnchor="end" fontWeight={700}>CO₂</text>
          <text x={1706} y={706} fill={C.soft} fontSize={32} fontFamily="var(--vt-sans)" textAnchor="end">来自空气</text>
          <path d="M1690 626 Q 1560 600 1470 566" fill="none" stroke={C.deep} strokeWidth={4} strokeDasharray="7 10" opacity={0.6} />
        </g>

        {/* the point where all three meet */}
        {meet > 0 && (
          <g opacity={meet}>
            <circle cx={MEET[0]} cy={MEET[1]} r={40 + meet * 10} fill="none" stroke={C.sun} strokeWidth={7} opacity={0.95} />
            <circle cx={MEET[0]} cy={MEET[1]} r={40 + meet * 10} fill="#fbf5e6" opacity={0.25} />
            <circle cx={MEET[0]} cy={MEET[1]} r={14} fill={C.sun} stroke="#ffffff" strokeWidth={4} />
          </g>
        )}
      </g>
    </svg>
  );
};

export const MeetLabel = () => {
  const s = useProp('s', 0);
  return (
    <div style={{fontFamily: 'var(--vt-sans)', color: C.deep, fontSize: 42, fontWeight: 700, opacity: s, whiteSpace: 'nowrap', transform: `translateY(${(1 - s) * 12}px)`}}>
      三样在这里碰面
    </div>
  );
};

export const WhereQ = () => {
  const s = useProp('s', 0);
  return (
    <div style={{fontFamily: 'var(--vt-sans)', color: C.ink, fontSize: 76, fontWeight: 700, opacity: s, lineHeight: 1.25, textAlign: 'center'}}>
      它们在叶子的<span style={{color: C.leaf}}>哪里</span>碰面？
    </div>
  );
};
