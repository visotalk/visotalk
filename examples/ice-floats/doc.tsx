import {Doc, Scene, Line, Part, Animation, Appear, Disappear, Tween} from '@visotalk/jsx';
import {useProp, useTime, Obj} from '@visotalk/runtime';

// ---- Geometry (canvas px) -------------------------------------------------
const TANK = {left: 140, right: 1160, top: 240, bottom: 860, surface: 330};
const CX = 650; // cube centre x
const SINK_CY = 630; // cube centre while still liquid: fully under water
const ICE_SIDE = 376; // the lattice is wider than the liquid it came from
const LIQUID_SIDE = 340;
const FLOAT_TOP = TANK.surface - Math.round(ICE_SIDE * 0.09); // about nine percent of the ice stands above the surface
const FLOAT_CY = FLOAT_TOP + ICE_SIDE / 2;

// ---- Molecules: an open honeycomb (ice) and a packed jittered grid (liquid) --
const BOND = 34;
const frac = (v: number) => v - Math.floor(v);
const hash = (i: number, k: number) => frac(Math.sin(i * 12.9898 + k * 78.233) * 43758.5453);

function honeycomb(): {x: number; y: number}[] {
  const seen = new Set<string>();
  const pts: {x: number; y: number}[] = [];
  const step = Math.sqrt(3) * BOND;
  const half = ICE_SIDE / 2 - 8;
  for (let row = -9; row <= 9; row++) {
    for (let col = -9; col <= 9; col++) {
      const cx = col * step + (row % 2 ? step / 2 : 0);
      const cy = row * BOND * 1.5;
      for (let k = 0; k < 6; k++) {
        const a = Math.PI / 6 + (k * Math.PI) / 3;
        const x = cx + BOND * Math.cos(a);
        const y = cy + BOND * Math.sin(a);
        if (Math.abs(x) > half || Math.abs(y) > half) continue;
        const key = `${Math.round(x)},${Math.round(y)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        pts.push({x, y});
      }
    }
  }
  return pts.sort((a, b) => a.y - b.y || a.x - b.x);
}

const ICE = honeycomb();
const COLS = Math.ceil(Math.sqrt(ICE.length));
const CELL = LIQUID_SIDE / COLS;
const LIQUID = ICE.map((_, i) => {
  const c = i % COLS;
  const r = Math.floor(i / COLS);
  return {
    x: -LIQUID_SIDE / 2 + CELL * (c + 0.5) + (hash(i, 1) - 0.5) * CELL * 0.5,
    y: -LIQUID_SIDE / 2 + CELL * (r + 0.5) + (hash(i, 2) - 0.5) * CELL * 0.5,
  };
});
const BONDS: [number, number][] = [];
for (let i = 0; i < ICE.length; i++) {
  for (let j = i + 1; j < ICE.length; j++) {
    if (Math.hypot(ICE[i].x - ICE[j].x, ICE[i].y - ICE[j].y) < BOND * 1.05) BONDS.push([i, j]);
  }
}
const AMBIENT = Array.from({length: 90}, (_, i) => ({
  x: TANK.left + 30 + hash(i, 3) * (TANK.right - TANK.left - 60),
  y: TANK.surface + 40 + hash(i, 4) * (TANK.bottom - TANK.surface - 70),
  ph: hash(i, 5) * 6.28,
}));

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const WATER = 'hsl(205 80% 58%)';
const ICE_TINT = 'hsl(190 90% 80%)';

// ---- The tank: water, and one block that freezes and floats up ------------
function Tank() {
  const t = useTime();
  const freeze = useProp('tank', 'freeze', 0);
  const rise = useProp('tank', 'rise', 0);
  const bob = Math.sin(t * 1.6) * 3 * rise;
  const cy = lerp(SINK_CY, FLOAT_CY, rise) + bob;
  const side = lerp(LIQUID_SIDE, ICE_SIDE, freeze);
  const waveY = (x: number) => TANK.surface + Math.sin(x / 70 + t * 1.4) * 4;
  const wave = Array.from({length: 35}, (_, i) => {
    const x = TANK.left + (i * (TANK.right - TANK.left)) / 34;
    return `${i ? 'L' : 'M'}${x.toFixed(1)} ${waveY(x).toFixed(1)}`;
  }).join(' ');
  const pos = (i: number) => {
    const wob = lerp(5, 1, freeze);
    return {
      x: CX + lerp(LIQUID[i].x, ICE[i].x, freeze) + Math.sin(t * 2.1 + i) * wob * (1 - freeze * 0.8),
      y: cy + lerp(LIQUID[i].y, ICE[i].y, freeze) + Math.cos(t * 1.9 + i * 1.7) * wob * (1 - freeze * 0.8),
    };
  };
  const bondOpacity = Math.max(0, (freeze - 0.55) / 0.45);
  const cubeStroke = `hsl(190 90% ${lerp(60, 82, freeze)}%)`;
  return (
    <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{position: 'absolute', left: 0, top: 0}}>
      <defs>
        <linearGradient id="water-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={WATER} stopOpacity="0.30" />
          <stop offset="1" stopColor={WATER} stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id="water-front" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={WATER} stopOpacity="0.22" />
          <stop offset="1" stopColor={WATER} stopOpacity="0.04" />
        </linearGradient>
      </defs>
      <Obj as="g" id="water">
        <path d={`M${TANK.left} ${TANK.top} V${TANK.bottom - 20} Q${TANK.left} ${TANK.bottom} ${TANK.left + 20} ${TANK.bottom} H${TANK.right - 20} Q${TANK.right} ${TANK.bottom} ${TANK.right} ${TANK.bottom - 20} V${TANK.top}`}
          fill="none" stroke="var(--vt-border)" strokeWidth={4} strokeLinecap="round" />
        <path d={`${wave} V${TANK.bottom - 20} Q${TANK.right} ${TANK.bottom} ${TANK.right - 20} ${TANK.bottom} H${TANK.left + 20} Q${TANK.left} ${TANK.bottom} ${TANK.left} ${TANK.bottom - 20} Z`} fill="url(#water-fill)" />
        <path d={wave} fill="none" stroke={WATER} strokeWidth={4} strokeLinecap="round" />
        {AMBIENT.map((a, i) => (
          <circle key={i} cx={a.x + Math.sin(t * 1.3 + a.ph) * 5} cy={a.y + Math.cos(t * 1.1 + a.ph) * 5} r={5} fill={WATER} opacity={0.35} />
        ))}
      </Obj>
      <Obj as="g" id="cube">
        <rect x={CX - side / 2} y={cy - side / 2} width={side} height={side} rx={22} fill="hsl(215 30% 11%)" fillOpacity={0.92}
          stroke={cubeStroke} strokeWidth={freeze > 0.5 ? 5 : 3} strokeDasharray={freeze > 0.05 ? undefined : '12 10'} />
        <rect x={CX - side / 2} y={cy - side / 2} width={side} height={side} rx={22} fill={ICE_TINT} fillOpacity={0.10 * freeze} />
        {BONDS.map(([i, j]) => {
          const p = pos(i);
          const q = pos(j);
          return <line key={`${i}-${j}`} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={ICE_TINT} strokeWidth={3} opacity={bondOpacity * 0.85} />;
        })}
        {ICE.map((_, i) => {
          const p = pos(i);
          const rot = (1 - freeze) * hash(i, 6) * 360;
          const h = (k: number) => {
            const a = ((rot + (k ? 52 : -52) + 90) * Math.PI) / 180;
            return {x: p.x + 13 * Math.cos(a), y: p.y + 13 * Math.sin(a)};
          };
          const h1 = h(0);
          const h2 = h(1);
          return (
            <g key={i}>
              <circle cx={h1.x} cy={h1.y} r={4.5} fill="#f4f8ff" />
              <circle cx={h2.x} cy={h2.y} r={4.5} fill="#f4f8ff" />
              <circle cx={p.x} cy={p.y} r={9} fill="hsl(205 90% 62%)" />
            </g>
          );
        })}
      </Obj>
      <path d={`${wave} V${TANK.bottom - 20} Q${TANK.right} ${TANK.bottom} ${TANK.right - 20} ${TANK.bottom} H${TANK.left + 20} Q${TANK.left} ${TANK.bottom} ${TANK.left} ${TANK.bottom - 20} Z`} fill="url(#water-front)" />
      <path d={wave} fill="none" stroke={WATER} strokeWidth={4} strokeLinecap="round" opacity={0.9} />
    </svg>
  );
}

function Tag() {
  return (
    <div style={{fontFamily: 'var(--vt-sans)', color: 'var(--vt-text)', width: 600}}>
      <Obj id="tag-a" style={{fontSize: 76, fontWeight: 700, lineHeight: 1.05, color: ICE_TINT}}>open hexagonal lattice</Obj>
      <Obj id="tag-b" style={{fontSize: 44, marginTop: 28, color: 'var(--vt-muted)'}}>gaps between the molecules</Obj>
    </div>
  );
}

function Stat() {
  const pct = useProp('pct', 0);
  return (
    <div style={{fontFamily: 'var(--vt-sans)', width: 600}}>
      <div style={{fontSize: 44, color: 'var(--vt-muted)'}}>ice is about</div>
      <div style={{fontSize: 280, fontWeight: 700, lineHeight: 1, color: ICE_TINT, letterSpacing: -6}}>{Math.round(pct)}%</div>
      <div style={{fontSize: 52, fontWeight: 700, color: 'var(--vt-text)'}}>less dense than water</div>
    </div>
  );
}

export default (
  <Doc id="ice-floats" poster={9} title="Why ice floats" lang="en" theme="visotalk/dark" canvas="16x9">
    <Scene id="floats">
      <Line id="l1">Ice floats because water does something strange when it freezes.</Line>
      <Line id="l2">Its molecules lock into an open hexagonal lattice, with gaps between them.</Line>
      <Line id="l3" hold={1.4}>That spacing makes ice about nine percent less dense than liquid water, so it rides on top.</Line>

      <Part id="tank" x={0} y={0} w={1920} h={1080}>{() => <Tank />}</Part>
      <Part id="tag" x={1240} y={400} w={620} h={300}>{() => <Tag />}</Part>
      <Part id="stat" x={1240} y={290} w={620} h={460}>{() => <Stat />}</Part>

      <Animation>
        <Appear target="tank" line="l1" word="Ice floats" />
        <Appear target="water" line="l1" word="Ice floats" dur={0.8} />
        <Appear target="cube" line="l1" word="water" dur={0.7} />

        <Tween target="tank" to={{freeze: 1}} dur={2.4} easing="easeInOut" line="l2" word="lock into" />
        <Appear target="tag" line="l2" word="open hexagonal" />
        <Appear target="tag-a" line="l2" word="open hexagonal" />
        <Appear target="tag-b" line="l2" word="gaps" />

        <Disappear target="tag" line="l3" word="ice about" />
        <Appear target="stat" line="l3" word="nine percent" />
        <Tween target="stat" to={{pct: 9}} dur={1.2} easing="easeOut" line="l3" word="nine percent" />
        <Tween target="tank" to={{rise: 1}} dur={1.8} easing="easeInOut" line="l3" word="rides" offset={-0.6} />
      </Animation>
    </Scene>
  </Doc>
);
