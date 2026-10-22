import {Doc, Scene, Line, Part, Animation, Appear, Disappear, Tween} from '@visotalk/jsx';
import {useProp, Obj} from '@visotalk/runtime';

// ---------------------------------------------------------------------------
// One movement, drawn once in world units and filmed by a camera (cx, cy, zoom).
// Everything that moves is a function of three numbers the document tweens:
//   free  degrees the escape wheel has turned while nothing holds it
//   beat  the pendulum's phase, one unit per swing (sine of pi * beat)
//   wind  how tightly the mainspring is coiled
// The escape wheel steps a fixed angle each time the beat crosses a whole number,
// and every gear of the train is derived from the wheel's angle by meshing.
// ---------------------------------------------------------------------------

type V = [number, number];
const D2R = Math.PI / 180;
const pol = (c: V, r: number, a: number): V => [c[0] + r * Math.cos(a * D2R), c[1] + r * Math.sin(a * D2R)];
const f1 = (n: number) => n.toFixed(1);
const ss = (x: number) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };
const rot = (a: number, c: V) => `rotate(${f1(a)} ${f1(c[0])} ${f1(c[1])})`;
// theme tokens only; darker variants keep thin lines readable on the light ground
const dark = (t: string) => `color-mix(in srgb, var(--vt-${t}) 78%, var(--vt-text))`;
const tint = (t: string, pct: number) => `color-mix(in srgb, var(--vt-${t}) ${pct}%, var(--vt-panel))`;

const MOD = 7;                        // pitch radius per tooth
const CB: V = [290, 560];             // barrel
const C1: V = pol(CB, 168 + 49, -20); // first pinion and second wheel
const C3: V = pol(C1, 168 + 49, 25);  // second pinion and fourth wheel
const CE: V = pol(C3, 105 + 49, -25); // escape wheel and its pinion
const AP: V = [CE[0], CE[1] - 240];   // anchor and pendulum pivot
const RW = 150;                       // escape wheel tip radius
const STEP = 6;                       // degrees the wheel advances per swing (half a tooth pitch)
const AMP = 8;                        // swing amplitude, degrees
const REST = 3003;                    // wheel angle at which a tooth sits on the right pallet
const ROD = 480;
const DIAL: V = [1310, 470];

const toothed = (c: V, n: number, rp: number) => {
  const p = 360 / n, ro = rp + 9, rr = rp - 9, pts: V[] = [];
  for (let k = 0; k < n; k++) {
    const a = k * p;
    pts.push(pol(c, rr, a - 0.3 * p), pol(c, ro, a - 0.14 * p), pol(c, ro, a + 0.14 * p), pol(c, rr, a + 0.3 * p));
  }
  return 'M' + pts.map((q) => `${f1(q[0])} ${f1(q[1])}`).join('L') + 'Z';
};
const ratchet = (c: V, n: number, r: number, depth: number) => {
  const p = 360 / n, pts: V[] = [];
  for (let k = 0; k < n; k++) {
    const a = k * p;
    pts.push(pol(c, r - depth, a - 0.75 * p), pol(c, r, a), pol(c, r - depth, a + 0.125 * p));
  }
  return 'M' + pts.map((q) => `${f1(q[0])} ${f1(q[1])}`).join('L') + 'Z';
};
const spokes = (c: V, n: number, r0: number, r1: number, w: number, color: string) =>
  Array.from({length: n}, (_, k) => {
    const a = pol(c, r0, (360 / n) * k), b = pol(c, r1, (360 / n) * k);
    return <line key={k} x1={f1(a[0])} y1={f1(a[1])} x2={f1(b[0])} y2={f1(b[1])} stroke={color} strokeWidth={w} strokeLinecap="round" />;
  });

const PATH_B = toothed(CB, 24, 168);
const PATH_P1 = toothed(C1, 7, 49);
const PATH_G2 = toothed(C1, 24, 168);
const PATH_P3 = toothed(C3, 7, 49);
const PATH_G4 = toothed(C3, 15, 105);
const PATH_P5 = toothed(CE, 7, 49);
const PATH_E = ratchet(CE, 30, RW, 28);

// gear 2 (n2 at c2) meshing with gear 1 (n1 at c1 turned th1 degrees): the angle that interleaves the teeth
const mesh = (th1: number, c1: V, n1: number, c2: V, n2: number) => {
  const a = Math.atan2(c2[1] - c1[1], c2[0] - c1[0]) / D2R;
  return a + 180 + 180 / n2 - (n1 / n2) * (th1 - a);
};

const spiral = (turns: number, r0: number, r1: number, c: V) => {
  const pts: string[] = [];
  for (let i = 0; i <= 720; i++) {
    const t = i / 720, p = pol(c, r0 + (r1 - r0) * t, 360 * turns * t);
    pts.push(`${f1(p[0])} ${f1(p[1])}`);
  }
  return 'M' + pts.join('L');
};

// the number of whole steps the wheel has taken: it moves in a short snap as the pendulum crosses the middle
const steps = (b: number) => { const u = b + 0.12, n = Math.floor(u); return n - 1 + ss((u - n) / 0.24); };

function Label(props: {id: string; x: number; y: number; text: string; zoom: number; anchor?: 'start' | 'middle' | 'end'; lead?: V}) {
  const {id, x, y, text, zoom, anchor = 'middle', lead} = props;
  return (
    <Obj id={id} as="g">
      {lead ? <line x1={f1(x)} y1={f1(lead[1] < y ? y - 38 / zoom : y + 10)} x2={f1(lead[0])} y2={f1(lead[1])} stroke="var(--vt-text)" strokeWidth={2 / zoom} /> : null}
      <text x={f1(x)} y={f1(y)} textAnchor={anchor} fontFamily="var(--vt-sans)" fontWeight={700} fontSize={f1(34 / zoom)}
        fill="var(--vt-text)" stroke="var(--vt-bg)" strokeWidth={8 / zoom} paintOrder="stroke">{text}</text>
    </Obj>
  );
}

function Movement() {
  const cx = useProp('cx', 290), cy = useProp('cy', 560), zoom = useProp('zoom', 1.5);
  const free = useProp('free', 0), beat = useProp('beat', 0.5), wind = useProp('wind', 0.3);
  const wy = useProp('wy', 630);

  const phi = AMP * Math.sin(Math.PI * beat);
  const eA = free + STEP * steps(beat);
  const thG4 = mesh(eA, CE, 7, C3, 15);
  const thG2 = mesh(thG4, C3, 7, C1, 24);
  const thB = mesh(thG2, C1, 7, CB, 24);

  const rin = RW + 12, pad = 50, aL = -135 + 4.4, aR = -45 + 4.4;
  const arm = (a: number) => {
    const i = pol(CE, rin, a), o = pol(CE, rin + pad, a);
    return {i, o};
  };
  const L = arm(aL), R = arm(aR);
  // each arm bows away from the wheel, like the flukes of an anchor
  const bow = (o: V): V => { const mx = (o[0] + AP[0]) / 2, my = (o[1] + AP[1]) / 2, dx = mx - CE[0], dy = my - CE[1], n = Math.hypot(dx, dy); return [mx + (dx / n) * 34, my + (dy / n) * 34]; };
  const LC = bow(L.o), RC = bow(R.o);

  const m = Math.floor(beat + 0.12), d = beat - m;
  const pulse = d < 0.15 ? 1 : Math.max(0, 1 - (d - 0.15) / 0.5);
  const tick = m % 2 === 1 ? pulse : 0, tock = m % 2 === 0 ? pulse : 0;

  const gearFill = tint('muted', 7), gearLine = 'var(--vt-muted)';
  const ringPt = pol(CE, RW - 6, -42);
  const weightH = 104;

  return (
    <svg width="1920" height="1080" viewBox="0 0 1920 1080" style={{position: 'absolute', left: 0, top: 0}}>
      <g transform={`translate(960 470) scale(${zoom}) translate(${-cx} ${-cy})`}>
        {/* pendulum, behind everything */}
        <Obj id="pendulum" as="g">
          <g transform={rot(phi, AP)}>
            <line x1={f1(AP[0])} y1={f1(AP[1])} x2={f1(AP[0])} y2={f1(AP[1] + ROD)} stroke={dark('good')} strokeWidth={9} />
            <circle cx={f1(AP[0])} cy={f1(AP[1] + ROD + 36)} r={52} fill={tint('good', 18)} stroke={dark('good')} strokeWidth={6} />
            <circle cx={f1(AP[0])} cy={f1(AP[1] + ROD + 36)} r={30} fill="none" stroke={dark('good')} strokeWidth={3} />
          </g>
        </Obj>

        {/* escape wheel */}
        <Obj id="wheel" as="g">
          <g transform={rot(eA, CE)}>
            <circle cx={f1(CE[0])} cy={f1(CE[1])} r={RW - 28} fill={tint('data', 12)} stroke="none" />
            <path d={PATH_E} fill={tint('data', 12)} stroke={dark('data')} strokeWidth={5} strokeLinejoin="round" />
            <circle cx={f1(CE[0])} cy={f1(CE[1])} r={RW - 44} fill="none" stroke={dark('data')} strokeWidth={4} />
            {spokes(CE, 6, 24, RW - 44, 6, dark('data'))}
          </g>
        </Obj>

        {/* fourth wheel and the pinion of the escape wheel */}
        <Obj id="g4" as="g">
          <g transform={rot(thG4, C3)}>
            <path d={PATH_G4} fill={gearFill} stroke={gearLine} strokeWidth={3.5} strokeLinejoin="round" />
            <circle cx={f1(C3[0])} cy={f1(C3[1])} r={78} fill="none" stroke={gearLine} strokeWidth={3} />
            {spokes(C3, 5, 22, 78, 6, gearLine)}
          </g>
        </Obj>
        <Obj id="p5" as="g">
          <g transform={rot(eA, CE)}>
            <path d={PATH_P5} fill={tint('data', 22)} stroke={dark('data')} strokeWidth={3.5} strokeLinejoin="round" />
            <circle cx={f1(CE[0])} cy={f1(CE[1])} r={9} fill={dark('data')} />
          </g>
        </Obj>

        {/* second wheel and the pinion that meshes with it */}
        <Obj id="g2" as="g">
          <g transform={rot(thG2, C1)}>
            <path d={PATH_G2} fill={gearFill} stroke={gearLine} strokeWidth={3.5} strokeLinejoin="round" />
            <circle cx={f1(C1[0])} cy={f1(C1[1])} r={140} fill="none" stroke={gearLine} strokeWidth={3} />
            {spokes(C1, 6, 26, 140, 6, gearLine)}
          </g>
        </Obj>
        <Obj id="p3" as="g">
          <g transform={rot(thG4, C3)}>
            <path d={PATH_P3} fill={tint('muted', 16)} stroke={gearLine} strokeWidth={3.5} strokeLinejoin="round" />
            <circle cx={f1(C3[0])} cy={f1(C3[1])} r={9} fill={gearLine} />
          </g>
        </Obj>

        {/* barrel with its spring */}
        <Obj id="barrel" as="g">
          <g transform={rot(thB, CB)}>
            <path d={PATH_B} fill={gearFill} stroke={gearLine} strokeWidth={3.5} strokeLinejoin="round" />
            <circle cx={f1(CB[0])} cy={f1(CB[1])} r={146} fill="var(--vt-panel)" stroke={gearLine} strokeWidth={3} />
          </g>
        </Obj>
        <Obj id="spring" as="g">
          <g transform={rot(thB, CB)}>
            <path d={spiral(2 + 5 * wind, 24, 142, CB)} fill="none" stroke={dark('grad')} strokeWidth={6} strokeLinejoin="round" />
          </g>
          <circle cx={f1(CB[0])} cy={f1(CB[1])} r={20} fill="var(--vt-panel)" stroke={gearLine} strokeWidth={4} />
        </Obj>
        <Obj id="p1" as="g">
          <g transform={rot(thG2, C1)}>
            <path d={PATH_P1} fill={tint('muted', 16)} stroke={gearLine} strokeWidth={3.5} strokeLinejoin="round" />
            <circle cx={f1(C1[0])} cy={f1(C1[1])} r={9} fill={gearLine} />
          </g>
        </Obj>

        {/* a lifted weight on its cord */}
        <Obj id="weight" as="g">
          <rect x={-120} y={414} width={190} height={12} rx={4} fill={gearLine} />
          <line x1={-10} y1={426} x2={-10} y2={470} stroke={gearLine} strokeWidth={5} />
          <g transform={rot(-(wy - 630) / 42 / D2R, [-10, 470])}>
            <circle cx={-10} cy={470} r={42} fill={tint('grad', 14)} stroke={dark('grad')} strokeWidth={5} />
            {spokes([-10, 470], 4, 10, 38, 4, dark('grad'))}
          </g>
          <line x1={-52} y1={470} x2={-52} y2={wy} stroke={dark('grad')} strokeWidth={5} />
          <rect x={-52 - 42} y={wy} width={84} height={weightH} rx={8} fill={tint('grad', 30)} stroke={dark('grad')} strokeWidth={6} />
        </Obj>

        {/* dial: the seconds hand sits on the escape wheel's shaft */}
        <Obj id="dial" as="g">
          <circle cx={DIAL[0]} cy={DIAL[1]} r={165} fill="var(--vt-panel)" stroke="var(--vt-text)" strokeWidth={5} />
          {Array.from({length: 60}, (_, k) => {
            const long = k % 5 === 0, a = pol(DIAL, 150, k * 6 - 90), b = pol(DIAL, long ? 124 : 138, k * 6 - 90);
            return <line key={k} x1={f1(a[0])} y1={f1(a[1])} x2={f1(b[0])} y2={f1(b[1])} stroke={long ? 'var(--vt-text)' : 'var(--vt-muted)'} strokeWidth={long ? 5 : 3} />;
          })}
          <g transform={rot(eA - 3, DIAL)}>
            <line x1={DIAL[0]} y1={DIAL[1] + 28} x2={DIAL[0]} y2={DIAL[1] - 128} stroke={dark('bad')} strokeWidth={6} strokeLinecap="round" />
          </g>
          <circle cx={DIAL[0]} cy={DIAL[1]} r={11} fill={dark('bad')} />
        </Obj>

        {/* anchor with its two pallets */}
        <Obj id="anchor" as="g">
          <g transform={rot(phi, AP)}>
            <path d={`M${f1(L.i[0])} ${f1(L.i[1])}L${f1(L.o[0])} ${f1(L.o[1])}Q${f1(LC[0])} ${f1(LC[1])} ${f1(AP[0])} ${f1(AP[1])}Q${f1(RC[0])} ${f1(RC[1])} ${f1(R.o[0])} ${f1(R.o[1])}L${f1(R.i[0])} ${f1(R.i[1])}`}
              fill="none" stroke={dark('op')} strokeWidth={13} strokeLinejoin="round" />
            <circle cx={f1(AP[0])} cy={f1(AP[1])} r={20} fill="var(--vt-panel)" stroke={dark('op')} strokeWidth={6} />
          </g>
        </Obj>
        <Obj id="lockring" as="g">
          <circle cx={f1(ringPt[0])} cy={f1(ringPt[1])} r={34} fill="none" stroke={dark('bad')} strokeWidth={6} />
        </Obj>

        {/* tick and tock follow the beat */}
        <Obj id="ticktock" as="g">
          <text x={f1(AP[0] + 60)} y={f1(AP[1] - 20)} fontFamily="var(--vt-mono)" fontWeight={700} fontSize={f1(52 / zoom)} fill={dark('bad')} opacity={tick}>tick</text>
          <text x={f1(AP[0] - 60)} y={f1(AP[1] - 20)} textAnchor="end" fontFamily="var(--vt-mono)" fontWeight={700} fontSize={f1(52 / zoom)} fill={dark('bad')} opacity={tock}>tock</text>
        </Obj>

        <Label id="lb-spring" x={CB[0]} y={324} text="mainspring" zoom={zoom} lead={[CB[0], 392]} />
        <Label id="lb-weight" x={-114} y={wy + 62} text="weight" zoom={zoom} anchor="end" />
        <Label id="lb-train" x={C1[0]} y={742} text="gear train" zoom={zoom} lead={[C1[0], 668]} />
        <Label id="lb-wheel" x={CE[0] + 150} y={CE[1] - 190} text="escape wheel" zoom={zoom} anchor="start" lead={[CE[0] + 108, CE[1] - 108]} />
        <Label id="lb-pallets" x={640} y={336} text="pallets" zoom={zoom} anchor="end" lead={[704, 356]} />
        <Label id="lb-pendulum" x={AP[0] + 158} y={AP[1] + ROD + 50} text="pendulum" zoom={zoom} anchor="start" lead={[AP[0] + 132, AP[1] + ROD + 30]} />
      </g>
    </svg>
  );
}

export default <Doc id="clock-escapement" title="How a clock keeps time" lang="en" theme="visotalk/light" canvas="16x9">
  <Part id="clock">{() => <Movement />}</Part>

  <Scene id="energy">
    <Line id="l1">Every mechanical clock begins with stored energy.</Line>
    <Line id="l2">A mainspring, wound tight, wants to unwind. A weight, lifted high, wants to fall.</Line>
    <Animation>
      <Appear on="clock" at="start" dur={0.01}/>
      <Appear on="barrel" line="l1" word="begins"/>
      <Appear on="spring" line="l1" word="stored energy"/>
      <Appear on="lb-spring" line="l2" word="mainspring"/>
      <Tween on="clock" wind={1} dur={1.6} easing="easeInOut" line="l2" word="wound tight"/>
      <Appear on={["weight", "lb-weight"]} line="l2" word="weight"/>
      <Tween on="clock" wy={690} dur={1.4} easing="easeInQuad" line="l2" word="fall"/>
    </Animation>
  </Scene>

  <Scene id="train">
    <Line id="l3">That pull turns a train of gears, each one slower than the last.</Line>
    <Line id="l4">At the end of the train sits the escape wheel.</Line>
    <Animation>
      <Disappear on={["weight", "lb-weight", "lb-spring"]} at="start"/>
      <Tween on="clock" cx={520} cy={530} zoom={1.4} dur={1.6} easing="easeInOut" at="start"/>
      <Appear on={["p1", "g2"]} line="l3" word="train"/>
      <Appear on="lb-train" line="l3" word="train" offset={0.3}/>
      <Appear on={["p3", "g4"]} line="l3" word="gears"/>
      <Tween on="clock" free={500} dur={12} easing="linear" line="l3" word="each one"/>
      <Appear on={["wheel", "p5", "lb-wheel"]} line="l4" word="escape wheel"/>
    </Animation>
  </Scene>

  <Scene id="spin">
    <Line id="l5">Left alone, the wheel would spin freely, and the spring would be spent in a rush.</Line>
    <Line id="l6">A clock must let that energy out in small, equal steps.</Line>
    <Animation>
      <Disappear on="lb-train" at="start"/>
      <Tween on="clock" free={2518} dur={10} easing="cubic-bezier(0.4, 0.1, 0.9, 0.6)" line="l5" word="left alone"/>
      <Tween on="clock" wind={0.1} dur={7} easing="easeIn" line="l5" word="spent"/>
      <Disappear on="lb-wheel" line="l6"/>
      <Disappear on={["barrel", "spring", "p1", "g2", "p3", "g4"]} line="l6"/>
      <Tween on="clock" cx={830} cy={460} zoom={1.6} dur={1.8} easing="easeInOut" line="l6"/>
    </Animation>
  </Scene>

  <Scene id="pallets">
    <Line id="l7">So a pair of pallets, set like an anchor, catch the teeth of the wheel.</Line>
    <Line id="l8">One pallet locks a tooth, and the whole train stops.</Line>
    <Line id="l9">When the anchor swings, that pallet lets go. One tooth slips past, and the other pallet catches the next.</Line>
    <Animation>
      <Tween on="clock" free={3003} dur={1.2} easing="easeOutQuad" line="l7"/>
      <Appear on={["anchor", "lb-pallets"]} line="l7" word="pallets"/>
      <Appear on="lockring" line="l8" word="locks a tooth"/>
      <Disappear on="lb-pallets" line="l9"/>
      <Tween on="clock" beat={1.5} dur={2.4} easing="linear" line="l9" word="swings"/>
      <Disappear on="lockring" line="l9" word="lets go"/>
    </Animation>
  </Scene>

  <Scene id="beat">
    <Line id="l10">What swings the anchor is a pendulum.</Line>
    <Line id="l11">Each swing takes the same time, so the pendulum sets the beat.</Line>
    <Line id="l12">Every swing lets the wheel advance one small step. That step is the tick.</Line>
    <Line id="l13">Count the ticks, and the hands on the dial follow.</Line>
    <Animation>
      <Appear on={["barrel", "spring", "p1", "g2", "p3", "g4"]} line="l10" offset={1.8}/>
      <Appear on={["pendulum", "lb-pendulum"]} line="l10" word="pendulum"/>
      <Tween on="clock" beat={41.5} dur={30} easing="linear" line="l10" word="pendulum"/>
      <Tween on="clock" cx={794} cy={547} zoom={1.25} dur={2} easing="easeInOut" at="start"/>
      <Disappear on="lb-pendulum" line="l12"/>
      <Appear on="ticktock" line="l12" word="tick"/>
      <Appear on="dial" line="l13" word="dial"/>
    </Animation>
  </Scene>
</Doc>;
