import {Doc, Scene, Line, Part, Animation, Appear, Disappear, Tween, Set} from '@visotalk/jsx';
import {useProp, useTime, Obj} from '@visotalk/runtime';

// ---- palette (anatomy colours; text uses theme tokens) ----
const AIR = '#7cc4f2';
const MUSCLE = '#f08a5d';
const FOLD = '#ec7fa0';
const SENSE = '#4fd6b4';
const MOTOR = '#b79cff';
const WARM = '#f4c95d';

const SANS = 'var(--vt-sans)';

// A filled arrow head at (x, y) pointing along (dx, dy).
function head(x: number, y: number, dx: number, dy: number, s = 26) {
  const n = Math.hypot(dx, dy);
  const ux = dx / n, uy = dy / n;
  const px = -uy, py = ux;
  const a = [x, y];
  const b = [x - ux * s + px * s * 0.55, y - uy * s + py * s * 0.55];
  const c = [x - ux * s - px * s * 0.55, y - uy * s - py * s * 0.55];
  return [a, b, c].map((p) => p.map((v) => Math.round(v)).join(',')).join(' ');
}

// ---- the hook: a word that hiccups ----
function Hook() {
  const t = useTime();
  const phase = (t % 1.7) / 0.22;
  const jolt = phase < 1 ? 1 - phase : 0;
  const lift = Math.round(jolt * jolt * 34);
  const spike = Math.round(jolt * 120);
  return (
    <div style={{position: 'relative', width: 1920, height: 620, fontFamily: SANS}}>
      <div style={{position: 'absolute', left: 0, right: 0, top: 20 - lift, textAlign: 'center', fontSize: 400, fontWeight: 700, lineHeight: '440px', color: 'var(--vt-text)', letterSpacing: -6}}>
        딸꾹<span style={{color: WARM}}>!</span>
      </div>
      <svg width={1920} height={620} style={{position: 'absolute', left: 0, top: 0}}>
        <polyline fill="none" stroke={WARM} strokeWidth={6} strokeLinejoin="round" points={`260,560 880,560 905,${560 - spike} 940,${560 + Math.round(spike * 0.3)} 965,560 1660,560`} />
      </svg>
    </div>
  );
}

// ---- the body: diaphragm, lungs, airway, glottis (props: dia 0..1, air 0..1, glottis 0..1) ----
function Body() {
  const dia = useProp('dia', 0);
  const air = useProp('air', 0);
  const g = useProp('glottis', 0);
  const y0 = 640 + 30 * dia;
  const peak = 540 + 80 * dia;
  const c = 2 * peak - y0;
  const sc = 1 + 0.07 * air;
  const tipL = 560 - 28 * (1 - g);
  const tipR = 560 + 28 * (1 - g);
  const lungFill = `rgba(124,196,242,${0.16 + 0.24 * air})`;
  const label = {position: 'absolute' as const, left: 0, width: 250, textAlign: 'right' as const, fontSize: 64, fontWeight: 700, color: 'var(--vt-text)', lineHeight: '70px'};
  return (
    <div style={{position: 'relative', width: 860, height: 840, fontFamily: SANS}}>
      <svg width={860} height={840} style={{position: 'absolute', left: 0, top: 0}}>
        <Obj id="torso" as="g">
          <rect x={270} y={190} width={580} height={640} rx={120} fill="none" stroke="var(--vt-border)" strokeWidth={4} strokeDasharray="14 12" />
        </Obj>
        <Obj id="lungs" as="g">
          <g transform={`translate(560 420) scale(${sc}) translate(-560 -420)`}>
            <path d="M535,230 C450,215 350,280 340,400 C330,500 360,590 420,650 L420,720 L535,720 Z" fill={lungFill} stroke={AIR} strokeWidth={5} strokeLinejoin="round" />
            <path d="M585,230 C670,215 770,280 780,400 C790,500 760,590 700,650 L700,720 L585,720 Z" fill={lungFill} stroke={AIR} strokeWidth={5} strokeLinejoin="round" />
          </g>
          <path d="M530,60 L530,170 L548,205 L548,300 M590,60 L590,170 L572,205 L572,300 M548,300 L470,345 M572,300 L650,345" fill="none" stroke="var(--vt-muted)" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
          <polygon points={`530,98 530,132 ${tipL},115`} fill={FOLD} stroke={FOLD} strokeWidth={6} strokeLinejoin="round" />
          <polygon points={`590,98 590,132 ${tipR},115`} fill={FOLD} stroke={FOLD} strokeWidth={6} strokeLinejoin="round" />
        </Obj>
        <path d={`M300,${y0 + 82} Q560,${c + 82} 820,${y0 + 82} L820,790 L300,790 Z`} fill="var(--vt-bg)" />
        <Obj id="dia" as="g">
          <path d={`M300,${y0} Q560,${c} 820,${y0} L820,${y0 + 80} Q560,${c + 80} 300,${y0 + 80} Z`} fill={MUSCLE} stroke={MUSCLE} strokeWidth={4} strokeLinejoin="round" />
        </Obj>
        <Obj id="lead-dia" as="g"><path d="M262,665 L340,665" stroke="var(--vt-muted)" strokeWidth={4} fill="none" /></Obj>
        <Obj id="lead-lung" as="g"><path d="M262,410 L352,410" stroke="var(--vt-muted)" strokeWidth={4} fill="none" /></Obj>
        <Obj id="inflow" as="g"><polygon points="548,0 572,0 572,28 590,28 560,62 530,28 548,28" fill={AIR} /></Obj>
        <Obj id="gasp" as="g"><polygon points="544,0 576,0 576,26 600,26 560,66 520,26 544,26" fill={WARM} /></Obj>
        <Obj id="pull" as="g">
          <polygon points="350,560 380,560 380,610 400,610 365,650 330,610 350,610" fill={WARM} />
          <polygon points="740,560 770,560 770,610 790,610 755,650 720,610 740,610" fill={WARM} />
        </Obj>
        <Obj id="stomach" as="g">
          <path d="M640,775 C640,745 720,738 770,752 C820,768 822,810 780,818 C730,828 640,815 640,775 Z" fill="rgba(240,201,93,0.18)" stroke={WARM} strokeWidth={4} strokeLinejoin="round" />
        </Obj>
      </svg>
      <Obj id="lbl-dia" style={{...label, top: 628}}>가로막</Obj>
      <Obj id="lbl-stomach" style={{position: 'absolute', left: 660, width: 140, top: 770, textAlign: 'center', fontSize: 40, fontWeight: 700, color: WARM}}>위</Obj>
      <Obj id="lbl-lung" style={{...label, top: 372, color: AIR}}>폐</Obj>
    </div>
  );
}

// ---- the lens: the glottis, large ----
function Lens() {
  const g = useProp('g', 0);
  const tipL = 690 - 70 * (1 - g);
  const tipR = 690 + 70 * (1 - g);
  return (
    <div style={{position: 'relative', width: 960, height: 600, fontFamily: SANS}}>
      <svg width={960} height={600} style={{position: 'absolute', left: 0, top: 0}}>
        <Obj id="zoomlines" as="g">
          <circle cx={46} cy={115} r={40} fill="none" stroke={WARM} strokeWidth={4} />
          <path d="M80,86 L558,112 M80,144 L558,488" stroke={WARM} strokeWidth={3} strokeDasharray="10 10" fill="none" />
        </Obj>
        <Obj id="lenscircle" as="g">
          <circle cx={690} cy={300} r={230} fill="var(--vt-panel)" stroke={WARM} strokeWidth={6} />
          <path d="M540,130 L540,470 M840,130 L840,470" stroke="var(--vt-muted)" strokeWidth={8} strokeLinecap="round" fill="none" />
          <polygon points={`545,200 545,400 ${tipL},300`} fill={FOLD} stroke={FOLD} strokeWidth={22} strokeLinejoin="round" />
          <polygon points={`835,200 835,400 ${tipR},300`} fill={FOLD} stroke={FOLD} strokeWidth={22} strokeLinejoin="round" />
          <polygon points="670,150 710,150 710,230 740,230 690,290 640,230 670,230" fill={WARM} opacity={0.95 - 0.65 * g} />
        </Obj>
      </svg>
      <Obj id="lbl-glottis" style={{position: 'absolute', left: 460, width: 460, top: 536, textAlign: 'center', fontSize: 52, fontWeight: 700, color: FOLD}}>성문</Obj>
    </div>
  );
}

// ---- the reflex arc ----
const R_S1 = 'M282,785 C600,820 810,720 800,500 S790,260 735,200';
const R_S2 = 'M262,420 C450,420 540,320 598,198';
const R_MD = 'M660,226 C660,420 640,600 322,660';
const R_MG = 'M575,128 C450,40 230,40 84,112';

function Reflex() {
  const s1 = useProp('s1', 0);
  const s2 = useProp('s2', 0);
  const md = useProp('md', 0);
  const mg = useProp('mg', 0);
  const line = (d: string, p: number, col: string) => (
    <path d={d} pathLength={1} fill="none" stroke={col} strokeWidth={9} strokeLinecap="butt" strokeDasharray="1 1" strokeDashoffset={1 - p} />
  );
  const done = (p: number) => (p > 0.985 ? 1 : 0);
  return (
    <div style={{position: 'relative', width: 980, height: 850, fontFamily: SANS}}>
      <svg width={980} height={850} style={{position: 'absolute', left: 0, top: 0}}>
        {line(R_S1, s1, SENSE)}
        {line(R_S2, s2, SENSE)}
        {line(R_MD, md, MOTOR)}
        {line(R_MG, mg, MOTOR)}
        <polygon points={head(735, 200, -55, -60)} fill={SENSE} opacity={done(s1)} />
        <polygon points={head(598, 198, 58, -122)} fill={SENSE} opacity={done(s2)} />
        <polygon points={head(322, 660, -318, 60)} fill={MOTOR} opacity={done(md)} />
        <polygon points={head(84, 112, -146, 72)} fill={MOTOR} opacity={done(mg)} />
        <Obj id="node" as="g">
          <circle cx={660} cy={140} r={88} fill="var(--vt-panel)" stroke={WARM} strokeWidth={6} />
        </Obj>
      </svg>
      <Obj id="node-lbl" style={{position: 'absolute', left: 572, width: 176, top: 108, textAlign: 'center', fontSize: 44, fontWeight: 700, color: 'var(--vt-text)'}}>뇌줄기</Obj>
      <Obj id="lbl-signal" style={{position: 'absolute', left: 330, top: 448, fontSize: 52, fontWeight: 700, color: SENSE}}>신호</Obj>
      <Obj id="lbl-order" style={{position: 'absolute', left: 676, top: 372, fontSize: 52, fontWeight: 700, color: MOTOR}}>명령</Obj>
    </div>
  );
}

// ---- triggers ----
const FOODS = [
  {id: 'f1', x: 125, y: 300, r: 30, c: '#e7803c', dy: -250},
  {id: 'f2', x: 210, y: 400, r: 34, c: '#7fbf5a', dy: -350},
  {id: 'f3', x: 120, y: 400, r: 26, c: '#d9a35b', dy: -350},
  {id: 'f4', x: 255, y: 345, r: 30, c: '#e9c85a', dy: -300},
  {id: 'f5', x: 185, y: 345, r: 24, c: '#c85a5a', dy: -300},
];
const BUBBLES = [
  {id: 'b1', x: 120, y: 430, r: 14},
  {id: 'b2', x: 190, y: 470, r: 20},
  {id: 'b3', x: 260, y: 420, r: 12},
  {id: 'b4', x: 150, y: 360, r: 16},
  {id: 'b5', x: 230, y: 380, r: 18},
  {id: 'b6', x: 300, y: 380, r: 12},
];

function Stomach() {
  const bloat = useProp('bloat', 0);
  const sc = 1 + 0.12 * bloat;
  return (
    <svg width={560} height={800} viewBox="0 0 400 571" style={{position: 'absolute', left: 0, top: 0}}>
      <Obj id="stom" as="g">
        <g transform={`translate(200 300) scale(${sc}) translate(-200 -300)`}>
          <path d="M150,30 C100,30 90,70 98,120 C70,200 20,270 40,360 C60,470 190,530 290,470 C370,420 370,330 310,300 C250,275 215,260 205,210 C195,160 215,120 210,70 C208,40 180,30 150,30 Z" fill="rgba(240,138,93,0.14)" stroke={MUSCLE} strokeWidth={5} strokeLinejoin="round" />
        </g>
      </Obj>
      {FOODS.map((f) => (
        <Obj key={f.id} id={f.id} as="g"><circle cx={f.x} cy={f.y} r={f.r} fill={f.c} /></Obj>
      ))}
      {BUBBLES.map((b) => (
        <Obj key={b.id} id={b.id} as="g"><circle cx={b.x} cy={b.y} r={b.r} fill="none" stroke={AIR} strokeWidth={4} /></Obj>
      ))}
    </svg>
  );
}

function Glass() {
  return (
    <svg width={414} height={598} viewBox="0 0 360 520">
      <path d="M60,150 L300,150 L270,480 Q180,500 90,480 Z" fill="rgba(124,196,242,0.12)" stroke="var(--vt-muted)" strokeWidth={6} strokeLinejoin="round" />
      <path d="M72,230 L288,230 L270,480 Q180,500 90,480 Z" fill="rgba(124,196,242,0.38)" />
      <path d="M215,150 L260,20 L300,20" fill="none" stroke={MUSCLE} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" />
      {[[130, 300, 12], [190, 360, 16], [235, 290, 10], [150, 420, 14], [215, 430, 11]].map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="none" stroke="#e6f4ff" strokeWidth={4} />
      ))}
    </svg>
  );
}

function Faces() {
  const face = (cx: number, kind: 'laugh' | 'shock') => (
    <g>
      <circle cx={cx} cy={240} r={170} fill="var(--vt-panel)" stroke={WARM} strokeWidth={8} />
      {kind === 'laugh' ? (
        <g fill="none" stroke="var(--vt-text)" strokeWidth={12} strokeLinecap="round">
          <path d={`M${cx - 85},215 Q${cx - 55},165 ${cx - 25},215`} />
          <path d={`M${cx + 25},215 Q${cx + 55},165 ${cx + 85},215`} />
          <path d={`M${cx - 95},270 Q${cx},400 ${cx + 95},270 Z`} fill={MUSCLE} />
        </g>
      ) : (
        <g fill="none" stroke="var(--vt-text)" strokeWidth={12} strokeLinecap="round">
          <circle cx={cx - 55} cy={225} r={22} fill="var(--vt-text)" />
          <circle cx={cx + 55} cy={225} r={22} fill="var(--vt-text)" />
          <path d={`M${cx - 85},160 Q${cx - 55},135 ${cx - 25},160`} />
          <path d={`M${cx + 25},160 Q${cx + 55},135 ${cx + 85},160`} />
          <ellipse cx={cx} cy={320} rx={30} ry={42} fill={MUSCLE} />
        </g>
      )}
    </g>
  );
  return (
    <svg width={1500} height={460} viewBox="0 0 1500 460">
      <Obj id="face-laugh" as="g">{face(300, 'laugh')}</Obj>
      <Obj id="face-shock" as="g">{face(1200, 'shock')}</Obj>
    </svg>
  );
}

// ---- the ending: two traces over time ----
function trace(y: number, amps: number[], n: number, gap: number, x0 = 0) {
  let d = `M${x0},${y}`;
  for (let i = 0; i < n; i++) {
    const xs = x0 + 60 + i * gap;
    const a = amps[i] ?? 0;
    if (a > 0) d += ` L${xs},${y} L${xs + 14},${y - a} L${xs + 40},${y + Math.round(a * 0.3)} L${xs + 56},${y}`;
  }
  return d + ` L${x0 + 60 + n * gap},${y}`;
}
const T_FADE = trace(160, [150, 120, 95, 60, 32, 0, 0, 0], 8, 140, 340);
const T_KEEP = trace(460, [110, 110, 110, 110, 110, 110, 110, 110], 8, 140, 340);

function Traces() {
  const a = useProp('a', 0);
  const b = useProp('b', 0);
  return (
    <div style={{position: 'relative', width: 1720, height: 640, fontFamily: SANS}}>
      <svg width={1720} height={640} style={{position: 'absolute', left: 0, top: 0}}>
        <path d={T_FADE} pathLength={1} fill="none" stroke={SENSE} strokeWidth={8} strokeLinejoin="round" strokeDasharray="1 1" strokeDashoffset={1 - a} />
        <path d={T_KEEP} pathLength={1} fill="none" stroke={WARM} strokeWidth={8} strokeLinejoin="round" strokeDasharray="1 1" strokeDashoffset={1 - b} />
        <Obj id="cross" as="g">
          <rect x={1600} y={405} width={36} height={110} rx={8} fill="#ee5d5d" />
          <rect x={1563} y={442} width={110} height={36} rx={8} fill="#ee5d5d" />
        </Obj>
      </svg>
      <Obj id="t-most" style={{position: 'absolute', left: 0, top: 120, fontSize: 52, fontWeight: 700, color: SENSE}}>대부분</Obj>
      <Obj id="t-long" style={{position: 'absolute', left: 0, top: 420, fontSize: 48, fontWeight: 700, color: WARM}}>오래 이어지면</Obj>
      <Obj id="t-doctor" style={{position: 'absolute', left: 1480, top: 540, width: 290, textAlign: 'center', fontSize: 56, fontWeight: 700, color: '#ee5d5d'}}>병원</Obj>
    </div>
  );
}

export default <Doc id="ko-hiccups" title="왜 딸꾹질이 날까" lang="ko" voice="minimax:Korean_IntellectualSenior" theme="visotalk/dark" canvas="16x9">
  <Scene id="hook">
    <Line id="l1">딸꾹! 이 작은 소리는 도대체 어디서 오는 걸까요?</Line>
    <Part id="hook-word" x={0} y={200} w={1920} h={620}>{() => <Hook />}</Part>
    <Animation>
      <Appear on="hook-word" line="l1" word="딸꾹" />
      <Disappear on="hook-word" at="end" offset={-0.6} />
    </Animation>
  </Scene>

  <Scene id="mechanism">
    <Line id="l2">가슴과 배 사이에는 가로막이라는 얇은 근육이 있습니다.</Line>
    <Line id="l3">숨을 들이쉴 때 이 근육이 내려가며 폐를 부풀립니다.</Line>
    <Line id="l4">딸꾹질은 이 근육이 갑자기 제멋대로 수축하며 시작됩니다.</Line>
    <Line id="l5">공기가 확 빨려 들어오는 순간, 목구멍의 성문이 탁 닫힙니다.</Line>
    <Line id="l6">막힌 공기가 성대에 부딪히며 그 소리가 납니다.</Line>
    <Line id="l7">이 모든 일은 하나의 반사 회로입니다.</Line>
    <Line id="l8">위와 가슴에서 보낸 신호가 신경을 타고 뇌줄기로 올라갑니다.</Line>
    <Line id="l9" hold={1.5}>뇌줄기는 가로막과 성문에 곧바로 명령을 돌려보냅니다.</Line>
    <Part id="body" x={380} y={30} w={860} h={840}>{() => <Body />}</Part>
    <Part id="lens" x={900} y={30} w={960} h={600}>{() => <Lens />}</Part>
    <Part id="burst" x={1330} y={150} w={560} h={360}>{() => (
      <div style={{width: 560, height: 360, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SANS, fontSize: 190, fontWeight: 700, color: WARM}}>딸꾹!</div>
    )}</Part>
    <Part id="rtitle" x={60} y={110} w={560} h={310}>{() => (
      <div style={{fontFamily: SANS, fontSize: 130, fontWeight: 700, lineHeight: '150px', color: 'var(--vt-text)'}}>반사<br /><span style={{color: WARM}}>회로</span></div>
    )}</Part>
    <Part id="reflex" x={900} y={30} w={980} h={850}>{() => <Reflex />}</Part>
    <Animation>
      <Set on="burst" scale={0.5} at="start" />
      <Appear on="torso" line="l2" word="가슴과" />
      <Appear on="lungs" line="l2" word="가슴과" offset={0.5} />
      <Appear on="dia" line="l2" word="가로막이라는" />
      <Appear on={["lbl-dia", "lead-dia"]} line="l2" word="가로막이라는" offset={0.3} />
      <Appear on="body" at="start" />

      <Appear on="inflow" line="l3" word="들이쉴" />
      <Tween on="body" dia={1} dur={1.1} easing="easeInOut" line="l3" word="내려가며" />
      <Appear on={["lbl-lung", "lead-lung"]} line="l3" word="폐를" />
      <Tween on="body" air={1} dur={1.0} easing="easeInOut" line="l3" word="부풀립니다" />

      <Disappear on="inflow" line="l4" word="딸꾹질은" />
      <Tween on="body" dia={0} air={0} dur={0.9} easing="easeInOut" line="l4" word="딸꾹질은" />
      <Tween on="body" dia={1} air={0.45} dur={0.22} easing="easeOutQuart" line="l4" word="갑자기" />
      <Appear on="pull" line="l4" word="수축하며" />

      <Disappear on="pull" line="l5" word="공기가 확" />
      <Appear on="gasp" line="l5" word="공기가 확" />
      <Tween on="body" air={1} dur={0.3} easing="easeOut" line="l5" word="공기가 확" />
      <Appear on="lens" line="l5" word="목구멍의" />
      <Appear on="zoomlines" line="l5" word="목구멍의" />
      <Appear on="lenscircle" line="l5" word="성문이" />
      <Appear on="lbl-glottis" line="l5" word="성문이" />
      <Tween on="body" glottis={1} dur={0.2} easing="easeOutQuart" line="l5" word="닫힙니다" />
      <Tween on="lens" g={1} dur={0.2} easing="easeOutQuart" line="l5" word="닫힙니다" />
      <Disappear on="gasp" line="l5" word="닫힙니다" offset={0.2} />

      <Disappear on="lens" line="l6" word="그 소리가" dur={0.4} />
      <Appear on="burst" line="l6" word="그 소리가" />
      <Tween on="burst" scale={1} dur={0.5} easing="easeOutBack(2.2)" line="l6" word="그 소리가" />

      <Disappear on="burst" line="l7" word="이 모든 일은" />
      <Appear on="rtitle" line="l7" word="반사" />

      <Appear on={["stomach", "lbl-stomach"]} line="l8" word="위와" />
      <Appear on="reflex" line="l8" word="위와" />
      <Appear on="lbl-signal" line="l8" word="신호가" />
      <Tween on="reflex" s1={1} dur={2.4} easing="easeInOut" line="l8" word="신경을 타고" />
      <Tween on="reflex" s2={1} dur={1.8} easing="easeInOut" line="l8" word="신경을 타고" offset={0.2} />
      <Appear on={["node", "node-lbl"]} line="l8" word="뇌줄기로" />

      <Tween on="reflex" md={1} dur={1.4} easing="easeInOut" line="l9" word="가로막과" />
      <Appear on="lbl-order" line="l9" word="명령을" />
      <Tween on="reflex" mg={1} dur={1.2} easing="easeInOut" line="l9" word="성문에" />
      <Tween on="body" dia={0} air={0} glottis={0} dur={1.2} easing="easeInOut" line="l9" word="돌려보냅니다" />
    </Animation>
  </Scene>

  <Scene id="triggers">
    <Line id="l10">원인은 흔합니다. 음식을 너무 빨리 먹거나,</Line>
    <Line id="l11">탄산음료로 위가 부풀거나,</Line>
    <Line id="l12" hold={1.2}>갑자기 웃거나 놀랄 때도 이 회로가 건드려집니다.</Line>
    <Part id="stomach-big" x={900} y={70} w={560} h={800}>{() => <Stomach />}</Part>
    <Part id="glass" x={440} y={230} w={414} h={598}>{() => <Glass />}</Part>
    <Part id="faces" x={210} y={190} w={1500} h={460}>{() => <Faces />}</Part>
    <Part id="burst2" x={560} y={640} w={800} h={220}>{() => (
      <div style={{width: 800, height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SANS, fontSize: 150, fontWeight: 700, color: WARM}}>딸꾹!</div>
    )}</Part>
    <Animation>
      <Set on="f1" y={-250} at="start" />
      <Set on="f2" y={-350} at="start" />
      <Set on="f3" y={-350} at="start" />
      <Set on="f4" y={-300} at="start" />
      <Set on="f5" y={-300} at="start" />
      <Set on="burst2" scale={0.5} at="start" />
      <Appear on="stomach-big" line="l10" word="원인은" />
      <Appear on="stom" line="l10" word="원인은" />
      <Appear on="f1" line="l10" word="음식을" />
      <Tween on="f1" y={0} dur={0.7} easing="easeIn" line="l10" word="음식을" />
      <Appear on="f2" line="l10" word="음식을" offset={0.25} />
      <Tween on="f2" y={0} dur={0.7} easing="easeIn" line="l10" word="음식을" offset={0.25} />
      <Appear on="f3" line="l10" word="너무 빨리" />
      <Tween on="f3" y={0} dur={0.6} easing="easeIn" line="l10" word="너무 빨리" />
      <Appear on="f4" line="l10" word="너무 빨리" offset={0.2} />
      <Tween on="f4" y={0} dur={0.6} easing="easeIn" line="l10" word="너무 빨리" offset={0.2} />
      <Appear on="f5" line="l10" word="너무 빨리" offset={0.4} />
      <Tween on="f5" y={0} dur={0.6} easing="easeIn" line="l10" word="너무 빨리" offset={0.4} />

      <Disappear on={["f1", "f2", "f3", "f4", "f5"]} line="l11" word="탄산음료로" stagger={0.05} />
      <Appear on="glass" line="l11" word="탄산음료로" offset={0.3} />
      <Appear on={["b1", "b2", "b3", "b4", "b5", "b6"]} line="l11" word="위가" stagger={0.2} />
      <Tween on="stomach-big" bloat={1} dur={1.6} easing="easeInOut" line="l11" word="위가" />

      <Disappear on={["stomach-big", "glass"]} line="l12" word="갑자기" />
      <Appear on="faces" line="l12" word="갑자기" offset={0.4} />
      <Appear on="face-laugh" line="l12" word="웃거나" />
      <Appear on="face-shock" line="l12" word="놀랄" />
      <Appear on="burst2" line="l12" word="건드려집니다" />
      <Tween on="burst2" scale={1} dur={0.5} easing="easeOutBack(2.2)" line="l12" word="건드려집니다" />
    </Animation>
  </Scene>

  <Scene id="ending">
    <Line id="l13" hold={2}>대부분은 저절로 멎습니다. 오래 이어진다면 병원에 가 보세요.</Line>
    <Part id="traces" x={100} y={150} w={1720} h={640}>{() => <Traces />}</Part>
    <Animation>
      <Appear on="traces" line="l13" word="대부분은" />
      <Appear on="t-most" line="l13" word="대부분은" />
      <Tween on="traces" a={1} dur={3.2} easing="linear" line="l13" word="대부분은" />
      <Appear on="t-long" line="l13" word="오래 이어진다면" />
      <Tween on="traces" b={1} dur={3.2} easing="linear" line="l13" word="오래 이어진다면" />
      <Appear on={["cross", "t-doctor"]} line="l13" word="병원에" />
    </Animation>
  </Scene>
</Doc>;
