import {Doc, Scene, Line, Part, Animation, Appear, Disappear, Tween} from '@visotalk/jsx';
import {Obj, useProp, useTime} from '@visotalk/runtime';

/**
 * "Waiting by a stump for a hare" (守株待兔), told in Mandarin and then explained. The look is an ink-and-paper picture book:
 * a warm paper ground, washed hills, a vermilion sun and seal, one stump and one farmer. Typeface: LXGW WenKai (a kai, brush-hand face)
 * for the story and its captions, Noto Serif SC Black for the four characters of the idiom, because a fable told on a screen should read like
 * a printed picture book and not like a dashboard.
 * Five scenes: a cover; the windfall (hare hits the stump); the waiting (the farmer stops working, time passes, the field is lost);
 * the laughter; the moral (one lucky day among thirty empty ones, a crop that only labour grows, the idiom).
 * Everything is drawn from numbers: a hare's hop follows its x, the night follows the sun's position, the crop's colour follows `decay`.
 * Kokoro speaks English only, so the narration is MiniMax's; Chinese word times are estimated, so anchors are runs of characters that occur once.
 */

const SANS = 'var(--vt-sans)';
const SERIF = 'var(--vt-mono)'; // Noto Serif SC, named in the tokens below

const PAPER = '#f1e8d2';
const INK = '#2a2420';
const RED = '#b5362b';
const GREEN: [number, number, number] = [111, 143, 78];
const STRAW: [number, number, number] = [176, 142, 78];
const WEED: [number, number, number] = [84, 102, 60];
const INDIGO = '#35506b';
const GOLD = '#d9a441';

const GROUND = 800; // the farmer's feet
const STUMP_X = 1330;
/** The characters are drawn in a 1920-wide world and scaled about the ground at the middle of the frame, so the farmer fills a third of its height. */
const ZOOM = 1.3;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mix = (a: [number, number, number], b: [number, number, number], t: number) =>
  `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`;
const lcg = (seed: number) => () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);

/** One stroke that draws itself. */
const Stroke = ({d, color, width = 10, draw}: {d: string; color: string; width?: number; draw: number}) => (
  <path d={d} pathLength={1} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeDasharray="1" strokeDashoffset={1 - draw} opacity={draw > 0 ? 1 : 0} />
);

/** What each scene's stage starts from: the stage is declared again in every scene and carries nothing over by itself. */
const BASE: Record<number, {fx: number; sit: number; toss: number; work: number; decay: number; weeds: number; sunT: number}> = {
  0: {fx: 600, sit: 0, toss: 0, work: 0, decay: 0, weeds: 0, sunT: 0.85},
  1: {fx: 600, sit: 0, toss: 0, work: 1, decay: 0, weeds: 0, sunT: 0.85},
  2: {fx: 1040, sit: 0, toss: 0, work: 0, decay: 0, weeds: 0, sunT: 0.85},
  3: {fx: 1140, sit: 1, toss: 1, work: 0, decay: 1, weeds: 1, sunT: 0.85},
};

/** The hare, facing right, standing on y = 0. */
const Hare = ({dead = false, ghost = false}: {dead?: boolean; ghost?: boolean}) => {
  const f = ghost ? 'none' : '#f7f2e6';
  const dash = ghost ? '10 8' : undefined;
  const p = {fill: f, stroke: INK, strokeWidth: 5, strokeDasharray: dash, strokeLinejoin: 'round' as const};
  return (
    <g opacity={ghost ? 0.7 : 1}>
      <ellipse cx="-34" cy="-10" rx="30" ry="13" {...p} />
      <ellipse cx="0" cy="-42" rx="58" ry="36" {...p} />
      <circle cx="-60" cy="-48" r="13" {...p} />
      <ellipse cx="46" cy="-116" rx="9" ry="36" transform="rotate(-8 46 -116)" {...p} />
      <ellipse cx="68" cy="-110" rx="9" ry="33" transform="rotate(14 68 -110)" {...p} />
      <circle cx="52" cy="-70" r="25" {...p} />
      <ellipse cx="38" cy="-8" rx="11" ry="9" {...p} />
      {!ghost && <ellipse cx="46" cy="-114" rx="4" ry="22" fill="#e7a99a" transform="rotate(-8 46 -114)" />}
      {dead ? (
        <path d="M54 -80 L66 -68 M66 -80 L54 -68" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      ) : (
        !ghost && <circle cx="62" cy="-74" r="4.5" fill={INK} />
      )}
      {!ghost && <circle cx="76" cy="-64" r="3.5" fill={RED} />}
    </g>
  );
};

/** The stump on y = 0, centred on x = 0. */
const StumpArt = () => (
  <g>
    <path d="M -66 -96 C -62 -44 -84 -14 -96 10 L 96 10 C 80 -12 62 -50 66 -96 Z" fill="#8a6a45" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
    <path d="M -40 -80 L -46 -10 M -8 -76 L -12 6 M 26 -78 L 34 -4 M 52 -70 L 66 0" stroke={INK} strokeWidth="3" opacity="0.4" strokeLinecap="round" />
    <ellipse cx="0" cy="-96" rx="66" ry="21" fill="#dcb97e" stroke={INK} strokeWidth="5" />
    <ellipse cx="0" cy="-96" rx="44" ry="13" fill="none" stroke={INK} strokeWidth="2.5" opacity="0.5" />
    <ellipse cx="0" cy="-96" rx="22" ry="6" fill="none" stroke={INK} strokeWidth="2.5" opacity="0.5" />
  </g>
);

const Hoe = ({x, y, a}: {x: number; y: number; a: number}) => (
  <g transform={`translate(${x} ${y}) rotate(${a})`}>
    <line x1="0" y1="-80" x2="0" y2="96" stroke="#6b4a2b" strokeWidth="9" strokeLinecap="round" />
    <path d="M0 92 L54 84 L60 118 L0 124 Z" fill="#8c8c86" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
  </g>
);

/** The farmer: standing, or sitting with his eyes on the stump. `sit` crossfades the two. */
const FarmerArt = ({sit}: {sit: number}) => (
  <g>
    <g opacity={1 - sit}>
      <path d="M -14 -72 L -20 0 M 14 -72 L 22 0" stroke={INK} strokeWidth="9" strokeLinecap="round" />
      <path d="M -36 -192 L 36 -192 L 46 -62 L -46 -62 Z" fill={INDIGO} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      <path d="M -44 -100 L 44 -100" stroke={INK} strokeWidth="6" />
      <path d="M 30 -182 L 44 -120" stroke={INK} strokeWidth="9" strokeLinecap="round" />
      <circle cx="0" cy="-216" r="28" fill="#e8c9a0" stroke={INK} strokeWidth="4" />
      <circle cx="14" cy="-218" r="3.5" fill={INK} />
      <path d="M -66 -244 L 0 -302 L 66 -244 Z" fill={GOLD} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
    </g>
    <g opacity={sit}>
      <ellipse cx="0" cy="-14" rx="70" ry="17" fill="#2b3e52" stroke={INK} strokeWidth="5" />
      <path d="M -34 -112 L 34 -112 L 56 -24 L -56 -24 Z" fill={INDIGO} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      <path d="M 28 -100 L 52 -36" stroke={INK} strokeWidth="9" strokeLinecap="round" />
      <circle cx="8" cy="-142" r="27" fill="#e8c9a0" stroke={INK} strokeWidth="4" />
      <circle cx="22" cy="-144" r="3.5" fill={INK} />
      <path d="M -56 -154 L 8 -208 L 72 -154 Z" fill={GOLD} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
    </g>
  </g>
);

/** A villager laughing and pointing at the farmer, to his right. */
const Villager = ({x, robe, bob}: {x: number; robe: string; bob: number}) => (
  <g transform={`translate(${x} ${GROUND - bob})`}>
    <path d="M -12 -66 L -16 0 M 12 -66 L 16 0" stroke={INK} strokeWidth="8" strokeLinecap="round" />
    <path d="M -32 -176 L 32 -176 L 40 -58 L -40 -58 Z" fill={robe} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
    <path d="M 26 -166 L 100 -188" stroke={INK} strokeWidth="8" strokeLinecap="round" />
    <circle cx="0" cy="-206" r="26" fill="#e8c9a0" stroke={INK} strokeWidth="4" />
    <circle cx="0" cy="-238" r="12" fill={INK} />
    <ellipse cx="12" cy="-198" rx="8" ry="10" fill={INK} />
    <circle cx="8" cy="-214" r="3" fill={INK} />
  </g>
);

const Crops = ({decay}: {decay: number}) => {
  const h = lerp(58, 20, decay);
  const color = mix(GREEN, STRAW, decay);
  const rows: Array<[number, number]> = [[838, 40], [876, 87]];
  return (
    <g strokeLinecap="round" fill="none">
      {rows.flatMap(([y, x0]) =>
        Array.from({length: 20}, (_, i) => {
          const x = x0 + i * 94;
          const lean = decay * 20 * (i % 2 ? 1 : -1);
          return (
            <g key={`${y}-${i}`} stroke={color}>
              <path d={`M ${x} ${y} Q ${x + lean * 0.3} ${y - h * 0.6} ${x + lean} ${y - h}`} strokeWidth="6" />
              <path d={`M ${x} ${y - h * 0.35} q ${-16} ${-h * 0.2} ${-22 + lean * 0.3} ${-h * 0.25}`} strokeWidth="5" />
              <path d={`M ${x} ${y - h * 0.5} q ${16} ${-h * 0.2} ${22 + lean * 0.3} ${-h * 0.25}`} strokeWidth="5" />
            </g>
          );
        }),
      )}
    </g>
  );
};

const WEED_SPOTS = (() => {
  const r = lcg(7);
  return Array.from({length: 40}, () => ({x: 40 + r() * 1840, y: 792 + r() * 84, k: 0.55 + r() * 0.8, s: r()}));
})();
const Weeds = ({growth}: {growth: number}) => (
  <g strokeLinecap="round" fill="none" stroke={mix(WEED, [120, 118, 70], growth)} strokeWidth="5">
    {WEED_SPOTS.map((w, i) =>
      [-0.7, -0.35, 0, 0.35, 0.7].map((a, j) => {
        const h = growth * w.k * (70 + 170 * w.s) * (1 - Math.abs(a) * 0.25);
        const tip = Math.min(1900, Math.max(20, w.x + Math.sin(a) * h * 0.55));
        return <path key={`${i}-${j}`} d={`M ${w.x} ${w.y} Q ${(w.x + tip) / 2} ${w.y - h * 0.6} ${tip} ${w.y - h * Math.cos(a)}`} />;
      }),
    )}
  </g>
);

/** The backdrop: sun on its arc, washed hills, the soil. `sunT` is a whole number of days plus where the sun is on its arc; the night follows it. */
const Backdrop = ({sunT}: {sunT: number}) => {
  const p = ((sunT % 1) + 1) % 1;
  const sx = 300 + 1320 * p;
  const sy = 520 - 320 * Math.sin(Math.PI * p);
  return (
    <g>
      <defs>
        <radialGradient id="glow"><stop offset="0" stopColor={RED} stopOpacity="0.35" /><stop offset="1" stopColor={RED} stopOpacity="0" /></radialGradient>
        <linearGradient id="mist" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={PAPER} stopOpacity="0" /><stop offset="1" stopColor={PAPER} stopOpacity="0.95" /></linearGradient>
      </defs>
      <circle cx={sx} cy={sy} r="190" fill="url(#glow)" />
      <circle cx={sx} cy={sy} r="70" fill={RED} opacity="0.92" />
      <path d="M0 560 C 200 470, 340 520, 520 450 S 800 420, 960 510 S 1300 410, 1500 490 S 1800 470, 1920 520 L 1920 760 L 0 760 Z" fill={INK} opacity="0.10" />
      <path d="M0 640 C 260 560, 420 620, 640 560 S 1000 540, 1200 610 S 1650 560, 1920 620 L 1920 760 L 0 760 Z" fill={INK} opacity="0.17" />
      <rect x="0" y="600" width="1920" height="170" fill="url(#mist)" />
    </g>
  );
};
/** The soil is a plain box that fades into the paper at y 900, where the captions begin. */
const Soil = () => (
  <div style={{position: 'absolute', left: 0, right: 0, top: 716, height: 184, background: 'linear-gradient(180deg, #dcc99b 0%, #dcc99b 72%, #f1e8d2 100%)'}} />
);
const Furrows = () => (
  <g>
      {[748, 780, 826, 870].map((y) => <path key={y} d={`M 0 ${y} Q 960 ${y - 8} 1920 ${y}`} stroke={INK} strokeWidth="2.5" opacity="0.14" fill="none" />)}
  </g>
);

/** The whole picture of scenes 0 to 3, one part. `s` says which scene it is for; everything that changes is a number the document tweens. */
const Stage = ({s}: {s: number}) => {
  const b = BASE[s];
  const t = useTime();
  const fx = useProp('fx', b.fx);
  const sit = useProp('sit', b.sit);
  const toss = useProp('toss', b.toss);
  const work = useProp('work', b.work);
  const decay = useProp('decay', b.decay);
  const weeds = useProp('weeds', b.weeds);
  const sunT = useProp('sunT', b.sunT);
  const hx = useProp('hx', 300);
  const fall = useProp('fall', 0);
  const carry = useProp('carry', 0);

  const handX = fx + 44;
  const handY = GROUND - 120;
  const swing = -30 * (0.5 + 0.5 * Math.sin(t * 3.6));
  const hoeAngle = lerp(-8, swing, work);
  // the hoe is thrown in an arc from the hand to the ground at x = 900
  const hoeX = lerp(handX, 900, toss);
  const hoeY = lerp(handY, GROUND - 14, toss) - 150 * Math.sin(Math.PI * toss);
  const hoeA = lerp(hoeAngle, 100, toss);

  // the hare: it hops while it runs (the hop follows its x), turns over when it hits, is lifted by the farmer
  const running = hx < STUMP_X - 152 ? 1 : 0;
  const hop = running * Math.abs(Math.sin(hx / 48)) * 30;
  const flipRaw = Math.cos(Math.PI * fall);
  const flip = Math.abs(flipRaw) < 0.03 ? 0.03 : flipRaw; // a scale of exactly 0 is a singular matrix, which the QA probe cannot invert
  const drop = fall * 30;
  const hareX = lerp(hx, fx + 125, carry);
  const hareY = lerp(GROUND - hop + drop, GROUND - 105, carry);
  const night = Math.max(0, 1 - 4 * Math.sin(Math.PI * (((sunT % 1) + 1) % 1))) * 0.5;
  const burst = fall > 0 ? Math.max(0, 1 - fall * 3) : 0;

  return (
    <div style={{position: 'relative', width: 1920, height: 1080}}>
    <svg viewBox="0 0 1920 1080" width="1920" height="1080" style={{position: 'absolute', left: 0, top: 0}}>
      <Backdrop sunT={sunT} />
    </svg>
    <Soil />
    <svg viewBox="0 0 1920 1080" width="1920" height="1080" style={{position: 'absolute', left: 0, top: 0}}>
      <Furrows />
      {s >= 1 && (
        <Obj as="g" id="crops">
          <Crops decay={decay} />
        </Obj>
      )}
      {s === 2 && (
        <g>
          <Obj as="g" id="cloud">
            <g fill="#fbf8ee" stroke={INK} strokeWidth="4">
              {CLOUD.map(([dx, dy, r], i) => <circle key={i} cx={1064 + dx} cy={225 + dy} r={r} />)}
              <circle cx="1054" cy="410" r="10" />
              <circle cx="1050" cy="384" r="15" />
            </g>
            <g fill="#fbf8ee">
              {CLOUD.map(([dx, dy, r], i) => <circle key={i} cx={1064 + dx} cy={225 + dy} r={r - 2} />)}
            </g>
          </Obj>
          {[924, 1064, 1204].map((x, i) => (
            <Obj as="g" id={`dream${i + 1}`} key={i}>
              <g transform={`translate(${x} 280) scale(0.66)`}><Hare /></g>
            </Obj>
          ))}
        </g>
      )}
      <g transform={`translate(960 ${GROUND}) scale(${ZOOM}) translate(-960 ${-GROUND})`}>
      {s >= 1 && (
        <Obj as="g" id="stump">
          <g transform={`translate(${STUMP_X} ${GROUND + 10})`}><StumpArt /></g>
        </Obj>
      )}
      {s >= 1 && (
        <g>
          <Hoe x={hoeX} y={hoeY} a={hoeA} />
        </g>
      )}
      {s >= 1 && (
        <Obj as="g" id="farmer">
          <g transform={`translate(${fx} ${GROUND})`}>
            <FarmerArt sit={sit} />
            <path d={`M 32 -178 L ${hareX - fx - 18} ${hareY - GROUND + 8}`} stroke={INK} strokeWidth="9" strokeLinecap="round" opacity={carry > 0 ? 1 : 0} />
          </g>
        </Obj>
      )}
      {s === 1 && (
        <Obj as="g" id="hare">
          <g transform={`translate(${hareX} ${hareY}) translate(0 -40) scale(1 ${flip}) translate(0 40)`}>
            <Hare dead={fall > 0.55} />
          </g>
          <g stroke={RED} strokeWidth="6" strokeLinecap="round" opacity={burst}>
            <path d={`M ${STUMP_X - 96} 690 l -34 -26 M ${STUMP_X - 100} 724 l -44 0 M ${STUMP_X - 96} 756 l -34 26`} />
          </g>
        </Obj>
      )}
      {s === 3 && (
        <g>
          {[
            {id: 'v1', x: 300, robe: '#9a4a3a', ph: 0},
            {id: 'v2', x: 470, robe: '#4f6b4a', ph: 1.7},
            {id: 'v3', x: 640, robe: '#7a5a8a', ph: 3.1},
          ].map((v) => (
            <Obj as="g" id={v.id} key={v.id}>
              <Villager x={v.x} robe={v.robe} bob={Math.abs(Math.sin(t * 7 + v.ph)) * 10} />
            </Obj>
          ))}
          <Obj as="g" id="laugh">
            <g fontFamily={SANS} fontSize="64" fill={RED}>
              <text x="250" y={500 + Math.sin(t * 7) * 6}>哈哈</text>
              <text x="450" y={470 + Math.sin(t * 7 + 1.7) * 6}>哈哈</text>
              <text x="610" y={510 + Math.sin(t * 7 + 3.1) * 6}>哈哈</text>
            </g>
          </Obj>
        </g>
      )}
      </g>
      {s >= 1 && <Weeds growth={weeds} />}
    </svg>
    <div style={{position: 'absolute', inset: 0, background: '#1c2440', opacity: night}} />
    </div>
  );
};

/** The cloud of the farmer's daydream: [dx, dy, r] from its centre. */
const CLOUD: Array<[number, number, number]> = [[-170, 10, 70], [-80, -40, 84], [30, -55, 92], [140, -25, 80], [200, 35, 64], [100, 60, 76], [-20, 70, 72], [-120, 60, 66]];

const Tablet = () => {
  const days = Math.round(useProp('days', 1));
  return (
    <div style={{display: 'inline-block', minWidth: 330, textAlign: 'center', fontFamily: SANS, fontSize: 76, color: INK, background: '#f8f1de', border: `6px solid ${RED}`, borderRadius: 10, padding: '6px 36px'}}>
      第 <span style={{color: RED, fontVariantNumeric: 'tabular-nums'}}>{days}</span> 天
    </div>
  );
};

/** Scene 4, first picture: thirty days in a row; only the first had a hare. */
const Dots = () => {
  const n = useProp('n', 1);
  const cx = (i: number) => 366 + (i % 10) * 134;
  const cy = (i: number) => 130 + Math.floor(i / 10) * 140;
  return (
    <svg viewBox="0 0 1920 560" width="1920" height="560">
      {Array.from({length: 30}, (_, i) => {
        const o = clamp01(n - i);
        if (o <= 0) return null;
        return i === 0 ? (
          <g key={i}>
            <circle cx={cx(i)} cy={cy(i)} r="56" fill={RED} />
            <g transform={`translate(${cx(i) - 4} ${cy(i) + 32}) scale(0.44)`}><g fill="#f1e8d2"><Hare /></g></g>
          </g>
        ) : (
          <circle key={i} cx={cx(i)} cy={cy(i)} r="54" fill="none" stroke={INK} strokeWidth="4" strokeDasharray="9 9" opacity={0.55 * o} />
        );
      })}
      <text x={cx(0)} y="62" textAnchor="middle" fontFamily={SANS} fontSize="52" fill={RED}>第 1 天</text>
      <text x={cx(29) + 54} y="536" textAnchor="end" fontFamily={SANS} fontSize="52" fill={INK} opacity={clamp01(n - 28)}>第 30 天</text>
    </svg>
  );
};

/** Scene 4, second picture: what labour grows. `grow` runs 0 to 1: seedling, stem, leaves, then a heavy ear. */
const LEAVES: Array<{f: number; dir: number}> = [{f: 0.2, dir: -1}, {f: 0.32, dir: 1}, {f: 0.5, dir: -1}, {f: 0.62, dir: 1}];
const Plant = () => {
  const grow = useProp('grow', 0);
  const stemDraw = clamp01(grow / 0.7);
  const ear = Math.max(0.001, clamp01((grow - 0.65) / 0.35));
  const topY = 650 - 350 * stemDraw;
  const grains = Array.from({length: 15}, (_, k) => {
    const u = k / 14;
    const px = (1 - u) * (1 - u) * 452 + 2 * (1 - u) * u * 540 + u * u * 560;
    const py = (1 - u) * (1 - u) * 300 + 2 * (1 - u) * u * 250 + u * u * 430;
    const ang = (Math.atan2(2 * (1 - u) * (250 - 300) + 2 * u * (430 - 250), 2 * (1 - u) * (540 - 452) + 2 * u * (560 - 540)) * 180) / Math.PI;
    return {px, py, ang};
  });
  return (
    <svg viewBox="0 0 900 760" width="900" height="760">
      <ellipse cx="450" cy="656" rx="230" ry="38" fill="#b48f5a" stroke={INK} strokeWidth="4" />
      <Hoe x={230} y={526} a={-14} />
      <Stroke d="M450 650 C 440 540, 470 430, 452 300" color={mix(GREEN, [70, 100, 50], 0.4)} width={13} draw={stemDraw} />
      {LEAVES.map((l, i) => {
        const e = Math.max(0.001, clamp01((grow - l.f * 0.6) / 0.25));
        const sy = 650 - 350 * l.f;
        const sx = 450;
        return (
          <g key={i} transform={`translate(${sx} ${sy}) scale(${e}) translate(${-sx} ${-sy})`}>
            <path d={`M ${sx} ${sy} Q ${sx + l.dir * 90} ${sy - 80} ${sx + l.dir * 190} ${sy - 36} Q ${sx + l.dir * 90} ${sy - 28} ${sx} ${sy} Z`} fill={mix(GREEN, [90, 130, 60], 0.5)} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          </g>
        );
      })}
      <g transform={`translate(452 ${topY}) scale(${ear}) translate(-452 -300)`} opacity={ear > 0 ? 1 : 0}>
        {grains.map((g, k) => [-11, 11].map((o) => {
          const u = k / 14;
          const a = ((g.ang - 90) * Math.PI) / 180;
          return <ellipse key={`${k}${o}`} cx={g.px + o * Math.cos(a)} cy={g.py + o * Math.sin(a)} rx={13 * (1 - 0.45 * u)} ry={26 * (1 - 0.4 * u)} transform={`rotate(${g.ang - 90} ${g.px + o * Math.cos(a)} ${g.py + o * Math.sin(a)})`} fill={GOLD} stroke={INK} strokeWidth="3" />;
        }))}
      </g>
    </svg>
  );
};

/** Scene 4, third picture: the stump and a hare that is not there, crossed out. */
const WishPanel = () => {
  const draw = useProp('slash', 'draw', 0);
  return (
    <svg viewBox="0 0 800 760" width="800" height="760">
      <ellipse cx="400" cy="656" rx="230" ry="38" fill="#cdb98a" stroke={INK} strokeWidth="4" />
      <g transform="translate(400 650) scale(1.6)"><StumpArt /></g>
      <g transform="translate(250 420) scale(1.3)"><Hare ghost /></g>
      <Obj as="g" id="slash"><Stroke d="M 150 150 L 660 640" color={RED} width={26} draw={draw} /></Obj>
    </svg>
  );
};

const IDIOM = ['守', '株', '待', '兔'];
const PINYIN = 'shǒu  zhū  dài  tù';

export default (
  <Doc
    id="fable-stump" poster={2.5}
    title="守株待兔"
    lang="zh-CN"
    voice="minimax:Chinese (Mandarin)_Radio_Host"
    theme="visotalk/dark"
    canvas="16x9"
    tokens={{
      fonts: {sans: '"LXGW WenKai", serif', mono: '"Noto Serif SC", serif'},
      colors: {bg: '#f1e8d2', panel: '#e6dabd', panel2: '#dccfae', border: '#bba98a', text: '#2a2420', muted: '#6b5f52', faint: '#c9bb9a', data: '#b5362b', grad: '#b5362b', op: '#35506b', good: '#5d7d3f', bad: '#b5362b', warn: '#c99a4b'},
    }}
    exports={{variants: [{preset: '16x9'}], fps: 30, captions: 'burned'}}
  >
    {/* Cover: the first frame is the thumbnail, so it is drawn at once, with no fade. No narration, 2.8 s. */}
    <Scene id="cover" duration={2.8}>
      <Part id="stage0"><Stage s={0} /></Part>
      <Part id="book" x={330} y={100} w={700} h={800}>{() => (
        <div style={{position: 'relative', width: 700, height: 800}}>
          <div style={{position: 'absolute', left: 60, top: 0, writingMode: 'vertical-rl', fontFamily: SERIF, fontWeight: 900, fontSize: 180, letterSpacing: '0.06em', lineHeight: 1, color: INK}}>守株待兔</div>
          <div style={{position: 'absolute', left: 300, top: 12, writingMode: 'vertical-rl', fontFamily: SANS, fontSize: 56, letterSpacing: '0.3em', color: INK}}>中国古代寓言</div>
          <div style={{position: 'absolute', left: 312, top: 560, width: 84, height: 84, background: RED, borderRadius: 6, color: PAPER, fontFamily: SERIF, fontWeight: 900, fontSize: 62, lineHeight: '84px', textAlign: 'center'}}>寓</div>
        </div>
      )}</Part>
      <Animation>
        <Appear target={["stage0", "book"]} at="start" dur={0} />
      </Animation>
    </Scene>

    <Scene id="windfall">
      <Line id="l1">从前，宋国有一个农夫，每天在田里辛苦耕种。</Line>
      <Line id="l2">田边立着一个树桩。</Line>
      <Line id="l3">有一天，一只兔子飞快地跑过来，一头撞在树桩上，死了。</Line>
      <Line id="l4">农夫没费一点力气，就捡到了一只肥兔子。</Line>
      <Part id="stage"><Stage s={1} /></Part>
      <Animation>
        <Appear target="stage" at="start" dur={0} />
        <Appear target="farmer" line="l1" word="农夫" dur={0.7} />
        <Appear target="crops" line="l1" word="田里" dur={0.8} />
        <Appear target="stump" line="l2" word="树桩" dur={0.7} />
        <Appear target="hare" line="l3" word="一只兔子" dur={0.5} />
        <Tween target="stage" to={{hx: 1178}} line="l3" word="飞快地跑" dur={1.5} easing="linear" />
        <Tween target="stage" to={{fall: 1}} line="l3" word="一头撞" dur={0.8} easing="easeOut" />
        <Tween target="stage" to={{hx: 1146}} line="l3" word="一头撞" dur={0.8} easing="easeOut" />
        <Tween target="stage" to={{work: 0}} line="l4" word="农夫" dur={0.4} />
        <Tween target="stage" to={{fx: 1040}} line="l4" word="没费一点" dur={1.4} easing="easeInOut" />
        <Tween target="stage" to={{carry: 1}} line="l4" word="捡到" dur={0.9} easing="easeInOut" />
      </Animation>
    </Scene>

    <Scene id="waiting">
      <Line id="l5">他心想：种地多累啊，要是天天都有兔子可捡，该多好。</Line>
      <Line id="l6">于是他扔下锄头，守在树桩旁边，等着下一只兔子。</Line>
      <Line id="l7">一天过去了，一个月过去了，兔子再也没有来。</Line>
      <Line id="l8" hold={1}>田里的野草越长越高，庄稼全都荒废了。</Line>
      <Part id="stage2"><Stage s={2} /></Part>
      <Part id="tablet" x={110} y={80} w={520} h={120}><Tablet /></Part>
      <Animation>
        <Appear target="stage2" at="start" dur={0} />
        <Appear target="cloud" line="l5" word="要是" dur={0.6} />
        <Appear target="dream1" line="l5" word="天天" dur={0.5} />
        <Appear target="dream2" line="l5" word="都有" dur={0.5} />
        <Appear target="dream3" line="l5" word="可捡" dur={0.5} />
        <Disappear target={["cloud", "dream1", "dream2", "dream3"]} line="l6" word="于是" dur={0.4} />
        <Tween target="stage2" to={{toss: 1}} line="l6" word="扔下" dur={0.9} easing="easeOut" />
        <Tween target="stage2" to={{fx: 1140}} line="l6" word="守在" dur={1.1} easing="easeInOut" />
        <Tween target="stage2" to={{sit: 1}} line="l6" word="树桩旁边" dur={0.6} />
        <Appear target="tablet" line="l7" word="一天过去了" dur={0.5} />
        <Tween target="stage2" to={{sunT: 1.85}} line="l7" word="一天过去了" dur={1.8} easing="easeInOut" />
        <Tween target="stage2" to={{sunT: 4.85}} line="l7" word="一个月过去了" dur={2.2} easing="linear" />
        <Tween target="tablet" to={{days: 30}} line="l7" word="一个月过去了" dur={2.2} easing="linear" />
        <Disappear target="tablet" line="l8" word="庄稼" dur={0.4} />
        <Tween target="stage2" to={{weeds: 1}} line="l8" word="野草" dur={2.4} easing="easeInOut" />
        <Tween target="stage2" to={{decay: 1}} line="l8" word="庄稼" dur={2.2} easing="easeInOut" />
      </Animation>
    </Scene>

    <Scene id="laughed">
      <Line id="l9" hold={1.4}>全国的人都笑话这个农夫。</Line>
      <Part id="stage3"><Stage s={3} /></Part>
      <Animation>
        <Appear target="stage3" at="start" dur={0} />
        <Appear target={["v1", "v2", "v3"]} line="l9" word="全国的人" stagger={0.45} dur={0.5} />
        <Appear target="laugh" line="l9" word="笑话" dur={0.5} />
      </Animation>
    </Scene>

    <Scene id="moral">
      <Line id="l10">这个成语告诉我们：偶然得来的好运，不会一再出现。</Line>
      <Line id="l11">想要收获，只能靠自己的劳动，不能抱着侥幸，坐等奇迹。</Line>
      <Line id="l12" hold={2.2}>守株待兔，说的就是这个道理。</Line>
      <Part id="dots" x={0} y={250} w={1920} h={560}><Dots /></Part>
      <Part id="plant" x={80} y={70} w={900} h={760}><Plant /></Part>
      <Part id="wish" x={1010} y={70} w={800} h={760}><WishPanel /></Part>
      <Part id="lab1" x={280} y={790} w={400} h={140}>{() => <div style={{textAlign: 'center', fontFamily: SERIF, fontWeight: 900, fontSize: 84, lineHeight: 1.4, color: INK}}>耕耘</div>}</Part>
      <Part id="lab2" x={1210} y={790} w={400} h={140}>{() => <div style={{textAlign: 'center', fontFamily: SERIF, fontWeight: 900, fontSize: 84, lineHeight: 1.4, color: '#6b5f52'}}>侥幸</div>}</Part>
      <Part id="idiom" x={160} y={250} w={1600} h={400}>{() => (
        <div style={{display: 'flex', justifyContent: 'center', gap: 36}}>
          {IDIOM.map((c, i) => <Obj key={c} id={`c${i + 1}`} style={{fontFamily: SERIF, fontWeight: 900, fontSize: 300, lineHeight: 1.1, color: INK}}>{c}</Obj>)}
        </div>
      )}</Part>
      <Part id="pinyin" x={160} y={690} w={1600} h={100}>{() => <div style={{textAlign: 'center', fontFamily: SANS, fontSize: 64, letterSpacing: '0.18em', color: '#6b5f52', whiteSpace: 'pre'}}>{PINYIN}</div>}</Part>
      <Part id="seal" x={1530} y={650} w={130} h={130}>{() => <div style={{width: 120, height: 120, background: RED, borderRadius: 8, color: PAPER, fontFamily: SERIF, fontWeight: 900, fontSize: 88, lineHeight: '120px', textAlign: 'center'}}>寓</div>}</Part>
      <Animation>
        <Appear target="dots" line="l10" word="偶然得来" dur={0.7} />
        <Tween target="dots" to={{n: 30}} line="l10" word="好运" dur={1.8} easing="linear" />
        <Disappear target="dots" line="l11" dur={0.4} />
        <Appear target="plant" line="l11" word="想要收获" offset={0.5} dur={0.6} />
        <Tween target="plant" to={{grow: 1}} line="l11" word="靠自己的劳动" dur={2.4} easing="easeInOut" />
        <Appear target="lab1" line="l11" word="劳动" dur={0.5} />
        <Appear target="wish" line="l11" word="不能抱着侥幸" dur={0.6} />
        <Appear target="lab2" line="l11" word="侥幸" dur={0.5} />
        <Tween target="slash" to={{draw: 1}} line="l11" word="坐等奇迹" dur={0.7} easing="easeOut" />
        <Disappear target={["plant", "wish", "lab1", "lab2"]} line="l11" edge="end" dur={0.4} />
        <Appear target="idiom" line="l12" word="守株待兔" dur={0.01} />
        <Appear target={["c1", "c2", "c3", "c4"]} line="l12" word="守株待兔" stagger={0.22} dur={0.5} />
        <Appear target="pinyin" line="l12" word="说的就是" dur={0.6} />
        <Appear target="seal" line="l12" word="道理" dur={0.5} />
      </Animation>
    </Scene>
  </Doc>
);
