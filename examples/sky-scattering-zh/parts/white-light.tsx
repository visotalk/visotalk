import {Obj, useProp} from '@visotalk/runtime';
import {SPECTRUM, SANS} from './lib.tsx';

// Scene 1: white sunlight, a prism, and the spectrum it opens into.
const SUN = {x: 96, y: 300};
const ENTRY = {x: 703, y: 300};
const EXIT = {x: 851, y: 402};
const SCREEN_X = 1430;
const BAND_TOP = 196;
const BAND_H = 68;
const BAND_GAP = 68;

export const WhiteLight = () => {
  const beam = useProp('beam', 0);
  const hint = useProp('hint', 0);
  const split = useProp('split', 0);
  const bandY = (i: number) => BAND_TOP + i * BAND_GAP;
  const beamLen = Math.hypot(ENTRY.x - SUN.x, ENTRY.y - SUN.y);

  return (
    <svg viewBox="0 0 1700 740" width={1700} height={740}>
      <defs>
        <radialGradient id="sunGlow">
          <stop offset="0%" stopColor="#FFF6D8" />
          <stop offset="55%" stopColor="#FFE58A" />
          <stop offset="100%" stopColor="#FFC94A" />
        </radialGradient>
        <linearGradient id="hidden" gradientUnits="userSpaceOnUse" x1={SUN.x} y1={SUN.y} x2={ENTRY.x} y2={ENTRY.y}>
          {SPECTRUM.map((c, i) => (
            <stop key={c.key} offset={`${Math.round((i / (SPECTRUM.length - 1)) * 100)}%`} stopColor={c.color} />
          ))}
        </linearGradient>
        <linearGradient id="prismGlass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#EAF2FF" stopOpacity="0.26" />
          <stop offset="100%" stopColor="#9FC4FF" stopOpacity="0.10" />
        </linearGradient>
      </defs>

      {/* the white beam, drawn from the Sun to the prism */}
      <Obj as="g" id="beam">
        <line
          x1={SUN.x}
          y1={SUN.y}
          x2={ENTRY.x}
          y2={ENTRY.y}
          stroke="#FFFFFF"
          strokeWidth={13}
          strokeLinecap="round"
          strokeDasharray={beamLen}
          strokeDashoffset={beamLen * (1 - beam)}
          opacity={0.92}
        />
        <line x1={SUN.x} y1={SUN.y} x2={ENTRY.x} y2={ENTRY.y} stroke="#FFFFFF" strokeWidth={44} strokeLinecap="round" strokeDasharray={beamLen} strokeDashoffset={beamLen * (1 - beam)} opacity={0.1} />
        {SPECTRUM.map((c, i) => {
          const dy = (i - 3) * 2.6;
          return (
            <line
              key={c.key}
              x1={SUN.x + 46}
              y1={SUN.y + dy}
              x2={ENTRY.x}
              y2={ENTRY.y + dy}
              stroke={c.color}
              strokeWidth={3}
              strokeLinecap="round"
              strokeDasharray={beamLen}
              strokeDashoffset={beamLen * (1 - beam)}
              opacity={hint * 0.55}
            />
          );
        })}

      </Obj>

      <Obj as="g" id="sun">
        <circle cx={SUN.x} cy={SUN.y} r={62} fill="#FFE07A" opacity={0.16} />
        <circle cx={SUN.x} cy={SUN.y} r={40} fill="url(#sunGlow)" />
      </Obj>

      <Obj as="g" id="prism">
        <polygon points={`760,118 610,566 910,566`} fill="url(#prismGlass)" stroke="#CFE0FF" strokeOpacity={0.55} strokeWidth={3} strokeLinejoin="round" />
        <line x1={ENTRY.x} y1={ENTRY.y} x2={EXIT.x} y2={EXIT.y} stroke="#FFFFFF" strokeWidth={10} opacity={0.55} strokeLinecap="round" />
      </Obj>

      {/* the fan: seven colours widening out of the prism onto the screen */}
      <Obj as="g" id="fan">
        {SPECTRUM.map((c, i) => {
          const cy = bandY(i) + BAND_H / 2;
          const ox1 = EXIT.x + (SCREEN_X - EXIT.x) * split;
          const ox2 = ox1;
          const oy1 = EXIT.y + (cy - BAND_H / 2 - EXIT.y) * split;
          const oy2 = EXIT.y + (cy + BAND_H / 2 - EXIT.y) * split;
          return (
            <polygon
              key={c.key}
              points={`${EXIT.x},${EXIT.y} ${ox1},${oy1} ${ox2},${oy2}`}
              fill={c.color}
              opacity={0.32 + 0.58 * split}
            />
          );
        })}
      </Obj>

      {/* the screen the spectrum lands on */}
      <Obj as="g" id="screen">
        {SPECTRUM.map((c, i) => (
          <rect key={c.key} x={SCREEN_X} y={bandY(i)} width={150} height={BAND_H} fill={c.color} opacity={split > 0.55 ? 0.92 : 0} />
        ))}
      </Obj>

      <Obj as="g" id="lbl-red">
        <text x={SCREEN_X + 172} y={bandY(0) + 48} fill="#FF6A5E" fontFamily={SANS} fontSize={44} fontWeight={700}>红</text>
      </Obj>
      <Obj as="g" id="lbl-blue">
        <text x={SCREEN_X + 172} y={bandY(5) + 48} fill="#6BA4FF" fontFamily={SANS} fontSize={44} fontWeight={700}>蓝</text>
      </Obj>
    </svg>
  );
};
