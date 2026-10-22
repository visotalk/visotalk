import {Doc, Scene, Line, Part, Animation, Appear, Disappear, Tween, Set} from '@visotalk/jsx';
import {Obj, useProp} from '@visotalk/runtime';

/**
 * Why the Shinkansen is almost never late, narrated in Japanese. Seven scenes, one idea each: the headline figure (about one minute),
 * a track of its own, a computer that keeps the gap, the earthquake early warning, the night maintenance window, the short turnaround
 * at the terminus, and the sum of them. Every figure is a well-known approximate one and is spoken with "about"; the pictures are
 * illustrations drawn for this film, not measurements. The voice is MiniMax's (Kokoro is English only), so word times are placed by
 * character position and anchors are runs of characters that occur once in their line.
 */

const SANS = 'var(--vt-sans)';
const INK = 'var(--vt-text)';
const BLUE = 'var(--vt-data)';
const ORANGE = 'var(--vt-grad)';
const RED = 'var(--vt-bad)';
const YELLOW = 'var(--vt-warn)';
const MUTED = 'var(--vt-muted)';

/** One stroke that draws itself: `pathLength` 1 makes the dash a fraction of the line. */
const Stroke = ({d, color, width = 8, draw}: {d: string; color: string; width?: number; draw: number}) => (
  <path d={d} pathLength={1} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeDasharray="1" strokeDashoffset={1 - draw} opacity={draw > 0 ? 1 : 0} />
);

/** A side view of a bullet train facing right, 600 x 110 in its own coordinates; `s` scales it. */
const Train = ({x = 0, y = 0, s = 1, flip = false, body = '#FFFFFF', stripe = BLUE}: {x?: number; y?: number; s?: number; flip?: boolean; body?: string; stripe?: string}) => (
  <g transform={flip ? `translate(${x + 600 * s} ${y}) scale(${-s} ${s})` : `translate(${x} ${y}) scale(${s})`}>
    <path d="M0 92 L0 34 Q0 14 24 14 L330 14 Q510 16 592 78 Q604 92 584 92 Z" fill={body} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
    <rect x="30" y="34" width="330" height="16" rx="4" fill={stripe} opacity="0.85" />
    <path d="M410 34 L500 34 Q540 40 566 66 L410 66 Z" fill={stripe} opacity="0.85" />
    <rect x="0" y="68" width="590" height="10" fill={stripe} />
    <rect x="40" y="94" width="520" height="8" rx="3" fill={INK} />
  </g>
);

/** The tracks: two rails and sleepers, from x0 to x1 at height y. */
const Rails = ({x0, x1, y, color = INK}: {x0: number; x1: number; y: number; color?: string}) => {
  const ties = [];
  for (let x = x0; x + 14 <= x1; x += 40) ties.push(<rect key={x} x={x} y={y + 6} width="14" height="34" fill={MUTED} opacity="0.5" />);
  return (
    <g>
      {ties}
      <rect x={x0} y={y} width={x1 - x0} height="7" fill={color} />
      <rect x={x0} y={y + 34} width={x1 - x0} height="7" fill={color} />
    </g>
  );
};

/* ------------------------------------------------------------------ scene 1: the headline figure */

const ROUTE = {x0: 200, x1: 1720, y: 250};
const Route = () => {
  const draw = useProp('route-line', 'draw', 0);
  const stops = [{x: ROUTE.x0, n: '東京'}, {x: 960, n: '名古屋'}, {x: ROUTE.x1, n: '大阪'}];
  return (
    <svg viewBox="0 0 1920 640" width="1920" height="640">
      <Obj as="g" id="route-line">
        <Stroke d={`M ${ROUTE.x0} ${ROUTE.y} L ${ROUTE.x1} ${ROUTE.y}`} color={INK} width={10} draw={draw} />
        {stops.map((s) => (
          <g key={s.n} opacity={draw > 0.98 || s.x === ROUTE.x0 ? 1 : 0}>
            <circle cx={s.x} cy={ROUTE.y} r={s.x === 960 ? 16 : 26} fill="var(--vt-bg)" stroke={INK} strokeWidth="8" />
            <text x={s.x} y={ROUTE.y + 125} textAnchor="middle" fontFamily={SANS} fontSize={s.x === 960 ? 48 : 84} fontWeight="700" fill={s.x === 960 ? MUTED : INK}>{s.n}</text>
          </g>
        ))}
      </Obj>
      <Obj as="g" id="train-main"><Train x={120} y={148} s={0.8} /></Obj>
      <Obj as="g" id="train-more">
        <Rails x0={200} x1={1720} y={540} />
        <Train x={620} y={495} s={0.4} flip stripe={ORANGE} />
        <Train x={1000} y={495} s={0.4} flip stripe={ORANGE} />
        <Train x={1380} y={495} s={0.4} flip stripe={ORANGE} />
      </Obj>
    </svg>
  );
};

/** A minute dial: the whole circle is an hour, the wedge is the average delay. `sweep` is the wedge in degrees. */
const DIAL = {cx: 560, cy: 470, r: 300};
const polar = (deg: number, r: number) => [DIAL.cx + r * Math.sin((deg * Math.PI) / 180), DIAL.cy - r * Math.cos((deg * Math.PI) / 180)];
const Dial = () => {
  const sweep = useProp('sweep', 0);
  const ticks = [];
  for (let m = 0; m < 60; m++) {
    const [x1, y1] = polar(m * 6, DIAL.r - (m % 5 === 0 ? 34 : 18));
    const [x2, y2] = polar(m * 6, DIAL.r - 4);
    ticks.push(<line key={m} x1={x1} y1={y1} x2={x2} y2={y2} stroke={INK} strokeWidth={m % 5 === 0 ? 7 : 3} />);
  }
  const [wx, wy] = polar(sweep, DIAL.r - 4);
  const wedge = `M ${DIAL.cx} ${DIAL.cy} L ${DIAL.cx} ${DIAL.cy - DIAL.r + 4} A ${DIAL.r - 4} ${DIAL.r - 4} 0 0 1 ${wx} ${wy} Z`;
  return (
    <svg viewBox="0 0 1920 1080" width="1920" height="1080">
      <Obj as="g" id="dial-face">
        <circle cx={DIAL.cx} cy={DIAL.cy} r={DIAL.r} fill="var(--vt-panel)" stroke={INK} strokeWidth="8" />
        {ticks}
        <text x={DIAL.cx} y={DIAL.cy + 20} textAnchor="middle" fontFamily={SANS} fontSize="52" fontWeight="700" fill={MUTED}>1時間</text>
      </Obj>
      {sweep > 0 && <path d={wedge} fill={ORANGE} />}
    </svg>
  );
};

/* ------------------------------------------------------------------ scene 2: a track of its own */

const NoSign = ({cx, cy, children, id}: {cx: number; cy: number; children: any; id: string}) => {
  const draw = useProp(`slash-${id}`, 'draw', 0);
  return (
    <g>
      <Obj as="g" id={`icon-${id}`}>
        <circle cx={cx} cy={cy} r="130" fill="var(--vt-panel)" stroke={MUTED} strokeWidth="6" />
        {children}
      </Obj>
      <Obj as="g" id={`slash-${id}`}>
        <circle cx={cx} cy={cy} r="130" fill="none" stroke={RED} strokeWidth="14" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - draw} opacity={draw > 0 ? 1 : 0} />
        <Stroke d={`M ${cx - 92} ${cy - 92} L ${cx + 92} ${cy + 92}`} color={RED} width={14} draw={draw} />
      </Obj>
    </g>
  );
};

const Others = () => (
  <svg viewBox="0 0 1920 440" width="1920" height="440">
    {/* a freight wagon */}
    <NoSign id="freight" cx={380} cy={190}>
      <rect x="290" y="130" width="180" height="90" rx="6" fill="#8B7355" />
      <line x1="335" y1="130" x2="335" y2="220" stroke="#5E4C36" strokeWidth="5" />
      <line x1="380" y1="130" x2="380" y2="220" stroke="#5E4C36" strokeWidth="5" />
      <line x1="425" y1="130" x2="425" y2="220" stroke="#5E4C36" strokeWidth="5" />
      <circle cx="325" cy="236" r="14" fill={INK} /><circle cx="435" cy="236" r="14" fill={INK} />
    </NoSign>
    {/* a local train, front view */}
    <NoSign id="local" cx={960} cy={190}>
      <rect x="890" y="110" width="140" height="120" rx="20" fill="#4F8A5B" stroke={INK} strokeWidth="5" />
      <rect x="905" y="126" width="110" height="46" rx="8" fill="#DCEBF2" />
      <circle cx="918" cy="205" r="9" fill={YELLOW} /><circle cx="1002" cy="205" r="9" fill={YELLOW} />
    </NoSign>
    {/* a level crossing gate */}
    <NoSign id="gate" cx={1540} cy={190}>
      <rect x="1480" y="130" width="14" height="110" fill={INK} />
      <polygon points="1480,150 1610,128 1610,148 1480,170" fill="#F3F0E8" stroke={INK} strokeWidth="4" />
      <polygon points="1520,144 1544,140 1556,160 1532,164" fill={RED} />
      <polygon points="1572,133 1596,129 1596,146 1584,148" fill={RED} />
      <circle cx="1487" cy="122" r="12" fill={RED} />
    </NoSign>
    <text x="380" y="395" textAnchor="middle" fontFamily={SANS} fontSize="52" fontWeight="700" fill={INK}>貨物列車</text>
    <text x="960" y="395" textAnchor="middle" fontFamily={SANS} fontSize="52" fontWeight="700" fill={INK}>普通列車</text>
    <text x="1540" y="395" textAnchor="middle" fontFamily={SANS} fontSize="52" fontWeight="700" fill={INK}>踏切</text>
  </svg>
);

const Own = () => {
  const mark = useProp('own-mark', 'draw', 0);
  return (
    <svg viewBox="0 0 1920 340" width="1920" height="340">
      <Obj as="g" id="own-rails"><Rails x0={0} x1={1920} y={170} /></Obj>
      <Obj as="g" id="own-train"><Train x={120} y={65} s={0.9} /></Obj>
      <Obj as="g" id="own-mark">
        <Stroke d="M 160 262 L 1760 262" color={BLUE} width={10} draw={mark} />
        <text x="960" y="328" textAnchor="middle" fontFamily={SANS} fontSize="56" fontWeight="700" fill={BLUE} opacity={mark > 0.9 ? 1 : 0}>新幹線だけの線路</text>
      </Obj>
    </svg>
  );
};

/* ------------------------------------------------------------------ scene 3: the gap, kept by a computer */

const Atc = () => {
  const pos = useProp('pos', 0);
  const brake = useProp('brake', 0);
  const FRONT_TAIL = 1130;
  const REAR_NOSE = 140 + 590 * 0.8 + pos;
  const gap = FRONT_TAIL - REAR_NOSE;
  const near = gap < 230;
  const gapColor = near ? RED : BLUE;
  return (
    <svg viewBox="0 0 1920 700" width="1920" height="700">
      <Obj as="g" id="atc-box">
        <rect x="760" y="20" width="400" height="120" rx="18" fill="var(--vt-panel)" stroke={INK} strokeWidth="6" />
        <text x="960" y="78" textAnchor="middle" fontFamily="var(--vt-mono)" fontSize="52" fontWeight="700" fill={INK}>ATC</text>
        <text x="960" y="120" textAnchor="middle" fontFamily={SANS} fontSize="32" fill={MUTED}>自動列車制御</text>
      </Obj>
      <Obj as="g" id="atc-links">
        <line x1="860" y1="140" x2="380" y2="355" stroke={MUTED} strokeWidth="4" strokeDasharray="12 10" />
        <line x1="1060" y1="140" x2="1366" y2="355" stroke={MUTED} strokeWidth="4" strokeDasharray="12 10" />
      </Obj>
      <Rails x0={0} x1={1920} y={470} />
      <Obj as="g" id="front-train"><Train x={1130} y={365} s={0.8} /></Obj>
      <g transform={`translate(${pos} 0)`}><Obj as="g" id="rear-train"><Train x={140} y={365} s={0.8} stripe={ORANGE} /></Obj></g>
      {/* the gap between the two trains */}
      <Obj as="g" id="gap">
        <line x1={REAR_NOSE} y1="335" x2={FRONT_TAIL} y2="335" stroke={gapColor} strokeWidth="8" />
        <line x1={REAR_NOSE} y1="318" x2={REAR_NOSE} y2="352" stroke={gapColor} strokeWidth="8" />
        <line x1={FRONT_TAIL} y1="318" x2={FRONT_TAIL} y2="352" stroke={gapColor} strokeWidth="8" />
        <text x={(REAR_NOSE + FRONT_TAIL) / 2} y="300" textAnchor="middle" fontFamily={SANS} fontSize="48" fontWeight="700" fill={gapColor}>間隔</text>
      </Obj>
      {/* speed bar of the rear train */}
      <Obj as="g" id="speed">
        <text x="140" y="620" fontFamily={SANS} fontSize="40" fontWeight="700" fill={INK}>速度</text>
        <rect x="260" y="590" width="600" height="40" rx="8" fill="var(--vt-panel2)" stroke={MUTED} strokeWidth="3" />
        <rect x="260" y="590" width={600 * (1 - brake)} height="40" rx="8" fill={BLUE} />
      </Obj>
      <Obj as="g" id="brake-lamp">
        <circle cx="1040" cy="610" r="30" fill={RED} />
        <text x="1100" y="624" fontFamily={SANS} fontSize="52" fontWeight="700" fill={RED}>ブレーキ</text>
      </Obj>
    </svg>
  );
};

/* ------------------------------------------------------------------ scene 4: the first tremor outruns the big one */

const QUAKE = {ex: 240, ey: 330, sensor: 760, train: 1500};
const P_SPEED = 1400; // px per unit of t: the small first wave
const S_SPEED = 800; // the slower, larger wave: a picture of the order, not of real speeds
/** The part of a wave front of radius `r` that lies in the map strip, as an arc (nothing past the canvas). */
const STRIP = {top: -170, bottom: 70};
const arc = (r: number) => {
  if (r < 1 || QUAKE.ex + r > 1880) return 'M 0 0';
  const y1 = Math.max(STRIP.top, -r), y2 = Math.min(STRIP.bottom, r);
  const x = (dy: number) => (QUAKE.ex + Math.sqrt(r * r - dy * dy)).toFixed(1);
  return `M ${x(y1)} ${QUAKE.ey + y1} A ${r} ${r} 0 0 1 ${x(y2)} ${QUAKE.ey + y2}`;
};
const Quake = () => {
  const t = useProp('t', 0);
  const speed = useProp('train-gauge', 'v', 1);
  return (
    <svg viewBox="0 0 1920 700" width="1920" height="700">
            <rect x="0" y="160" width="1920" height="240" fill="var(--vt-panel2)" />
      <g>
        <Obj as="g" id="s-ring"><path d={arc(S_SPEED * t)} fill="none" stroke={ORANGE} strokeWidth="22" opacity={0.85} /></Obj>
        <Obj as="g" id="p-ring"><path d={arc(P_SPEED * t)} fill="none" stroke={BLUE} strokeWidth="8" /></Obj>
      </g>
      <Obj as="g" id="rail-line"><rect x="60" y={QUAKE.ey - 4} width="1800" height="8" fill={INK} /></Obj>
      <Obj as="g" id="epicenter">
        <circle cx={QUAKE.ex} cy={QUAKE.ey} r="26" fill={RED} stroke="var(--vt-bg)" strokeWidth="6" />
        <text x={QUAKE.ex} y={QUAKE.ey + 120} textAnchor="middle" fontFamily={SANS} fontSize="48" fontWeight="700" fill={INK}>震源</text>
      </Obj>
      <Obj as="g" id="sensor">
        <rect x={QUAKE.sensor - 24} y={QUAKE.ey - 24} width="48" height="48" rx="8" fill={BLUE} stroke="var(--vt-bg)" strokeWidth="6" />
        <text x={QUAKE.sensor} y={QUAKE.ey + 120} textAnchor="middle" fontFamily={SANS} fontSize="48" fontWeight="700" fill={INK}>地震計</text>
      </Obj>
      <Obj as="g" id="quake-train"><Train x={QUAKE.train - 180} y={QUAKE.ey - 68} s={0.6} /></Obj>
      <Obj as="g" id="power-off">
        <path d="M 784 318 Q 1130 250 1380 262" fill="none" stroke={YELLOW} strokeWidth="9" strokeDasharray="16 12" />
        <path d="M1138 60 L1098 124 L1128 124 L1112 180 L1166 106 L1134 106 Z" fill={YELLOW} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
        <text x="1230" y="130" fontFamily={SANS} fontSize="48" fontWeight="700" fill={INK}>送電を止める</text>
      </Obj>
      <Obj as="g" id="train-gauge">
        <text x="1340" y="560" fontFamily={SANS} fontSize="40" fontWeight="700" fill={INK}>速度</text>
        <rect x="1440" y="530" width="380" height="36" rx="8" fill="var(--vt-panel2)" stroke={MUTED} strokeWidth="3" />
        <rect x="1440" y="530" width={380 * speed} height="36" rx="8" fill={BLUE} />
      </Obj>
      <Obj as="g" id="key-p">
        <circle cx="200" cy="600" r="14" fill="none" stroke={BLUE} strokeWidth="8" />
        <text x="236" y="614" fontFamily={SANS} fontSize="40" fontWeight="700" fill={BLUE}>最初の小さな揺れ</text>
      </Obj>
      <Obj as="g" id="key-s">
        <circle cx="200" cy="660" r="14" fill="none" stroke={ORANGE} strokeWidth="14" />
        <text x="236" y="674" fontFamily={SANS} fontSize="40" fontWeight="700" fill={ORANGE}>あとから来る大きな揺れ</text>
      </Obj>
    </svg>
  );
};

/* ------------------------------------------------------------------ scene 5: the night window */

const DAY = {x: 140, w: 1640}; // 24 hours across 1640 px
const H = (h: number) => DAY.x + (h / 24) * DAY.w;
const Night = () => {
  const brace = useProp('brace', 'draw', 0);
  return (
    <svg viewBox="0 0 1920 340" width="1920" height="340">
      <Obj as="g" id="night-block">
        <rect x={H(0)} y="120" width={H(6) - H(0)} height="100" fill="#1B2A44" />
        <circle cx={H(3) - 8} cy="170" r="30" fill="#F3E9B5" />
        <circle cx={H(3) + 6} cy="160" r="26" fill="#1B2A44" />
        <text x={H(3)} y="274" textAnchor="middle" fontFamily={SANS} fontSize="44" fontWeight="700" fill={INK}>運行なし</text>
      </Obj>
      <Obj as="g" id="axis">
        <rect x={H(0)} y="120" width={DAY.w} height="100" fill="none" stroke={INK} strokeWidth="6" />
        {[0, 6, 12, 18, 24].map((h) => (
          <g key={h}>
            <line x1={H(h)} y1="220" x2={H(h)} y2="238" stroke={INK} strokeWidth="5" />
            <text x={H(h)} y="314" textAnchor="middle" fontFamily="var(--vt-mono)" fontSize="40" fill={MUTED} opacity={h === 3 ? 0 : 1}>{`${h}時`}</text>
          </g>
        ))}
      </Obj>
      <Obj as="g" id="day-block">
        <rect x={H(6)} y="126" width={H(24) - H(6) - 3} height="88" fill={BLUE} opacity="0.88" />
        <text x={(H(6) + H(24)) / 2} y="187" textAnchor="middle" fontFamily={SANS} fontSize="56" fontWeight="700" fill="#FFFFFF">列車が走る</text>
      </Obj>
      <Obj as="g" id="brace">
        <Stroke d={`M ${H(0)} 90 L ${H(0)} 72 L ${H(6)} 72 L ${H(6)} 90`} color={ORANGE} width={9} draw={brace} />
        <text x={H(3)} y="56" textAnchor="middle" fontFamily={SANS} fontSize="52" fontWeight="700" fill={ORANGE} opacity={brace > 0.9 ? 1 : 0}>約6時間</text>
      </Obj>
    </svg>
  );
};

const Worker = ({x}: {x: number}) => (
  <g>
    <polygon points={`${x + 16},84 ${x - 150},224 ${x - 40},240`} fill={YELLOW} opacity="0.35" />
    <circle cx={x} cy="60" r="22" fill="#E8C9A8" stroke={INK} strokeWidth="4" />
    <path d={`M ${x - 26} 56 Q ${x} 20 ${x + 26} 56 Z`} fill={YELLOW} stroke={INK} strokeWidth="4" />
    <rect x={x - 22} y="86" width="44" height="82" rx="10" fill="#F28C28" stroke={INK} strokeWidth="4" />
    <rect x={x - 20} y="168" width="16" height="60" fill={INK} /><rect x={x + 4} y="168" width="16" height="60" fill={INK} />
  </g>
);
const Yard = () => {
  const rail = useProp('yard-rail', 'draw', 0);
  return (
    <svg viewBox="0 0 1920 320" width="1920" height="320">
      <Obj as="g" id="yard-rail">
        <Stroke d="M 140 262 L 1780 262" color={INK} width={9} draw={rail} />
        <Stroke d="M 140 292 L 1780 292" color={INK} width={9} draw={rail} />
      </Obj>
      <Obj as="g" id="yard-wire">
        {[260, 760, 1260, 1660].map((x) => <rect key={x} x={x} y="20" width="10" height="244" fill={MUTED} />)}
        <line x1="140" y1="40" x2="1780" y2="40" stroke={MUTED} strokeWidth="6" />
        <line x1="140" y1="58" x2="1780" y2="58" stroke={MUTED} strokeWidth="3" />
      </Obj>
      <Obj as="g" id="yard-workers">
        <Worker x={560} /><Worker x={1000} /><Worker x={1480} />
      </Obj>
    </svg>
  );
};

/* ------------------------------------------------------------------ scene 6: seven minutes at the terminus */

const Turn = () => {
  const n = useProp('minutes', 0);
  const BW = 200;
  return (
    <svg viewBox="0 0 1920 640" width="1920" height="640">
      <Obj as="g" id="turn-train"><Train x={140} y={60} s={0.9} /></Obj>
      <Obj as="g" id="turn-label">
        <text x="140" y="300" fontFamily={SANS} fontSize="48" fontWeight="700" fill={INK}>到着</text>
        <text x="1780" y="300" textAnchor="end" fontFamily={SANS} fontSize="48" fontWeight="700" fill={INK}>出発</text>
      </Obj>
      <Obj as="g" id="turn-blocks">
        {Array.from({length: 7}, (_, i) => {
          const fill = Math.max(0, Math.min(1, n - i));
          return (
            <g key={i}>
              <rect x={140 + i * (BW + 20)} y="330" width={BW} height="150" rx="10" fill="none" stroke={INK} strokeWidth="5" />
              <rect x={140 + i * (BW + 20)} y="330" width={BW * fill} height="150" rx="10" fill={ORANGE} />
            </g>
          );
        })}
      </Obj>
      <Obj as="g" id="turn-count">
        <text x="960" y="600" textAnchor="middle" fontFamily={SANS} fontSize="96" fontWeight="700" fill={INK}>{`約${Math.round(n)}分`}</text>
      </Obj>
    </svg>
  );
};

/* ------------------------------------------------------------------ scene 7: the sum */

const SUM = {cx: 960, cy: 450, r: 250};
const REASONS = [
  {id: 'r-track', text: '専用の線路', x: 380, y: 170},
  {id: 'r-atc', text: '自動ブレーキ', x: 1540, y: 170},
  {id: 'r-quake', text: '地震への備え', x: 300, y: 500},
  {id: 'r-night', text: '夜の点検', x: 1620, y: 500},
  {id: 'r-turn', text: '短い折り返し', x: 960, y: 815},
];
const Sum = () => {
  const minute = useProp('deg', 36);
  const ticks = [];
  for (let m = 0; m < 12; m++) {
    const a = (m * 30 * Math.PI) / 180;
    ticks.push(<line key={m} x1={SUM.cx + (SUM.r - 28) * Math.sin(a)} y1={SUM.cy - (SUM.r - 28) * Math.cos(a)} x2={SUM.cx + (SUM.r - 6) * Math.sin(a)} y2={SUM.cy - (SUM.r - 6) * Math.cos(a)} stroke={INK} strokeWidth={m % 3 === 0 ? 8 : 4} />);
  }
  const hand = (deg: number, len: number, w: number, color: string) => (
    <line x1={SUM.cx} y1={SUM.cy} x2={SUM.cx + len * Math.sin((deg * Math.PI) / 180)} y2={SUM.cy - len * Math.cos((deg * Math.PI) / 180)} stroke={color} strokeWidth={w} strokeLinecap="round" />
  );
  return (
    <svg viewBox="0 0 1920 1080" width="1920" height="1080">
      <Obj as="g" id="sum-clock">
        <circle cx={SUM.cx} cy={SUM.cy} r={SUM.r} fill="var(--vt-panel)" stroke={INK} strokeWidth="9" />
        {ticks}
        {hand(0, SUM.r * 0.5, 12, INK)}
        {hand(minute, SUM.r * 0.78, 8, ORANGE)}
        <circle cx={SUM.cx} cy={SUM.cy} r="12" fill={INK} />
      </Obj>
      {REASONS.map((r) => {
        const dx = r.x - SUM.cx, dy = r.y - 14 - SUM.cy, d = Math.hypot(dx, dy);
        const edge = Math.min((29 * r.text.length + 14) / Math.max(0.01, Math.abs(dx / d)), 56 / Math.max(0.01, Math.abs(dy / d)));
        return (
          <Obj as="g" id={r.id} key={r.id}>
            <line x1={SUM.cx + (dx / d) * (SUM.r + 18)} y1={SUM.cy + (dy / d) * (SUM.r + 18)} x2={r.x - (dx / d) * edge} y2={r.y - 14 - (dy / d) * edge} stroke={BLUE} strokeWidth="5" />
            <text x={r.x} y={r.y + 16} textAnchor="middle" fontFamily={SANS} fontSize="58" fontWeight="700" fill={BLUE}>{r.text}</text>
          </Obj>
        );
      })}
    </svg>
  );
};

export default (
  <Doc id="shinkansen" poster={10} title="新幹線はなぜ時間通りに来るのか" lang="ja" voice="minimax:Japanese_KindLady" canvas="16x9" theme="visotalk/dark"
    tokens={{colors: {bg: '#F3F0E8', panel: '#FFFFFF', panel2: '#E7E2D5', border: '#CFC8B8', text: '#101C2B', muted: '#566170', faint: '#C4BEAE', data: '#0B5CAD', grad: '#E8541F', op: '#6A4BB5', good: '#1E8A4C', bad: '#C62F2F', warn: '#E0A100'}}}>

    <Scene id="figure">
      <Line id="f1">東京から大阪まで、新幹線は一日に何百本も走ります。</Line>
      <Line id="f2" text="それでも、遅れは平均で約1分です。" hold={1.4}>それでも、遅れは平均で約一分です。</Line>
      <Part id="route" x={0} y={170} w={1920} h={640}>{() => <Route />}</Part>
      <Part id="dial" x={0} y={0} w={1920} h={1080}>{() => <Dial />}</Part>
      <Part id="delay" x={1020} y={250} w={800} h={520}>{() => (
        <div style={{fontFamily: SANS, color: INK}}>
          <Obj id="delay-kicker" style={{fontSize: 56, fontWeight: 700, color: MUTED}}>平均の遅れ</Obj>
          <Obj id="delay-big" style={{fontSize: 260, fontWeight: 700, lineHeight: 1.05, color: ORANGE}}>約1分</Obj>
          <Obj id="delay-note" style={{fontSize: 32, color: MUTED}}>東海道新幹線・年度平均のめやす</Obj>
        </div>
      )}</Part>
      <Animation>
        <Appear on="route" line="f1" word="東京から" />
        <Appear on="route-line" line="f1" word="東京から" dur={0.9} />
        <Appear on="train-main" line="f1" word="新幹線は" />
        <Tween on="route-line" draw={1} dur={0.9} line="f1" word="東京から" />
        <Tween on="train-main" x={1000} dur={3.6} easing="easeInOutSine" line="f1" word="一日に" />
        <Appear on="train-more" line="f1" word="何百本" />
        <Disappear on="route" line="f2" word="それでも" />
        <Appear on="dial" line="f2" word="遅れは" />
        <Appear on="dial-face" line="f2" word="遅れは" />
        <Appear on="delay" line="f2" word="遅れは" />
        <Appear on="delay-kicker" line="f2" word="遅れは" />
        <Tween on="dial" sweep={6} dur={1.2} easing="easeOut" line="f2" word="平均で" />
        <Appear on="delay-big" line="f2" word="約一分" />
        <Appear on="delay-note" line="f2" word="約一分" offset={0.5} />
      </Animation>
    </Scene>

    <Scene id="own-track">
      <Line id="o1">まず、新幹線には専用の線路があります。</Line>
      <Line id="o2" hold={1.2}>貨物列車も、普通列車も、踏切もありません。</Line>
      <Part id="own" x={0} y={520} w={1920} h={340}>{() => <Own />}</Part>
      <Part id="others" x={0} y={90} w={1920} h={440}>{() => <Others />}</Part>
      <Animation>
        <Appear on="own" line="o1" word="新幹線には" />
        <Appear on="own-rails" line="o1" word="新幹線には" />
        <Appear on="own-train" line="o1" word="新幹線には" />
        <Tween on="own-mark" draw={1} dur={1.2} line="o1" word="専用の線路" />
        <Tween on="own-train" x={720} dur={7} easing="linear" line="o2" word="貨物列車" />
        <Appear on="others" line="o2" word="貨物列車" />
        <Appear on="icon-freight" line="o2" word="貨物列車" />
        <Appear on="icon-local" line="o2" word="普通列車" />
        <Appear on="icon-gate" line="o2" word="踏切も" />
        <Tween on={["slash-freight", "slash-local", "slash-gate"]} draw={1} dur={0.7} stagger={0.35} line="o2" word="ありません" />
      </Animation>
    </Scene>

    <Scene id="gap">
      <Line id="g1">次に、前の列車との間隔は、コンピューターが見張っています。</Line>
      <Line id="g2" hold={1.2}>近づきすぎれば、自動でブレーキがかかります。</Line>
      <Part id="atc" x={0} y={160} w={1920} h={700}>{() => <Atc />}</Part>
      <Animation>
        <Appear on="atc" line="g1" word="前の列車" />
        <Appear on="gap" line="g1" word="間隔" />
        <Appear on="atc-box" line="g1" word="コンピューター" />
        <Appear on="atc-links" line="g1" word="見張って" />
        <Tween on="atc" pos={250} dur={1.6} easing="linear" line="g2" word="近づきすぎれば" />
        <Appear on="speed" line="g2" word="自動で" />
        <Appear on="brake-lamp" line="g2" word="ブレーキ" />
        <Tween on="atc" pos={330} brake={1} dur={1.4} easing="easeOutQuad" line="g2" word="ブレーキ" />
      </Animation>
    </Scene>

    <Scene id="quake">
      <Line id="q1">地震が起きても、最初の小さな揺れを感知します。</Line>
      <Line id="q2" hold={1.2}>大きな揺れが来る前に、電気を止めて減速させます。</Line>
      <Part id="quake" x={0} y={140} w={1920} h={700}>{() => <Quake />}</Part>
      <Animation>
        <Appear on="quake" line="q1" word="地震が" />
        <Appear on="rail-line" line="q1" word="地震が" />
        <Appear on="epicenter" line="q1" word="地震が" />
        <Appear on="quake-train" line="q1" word="地震が" />
        <Appear on="key-p" line="q1" word="最初の小さな" />
        <Appear on="p-ring" line="q1" word="最初の小さな" />
        <Tween on="quake" t={1.6} dur={9.6} easing="linear" line="q1" word="最初の小さな" />
        <Appear on="sensor" line="q1" word="感知" />
        <Appear on="key-s" line="q2" word="大きな揺れが" />
        <Appear on="s-ring" line="q2" word="大きな揺れが" />
        <Appear on="power-off" line="q2" word="電気を止めて" />
        <Appear on="train-gauge" line="q2" word="電気を止めて" />
        <Tween on="train-gauge" v={0} dur={1.4} easing="easeOutQuad" line="q2" word="減速" />
      </Animation>
    </Scene>

    <Scene id="night">
      <Line id="n1">そして、夜は列車が走りません。</Line>
      <Line id="n2" hold={1.4}>その約六時間で、線路と設備を点検します。</Line>
      <Part id="night" x={0} y={170} w={1920} h={340}>{() => <Night />}</Part>
      <Part id="yard" x={0} y={560} w={1920} h={320}>{() => <Yard />}</Part>
      <Animation>
        <Appear on="night" line="n1" word="夜は" />
        <Appear on="axis" line="n1" word="夜は" />
        <Appear on="night-block" line="n1" word="夜は" />
        <Appear on="day-block" line="n1" word="列車が" />
        <Tween on="brace" draw={1} dur={0.9} line="n2" word="約六時間" />
        <Tween on="yard-rail" draw={1} dur={1.0} line="n2" word="線路と" />
        <Appear on="yard" line="n2" word="線路と" />
        <Appear on="yard-wire" line="n2" word="設備を" />
        <Appear on="yard-workers" line="n2" word="点検" />
      </Animation>
    </Scene>

    <Scene id="turnaround">
      <Line id="t1" text="駅でも、折り返しの掃除は約7分で終わります。" hold={1.6}>駅でも、折り返しの掃除は約七分で終わります。</Line>
      <Part id="turn" x={0} y={200} w={1920} h={640}>{() => <Turn />}</Part>
      <Animation>
        <Appear on="turn" line="t1" word="駅でも" />
        <Appear on="turn-train" line="t1" word="駅でも" />
        <Appear on="turn-label" line="t1" word="折り返し" />
        <Appear on="turn-blocks" line="t1" word="掃除は" />
        <Appear on="turn-count" line="t1" word="約七分" />
        <Tween on="turn" minutes={7} dur={3.2} easing="linear" line="t1" word="約七分" />
      </Animation>
    </Scene>

    <Scene id="sum">
      <Line id="s1">時間通りは、偶然ではありません。</Line>
      <Line id="s2" hold={1.6}>いくつもの仕組みが、毎日の定刻を支えています。</Line>
      <Part id="sum" x={0} y={0} w={1920} h={1080}>{() => <Sum />}</Part>
      <Animation>
        <Appear on="sum" line="s1" word="時間通り" />
        <Appear on="sum-clock" line="s1" word="時間通り" />
        <Tween on="sum" deg={0} dur={1.4} easing="easeInOutSine" line="s1" word="時間通り" />
        <Appear on={["r-track", "r-atc", "r-quake", "r-night", "r-turn"]} stagger={0.45} line="s2" word="仕組み" />
      </Animation>
    </Scene>
  </Doc>
);
