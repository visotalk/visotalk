import {Obj, useProp} from '@visotalk/runtime';

// One atmosphere, two routes through it. At midday the Sun is overhead and its ray drops
// straight through the layer; at sunset the Sun sits at the horizon and its ray crosses
// the whole layer sideways. `slant` brings the evening Sun down; `lost` sends the blue off the long ray.
const TOP = 210;        // the top of the atmosphere
const GROUND = 600;     // the ground
const EYE = {x: 1470, y: 486};
const NOON = {x: 1470, y: 60};
const sunX = (slant: number) => 90 + 30 * slant;
const sunY = (slant: number) => 60 + (GROUND - 70) * slant;

export const Paths = () => {
  const slant = useProp('slant', 0);
  const lost = useProp('lost', 0);
  const glow = useProp('glow', 0);
  return (
    <svg viewBox="0 0 1600 660" width={1600} height={660}>
      {/* the atmosphere: everything between the top of the layer and the ground */}
      <rect x={0} y={TOP} width={1600} height={GROUND - TOP} fill="rgba(120,170,255,0.07)" />
      <line x1={0} y1={TOP} x2={1600} y2={TOP} stroke="rgba(150,190,255,0.35)" strokeWidth={2} strokeDasharray="10 12" />
      <rect x={0} y={GROUND} width={1600} height={660 - GROUND} fill="rgba(255,255,255,0.09)" />
      <line x1={0} y1={GROUND} x2={1600} y2={GROUND} stroke="rgba(255,255,255,0.55)" strokeWidth={3} />

      {/* midday: straight down, only the depth of the layer */}
      <Obj as="g" id="noon">
        <line x1={NOON.x} y1={NOON.y + 40} x2={EYE.x} y2={EYE.y - 30} stroke="#ffffff" strokeWidth={13} strokeLinecap="round" />
        <circle cx={NOON.x} cy={NOON.y} r={38} fill="#ffffff" />
        <text x={NOON.x - 300} y={NOON.y + 14} fill="var(--vt-muted)" fontSize={38} fontFamily="var(--vt-sans)">short path</text>
      </Obj>

      {/* the eye both rays reach */}
      <Obj as="g" id="eye">
        <path d="M 1432 486 q 38 -40 76 0 q -38 40 -76 0 z" fill="none" stroke="var(--vt-text)" strokeWidth={6} />
        <circle cx={1470} cy={486} r={12} fill="var(--vt-text)" />
      </Obj>

      {/* sunset: the Sun at the horizon, its ray crossing the whole layer */}
      <g opacity={slant}>
        <line x1={sunX(slant) + 40} y1={sunY(slant)} x2={EYE.x - 80} y2={EYE.y} stroke="#ff8a4c" strokeWidth={13 + glow * 5} strokeLinecap="round" opacity={0.85 + glow * 0.15} />
        <circle cx={sunX(slant)} cy={sunY(slant)} r={38} fill="#ffb066" />
        <text x={430} y={512} opacity={slant} fill="var(--vt-muted)" fontSize={38} fontFamily="var(--vt-sans)">long path</text>
      </g>

      {/* the blue leaving the long beam on its way */}
      <g opacity={lost}>
        {[0.2, 0.36, 0.52, 0.68, 0.84].map((p, i) => {
          const x = 120 + (EYE.x - 80 - 120) * p;
          const y = sunY(1) + (EYE.y - sunY(1)) * p;
          return <line key={i} x1={x} y1={y} x2={x - 60} y2={y - 150} stroke="#3b82f6" strokeWidth={9} strokeLinecap="round" opacity={0.95} />;
        })}
      </g>
    </svg>
  );
};
