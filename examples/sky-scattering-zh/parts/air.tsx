import {Obj, useProp, useTime} from '@visotalk/runtime';
import {RED, BLUE, SANS, molecules, rays} from './lib.tsx';

// Scene 2: the beam meets the air's molecules; one molecule scatters light everywhere; blue leaves the beam, red goes on.
const MOLS = molecules('air-field', 90, 1660, 700);
const ONE = {x: 470, y: 300};
const RAYS_BLUE = rays(ONE.x, ONE.y, 14, 210);
const RAYS_RED = rays(ONE.x, ONE.y, 14, 210);

export const AirField = () => {
  const appear = useProp('field', 0);
  const dim = useProp('dim', 0);
  const t = useTime();
  return (
    <svg viewBox="0 0 1660 700" width={1660} height={700}>
      <Obj as="g" id="field">
        {MOLS.map((m, i) => (
          <circle
            key={i}
            cx={m.x}
            cy={m.y}
            r={(m.s / 2) * appear}
            fill="#BFD2F0"
            opacity={(0.22 + ((i * 13) % 7) * 0.06) * (1 - dim * 0.62) * Math.min(1, appear * 1.4)}
          />
        ))}
      </Obj>
      <Obj as="g" id="beam">
        <line x1={0} y1={300} x2={1658} y2={300} stroke="#FFFFFF" strokeWidth={12} strokeLinecap="round" opacity={0.85 * (1 - dim * 0.82)} />
        <line x1={0} y1={300} x2={1658} y2={300} stroke="#FFFFFF" strokeWidth={40} strokeLinecap="round" opacity={0.09 * (1 - dim * 0.8)} />
      </Obj>
      <Obj as="g" id="lbl-air">
        <text x={40} y={96} fill="var(--vt-muted)" fontFamily={SANS} fontSize={38}>空气分子</text>
      </Obj>
      {/* the one molecule, magnified: a scatter centre */}
      <Obj as="g" id="one">
        <circle cx={ONE.x} cy={ONE.y} r={30} fill="none" stroke="#FFFFFF" strokeOpacity={0.5} strokeWidth={2} strokeDasharray="5 9" />
        <circle cx={ONE.x} cy={ONE.y} r={15} fill="#DCE8FF" />
      </Obj>
    </svg>
  );
};

// The light thrown out of one molecule, blue and red side by side.
export const ScatterOne = () => {
  const reach = useProp('reach', 0);
  return (
    <svg viewBox="0 0 1660 700" width={1660} height={700}>
      <Obj as="g" id="mol">
        <circle cx={ONE.x} cy={ONE.y} r={17} fill="#EAF2FF" />
      </Obj>
      <Obj as="g" id="rays-blue">
        {RAYS_BLUE.map((r, i) => (
          <line
            key={i}
            x1={r.x1}
            y1={r.y1}
            x2={r.x1 + (r.x2 - r.x1) * reach}
            y2={r.y1 + (r.y2 - r.y1) * reach}
            stroke={BLUE}
            strokeWidth={5}
            strokeLinecap="round"
            opacity={0.9}
          />
        ))}
      </Obj>
      <Obj as="g" id="lbl-scatter">
        <text x={ONE.x + 250} y={ONE.y - 84} fill="var(--vt-text)" fontFamily={SANS} fontSize={44} fontWeight={700}>散射</text>
      </Obj>
    </svg>
  );
};

// Two wavelengths crossing the same slab of air: blue is deflected again and again, red keeps its line.
export const TwoWaves = () => {
  const scatter = useProp('scatter', 0);
  return (
    <svg viewBox="0 0 1660 700" width={1660} height={700}>
      <Obj as="g" id="blue-path">
        <line x1={40} y1={250} x2={1620} y2={250} stroke={BLUE} strokeWidth={6} opacity={0.18} strokeDasharray="10 14" />
        {Array.from({length: 9}, (_, i) => {
          const x = 210 + i * 165;
          const a = -0.9 + ((i * 5) % 4) * 0.6;
          const l = 92 * scatter;
          return (
            <line key={i} x1={x} y1={250} x2={Math.round(x + Math.cos(a) * l)} y2={Math.round(250 + Math.sin(a) * l)} stroke={BLUE} strokeWidth={6} strokeLinecap="round" opacity={0.95} />
          );
        })}
      </Obj>
      <Obj as="g" id="red-path">
        <line x1={40} y1={470} x2={1620} y2={470} stroke={RED} strokeWidth={7} strokeLinecap="round" opacity={0.95} />
      </Obj>
      <Obj as="g" id="lbl-blue">
        <text x={1652} y={196} fill={BLUE} fontFamily={SANS} fontSize={42} fontWeight={700} textAnchor="end">蓝光 · 短波</text>
      </Obj>
      <Obj as="g" id="lbl-red">
        <text x={1652} y={540} fill={RED} fontFamily={SANS} fontSize={42} fontWeight={700} textAnchor="end">红光 · 长波</text>
      </Obj>
    </svg>
  );
};
