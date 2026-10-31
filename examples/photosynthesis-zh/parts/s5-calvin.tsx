import {Obj, useProp} from '@visotalk/runtime';
import {C} from './common.tsx';

// Scene 5: the stroma. CO₂ goes into a wheel; the two carriers give up their charge at the rim;
// each turn of the wheel adds a piece to the sugar being built.
// Props: `co2`, `bind`, `spend`, `turn` (turns of the wheel), `sugar`, `arrive`.
const CX = 880, CY = 470, R = 282;
const smooth = (t: number) => Math.max(0, Math.min(1, t));

const PIECES = 6;

export const Calvin = () => {
  const co2 = useProp('co2', 0);
  const bind = useProp('bind', 0);
  const spend = useProp('spend', 0);
  const turn = useProp('turn', 0);
  const sugar = useProp('sugar', 0);
  const arrive = useProp('arrive', 0);

  const angle = -Math.PI / 2 + turn * Math.PI * 2;
  const dotX = CX + R * Math.cos(angle);
  const dotY = CY + R * Math.sin(angle);

  // the carbon that is caught, riding the wheel
  const incoming = [[260, 760], [330, 840], [210, 660]];

  return (
    <svg viewBox="0 0 1920 960" width={1920} height={960}>
      {/* the cycle */}
      <g>
        <circle cx={CX} cy={CY} r={R} fill="none" stroke={C.pale} strokeWidth={46} />
        <circle cx={CX} cy={CY} r={R} fill="none" stroke={C.leaf} strokeWidth={5} strokeDasharray="14 18" opacity={0.75} />
        {/* the arrowheads that make it a cycle */}
        {[0.15, 0.4, 0.65, 0.9].map((t) => {
          const a = -Math.PI / 2 + t * Math.PI * 2;
          const x = CX + R * Math.cos(a), y = CY + R * Math.sin(a);
          const rot = (a * 180) / Math.PI + 90;
          return <path key={t} d="M0 16 L14 -6 L-14 -6 Z" fill={C.leaf} transform={`translate(${x} ${y}) rotate(${rot})`} opacity={0.8} />;
        })}
        <text x={CX} y={CY - 10} fill={C.ink} fontSize={54} fontFamily="var(--vt-sans)" textAnchor="middle" fontWeight={700}>卡尔文循环</text>
        <text x={CX} y={CY + 52} fill={C.soft} fontSize={30} fontFamily="var(--vt-sans)" textAnchor="middle">一圈，又一圈</text>
      </g>

      {/* the cargo riding the rim */}
      {bind > 0 && (
        <g opacity={smooth(bind * 2)}>
          <circle cx={dotX} cy={dotY} r={30} fill={C.deep} />
          <text x={dotX} y={dotY + 10} fill="#fff" fontSize={26} fontFamily="var(--vt-sans)" textAnchor="middle" fontWeight={700}>C</text>
        </g>
      )}

      {/* CO2 coming in from the air */}
      <g opacity={smooth(co2 * 2)}>
        {incoming.map((p, i) => {
          const t = smooth(co2 * 1.6 - i * 0.12);
          const tx = CX + R * Math.cos(-Math.PI / 2 + 0.9) + i * 16;
          const ty = CY + R * Math.sin(-Math.PI / 2 + 0.9) + i * 16;
          const x = p[0] + (tx - p[0]) * t, y = p[1] + (ty - p[1]) * t;
          return (
            <g key={i} opacity={Math.min(1, t * 3)}>
              <circle cx={x} cy={y} r={16} fill={C.deep} />
              <text x={x} y={y + 8} fill="#fff" fontSize={18} fontFamily="var(--vt-sans)" textAnchor="middle">C</text>
              <circle cx={x + 23} cy={y + 11} r={9} fill={C.sun} />
              <circle cx={x - 23} cy={y + 11} r={9} fill={C.water} />
            </g>
          );
        })}
        <text x={150} y={600} fill={C.deep} fontSize={38} fontFamily="var(--vt-sans)" fontWeight={700}>CO₂</text>
        <text x={150} y={672} fill={C.soft} fontSize={28} fontFamily="var(--vt-sans)">从气孔进来</text>
      </g>

      {/* the two carriers arriving and being spent */}
      <g opacity={smooth(arrive * 2)} transform={`translate(${-(1 - smooth(arrive)) * 230} 0)`}>
        <rect x={1290} y={330} width={196} height={110} rx={18} fill="#ffffff" stroke={C.sun} strokeWidth={6} />
        <text x={1388} y={398} fill={C.sun} fontSize={36} fontFamily="var(--vt-sans)" textAnchor="middle" fontWeight={700} opacity={1 - 0.45 * spend}>ATP</text>
        <rect x={1520} y={330} width={214} height={110} rx={18} fill="#ffffff" stroke={C.leaf} strokeWidth={6} />
        <text x={1627} y={398} fill={C.leaf} fontSize={36} fontFamily="var(--vt-sans)" textAnchor="middle" fontWeight={700} opacity={1 - 0.45 * spend}>NADPH</text>
        <text x={1512} y={290} fill={C.soft} fontSize={28} fontFamily="var(--vt-sans)" textAnchor="middle" opacity={arrive}>从类囊体送来</text>
        {spend > 0 && (
          <g opacity={spend}>
            {[0, 1].map((i) => (
              <path key={i} d={`M${1320 + i * 226} 452 Q ${1120 + i * 90} 560 ${(CX + R * 0.66) | 0} ${(CY + 60) | 0}`} fill="none" stroke={C.sun} strokeWidth={5} strokeDasharray="10 14" opacity={0.8} />
            ))}
            <text x={1512} y={540} fill={C.sun} fontSize={30} fontFamily="var(--vt-sans)" textAnchor="middle" fontWeight={700}>交出能量</text>
          </g>
        )}
      </g>

      {/* the sugar being built, piece by piece */}
      <g>
        <text x={CX - 210} y={838} fill={C.ink} fontSize={36} fontFamily="var(--vt-sans)" textAnchor="end" fontWeight={700}>糖</text>
        {Array.from({length: PIECES}).map((_, k) => {
          const on = smooth(turn * 3 - k);
          const px = CX - 116 + k * 48;
          return (
            <g key={k} opacity={on}>
              <rect x={px} y={812} width={42} height={42} rx={8} fill={on >= 1 ? C.leaf : C.pale} stroke={C.deep} strokeWidth={3} />
            </g>
          );
        })}
        {sugar > 0 && (
          <g opacity={sugar}>
            <rect x={CX - 132} y={798} width={326} height={68} rx={16} fill="none" stroke={C.deep} strokeWidth={4} strokeDasharray="9 9" />
            <text x={CX + 220} y={846} fill={C.deep} fontSize={36} fontFamily="var(--vt-sans)" fontWeight={700}>葡萄糖</text>
          </g>
        )}
      </g>
    </svg>
  );
};
