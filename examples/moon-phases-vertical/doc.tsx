import {Doc, Scene, Line, Part, Animation, Appear, Disappear, Tween, Set} from '@visotalk/jsx';
import {Obj, useProp} from '@visotalk/runtime';

/**
 * Why the Moon has phases, as a 9:16 short for TikTok and Shorts. One idea: half the Moon is always lit; the phase is the angle we look from.
 * Everything sits in the upper half (y 200 to 980); the lower half is the word-by-word caption block (`captions: 'words'`).
 * `theta` is the Moon's elongation from the Sun as seen from Earth: 0 new, 90 first quarter, 180 full, 270 last quarter.
 */

const LIT = '#f3ead2';
const DARK = '#1a2030';
const SUN = '#ffb43a';

const norm = (a: number) => ((a % 360) + 360) % 360;

const CRATERS: Array<[number, number, number]> = [[-0.38, -0.42, 0.17], [0.32, -0.22, 0.23], [0.08, 0.46, 0.19], [-0.5, 0.15, 0.1], [0.58, 0.38, 0.11], [-0.12, -0.72, 0.08], [0.62, -0.58, 0.09], [-0.28, 0.68, 0.09]];

/** The Moon seen from Earth at elongation theta, centred on (0,0), radius R. The lit side is on the right while waxing and on the left while waning. */
const PhaseDisc = ({R, theta, cid}: {R: number; theta: number; cid: string}) => {
  const t = norm(theta);
  const waning = t > 180;
  const e = waning ? 360 - t : t;
  const c = Math.cos((e * Math.PI) / 180);
  const rx = Math.max(0.01, Math.abs(c) * R);
  const sweep = c > 0 ? 0 : 1;
  const d = `M 0 ${-R} A ${R} ${R} 0 0 1 0 ${R} A ${rx} ${R} 0 0 ${sweep} 0 ${-R} Z`;
  return (
    <g>
      <circle r={R} fill={DARK} stroke="#3a4358" strokeWidth={3} />
      <g transform={waning ? 'scale(-1 1)' : undefined}><path d={d} fill={LIT} /></g>
      <clipPath id={cid}><path d={d} transform={waning ? 'scale(-1 1)' : undefined} /></clipPath>
      <g clipPath={`url(#${cid})`}>
        {CRATERS.map(([x, y, k], i) => <circle key={i} cx={x * R} cy={y * R} r={k * R} fill="#d8cca8" />)}
      </g>
    </g>
  );
};

/** The hook: the Moon sweeps through its phases, settles on a half, then shrinks to a sliver. */
const Poster = () => {
  const theta = useProp('theta', 180);
  return (
    <svg width={1080} height={820} viewBox="0 0 1080 820">
      <g transform="translate(540 450)"><PhaseDisc R={330} theta={theta} cid="cp" /></g>
    </svg>
  );
};

const Big = ({children, color}: {children: string; color: string}) => (
  <div style={{fontFamily: 'var(--vt-sans)', fontSize: 84, fontWeight: 700, textAlign: 'center', color, lineHeight: 1}}>{children}</div>
);

/** Earth and the shadow it does not cast on the phases. */
const Myth = () => {
  const cx = 280, cy = 430;
  return (
    <svg width={1080} height={820} viewBox="0 0 1080 820">
      <Obj as="g" id="shadow">
        <polygon points={`${cx},${cy - 140} 980,${cy - 80} 980,${cy + 80} ${cx},${cy + 140}`} fill="#2a3346" />
        <line x1={640} y1={cy - 110} x2={880} y2={cy + 110} stroke="var(--vt-bad)" strokeWidth={16} strokeLinecap="round" />
        <line x1={880} y1={cy - 110} x2={640} y2={cy + 110} stroke="var(--vt-bad)" strokeWidth={16} strokeLinecap="round" />
      </Obj>
      <Obj as="g" id="earth-big">
        <circle cx={cx} cy={cy} r={160} fill="#3d7bd9" />
        <circle cx={cx - 40} cy={cy - 48} r={66} fill="#4e9a62" />
        <circle cx={cx + 56} cy={cy + 66} r={42} fill="#4e9a62" />
        <text x={cx} y={cy + 245} fontSize={52} fontWeight={700} fill="var(--vt-text)" textAnchor="middle" fontFamily="var(--vt-sans)">Earth</text>
      </Obj>
    </svg>
  );
};

/** The Sun on the left, light crossing to the right, the Earth at the centre, the Moon on its orbit. */
const Orrery = () => {
  const theta = useProp('theta', 0);
  const cx = 600, cy = 410, r = 270;
  const rad = (theta * Math.PI) / 180;
  const mx = cx - r * Math.cos(rad), my = cy + r * Math.sin(rad);
  const circ = 2 * Math.PI * r;
  const draw = Math.min(1, useProp('ring', 'draw', 0));
  return (
    <svg width={1080} height={820} viewBox="0 0 1080 820">
      <Obj as="g" id="rays">
        {[-380, -250, -125, 0, 175, 290, 385].map((dy) => <line key={dy} x1={200} y1={cy + dy} x2={960} y2={cy + dy} stroke={SUN} strokeOpacity={0.35} strokeWidth={4} />)}
      </Obj>
      <Obj as="g" id="sun">
        <circle cx={100} cy={cy} r={80} fill={SUN} />
        <text x={100} y={cy + 150} fontSize={48} fontWeight={700} fill={SUN} textAnchor="middle" fontFamily="var(--vt-sans)">Sun</text>
      </Obj>
      <Obj as="g" id="ring">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--vt-data)" strokeWidth={6} strokeDasharray={`${circ * draw} ${circ}`} transform={`rotate(180 ${cx} ${cy})`} />
      </Obj>
      <Obj as="g" id="earth">
        <circle cx={cx} cy={cy} r={76} fill="#3d7bd9" />
        <circle cx={cx - 18} cy={cy - 20} r={32} fill="#4e9a62" />
        <circle cx={cx + 27} cy={cy + 34} r={18} fill="#4e9a62" />
        <text x={cx} y={cy + 138} fontSize={48} fontWeight={700} fill="var(--vt-text)" textAnchor="middle" fontFamily="var(--vt-sans)">Earth</text>
      </Obj>
      <Obj as="g" id="sight">
        <line x1={cx} y1={cy} x2={mx} y2={my} stroke="var(--vt-data)" strokeWidth={5} strokeDasharray="16 14" />
      </Obj>
      <Obj as="g" id="mo">
        <g transform={`translate(${mx} ${my})`}>
          <circle r={56} fill={DARK} stroke="#3a4358" strokeWidth={3} />
          <path d="M 0 -56 A 56 56 0 0 0 0 56 Z" fill={LIT} />
          <circle cx={-22} cy={-14} r={11} fill="#d8cca8" />
          <circle cx={-26} cy={24} r={8} fill="#d8cca8" />
        </g>
      </Obj>
    </svg>
  );
};

/** The Moon as Earth sees it, big, with the same Moon on its orbit below it. */
/** The Moon as Earth sees it: one big disc with its name above it. */
const Views = () => {
  const theta = useProp('theta', 0);
  return (
    <div style={{position: 'relative', width: 1080, height: 820}}>
      <svg width={1080} height={820} viewBox="0 0 1080 820" style={{position: 'absolute', left: 0, top: 0}}>
        <g transform="translate(540 455)"><PhaseDisc R={320} theta={theta} cid="cv" /></g>
      </svg>
      <div style={{position: 'absolute', left: 0, top: 10, width: 1080, height: 100}}>
        <Obj id="lb-new" style={{position: 'absolute', width: 1080}}><Big color="var(--vt-muted)">New Moon</Big></Obj>
        <Obj id="lb-half" style={{position: 'absolute', width: 1080}}><Big color="var(--vt-text)">Half</Big></Obj>
        <Obj id="lb-full" style={{position: 'absolute', width: 1080}}><Big color={LIT}>Full Moon</Big></Obj>
        <Obj id="lb-month" style={{position: 'absolute', width: 1080}}><Big color="var(--vt-data)">one lap = 29.5 days</Big></Obj>
      </div>
    </div>
  );
};

const Headline = ({children}: {children: string}) => (
  <div style={{fontFamily: 'var(--vt-sans)', fontSize: 84, fontWeight: 700, textAlign: 'center', color: 'var(--vt-text)', lineHeight: 1}}>{children}</div>
);

export default <Doc id="moon-phases-vertical" title="Why the Moon has phases" lang="en" theme="visotalk/dark" canvas="9x16"
  exports={{captions: 'words', fps: 30}}>
  <Scene id="hook">
    <Line id="h1">Half of the Moon is always lit.</Line>
    <Line id="h2" hold={0.6}>So why does it shrink to a sliver?</Line>
    <Part id="poster" x={0} y={160} w={1080} h={820}><Poster /></Part>
    <Part id="poster-line" x={40} y={170} w={1000} h={100}><Headline>Always half lit</Headline></Part>
    <Animation>
      <Appear on="poster" at="start" dur={0} />
      <Tween on="poster" theta={450} at={0.1} dur={1.9} easing="easeInOut" />
      <Appear on="poster-line" line="h1" word="always" />
      <Tween on="poster" theta={378} line="h2" word="shrink" dur={1.8} easing="easeInOut" />
    </Animation>
  </Scene>

  <Scene id="myth">
    <Line id="o1" hold={1.6}>It is not Earth's shadow.</Line>
    <Part id="myth" x={0} y={160} w={1080} h={820}><Myth /></Part>
    <Animation>
      <Appear on="myth" at="start" dur={0} />
      <Appear on="earth-big" at="start" dur={0.5} />
      <Appear on="shadow" line="o1" word="shadow" />
    </Animation>
  </Scene>

  <Scene id="orbit">
    <Line id="o2">The Sun lights one half of the Moon, always.</Line>
    <Line id="o3" hold={0.8}>The Moon circles Earth, so we see that lit half from new angles.</Line>
    <Part id="orrery" x={0} y={160} w={1080} h={820}><Orrery /></Part>
    <Animation>
      <Appear on="orrery" at="start" dur={0} />
      <Appear on="earth" at="start" dur={0.5} />
      <Appear on="sun" line="o2" word="Sun" dur={0.8} />
      <Appear on="rays" line="o2" word="lights" dur={0.8} />
      <Appear on="mo" line="o2" word="Moon" />
      <Appear on="ring" line="o3" word="circles" dur={0.1} />
      <Tween on="orrery" theta={360} line="o3" word="circles" dur={3.2} easing="linear" />
      <Tween on="ring" draw={1} line="o3" word="circles" dur={3.2} easing="linear" />
      <Appear on="sight" line="o3" word="new angles" />
    </Animation>
  </Scene>

  <Scene id="views">
    <Line id="v1" hold={1.4}>Between us and the Sun, we see its dark side. New Moon.</Line>
    <Line id="v2" hold={1.2}>Off to one side: half.</Line>
    <Line id="v3" hold={1.4}>Opposite the Sun, we see all of it. Full Moon.</Line>
    <Line id="g1">In between, the lit slice grows, then shrinks.</Line>
    <Line id="e1">Same Moon, same light. Only your angle changes.</Line>
    <Line id="e2" hold={0.8}>One lap takes about a month.</Line>
    <Part id="views" x={0} y={160} w={1080} h={820}><Views /></Part>
    <Animation>
      <Appear on="views" at="start" dur={0.4} />
      <Appear on="lb-new" line="v1" word="new moon" />
      <Disappear on="lb-new" line="v2" word="off" />
      <Tween on="views" theta={90} line="v2" word="off to one side" dur={1.4} easing="easeInOut" />
      <Appear on="lb-half" line="v2" word="half" />
      <Disappear on="lb-half" line="v3" word="opposite" />
      <Tween on="views" theta={180} line="v3" word="opposite the sun" dur={1.8} easing="easeInOut" />
      <Appear on="lb-full" line="v3" word="full moon" />
      <Tween on="views" theta={540} line="g1" word="in between" dur={8.5} easing="easeInOut" />
      <Disappear on="lb-full" line="g1" word="lit slice" />
      <Appear on="lb-month" line="e2" word="about a month" />
    </Animation>
  </Scene>
</Doc>;
