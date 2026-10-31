import {Obj, useProp} from '@visotalk/runtime';
import {SANS, bandPath, beamSegments, groundPath, surfY, topY} from './lib.tsx';

// Scenes 5 and 6: the Earth in side view. The low Sun's beam crosses far more air, and blue is scattered out of it along the way.
const SUN = {x: 150, y: 648};
const EYE = {x: 1490, y: 582};

export const Skim = () => {
  const air = useProp('air', 0);
  const ray = useProp('ray', 0);
  const low = useProp('low', 0);
  const tint = useProp('tint', 0);
  const eye = useProp('eye', 0);

  const segs = beamSegments(SUN.x, SUN.y, EYE.x, EYE.y, tint, '#FF4B3E', 56);

  return (
    <svg viewBox="0 180 1700 600" width={1700} height={600}>
      <Obj as="g" id="air">
        <path d={bandPath(10, 1690)} fill="#22405F" opacity={0.6 * air} />
        <path d={bandPath(10, 1690)} fill="none" stroke="#6E96C4" strokeWidth={2} opacity={0.55 * air} />
        <path d={groundPath(10, 1690)} fill="#161E2C" />
        <path d={groundPath(10, 1690)} fill="none" stroke="#7E96B4" strokeWidth={3} opacity={air} />
      </Obj>

      <Obj as="g" id="low-sun">
        <circle cx={SUN.x} cy={SUN.y} r={40} fill="#FFDA92" opacity={low} />
        <circle cx={SUN.x} cy={SUN.y} r={74} fill="#FFDA92" opacity={0.1 * low} />
        <text x={SUN.x + 66} y={SUN.y - 66} fill="var(--vt-muted)" fontFamily={SANS} fontSize={40} opacity={low}>傍晚</text>
      </Obj>

      <Obj as="g" id="low-path">
        {segs.map((s) => (
          <line key={s.key} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={s.color} strokeWidth={8} opacity={ray} strokeLinecap="round" />
        ))}
        {/* blue leaves the beam, step by step, all along the long way */}
        {[0.22, 0.36, 0.49, 0.62, 0.74, 0.86].map((f, i) => {
          const x = Math.round(SUN.x + (EYE.x - SUN.x) * f);
          const y = Math.round(SUN.y + (EYE.y - SUN.y) * f);
          return (
            <g key={i} opacity={ray * tint}>
              <circle cx={x} cy={y - 40} r={7} fill="#4C8CFF" opacity={0.9} />
              <circle cx={x + 30} cy={y - 76} r={5} fill="#4C8CFF" opacity={0.55} />
              <circle cx={x - 26} cy={y - 92} r={5} fill="#4C8CFF" opacity={0.38} />
            </g>
          );
        })}
      </Obj>

      <Obj as="g" id="eye">
        <ellipse cx={EYE.x} cy={EYE.y - 46} rx={44} ry={27} fill="#0E1420" stroke="#E8ECF4" strokeWidth={4} opacity={eye} />
        <circle cx={EYE.x} cy={EYE.y - 46} r={12} fill="#E8ECF4" opacity={eye} />
        <circle cx={EYE.x + 3} cy={EYE.y - 46} r={5} fill="#0E1420" opacity={eye} />
      </Obj>

      <Obj as="g" id="lbl-thick">
        <text x={1010} y={topY(1010) - 26} fill="#9DBCE2" fontFamily={SANS} fontSize={40} opacity={air}>厚得多的大气</text>
      </Obj>
      <Obj as="g" id="lbl-red-share">
        <text x={1150} y={730} fill="#FF9E7A" fontFamily={SANS} fontSize={44} fontWeight={700} textAnchor="middle" opacity={eye * tint}>到达眼睛的直射光：红橙为主</text>
      </Obj>
    </svg>
  );
};

// The same sky twice: noon blue above, sunset red above; only the length of the path differs.
export const Compare = () => {
  const dusk = useProp('dusk', 0);
  const noon = useProp('noon', 0);
  return (
    <svg viewBox="0 0 1700 780" width={1700} height={780}>
      <defs>
        <linearGradient id="noonSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2C74D8" />
          <stop offset="100%" stopColor="#8CBEFF" />
        </linearGradient>
        <linearGradient id="duskSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3B3A6E" />
          <stop offset="55%" stopColor="#E87247" />
          <stop offset="100%" stopColor="#FFC65E" />
        </linearGradient>
      </defs>
      <Obj as="g" id="dusk-panel">
        <rect x={890} y={186} width={700} height={468} rx={14} fill="url(#duskSky)" opacity={dusk} />
      </Obj>
      <Obj as="g" id="noon-panel">
        <rect x={90} y={186} width={700} height={468} rx={14} fill="url(#noonSky)" opacity={noon} />
        <text x={440} y={716} fill="#8FB8FF" fontFamily={SANS} fontSize={42} fontWeight={700} textAnchor="middle" opacity={noon}>正午 · 短路径</text>
        <line x1={430} y1={250} x2={430} y2={596} stroke="#FFFFFF" strokeWidth={6} strokeLinecap="round" opacity={noon} />
        <polygon points="430,620 418,594 442,594" fill="#FFFFFF" opacity={noon} />
        <circle cx={430} cy={236} r={24} fill="#FFF6D8" opacity={noon} />
      </Obj>
      <Obj as="g" id="dusk-arrow">
        <text x={1240} y={716} fill="#FFB27A" fontFamily={SANS} fontSize={42} fontWeight={700} textAnchor="middle" opacity={dusk}>日落 · 长路径</text>
        <line x1={1440} y1={276} x2={1030} y2={578} stroke="#FFFFFF" strokeWidth={6} strokeLinecap="round" opacity={dusk} />
        <polygon points="1010,592 1020,568 1036,589" fill="#FFFFFF" opacity={dusk} />
        <circle cx={1462} cy={256} r={28} fill="#FFE9A8" opacity={dusk} />
      </Obj>
    </svg>
  );
};
