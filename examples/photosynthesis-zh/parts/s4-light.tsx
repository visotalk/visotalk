import {Obj, useProp} from '@visotalk/runtime';
import {C, Sun} from './common.tsx';

// Scene 4: the thylakoid membrane. Light splits water; the oxygen leaves the leaf; the energy is
// packed into two carriers, which then set off for the next workshop.
// Props: `light`, `split`, `o2`, `pack`, `move`.
const smooth = (t: number) => Math.max(0, Math.min(1, t));

export const LightReaction = () => {
  const light = useProp('light', 0);
  const split = useProp('split', 0);
  const o2 = useProp('o2', 0);
  const pack = useProp('pack', 0);
  const move = useProp('move', 0);

  const wx = 470, wy = 510;
  const hSpread = 34 + split * 40;
  const oy = wy - 190 * smooth(split) - 150 * smooth(o2);
  const ox = wx + 40 * smooth(o2);

  const cx1 = 1000 + 400 * smooth(move);
  const cx2 = 1260 + 400 * smooth(move);
  const carrierFade = 1;

  return (
    <svg viewBox="0 0 1920 960" width={1920} height={960}>
      {/* the membrane: a slab of stacked layers */}
      <g>
        <rect x={90} y={620} width={1740} height={215} rx={36} fill="#e9f5e2" />
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <rect key={i} x={104} y={636 + i * 27} width={1712} height={13} rx={7} fill={C.leaf} opacity={(0.3 + 0.6 * light).toFixed(3)} />
        ))}
        <rect x={90} y={620} width={1740} height={215} rx={36} fill="none" stroke={C.deep} strokeWidth={6} />
        <text x={120} y={884} fill={C.soft} fontSize={30} fontFamily="var(--vt-sans)">类囊体膜</text>
      </g>

      {/* light */}
      <g opacity={light}>
        <Sun x={215} y={180} r={44} glow={light} />
        <text x={215} y={300} fill={C.ink} fontSize={36} fontFamily="var(--vt-sans)" textAnchor="middle" fontWeight={700}>光</text>
        {[0, 1, 2, 3].map((i) => (
          <line key={i} x1={285 + i * 34} y1={250 + i * 26} x2={420 + i * 118} y2={470 + i * 34} stroke={C.sun} strokeWidth={7} strokeLinecap="round" strokeDasharray="3 15" opacity={0.95} />
        ))}
      </g>

      {/* the water molecule, taken apart */}
      <g>
        <circle cx={wx + hSpread} cy={wy} r={27} fill="#ffffff" stroke={C.water} strokeWidth={5} />
        <text x={wx + hSpread} y={wy + 10} fill={C.water} fontSize={26} fontFamily="var(--vt-sans)" textAnchor="middle" fontWeight={700}>H</text>
        <circle cx={wx - hSpread} cy={wy} r={27} fill="#ffffff" stroke={C.water} strokeWidth={5} />
        <text x={wx - hSpread} y={wy + 10} fill={C.water} fontSize={26} fontFamily="var(--vt-sans)" textAnchor="middle" fontWeight={700}>H</text>
        <g opacity={1 - smooth((split - 0.35) / 0.65)}>
          <circle cx={wx} cy={wy} r={31} fill={C.water} />
          <text x={wx} y={wy + 11} fill="#fff" fontSize={28} fontFamily="var(--vt-sans)" textAnchor="middle" fontWeight={700}>O</text>
        </g>
        <text x={wx} y={wy + 68} fill={C.deep} fontSize={30} fontFamily="var(--vt-sans)" textAnchor="middle" opacity={1 - 0.5 * split}>H₂O</text>
      </g>

      {/* the oxygen, rising out of the leaf */}
      <g opacity={smooth(o2 * 1.6)}>
        <circle cx={ox} cy={oy} r={31} fill="#ffffff" stroke={C.water} strokeWidth={5} />
        <text x={ox} y={oy + 10} fill={C.water} fontSize={28} fontFamily="var(--vt-sans)" textAnchor="middle" fontWeight={700}>O</text>
        <circle cx={ox + 54} cy={oy + 16} r={31} fill="#ffffff" stroke={C.water} strokeWidth={5} />
        <text x={ox + 54} y={oy + 26} fill={C.water} fontSize={28} fontFamily="var(--vt-sans)" textAnchor="middle" fontWeight={700}>O</text>
        <text x={ox + 188} y={oy + 20} fill={C.deep} fontSize={38} fontFamily="var(--vt-sans)" fontWeight={700}>O₂</text>
        <text x={ox + 360} y={oy + 20} fill={C.soft} fontSize={30} fontFamily="var(--vt-sans)">离开叶片</text>
      </g>

      {/* the energy leaving the split water for the carriers */}
      <g opacity={smooth((pack - 0.15) / 0.5) * (1 - smooth(move * 1.4))}>
        {[0, 1].map((i) => (
          <path key={i} d={`M${wx + 40 + i * 26} ${wy - 60} Q ${700 + i * 40} 300 ${915 + i * 300} 360`} fill="none" stroke={C.sun} strokeWidth={5} strokeLinecap="round" strokeDasharray="10 14" opacity={0.75} />
        ))}
      </g>

      {/* the two carriers, filling and then leaving for the stroma */}
      <g opacity={carrierFade}>
        {[
          {x: cx1, name: 'ATP', col: C.sun},
          {x: cx2, name: 'NADPH', col: C.leaf},
        ].map((b) => (
          <g key={b.name}>
            <Obj as="g" id={b.name === 'ATP' ? 'atp' : 'nadph'}>
              <rect x={b.x - 108} y={318} width={216} height={126} rx={20} fill="#ffffff" stroke={b.col} strokeWidth={6} />
              <text x={b.x} y={396} fill={b.col} fontSize={40} fontFamily="var(--vt-sans)" textAnchor="middle" fontWeight={700}>{b.name}</text>
            </Obj>
            {/* the charge, filling from the bottom */}
            <g opacity={smooth(pack)}>
              {[0, 1, 2, 3].map((k) => {
                const h = 30 * smooth(pack * 1.6 - k * 0.16);
                return <rect key={k} x={b.x - 78 + k * 42} y={456 - h} width={30} height={h} rx={5} fill={b.col} opacity={0.9} />;
              })}
            </g>
          </g>
        ))}
      </g>
      <g opacity={smooth((move - 0.4) / 0.4)}>
        <text x={1740} y={286} fill={C.soft} fontSize={30} fontFamily="var(--vt-sans)" textAnchor="end">隔壁车间：基质</text>
      </g>
    </svg>
  );
};
