import {Doc, Scene, Line, Part, Animation, Appear, Disappear, Tween, Set} from '@visotalk/jsx';
import {Obj, useProp} from '@visotalk/runtime';

/**
 * Why the sky is blue, narrated in Mandarin. Six scenes, one idea each: sunlight is white, white light is every colour, short waves
 * scatter more, so the blue is thrown across the whole sky; violet loses on three counts; and a low Sun makes the same light red.
 * The pictures are drawn from numbers (the wavelengths, the scattering ratio, the Earth's geometry), not from stock art.
 * Kokoro speaks English only, so the narration is MiniMax's. Word times in Chinese are placed by character position (the aligner is English only), so anchors are short runs of characters.
 */

/** The theme's sans: a Chinese document gets Noto Sans SC embedded by `build` (`packages/cli/src/fonts.ts`), so no fallback list is needed. */
const SANS = 'var(--vt-sans)';

/** The colours of the spectrum, red to violet, and the wavelength each is drawn at (nm). */
const BANDS = [
  {id: 'red', name: '红', color: '#ff4d3d', nm: 700},
  {id: 'orange', name: '橙', color: '#ff9a1f', nm: 610},
  {id: 'yellow', name: '黄', color: '#ffd60a', nm: 580},
  {id: 'green', name: '绿', color: '#3ddc6c', nm: 530},
  {id: 'cyan', name: '青', color: '#19d3c5', nm: 490},
  {id: 'blue', name: '蓝', color: '#3d8bff', nm: 450},
  {id: 'violet', name: '紫', color: '#b366ff', nm: 410},
];
const BLUE = '#4da3ff';
const RED = '#ff5a3c';

/** Rayleigh scattering goes as 1 / wavelength^4: how much stronger 450 nm is scattered than 700 nm. */
const RATIO = Math.pow(700 / 450, 4); // 5.85: the blue bar is 1170 px against the red one's 200

/** A deterministic scatter of numbers in [0, 1): the same on every frame. */
const lcg = (seed: number) => () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);

const mix = (a: [number, number, number], b: [number, number, number], t: number) =>
  `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`;

const Kicker = ({children}: {children: string}) => (
  <div style={{fontFamily: SANS, fontSize: 36, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--vt-data)'}}>{children}</div>
);

/** One stroke that draws itself: `pathLength` 1 makes the dash a fraction of the line. */
const Stroke = ({d, color, width = 10, draw}: {d: string; color: string; width?: number; draw: number}) => (
  <path d={d} pathLength={1} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeDasharray="1" strokeDashoffset={1 - draw} opacity={draw > 0 ? 1 : 0} />
);

/** The sky behind scenes one and six; `dusk` (0 to 1) turns midday blue into the evening. */
const Sky = () => {
  const dusk = useProp('dusk', 0);
  return <div style={{position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${mix([18, 72, 156], [38, 34, 92], dusk)} 0%, ${mix([128, 188, 247], [240, 128, 52], dusk)} 100%)`}} />;
};

const Sun = () => (
  <svg viewBox="0 0 1920 1080" width="1920" height="1080" style={{position: 'absolute', inset: 0}}>
    <defs><radialGradient id="sunglow"><stop offset="0" stopColor="#fff" stopOpacity="1" /><stop offset="0.35" stopColor="#fff" stopOpacity="0.55" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient></defs>
    <circle cx="1450" cy="300" r="260" fill="url(#sunglow)" />
    <circle cx="1450" cy="300" r="96" fill="#fff" />
  </svg>
);

/** Scene two: a white beam into a prism and seven colours out. */
const PRISM_TIP = {x: 820, y: 160};
const Prism = () => {
  const draw = useProp('beam', 'draw', 0);
  return (
    <svg viewBox="0 0 1920 720" width="1920" height="720">
      <Obj as="g" id="beam"><Stroke d="M 140 320 L 729 320" color="#fff" width={14} draw={draw} /></Obj>
      <Obj as="g" id="glass">
        <polygon points={`${PRISM_TIP.x},${PRISM_TIP.y} 660,440 980,440`} fill="rgba(180,215,255,0.16)" stroke="rgba(220,235,255,0.85)" strokeWidth="5" />
      </Obj>
      {BANDS.map((b, i) => <Ray key={b.id} band={b} y={250 + i * 70} />)}
    </svg>
  );
};
const Ray = ({band, y}: {band: (typeof BANDS)[number]; y: number}) => {
  const draw = useProp(`ray-${band.id}`, 'draw', 0);
  return (
    <Obj as="g" id={`ray-${band.id}`}>
      <Stroke d={`M 934 360 L 1690 ${y}`} color={band.color} width={16} draw={draw} />
      <text x="1722" y={y + 20} fontFamily={SANS} fontSize="60" fontWeight="700" fill={band.color}>{band.name}</text>
    </Obj>
  );
};

/** Scene three: two waves, then how strongly each is scattered. */
const WAVE_X0 = 160;
const wavePath = (base: number, lambda: number, amp = 62) => {
  let d = '';
  for (let x = 0; x <= 1600; x += 8) d += `${x === 0 ? 'M' : 'L'} ${WAVE_X0 + x} ${(base - amp * Math.sin((2 * Math.PI * x) / lambda)).toFixed(1)} `;
  return d;
};
const Wave = ({id, color, base, lambda, label, nm}: {id: string; color: string; base: number; lambda: number; label: string; nm: number}) => {
  const draw = useProp(id, 'draw', 0);
  return (
    <Obj as="g" id={id}>
      <text x={WAVE_X0} y={base - 112} fontFamily={SANS} fontSize="52" fontWeight="700" fill={color}>{label}</text>
      <text x={WAVE_X0 + 400} y={base - 112} fontFamily={SANS} fontSize="40" fill="var(--vt-muted)">{`波长约 ${nm} 纳米`}</text>
      <Stroke d={wavePath(base, lambda)} color={color} width={9} draw={draw} />
      {/* one wavelength, bracketed */}
      <g opacity={draw > 0.95 ? 1 : 0} stroke="var(--vt-text)" strokeWidth="3">
        <line x1={WAVE_X0} y1={base + 96} x2={WAVE_X0 + lambda} y2={base + 96} />
        <line x1={WAVE_X0} y1={base + 84} x2={WAVE_X0} y2={base + 108} />
        <line x1={WAVE_X0 + lambda} y1={base + 84} x2={WAVE_X0 + lambda} y2={base + 108} />
      </g>
    </Obj>
  );
};
const Waves = () => (
  <svg viewBox="0 0 1920 720" width="1920" height="720">
    <Wave id="wave-r" color={RED} base={190} lambda={560} label="红光" nm={700} />
    <Wave id="wave-b" color={BLUE} base={520} lambda={360} label="蓝光" nm={450} />
  </svg>
);
const Bars = () => {
  const wr = useProp('bar-r', 'w', 0);
  const wb = useProp('bar-b', 'w', 0);
  const row = (name: string, color: string, w: number, times: string) => (
    <div style={{display: 'flex', alignItems: 'center', gap: 28, height: 130}}>
      <div style={{width: 150, fontFamily: SANS, fontSize: 56, fontWeight: 700, color}}>{name}</div>
      <div style={{height: 96, width: w, background: color, borderRadius: 8}} />
      <div style={{fontFamily: SANS, fontSize: 64, fontWeight: 700, color: 'var(--vt-text)', opacity: w > 0 ? 1 : 0}}>{times}</div>
    </div>
  );
  return (
    <div style={{position: 'absolute', left: 160, top: 90, width: 1600}}>
      <Obj id="bars-title" style={{fontFamily: SANS, fontSize: 48, color: 'var(--vt-muted)', marginBottom: 40}}>被空气分子散射的强度</Obj>
      <Obj id="bar-r">{row('红光', RED, wr, '×1')}</Obj>
      <Obj id="bar-b">{row('蓝光', BLUE, wb, `约 ×${Math.round(RATIO)}`)}</Obj>
    </div>
  );
};

/** Scene four: the beam enters the air; blue goes everywhere, red goes through. */
const BAND = {x0: 620, x1: 1300, y0: 90, y1: 650};
const HITS = [{x: 760, y: 370}, {x: 880, y: 370}, {x: 1000, y: 370}, {x: 1120, y: 370}, {x: 1230, y: 370}];
const MOLECULES = (() => {
  const r = lcg(7);
  return Array.from({length: 70}, (_, i) => ({i, x: BAND.x0 + 20 + r() * (BAND.x1 - BAND.x0 - 40), y: BAND.y0 + 24 + r() * (BAND.y1 - BAND.y0 - 48)}));
})();
const SCATTER = HITS.flatMap((h, hi) => Array.from({length: 7}, (_, k) => {
  const a = ((k + hi * 0.37) / 7) * Math.PI * 2 + 0.3;
  const len = 105 + ((hi * 7 + k * 5) % 5) * 22;
  return {key: `${hi}-${k}`, x1: h.x, y1: h.y, x2: h.x + Math.cos(a) * len, y2: h.y + Math.sin(a) * len};
}));
const Air = () => {
  const beam = useProp('beam', 'draw', 0);
  const scat = useProp('scatter', 'grow', 0);
  const red = useProp('through', 'draw', 0);
  const glow = useProp('band', 'glow', 0);
  return (
    <svg viewBox="0 0 1920 740" width="1920" height="740">
      <Obj as="g" id="band">
        <rect x={BAND.x0} y={BAND.y0} width={BAND.x1 - BAND.x0} height={BAND.y1 - BAND.y0} rx="14" fill={`rgba(77,163,255,${0.1 + glow * 0.38})`} stroke="rgba(180,215,255,0.7)" strokeWidth="3" strokeDasharray="14 10" />
        <text x={(BAND.x0 + BAND.x1) / 2} y={BAND.y0 - 22} textAnchor="middle" fontFamily={SANS} fontSize="48" fontWeight="700" fill="var(--vt-text)">大气层</text>
      </Obj>
      <Obj as="g" id="molecules">
        {MOLECULES.map((m) => <circle key={m.i} cx={m.x} cy={m.y} r="7" fill="rgba(235,245,255,0.8)" />)}
      </Obj>
      <Obj as="g" id="mol-tag">
        <line x1="990" y1="570" x2="930" y2="520" stroke="var(--vt-text)" strokeWidth="3" />
        <text x="1000" y="590" fontFamily={SANS} fontSize="44" fontWeight="700" fill="var(--vt-text)">气体分子</text>
      </Obj>
      <Obj as="g" id="beam"><Stroke d="M 100 370 L 1300 370" color="#fff" width={12} draw={beam} /></Obj>
      <Obj as="g" id="scatter">
        {SCATTER.map((s) => (
          <line key={s.key} x1={s.x1} y1={s.y1} x2={s.x1 + (s.x2 - s.x1) * scat} y2={s.y1 + (s.y2 - s.y1) * scat} stroke={BLUE} strokeWidth="7" strokeLinecap="round" opacity={scat > 0 ? 1 : 0} />
        ))}
      </Obj>
      <Obj as="g" id="through"><Stroke d="M 1300 370 L 1820 370" color={RED} width={12} draw={red} /></Obj>
    </svg>
  );
};

/** Scene five: a spectrum strip and the three reasons violet loses. */
const NM0 = 380;
const NM1 = 720;
const SX = (nm: number) => ((nm - NM0) / (NM1 - NM0)) * 1600;
const STOPS = [[380, 276], [450, 236], [490, 188], [530, 125], [580, 58], [620, 24], [720, 0]];
const strip = `linear-gradient(90deg, ${STOPS.map(([nm, hue]) => `hsl(${hue} 90% 56%) ${(SX(nm) / 16).toFixed(1)}%`).join(', ')})`;
const Spectrum = () => {
  const dim = useProp('v', 0);
  return (
    <div style={{position: 'absolute', left: 160, top: 40, width: 1600, height: 560}}>
      <Obj id="strip" style={{position: 'absolute', left: 0, top: 200, width: 1600, height: 130, background: strip, borderRadius: 10}} />
      <div style={{position: 'absolute', left: 0, top: 200, width: SX(440), height: 130, background: `rgba(10,14,30,${0.8 * dim})`, borderRadius: '10px 0 0 10px'}} />
      {[400, 450, 500, 600, 700].map((nm) => (
        <div key={nm} style={{position: 'absolute', left: SX(nm) - 60, top: 340, width: 120, textAlign: 'center', fontFamily: 'var(--vt-mono)', fontSize: 32, color: 'var(--vt-muted)'}}>{nm}</div>
      ))}
      <div style={{position: 'absolute', left: 1180, top: 395, fontFamily: SANS, fontSize: 32, color: 'var(--vt-muted)'}}>波长，纳米</div>
      <Obj id="q" style={{position: 'absolute', left: SX(380) + 20, top: 40, fontFamily: SANS, fontSize: 150, fontWeight: 700, color: BANDS[6].color}}>？</Obj>
      <Obj id="few" style={{position: 'absolute', left: 0, top: 130, fontFamily: SANS, fontSize: 44, fontWeight: 700, color: 'var(--vt-text)'}}>太阳光里很少</Obj>
      <Obj as="div" id="absorbed" style={{position: 'absolute', left: 0, top: 330, width: 500, height: 130}}>
        <div style={{position: 'absolute', left: 14, top: 0, width: 4, height: 70, background: 'var(--vt-warn)'}} />
        <div style={{position: 'absolute', left: 0, top: 70, fontFamily: SANS, fontSize: 44, fontWeight: 700, color: 'var(--vt-warn)'}}>还被大气吸收</div>
      </Obj>
      <Obj as="div" id="eye" style={{position: 'absolute', left: SX(470) - 120, top: 40}}>
        <svg viewBox="0 0 520 240" width="520" height="240">
          <g transform="translate(0 20)">
            <path d="M 0 60 Q 60 0 120 0 Q 180 0 240 60 Q 180 120 120 120 Q 60 120 0 60 Z" fill="none" stroke="var(--vt-text)" strokeWidth="6" />
            <circle cx="120" cy="60" r="28" fill={BLUE} />
            <circle cx="120" cy="60" r="11" fill="#0a1020" />
          </g>
          <text x="270" y="82" fontFamily={SANS} fontSize="46" fontWeight="700" fill="var(--vt-text)">眼睛最敏感</text>
          <path d="M 120 140 L 120 188" stroke="var(--vt-text)" strokeWidth="5" />
        </svg>
      </Obj>
      <Obj id="ring" style={{position: 'absolute', left: SX(440), top: 188, width: SX(500) - SX(440), height: 136, boxSizing: 'border-box', border: `6px solid #fff`, borderRadius: 16, boxShadow: `0 0 36px ${BLUE}`}} />
    </div>
  );
};

/** Scene six: the Earth in section; the same Sun seen overhead and on the horizon. */
const E = {cx: 960, cy: 1170, r: 560, shell: 100};
const CUT = 880; // the Earth is drawn above the caption band only, so every shape stays inside the part
const arcPath = (r: number) => {
  const dx = Math.sqrt(r * r - (E.cy - CUT) ** 2);
  return `M ${E.cx - dx} ${CUT} A ${r} ${r} 0 0 1 ${E.cx + dx} ${CUT}`;
};
const capPath = (r: number) => `${arcPath(r)} Z`;
const ME = {x: 960, y: E.cy - E.r};                  // the viewer, at the top of the Earth
/** Where the horizontal ray from the horizon meets the top of the atmosphere. */
const SHELL_X = Math.round(E.cx - Math.sqrt((E.r + E.shell) ** 2 - (E.cy - ME.y) ** 2));
const Dusk = () => {
  const draw = useProp('path', 'draw', 0);
  const tint = useProp('path', 'tint', 0);
  const leak = useProp('leak', 'grow', 0);
  const inside = SHELL_X;
  return (
    <svg viewBox="0 0 1920 880" width="1920" height="880" style={{position: 'absolute', inset: 0}}>
      <defs>
        <linearGradient id="through-air" gradientUnits="userSpaceOnUse" x1={inside} y1="0" x2={ME.x} y2="0">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor={mix([255, 255, 255], [255, 98, 44], tint)} />
        </linearGradient>
      </defs>
      <path d={capPath(E.r + E.shell)} fill="rgba(150,200,255,0.30)" />
      <path d={capPath(E.r)} fill="#0c1424" />
      <path d={arcPath(E.r)} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="3" />
      <Obj as="g" id="noon">
        <line x1={ME.x} y1="120" x2={ME.x} y2={ME.y - 8} stroke="#fff" strokeWidth="8" strokeDasharray="18 12" />
        <circle cx={ME.x} cy="96" r="42" fill="#fff" />
        <text x={ME.x + 50} y="330" fontFamily={SANS} fontSize="48" fontWeight="700" fill="#fff">正午：穿过的大气薄</text>
      </Obj>
      <Obj as="g" id="sun-low"><circle cx="150" cy={ME.y} r="64" fill="#fff4e0" /></Obj>
      <Obj as="g" id="path">
        <Stroke d={`M 214 ${ME.y} L ${inside} ${ME.y}`} color="#fff" width={12} draw={Math.min(1, draw * 2)} />
        <Stroke d={`M ${inside} ${ME.y} L ${ME.x - 6} ${ME.y}`} color="url(#through-air)" width={12} draw={Math.max(0, draw * 2 - 1)} />
      </Obj>
      <Obj as="g" id="leak">
        {[0.3, 0.4, 0.5, 0.6, 0.7].map((t, i) => {
          const x = inside + (ME.x - inside) * t;
          return <line key={i} x1={x} y1={ME.y} x2={x - 30 * leak} y2={ME.y - (150 + i * 14) * leak} stroke={BLUE} strokeWidth="8" strokeLinecap="round" opacity={leak > 0 ? 1 : 0} />;
        })}
      </Obj>
      <Obj as="g" id="viewer">
        <circle cx={ME.x} cy={ME.y - 20} r="14" fill="#fff" />
        <text x={ME.x + 30} y={ME.y - 36} fontFamily={SANS} fontSize="44" fontWeight="700" fill="#fff">你</text>
      </Obj>
      <Obj as="g" id="thick">
        <text x="140" y="400" fontFamily={SANS} fontSize="48" fontWeight="700" fill="#fff">傍晚：要穿过更厚的大气</text>
      </Obj>
    </svg>
  );
};

const Title = () => (
  <div style={{fontFamily: SANS, fontSize: 150, fontWeight: 700, lineHeight: 1.18, color: '#fff', textShadow: '0 4px 40px rgba(0,30,90,0.55)'}}>天空为什么<br />是蓝色的</div>
);

export default <Doc id="sky-blue" poster={4} title="天空为什么是蓝色的" lang="zh-CN" voice="minimax:Chinese (Mandarin)_Radio_Host" theme="visotalk/dark" canvas="16x9"
  exports={{variants: [{preset: "16x9"}], fps: 30, captions: "burned"}}>
  <Scene id="question">
    <Line id="l1" hold={0.3}>白天的天空是蓝的，可是太阳光看起来明明是白色的。</Line>
    <Line id="l2" hold={1}>那么，蓝色到底是从哪里来的？</Line>
    <Part id="sky"><Sky /></Part>
    <Part id="sun"><Sun /></Part>
    <Part id="title" x={120} y={300} w={1100} h={420}><Title /></Part>
    <Part id="white" x={1230} y={470} w={440} h={90}>{() => <div style={{fontFamily: SANS, fontSize: 56, fontWeight: 700, textAlign: 'center', color: '#fff'}}>白色的光</div>}</Part>
    <Part id="mark" x={1140} y={560} w={420} h={300}>{() => <div style={{fontFamily: SANS, fontSize: 300, fontWeight: 700, color: '#fff', textAlign: 'center', lineHeight: 1}}>？</div>}</Part>
    <Animation>
      <Appear on="sky" line="l1" word="天空是蓝" dur={1.2} />
      <Appear on="title" line="l1" word="天空是蓝" dur={0.9} />
      <Appear on="sun" line="l1" word="太阳光" dur={0.9} />
      <Appear on="white" line="l1" word="白色的" />
      <Appear on="mark" line="l2" word="哪里来" dur={0.6} />
    </Animation>
  </Scene>

  <Scene id="prism">
    <Line id="l3" hold={1.5}>其实，白光是由红、橙、黄、绿、青、蓝、紫七种颜色混合而成的。</Line>
    <Part id="t-prism" x={96} y={44} w={1000} h={56}><Kicker>白光里有七种颜色</Kicker></Part>
    <Part id="prism" x={0} y={140} w={1920} h={720}><Prism /></Part>
    <Animation>
      <Appear on={["t-prism", "prism"]} at="start" />
      <Appear on="glass" line="l3" word="白光" dur={0.6} />
      <Tween on="beam" draw={1} line="l3" word="白光" dur={0.9} />
      <Tween on="ray-red" draw={1} line="l3" word="红" dur={0.7} />
      <Tween on="ray-orange" draw={1} line="l3" word="橙" dur={0.7} />
      <Tween on="ray-yellow" draw={1} line="l3" word="黄" dur={0.7} />
      <Tween on="ray-green" draw={1} line="l3" word="绿" dur={0.7} />
      <Tween on="ray-cyan" draw={1} line="l3" word="青" dur={0.7} />
      <Tween on="ray-blue" draw={1} line="l3" word="蓝" dur={0.7} />
      <Tween on="ray-violet" draw={1} line="l3" word="紫" dur={0.7} />
    </Animation>
  </Scene>

  <Scene id="waves">
    <Line id="l4" hold={0.5}>不同颜色的光，波长不一样：红光的波长长，蓝光的波长短。</Line>
    <Line id="l5" hold={2}>而波长越短的光，越容易被空气分子散射，蓝光被散射的本领，大约是红光的六倍。</Line>
    <Part id="t-waves" x={96} y={44} w={1000} h={56}><Kicker>波长越短，散射越强</Kicker></Part>
    <Part id="waves" x={0} y={150} w={1920} h={720}><Waves /></Part>
    <Part id="bars" x={0} y={150} w={1920} h={720}><Bars /></Part>
    <Animation>
      <Appear on="t-waves" at="start" />
      <Appear on="waves" line="l4" word="红光的波长长" dur={0.3} />
      <Tween on="wave-r" draw={1} line="l4" word="红光的波长长" dur={1.6} easing="linear" />
      <Tween on="wave-b" draw={1} line="l4" word="蓝光的波长短" dur={1.6} easing="linear" />
      <Disappear id="waves-off" on="waves" line="l5" word="波长越短" dur={0.4} />
      <Appear on="bars" after="waves-off" />
      <Appear on="bars-title" line="l5" word="空气分子散射" />
      <Appear on="bar-r" line="l5" word="红光" />
      <Tween on="bar-r" w={200} line="l5" word="红光" dur={0.7} />
      <Appear on="bar-b" line="l5" word="六倍" />
      <Tween on="bar-b" w={1170} line="l5" word="六倍" dur={1.4} easing="easeOutQuart" />
    </Animation>
  </Scene>

  <Scene id="air">
    <Line id="l6" hold={0.4}>阳光穿过大气层的时候，会不断撞上空气里的气体分子。</Line>
    <Line id="l7" hold={2}>蓝光被打散到天空的各个方向，红光却大多径直穿过，所以我们抬头，到处都是蓝色。</Line>
    <Part id="t-air" x={96} y={44} w={1000} h={56}><Kicker>光穿过大气层</Kicker></Part>
    <Part id="air" x={0} y={150} w={1920} h={740}><Air /></Part>
    <Animation>
      <Appear on={["t-air", "air"]} at="start" />
      <Tween on="beam" draw={1} line="l6" word="阳光穿过" dur={1.8} easing="linear" />
      <Appear on="band" line="l6" word="大气层" />
      <Appear on="molecules" line="l6" word="气体分子" dur={0.8} />
      <Appear on="mol-tag" line="l6" word="气体分子" dur={0.5} />
      <Tween on="scatter" grow={1} line="l7" word="打散" dur={1.2} easing="easeOutQuart" />
      <Appear on="through" line="l7" word="径直穿过" dur={0.1} />
      <Tween on="through" draw={1} line="l7" word="径直穿过" dur={1.2} easing="linear" />
      <Tween on="band" glow={1} line="l7" word="到处都是蓝色" dur={1.6} />
    </Animation>
  </Scene>

  <Scene id="violet">
    <Line id="l8" hold={0.4}>可是紫光的波长更短，为什么天空不是紫色的？</Line>
    <Line id="l9" hold={2.5}>因为太阳光里的紫光本来就少，一部分还被大气吸收了，而且我们的眼睛对蓝色更敏感。</Line>
    <Part id="t-violet" x={96} y={44} w={1000} h={56}><Kicker>为什么不是紫色</Kicker></Part>
    <Part id="spec" x={0} y={240} w={1920} h={640}><Spectrum /></Part>
    <Animation>
      <Appear on="t-violet" at="start" />
      <Appear on="spec" line="l8" word="紫光" dur={0.5} />
      <Appear on="strip" line="l8" word="紫光" dur={0.9} />
      <Appear on="q" line="l8" word="不是紫色" dur={0.6} />
      <Disappear id="q-off" on="q" line="l9" word="太阳光" dur={0.4} />
      <Appear on="few" line="l9" word="本来就少" />
      <Tween on="spec" v={1} line="l9" word="本来就少" dur={1} />
      <Appear on="absorbed" line="l9" word="被大气吸收" />
      <Appear on="ring" line="l9" word="更敏感" dur={0.6} />
      <Appear on="eye" line="l9" word="我们的眼睛" dur={0.6} />
    </Animation>
  </Scene>

  <Scene id="sunset">
    <Line id="l10" hold={0.4}>到了傍晚，太阳落到地平线上，阳光要穿过厚得多的大气。</Line>
    <Line id="l11" hold={0.4}>一路上，蓝光几乎都被散射掉了，只剩下红色和橙色的光。</Line>
    <Line id="l12" hold={2.2}>这就是晚霞的颜色。</Line>
    <Part id="sky"><Sky /></Part>
    <Part id="earth" x={0} y={0} w={1920} h={880}><Dusk /></Part>
    <Animation>
      <Appear on={["sky", "earth"]} at="start" />
      <Appear on="sun-low" line="l10" word="太阳落到" dur={0.8} />
      <Appear on="path" line="l10" word="阳光要穿过" dur={0.1} />
      <Tween on="path" draw={1} line="l10" word="阳光要穿过" dur={2.4} easing="linear" />
      <Appear on="viewer" line="l10" word="傍晚" dur={0.5} />
      <Appear on="thick" line="l10" word="厚得多" dur={0.6} />
      <Appear on="noon" line="l10" word="厚得多" offset={0.8} dur={0.8} />
      <Tween on="leak" grow={1} line="l11" word="蓝光" dur={1.2} easing="easeOutQuart" />
      <Tween on="path" tint={1} line="l11" word="红色和橙色" dur={1.6} />
      <Tween on="sky" dusk={1} line="l12" word="晚霞" dur={2.2} />
    </Animation>
  </Scene>
</Doc>;
