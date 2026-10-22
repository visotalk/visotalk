import {Doc, Scene, Line, Part, Animation, Appear, Disappear, Tween} from '@visotalk/jsx';
import {Obj, useProp} from '@visotalk/runtime';

/**
 * Why the sky is blue, as a 9:16 Mandarin short for Douyin and YouTube Shorts. One idea: air scatters blue light most.
 * Every picture sits in the upper half (a 1080 x 820 box at y 160); the lower half is the word-by-word block (`captions: 'words'`).
 * Pictures carry no sentences: only the question mark and the two colour names are drawn.
 */

const BLUE = '#4aa3ff';
const SUN = '#ffc23a';
const RED = '#ff5a4a';
const SPECTRUM = ['#ff4b4b', '#ff9a3c', '#ffe14a', '#4cd964', '#4aa3ff', '#4a5cff', '#a35bff'];

const mix = (a: number[], b: number[], t: number) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`;

const Label = ({children, color, x, y}: {children: string; color: string; x: number; y: number}) => (
  <div style={{position: 'absolute', left: x, top: y, width: 300, textAlign: 'center', fontFamily: 'var(--vt-sans)', fontWeight: 700, fontSize: 84, lineHeight: 1, color}}>{children}</div>
);

/** The hook: a blue sky disc with a sun and a question mark; the sea is shown, then crossed out. */
const Sky = () => (
  <svg width={1080} height={820} viewBox="0 0 1080 820">
    <defs>
      <radialGradient id="sk-g" cx="50%" cy="35%" r="70%"><stop offset="0%" stopColor="#7cc2ff" /><stop offset="100%" stopColor="#1f6fd6" /></radialGradient>
      <clipPath id="sk-c"><circle cx={540} cy={410} r={330} /></clipPath>
    </defs>
    <circle cx={540} cy={410} r={330} fill="url(#sk-g)" />
    <circle cx={760} cy={230} r={66} fill={SUN} />
    <Obj as="g" id="sea">
      <path d="M 229 520 A 330 330 0 0 0 851 520 Z" fill="#0f3d7a" />
      <path d="M 260 560 q 40 -26 80 0 t 80 0 t 80 0 t 80 0 t 80 0 t 80 0" fill="none" stroke="#7cc2ff" strokeWidth={8} strokeLinecap="round" />
    </Obj>
    <Obj as="g" id="cross">
      <line x1={400} y1={560} x2={680} y2={760} stroke={RED} strokeWidth={30} strokeLinecap="round" />
      <line x1={680} y1={560} x2={400} y2={760} stroke={RED} strokeWidth={30} strokeLinecap="round" />
    </Obj>
    <text x={540} y={470} fontSize={380} fontWeight={700} fill="#ffffff" textAnchor="middle" fontFamily="var(--vt-sans)">？</text>
  </svg>
);

/** Sunlight is white, and a prism shows it is seven colours. */
const Prism = () => (
  <svg width={1080} height={820} viewBox="0 0 1080 820">
    <Obj as="g" id="sun">
      <circle cx={130} cy={230} r={100} fill={SUN} />
    </Obj>
    <Obj as="g" id="beam">
      <polygon points="200,290 200,330 430,420 430,380" fill="#ffffff" />
    </Obj>
    <Obj as="g" id="prism">
      <polygon points="480,250 360,560 600,560" fill="rgba(255,255,255,0.12)" stroke="#ffffff" strokeWidth={6} strokeLinejoin="round" />
    </Obj>
    {SPECTRUM.map((c, i) => (
      <Obj as="g" key={i} id={`ray${i}`}>
        <polygon points={`515,${395 + i * 6} 1060,${130 + i * 95} 1060,${170 + i * 95} 515,${405 + i * 6}`} fill={c} />
      </Obj>
    ))}
  </svg>
);

const MOLECULES: Array<[number, number]> = [[430, 330], [520, 470], [600, 360], [680, 450], [470, 410], [570, 300], [650, 540], [400, 520], [740, 330], [560, 580], [700, 250], [470, 250]];
const BURSTS: Array<[number, number, number]> = [[430, 330, 215], [520, 470, 100], [600, 360, 300], [680, 450, 60], [470, 410, 150], [570, 300, 250], [650, 540, 120], [400, 520, 200], [740, 330, 330], [560, 580, 80]];

/** White light meets air: blue is thrown in every direction, red goes straight on. */
const Scatter = () => {
  const red = useProp('red', 0);
  return (
    <svg width={1080} height={820} viewBox="0 0 1080 820">
      <Obj as="g" id="light">
        <rect x={0} y={398} width={410} height={24} fill="#ffffff" />
      </Obj>
      <Obj as="g" id="air">
        {MOLECULES.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={20} fill="#9fb4d6" />)}
      </Obj>
      {BURSTS.map(([x, y, a], i) => {
        const r = (a * Math.PI) / 180;
        return (
          <Obj as="g" key={i} id={`b${i}`}>
            <line x1={x} y1={y} x2={x + 150 * Math.cos(r)} y2={y + 150 * Math.sin(r)} stroke={BLUE} strokeWidth={14} strokeLinecap="round" />
          </Obj>
        );
      })}
      <Obj as="g" id="red">
        <rect x={410} y={398} width={Math.max(1, 640 * red)} height={24} fill={RED} />
      </Obj>
    </svg>
  );
};

/** The scene's text labels. */
const ScatterLabels = () => (
  <div style={{position: 'relative', width: 1080, height: 820}}>
    <Obj id="lb-blue" style={{position: 'absolute', left: 0, top: 0}}><Label color={BLUE} x={30} y={90}>蓝光</Label></Obj>
    <Obj id="lb-red" style={{position: 'absolute', left: 0, top: 0}}><Label color={RED} x={740} y={300}>红光</Label></Obj>
  </div>
);

const DOTS: Array<[number, number]> = [[300, 200], [420, 150], [560, 190], [700, 240], [250, 330], [380, 280], [520, 300], [640, 360], [790, 350], [320, 440], [470, 430], [610, 470], [760, 470], [400, 540], [540, 560], [690, 570]];
const ARROWS: Array<[number, number]> = [[300, 200], [560, 190], [790, 350], [250, 330], [640, 360], [400, 540], [690, 570]];

/** Scattered blue light arrives from every direction; the sky turns blue. */
const Arrive = () => {
  const blue = useProp('blue', 0);
  return (
    <svg width={1080} height={820} viewBox="0 0 1080 820">
      <circle cx={540} cy={330} r={310} fill={mix([22, 32, 56], [56, 140, 235], blue)} />
      {DOTS.map(([x, y], i) => <Obj as="g" key={i} id={`d${i}`}><circle cx={x} cy={y} r={16} fill={BLUE} stroke="#ffffff" strokeWidth={3} /></Obj>)}
      {ARROWS.map(([x, y], i) => <Obj as="g" key={i} id={`a${i}`}><line x1={x} y1={y} x2={540 + (x - 540) * 0.2} y2={700 + (y - 700) * 0.2} stroke={BLUE} strokeWidth={8} strokeDasharray="22 16" strokeLinecap="round" /></Obj>)}
      <Obj as="g" id="eye">
        <path d="M 400 720 Q 540 610 680 720 Q 540 810 400 720 Z" fill="#f2f6ff" />
        <circle cx={540} cy={722} r={46} fill="#2a5fb0" />
        <circle cx={540} cy={722} r={20} fill="#0b1020" />
      </Obj>
    </svg>
  );
};

/** The same sky at sunset: the sun sinks to the horizon and the blue drains away. */
const Sunset = () => {
  const fall = useProp('fall', 0);
  const k = useProp('k', 0);
  const sunY = 190 + 330 * fall;
  const sky = mix([56, 140, 235], [255, 112, 52], k);
  const glow = mix([124, 194, 255], [255, 190, 90], k);
  return (
    <svg width={1080} height={820} viewBox="0 0 1080 820">
      <defs>
        <radialGradient id="ss-g" cx="50%" cy="85%" r="95%"><stop offset="0%" stopColor={glow} /><stop offset="100%" stopColor={sky} /></radialGradient>
        <clipPath id="ss-c"><circle cx={540} cy={410} r={330} /></clipPath>
      </defs>
      <circle cx={540} cy={410} r={330} fill="url(#ss-g)" />
      <g clipPath="url(#ss-c)">
        <circle cx={540} cy={sunY} r={80} fill={mix([255, 194, 58], [255, 90, 40], k)} />
        <rect x={200} y={540} width={680} height={240} fill="#0c1220" />
      </g>
    </svg>
  );
};

export default <Doc id="sky-blue-vertical" title="天空为什么是蓝的" lang="zh-CN" voice="minimax:Chinese (Mandarin)_News_Anchor" theme="visotalk/dark" canvas="9x16"
  exports={{captions: 'words', fps: 30}}>
  <Scene id="hook">
    <Line id="h1">天空为什么是蓝的？</Line>
    <Line id="h2" hold={0.6}>答案不是大海。</Line>
    <Part id="sky" x={0} y={160} w={1080} h={820}><Sky /></Part>
    <Animation>
      <Appear on="sky" at="start" dur={0} />
      <Appear on="sea" line="h2" word="不是" />
      <Appear on="cross" line="h2" word="大海" />
    </Animation>
  </Scene>

  <Scene id="sunlight">
    <Line id="s1">阳光看起来是白的，</Line>
    <Line id="s2" hold={0.8}>其实混着七种颜色。</Line>
    <Part id="spectrum" x={0} y={160} w={1080} h={820}><Prism /></Part>
    <Animation>
      <Appear on="spectrum" at="start" dur={0} />
      <Appear on="sun" line="s1" word="阳光" />
      <Appear on="beam" line="s1" word="白" />
      <Appear on="prism" line="s2" word="其实" />
      <Appear on={['ray0', 'ray1', 'ray2', 'ray3', 'ray4', 'ray5', 'ray6']} line="s2" word="七种" stagger={0.18} />
    </Animation>
  </Scene>

  <Scene id="scatter">
    <Line id="c1">光撞上空气分子，</Line>
    <Line id="c2">蓝光最容易被撞散，</Line>
    <Line id="c3" hold={0.8}>红光几乎直接穿过。</Line>
    <Part id="scatter" x={0} y={160} w={1080} h={820}><Scatter /></Part>
    <Part id="scatter-labels" x={0} y={160} w={1080} h={820}><ScatterLabels /></Part>
    <Animation>
      <Appear on="scatter" at="start" dur={0} />
      <Appear on="light" line="c1" word="光" />
      <Appear on="air" line="c1" word="空气分子" />
      <Appear on={['b0', 'b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8', 'b9']} line="c2" word="蓝光" stagger={0.12} />
      <Appear on="scatter-labels" line="c2" word="蓝光" dur={0} />
      <Appear on="lb-blue" line="c2" word="蓝光" />
      <Appear on="red" line="c3" word="红光" dur={0.1} />
      <Tween on="scatter" red={1} line="c3" word="红光" dur={1.6} easing="easeInOut" />
      <Appear on="lb-red" line="c3" word="直接" />
    </Animation>
  </Scene>

  <Scene id="arrive">
    <Line id="p1">散开的蓝光，</Line>
    <Line id="p2">从四面八方进入你的眼睛，</Line>
    <Line id="p3" hold={1}>所以天空是蓝色。</Line>
    <Part id="arrive" x={0} y={160} w={1080} h={820}><Arrive /></Part>
    <Animation>
      <Appear on="arrive" at="start" dur={0} />
      <Appear on={['d0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9', 'd10', 'd11', 'd12', 'd13', 'd14', 'd15']} line="p1" word="散开" stagger={0.07} />
      <Appear on="eye" line="p2" word="眼睛" />
      <Appear on={['a0', 'a1', 'a2', 'a3', 'a4', 'a5', 'a6']} line="p2" word="四面八方" stagger={0.12} />
      <Tween on="arrive" blue={1} line="p3" word="天空" dur={1.4} easing="easeInOut" />
    </Animation>
  </Scene>

  <Scene id="sunset">
    <Line id="d1">日落时光要走更远，</Line>
    <Line id="d2">蓝光散光了，</Line>
    <Line id="d3" hold={1.2}>只剩红橙色。</Line>
    <Part id="sunset" x={0} y={160} w={1080} h={820}><Sunset /></Part>
    <Animation>
      <Appear on="sunset" at="start" dur={0} />
      <Tween on="sunset" fall={1} line="d1" word="日落" dur={2.4} easing="easeInOut" />
      <Tween on="sunset" k={0.5} line="d2" word="蓝光" dur={1.6} easing="easeInOut" />
      <Tween on="sunset" k={1} line="d3" word="只剩" dur={1.4} easing="easeInOut" />
    </Animation>
  </Scene>
</Doc>;
