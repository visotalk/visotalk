import {Obj, useProp} from '@visotalk/runtime';
import {BLUE, PALE, SANS, mix, molecules} from './lib.tsx';

// Scene 3: the blue taken out of the beam fills the whole sky; the direct beam that reaches the eye has lost it.
const MOLS = molecules('sky-field', 80, 1700, 620);
const SUN = {x: 90, y: 150};
const EYE = {x: 830, y: 600};

export const SkyFill = () => {
  const haze = useProp('haze', 0);
  const beamTint = useProp('tint', 0);
  return (
    <svg viewBox="0 0 1700 740" width={1700} height={740}>
      <defs>
        <radialGradient id="skyGrad" cx="0.5" cy="0.62" r="0.78">
          <stop offset="0%" stopColor={mix('#0B0E14', BLUE, 0.35)} />
          <stop offset="100%" stopColor={mix('#0B0E14', BLUE, 0.92)} />
        </radialGradient>
        <linearGradient id="directGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="65%" stopColor={mix('#FFFFFF', PALE, beamTint)} />
          <stop offset="100%" stopColor={mix(PALE, '#FFC24B', beamTint)} />
        </linearGradient>
      </defs>

      {/* the air, and the blue that fills it */}
      <Obj as="g" id="haze">
        <rect x={0} y={0} width={1700} height={700} fill="url(#skyGrad)" opacity={haze} />
        {MOLS.map((m, i) => (
          <circle key={i} cx={m.x} cy={m.y} r={m.s / 2 + 1} fill="#DCEBFF" opacity={0.3 * haze * (0.5 + ((i * 11) % 5) * 0.14)} />
        ))}
      </Obj>

      {/* where the blue in the sky comes from: short rays out of the molecules, toward the eye */}
      <Obj as="g" id="to-eye">
        {MOLS.filter((_, i) => i % 6 === 0).map((m, i) => (
          <line key={i} x1={m.x} y1={m.y} x2={EYE.x} y2={EYE.y} stroke={BLUE} strokeWidth={3} opacity={0.5 * haze} strokeDasharray="7 10" />
        ))}
      </Obj>

      <Obj as="g" id="sun">
        <circle cx={SUN.x} cy={SUN.y} r={44} fill={mix('#FFF6D8', PALE, 1 - beamTint)} />
      </Obj>

      {/* the direct beam into the eye, losing its blue on the way */}
      <Obj as="g" id="direct">
        <line x1={SUN.x} y1={SUN.y} x2={EYE.x} y2={EYE.y} stroke="url(#directGrad)" strokeWidth={14} strokeLinecap="round" />
      </Obj>

      <Obj as="g" id="eye">
        <ellipse cx={EYE.x} cy={EYE.y} rx={46} ry={28} fill="#1A2233" stroke="#E8ECF4" strokeWidth={4} />
        <circle cx={EYE.x} cy={EYE.y} r={13} fill="#E8ECF4" />
        <circle cx={EYE.x} cy={EYE.y} r={6} fill="#0B0E14" />
      </Obj>

      <Obj as="g" id="lbl-sky">
        <text x={1240} y={150} fill="#8FB8FF" fontFamily={SANS} fontSize={46} fontWeight={700} textAnchor="middle">散射进眼睛的光</text>
      </Obj>
      <Obj as="g" id="lbl-direct">
        <text x={470} y={445} fill={PALE} fontFamily={SANS} fontSize={42} fontWeight={700} textAnchor="middle">直射的阳光</text>
      </Obj>
      <Obj as="g" id="warn">
        <text x={1190} y={610} fill="#FFB4A8" fontFamily={SANS} fontSize={42} fontWeight={700} textAnchor="middle">切勿直视太阳</text>
      </Obj>
    </svg>
  );
};
