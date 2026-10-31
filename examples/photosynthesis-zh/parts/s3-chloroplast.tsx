import {useProp} from '@visotalk/runtime';
import {C} from './common.tsx';

// Scene 3: from the leaf's flesh cell to one chloroplast, then its two workshops.
// One picture, its numbers tweened: `cell` (fades), `grow` (the chloroplast swells), `split`,
// `lightOn`, `carbonOn`. The chloroplast settles with room for the two labels under it.

const GRANA = [
  {x: 430, y: 235, n: 6},
  {x: 610, y: 205, n: 7},
  {x: 780, y: 245, n: 6},
  {x: 525, y: 385, n: 5},
  {x: 700, y: 420, n: 5},
  {x: 855, y: 395, n: 4},
];

export const Chloroplast = () => {
  const cell = useProp('cell', 0);
  const grow = useProp('grow', 0);
  const split = useProp('split', 0);
  const lightOn = useProp('lightOn', 0);
  const carbonOn = useProp('carbonOn', 0);

  const s = 0.14 + 0.86 * grow;
  return (
    <svg viewBox="0 0 1920 960" width={1920} height={960}>
      {/* the flesh cell, while the frame is still wide */}
      <g opacity={cell} transform={`translate(960 440) scale(${1 - grow * 0.4}) translate(-960 -440)`}>
        <rect x={250} y={130} width={1420} height={620} rx={90} fill="#eef7e8" stroke={C.leaf} strokeWidth={9} />
        <rect x={278} y={158} width={1364} height={564} rx={74} fill="none" stroke={C.leaf} strokeWidth={3} opacity={0.4} />
        {[[420, 260], [660, 230], [880, 250], [1110, 235], [1330, 260], [470, 430], [700, 400], [930, 420], [1160, 400], [1380, 430], [520, 590], [780, 610], [1030, 600], [1270, 620], [880, 340], [1200, 520]].map((p, i) => (
          <ellipse key={i} cx={p[0]} cy={p[1]} rx={74} ry={46} fill={C.leaf} opacity={0.8} transform={`rotate(${(i % 3) * 22 - 22} ${p[0]} ${p[1]})`} />
        ))}
      </g>

      {/* the chloroplast */}
      <g transform={`translate(960 366) scale(${s}) translate(-960 -366)`}>
        <ellipse cx={960} cy={366} rx={792} ry={286} fill={C.pale} stroke={C.deep} strokeWidth={grow > 0.85 ? 6 : 12} />
        <ellipse cx={960} cy={366} rx={764} ry={260} fill="#e9f5e2" />

        {/* the thylakoid: stacks of membranes on the left */}
        {GRANA.map((g, i) => (
          <g key={i}>
            {Array.from({length: g.n}).map((_, k) => (
              <ellipse key={k} cx={g.x} cy={g.y + k * 16} rx={84} ry={14} fill={C.leaf} opacity={0.5 + 0.5 * lightOn} stroke={C.deep} strokeWidth={1.4} />
            ))}
          </g>
        ))}

        {/* light falling on the membranes, from the upper left */}
        {lightOn > 0 && (
          <g opacity={lightOn}>
            {[0, 1, 2].map((i) => (
              <line key={i} x1={80 + i * 30} y1={40 + i * 34} x2={380 + i * 130} y2={180 + i * 90} stroke={C.sun} strokeWidth={7} strokeLinecap="round" strokeDasharray="3 15" opacity={0.95} />
            ))}
          </g>
        )}

        {/* the divider between the two workshops */}
        {split > 0 && (
          <line x1={1010} y1={95} x2={1010} y2={640} stroke={C.deep} strokeWidth={4} strokeDasharray="10 12" opacity={0.6 * split} />
        )}

        {/* carbon into the fluid side */}
        {carbonOn > 0 && (
          <g opacity={carbonOn}>
            {[[1660, 470], [1720, 560], [1580, 590]].map((p, i) => (
              <g key={i}>
                <circle cx={p[0]} cy={p[1]} r={16} fill={C.deep} />
                <text x={p[0]} y={p[1] + 8} fill="#fff" fontSize={19} fontFamily="var(--vt-sans)" textAnchor="middle">C</text>
                <circle cx={p[0] + 24} cy={p[1] + 12} r={10} fill={C.sun} />
                <circle cx={p[0] - 24} cy={p[1] + 12} r={10} fill={C.water} />
              </g>
            ))}
            <path d="M1560 490 L 1180 420" stroke={C.deep} strokeWidth={4} strokeDasharray="8 12" opacity={0.65} />
          </g>
        )}
      </g>
    </svg>
  );
};

export const ChloroLabel = () => {
  const s = useProp('s', 0);
  return (
    <div style={{fontFamily: 'var(--vt-sans)', fontSize: 70, fontWeight: 700, color: C.deep, opacity: s, whiteSpace: 'nowrap'}}>叶绿体</div>
  );
};

export const WorkshopLabels = () => {
  const a = useProp('a', 0);
  const b = useProp('b', 0);
  const wrap = (o: number): React.CSSProperties => ({opacity: o, transform: `translateY(${(1 - o) * 14}px)`});
  return (
    <div style={{width: '100%', height: '100%', position: 'relative', fontFamily: 'var(--vt-sans)'}}>
      <div style={{...wrap(a), position: 'absolute', left: 0, top: 0, width: 520}}>
        <div style={{fontSize: 50, fontWeight: 700, color: C.leaf}}>类囊体</div>
        <div style={{fontSize: 30, color: C.soft, marginTop: 8}}>一层层叠起来的膜 · 抓住光</div>
      </div>
      <div style={{...wrap(b), position: 'absolute', left: 700, top: 0, width: 520}}>
        <div style={{fontSize: 50, fontWeight: 700, color: C.deep}}>基质</div>
        <div style={{fontSize: 30, color: C.soft, marginTop: 8}}>周围的液体 · 把碳变成糖</div>
      </div>
    </div>
  );
};
