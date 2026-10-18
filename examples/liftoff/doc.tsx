import {Doc, Asset, Scene, Line, Part, Animation, Appear, Disappear, Tween, Set} from '@visotalk/jsx';
import {Obj, Video, useAsset, useProp} from '@visotalk/runtime';

/**
 * "Liftoff", a book explainer built on real material: a NASA clip, public-domain and CC BY photographs (see the assets).
 * The Demo-2 launch plays under the opening lines and the title is laid on it; the book's span is a to-scale axis of years; the odds are
 * bars whose lengths carry the gap; Omelek is a photograph and then a zoom-out of rings; one schematic rocket and one marker tell where
 * each Falcon 1 flight went wrong; the three crosses are a global part (the tally) that is carried into the fourth launch and becomes a check;
 * the contract is two growing figures, then a route. The summary is written from public reviews and descriptions.
 * Scenes end with their parts, so a picture that goes on (the photo, the rocket) is one component, declared in each scene that needs it.
 */

// ---------------------------------------------------------------------------------------------------- helpers

const SANS = "var(--vt-sans)", MONO = "var(--vt-mono)";
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const SHADOW = "0 2px 28px rgba(0,0,0,0.85)";

/** The Lucide icons the video uses (ISC), as svg paths on a 24 x 24 grid */
const ICONS = {
  user: ["M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2", "M8 7a4 4 0 1 0 8 0a4 4 0 1 0 -8 0"],
  clock: ["M2 12a10 10 0 1 0 20 0a10 10 0 1 0 -20 0", "M12 6v6l4 2"],
  sun: ["M8 12a4 4 0 1 0 8 0a4 4 0 1 0 -8 0", "M12 2v2", "M12 20v2", "m4.93 4.93 1.41 1.41", "m17.66 17.66 1.41 1.41", "M2 12h2", "M20 12h2", "m6.34 17.66-1.41 1.41", "m19.07 4.93-1.41 1.41"],
  droplet: ["M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"],
  cutoff: ["M4.9 19.1C1 15.2 1 8.8 4.9 4.9", "M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5", "M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5", "M19.1 4.9C23 8.8 23 15.1 19.1 19", "M10 12a2 2 0 1 0 4 0a2 2 0 1 0 -4 0", "M3 3l18 18"],
  x: ["M18 6 6 18", "m6 6 12 12"],
  check: ["M2 12a10 10 0 1 0 20 0a10 10 0 1 0 -20 0", "m9 12 2 2 4-4"],
  flame: ["M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"],
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

/** A photograph filling its part, with a slow move (zoom, px, py are tweened by the document) and an optional dimming */
function Photo({asset, radius = 28}: {asset: string; radius?: number}) {
  const url = useAsset(asset);
  const zoom = useProp("zoom", 1), px = useProp("px", 50), py = useProp("py", 50), dim = useProp("dim", 0);
  return (
    <div style={{position: "absolute", inset: 0, overflow: "hidden", borderRadius: radius}}>
      <img src={url} alt="" style={{width: "100%", height: "100%", objectFit: "cover", objectPosition: `${px}% ${py}%`, transform: `scale(${zoom})`, transformOrigin: `${px}% ${py}%`}} />
      <div style={{position: "absolute", inset: 0, background: `rgba(4,6,12,${dim})`}} />
    </div>
  );
}

function Heading({children}: {children: string}) {
  return <div style={{fontFamily: SANS, fontSize: 72, fontWeight: 700, color: "var(--vt-text)", lineHeight: "90px", whiteSpace: "nowrap"}}>{children}</div>;
}

// ---------------------------------------------------------------------------------------------------- hook

/** The real launch; its dimming grows when the title is laid on it */
function Clip() {
  const dim = useProp("dim", 0.12);
  return (
    <div style={{position: "absolute", inset: 0, background: "#000"}}>
      <Video asset="demo2" in={0} rate={0.6} fit="cover" />
      <div style={{position: "absolute", inset: 0, background: `rgba(4,6,12,${dim})`}} />
    </div>
  );
}

function LowerThird() {
  return (
    <div style={{position: "absolute", inset: 0, display: "flex", alignItems: "center", gap: 28, padding: "0 36px", background: "rgba(8,11,18,0.78)", borderRadius: 24, borderLeft: "10px solid var(--vt-grad)", boxSizing: "border-box"}}>
      <div>
        <div style={{fontFamily: SANS, fontSize: 80, fontWeight: 700, color: "var(--vt-text)", lineHeight: 1.1, whiteSpace: "nowrap"}}>May 30, 2020</div>
        <div style={{fontFamily: SANS, fontSize: 38, color: "var(--vt-muted)", whiteSpace: "nowrap"}}>Crew Dragon Demo-2 · Kennedy Space Center</div>
      </div>
    </div>
  );
}

function FirstPrivate() {
  const line = {fontFamily: SANS, fontSize: 96, fontWeight: 700, color: "var(--vt-text)", textShadow: SHADOW, whiteSpace: "nowrap" as const, lineHeight: 1.15};
  return (
    <>
      <Obj id="first-a" style={line}>First private company</Obj>
      <Obj id="first-b" style={{...line, color: "var(--vt-grad)"}}>to launch people into orbit</Obj>
    </>
  );
}

function Title() {
  return (
    <div style={{position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12}}>
      <Obj id="eyebrow" style={{fontFamily: MONO, fontSize: 44, letterSpacing: 8, textTransform: "uppercase", color: "var(--vt-text)", textShadow: SHADOW}}>a book explainer</Obj>
      <Obj id="name" style={{fontFamily: SANS, fontSize: 290, fontWeight: 700, lineHeight: 1.05, color: "var(--vt-text)", textShadow: SHADOW, whiteSpace: "nowrap"}}>
        Lift<span style={{color: "var(--vt-grad)"}}>off</span>
      </Obj>
      <Obj id="byline" style={{fontFamily: SANS, fontSize: 76, color: "var(--vt-text)", textShadow: SHADOW}}>Eric Berger</Obj>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------- book

/** The to-scale axis: 2002 to 2021 on 1360 px, a tick for every year, the first four launches as a bar that grows along it */
const AX = {x0: 280, x1: 1640, y: 170, from: 2002, to: 2021, launches: 2008.75};
const axisX = (year: number) => lerp(AX.x0, AX.x1, (year - AX.from) / (AX.to - AX.from));

function Axis() {
  const draw = useProp("axis-line", "draw", 0), grow = useProp("span", "grow", 0);
  const len = AX.x1 - AX.x0, years = AX.to - AX.from;
  const label = {position: "absolute" as const, fontFamily: SANS, fontWeight: 700, whiteSpace: "nowrap" as const, height: 60, lineHeight: "60px"};
  return (
    <>
      <svg width={1920} height={360} style={{position: "absolute", left: 0, top: 0}}>
        <Obj as="g" id="axis-line">
          <line x1={AX.x0} y1={AX.y} x2={AX.x1} y2={AX.y} stroke="var(--vt-faint)" strokeWidth={8} strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - draw)} />
          {Array.from({length: years + 1}, (_, i) => (
            <line key={i} x1={axisX(AX.from + i)} x2={axisX(AX.from + i)} y1={AX.y - 12} y2={AX.y + 12} stroke="var(--vt-faint)" strokeWidth={3} opacity={clamp01(draw * (years + 1) - i)} />
          ))}
        </Obj>
        <Obj as="g" id="dot-2002"><circle cx={AX.x0} cy={AX.y} r={24} fill="var(--vt-grad)" /></Obj>
        <Obj as="g" id="dot-2021"><circle cx={AX.x1} cy={AX.y} r={24} fill="var(--vt-data)" /></Obj>
      </svg>
      <Obj id="lab-2002" style={{...label, left: 0, top: 70, width: 2 * AX.x0, textAlign: "center", fontSize: 44, color: "var(--vt-text)"}}>SpaceX founded, 2002</Obj>
      <Obj id="lab-2021" style={{...label, left: 1300, top: 70, width: 580, textAlign: "right", fontSize: 44, color: "var(--vt-data)"}}>Liftoff published, 2021</Obj>
      <Obj id="span" style={{position: "absolute", left: AX.x0, top: AX.y - 20, width: Math.max(2, grow * (axisX(AX.launches) - AX.x0)), height: 40, borderRadius: 20, background: "var(--vt-grad)"}} />
      <Obj id="lab-span" style={{...label, left: AX.x0 - 40, top: 240, fontSize: 44, color: "var(--vt-grad)"}}>Falcon 1: the first four launches</Obj>
    </>
  );
}

const PEOPLE = [
  {id: "eng", word: "engineers", color: "var(--vt-data)", cx: 480},
  {id: "tech", word: "technicians", color: "var(--vt-good)", cx: 960},
  {id: "exec", word: "executives", color: "var(--vt-warn)", cx: 1440},
];

function People() {
  return (
    <>
      {PEOPLE.map((p) => (
        <Obj key={p.id} id={p.id} style={{position: "absolute", left: p.cx - 260, top: 0, width: 520, height: 320}}>
          <Icon name="user" left={165} top={0} size={190} color={p.color} stroke={6} />
          <div style={{position: "absolute", left: 0, top: 215, width: 520, textAlign: "center", fontFamily: SANS, fontSize: 60, fontWeight: 700, color: p.color}}>{p.word}</div>
        </Obj>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------------------------------- odds

const BAR = {x: 160, w: 1600, h: 110, sliver: 28};

function Bar({id, top, color, grow, sliver}: {id: string; top: number; color: string; grow: number; sliver?: boolean}) {
  const w = Math.max(2, grow * (sliver ? BAR.sliver : BAR.w));
  return <Obj id={id} style={{position: "absolute", left: BAR.x, top, width: w, height: BAR.h, borderRadius: sliver ? 6 : 8, background: color}} />;
}

function BarLabel({id, top, left = BAR.x, size, color, children}: {id: string; top: number; left?: number; size: number; color: string; children: string}) {
  return <Obj id={id} style={{position: "absolute", left, top, height: BAR.h, lineHeight: `${BAR.h}px`, fontFamily: SANS, fontSize: size, fontWeight: 700, color, whiteSpace: "nowrap"}}>{children}</Obj>;
}

function Odds() {
  const name = {position: "absolute" as const, left: BAR.x, height: 52, lineHeight: "52px", fontFamily: SANS, fontSize: 40, fontWeight: 700, color: "var(--vt-muted)", whiteSpace: "nowrap" as const};
  const g = (id: string) => useProp(id, "grow", 0);
  return (
    <>
      <Obj id="lab-p-name" style={{...name, top: 58}}>Boeing and Lockheed Martin, each</Obj>
      <Bar id="bar-p-big" top={114} color="var(--vt-muted)" grow={g("bar-p-big")} />
      <BarLabel id="lab-p-big" top={114} left={BAR.x + 36} size={52} color="var(--vt-bg)">tens of thousands of employees</BarLabel>
      <Bar id="bar-p-sx" top={240} color="var(--vt-grad)" grow={g("bar-p-sx")} sliver />
      <BarLabel id="lab-p-sx" top={240} left={BAR.x + BAR.sliver + 28} size={48} color="var(--vt-grad)">SpaceX: fewer than 200 people</BarLabel>
      <Obj id="lab-m-name" style={{...name, top: 396}}>Boeing and Lockheed Martin, each year</Obj>
      <Bar id="bar-m-big" top={452} color="var(--vt-muted)" grow={g("bar-m-big")} />
      <BarLabel id="lab-m-big" top={452} left={BAR.x + 36} size={52} color="var(--vt-bg)">tens of billions of dollars in revenue</BarLabel>
      <Bar id="bar-m-sx" top={578} color="var(--vt-grad)" grow={g("bar-m-sx")} sliver />
      <BarLabel id="lab-m-sx" top={578} left={BAR.x + BAR.sliver + 28} size={48} color="var(--vt-grad)">SpaceX: money for one more rocket</BarLabel>
    </>
  );
}

// ---------------------------------------------------------------------------------------------------- island

/** Rings around one point; each grows from the point outward to its radius */
const RINGS = [
  {id: "atoll", r: 96, color: "var(--vt-data)", text: "Kwajalein Atoll"},
  {id: "marshall", r: 210, color: "var(--vt-op)", text: "Marshall Islands"},
  {id: "pacific", r: 330, color: "var(--vt-muted)", text: "Pacific Ocean"},
];
const CENTER = {x: 440, y: 400};

function Rings() {
  return (
    <>
      <svg width={880} height={780} style={{position: "absolute", left: 0, top: 0}}>
        {RINGS.map((ring) => <RingCircle key={ring.id} {...ring} />)}
        <Obj as="g" id="dot-om"><circle cx={CENTER.x} cy={CENTER.y} r={16} fill="var(--vt-grad)" /></Obj>
      </svg>
      {RINGS.map((ring) => (
        <Obj key={ring.id} id={`lab-${ring.id}`} style={{position: "absolute", left: CENTER.x - 200, top: CENTER.y - ring.r - 50, width: 400, height: 44, textAlign: "center", lineHeight: "44px", fontFamily: SANS, fontSize: 36, fontWeight: 700, color: ring.color, whiteSpace: "nowrap"}}>{ring.text}</Obj>
      ))}
    </>
  );
}

function RingCircle({id, r, color}: {id: string; r: number; color: string}) {
  const grow = useProp(`ring-${id}`, "grow", 0);
  return <Obj as="circle" id={`ring-${id}`} cx={CENTER.x} cy={CENTER.y} r={Math.max(1, r * grow)} fill="none" stroke={color} strokeWidth={5} />;
}

const LIFE = [
  {id: "deadlines", icon: "clock", color: "var(--vt-warn)", word: "deadlines"},
  {id: "heat", icon: "sun", color: "var(--vt-bad)", word: "heat"},
  {id: "salt", icon: "droplet", color: "var(--vt-data)", word: "salt"},
  {id: "cut", icon: "cutoff", color: "var(--vt-muted)", word: "cut off"},
] as const;

function Life() {
  return (
    <>
      {LIFE.map((l, i) => (
        <Obj key={l.id} id={`life-${l.id}`} style={{position: "absolute", left: 0, top: i * 165, width: 830, height: 130}}>
          <Icon name={l.icon} left={0} top={15} size={100} color={l.color} stroke={3} />
          <div style={{position: "absolute", left: 140, top: 0, height: 130, lineHeight: "130px", fontFamily: SANS, fontSize: 84, fontWeight: 700, color: l.color, whiteSpace: "nowrap"}}>{l.word}</div>
        </Obj>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------------------------------- failures

const FLIGHTS = [
  {n: 1, date: "Mar 2006", cx: 240},
  {n: 2, date: "Mar 2007", cx: 860},
  {n: 3, date: "Aug 2008", cx: 1480},
];

/** Flights 1 to 3 on a track that is drawn as far as the flight being told */
function Track() {
  const draw = useProp("track", "draw", 0);
  const x0 = FLIGHTS[0].cx, x1 = FLIGHTS[2].cx, len = x1 - x0;
  return (
    <>
      <svg width={1720} height={140} style={{position: "absolute", left: 0, top: 0}}>
        <line x1={x0} y1={36} x2={x1} y2={36} stroke="var(--vt-faint)" strokeWidth={6} strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - draw)} />
      </svg>
      {FLIGHTS.map((f) => (
        <Obj key={f.n} id={`flight-${f.n}`} style={{position: "absolute", left: f.cx - 200, top: 0, width: 400, height: 140}}>
          <div style={{position: "absolute", left: 164, top: 0, width: 72, height: 72, borderRadius: 36, background: "var(--vt-bg)", border: "6px solid var(--vt-bad)", boxSizing: "border-box", textAlign: "center", lineHeight: "60px", fontFamily: MONO, fontSize: 38, fontWeight: 700, color: "var(--vt-text)"}}>{f.n}</div>
          <div style={{position: "absolute", left: 0, top: 78, width: 400, textAlign: "center", fontFamily: SANS, fontSize: 40, fontWeight: 700, color: "var(--vt-text)", whiteSpace: "nowrap"}}>Flight {f.n} · <span style={{fontFamily: MONO, fontWeight: 400, color: "var(--vt-muted)"}}>{f.date}</span></div>
        </Obj>
      ))}
    </>
  );
}

/** One schematic rocket (box coordinates, axis at x = 300) and one marker that moves to where the flight went wrong */
const RK = {cx: 300};
const MARK = {engine: 500, stage2: 175, joint: 257};

function Rocket() {
  const py = useProp("mk", "py", MARK.engine);
  const fill = "var(--vt-panel2)", line = {stroke: "var(--vt-text)", strokeWidth: 4};
  return (
    <>
      <svg width={820} height={640} style={{position: "absolute", left: 0, top: 0}}>
        <path d="M 250 100 C 250 60 285 25 300 0 C 315 25 350 60 350 100 Z" fill={fill} {...line} strokeLinejoin="round" />
        <rect x={250} y={100} width={100} height={150} fill={fill} {...line} />
        <rect x={250} y={264} width={100} height={240} fill={fill} {...line} />
        <rect x={270} y={504} width={60} height={26} fill="var(--vt-faint)" {...line} strokeWidth={3} />
      </svg>
      <Icon id="fire" name="flame" left={260} top={540} size={80} color="var(--vt-warn)" stroke={2} />
      <Obj id="mk" style={{position: "absolute", left: RK.cx - 48, top: py - 48, width: 96, height: 96, borderRadius: 48, border: "8px solid var(--vt-bad)", boxSizing: "border-box"}} />
      <Obj id="km" style={{position: "absolute", left: 400, top: 40, fontFamily: SANS, fontSize: 56, fontWeight: 700, color: "var(--vt-data)", whiteSpace: "nowrap"}}>289 km up</Obj>
    </>
  );
}

/** The three crosses, the tally. Global: it is carried from the failures into the fourth launch (k: 0 large in the middle, 1 small in the corner) */
function Tally() {
  const k = useProp("k", 0);
  const size = lerp(230, 64, k), top = lerp(330, 92, k);
  const left = (i: number) => lerp(560 + i * 400 - size / 2, 120 + i * 86, k);
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
  return <Obj id={id} style={{position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", fontFamily: SANS, fontSize: size, fontWeight: weight, color, textShadow: SHADOW, lineHeight: 1.12}}>{children}</Obj>;
}

function Stamp() {
  return (
    <div style={{position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center"}}>
      <div style={{fontFamily: MONO, fontSize: 120, fontWeight: 700, letterSpacing: 14, color: "var(--vt-good)", border: "10px solid var(--vt-good)", borderRadius: 24, padding: "4px 44px", background: "rgba(8,11,18,0.7)"}}>ORBIT</div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------- after

/** A growing figure on a dark panel */
function Figure({id, digits, to, unit, color}: {id: string; digits: number; to: number; unit: string; color: string}) {
  const v = useProp(id, "v", 0);
  return (
    <div style={{position: "absolute", inset: 0, display: "flex", alignItems: "baseline", gap: 36, padding: "0 56px", background: "rgba(8,11,18,0.8)", border: "2px solid var(--vt-faint)", borderRadius: 32, boxSizing: "border-box"}}>
      <div style={{fontFamily: SANS, fontSize: 170, fontWeight: 700, color, lineHeight: "230px", minWidth: digits > 0 ? 250 : 190}}>{digits > 0 ? (v * to).toFixed(digits) : Math.round(v * to)}</div>
      <div style={{fontFamily: SANS, fontSize: 64, fontWeight: 700, color: "var(--vt-text)", whiteSpace: "nowrap"}}>{unit}</div>
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
          <div style={{position: "absolute", left: 115, top: 40, width: 170, height: 170, borderRadius: 85, background: "var(--vt-panel)", border: `6px solid ${r.color}`, boxSizing: "border-box"}} />
          <Icon name={r.icon} left={150} top={75} size={100} color={r.color} stroke={3} />
          <div style={{position: "absolute", left: 0, top: 240, width: 400, textAlign: "center", fontFamily: SANS, fontSize: 52, fontWeight: 700, color: "var(--vt-text)", textShadow: SHADOW, whiteSpace: "nowrap"}}>{r.name}</div>
        </Obj>
      ))}
    </>
  );
}

function Segment({i, draw}: {i: number; draw: number}) {
  const x0 = ROUTE_X(i - 1) + 120, x1 = ROUTE_X(i) - 120, y = 125, len = x1 - x0;
  return (
    <Obj as="g" id={`seg-${i}`}>
      <line x1={x0} y1={y} x2={x1 - 14} y2={y} stroke="var(--vt-text)" strokeWidth={6} strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - draw)} />
      <polygon points={`${x1},${y} ${x1 - 34},${y - 20} ${x1 - 34},${y + 20}`} fill="var(--vt-text)" opacity={clamp01((draw - 0.9) / 0.1)} />
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
      <Obj id="bio" style={{...text, top: 40, fontSize: 130, lineHeight: "160px", color: "var(--vt-muted)"}}>a Musk biography</Obj>
      <Obj id="team" style={{...text, top: 250, fontSize: 96, lineHeight: "130px", color: "var(--vt-text)"}}>a small team learning by failing</Obj>
      <Obj id="rule" style={{position: "absolute", left: l, top: t, width: len, height: 12, borderRadius: 6, background: `color-mix(in srgb, var(--vt-bad) ${Math.round(100 - c * 100)}%, var(--vt-grad))`}} />
    </>
  );
}

function Today() {
  const line = {fontFamily: SANS, fontSize: 124, fontWeight: 700, lineHeight: 1.2, whiteSpace: "nowrap" as const, textAlign: "center" as const};
  return (
    <div style={{position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center"}}>
      <Obj id="today-a" style={{...line, color: "var(--vt-text)"}}>How SpaceX works today</Obj>
      <Obj id="today-b" style={{...line, color: "var(--vt-grad)"}}>started here.</Obj>
    </div>
  );
}

function Closing() {
  const small = {fontFamily: SANS, fontSize: 30, color: "var(--vt-muted)", textAlign: "center" as const};
  return (
    <div style={{position: "absolute", inset: 0}}>
      <div style={{position: "absolute", left: 0, top: 0, width: 1920, textAlign: "center", fontFamily: SANS, fontSize: 250, fontWeight: 700, lineHeight: "280px", color: "var(--vt-text)", whiteSpace: "nowrap"}}>
        <Obj id="c-title" style={{display: "inline-block"}}>Lift<span style={{color: "var(--vt-grad)"}}>off</span></Obj>
      </div>
      <div style={{position: "absolute", left: 0, top: 300, width: 1920, display: "flex", justifyContent: "center", gap: 36, fontSize: 80}}>
        <Obj id="c-author" style={{fontFamily: SANS, color: "var(--vt-text)"}}>Eric Berger</Obj>
        <Obj id="c-year" style={{fontFamily: MONO, color: "var(--vt-grad)"}}>· 2021</Obj>
      </div>
      <Obj id="c-note" style={{position: "absolute", left: 0, top: 470, width: 1920, display: "flex", flexDirection: "column", gap: 8}}>
        <div style={small}>Summary written from public reviews and descriptions; no text from the book is reproduced.</div>
        <div style={small}>Photos: Steve Jurvetson (CC BY 2.0), SpaceX, DARPA, U.S. Army SMDC, NASA · Clip: NASA/Chris Chamberland · creativecommons.org/licenses/by/2.0</div>
      </Obj>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------- document

export default <Doc
  id="liftoff"
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
    src="media/demo2_clip.mp4"
    license={{id: "PD-USGov", attribution: "NASA/Chris Chamberland", obligations: []}}
    source="https://images.nasa.gov/details/KSC-20200608-MH-Demo-2_4K_Video_Release-3251785"
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

  {/* the tally: three crosses that outlive the failures scene and become a check in the fourth launch */}
  <Part id="tally" z={5} x={0} y={0} w={1920} h={880}><Tally /></Part>

  <Scene id="hook">
    <Line id="h1" text="On May 30, 2020, a SpaceX rocket carried two NASA astronauts toward orbit.">On May thirtieth, twenty twenty, a SpaceX rocket carried two NASA astronauts toward orbit.</Line>
    <Line id="h2">It was the first time a private company had launched people into orbit.</Line>
    <Line id="h3">Eric Berger's book Liftoff goes back to the years when that company was fighting to survive.</Line>
    <Part id="clip"><Clip /></Part>
    <Part id="lt" x={96} y={680} w={900} h={170}><LowerThird /></Part>
    <Part id="first" x={96} y={90} w={1500} h={300}><FirstPrivate /></Part>
    <Part id="title" x={0} y={130} w={1920} h={640}><Title /></Part>
    <Animation>
      <Appear on={["clip", "first"]} at="start" />
      <Appear on="lt" line="h1" word="May" />
      <Appear on="first-a" line="h2" word="private" />
      <Appear on="first-b" line="h2" word="launched" />
      <Disappear on={["lt", "first"]} line="h3" dur={0.5} />
      <Tween on="clip" dim={0.62} line="h3" dur={1.2} />
      <Appear on="title" line="h3" />
      <Appear on="byline" line="h3" word="Berger's" />
      <Appear on="eyebrow" line="h3" word="book" />
      <Appear on="name" line="h3" word="Liftoff" />
    </Animation>
  </Scene>

  <Scene id="book">
    <Line id="b1" text="Published in 2021, Liftoff follows SpaceX from its founding in 2002, through the first four launches of its first rocket, Falcon 1.">Published in twenty twenty one, Liftoff follows SpaceX from its founding in two thousand two, through the first four launches of its first rocket, Falcon One.</Line>
    <Line id="b2">Berger, a space reporter, built it from interviews with the engineers, technicians, and executives who were there.</Line>
    <Part id="axis" x={0} y={140} w={1920} h={360}><Axis /></Part>
    <Part id="people" x={0} y={540} w={1920} h={330}><People /></Part>
    <Animation>
      <Appear on="axis" at="start" />
      <Tween on="axis-line" draw={1} line="b1" word="Published" dur={1.4} />
      <Appear on={["dot-2021", "lab-2021"]} line="b1" word="twenty twenty one" />
      <Appear on={["dot-2002", "lab-2002"]} line="b1" word="founding" />
      <Tween on="span" grow={1} line="b1" word="first four launches" dur={1.2} />
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
    <Part id="t-odds" x={160} y={50} w={1600} h={100}><Heading>The odds</Heading></Part>
    <Part id="bars" x={0} y={170} w={1920} h={700}><Odds /></Part>
    <Animation>
      <Appear on="bars" at="start" />
      <Appear on="t-odds" line="o1" word="odds" />
      <Appear on="lab-p-name" line="o2" word="Boeing" />
      <Appear on="bar-p-big" line="o2" word="tens of thousands" />
      <Tween on="bar-p-big" grow={1} line="o2" word="tens of thousands" dur={1.2} />
      <Appear on="lab-p-big" line="o2" word="tens of thousands" offset={1.0} />
      <Appear on="lab-m-name" line="o2" word="tens of billions" offset={-0.6} />
      <Appear on="bar-m-big" line="o2" word="tens of billions" />
      <Tween on="bar-m-big" grow={1} line="o2" word="tens of billions" dur={1.2} />
      <Appear on="lab-m-big" line="o2" word="tens of billions" offset={1.0} />
      <Appear on={["bar-p-sx", "lab-p-sx"]} line="o3" word="fewer than two hundred" />
      <Tween on="bar-p-sx" grow={1} line="o3" word="fewer than two hundred" dur={0.5} />
      <Appear on={["bar-m-sx", "lab-m-sx"]} line="o3" word="money" />
      <Tween on="bar-m-sx" grow={1} line="o3" word="money" dur={0.5} />
    </Animation>
  </Scene>

  <Scene id="island">
    <Line id="i1">To launch, the team went to Omelek, a tiny island in Kwajalein Atoll, in the Marshall Islands, in the middle of the Pacific.</Line>
    <Line id="i2">Much of the book is set there: engineers racing deadlines, in heat and salt, cut off from everything.</Line>
    <Part id="omelek" x={80} y={120} w={860} h={730}><Photo asset="omelek" /></Part>
    <Part id="rings" x={980} y={100} w={880} h={780}><Rings /></Part>
    <Part id="pad" x={80} y={120} w={860} h={730}><Photo asset="prelaunch" /></Part>
    <Part id="life" x={1010} y={170} w={830} h={650}><Life /></Part>
    <Animation>
      <Appear on="rings" at="start" />
      <Appear on="omelek" line="i1" word="Omelek" />
      <Tween on="omelek" zoom={1.18} px={42} py={58} line="i1" word="Omelek" dur={9} easing="linear" />
      <Appear on="dot-om" line="i1" word="tiny" />
      <Appear on={["ring-atoll", "lab-atoll"]} line="i1" word="island" offset={0.6} />
      <Tween on="ring-atoll" grow={1} line="i1" word="island" offset={0.6} dur={0.9} />
      <Appear on={["ring-marshall", "lab-marshall"]} line="i1" word="Marshall" />
      <Tween on="ring-marshall" grow={1} line="i1" word="Marshall" dur={0.9} />
      <Appear on={["ring-pacific", "lab-pacific"]} line="i1" word="Pacific" />
      <Tween on="ring-pacific" grow={1} line="i1" word="Pacific" dur={1.1} />
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
    <Part id="track" x={100} y={100} w={1720} h={140}><Track /></Part>
    <Part id="photo-1" x={100} y={270} w={800} h={590}><Photo asset="prelaunch" /></Part>
    <Part id="photo-2" x={100} y={270} w={800} h={590}><Photo asset="darpa" /></Part>
    <Part id="photo-3" x={100} y={270} w={800} h={590}><Photo asset="adastra" /></Part>
    <Part id="rocket" x={1000} y={240} w={820} h={640}><Rocket /></Part>
    <Animation>
      <Appear on="track" at="start" />
      <Appear on="flight-1" line="f1" word="two thousand six" />
      <Appear on="photo-1" line="f1" word="March" />
      <Tween on="photo-1" zoom={1.14} py={30} line="f1" word="March" dur={9} easing="linear" />
      <Set on="photo-1" py={72} at="start" />
      <Appear on="rocket" line="f1" word="fuel" />
      <Appear on="mk" line="f1" word="leak" />
      <Appear on="fire" line="f1" word="fire" />

      <Disappear on={["photo-1", "fire"]} line="f2" dur={0.3} />
      <Tween on="track" draw={0.5} line="f2" dur={0.8} />
      <Appear on="flight-2" line="f2" word="two thousand seven" />
      <Appear on="photo-2" line="f2" word="March" />
      <Tween on="photo-2" zoom={1.14} py={62} line="f2" word="March" dur={9} easing="linear" />
      <Set on="photo-2" py={30} at="start" />
      <Appear on="km" line="f2" word="space" />
      <Tween on="mk" py={175} line="f2" word="control problem" dur={0.8} />

      <Disappear on={["photo-2", "km"]} line="f3" dur={0.3} />
      <Tween on="track" draw={1} line="f3" dur={0.8} />
      <Appear on="flight-3" line="f3" word="two thousand eight" />
      <Appear on="photo-3" line="f3" word="August" />
      <Tween on="photo-3" zoom={1.14} py={72} line="f3" word="August" dur={9} easing="linear" />
      <Set on="photo-3" py={90} at="start" />
      <Tween on="mk" py={257} line="f3" word="bumped" dur={0.8} />

      <Disappear on={["photo-3", "rocket", "track"]} line="f0" dur={0.4} />
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
    <Part id="launch" z={1}><Photo asset="f4" radius={0} /></Part>
    <Part id="date" z={2} x={0} y={330} w={1920} h={200}><Words id="date-text" size={140}>September 28, 2008</Words></Part>
    <Part id="orbit" z={2} x={460} y={560} w={1000} h={200}><Stamp /></Part>
    <Part id="first-rocket" z={2} x={160} y={330} w={1600} h={300}><Words id="first-text" size={84}>First privately developed, liquid-fueled rocket in orbit</Words></Part>
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
    <Part id="iss"><Photo asset="iss" radius={0} /></Part>
    <Part id="money" x={120} y={190} w={1100} h={250}><Figure id="money" digits={1} to={1.6} unit="billion dollars" color="var(--vt-grad)" /></Part>
    <Part id="flights" x={120} y={480} w={1100} h={250}><Figure id="flights" digits={0} to={12} unit="cargo flights" color="var(--vt-data)" /></Part>
    <Part id="route" x={0} y={250} w={1920} h={520}><Route /></Part>
    <Animation>
      <Disappear on="tally" at="start" dur={0.4} />
      <Set on="iss" dim={0.5} at="start" />
      <Appear on="iss" at="start" />
      <Tween on="iss" zoom={1.14} px={42} at="start" dur={20} easing="linear" />
      <Appear on="money" line="a1" word="one point six" />
      <Tween on="money" v={1} line="a1" word="one point six" dur={1.4} />
      <Appear on="flights" line="a1" word="twelve" />
      <Tween on="flights" v={1} line="a1" word="twelve" dur={1.2} />
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
      <Tween on="rule" len={1130} line="w1" word="than" dur={0.5} />
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
    <Part id="closing" x={0} y={180} w={1920} h={600}><Closing /></Part>
    <Animation>
      <Appear on="closing" at="start" />
      <Appear on="c-title" line="c1" word="Liftoff" />
      <Appear on="c-author" line="c1" word="Eric Berger" />
      <Appear on="c-year" line="c1" word="twenty twenty one" />
      <Appear on="c-note" line="c1" word="twenty twenty one" offset={1} />
    </Animation>
  </Scene>
</Doc>;
