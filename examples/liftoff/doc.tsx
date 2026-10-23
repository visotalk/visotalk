import {Doc, Asset, Scene, Line, Part, Animation, Appear, Disappear, Tween, Set, Sound} from '@visotalk/jsx';
import {Obj, Video, useAsset, useProp, useDocTime} from '@visotalk/runtime';

/**
 * "Liftoff", a book explainer built on real material: a NASA clip, public-domain and CC BY photographs (see the assets).
 * Every picture is full-bleed or one big typographic idea. The Demo-2 climb (the tracking shot, slowed to half speed with the motion interpolated and joined to the same shot a little later, where the rocket is
 * a flame in cloud: media/demo2_rise.mp4) plays under the opening lines and the title is laid on it;
 * the book's span is a to-scale axis of years under two huge dates; the odds are two fields of marks, one of them morphing from people
 * into dollars, with a lens on SpaceX's handful; Omelek is a circular photograph inside rings that spread across the Pacific; the three
 * failures are three flight paths that fall short of one dashed orbit line, each over its own photograph; the three crosses are a global
 * part (the tally) that is carried into the fourth launch and becomes a check; the contract is two huge figures, then a route.
 * A global field of stars sits behind every scene that is not a photograph.
 * The score is made for the film (make-music.py) and cut to its narration.
 * The summary is written from public reviews and descriptions.
 * Scenes end with their parts, so a picture that goes on (the photo, the rocket) is one component, declared in each scene that needs it.
 */

// ---------------------------------------------------------------------------------------------------- helpers

const SANS = "var(--vt-sans)", MONO = "var(--vt-mono)";
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const frac = (v: number) => v - Math.floor(v);
const hash = (i: number, k: number) => frac(Math.sin(i * 12.9898 + k * 78.233) * 43758.5453);
const SHADOW = "0 2px 36px rgba(0,0,0,0.9)";
const GLOW = "0 0 60px color-mix(in srgb, var(--vt-grad) 70%, transparent)";

/** The Lucide icons the video uses (ISC), as svg paths on a 24 x 24 grid */
const ICONS = {
  clock: ["M2 12a10 10 0 1 0 20 0a10 10 0 1 0 -20 0", "M12 6v6l4 2"],
  sun: ["M8 12a4 4 0 1 0 8 0a4 4 0 1 0 -8 0", "M12 2v2", "M12 20v2", "m4.93 4.93 1.41 1.41", "m17.66 17.66 1.41 1.41", "M2 12h2", "M20 12h2", "m6.34 17.66-1.41 1.41", "m19.07 4.93-1.41 1.41"],
  droplet: ["M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"],
  cutoff: ["M4.9 19.1C1 15.2 1 8.8 4.9 4.9", "M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5", "M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5", "M19.1 4.9C23 8.8 23 15.1 19.1 19", "M10 12a2 2 0 1 0 4 0a2 2 0 1 0 -4 0", "M3 3l18 18"],
  x: ["M18 6 6 18", "m6 6 12 12"],
  check: ["M2 12a10 10 0 1 0 20 0a10 10 0 1 0 -20 0", "m9 12 2 2 4-4"],
  rocket: ["M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z", "m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z", "M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0", "M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"],
  box: ["M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z", "M12 22V12", "m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7", "m7.5 4.27 9 5.15"],
  satellite: ["M13 7 9 3 5 7l4 4", "m17 11 4 4-4 4-4-4", "m8 12 4 4 6-6-4-4Z", "m16 8 3-3", "M9 21a6 6 0 0 0-6-6"],
};

/** An icon that is a target: a square at (left, top); `stroke` is in px of the final drawing */
function Icon({id, name, left, top, size, color, stroke = 3}: {id?: string; name: keyof typeof ICONS; left: number; top: number; size: number; color: string; stroke?: number}) {
  const svg = (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={(stroke * 24) / size} strokeLinecap="round" strokeLinejoin="round">
      {ICONS[name].map((d) => <path key={d} d={d} />)}
    </svg>
  );
  const box = {position: "absolute" as const, left, top, width: size, height: size};
  return id ? <Obj id={id} style={box}>{svg}</Obj> : <div style={box}>{svg}</div>;
}

/** A photograph filling its part, with a slow move (zoom, px, py are tweened by the document), an optional dimming and an optional
 * shade that darkens one side so type or a chart can sit on it (`side`: "left" darkens the left, "right" the right) */
function Photo({asset, radius = 0, side}: {asset: string; radius?: number; side?: "left" | "right"}) {
  const url = useAsset(asset);
  const zoom = useProp("zoom", 1), px = useProp("px", 50), py = useProp("py", 50), dim = useProp("dim", 0);
  const shade = side ? `linear-gradient(${side === "left" ? 90 : 270}deg, rgba(4,6,12,0.9) 0%, rgba(4,6,12,0.62) 45%, rgba(4,6,12,0.05) 100%)` : "none";
  return (
    <div style={{position: "absolute", inset: 0, overflow: "hidden", borderRadius: radius}}>
      <img src={url} alt="" style={{width: "100%", height: "100%", objectFit: "cover", objectPosition: `${px}% ${py}%`, transform: `scale(${zoom})`, transformOrigin: `${px}% ${py}%`}} />
      <div style={{position: "absolute", inset: 0, background: `rgba(4,6,12,${dim})`}} />
      <div style={{position: "absolute", inset: 0, background: shade}} />
      {side === "right" && <div style={{position: "absolute", inset: 0, background: "linear-gradient(0deg, rgba(4,6,12,0.82) 0%, rgba(4,6,12,0.45) 38%, rgba(4,6,12,0) 62%)"}} />}
    </div>
  );
}

/** One field of stars behind every scene that is not a photograph: it drifts down, and each star breathes at its own pace */
const STARS = Array.from({length: 150}, (_, i) => ({x: hash(i, 1) * 1920, y: hash(i, 2) * 1080, r: 0.8 + hash(i, 3) * 2.2, v: 2 + hash(i, 4) * 7, f: 0.4 + hash(i, 5) * 1.2, p: hash(i, 6) * 6.28}));

function Stars() {
  const t = useDocTime();
  return (
    <div style={{position: "absolute", inset: 0, background: "radial-gradient(ellipse 90% 70% at 50% 115%, #1b2745 0%, #0a0e1a 55%, #05070d 100%)"}}>
      <svg width={1920} height={880} style={{position: "absolute", left: 0, top: 0}}>
        {STARS.map((s, i) => (
          <circle key={i} cx={Math.min(1912, Math.max(8, s.x))} cy={8 + ((((s.y * 0.8 + t * s.v) % 860) + 860) % 860)} r={s.r} fill="#fff" opacity={0.15 + 0.55 * (0.5 + 0.5 * Math.sin(t * s.f + s.p))} />
        ))}
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------- hook

/** The real launch; its dimming grows when the title is laid on it, and a vignette keeps the type readable */
function Clip() {
  const dim = useProp("dim", 0.1);
  return (
    <div style={{position: "absolute", inset: 0, background: "#000"}}>
      <Video asset="demo2" in={0} rate={1} fit="cover" />
      <div style={{position: "absolute", inset: 0, background: `rgba(4,6,12,${dim})`}} />
      <div style={{position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 70% at 50% 45%, transparent 40%, rgba(0,0,0,0.65) 100%)"}} />
    </div>
  );
}

function LowerThird() {
  const w = useProp("lt-rule", "w", 0);
  return (
    <div style={{position: "absolute", inset: 0}}>
      <Obj id="lt-small" style={{position: "absolute", left: 0, top: 0, fontFamily: MONO, fontSize: 36, letterSpacing: 8, textTransform: "uppercase", color: "var(--vt-text)", textShadow: SHADOW, whiteSpace: "nowrap"}}>Crew Dragon Demo-2 · Kennedy Space Center</Obj>
      <Obj id="lt-big" style={{position: "absolute", left: 0, top: 52, fontFamily: SANS, fontSize: 168, fontWeight: 700, letterSpacing: -4, color: "var(--vt-text)", textShadow: SHADOW, lineHeight: 1.1, whiteSpace: "nowrap"}}>May 30, 2020</Obj>
      <Obj id="lt-rule" style={{position: "absolute", left: 0, top: 246, width: w, height: 8, borderRadius: 4, background: "var(--vt-grad)", boxShadow: GLOW}} />
    </div>
  );
}

function FirstPrivate() {
  const line = {fontFamily: SANS, fontSize: 112, fontWeight: 700, color: "var(--vt-text)", textShadow: SHADOW, whiteSpace: "nowrap" as const, lineHeight: 1.12, letterSpacing: -2};
  return (
    <>
      <Obj id="first-a" style={line}>First private company</Obj>
      <Obj id="first-b" style={{...line, color: "var(--vt-grad)", textShadow: `${SHADOW}, ${GLOW}`}}>to launch people into orbit</Obj>
    </>
  );
}

function Title() {
  return (
    <div style={{position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 0}}>
      <Obj id="eyebrow" style={{fontFamily: MONO, fontSize: 40, letterSpacing: 18, textTransform: "uppercase", color: "var(--vt-text)", textShadow: SHADOW, marginBottom: 6}}>a book explainer</Obj>
      <div style={{display: "flex", fontFamily: SANS, fontSize: 360, fontWeight: 700, lineHeight: 1.0, letterSpacing: -12, color: "var(--vt-text)", textShadow: SHADOW, whiteSpace: "nowrap"}}>
        <Obj id="name-a" style={{display: "inline-block"}}>Lift</Obj>
        <Obj id="name-b" style={{display: "inline-block", color: "var(--vt-grad)", textShadow: `${SHADOW}, ${GLOW}`}}>off</Obj>
      </div>
      <Obj id="byline" style={{fontFamily: SANS, fontSize: 72, letterSpacing: 10, color: "var(--vt-text)", textShadow: SHADOW, marginTop: 6}}>Eric Berger</Obj>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------- book

/** The to-scale axis: 2002 to 2021 on 1600 px under two huge dates, a tick for every year, the first four launches as a bar that grows along it */
const AX = {x0: 160, x1: 1760, y: 380, from: 2002, to: 2021, launches: 2008.75};
const axisX = (year: number) => lerp(AX.x0, AX.x1, (year - AX.from) / (AX.to - AX.from));

function Axis() {
  const draw = useProp("axis-line", "draw", 0), grow = useProp("span", "grow", 0);
  const len = AX.x1 - AX.x0, years = AX.to - AX.from;
  const num = {position: "absolute" as const, top: 10, fontFamily: SANS, fontSize: 250, fontWeight: 700, letterSpacing: -8, lineHeight: "250px", whiteSpace: "nowrap" as const};
  const cap = {position: "absolute" as const, top: 270, fontFamily: MONO, fontSize: 34, letterSpacing: 6, textTransform: "uppercase" as const, whiteSpace: "nowrap" as const};
  return (
    <>
      <Obj id="n-2002" style={{...num, left: AX.x0 - 12, color: "var(--vt-grad)", textShadow: GLOW}}>2002</Obj>
      <Obj id="n-2021" style={{...num, right: 1920 - AX.x1 - 12, color: "var(--vt-data)"}}>2021</Obj>
      <Obj id="lab-2002" style={{...cap, left: AX.x0, color: "var(--vt-muted)"}}>SpaceX founded</Obj>
      <Obj id="lab-2021" style={{...cap, right: 1920 - AX.x1, color: "var(--vt-muted)"}}>Liftoff published</Obj>
      <svg width={1920} height={520} style={{position: "absolute", left: 0, top: 0}}>
        <Obj as="g" id="axis-line">
          <line x1={AX.x0} y1={AX.y} x2={AX.x1} y2={AX.y} stroke="var(--vt-faint)" strokeWidth={6} strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - draw)} />
          {Array.from({length: years + 1}, (_, i) => (
            <line key={i} x1={axisX(AX.from + i)} x2={axisX(AX.from + i)} y1={AX.y - 14} y2={AX.y + 14} stroke="var(--vt-faint)" strokeWidth={3} opacity={clamp01(draw * (years + 1) - i)} />
          ))}
        </Obj>
        <Obj as="g" id="dot-2002"><circle cx={AX.x0} cy={AX.y} r={22} fill="var(--vt-grad)" /></Obj>
        <Obj as="g" id="dot-2021"><circle cx={AX.x1} cy={AX.y} r={22} fill="var(--vt-data)" /></Obj>
      </svg>
      <Obj id="span" style={{position: "absolute", left: AX.x0, top: AX.y - 13, width: Math.max(2, grow * (axisX(AX.launches) - AX.x0)), height: 26, borderRadius: 13, background: "var(--vt-grad)", boxShadow: GLOW}} />
      <Obj id="lab-span" style={{position: "absolute", left: AX.x0, top: AX.y + 38, fontFamily: SANS, fontSize: 52, fontWeight: 700, color: "var(--vt-grad)", whiteSpace: "nowrap"}}>Falcon 1: the first four launches</Obj>
    </>
  );
}

const PEOPLE = [
  {id: "eng", word: "engineers", color: "var(--vt-data)"},
  {id: "tech", word: "technicians", color: "var(--vt-good)"},
  {id: "exec", word: "executives", color: "var(--vt-warn)"},
];

/** Three words set as big type, one under the other, each with a bar in its colour */
function People() {
  return (
    <>
      {PEOPLE.map((p, i) => (
        <Obj key={p.id} id={p.id} style={{position: "absolute", left: 160, top: 20 + i * 116, width: 1500, height: 100, display: "flex", alignItems: "center", gap: 36}}>
          <div style={{width: 12, height: 76, borderRadius: 6, background: p.color}} />
          <div style={{fontFamily: SANS, fontSize: 100, lineHeight: 1, fontWeight: 700, letterSpacing: -2, color: p.color, whiteSpace: "nowrap"}}>{p.word}</div>
        </Obj>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------------------------------- odds

/** Three hundred marks, each a hundred people; the same marks turn into dollar signs when the money is meant. An illustrative scale, and it says so. */
const FIELD = {cols: 25, rows: 12, step: 42, n: 300};

function DotField() {
  const show = useProp("dots", "show", 0), money = useProp("dots", "money", 0);
  const marks = [];
  for (let i = 0; i < FIELD.n; i++) {
    const col = i % FIELD.cols, row = Math.floor(i / FIELD.cols);
    const s = ease(clamp01(show * 1.7 - (col / FIELD.cols) * 0.7));
    const cx = col * FIELD.step + FIELD.step / 2, cy = row * FIELD.step + FIELD.step / 2;
    marks.push(
      <g key={i}>
        <circle cx={cx} cy={cy} r={14 * s} fill="var(--vt-text)" opacity={0.78 * (1 - money)} />
        <text x={cx} y={cy + 11} textAnchor="middle" fontFamily="var(--vt-sans)" fontSize={32 * s} fontWeight={700} fill="var(--vt-warn)" opacity={money}>$</text>
      </g>,
    );
  }
  return (
    <svg width={FIELD.cols * FIELD.step} height={FIELD.rows * FIELD.step} style={{position: "absolute", left: 0, top: 0}}>
      <Obj as="g" id="dots">{marks}</Obj>
    </svg>
  );
}

/** The lens on SpaceX's handful: the same marks at the same size, magnified, then one rocket for the money */
function Lens() {
  return (
    <div style={{position: "absolute", inset: 0}}>
      <svg width={520} height={700} style={{position: "absolute", left: 0, top: 0}}>
        <circle cx={260} cy={230} r={214} fill="rgba(255,140,60,0.07)" stroke="var(--vt-grad)" strokeWidth={6} />
      </svg>
      <Obj id="lens-a" style={{position: "absolute", inset: 0}}>
        <svg width={520} height={700} style={{position: "absolute", left: 0, top: 0}}>
          <circle cx={190} cy={230} r={46} fill="var(--vt-grad)" />
          <circle cx={330} cy={230} r={46} fill="var(--vt-grad)" />
        </svg>
        <div style={{position: "absolute", left: 0, top: 480, width: 520, textAlign: "center", fontFamily: SANS, fontSize: 44, fontWeight: 700, color: "var(--vt-muted)"}}>SpaceX</div>
        <div style={{position: "absolute", left: 0, top: 534, width: 520, textAlign: "center", fontFamily: SANS, fontSize: 60, fontWeight: 700, lineHeight: 1.1, color: "var(--vt-grad)"}}>fewer than 200 people</div>
      </Obj>
      <Obj id="lens-b" style={{position: "absolute", inset: 0}}>
        <Icon name="rocket" left={140} top={110} size={240} color="var(--vt-grad)" stroke={5} />
        <div style={{position: "absolute", left: 0, top: 480, width: 520, textAlign: "center", fontFamily: SANS, fontSize: 44, fontWeight: 700, color: "var(--vt-muted)"}}>SpaceX</div>
        <div style={{position: "absolute", left: 0, top: 534, width: 520, textAlign: "center", fontFamily: SANS, fontSize: 60, fontWeight: 700, lineHeight: 1.1, color: "var(--vt-grad)"}}>money for one more rocket</div>
      </Obj>
    </div>
  );
}

function Heading({children}: {children: string}) {
  return <div style={{fontFamily: SANS, fontSize: 100, fontWeight: 700, letterSpacing: -2, color: "var(--vt-text)", lineHeight: "120px", whiteSpace: "nowrap"}}>{children}</div>;
}

function OddsLabels() {
  const big = {position: "absolute" as const, left: 0, top: 54, fontFamily: SANS, fontSize: 76, fontWeight: 700, letterSpacing: -1, whiteSpace: "nowrap" as const, lineHeight: "96px"};
  return (
    <>
      <Obj id="lab-name" style={{position: "absolute", left: 0, top: 0, fontFamily: SANS, fontSize: 42, fontWeight: 700, color: "var(--vt-muted)", whiteSpace: "nowrap"}}>Boeing and Lockheed Martin, each</Obj>
      <Obj id="lab-people" style={{...big, color: "var(--vt-text)"}}>tens of thousands of employees</Obj>
      <Obj id="lab-money" style={{...big, color: "var(--vt-warn)"}}>tens of billions of dollars a year</Obj>
      <div style={{position: "absolute", left: 0, top: 168, fontFamily: MONO, fontSize: 26, letterSpacing: 3, color: "var(--vt-faint)", whiteSpace: "nowrap"}}>ILLUSTRATIVE SCALE · EACH DOT ABOUT 100 PEOPLE</div>
    </>
  );
}

// ---------------------------------------------------------------------------------------------------- island

/** Rings around the island; each grows from the centre outward to its radius, and a label sits on it where the rings step up to the right */
const RINGS = [
  {id: "atoll", r: 270, color: "var(--vt-data)", text: "Kwajalein Atoll"},
  {id: "marshall", r: 370, color: "var(--vt-op)", text: "Marshall Islands"},
  {id: "pacific", r: 470, color: "var(--vt-text)", text: "Pacific Ocean"},
];
const CENTER = {x: 960, y: 520};

function Rings() {
  return (
    <>
      <svg width={1920} height={880} style={{position: "absolute", left: 0, top: 0, overflow: "hidden"}}>
        {RINGS.map((ring) => <RingCircle key={ring.id} {...ring} />)}
        <Obj as="g" id="dot-om"><circle cx={CENTER.x} cy={CENTER.y} r={14} fill="var(--vt-grad)" stroke="#fff" strokeWidth={4} /></Obj>
      </svg>
      {RINGS.map((ring) => (
        <Obj key={ring.id} id={`lab-${ring.id}`} style={{position: "absolute", left: CENTER.x - 215, width: 430, textAlign: "center", top: CENTER.y - ring.r - 32, height: 64, lineHeight: "64px", borderRadius: 32, background: "#070a12", border: `3px solid ${ring.color}`, boxSizing: "border-box", fontFamily: SANS, fontSize: 40, fontWeight: 700, color: ring.color, whiteSpace: "nowrap"}}>{ring.text}</Obj>
      ))}
    </>
  );
}

function RingCircle({id, r, color}: {id: string; r: number; color: string}) {
  const draw = useProp(`ring-${id}`, "draw", 0);
  const dx = r * Math.cos(0.6981), dy = r * Math.sin(0.6981); // the ring is drawn over the top, from 40 degrees below the left to 40 below the right, clear of the captions
  const d = `M ${CENTER.x - dx} ${CENTER.y + dy} A ${r} ${r} 0 1 1 ${CENTER.x + dx} ${CENTER.y + dy}`;
  return <Obj as="path" id={`ring-${id}`} d={d} pathLength={1} fill="none" stroke={color} strokeWidth={5} strokeLinecap="round" strokeDasharray={1} strokeDashoffset={1 - draw} />;
}

const LIFE = [
  {id: "deadlines", icon: "clock", color: "var(--vt-warn)", word: "deadlines"},
  {id: "heat", icon: "sun", color: "var(--vt-bad)", word: "heat"},
  {id: "salt", icon: "droplet", color: "var(--vt-data)", word: "salt"},
  {id: "cut", icon: "cutoff", color: "var(--vt-text)", word: "cut off"},
] as const;

function Life() {
  return (
    <>
      {LIFE.map((l, i) => (
        <Obj key={l.id} id={`life-${l.id}`} style={{position: "absolute", left: 0, top: i * 178, width: 1100, height: 150}}>
          <Icon name={l.icon} left={0} top={15} size={120} color={l.color} stroke={3} />
          <div style={{position: "absolute", left: 170, top: 0, height: 150, lineHeight: "150px", fontFamily: SANS, fontSize: 138, fontWeight: 700, letterSpacing: -3, color: l.color, textShadow: SHADOW, whiteSpace: "nowrap"}}>{l.word}</div>
        </Obj>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------------------------------- failures

/** Three flight paths that fall short of one dashed orbit line. Each is drawn on its own words, then dims when the next flight comes.
 * Schematic: only the 289 km is a figure from the narration. */
const PATHS = [
  {n: 1, d: "M 60 640 C 66 628 80 612 100 596", end: [100, 596]},
  {n: 2, d: "M 60 640 C 160 520 320 300 540 210", end: [540, 210]},
  {n: 3, d: "M 60 640 C 140 540 260 380 400 330", end: [400, 330]},
] as const;

function Chart() {
  const orbit = useProp("orbit", "draw", 0);
  return (
    <>
      <svg width={840} height={720} style={{position: "absolute", left: 0, top: 0}}>
        <Obj as="g" id="orbit">
          <line x1={60} y1={70} x2={800} y2={70} stroke="var(--vt-good)" strokeWidth={5} strokeDasharray="4 18" strokeLinecap="round" strokeDashoffset={0} pathLength={1} opacity={clamp01(orbit * 3)} />
        </Obj>
        <line x1={40} y1={648} x2={800} y2={648} stroke="var(--vt-faint)" strokeWidth={5} strokeLinecap="round" />
        {PATHS.map((p) => <FlightPath key={p.n} {...p} />)}
      </svg>
      <Obj id="orbit-lab" style={{position: "absolute", left: 60, top: 6, fontFamily: MONO, fontSize: 40, letterSpacing: 8, color: "var(--vt-good)", textShadow: SHADOW}}>ORBIT</Obj>
      <Obj id="km" style={{position: "absolute", left: 520, top: 160, fontFamily: SANS, fontSize: 60, fontWeight: 700, color: "var(--vt-data)", whiteSpace: "nowrap", textShadow: SHADOW}}>289 km up</Obj>
      <Obj id="bump" style={{position: "absolute", left: 440, top: 380, fontFamily: SANS, fontSize: 40, fontWeight: 700, color: "var(--vt-muted)", whiteSpace: "nowrap", textShadow: SHADOW}}>stage 1 hits stage 2</Obj>
    </>
  );
}

function FlightPath({n, d, end}: {n: number; d: string; end: readonly [number, number]}) {
  const draw = useProp(`path-${n}`, "draw", 0), dim = useProp(`path-${n}`, "dim", 0);
  return (
    <>
      <Obj as="g" id={`path-${n}`}>
        <path d={d} pathLength={1} fill="none" stroke="var(--vt-text)" strokeWidth={9} strokeLinecap="round" strokeDasharray={1} strokeDashoffset={1 - draw} opacity={1 - 0.65 * dim} />
        <circle cx={end[0]} cy={end[1]} r={13} fill="var(--vt-text)" opacity={(1 - 0.65 * dim) * clamp01((draw - 0.97) * 40)} />
      </Obj>
      <Obj as="g" id={`x-${n}`}>
        <g transform={`translate(${end[0] - 36} ${end[1] - 36}) scale(3)`} fill="none" stroke="var(--vt-bad)" strokeWidth={2.6} strokeLinecap="round" opacity={1 - 0.45 * dim}>
          {ICONS.x.map((p) => <path key={p} d={p} />)}
        </g>
      </Obj>
    </>
  );
}

function FlightTitle() {
  return (
    <>
      {[
        {n: 1, when: "March 2006"},
        {n: 2, when: "March 2007"},
        {n: 3, when: "August 2008"},
      ].map((f) => (
        <Obj key={f.n} id={`ft-${f.n}`} style={{position: "absolute", left: 0, top: 0, width: 900, height: 420}}>
          <div style={{fontFamily: MONO, fontSize: 44, letterSpacing: 16, color: "var(--vt-bad)", textShadow: SHADOW}}>FLIGHT</div>
          <div style={{fontFamily: SANS, fontSize: 250, fontWeight: 700, lineHeight: 0.95, letterSpacing: -10, color: "var(--vt-text)", textShadow: SHADOW}}>{f.n}</div>
          <div style={{fontFamily: SANS, fontSize: 70, fontWeight: 700, color: "var(--vt-text)", textShadow: SHADOW, marginTop: 10}}>{f.when}</div>
        </Obj>
      ))}
    </>
  );
}

/** The three crosses, the tally. Global: it is carried from the failures into the fourth launch (k: 0 large in the middle, 1 small in the corner) */
function Tally() {
  const k = useProp("k", 0);
  const size = lerp(300, 64, k), top = lerp(300, 92, k);
  const left = (i: number) => lerp(480 + i * 400 - size / 2, 120 + i * 86, k);
  return (
    <>
      {[0, 1, 2].map((i) => (
        <Obj key={i} id={`cross-${i + 1}`} style={{position: "absolute", left: left(i), top, width: size, height: size}}>
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="var(--vt-bad)" strokeWidth={lerp(2.2, 2.8, k)} strokeLinecap="round">
            {ICONS.x.map((d) => <path key={d} d={d} />)}
          </svg>
        </Obj>
      ))}
      <Obj id="slot" style={{position: "absolute", left: 120 + 3 * 86, top: 92, width: 64, height: 64, borderRadius: 32, border: "5px dashed var(--vt-muted)", boxSizing: "border-box"}} />
      <Obj id="ok" style={{position: "absolute", left: 120 + 3 * 86, top: 92, width: 64, height: 64}}>
        <svg viewBox="0 0 24 24" width={64} height={64} fill="none" stroke="var(--vt-good)" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
          {ICONS.check.map((d) => <path key={d} d={d} />)}
        </svg>
      </Obj>
    </>
  );
}

// ---------------------------------------------------------------------------------------------------- flight 4

function Words({id, children, size, color = "var(--vt-text)", weight = 700}: {id: string; children: React.ReactNode; size: number; color?: string; weight?: number}) {
  return <Obj id={id} style={{position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", fontFamily: SANS, fontSize: size, fontWeight: weight, letterSpacing: -3, color, textShadow: SHADOW, lineHeight: 1.08}}>{children}</Obj>;
}

function Stamp() {
  return (
    <div style={{position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center"}}>
      <div style={{fontFamily: MONO, fontSize: 150, fontWeight: 700, letterSpacing: 24, color: "var(--vt-good)", border: "12px solid var(--vt-good)", borderRadius: 28, padding: "6px 56px 6px 80px", background: "rgba(8,11,18,0.7)"}}>ORBIT</div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------- after

/** A growing figure, huge, set straight on the photograph */
function Figure({id, digits, to, unit, color}: {id: string; digits: number; to: number; unit: string; color: string}) {
  const v = useProp(id, "v", 0);
  return (
    <div style={{position: "absolute", inset: 0, display: "flex", alignItems: "baseline", gap: 40}}>
      <div style={{fontFamily: SANS, fontSize: 340, fontWeight: 700, letterSpacing: -12, color, textShadow: SHADOW, lineHeight: "380px", minWidth: digits > 0 ? 560 : 380}}>{digits > 0 ? (v * to).toFixed(digits) : Math.round(v * to)}</div>
      <div style={{fontFamily: SANS, fontSize: 88, fontWeight: 700, color: "var(--vt-text)", textShadow: SHADOW, whiteSpace: "nowrap"}}>{unit}</div>
    </div>
  );
}

const ROUTE = [
  {id: "f1", icon: "rocket", color: "var(--vt-grad)", name: "Falcon 1"},
  {id: "f9", icon: "rocket", color: "var(--vt-data)", name: "Falcon 9"},
  {id: "dr", icon: "box", color: "var(--vt-op)", name: "Dragon"},
  {id: "st", icon: "satellite", color: "var(--vt-good)", name: "Station, 2012"},
] as const;
const ROUTE_X = (i: number) => 260 + i * 480;

function Route() {
  const seg = (i: number) => useProp(`seg-${i}`, "draw", 0);
  return (
    <>
      <svg width={1920} height={520} style={{position: "absolute", left: 0, top: 0}}>
        {[1, 2, 3].map((i) => <Segment key={i} i={i} draw={seg(i)} />)}
      </svg>
      {ROUTE.map((r, i) => (
        <Obj key={r.id} id={`node-${r.id}`} style={{position: "absolute", left: ROUTE_X(i) - 200, top: 0, width: 400, height: 380}}>
          <div style={{position: "absolute", left: 100, top: 25, width: 200, height: 200, borderRadius: 100, background: "rgba(8,11,18,0.82)", border: `7px solid ${r.color}`, boxSizing: "border-box", boxShadow: `0 0 50px color-mix(in srgb, ${r.color} 55%, transparent)`}} />
          <Icon name={r.icon} left={140} top={65} size={120} color={r.color} stroke={3} />
          <div style={{position: "absolute", left: -30, top: 250, width: 460, textAlign: "center", fontFamily: SANS, fontSize: 58, fontWeight: 700, color: "var(--vt-text)", textShadow: SHADOW, whiteSpace: "nowrap"}}>{r.name}</div>
        </Obj>
      ))}
    </>
  );
}

function Segment({i, draw}: {i: number; draw: number}) {
  const x0 = ROUTE_X(i - 1) + 120, x1 = ROUTE_X(i) - 120, y = 125, len = x1 - x0;
  return (
    <Obj as="g" id={`seg-${i}`}>
      <line x1={x0} y1={y} x2={x1 - 14} y2={y} stroke="var(--vt-text)" strokeWidth={8} strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - draw)} />
      <polygon points={`${x1},${y} ${x1 - 36},${y - 22} ${x1 - 36},${y + 22}`} fill="var(--vt-text)" opacity={clamp01((draw - 0.9) / 0.1)} />
    </Obj>
  );
}

// ---------------------------------------------------------------------------------------------------- why

/** A strike through "a Musk biography" that moves down to underline the team: one rule, tweened (l, t, len in px; c: red to brand) */
function Contrast() {
  const l = useProp("rule", "l", 395), t = useProp("rule", "t", 114), len = useProp("rule", "len", 0), c = useProp("rule", "c", 0);
  const text = {position: "absolute" as const, left: 0, width: 1920, textAlign: "center" as const, fontFamily: SANS, fontWeight: 700, whiteSpace: "nowrap" as const};
  return (
    <>
      <Obj id="bio" style={{...text, top: 40, fontSize: 150, letterSpacing: -4, lineHeight: "160px", color: "var(--vt-muted)"}}>a Musk biography</Obj>
      <Obj id="team" style={{...text, top: 250, fontSize: 112, letterSpacing: -3, lineHeight: "130px", color: "var(--vt-text)"}}>a small team learning by failing</Obj>
      <Obj id="rule" style={{position: "absolute", left: l, top: t, width: len, height: 14, borderRadius: 7, background: `color-mix(in srgb, var(--vt-bad) ${Math.round(100 - c * 100)}%, var(--vt-grad))`, boxShadow: c > 0.5 ? GLOW : "none"}} />
    </>
  );
}

function Today() {
  const line = {fontFamily: SANS, fontSize: 150, fontWeight: 700, letterSpacing: -4, lineHeight: 1.15, whiteSpace: "nowrap" as const, textAlign: "center" as const};
  return (
    <div style={{position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center"}}>
      <Obj id="today-a" style={{...line, color: "var(--vt-text)"}}>How SpaceX works today</Obj>
      <Obj id="today-b" style={{...line, color: "var(--vt-grad)", textShadow: GLOW}}>started here.</Obj>
    </div>
  );
}

function Closing() {
  const small = {fontFamily: SANS, fontSize: 30, color: "var(--vt-muted)", textAlign: "center" as const};
  return (
    <div style={{position: "absolute", inset: 0}}>
      <div style={{position: "absolute", left: 0, top: 0, width: 1920, textAlign: "center", fontFamily: SANS, fontSize: 320, fontWeight: 700, letterSpacing: -10, lineHeight: "340px", color: "var(--vt-text)", whiteSpace: "nowrap"}}>
        <Obj id="c-title" style={{display: "inline-block"}}>Lift<span style={{color: "var(--vt-grad)", textShadow: GLOW}}>off</span></Obj>
      </div>
      <div style={{position: "absolute", left: 0, top: 350, width: 1920, display: "flex", justifyContent: "center", gap: 36, fontSize: 76}}>
        <Obj id="c-author" style={{fontFamily: SANS, letterSpacing: 6, color: "var(--vt-text)"}}>Eric Berger</Obj>
        <Obj id="c-year" style={{fontFamily: MONO, color: "var(--vt-grad)"}}>· 2021</Obj>
      </div>
      <Obj id="c-note" style={{position: "absolute", left: 0, top: 500, width: 1920, display: "flex", flexDirection: "column", gap: 8}}>
        <div style={small}>Summary written from public reviews and descriptions; no text from the book is reproduced.</div>
        <div style={small}>Photos: Steve Jurvetson (CC BY 2.0), SpaceX, DARPA, U.S. Army SMDC, NASA · Clip: NASA/Chris Chamberland · creativecommons.org/licenses/by/2.0</div>
      </Obj>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------- document

export default <Doc
  id="liftoff" poster={114.4}
  title="Liftoff, by Eric Berger: a book explainer"
  lang="en"
  sources={[
    {id: "pw", url: "https://www.publishersweekly.com/9780062979971", title: "Publishers Weekly review"},
    {id: "apple", url: "https://books.apple.com/au/book/liftoff/id1526796614", title: "Apple Books listing"},
    {id: "space", url: "https://www.space.com/liftoff-spacex-early-days-book-eric-berger", title: "Space.com review"},
    {id: "wiki", url: "https://en.wikipedia.org/wiki/Falcon_1", title: "Falcon 1 (Wikipedia)"},
    {id: "hist", url: "https://en.wikipedia.org/wiki/History_of_SpaceX", title: "History of SpaceX (Wikipedia)"},
    {id: "spacex", url: "https://en.wikipedia.org/wiki/SpaceX", title: "SpaceX (Wikipedia)"},
    {id: "sfn", url: "https://spaceflightnow.com/news/n0812/23crsawards/", title: "Spaceflight Now: CRS awards"},
    {id: "nasa", url: "https://images.nasa.gov/details/KSC-20200608-MH-Demo-2_4K_Video_Release-3251785", title: "NASA Demo-2 video"}
  ]}
  generator="visotalk skill"
  theme="visotalk/dark"
  voice="am_michael"
  canvas="16x9"
  exports={{variants: [{preset: "16x9"}], fps: 30, captions: "burned"}}
>
  <Asset
    id="demo2"
    kind="video"
    src="media/demo2_rise.mp4"
    license={{id: "PD-USGov", attribution: "NASA/Chris Chamberland", obligations: []}}
    source="https://images.nasa.gov/details/KSC-20200608-MH-Demo-2_4K_Video_Release-3251785"
  />
  <Asset
    id="score"
    kind="audio"
    src="audio/score.mp3"
    license={{id: "user-owned", obligations: []}}
  />
  <Asset
    id="f4"
    kind="image"
    src="media/f4_launch.jpg"
    license={{id: "CC0-1.0", attribution: "SpaceX", obligations: []}}
    source="https://commons.wikimedia.org/wiki/File:Falcon_1_Flight_4_launch.jpg"
  />
  <Asset
    id="prelaunch"
    kind="image"
    src="media/prelaunch_2005.jpg"
    license={{id: "CC-BY-2.0", attribution: "Steve Jurvetson", url: "https://creativecommons.org/licenses/by/2.0/", obligations: ["attribution"]}}
    source="https://commons.wikimedia.org/wiki/File:Falcon_1_Prelaunch_(67235805).jpg"
  />
  <Asset
    id="darpa"
    kind="image"
    src="media/darpa_falcon.jpg"
    license={{id: "PD-USGov", attribution: "DARPA", obligations: []}}
    source="https://commons.wikimedia.org/wiki/File:Falcon_Small_Launch_Vehicle_(SpaceX's_Falcon_I)_to_be_launched_from_Kwajalein_Atoll,_Marshall_Islands.tiff"
  />
  <Asset
    id="omelek"
    kind="image"
    src="media/omelek.jpg"
    license={{id: "PD-USGov", attribution: "U.S. Army SMDC", obligations: []}}
    source="https://commons.wikimedia.org/wiki/File:Omelek_Island.jpg"
  />
  <Asset
    id="adastra"
    kind="image"
    src="media/ad_astra_2008.jpg"
    license={{id: "CC-BY-2.0", attribution: "Steve Jurvetson", url: "https://creativecommons.org/licenses/by/2.0/", obligations: ["attribution"]}}
    source="https://commons.wikimedia.org/wiki/File:SpaceX_–_Ad_Astra!_(2725865469).jpg"
  />
  <Asset
    id="iss"
    kind="image"
    src="media/iss_dragon.jpg"
    license={{id: "PD-USGov", attribution: "NASA (ISS033-E-011151)", obligations: []}}
    source="https://images.nasa.gov/details/iss033e011151"
  />

  {/* the stars behind every scene that is not a photograph, and the tally: three crosses that outlive the failures scene and become a check in the fourth launch */}
  <Part id="stars" z={0} x={0} y={0} w={1920} h={1080}><Stars /></Part>
  <Part id="tally" z={5} x={0} y={0} w={1920} h={880}><Tally /></Part>

  <Scene id="hook">
    <Line id="h1" text="On May 30, 2020, a SpaceX rocket carried two NASA astronauts toward orbit.">On May thirtieth, twenty twenty, a SpaceX rocket carried two NASA astronauts toward orbit.</Line>
    <Line id="h2">It was the first time a private company had launched people into orbit.</Line>
    <Line id="h3">Eric Berger's book Liftoff goes back to the years when that company was fighting to survive.</Line>
    <Sound asset="score" at="start" volume={-7} duck={5} fadeIn={0.3} />
    <Part id="clip" z={1}><Clip /></Part>
    <Part id="lt" z={2} x={110} y={640} w={1300} h={270}><LowerThird /></Part>
    <Part id="first" z={2} x={110} y={90} w={1700} h={300}><FirstPrivate /></Part>
    <Part id="title" z={2} x={0} y={100} w={1920} h={720}><Title /></Part>
    <Animation>
      <Appear on="stars" at="start" dur={0} />
      <Appear on="clip" at="start" dur={0} />
      <Tween on="clip" dim={0.1} at="start" dur={0.1} />
      <Appear on="lt" line="h1" word="May" />
      <Appear on="lt-small" line="h1" word="May" />
      <Appear on="lt-big" line="h1" word="May" dur={0.7} />
      <Tween on="lt-rule" w={420} line="h1" word="May" offset={0.4} dur={1.6} easing="easeOut" />
      <Appear on="lt-rule" line="h1" word="May" offset={0.4} dur={0.2} />
      <Appear on="first" line="h2" />
      <Appear on="first-a" line="h2" word="private" />
      <Appear on="first-b" line="h2" word="launched" />
      <Disappear on={["lt", "first"]} line="h3" dur={0.5} />
      <Tween on="clip" dim={0.55} line="h3" dur={1.2} />
      <Appear on="title" line="h3" />
      <Set on="byline" y={30} at="start" />
      <Appear on="eyebrow" line="h3" word="book" />
      <Appear on="name-a" line="h3" word="Liftoff" dur={0.6} />
      <Appear on="name-b" line="h3" word="Liftoff" offset={0.5} dur={0.6} />
      <Appear on="byline" line="h3" word="Berger's" />
      <Tween on="byline" y={0} line="h3" word="Berger's" dur={0.8} easing="easeOut" />
    </Animation>
  </Scene>

  <Scene id="book">
    <Line id="b1" text="Published in 2021, Liftoff follows SpaceX from its founding in 2002, through the first four launches of its first rocket, Falcon 1.">Published in twenty twenty one, Liftoff follows SpaceX from its founding in two thousand two, through the first four launches of its first rocket, Falcon One.</Line>
    <Line id="b2">Berger, a space reporter, built it from interviews with the engineers, technicians, and executives who were there.</Line>
    <Part id="axis" x={0} y={30} w={1920} h={520}><Axis /></Part>
    <Part id="people" x={0} y={525} w={1920} h={380}><People /></Part>
    <Animation>
      <Appear on="axis" at="start" />
      <Tween on="axis-line" draw={1} line="b1" word="Published" dur={1.4} />
      <Appear on={["dot-2021", "n-2021", "lab-2021"]} line="b1" word="twenty twenty one" />
      <Appear on={["dot-2002", "n-2002", "lab-2002"]} line="b1" word="founding" />
      <Appear on="span" line="b1" word="first four launches" dur={0.1} />
      <Tween on="span" grow={1} line="b1" word="first four launches" dur={1.4} easing="easeOut" />
      <Appear on="lab-span" line="b1" word="Falcon One" />
      <Appear on="people" line="b2" />
      <Appear on="eng" line="b2" word="engineers" />
      <Appear on="tech" line="b2" word="technicians" />
      <Appear on="exec" line="b2" word="executives" />
    </Animation>
  </Scene>

  <Scene id="odds">
    <Line id="o1">The odds were absurd.</Line>
    <Line id="o2">Boeing and Lockheed Martin each had tens of thousands of employees, and tens of billions of dollars in yearly revenue.</Line>
    <Line id="o3" text="SpaceX had fewer than 200 people, and by 2008, money for only one more rocket.">SpaceX had fewer than two hundred people, and by two thousand eight, money for only one more rocket.</Line>
    <Part id="t-odds" x={90} y={20} w={1000} h={130}><Heading>The odds</Heading></Part>
    <Part id="field" x={90} y={160} w={1050} h={504}><DotField /></Part>
    <Part id="odds-labels" x={90} y={686} w={1200} h={210}><OddsLabels /></Part>
    <Part id="lens" x={1320} y={120} w={520} h={700}><Lens /></Part>
    <Animation>
      <Appear on="field" at="start" dur={0} />
      <Appear on="t-odds" line="o1" word="odds" />
      <Appear on="odds-labels" line="o2" word="Boeing" />
      <Appear on="lab-name" line="o2" word="Boeing" />
      <Tween on="dots" show={1} line="o2" word="tens of thousands" dur={2.2} easing="easeOut" />
      <Appear on="lab-people" line="o2" word="tens of thousands" offset={0.6} />
      <Disappear on="lab-people" line="o2" word="tens of billions" dur={0.3} />
      <Tween on="dots" money={1} line="o2" word="tens of billions" dur={1.4} />
      <Appear on="lab-money" line="o2" word="tens of billions" offset={0.7} />
      <Appear on="lens" line="o3" word="fewer than two hundred" />
      <Appear on="lens-a" line="o3" word="fewer than two hundred" />
      <Disappear on="lens-a" line="o3" word="money" dur={0.3} />
      <Appear on="lens-b" line="o3" word="money" offset={0.35} />
    </Animation>
  </Scene>

  <Scene id="island">
    <Line id="i1">To launch, the team went to Omelek, a tiny island in Kwajalein Atoll, in the Marshall Islands, in the middle of the Pacific.</Line>
    <Line id="i2">Much of the book is set there: engineers racing deadlines, in heat and salt, cut off from everything.</Line>
    <Part id="rings" z={3} x={0} y={0} w={1920} h={880}><Rings /></Part>
    <Part id="omelek" z={2} x={720} y={280} w={480} h={480}><Photo asset="omelek" radius={240} /></Part>
    <Part id="pad" z={1} x={0} y={0} w={1920} h={1080}><Photo asset="prelaunch" side="left" /></Part>
    <Part id="life" z={3} x={120} y={170} w={1100} h={700}><Life /></Part>
    <Animation>
      <Appear on="rings" at="start" />
      <Appear on="omelek" line="i1" word="Omelek" />
      <Set on="omelek" px={47} py={56} at="start" />
      <Tween on="omelek" zoom={1.15} line="i1" word="Omelek" dur={9} easing="linear" />
      <Appear on="dot-om" line="i1" word="tiny" />
      <Appear on={["ring-atoll", "lab-atoll"]} line="i1" word="island" offset={0.6} />
      <Tween on="ring-atoll" draw={1} line="i1" word="island" offset={0.6} dur={0.9} />
      <Appear on={["ring-marshall", "lab-marshall"]} line="i1" word="Marshall" />
      <Tween on="ring-marshall" draw={1} line="i1" word="Marshall" dur={0.9} />
      <Appear on={["ring-pacific", "lab-pacific"]} line="i1" word="Pacific" />
      <Tween on="ring-pacific" draw={1} line="i1" word="Pacific" dur={1.1} />
      <Disappear on={["omelek", "rings"]} line="i2" dur={0.4} />
      <Appear on="pad" line="i2" offset={0.3} />
      <Set on="pad" py={90} line="i2" />
      <Tween on="pad" zoom={1.12} py={25} line="i2" offset={0.3} dur={9} easing="linear" />
      <Appear on="life" line="i2" />
      <Appear on="life-deadlines" line="i2" word="deadlines" />
      <Appear on="life-heat" line="i2" word="heat" />
      <Appear on="life-salt" line="i2" word="salt" />
      <Appear on="life-cut" line="i2" word="cut off" />
    </Animation>
  </Scene>

  <Scene id="failures">
    <Line id="f1" text="On the first flight, in March 2006, a fuel leak started a fire, and the rocket was lost.">On the first flight, in March two thousand six, a fuel leak started a fire, and the rocket was lost.</Line>
    <Line id="f2" text="On the second flight, in March 2007, the rocket reached space, about 289 kilometers up, but a control problem cut the second stage short.">On the second flight, in March two thousand seven, the rocket reached space, about two hundred eighty nine kilometers up, but a control problem cut the second stage short.</Line>
    <Line id="f3" text="On the third flight, in August 2008, the first stage bumped into the second after separation.">On the third flight, in August two thousand eight, the first stage bumped into the second after separation.</Line>
    <Line id="f0">Three launches, three failures.</Line>
    <Part id="photo-1" z={1}><Photo asset="prelaunch" side="right" /></Part>
    <Part id="photo-2" z={1}><Photo asset="darpa" side="right" /></Part>
    <Part id="photo-3" z={1}><Photo asset="adastra" side="right" /></Part>
    <Part id="ftitle" z={2} x={100} y={470} w={900} h={430}><FlightTitle /></Part>
    <Part id="chart" z={2} x={1000} y={140} w={840} h={720}><Chart /></Part>
    <Animation>
      <Appear on="chart" at="start" />
      <Appear on="orbit" at="start" />
      <Tween on="orbit" draw={1} at="start" dur={0.1} />
      <Appear on="orbit-lab" line="f1" word="March" />

      <Set on="photo-1" py={72} at="start" />
      <Appear on="photo-1" line="f1" word="first" />
      <Tween on="photo-1" zoom={1.14} py={30} line="f1" word="first" dur={9} easing="linear" />
      <Appear on="ftitle" line="f1" word="first" />
      <Appear on="ft-1" line="f1" word="March" />
      <Appear on="path-1" line="f1" word="fuel" dur={0.2} />
      <Tween on="path-1" draw={1} line="f1" word="fuel" dur={1.2} easing="easeIn" />
      <Appear on="x-1" line="f1" word="fire" dur={0.2} />

      <Disappear on={["photo-1", "ft-1"]} line="f2" dur={0.3} />
      <Tween on="path-1" dim={1} line="f2" dur={0.6} />
      <Set on="photo-2" py={30} at="start" />
      <Appear on="photo-2" line="f2" word="second flight" />
      <Tween on="photo-2" zoom={1.14} py={62} line="f2" word="second flight" dur={9} easing="linear" />
      <Appear on="ft-2" line="f2" word="March" />
      <Appear on="path-2" line="f2" word="reached" dur={0.2} />
      <Tween on="path-2" draw={1} line="f2" word="reached" dur={3.4} easing="easeInOut" />
      <Appear on="km" line="f2" word="kilometers" />
      <Appear on="x-2" line="f2" word="short" dur={0.2} />

      <Disappear on={["photo-2", "ft-2", "km"]} line="f3" dur={0.3} />
      <Tween on="path-2" dim={1} line="f3" dur={0.6} />
      <Set on="photo-3" py={90} at="start" />
      <Appear on="photo-3" line="f3" word="third" />
      <Tween on="photo-3" zoom={1.14} py={72} line="f3" word="third" dur={9} easing="linear" />
      <Appear on="ft-3" line="f3" word="August" />
      <Appear on="path-3" line="f3" word="first stage" dur={0.2} />
      <Tween on="path-3" draw={1} line="f3" word="first stage" dur={2.4} easing="easeInOut" />
      <Appear on="bump" line="f3" word="bumped" />
      <Appear on="x-3" line="f3" word="after separation" dur={0.2} />

      <Disappear on={["photo-3", "ft-3", "chart", "bump"]} line="f0" dur={0.4} />
      <Appear on="tally" line="f0" offset={0.4} />
      <Appear on="cross-1" line="f0" word="Three launches" />
      <Appear on="cross-2" line="f0" word="launches" />
      <Appear on="cross-3" line="f0" word="three failures" />
    </Animation>
  </Scene>

  <Scene id="flight4">
    <Line id="g1" text="According to Musk, the fourth Falcon 1 was the last rocket they could pay for.">According to Musk, the fourth Falcon One was the last rocket they could pay for.</Line>
    <Line id="g2" hold={1.8} text="On September 28, 2008, it reached orbit.">On September twenty eighth, two thousand eight, it reached orbit.</Line>
    <Line id="g3">It was the first privately developed, liquid-fueled rocket to reach orbit.</Line>
    <Part id="launch" z={1}><Photo asset="f4" /></Part>
    <Part id="date" z={2} x={0} y={330} w={1920} h={240}><Words id="date-text" size={170}>September 28, 2008</Words></Part>
    <Part id="orbit" z={2} x={360} y={590} w={1200} h={240}><Stamp /></Part>
    <Part id="first-rocket" z={2} x={160} y={300} w={1600} h={380}><Words id="first-text" size={112}>First privately developed, liquid-fueled rocket in orbit</Words></Part>
    <Animation>
      <Set on="launch" dim={0.3} at="start" />
      <Set on="orbit" rotate={-5} scale={1.5} at="start" />
      <Appear on="launch" line="g1" word="fourth" />
      <Tween on="launch" zoom={1.25} py={35} at="start" dur={20} easing="linear" />
      <Tween on="tally" k={1} line="g1" word="fourth" dur={0.9} />
      <Appear on="slot" line="g1" word="last" />
      <Appear on="date" line="g2" word="September" />
      <Disappear on="slot" line="g2" word="orbit" dur={0.5} />
      <Appear on="ok" line="g2" word="orbit" dur={0.5} />
      <Appear on="orbit" line="g2" word="orbit" dur={0.3} />
      <Tween on="orbit" scale={1} line="g2" word="orbit" dur={0.4} />
      <Disappear on={["date", "orbit"]} line="g3" dur={0.4} />
      <Appear on="first-rocket" line="g3" word="first" />
    </Animation>
  </Scene>

  <Scene id="after">
    <Line id="a1">Three months later, NASA awarded SpaceX a contract worth up to one point six billion dollars, for twelve cargo flights to the space station.</Line>
    <Line id="a2" text="It opened the way from Falcon 1 to Falcon 9 and Dragon, which first reached the station in 2012.">It opened the way from Falcon One to Falcon Nine and Dragon, which first reached the station in twenty twelve.</Line>
    <Part id="iss" z={1}><Photo asset="iss" side="left" /></Part>
    <Part id="money" z={2} x={120} y={110} w={1500} h={400}><Figure id="money" digits={1} to={1.6} unit="billion dollars" color="var(--vt-grad)" /></Part>
    <Part id="flights" z={2} x={120} y={500} w={1500} h={400}><Figure id="flights" digits={0} to={12} unit="cargo flights" color="var(--vt-data)" /></Part>
    <Part id="route" z={2} x={0} y={250} w={1920} h={520}><Route /></Part>
    <Animation>
      <Disappear on="tally" at="start" dur={0.4} />
      <Set on="iss" dim={0.15} at="start" />
      <Appear on="iss" at="start" />
      <Tween on="iss" zoom={1.14} px={42} at="start" dur={20} easing="linear" />
      <Appear on="money" line="a1" word="one point six" />
      <Tween on="money" v={1} line="a1" word="one point six" dur={1.6} />
      <Appear on="flights" line="a1" word="twelve" />
      <Tween on="flights" v={1} line="a1" word="twelve" dur={1.4} />
      <Disappear on={["money", "flights"]} line="a2" dur={0.4} />
      <Tween on="iss" dim={0.72} line="a2" dur={1} />
      <Appear on="route" line="a2" offset={0.2} />
      <Appear on="node-f1" line="a2" word="Falcon One" />
      <Tween on="seg-1" draw={1} line="a2" word="Falcon One" offset={0.6} dur={0.7} />
      <Appear on="node-f9" line="a2" word="Falcon Nine" />
      <Tween on="seg-2" draw={1} line="a2" word="Falcon Nine" offset={0.6} dur={0.7} />
      <Appear on="node-dr" line="a2" word="Dragon" />
      <Tween on="seg-3" draw={1} line="a2" word="Dragon" offset={0.6} dur={0.7} />
      <Appear on="node-st" line="a2" word="twenty twelve" />
    </Animation>
  </Scene>

  <Scene id="why">
    <Line id="w1">Liftoff is less a Musk biography than a portrait of a small team that learned by failing, quickly and cheaply.</Line>
    <Line id="w2">How SpaceX works today started here.</Line>
    <Part id="contrast" x={0} y={200} w={1920} h={560}><Contrast /></Part>
    <Part id="today" x={0} y={200} w={1920} h={560}><Today /></Part>
    <Animation>
      <Appear on="contrast" at="start" />
      <Appear on="bio" line="w1" word="Musk" />
      <Tween on="rule" len={1230} line="w1" word="than" dur={0.5} />
      <Disappear on="bio" line="w1" word="portrait" dur={0.3} />
      <Tween on="rule" l={240} t={400} len={1440} c={1} line="w1" word="portrait" dur={0.7} />
      <Appear on="team" line="w1" word="small" />
      <Disappear on="contrast" line="w2" dur={0.4} />
      <Appear on="today" line="w2" />
      <Appear on="today-a" line="w2" word="SpaceX" />
      <Appear on="today-b" line="w2" word="started" />
    </Animation>
  </Scene>

  <Scene id="credits">
    <Line id="c1" hold={4} text="Liftoff, by Eric Berger, published in 2021.">Liftoff, by Eric Berger, published in twenty twenty one.</Line>
    <Part id="closing" x={0} y={180} w={1920} h={660}><Closing /></Part>
    <Animation>
      <Appear on="closing" at="start" />
      <Appear on="c-title" line="c1" word="Liftoff" />
      <Appear on="c-author" line="c1" word="Eric Berger" />
      <Appear on="c-year" line="c1" word="twenty twenty one" />
      <Appear on="c-note" line="c1" word="twenty twenty one" offset={1} />
    </Animation>
  </Scene>
</Doc>;
