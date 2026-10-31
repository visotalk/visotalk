import {useProp} from '@visotalk/runtime';
import {C} from './common.tsx';

// Scene 6: the whole process on one line, built from left to right, then counted on both sides.
// Props: `reactants`, `light`, `products`, `check`, `tone`.
const smooth = (t: number) => Math.max(0, Math.min(1, t));

export const Equation = () => {
  const reactants = useProp('reactants', 0);
  const light = useProp('light', 0);
  const products = useProp('products', 0);
  const check = useProp('check', 0);

  const f = 96;
  const y = 290;
  const op = (v: number) => smooth(v * 2.2);
  const F = {fontFamily: 'var(--vt-sans)', fontWeight: 700, fontSize: f, fill: C.ink} as const;

  const rows = [
    {name: '碳', l: '6', r: '6', at: 0},
    {name: '氢', l: '12', r: '12', at: 0.34},
    {name: '氧', l: '18', r: '18', at: 0.68},
  ];

  return (
    <svg viewBox="0 0 1920 960" width={1920} height={960}>
      {/* left: the inputs */}
      <g opacity={op(reactants)}>
        <text x={130} y={y} {...F}>6 CO₂</text>
        <text x={398} y={y} {...F} fill={C.soft}>+</text>
        <text x={482} y={y} {...F}>6 H₂O</text>
        <text x={790} y={y} {...F} fill={C.soft}>+</text>
        <text x={850} y={y} {...F} fill={C.sun} opacity={smooth(light)}>光</text>
      </g>

      {/* the arrow, driven by light */}
      <g opacity={smooth(light * 1.4)}>
        <line x1={960} y1={y - 30} x2={1150} y2={y - 30} stroke={C.deep} strokeWidth={7} strokeLinecap="round" />
        <path d="M1150 252 L1186 260 L1150 268 Z" fill={C.deep} />
      </g>

      {/* right: the outputs */}
      <g opacity={op(products)}>
        <text x={1210} y={y} {...F} fill={C.deep}>C₆H₁₂O₆</text>
        <text x={1596} y={y} {...F} fill={C.soft}>+</text>
        <text x={1650} y={y} {...F} fill={C.leaf}>6 O₂</text>
      </g>

      {/* under it, plain words */}
      <g opacity={op(reactants * 0.9 - 0.35)}>
        <text x={150} y={y + 96} fill={C.soft} fontSize={34} fontFamily="var(--vt-sans)">二氧化碳 + 水，在光的驱动下，变成糖 + 氧气</text>
      </g>

      {/* the count: the same atoms on both sides */}
      <g opacity={check}>
        <line x1={150} y1={500} x2={1770} y2={500} stroke={C.pale} strokeWidth={3} />
        <text x={150} y={620} fill={C.soft} fontSize={32} fontFamily="var(--vt-sans)">数一数</text>
        {rows.map((r, i) => {
          const on = smooth(check * 1.6 - i * 0.22);
          const ry = 600 + i * 88;
          return (
            <g key={r.name} opacity={on}>
              <text x={470} y={ry} fill={C.ink} fontSize={44} fontFamily="var(--vt-sans)" fontWeight={700}>{r.name}</text>
              <text x={740} y={ry} fill={C.deep} fontSize={44} fontFamily="var(--vt-sans)" textAnchor="middle">{r.l}</text>
              <text x={900} y={ry} fill={C.soft} fontSize={40} fontFamily="var(--vt-sans)" textAnchor="middle">=</text>
              <text x={1060} y={ry} fill={C.deep} fontSize={44} fontFamily="var(--vt-sans)" textAnchor="middle">{r.r}</text>
              <text x={1240} y={ry - 6} fill={C.leaf} fontSize={30} fontFamily="var(--vt-sans)" textAnchor="middle">两边一样</text>
            </g>
          );
        })}
      </g>
    </svg>
  );
};
