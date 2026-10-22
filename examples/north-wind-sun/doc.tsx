import {Doc, Scene, Line, Part, Animation, Appear, Disappear, Tween, Set} from '@visotalk/jsx';
import {useProp, useDocTime, Obj} from '@visotalk/runtime';

// ---------------------------------------------------------------------------
// One world, drawn once, that lives through the whole film. Mood, light and
// weather are numbers on the part "world"; the story only tweens them.
//   mood     0 storm, 0.5 plain day, 1 golden warmth (sky, hills, clouds, road)
//   cover    0..1 how far the dark clouds have closed over the Sun
//   gale     0..1 the Wind's strength (streaks, leaves, bending trees)
//   puff     0..1 the Wind's cheeks
//   grip     how tightly the traveller holds his cloak (0 open, 1 clutched)
//   off      0..1 the cloak leaves his shoulders and lies on the grass
// ---------------------------------------------------------------------------

type RGB = number[];
const mix = (a: RGB, b: RGB, t: number): RGB => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const rgb = (c: RGB, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
// Colour of a palette at a mood: stops are storm, plain day, golden.
const ramp = (stops: RGB[], m: number): RGB => {
  const p = clamp(m) * (stops.length - 1);
  const i = Math.min(Math.floor(p), stops.length - 2);
  return mix(stops[i], stops[i + 1], p - i);
};

const SKY_TOP = [[46, 56, 74], [118, 164, 204], [92, 156, 226]];
const SKY_MID = [[92, 102, 118], [172, 202, 222], [126, 194, 240]];
const SKY_LOW = [[138, 146, 156], [236, 226, 204], [255, 224, 160]];
const HILL_FAR = [[78, 90, 98], [128, 158, 150], [146, 190, 152]];
const HILL_MID = [[62, 80, 72], [98, 138, 92], [112, 168, 86]];
const GRASS = [[56, 72, 58], [92, 132, 76], [108, 168, 70]];
const ROAD = [[104, 96, 86], [176, 152, 114], [208, 172, 118]];
const CLOUD = [[84, 92, 106], [250, 250, 252], [255, 248, 236]];
const STORM = [[56, 64, 80], [196, 204, 214], [255, 244, 226]];
const WINDCOL = [[92, 106, 132], [166, 184, 208], [182, 198, 218]];
const LEAF = ['#c98a2b', '#a8602a', '#8c9a35', '#d3a53a'];

const Cloud = ({x, y, s, fill}: {x: number; y: number; s: number; fill: string}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} fill={fill}>
    <ellipse cx={0} cy={0} rx={150} ry={46} />
    <ellipse cx={-60} cy={-26} rx={70} ry={50} />
    <ellipse cx={30} cy={-40} rx={80} ry={58} />
    <ellipse cx={100} cy={-10} rx={60} ry={38} />
  </g>
);

const Tree = ({x, y, s, bend, leaf, trunk}: {x: number; y: number; s: number; bend: number; leaf: string; trunk: string}) => (
  <g transform={`translate(${x} ${y}) rotate(${bend}) scale(${s})`}>
    <path d="M -16 0 C -12 -120 -8 -200 -4 -300 L 10 -300 C 14 -200 14 -120 22 0 Z" fill={trunk} />
    <g fill={leaf}>
      <circle cx={0} cy={-340} r={150} />
      <circle cx={-110} cy={-290} r={100} />
      <circle cx={115} cy={-300} r={105} />
      <circle cx={-30} cy={-430} r={95} />
      <circle cx={70} cy={-410} r={80} />
    </g>
  </g>
);

// The traveller: feet at the origin, facing right.
const Traveller = () => {
  const t = useDocTime();
  const tx = useProp('world', 'tx', 110);
  const pace = useProp('world', 'pace', 0);
  const lean = useProp('world', 'lean', 0);
  const grip = useProp('world', 'grip', 0.55);
  const off = useProp('world', 'off', 0);
  const sit = useProp('world', 'sit', 0);
  const sweat = useProp('world', 'sweat', 0);
  const smile = useProp('world', 'smile', 0);
  const gale = useProp('world', 'gale', 0);

  const ph = t * 7;
  const bob = -Math.abs(Math.sin(ph)) * 4 * pace * (1 - sit);
  const hipY = -78 + 58 * sit;
  const foot = (k: number) => {
    const p = ph + k * Math.PI;
    const wx = Math.sin(p) * 26 * pace;
    const wy = -Math.max(0, Math.cos(p)) * 12 * pace;
    const sx = 52 + k * 16;
    return [wx * (1 - sit) + sx * sit, wy * (1 - sit) - 2 * sit];
  };
  const [f0x, f0y] = foot(0);
  const [f1x, f1y] = foot(1);

  const clutch = clamp((grip - 0.65) / 0.35);
  const swing = (k: number) => Math.sin(ph + k * Math.PI) * 24 * pace * (1 - sit);
  const handA: number[] = [swing(1) * (1 - clutch) + 4 * clutch, -96 * (1 - clutch) - 116 * clutch + 58 * sit * (1 - clutch)];
  const handB: number[] = [swing(0) * (1 - clutch) + 14 * clutch, -96 * (1 - clutch) - 108 * clutch + 58 * sit * (1 - clutch)];

  const hw = 62 - 30 * grip;
  const flap = gale * (1 - 0.45 * grip) * (16 + 8 * Math.sin(t * 9));
  const cloakPath = `M -22 -152 C -40 -140 ${-hw - 4} -96 ${-hw} -30 Q ${flap / 2} -16 ${hw + flap} ${-30 - flap * 0.2} C ${hw + flap + 2} -96 40 -140 22 -152 Z`;
  const open = clamp((0.45 - grip) * 3);
  const cloakT = `translate(${-104 * off} ${(34 - 58 * sit) * off}) translate(0 -30) scale(${1 + 0.35 * off} ${1 - 0.72 * off}) translate(0 30)`;
  const bodyDrop = 58 * sit;

  return (
    <g transform={`translate(${tx} 828) scale(1.5)`}>
      <ellipse cx={0} cy={3} rx={46 + 40 * sit} ry={8} fill="rgba(0,0,0,0.22)" />
      <g transform={`rotate(${lean}) translate(0 ${bob})`}>
        {/* legs */}
        <path d={`M -5 ${hipY} L ${f1x} ${f1y}`} stroke="#3c3a4a" strokeWidth={13} strokeLinecap="round" fill="none" />
        <path d={`M 5 ${hipY} L ${f0x} ${f0y}`} stroke="#4a4858" strokeWidth={13} strokeLinecap="round" fill="none" />
        <ellipse cx={f1x + 7} cy={f1y} rx={13} ry={6} fill="#2a2430" />
        <ellipse cx={f0x + 7} cy={f0y} rx={13} ry={6} fill="#2a2430" />
        <g transform={`translate(0 ${bodyDrop})`}>
          {/* tunic */}
          <path d="M -21 -150 L 21 -150 L 25 -70 L -25 -70 Z" fill="#c4a06e" />
          {/* cloak */}
          <g opacity={1 - clamp((off - 0.6) * 5)} transform={cloakT}>
            <path d={cloakPath} fill="#a83434" />
            <path d={`M 0 -150 L ${-hw * 0.5} -34 L ${hw * 0.5} -34 Z`} fill="#c4a06e" opacity={open} />
            <path d="M -22 -152 Q 0 -138 22 -152" stroke="#7c2228" strokeWidth={6} fill="none" strokeLinecap="round" />
          </g>
          <g opacity={clamp((off - 0.6) * 5)} transform={`translate(-104 ${-4 - 58 * sit})`}>
            <ellipse cx={0} cy={-8} rx={56} ry={16} fill="#a83434" />
            <ellipse cx={-14} cy={-18} rx={32} ry={12} fill="#8c2a2e" />
            <ellipse cx={20} cy={-14} rx={24} ry={9} fill="#be4646" />
          </g>
          {/* arms */}
          <path d={`M -16 -146 L ${handA[0]} ${handA[1]}`} stroke="#8c6a46" strokeWidth={10} strokeLinecap="round" fill="none" />
          <path d={`M 16 -146 L ${handB[0]} ${handB[1]}`} stroke="#a07a52" strokeWidth={10} strokeLinecap="round" fill="none" />
          <circle cx={handA[0]} cy={handA[1]} r={6} fill="#ecc9a0" />
          <circle cx={handB[0]} cy={handB[1]} r={6} fill="#ecc9a0" />
          {/* head */}
          <circle cx={0} cy={-184} r={22} fill="#ecc9a0" />
          <circle cx={9} cy={-187} r={2.6} fill="#2a2430" />
          <path d={`M 3 -175 Q 10 ${-175 + smile * 7} 17 -176`} stroke="#6a3a30" strokeWidth={2.4} fill="none" strokeLinecap="round" />
          <ellipse cx={0} cy={-200} rx={38} ry={8} fill="#6e4a30" />
          <path d="M -22 -200 C -22 -232 22 -232 22 -200 Z" fill="#7e5636" />
          <rect x={-22} y={-208} width={44} height={7} fill="#3e2a3e" />
          {/* sweat */}
          {[0, 1, 2].map((i) => {
            const fall = (t * 44 + i * 13) % 34;
            return <ellipse key={i} cx={-17 + i * 3} cy={-196 + fall} rx={2.6} ry={4} fill="#9fd6f5" opacity={sweat * (1 - fall / 34)} />;
          })}
        </g>
      </g>
    </g>
  );
};

const WindFace = () => {
  const mood = useProp('world', 'mood', 0.5);
  const puff = useProp('world', 'puff', 0);
  const windX = useProp('world', 'windX', 0);
  const body = rgb(ramp(WINDCOL, mood));
  return (
    <g transform={`translate(${330 + windX} 300)`}>
      <g fill={body}>
        <circle cx={0} cy={0} r={104} />
        <circle cx={-96} cy={24} r={70} />
        <circle cx={92} cy={34} r={74} />
        <circle cx={-10} cy={78} r={78} />
        <circle cx={-44} cy={-66} r={62} />
        <circle cx={52} cy={-72} r={56} />
      </g>
            <path d={`M 22 ${-14 + puff * 4} Q 40 ${-26 - puff * 4} 58 ${-14 + puff * 4}`} stroke="#27324a" strokeWidth={6} fill="none" strokeLinecap="round" />
      <path d={`M 76 ${-8 + puff * 4} Q 94 ${-20 - puff * 4} 112 ${-8 + puff * 4}`} stroke="#27324a" strokeWidth={6} fill="none" strokeLinecap="round" />
      <path d="M 18 -30 L 64 -22" stroke="#27324a" strokeWidth={5} strokeLinecap="round" />
      <circle cx={62} cy={46} r={32 * (1 + 0.45 * puff)} fill="rgba(255,255,255,0.14)" />
      <circle cx={44} cy={54} r={8} fill="rgba(226,150,160,0.6)" />
      <circle cx={132} cy={30} r={9 + 7 * puff} fill="#27324a" />
    </g>
  );
};

const SunFace = () => {
  const t = useDocTime();
  const sunS = useProp('world', 'sunS', 1);
  const cover = useProp('world', 'cover', 0);
  const glow = (1 - 0.85 * cover) * (0.7 + 0.3 * sunS);
  return (
    <g transform={`translate(1590 250) scale(${sunS})`}>
      <circle cx={0} cy={0} r={200} fill="url(#sun-glow)" opacity={glow} />
      <g transform={`rotate(${t * 5})`} stroke="#ffcf4a" strokeWidth={9} strokeLinecap="round" opacity={0.95 * (1 - 0.5 * cover)}>
        {Array.from({length: 16}, (_, i) => (
          <path key={i} d={`M ${i % 2 ? 108 : 100} 0 L ${i % 2 ? 140 : 156} 0`} transform={`rotate(${i * 22.5})`} />
        ))}
      </g>
      <circle cx={0} cy={0} r={84} fill="#ffd54a" />
      <circle cx={-26} cy={-10} r={5.5} fill="#7a4a1a" />
      <circle cx={26} cy={-10} r={5.5} fill="#7a4a1a" />
      <path d="M -28 20 Q 0 46 28 20" stroke="#7a4a1a" strokeWidth={5} fill="none" strokeLinecap="round" />
      <circle cx={-44} cy={14} r={11} fill="rgba(255,150,100,0.45)" />
      <circle cx={44} cy={14} r={11} fill="rgba(255,150,100,0.45)" />
    </g>
  );
};

const World = () => {
  const t = useDocTime();
  const mood = useProp('world', 'mood', 0.5);
  const cover = useProp('world', 'cover', 0);
  const gale = useProp('world', 'gale', 0);
  const sunS = useProp('world', 'sunS', 1);
  const tx = useProp('world', 'tx', 110);
  const zoom = useProp('world', 'zoom', 1);
  const fx = useProp('world', 'fx', 960);
  const fy = 900;

  const bend = gale * (6 + 3 * Math.sin(t * 5));
  const cloudFill = rgb(ramp(CLOUD, mood));
  const stormFill = rgb(ramp(STORM, mood));
  const sunLight = (1 - cover) * clamp(mood * 2 - 0.6);
  const leafOp = clamp(gale * 1.3 - 0.25);
  const cam = `translate(${fx * (1 - zoom)} ${fy * (1 - zoom)}) scale(${zoom})`;

  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, background: rgb(ramp(GRASS, mood))}}>
    <div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 900, overflow: 'hidden', background: `linear-gradient(180deg, ${rgb(ramp(SKY_TOP, mood))} 0%, ${rgb(ramp(SKY_MID, mood))} 45%, ${rgb(ramp(SKY_LOW, mood))} 72%)`}}>
    <svg viewBox="0 0 1920 900" width={1920} height={900} style={{position: 'absolute', left: 0, top: 0}}>
      <defs>
        <radialGradient id="sun-glow">
          <stop offset="0" stopColor="#fff3b0" stopOpacity={0.85} />
          <stop offset="0.4" stopColor="#ffe27a" stopOpacity={0.35} />
          <stop offset="1" stopColor="#ffe27a" stopOpacity={0} />
        </radialGradient>
        <linearGradient id="ground-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity={0} />
          <stop offset="1" stopColor="#000" stopOpacity={0.28} />
        </linearGradient>
      </defs>
      <g>
        <Obj id="sun-g" as="g"><SunFace /></Obj>
        <Cloud x={760 + 40 * Math.sin(t * 0.1)} y={400} s={0.8} fill={cloudFill} />
        <Cloud x={1130 + 50 * Math.sin(t * 0.08 + 1)} y={370} s={0.9} fill={cloudFill} />
        <Cloud x={1700 + 30 * Math.sin(t * 0.09 + 2)} y={450} s={0.7} fill={cloudFill} />
        <Cloud x={440 + 30 * Math.sin(t * 0.07 + 3)} y={500} s={0.6} fill={cloudFill} />
        <Obj id="wind-g" as="g"><WindFace /></Obj>
        {/* the storm clouds that close over the Sun */}
        <g opacity={clamp(cover * 3)}>
          <Cloud x={1380} y={260} s={(0.4 + 0.6 * cover) * 1.9} fill={stormFill} />
          <Cloud x={1570} y={340} s={(0.4 + 0.6 * cover) * 1.7} fill={stormFill} />
          <Cloud x={1520} y={210} s={(0.4 + 0.6 * cover) * 2.0} fill={stormFill} />
          <Cloud x={1200} y={190} s={(0.4 + 0.6 * cover) * 1.4} fill={stormFill} />
        </g>
        {/* land */}
        <path d="M 0 560 C 300 470 560 520 820 496 S 1300 450 1560 510 S 1800 520 1920 480 L 1920 900 L 0 900 Z" fill={rgb(ramp(HILL_FAR, mood))} />
        <path d="M 0 650 C 260 570 520 610 800 596 S 1380 546 1650 606 S 1850 626 1920 596 L 1920 900 L 0 900 Z" fill={rgb(ramp(HILL_MID, mood))} />
        <rect x={0} y={690} width={1920} height={210} fill={rgb(ramp(GRASS, mood))} />
        <Tree x={1120} y={660} s={0.32} bend={bend * 0.5} leaf={rgb(ramp(HILL_MID, mood * 0.9))} trunk="#4a3a2e" />
        <Tree x={300} y={690} s={0.36} bend={bend * 0.6} leaf={rgb(ramp(HILL_MID, mood * 0.9))} trunk="#4a3a2e" />
        <path d="M 0 782 C 400 762 800 814 1200 788 S 1700 764 1920 790 L 1920 872 C 1700 852 1400 892 1200 872 S 400 892 0 862 Z" fill={rgb(ramp(ROAD, mood))} />
      </g>
      <g transform={cam}>
        <ellipse cx={1290} cy={852} rx={300} ry={34} fill="rgba(20,40,20,0.2)" opacity={sunLight} />
        <Tree x={1400} y={800} s={0.86} bend={bend} leaf={rgb(ramp(HILL_MID, mood))} trunk="#5a4030" />
        <Tree x={1640} y={770} s={0.42} bend={bend * 1.2} leaf={rgb(ramp(HILL_MID, mood * 0.8))} trunk="#4a3a2e" />
        <Obj id="traveller" as="g"><Traveller /></Obj>
      </g>
      <g>
        {/* the Wind itself, drawn over the road */}
        <g opacity={gale * 0.8} stroke="#f2f6fb" strokeWidth={6} strokeLinecap="round" fill="none" strokeDasharray="220 150">
          {Array.from({length: 7}, (_, i) => {
            const y0 = 330 + i * 70;
            return <path key={i} d={`M 470 ${y0} C 800 ${y0 - 70} 1000 ${y0 + 80} 1300 ${y0} S 1700 ${y0 + 50} 1900 ${y0 - 20}`} strokeDashoffset={-(t * 720 + i * 90)} />;
          })}
        </g>
        {Array.from({length: 11}, (_, i) => {
          const lx = ((t * (330 + i * 45) + i * 211) % 1800) + 60;
          const ly = 260 + i * 58 + 46 * Math.sin(t * 3 + i);
          return <ellipse key={i} cx={lx} cy={ly} rx={15} ry={7} fill={LEAF[i % 4]} opacity={leafOp} transform={`rotate(${t * 220 + i * 50} ${lx} ${ly})`} />;
        })}
              </g>
    </svg>
    <div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 900, background: 'rgb(18,26,44)', opacity: clamp(0.34 * (1 - mood * 2))}} />
    <div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 900, background: 'rgb(255,196,110)', opacity: clamp((mood - 0.6) * 0.34)}} />
    </div>
    </div>
  );
};

export default <Doc id="north-wind-sun" poster={40} title="The North Wind and the Sun" lang="en" theme="visotalk/dark" canvas="16x9">
  <Part id="world" x={0} y={0} w={1920} h={1080}>{() => <World />}</Part>

  <Scene id="argument">
    <Line id="l1" hold={0.8}>A fable by Aesop.</Line>
    <Line id="l2">One day, the North Wind and the Sun began to argue about which of them was stronger.</Line>
    <Line id="l2b">Each was sure that he alone was the strongest in the world.</Line>
    <Line id="l3">Just then, a traveller came walking down the road, wrapped in a warm cloak.</Line>
    <Part id="title" x={0} y={90} w={1920} h={200}>{() => (
      <div style={{textAlign: 'center', fontFamily: 'var(--vt-sans)', fontWeight: 700, fontSize: 104, letterSpacing: 1, color: '#1f3050', textShadow: '0 2px 24px rgba(255,255,255,0.55)'}}>
        The North Wind and the Sun
      </div>
    )}</Part>
    <Animation>
      <Appear on="world" at="start" dur={1.4} />
      <Appear on="title" line="l1" word="fable" dur={0.9} />
      <Disappear on="title" line="l2" dur={0.6} />
      <Appear on="wind-g" line="l2" word="North Wind" dur={0.9} />
      <Appear on="sun-g" line="l2" word="Sun" dur={0.9} />
      <Tween on="world" line="l2b" word="sure" puff={0.6} sunS={1.18} dur={1.4} easing="easeInOut" />
      <Tween on="world" line="l3" puff={0} sunS={1} dur={1.2} easing="easeInOut" />
      <Appear on="traveller" line="l3" word="traveller" dur={0.4} />
      <Set on="world" line="l3" word="traveller" pace={1} />
      <Tween on="world" line="l3" word="traveller" tx={700} dur={9} easing="linear" />
    </Animation>
  </Scene>

  <Scene id="wind">
    <Line id="l4">Let us settle it, said the Sun. Whoever makes that man take off his cloak is the stronger.</Line>
    <Line id="l5">The Wind went first. He gathered all his breath, and blew with fury.</Line>
    <Line id="l6">He howled across the hills; the trees bent, and the leaves flew.</Line>
    <Line id="l7">But the harder he blew, the tighter the traveller clutched his cloak.</Line>
    <Line id="l8">At last the Wind gave up, tired and defeated.</Line>
    <Animation>
      <Tween on="world" line="l4" word="cloak" zoom={1.15} fx={950} dur={3} easing="easeInOut" />
      <Tween on="world" line="l5" word="gathered" puff={1} dur={1.6} easing="easeInOut" />
      <Tween on="world" line="l5" word="gathered" cover={1} dur={5} easing="easeInOut" />
      <Tween on="world" line="l5" word="gathered" mood={0.12} dur={6} easing="easeInOut" />
      <Tween on="world" line="l5" word="blew" gale={0.7} dur={1.4} />
      <Tween on="world" line="l5" word="blew" lean={-6} pace={0.6} dur={1.4} />
      <Tween on="world" line="l6" word="trees" gale={1} dur={1.2} />
      <Tween on="world" line="l6" word="leaves" lean={-12} pace={0.45} dur={1.2} />
      <Tween on="world" line="l7" word="harder" lean={-16} dur={1} />
      <Tween on="world" line="l7" word="tighter" grip={1} smile={-1} dur={1} />
      <Tween on="world" line="l8" word="gave up" gale={0} puff={0} lean={0} pace={0} dur={2.2} />
      <Tween on="world" line="l8" word="defeated" windX={-150} dur={2.6} easing="easeIn" />
      <Disappear on="wind-g" line="l8" word="defeated" offset={1.3} dur={1.2} />
    </Animation>
  </Scene>

  <Scene id="sun">
    <Line id="l9">Then it was the Sun's turn. He slipped out from behind the clouds, and shone, warm and gentle.</Line>
    <Line id="l10">The air grew soft, and the whole road began to glow.</Line>
    <Line id="l11">The traveller looked up, and loosened his cloak.</Line>
    <Line id="l12">Soon the heat was so great that he took it off, and sat down in the shade.</Line>
    <Animation>
      <Tween on="world" line="l9" word="turn" zoom={1.08} fx={1250} dur={10} easing="easeInOut" />
      <Tween on="world" line="l9" word="slipped out" cover={0} dur={3.5} easing="easeInOut" />
      <Tween on="world" line="l9" word="slipped out" mood={0.8} dur={3.5} easing="easeInOut" />
      <Tween on="world" line="l9" word="shone" smile={0.2} dur={2} />
      <Tween on="world" line="l10" word="glow" mood={1} dur={4} easing="easeInOut" />
      <Set on="world" line="l10" word="air" pace={0.7} />
      <Tween on="world" line="l10" word="air" tx={1230} dur={13.5} easing="linear" />
      <Tween on="world" line="l11" word="loosened" grip={0.1} smile={0.8} dur={1.6} />
      <Tween on="world" line="l12" word="heat" sweat={1} smile={0} dur={1.5} />
      <Tween on="world" line="l12" word="took it off" off={1} dur={2.2} easing="easeInOut" />
      <Tween on="world" line="l12" word="sat down" pace={0} sit={1} dur={1.8} easing="easeInOut" />
      <Tween on="world" line="l12" word="shade" sweat={0} smile={1} dur={2} />
    </Animation>
  </Scene>

  <Scene id="moral">
    <Line id="l13a">The Wind, with all his roaring, had only made the traveller hold on tighter.</Line>
    <Line id="l13">And so the Sun was proved the stronger.</Line>
    <Line id="l14" hold={2.4}>Gentle persuasion works where force fails.</Line>
    <Part id="moral-a" x={140} y={80} w={1100} h={160}>{() => (
      <div style={{fontFamily: 'var(--vt-sans)', fontWeight: 700, fontSize: 132, letterSpacing: 1, color: '#fffaf0', textShadow: '0 3px 30px rgba(20,40,80,0.55)'}}>Gentleness</div>
    )}</Part>
    <Part id="moral-b" x={140} y={230} w={1100} h={130}>{() => (
      <div style={{fontFamily: 'var(--vt-sans)', fontWeight: 400, fontSize: 96, color: '#fffaf0', textShadow: '0 3px 30px rgba(20,40,80,0.55)'}}>beats force.</div>
    )}</Part>
    <Animation>
      <Tween on="world" line="l13a" word="roaring" zoom={1.2} fx={1250} dur={5} easing="easeInOut" />
      <Tween on="world" line="l13" word="proved" zoom={1} fx={960} sunS={1.22} dur={4} easing="easeInOut" />
      <Appear on="moral-a" line="l14" word="Gentle persuasion" dur={0.9} />
      <Appear on="moral-b" line="l14" word="force fails" dur={0.9} />
    </Animation>
  </Scene>
</Doc>;
