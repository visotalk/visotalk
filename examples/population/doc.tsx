import {Doc, Scene, Line, Part, Animation, Appear, Disappear, Tween} from "@visotalk/jsx";
import {Obj, useProp} from "@visotalk/runtime";

// ---------------------------------------------------------------------------------------------------- data
// The whole video is drawn from this table: the rows of the wait chart, their bar widths, the beads on the growth curve.

interface Milestone {n: number; year: number; date: string; projected?: boolean}
const MILESTONES: Milestone[] = [
  {n: 1, year: 1804, date: "1804"},
  {n: 2, year: 1927, date: "1927"},
  {n: 3, year: 1960, date: "1960"},
  {n: 4, year: 1974, date: "1974"},
  {n: 5, year: 1987, date: "1987"},
  {n: 6, year: 1999, date: "1999"},
  {n: 7, year: 2011, date: "2011"},
  {n: 8, year: 2022, date: "Nov 2022"},
  {n: 9, year: 2037, date: "2037 UN", projected: true},
];
const ORDINALS = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th"];
/** Years it took to add billion n: the distance to the previous milestone */
const gapOf = (n: number) => (n < 2 ? 0 : MILESTONES[n - 1].year - MILESTONES[n - 2].year);

// UN projection after the ninth billion, in billions of people (UN World Population Prospects, 2024)
const PROJECTION = [{year: 2050, n: 9.7}, {year: 2084, n: 10.3}, {year: 2100, n: 10.2}];
const PEAK = PROJECTION[1];
const CURVE = [{year: 1800, n: 0.98}, ...MILESTONES.map((m) => ({year: m.year, n: m.n})), ...PROJECTION];

// ---------------------------------------------------------------------------------------------------- helpers

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** The Lucide icons the video uses (ISC), as svg paths on a 24 x 24 grid */
const ICONS = {
  timer: ["M10 2L14 2", "M12 14L15 11", "M4 14a8 8 0 1 0 16 0a8 8 0 1 0 -16 0"],
  user: ["M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2", "M8 7a4 4 0 1 0 8 0a4 4 0 1 0 -8 0"],
  "heart-pulse": ["M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5", "M3.22 13H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"],
  repeat: ["m17 2 4 4-4 4", "M3 11v-1a4 4 0 0 1 4-4h14", "m7 22-4-4 4-4", "M21 13v1a4 4 0 0 1-4 4H3"],
  rabbit: ["M13 16a3 3 0 0 1 2.24 5", "M18 12h.01", "M18 21h-8a4 4 0 0 1-4-4 7 7 0 0 1 7-7h.2L9.6 6.4a1 1 0 1 1 2.8-2.8L15.8 7h.2c3.3 0 6 2.7 6 6v1a2 2 0 0 1-2 2h-1a3 3 0 0 0-3 3", "M20 8.54V4a2 2 0 1 0-4 0v3", "M7.612 12.524a3 3 0 1 0-1.6 4.3"],
  turtle: ["m12 10 2 4v3a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-3a8 8 0 1 0-16 0v3a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-3l2-4h4Z", "M4.82 7.9 8 10", "M15.18 7.9 12 10", "M16.93 10H20a2 2 0 0 1 0 4H2"],
};

/** An icon that is a target: a square at (left, top), `stroke` in px of the final drawing */
function Icon({id, name, left, top, size, color, stroke = 3}: {id: string; name: keyof typeof ICONS; left: number; top: number; size: number; color: string; stroke?: number}) {
  return (
    <Obj id={id} style={{position: "absolute", left, top, width: size, height: size}}>
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={(stroke * 24) / size} strokeLinecap="round" strokeLinejoin="round">
        {ICONS[name].map((d) => <path key={d} d={d} />)}
      </svg>
    </Obj>
  );
}

/** The two barbs of an arrow head at `to`, for a line coming from `from` */
function head(from: {x: number; y: number}, to: {x: number; y: number}, size: number) {
  const a = Math.atan2(to.y - from.y, to.x - from.x);
  const p = (d: number) => `${to.x - size * Math.cos(a + d)},${to.y - size * Math.sin(a + d)}`;
  return `${to.x},${to.y} ${p(0.45)} ${p(-0.45)}`;
}

/** A smooth curve through the points that never overshoots between them (monotone cubic, Fritsch and Carlson), as an svg path */
function smoothPath(pts: Array<[number, number]>): string {
  const k = pts.length - 1;
  const dx = pts.slice(1).map((p, i) => p[0] - pts[i][0]);
  const s = pts.slice(1).map((p, i) => (p[1] - pts[i][1]) / dx[i]);
  const t = pts.map((_, i) => (i === 0 ? s[0] : i === k ? s[k - 1] : s[i - 1] * s[i] <= 0 ? 0 : (s[i - 1] + s[i]) / 2));
  for (let i = 0; i < k; i++) {
    if (s[i] === 0) { t[i] = t[i + 1] = 0; continue; }
    const a = t[i] / s[i], b = t[i + 1] / s[i], r = a * a + b * b;
    if (r > 9) { t[i] = (3 / Math.sqrt(r)) * a * s[i]; t[i + 1] = (3 / Math.sqrt(r)) * b * s[i]; }
  }
  return pts.slice(1).reduce((d, p, i) => `${d} C ${pts[i][0] + dx[i] / 3} ${pts[i][1] + (t[i] * dx[i]) / 3} ${p[0] - dx[i] / 3} ${p[1] - (t[i + 1] * dx[i]) / 3} ${p[0]} ${p[1]}`, `M ${pts[0][0]} ${pts[0][1]}`);
}

const SANS = "var(--vt-sans)", MONO = "var(--vt-mono)";

function Title({children}: {children: string}) {
  return <div style={{fontFamily: SANS, fontSize: 72, fontWeight: 700, color: "var(--vt-text)", lineHeight: "90px", whiteSpace: "nowrap"}}>{children}</div>;
}

// ---------------------------------------------------------------------------------------------------- intro

const GAUGE = {size: 720, r: 310, stroke: 14};

function Gauge() {
  const {size, r, stroke} = GAUGE, c = size / 2, circ = 2 * Math.PI * r;
  const draw = useProp("ring", "draw", 0);
  return (
    <>
      <svg width={size} height={size} style={{position: "absolute", left: 0, top: 0}}>
        <circle cx={c} cy={c} r={r} fill="none" stroke="var(--vt-border)" strokeWidth={stroke} />
        <Obj as="circle" id="ring" cx={c} cy={c} r={r} fill="none" stroke="var(--vt-grad)" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - draw)} transform={`rotate(-90 ${c} ${c})`} />
        {MILESTONES.filter((m) => !m.projected).map((m) => {
          const a = ((m.n - 1) / 8) * 2 * Math.PI - Math.PI / 2;
          return (
            <Obj as="g" key={m.n} id={`bead${m.n}`}>
              <circle cx={c + r * Math.cos(a)} cy={c + r * Math.sin(a)} r={28} fill="var(--vt-bg)" stroke="var(--vt-data)" strokeWidth={4} />
              <text x={c + r * Math.cos(a)} y={c + r * Math.sin(a) + 10} textAnchor="middle" fontFamily={MONO} fontSize={30} fontWeight={700} fill="var(--vt-text)">{m.n}</text>
            </Obj>
          );
        })}
      </svg>
      <Icon id="watch" name="timer" left={c - 120} top={c - 120} size={240} color="var(--vt-data)" stroke={9} />
    </>
  );
}

function Amount() {
  return (
    <>
      <Obj id="big" style={{position: "absolute", left: 0, top: 20, fontFamily: SANS, fontSize: 220, fontWeight: 700, color: "var(--vt-text)", whiteSpace: "nowrap", lineHeight: 1.1}}>1 billion</Obj>
      <Obj id="bigsub" style={{position: "absolute", left: 8, top: 290, fontFamily: MONO, fontSize: 60, color: "var(--vt-muted)", whiteSpace: "nowrap"}}>how many years each?</Obj>
    </>
  );
}

// ---------------------------------------------------------------------------------------------------- waits

// One row per billion: bars start at the same edge and run for as many years as the wait took (the first one is "all of history", drawn
// longer than any wait and fading in from nothing). Every element is a target named by its row (ord2, bar2, gap2, date2); the animation
// only says `grow` 0 to 1, and the width comes from the table.
const WAIT = {pxPerYear: 9, barX: 170, rowH: 80, barH: 56, firstYears: 140, dateX: 1560};
const rowColor = (n: number) => `color-mix(in srgb, var(--vt-data) ${Math.round(100 - ((n - 2) / 6) * 100)}%, var(--vt-grad))`;

function WaitRow({m}: {m: Milestone}) {
  const {pxPerYear, barX, rowH, barH, firstYears, dateX} = WAIT;
  const years = m.n === 1 ? firstYears : gapOf(m.n);
  const w = Math.max(2, useProp(`bar${m.n}`, "grow", 0) * years * pxPerYear);
  const top = (m.n - 1) * rowH;
  const text = {position: "absolute" as const, top, height: rowH, lineHeight: `${rowH}px`, whiteSpace: "nowrap" as const};
  const fill = m.n === 1 ? "linear-gradient(90deg, transparent, var(--vt-faint))" : m.projected ? "transparent" : rowColor(m.n);
  return (
    <>
      <Obj id={`ord${m.n}`} style={{...text, left: 0, width: 130, textAlign: "right", fontFamily: MONO, fontSize: 38, color: "var(--vt-muted)"}}>{ORDINALS[m.n - 1]}</Obj>
      <Obj id={`bar${m.n}`} style={{position: "absolute", left: barX, top: top + (rowH - barH) / 2, width: w, height: barH, borderRadius: 10, background: fill, overflow: "hidden", whiteSpace: "nowrap",
        boxSizing: "border-box", lineHeight: `${barH}px`, paddingLeft: 24, fontFamily: SANS, fontSize: 34, color: "var(--vt-text)",
        ...(m.projected && {border: "4px dashed var(--vt-warn)"})}}>{m.n === 1 && w > 260 && "all of history"}</Obj>
      {m.n > 1 && <Obj id={`gap${m.n}`} style={{...text, left: barX + w + 20, fontFamily: SANS, fontSize: 42, color: "var(--vt-text)"}}>{gapOf(m.n)} years</Obj>}
      <Obj id={`date${m.n}`} style={{...text, left: dateX, width: 200, textAlign: "right", fontFamily: MONO, fontSize: 38, color: m.projected ? "var(--vt-warn)" : "var(--vt-grad)"}}>{m.date}</Obj>
    </>
  );
}

// in the coordinates of the chart part
const TREND = {from: {x: 1420, y: 190}, to: {x: 930, y: 540}};

function Callout() {
  const {from, to} = TREND, len = Math.hypot(to.x - from.x, to.y - from.y);
  const draw = useProp("trend", "draw", 0);
  return (
    <>
      <svg width={1760} height={720} style={{position: "absolute", left: 0, top: 0}}>
        <Obj as="g" id="trend">
          <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="var(--vt-grad)" strokeWidth={7} strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - draw)} />
          <polygon points={head(from, to, 34)} fill="var(--vt-grad)" opacity={clamp01((draw - 0.9) / 0.1)} />
        </Obj>
      </svg>
      <Obj id="decade" style={{position: "absolute", left: 560, top: 562, fontFamily: SANS, fontSize: 60, fontWeight: 700, color: "var(--vt-grad)", whiteSpace: "nowrap"}}>about a decade</Obj>
      <Icon id="rabbit" name="rabbit" left={560} top={280} size={160} color="var(--vt-warn)" stroke={5} />
      <Icon id="again" name="repeat" left={740} top={280} size={160} color="var(--vt-warn)" stroke={5} />
    </>
  );
}

function WaitChart() {
  return (
    <>
      {MILESTONES.map((m) => <WaitRow key={m.n} m={m} />)}
      <Callout />
    </>
  );
}

// ---------------------------------------------------------------------------------------------------- peak

// The growth curve is the milestone table again: year on x, billions on y, a bead on every billion. The curve is revealed left to right
// by a clip: `a` runs the reveal up to the ninth billion, `b` on to the end of the projection.
const G = {left: 150, right: 1580, top: 90, bottom: 680, year0: 1800, year1: 2100, max: 11};
const yearToX = (year: number) => G.left + ((year - G.year0) / (G.year1 - G.year0)) * (G.right - G.left);
const billionsToY = (n: number) => G.bottom - (n / G.max) * (G.bottom - G.top);
const CURVE_PATH = smoothPath(CURVE.map((p) => [yearToX(p.year), billionsToY(p.n)]));
const YEAR_TICKS = [1800, 1900, 2000, 2100];
const BILLION_TICKS = [2, 4, 6, 8, 10];
const AXIS_END = {x: G.right + 50, y: G.top - 30};

function Growth() {
  const draw = useProp("axes", "draw", 0);
  const a = useProp("curve", "a", 0), b = useProp("curve", "b", 0);
  const reveal = yearToX(G.year0) + a * (yearToX(MILESTONES[8].year) - yearToX(G.year0)) + b * (yearToX(G.year1) - yearToX(MILESTONES[8].year));
  const xLen = AXIS_END.x - G.left, yLen = G.bottom - AXIS_END.y;
  const axis = {stroke: "var(--vt-muted)", strokeWidth: 5, strokeLinecap: "round" as const};
  const label = {fontFamily: MONO, fontSize: 30, fill: "var(--vt-muted)"};
  const px = (m: Milestone) => yearToX(m.year), py = (m: Milestone) => billionsToY(m.n);
  return (
    <svg width={1760} height={740} style={{position: "absolute", left: 0, top: 0}}>
      <defs><clipPath id="growth-reveal"><rect x={0} y={0} width={reveal} height={740} /></clipPath></defs>
      <Obj as="g" id="axes">
        <line x1={G.left} y1={G.bottom} x2={AXIS_END.x} y2={G.bottom} strokeDasharray={xLen} strokeDashoffset={xLen * (1 - draw)} {...axis} />
        <line x1={G.left} y1={G.bottom} x2={G.left} y2={AXIS_END.y} strokeDasharray={yLen} strokeDashoffset={yLen * (1 - draw)} {...axis} />
        <g opacity={clamp01((draw - 0.9) / 0.1)} fill="var(--vt-muted)">
          <polygon points={head({x: G.left, y: G.bottom}, {x: AXIS_END.x + 12, y: G.bottom}, 24)} />
          <polygon points={head({x: G.left, y: G.bottom}, {x: G.left, y: AXIS_END.y - 12}, 24)} />
        </g>
        <text x={AXIS_END.x + 36} y={G.bottom + 10} {...label}>time</text>
        <text x={G.left + 30} y={AXIS_END.y + 10} {...label}>people, in billions</text>
      </Obj>
      <Obj as="g" id="grid">
          <rect x={yearToX(2022)} y={AXIS_END.y} width={b * (G.right - yearToX(2022))} height={G.bottom - AXIS_END.y} fill="color-mix(in srgb, var(--vt-warn) 9%, transparent)" />
          <text x={yearToX(2022) + 20} y={G.bottom - 24} fontFamily={MONO} fontSize={32} fill="var(--vt-warn)" opacity={b}>UN projection</text>
          {BILLION_TICKS.map((n) => (
            <g key={n}>
              <line x1={G.left} x2={G.right} y1={billionsToY(n)} y2={billionsToY(n)} stroke="var(--vt-border)" strokeWidth={2} />
              <text x={G.left - 18} y={billionsToY(n) + 10} textAnchor="end" {...label}>{n}</text>
            </g>
          ))}
          {YEAR_TICKS.map((y) => (
            <g key={y}>
              <line x1={yearToX(y)} x2={yearToX(y)} y1={G.bottom} y2={G.bottom + 12} stroke="var(--vt-muted)" strokeWidth={3} />
              <text x={yearToX(y)} y={G.bottom + 48} textAnchor="middle" {...label}>{y}</text>
            </g>
          ))}
      </Obj>
      <Obj as="g" id="curve">
            <g clipPath="url(#growth-reveal)">
              <path d={CURVE_PATH} fill="none" stroke="var(--vt-data)" strokeWidth={10} strokeLinecap="round" />
            </g>
            {MILESTONES.map((m) => (
              <g key={m.n} opacity={clamp01((reveal - px(m)) / 14)}>
                <circle cx={px(m)} cy={py(m)} r={22} fill="var(--vt-bg)" stroke={m.projected ? "var(--vt-warn)" : "var(--vt-data)"} strokeWidth={4} strokeDasharray={m.projected ? "7 6" : undefined} />
                <text x={px(m)} y={py(m) + 10} textAnchor="middle" fontFamily={MONO} fontSize={28} fontWeight={700} fill="var(--vt-text)">{m.n}</text>
              </g>
            ))}
      </Obj>
      <Obj as="g" id="peak">
        <circle cx={yearToX(PEAK.year)} cy={billionsToY(PEAK.n)} r={20} fill="var(--vt-good)" />
        <text x={G.right - 20} y={330} textAnchor="end" fontFamily={SANS} fontSize={46} fontWeight={700} fill="var(--vt-good)">peak in {PEAK.year}</text>
        <text x={G.right - 20} y={384} textAnchor="end" fontFamily={SANS} fontSize={46} fontWeight={700} fill="var(--vt-good)">{PEAK.n} billion</text>
      </Obj>
    </svg>
  );
}

// ---------------------------------------------------------------------------------------------------- why

const PANEL = {background: "var(--vt-panel)", border: "2px solid var(--vt-border)", borderRadius: 28, boxSizing: "border-box" as const};
const CAPTION = {position: "absolute" as const, fontFamily: MONO, fontSize: 56, color: "var(--vt-muted)", whiteSpace: "nowrap" as const};
const FAMILY = [0, 1, 2, 3];
const LIFE = {from: 0.3, trackX: 60, trackW: 740};

function Family() {
  return (
    <div style={{...PANEL, position: "absolute", inset: 0}}>
      {FAMILY.map((i) => <Icon key={i} id={`u${i}`} name="user" left={30 + i * 205} top={100} size={200} color="var(--vt-data)" stroke={6} />)}
      <Obj id="famlabel" style={{...CAPTION, left: 60, top: 400}}>children per family</Obj>
    </div>
  );
}

function Life() {
  const grow = useProp("lifebar", "grow", LIFE.from);
  return (
    <div style={{...PANEL, position: "absolute", inset: 0}}>
      <Icon id="heart" name="heart-pulse" left={60} top={90} size={240} color="var(--vt-good)" stroke={6} />
      <div style={{position: "absolute", left: LIFE.trackX, top: 370, width: LIFE.trackW, height: 80, borderRadius: 40, background: "var(--vt-border)"}} />
      <Obj id="lifebar" style={{position: "absolute", left: LIFE.trackX, top: 370, width: grow * LIFE.trackW, height: 80, borderRadius: 40, background: "var(--vt-good)"}} />
      <Obj id="lifelabel" style={{...CAPTION, left: 60, top: 490}}>years of life</Obj>
    </div>
  );
}

function Finale() {
  const r = 300, c = {x: 400, y: 350}, circ = 2 * Math.PI * r;
  const draw = useProp("ring2", "draw", 0);
  return (
    <>
      <svg width={800} height={700} style={{position: "absolute", left: 0, top: 0}}>
        <Obj as="circle" id="ring2" cx={c.x} cy={c.y} r={r} fill="none" stroke="var(--vt-grad)" strokeWidth={12} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - draw)} transform={`rotate(-90 ${c.x} ${c.y})`} />
      </svg>
      <Icon id="rab2" name="rabbit" left={c.x - 230} top={c.y - 230} size={460} color="var(--vt-warn)" stroke={15} />
      <Icon id="tur" name="turtle" left={c.x - 230} top={c.y - 230} size={460} color="var(--vt-data)" stroke={15} />
    </>
  );
}

// ---------------------------------------------------------------------------------------------------- document

export default <Doc id="population" title="The eight billion" lang="en" theme="visotalk/dark" canvas="16x9" exports={{variants: [{preset: "16x9"}], fps: 30, captions: "burned"}}>
  <Scene id="intro">
    <Line id="p1" hold={2.5}>How fast is the world's population really growing? Count it in billions.</Line>
    <Part id="t0" x={100} y={40} w={1720} h={90}><Title>The eight billion</Title></Part>
    <Part id="gauge" x={100} y={150} w={720} h={720}><Gauge/></Part>
    <Part id="amount" x={900} y={290} w={940} h={400}><Amount/></Part>
    <Animation>
      <Appear on={["gauge", "amount"]} at="start"/>
      <Appear on="t0" line="p1" word="population"/>
      <Tween on="ring" draw={1} line="p1" word="Count" dur={1.2}/>
      <Appear on={["bead1", "bead2", "bead3", "bead4", "bead5", "bead6", "bead7", "bead8"]} line="p1" word="Count" stagger={0.15}/>
      <Appear on="watch" line="p1" word="Count" offset={0.5}/>
      <Appear on="big" line="p1" word="billions"/>
      <Appear on="bigsub" line="p1" word="billions" offset={0.5}/>
    </Animation>
  </Scene>

  <Scene id="waits">
    <Line id="p2" text="For almost all of history, the number stayed small. It took humanity until 1804 to reach one billion people.">For almost all of history, the number stayed small. It took humanity until eighteen oh four to reach one billion people.</Line>
    <Line id="p3" text="The second billion took 123 years, arriving in 1927.">The second billion took one hundred and twenty three years, arriving in nineteen twenty seven.</Line>
    <Line id="p4" text="The third took only 33 years, in 1960.">The third took only thirty three years, in nineteen sixty.</Line>
    <Line id="p5" text="Then 14 years for the fourth, and 13 for the fifth.">Then fourteen years for the fourth, and thirteen for the fifth.</Line>
    <Line id="p6" text="The sixth and the seventh each took 12 years.">The sixth and the seventh each took twelve years.</Line>
    <Line id="p7" text="The eighth billion took 11 years, and arrived in November 2022.">The eighth billion took eleven years, and arrived in November twenty twenty two.</Line>
    <Line id="p8" text="So the wait for each billion has shrunk from 123 years to about a decade.">So the wait for each billion has shrunk from one hundred and twenty three years to about a decade.</Line>
    <Line id="p9" hold={1.5}>The world did not just get bigger. It got bigger faster, again and again.</Line>
    <Line id="p10" hold={2.5} text="But the United Nations projects the ninth billion in 2037, a gap of 15 years.">But the United Nations projects the ninth billion in twenty thirty seven, a gap of fifteen years.</Line>
    <Part id="t1" x={100} y={40} w={1720} h={90}><Title>Years it took to add each billion</Title></Part>
    <Part id="waitchart" x={80} y={150} w={1760} h={720}><WaitChart/></Part>
    <Animation>
      <Appear on="waitchart" at="start"/>
      <Appear on="t1" line="p2" word="For"/>
      <Appear on={["ord1", "bar1"]} line="p2" word="history"/>
      <Tween on="bar1" grow={1} line="p2" word="history" dur={1.4}/>
      <Appear on="date1" line="p2" word="eighteen"/>

      <Appear on={["ord2", "bar2"]} line="p3" word="second"/>
      <Tween on="bar2" grow={1} line="p3" word="second" dur={1.4}/>
      <Appear on="gap2" line="p3" word="one"/>
      <Appear on="date2" line="p3" word="nineteen"/>

      <Appear on={["ord3", "bar3"]} line="p4" word="third"/>
      <Tween on="bar3" grow={1} line="p4" word="third" dur={1.4}/>
      <Appear on="gap3" line="p4" word="thirty"/>
      <Appear on="date3" line="p4" word="nineteen"/>

      <Appear on={["ord4", "bar4", "gap4", "date4"]} line="p5" word="fourteen"/>
      <Tween on="bar4" grow={1} line="p5" word="fourteen" dur={1.4}/>
      <Appear on={["ord5", "bar5", "gap5", "date5"]} line="p5" word="thirteen"/>
      <Tween on="bar5" grow={1} line="p5" word="thirteen" dur={1.4}/>

      <Appear on={["ord6", "bar6"]} line="p6" word="sixth"/>
      <Tween on="bar6" grow={1} line="p6" word="sixth" dur={1.4}/>
      <Appear on={["ord7", "bar7"]} line="p6" word="seventh"/>
      <Tween on="bar7" grow={1} line="p6" word="seventh" dur={1.4}/>
      <Appear on={["gap6", "date6", "gap7", "date7"]} line="p6" word="twelve"/>

      <Appear on={["ord8", "bar8"]} line="p7" word="eighth"/>
      <Tween on="bar8" grow={1} line="p7" word="eighth" dur={1.4}/>
      <Appear on="gap8" line="p7" word="eleven"/>
      <Appear on="date8" line="p7" word="twenty twenty two"/>

      <Tween on="trend" draw={1} line="p8" word="shrunk" dur={1.5}/>
      <Appear on="decade" line="p8" word="decade"/>

      <Appear on="rabbit" line="p9" word="faster"/>
      <Appear on="again" line="p9" word="again" nth={2}/>

      <Disappear on={["trend", "decade", "rabbit", "again"]} line="p10" word="But"/>
      <Appear on={["ord9", "bar9"]} line="p10" word="ninth"/>
      <Tween on="bar9" grow={1} line="p10" word="ninth" dur={1.4}/>
      <Appear on="gap9" line="p10" word="fifteen"/>
      <Appear on="date9" line="p10" word="twenty thirty seven"/>
    </Animation>
  </Scene>

  <Scene id="peak">
    <Line id="p11">A slower pace does not mean fewer people: the total keeps rising for decades.</Line>
    <Line id="p12" hold={2.5}>After that, growth keeps slowing, and the total is expected to peak later this century.</Line>
    <Part id="t2" x={100} y={40} w={1720} h={90}><Title>A slower pace, a rising total</Title></Part>
    <Part id="growth" x={80} y={140} w={1760} h={740}><Growth/></Part>
    <Animation>
      <Appear on="growth" at="start"/>
      <Appear on="t2" line="p11" word="slower"/>
      <Appear on="axes" line="p11" word="people" dur={0.5}/>
      <Tween on="axes" draw={1} line="p11" word="people" dur={1.2}/>
      <Appear on="grid" line="p11" word="total"/>
      <Tween on="curve" a={1} line="p11" word="keeps rising" dur={2.5}/>
      <Tween on="curve" b={1} line="p12" word="keeps slowing" dur={2.5}/>
      <Appear on="peak" line="p12" word="peak"/>
    </Animation>
  </Scene>

  <Scene id="why">
    <Line id="p13">Fewer children per family, and longer lives, are changing how the numbers add up.</Line>
    <Line id="p14" hold={3}>The sprint is ending.</Line>
    <Part id="t3" x={100} y={40} w={1720} h={90}><Title>Why the pace slows</Title></Part>
    <Part id="fam" x={80} y={170} w={860} h={620}><Family/></Part>
    <Part id="life" x={980} y={170} w={860} h={620}><Life/></Part>
    <Part id="finale" x={560} y={150} w={800} h={700}><Finale/></Part>
    <Animation>
      <Appear on="t3" line="p13" word="Fewer"/>
      <Appear on="fam" line="p13" word="Fewer"/>
      <Appear on={["u0", "u1", "u2", "u3"]} line="p13" word="children" stagger={0.12}/>
      <Appear on="famlabel" line="p13" word="per"/>
      <Disappear on={["u2", "u3"]} line="p13" word="numbers"/>
      <Appear on="life" line="p13" word="longer"/>
      <Tween on="lifebar" grow={1} line="p13" word="longer" dur={1.5}/>
      <Appear on="lifelabel" line="p13" word="lives"/>

      <Disappear on={["t3", "fam", "life"]} line="p14" word="The"/>
      <Appear on="finale" line="p14" word="The" offset={0.4}/>
      <Tween on="ring2" draw={1} line="p14" word="sprint" dur={1.2}/>
      <Disappear on="rab2" line="p14" word="ending" edge="end" offset={0.6} dur={0.3}/>
      <Appear on="tur" line="p14" word="ending" edge="end" offset={1.0} dur={0.4}/>
    </Animation>
  </Scene>
</Doc>;
