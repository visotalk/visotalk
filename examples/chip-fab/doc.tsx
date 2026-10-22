import {Doc, Scene, Line, Part, Animation, Appear, Disappear, Tween, Set} from '@visotalk/jsx';
import {Obj, useProp, useTime, useDocTime, useScenes} from '@visotalk/runtime';

// ---------- shared helpers ----------
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const ease = (t: number) => t * t * (3 - 2 * t);

// A small deterministic generator: the same numbers on every frame.
function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

const mix = (a: string, b: string, t: number) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const c = pa.map((v, i) => Math.round(lerp(v, pb[i], t)));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
};

// One palette for the whole film: each material keeps its colour from scene to scene.
const C = {
  si: '#7fa6d9', siDark: '#3c5f93', oxide: '#58c4d6', resist: '#e0b04a', exposed: '#b58cff',
  metal: '#e58a4a', metalDark: '#a8531f', nType: '#4cc9f0', pType: '#f0708c', uv: '#b58cff',
  oxygen: '#ff6b5b', carbon: '#9aa3ae', sand: '#d9b97c', hot: '#ffb04a', ok: '#5fd68a', bad: '#ff5d5d',
};

const FONT = 'var(--vt-sans)';
const MONO = 'var(--vt-mono)';

// ---------- the chapter rail (global): fills by the clock across every scene ----------
const CHAPTERS = [
  {name: 'SAND', scenes: ['sand']}, {name: 'CRYSTAL', scenes: ['wafer']}, {name: 'LIGHT', scenes: ['litho']},
  {name: 'ETCH', scenes: ['etch']}, {name: 'DOPE', scenes: ['dope']}, {name: 'WIRE', scenes: ['wire']},
  {name: 'TEST', scenes: ['test']}, {name: 'PACKAGE', scenes: ['pack']},
];
const Rail = () => {
  const t = useDocTime(), scenes = useScenes();
  const spans = CHAPTERS.map((c) => {
    const own = scenes.filter((s) => c.scenes.includes(s.id));
    return {name: c.name, from: Math.min(...own.map((s) => s.from)), end: Math.max(...own.map((s) => s.end))};
  });
  const now = Math.max(0, spans.findIndex((c) => t < c.end));
  return (
    <div style={{display: 'flex', gap: 14, width: '100%', fontFamily: MONO}}>
      {spans.map((c, i) => (
        <div key={c.name} style={{flex: Math.max(1, c.end - c.from)}}>
          <div style={{fontSize: 24, letterSpacing: 3, color: i === now ? 'var(--vt-text)' : 'var(--vt-faint)', marginBottom: 10}}>{c.name}</div>
          <div style={{height: 6, borderRadius: 3, background: 'var(--vt-border)', overflow: 'hidden'}}>
            <div style={{height: 6, width: `${clamp((t - c.from) / (c.end - c.from)) * 100}%`, background: 'var(--vt-text)'}} />
          </div>
        </div>
      ))}
    </div>
  );
};

// ---------- atoms and gradients, shared by every scene's svg ----------
const Defs = () => (
  <defs>
    <radialGradient id="g-si" cx=".35" cy=".3" r=".85"><stop offset="0" stopColor="#d6e6ff" /><stop offset="1" stopColor="#3f68ad" /></radialGradient>
    <radialGradient id="g-ox" cx=".35" cy=".3" r=".85"><stop offset="0" stopColor="#ffc2b8" /><stop offset="1" stopColor="#d2412f" /></radialGradient>
    <radialGradient id="g-c" cx=".35" cy=".3" r=".85"><stop offset="0" stopColor="#d9dee4" /><stop offset="1" stopColor="#4d5560" /></radialGradient>
    <radialGradient id="g-imp" cx=".35" cy=".3" r=".85"><stop offset="0" stopColor="#ffe3a0" /><stop offset="1" stopColor="#c7881a" /></radialGradient>
    <linearGradient id="g-melt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff1c9" /><stop offset="1" stopColor="#ff9a3c" /></linearGradient>
    <linearGradient id="g-metal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f4b27c" /><stop offset="1" stopColor="#b9622a" /></linearGradient>
    <linearGradient id="g-cyl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#a9c4e6" /><stop offset=".5" stopColor="#6f93c4" /><stop offset="1" stopColor="#35527f" /></linearGradient>
    <linearGradient id="g-lid" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#e6ebf2" /><stop offset=".5" stopColor="#aab4c2" /><stop offset="1" stopColor="#7d8794" /></linearGradient>
    <linearGradient id="g-disc" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#a9c1e3" /><stop offset=".5" stopColor="#7597c8" /><stop offset="1" stopColor="#4a6a9c" /></linearGradient>
  </defs>
);

const Atom = ({id, x, y, r, fill, label, ink = '#0b1020'}: {id: string; x: number; y: number; r: number; fill: string; label?: string; ink?: string}) => (
  <Obj as="g" id={id}>
    <circle cx={x} cy={y} r={r} fill={fill} />
    {label ? <text x={x} y={y + r * 0.3} textAnchor="middle" fontSize={r * 0.9} fontWeight={700} fill={ink} style={{fontFamily: MONO}}>{label}</text> : null}
  </Obj>
);

const Label = ({x, y, size = 36, anchor = 'start', fill = 'var(--vt-text)', weight = 400, children, spacing = 0}: {x: number; y: number; size?: number; anchor?: 'start' | 'middle' | 'end'; fill?: string; weight?: number; spacing?: number; children: any}) => (
  <text x={x} y={y} textAnchor={anchor} fontSize={size} fontWeight={weight} fill={fill} letterSpacing={spacing} style={{fontFamily: FONT}}>{children}</text>
);

// ---------- scene 1: sand to pure silicon ----------
const SAND_TONES = ['#d9b97c', '#c79d5e', '#e8cf9a', '#b88a4f'];
const QUARTZ_TONES = ['#e9f2f8', '#cfe0ec', '#f6fafc', '#b9d2e3'];
const GRAINS = (() => {
  const r = rng(11);
  const out: Array<{x: number; y: number; r: number; k: number}> = [];
  for (let i = 0; i < 1500; i++) {
    const x = -1 + 2 * r(), top = Math.exp(-x * x * 3.2), h = Math.pow(r(), 0.45) * top;
    out.push({x: x * 400, y: -h * 380, r: 3 + r() * 3.5, k: Math.floor(r() * 4)});
  }
  return out.sort((a, b) => a.y - b.y);
})();

const Pile = ({cx, base, quartz}: {cx: number; base: number; quartz: number}) => (
  <g>
    {GRAINS.map((g, i) => (
      <circle key={i} cx={cx + g.x} cy={base + g.y} r={g.r} fill={mix(SAND_TONES[g.k], QUARTZ_TONES[g.k], quartz)} />
    ))}
  </g>
);

const SiO2 = ({p, cx, cy, bond}: {p: string; cx: number; cy: number; bond: boolean}) => (
  <g>
    {bond ? <Obj as="g" id={`${p}-bonds`}>
      {[-1, 1].map((s) => [-9, 9].map((d) => <line key={`${s}${d}`} x1={cx + s * 70} y1={cy + d} x2={cx + s * 150} y2={cy + d} stroke="#c9d3e6" strokeWidth={7} strokeLinecap="round" />))}
    </Obj> : null}
    <Atom id={`${p}-ol`} x={cx - 200} y={cy} r={58} fill="url(#g-ox)" label="O" />
    <Atom id={`${p}-or`} x={cx + 200} y={cy} r={58} fill="url(#g-ox)" label="O" />
    <Atom id={`${p}-si`} x={cx} y={cy} r={82} fill="url(#g-si)" label="Si" />
  </g>
);

const LATTICE_IMPURE: Array<[number, number]> = [[1, 0], [3, 2], [5, 1], [7, 3], [2, 3], [6, 0]];
const LATT_X = (c: number) => 360 + c * 150, LATT_Y = (r: number) => 250 + r * 140;

const SandArt = () => {
  const quartz = useProp('quartz', 0);
  const t = useTime();
  const glow = 0.65 + 0.2 * Math.sin(t * 3);
  return (
    <svg width={1920} height={1080} viewBox="0 0 1920 1080">
      <Defs />
      <Obj as="g" id="pile"><Pile cx={960} base={800} quartz={quartz} /></Obj>
      <Obj as="g" id="quartz-tag"><Label x={960} y={850} size={40} anchor="middle" fill="var(--vt-muted)" spacing={6}>QUARTZ</Label></Obj>

      {/* line s2: a grain, magnified */}
      <Obj as="g" id="lens">
        <line x1={600} y1={520} x2={1085} y2={285} stroke="var(--vt-faint)" strokeWidth={3} />
        <line x1={600} y1={540} x2={1085} y2={655} stroke="var(--vt-faint)" strokeWidth={3} />
        <circle cx={1330} cy={470} r={290} fill="var(--vt-panel)" stroke="var(--vt-muted)" strokeWidth={4} />
      </Obj>
      <SiO2 p="m" cx={1330} cy={470} bond />
      <Obj as="g" id="m-name"><text x={1330} y={640} textAnchor="middle" fontSize={60} fontWeight={700} fill="var(--vt-text)" style={{fontFamily: MONO}}>SiO<tspan fontSize={36} dy={14}>2</tspan></text></Obj>

      {/* line s3: the crust */}
      <Obj as="g" id="crust-head"><Label x={1010} y={250} size={34} fill="var(--vt-muted)" spacing={6}>EARTH'S CRUST, BY ABUNDANCE</Label></Obj>
      <Obj as="g" id="rank-o">
        <text x={1010} y={440} fontSize={150} fontWeight={700} fill="var(--vt-faint)" style={{fontFamily: FONT}}>1</text>
        <circle cx={1280} cy={400} r={66} fill="url(#g-ox)" />
        <text x={1280} y={424} textAnchor="middle" fontSize={60} fontWeight={700} fill="#0b1020" style={{fontFamily: MONO}}>O</text>
        <Label x={1380} y={418} size={70} weight={700}>Oxygen</Label>
      </Obj>
      <Obj as="g" id="rank-si">
        <text x={1010} y={690} fontSize={170} fontWeight={700} fill="var(--vt-text)" style={{fontFamily: FONT}}>2</text>
        <circle cx={1280} cy={640} r={78} fill="url(#g-si)" />
        <text x={1280} y={666} textAnchor="middle" fontSize={68} fontWeight={700} fill="#0b1020" style={{fontFamily: MONO}}>Si</text>
        <Label x={1390} y={662} size={84} weight={700}>Silicon</Label>
      </Obj>

      {/* line s4: the furnace */}
      <Obj as="g" id="heat-arrow"><path d="M 880 560 L 1000 560 L 1000 530 L 1080 580 L 1000 630 L 1000 600 L 880 600 Z" fill={C.hot} /></Obj>
      <Obj as="g" id="furn">
        <rect x={1060} y={170} width={740} height={640} rx={36} fill="var(--vt-panel)" stroke={C.hot} strokeWidth={6} />
        <ellipse cx={1430} cy={766} rx={320} ry={38} fill={C.hot} opacity={glow * 0.45} />
        
      </Obj>
      <Obj as="g" id="furn-pool"><rect x={1220} y={730} width={440} height={64} rx={24} fill="url(#g-melt)" /></Obj>
      <SiO2 p="f" cx={1440} cy={420} bond />
      <Atom id="fc-l" x={1140} y={250} r={50} fill="url(#g-c)" label="C" ink="#ffffff" />
      <Atom id="fc-r" x={1740} y={250} r={50} fill="url(#g-c)" label="C" ink="#ffffff" />
      <Obj as="g" id="furn-name"><Label x={1430} y={232} size={34} anchor="middle" fill="var(--vt-muted)" spacing={6}>FURNACE</Label></Obj>

      {/* lines s5, s6, s7: the silicon lattice */}
      <Obj as="g" id="lattice">
        {[0, 1, 2, 3].map((r) => <line key={`h${r}`} x1={LATT_X(0)} y1={LATT_Y(r)} x2={LATT_X(8)} y2={LATT_Y(r)} stroke="#3f68ad" strokeWidth={7} />)}
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((c) => <line key={`v${c}`} x1={LATT_X(c)} y1={LATT_Y(0)} x2={LATT_X(c)} y2={LATT_Y(3)} stroke="#3f68ad" strokeWidth={7} />)}
        {[0, 1, 2, 3].map((r) => [0, 1, 2, 3, 4, 5, 6, 7, 8].map((c) => <circle key={`${r}-${c}`} cx={LATT_X(c)} cy={LATT_Y(r)} r={46} fill="url(#g-si)" />))}
      </Obj>
      {LATTICE_IMPURE.map(([c, r], i) => (
        <Obj as="g" id={`imp-${i}`} key={i}><circle cx={LATT_X(c)} cy={LATT_Y(r)} r={46} fill="url(#g-imp)" stroke="#fff3c9" strokeWidth={4} /></Obj>
      ))}
      <Obj as="g" id="imp-tag"><Label x={960} y={790} size={44} anchor="middle" fill={C.resist}>other atoms: impurities</Label></Obj>
      <Obj as="g" id="grade-tag"><Label x={960} y={810} size={84} anchor="middle" weight={700}>Electronic grade silicon</Label></Obj>
    </svg>
  );
};

const Poster = () => (
  <div style={{fontFamily: FONT, color: 'var(--vt-text)'}}>
    <div style={{fontSize: 148, fontWeight: 700, lineHeight: 1.02, letterSpacing: -3}}>How a chip is made</div>
    <div style={{fontSize: 58, color: 'var(--vt-muted)', marginTop: 28}}>From sand to a packaged processor</div>
  </div>
);

// ---------- scene 2: crystal, ingot, wafer ----------
const MELT_Y = 548, ROD_X = 760;
const CHUNKS = (() => {
  const r = rng(5);
  return Array.from({length: 16}, () => {
    const cx = 590 + r() * 340, cy = 600 + r() * 150, s = 30 + r() * 30;
    const pts = Array.from({length: 6}, (_, k) => { const a = (k / 6) * Math.PI * 2 + r() * 0.5; return `${(cx + Math.cos(a) * s * (0.6 + r() * 0.5)).toFixed(0)},${(cy + Math.sin(a) * s * 0.7 * (0.6 + r() * 0.5)).toFixed(0)}`; });
    return pts.join(' ');
  });
})();

const ingotWidth = (d: number) => (d < 60 ? 14 : d < 130 ? lerp(14, 78, (d - 60) / 70) : 78);
const ingotPath = (top: number, bottom: number) => {
  const L = bottom - top;
  const ds = [0, 60, 130, L].filter((d, i, a) => d <= L && a.indexOf(d) === i);
  if (ds[ds.length - 1] !== L) ds.push(L);
  const left = ds.map((d) => `${ROD_X - ingotWidth(d)},${top + d}`);
  const right = ds.map((d) => `${ROD_X + ingotWidth(d)},${top + d}`).reverse();
  return [...left, ...right].join(' ');
};

const LAT_CX = 1470, LAT_CY = 410;
const LAT_CELLS: Array<[number, number]> = [];
for (let r = -2; r <= 2; r++) for (let c = -2; c <= 2; c++) if (Math.hypot(c, r) <= 2.3) LAT_CELLS.push([c, r]);

const SLICE_N = 10, SLICE_W = 70;
const WaferArt = () => {
  const melt = useProp('melt', 0), dip = useProp('dip', 0), pull = useProp('pull', 0);
  const gap = useProp('gap', 0), face = useProp('face', 0), rad = useProp('rad', 230), cxp = useProp('cxp', 960), shine = useProp('shine', 0);
  const seedBottom = MELT_Y - pull - (1 - dip) * 260;
  const x0 = 960 - (SLICE_N * SLICE_W + (SLICE_N - 1) * 40) / 2;
  const sliceX = (i: number) => x0 + i * (SLICE_W + gap);
  const dcx = lerp(sliceX(5) + SLICE_W, cxp, ease(face)), dcy = lerp(440, 480, ease(face));
  const drx = lerp(22, rad, ease(face)), dry = lerp(110, rad, ease(face));
  return (
    <svg width={1920} height={1080} viewBox="0 0 1920 1080">
      <Defs />
      <radialGradient id="g-shine" cx={lerp(0.1, 0.9, shine)} cy={0.35} r={0.45}><stop offset="0" stopColor="#ffffff" stopOpacity={0.6 * Math.sin(Math.PI * clamp(shine))} /><stop offset="1" stopColor="#ffffff" stopOpacity={0} /></radialGradient>

      {/* w1 to w3: crucible, seed, growing crystal */}
      <Obj as="g" id="bowl">
        <path d="M 500 540 L 1020 540 Q 1000 800 760 810 Q 520 800 500 540 Z" fill="var(--vt-panel)" stroke={mix('#8892a6', '#ffb04a', melt)} strokeWidth={8} />
        <g opacity={1 - melt}>{CHUNKS.map((p, i) => <polygon key={i} points={p} fill={i % 2 ? '#5d7ba6' : '#7a93b8'} stroke="#2a3a55" strokeWidth={2} />)}</g>
        <path d="M 512 552 L 1008 552 Q 988 790 760 798 Q 532 790 512 552 Z" fill="url(#g-melt)" opacity={melt} />
        <ellipse cx={760} cy={MELT_Y + 6} rx={248} ry={26} fill="#fff1c9" opacity={melt * 0.8} />
      </Obj>
      <Obj as="g" id="bowl-tag"><Label x={760} y={870} size={40} anchor="middle" fill="var(--vt-muted)" spacing={5}>CRUCIBLE</Label></Obj>
      <Obj as="g" id="seedrig">
        <line x1={ROD_X} y1={125} x2={ROD_X} y2={seedBottom - 40} stroke="#9aa3ae" strokeWidth={14} />
        <rect x={ROD_X - 18} y={seedBottom - 46} width={36} height={46} fill="#dfe6ef" stroke="#8892a6" strokeWidth={3} />
      </Obj>
      <Obj as="g" id="ingot"><polygon points={ingotPath(seedBottom, MELT_Y + 4)} fill="url(#g-cyl)" stroke="#a9c4e6" strokeWidth={3} /></Obj>
      <Obj as="g" id="turn">
        <path d="M 680 215 A 80 20 0 1 0 840 215" fill="none" stroke={C.hot} strokeWidth={7} strokeLinecap="round" />
        <polygon points="840,215 818,188 866,196" fill={C.hot} />
      </Obj>
      <Obj as="g" id="ingot-tag"><Label x={880} y={350} size={64} weight={700}>Ingot</Label></Obj>

      {/* w3: the lattice inset */}
      <Obj as="g" id="inset">
        <circle cx={LAT_CX} cy={LAT_CY} r={260} fill="var(--vt-panel)" stroke="var(--vt-muted)" strokeWidth={4} />
        <line x1={846} y1={LAT_CY - 40} x2={LAT_CX - 255} y2={LAT_CY - 60} stroke="var(--vt-faint)" strokeWidth={3} />
      </Obj>
      <Obj as="g" id="lat">
        {LAT_CELLS.filter(([c, r]) => !(c === 0 && r === 0)).map(([c, r]) => <circle key={`${c}${r}`} cx={LAT_CX + c * 92} cy={LAT_CY + r * 92} r={26} fill="url(#g-si)" />)}
      </Obj>
      <Obj as="g" id="vac-atom"><circle cx={LAT_CX} cy={LAT_CY} r={26} fill="url(#g-si)" /></Obj>
      <Obj as="g" id="path-ok">
        <line x1={LAT_CX - 230} y1={LAT_CY + 46} x2={LAT_CX + 190} y2={LAT_CY + 46} stroke={C.nType} strokeWidth={7} strokeLinecap="round" />
        <polygon points={`${LAT_CX + 232},${LAT_CY + 46} ${LAT_CX + 190},${LAT_CY + 22} ${LAT_CX + 190},${LAT_CY + 70}`} fill={C.nType} />
        <circle cx={LAT_CX - 230} cy={LAT_CY + 46} r={14} fill={C.nType} />
      </Obj>
      <Obj as="g" id="path-bad">
        <path d={`M ${LAT_CX - 230} ${LAT_CY + 46} L ${LAT_CX - 40} ${LAT_CY + 46} L ${LAT_CX + 40} ${LAT_CY - 30} L ${LAT_CX + 110} ${LAT_CY - 130}`} fill="none" stroke={C.bad} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
        <polygon points={`${LAT_CX + 126},${LAT_CY - 168} ${LAT_CX + 84},${LAT_CY - 126} ${LAT_CX + 130},${LAT_CY - 108}`} fill={C.bad} />
        <circle cx={LAT_CX - 230} cy={LAT_CY + 46} r={14} fill={C.bad} />
      </Obj>
      <Obj as="g" id="lat-tag"><Label x={LAT_CX} y={780} size={40} anchor="middle" fill="var(--vt-muted)">electron path through the crystal</Label></Obj>

      {/* w4: the ingot, lying down, sliced */}
      <Obj as="g" id="slices">
        {Array.from({length: SLICE_N}, (_, k) => SLICE_N - 1 - k).map((i) => (
          <g key={i}>
            <rect x={sliceX(i)} y={330} width={SLICE_W} height={220} fill="url(#g-cyl)" />
            <ellipse cx={sliceX(i) + SLICE_W} cy={440} rx={22} ry={110} fill="#a9c4e6" stroke="#dbe8f7" strokeWidth={2} />
          </g>
        ))}
      </Obj>
      <Obj as="g" id="saw">
        <line x1={x0 + SLICE_W + 24} y1={250} x2={x0 + SLICE_W + 24} y2={640} stroke="#e9edf3" strokeWidth={5} />
        <circle cx={x0 + SLICE_W + 24} cy={240} r={16} fill="#9aa3ae" /><circle cx={x0 + SLICE_W + 24} cy={650} r={16} fill="#9aa3ae" />
      </Obj>

      {/* w5, w6: one disc turns to face us and becomes the wafer */}
      <Obj as="g" id="rings">
        <circle cx={cxp} cy={480} r={230} fill="none" stroke="var(--vt-faint)" strokeWidth={3} strokeDasharray="14 12" opacity={clamp((rad - 236) / 20)} />
        <circle cx={cxp} cy={480} r={282} fill="none" stroke="var(--vt-faint)" strokeWidth={3} strokeDasharray="14 12" opacity={clamp((rad - 288) / 20)} />
      </Obj>
      <Obj as="g" id="disc">
        <ellipse cx={dcx} cy={dcy} rx={drx} ry={dry} fill="url(#g-disc)" stroke="#dbe8f7" strokeWidth={3} />
        <ellipse cx={dcx} cy={dcy} rx={drx} ry={dry} fill="url(#g-shine)" />
      </Obj>
      <Obj as="g" id="wlabel">
        <Label x={140} y={470} size={150} weight={700}>Wafer</Label>
      </Obj>
      <Obj as="g" id="wsub">
        <Label x={146} y={560} size={48} fill="var(--vt-muted)">the canvas for</Label>
        <Label x={146} y={620} size={48} fill="var(--vt-muted)">every layer</Label>
      </Obj>
    </svg>
  );
};

// ---------- scene 3: photolithography, drawn as a cross-section ----------
const SX0 = 360, SX1 = 1560;                       // the stack's left and right edge
const MASK_C = [480, 960, 1440], WIN_C = [660, 960, 1260], WIN_W = 90, MASK_GAP = 90;
const RES_TOP = 660, RES_BOT = 720;

const FIELDS = (() => {
  const out: Array<{x: number; y: number}> = [];
  for (let r = -4; r <= 4; r++) for (let c = -4; c <= 4; c++) {
    const x = 960 + c * 78, y = 480 + r * 62;
    if (Math.hypot(x - 960, y - 480) < 262) out.push({x, y});
  }
  return out;
})();

const LithoArt = () => {
  const coat = useProp('coat', 0), shrink = useProp('shrink', 0), expo = useProp('expo', 0), dev = useProp('dev', 0), step = useProp('step', 0);
  const resTop = RES_BOT - 60 * coat;
  const segs: Array<[number, number]> = [[SX0, WIN_C[0] - WIN_W / 2], [WIN_C[0] + WIN_W / 2, WIN_C[1] - WIN_W / 2], [WIN_C[1] + WIN_W / 2, WIN_C[2] - WIN_W / 2], [WIN_C[2] + WIN_W / 2, SX1]];
  const winH = (RES_BOT - resTop) * (1 - dev);
  return (
    <svg width={1920} height={1080} viewBox="0 0 1920 1080">
      <Defs />
      <Obj as="g" id="ltitle"><Label x={960} y={470} size={136} anchor="middle" weight={700}>Photolithography</Label></Obj>

      {/* the stack: silicon, oxide, resist */}
      <Obj as="g" id="base">
        <rect x={SX0} y={760} width={SX1 - SX0} height={80} fill={C.si} />
        <rect x={SX0} y={720} width={SX1 - SX0} height={40} fill={C.oxide} />
      </Obj>
      <Obj as="g" id="resist">
        {segs.map(([a, b], i) => <rect key={i} x={a} y={resTop} width={b - a} height={RES_BOT - resTop} fill={C.resist} />)}
        {WIN_C.map((c, i) => <rect key={i} x={c - WIN_W / 2} y={RES_BOT - winH} width={WIN_W} height={winH} fill={mix(C.resist, C.exposed, expo)} />)}
      </Obj>
      <Obj as="g" id="tag-resist"><Label x={1610} y={700} size={32} fill={C.resist} spacing={3}>RESIST</Label></Obj>

      {/* the optics */}
      <Obj as="g" id="lamp">
        <rect x={780} y={125} width={360} height={64} rx={20} fill="var(--vt-panel2)" stroke={C.uv} strokeWidth={5} />
        <rect x={830} y={170} width={260} height={14} rx={7} fill={C.uv} />
      </Obj>
      <Obj as="g" id="tag-uv"><Label x={1170} y={168} size={32} fill={C.uv} spacing={3}>ULTRAVIOLET</Label></Obj>
      <Obj as="g" id="beam-top"><polygon points="800,190 1120,190 1560,300 360,300" fill={C.uv} opacity={0.2} /></Obj>
      <Obj as="g" id="mask">
        {[[330, 390], [570, 870], [1050, 1350], [1530, 1590]].map(([a, b], i) => <rect key={i} x={a} y={300} width={b - a} height={36} fill="#2c3550" stroke="#8892a6" strokeWidth={2} />)}
      </Obj>
      <Obj as="g" id="tag-mask"><Label x={1620} y={330} size={32} fill="var(--vt-muted)" spacing={3}>MASK</Label></Obj>
      <Obj as="g" id="beams">
        {MASK_C.map((m, i) => {
          const bc = lerp(m, WIN_C[i], shrink), hw = lerp(MASK_GAP, WIN_W / 2, shrink);
          return <polygon key={i} points={`${m - MASK_GAP},336 ${m + MASK_GAP},336 ${bc + hw},${RES_TOP} ${bc - hw},${RES_TOP}`} fill={C.uv} opacity={0.55} />;
        })}
      </Obj>
      <Obj as="g" id="lens"><ellipse cx={960} cy={470} rx={620} ry={34} fill="#7fd6e8" opacity={0.35} stroke="#bfeaf3" strokeWidth={3} /></Obj>
      <Obj as="g" id="tag-lens"><Label x={1620} y={480} size={32} fill="#7fd6e8" spacing={3}>LENS</Label></Obj>

      {/* line l7: the same wafer seen from above, printed field by field */}
      <Obj as="g" id="topwafer"><circle cx={960} cy={480} r={330} fill="url(#g-disc)" stroke="#dbe8f7" strokeWidth={3} /></Obj>
      <Obj as="g" id="fields">
        {FIELDS.map((f, i) => (
          <rect key={i} x={f.x - 36} y={f.y - 28} width={72} height={56} fill={C.uv} opacity={i < Math.floor(step) ? 0.75 : 0} stroke="#0b1020" strokeWidth={1} />
        ))}
        {FIELDS.map((f, i) => i === Math.floor(step) && i < FIELDS.length ? <rect key={`c${i}`} x={f.x - 40} y={f.y - 32} width={80} height={64} fill="none" stroke="#ffffff" strokeWidth={5} /> : null)}
      </Obj>
    </svg>
  );
};

// ---------- scene 4: etch, strip, deposit, repeat ----------
const RES_SEGS: Array<[number, number]> = [[SX0, WIN_C[0] - WIN_W / 2], [WIN_C[0] + WIN_W / 2, WIN_C[1] - WIN_W / 2], [WIN_C[1] + WIN_W / 2, WIN_C[2] - WIN_W / 2], [WIN_C[2] + WIN_W / 2, SX1]];

const EtchArt = () => {
  const etch = useProp('etch', 0), film1 = useProp('film1', 0), film2 = useProp('film2', 0), orbit = useProp('orbit', 0);
  const t = useTime();
  const trench = 70 * etch;
  return (
    <svg width={1920} height={1080} viewBox="0 0 1920 1080">
      <Defs />
      <g transform="translate(0 -752) scale(1 1.8)">
      <Obj as="g" id="stack2">
        <rect x={SX0} y={760} width={SX1 - SX0} height={80} fill={C.si} />
        <rect x={SX0} y={720} width={SX1 - SX0} height={40} fill={C.oxide} />
        {WIN_C.map((c, i) => <rect key={i} x={c - WIN_W / 2} y={720} width={WIN_W} height={trench} fill="var(--vt-bg)" />)}
      </Obj>
      <Obj as="g" id="resist2">{RES_SEGS.map(([a, b], i) => <rect key={i} x={a} y={660} width={b - a} height={60} fill={C.resist} />)}</Obj>
      <Obj as="g" id="films">
        <rect x={SX0} y={720 - 30 * film1} width={SX1 - SX0} height={30 * film1} fill="#8fe0c0" />
        {WIN_C.map((c, i) => <rect key={i} x={c - WIN_W / 2} y={720} width={WIN_W} height={70 * film1} fill="#8fe0c0" />)}
        <rect x={SX0} y={720 - 30 * film1 - 26 * film2} width={SX1 - SX0} height={26 * film2} fill="url(#g-metal)" />
      </Obj>
      </g>
      <Obj as="g" id="ions">
        {WIN_C.map((c, i) => [0, 1, 2, 3].map((k) => {
          const y = 250 + ((t * 170 + k * 70 + i * 23) % 300);
          return <circle key={`${i}${k}`} cx={c + (k % 2 ? 14 : -14)} cy={y} r={9} fill="#7fd6e8" />;
        }))}
      </Obj>
      <Obj as="g" id="tag-etch"><Label x={1610} y={450} size={32} fill="#7fd6e8" spacing={3}>PLASMA</Label></Obj>
      <Obj as="g" id="pad">
        <rect x={SX0 + (SX1 - SX0) / 2 - 150 + 300 * Math.sin(t * 2.2)} y={380} width={300} height={36} rx={14} fill="#9aa3ae" stroke="#dfe6ef" strokeWidth={3} />
        <Label x={SX0 + (SX1 - SX0) / 2 + 300 * Math.sin(t * 2.2)} y={355} size={32} anchor="middle" fill="var(--vt-muted)" spacing={3}>POLISH</Label>
      </Obj>
      <Obj as="g" id="tag-films">
        <Label x={1610} y={462} size={32} fill={C.metal} spacing={3}>METAL</Label>
        <Label x={1610} y={506} size={32} fill="#8fe0c0" spacing={3}>INSULATOR</Label>
      </Obj>
      <Obj as="g" id="tag-base">
        <Label x={1610} y={596} size={32} fill={C.oxide} spacing={3}>OXIDE</Label>
        <Label x={1610} y={700} size={32} fill={C.si} spacing={3}>SILICON</Label>
      </Obj>

      {/* line e5: the loop */}
      <Obj as="g" id="cyc-ring">
        <circle cx={1570} cy={450} r={170} fill="none" stroke="var(--vt-faint)" strokeWidth={8} strokeDasharray="30 18" />
      </Obj>
      <Obj as="g" id="cyc-add"><Label x={1570} y={225} size={44} anchor="middle" weight={700} fill={C.metal}>ADD</Label></Obj>
      <Obj as="g" id="cyc-pattern"><Label x={1735} y={650} size={44} anchor="middle" weight={700} fill={C.exposed}>PATTERN</Label></Obj>
      <Obj as="g" id="cyc-remove"><Label x={1400} y={650} size={44} anchor="middle" weight={700} fill="#7fd6e8">REMOVE</Label></Obj>
      <Obj as="g" id="cyc-dot"><circle cx={1570 + 170 * Math.cos(t * 1.6 - Math.PI / 2)} cy={450 + 170 * Math.sin(t * 1.6 - Math.PI / 2)} r={18} fill="var(--vt-text)" /></Obj>
    </svg>
  );
};

// ---------- scene 5: doping and the transistor ----------
const TX0 = 360, TX1 = 1560, TY0 = 540, TY1 = 800;       // substrate block
const WELL_L: [number, number] = [440, 760], WELL_R: [number, number] = [1160, 1480];
const SUB_DOTS = (() => { const o: Array<[number, number]> = []; for (let x = TX0 + 30; x < TX1; x += 60) for (let y = TY0 + 30; y < TY1; y += 60) o.push([x, y]); return o; })();
const HOLES: Array<[number, number]> = [[560, 710], [700, 760], [820, 650], [960, 730], [1100, 680], [1240, 750], [1360, 700], [900, 780], [620, 650], [1450, 770]];
const ELEC_L: Array<[number, number]> = [[490, 580], [570, 620], [650, 575], [710, 630], [530, 640]];
const ELEC_R: Array<[number, number]> = [[1210, 580], [1290, 625], [1370, 575], [1440, 630], [1250, 645]];

const DopeArt = () => {
  const ptint = useProp('ptint', 0), well = useProp('well', 0), v = useProp('v', 0);
  const t = useTime();
  const cur = Math.max(0.05, v);
  return (
    <svg width={1920} height={1080} viewBox="0 0 1920 1080">
      <Defs />
      {/* the current meter */}
      <Obj as="g" id="meter">
        <Label x={1260} y={150} size={30} fill="var(--vt-muted)" spacing={4}>CURRENT</Label>
        <rect x={1260} y={166} width={500} height={34} rx={17} fill="var(--vt-border)" />
        <rect x={1260} y={166} width={500 * cur} height={34} rx={17} fill={C.nType} />
      </Obj>

      {/* the silicon block */}
      <Obj as="g" id="sub">
        <rect x={TX0} y={TY0} width={TX1 - TX0} height={TY1 - TY0} fill={mix('#4b6f9f', '#a8587c', ptint)} />
        {SUB_DOTS.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={7} fill="#ffffff" opacity={0.22} />)}
      </Obj>
      <Obj as="g" id="tag-b"><Label x={960} y={850} size={36} anchor="middle" fill="#ff9db8" spacing={4}>BORON</Label></Obj>
      <Obj as="g" id="wells">
        {[WELL_L, WELL_R].map(([a, b], i) => <rect key={i} x={a} y={TY0} width={b - a} height={110 * well} fill="#1f7f9c" stroke={C.nType} strokeWidth={4} />)}
      </Obj>
      <Obj as="g" id="ions">
        {[WELL_L, WELL_R].map(([a, b], i) => [0, 1, 2, 3, 4].map((k) => {
          const x = a + 40 + k * ((b - a - 80) / 4), y = 250 + ((t * 220 + k * 62 + i * 30) % 270);
          return <g key={`${i}${k}`}><line x1={x} y1={y - 38} x2={x} y2={y} stroke="#9fe6f7" strokeWidth={4} opacity={0.5} /><circle cx={x} cy={y} r={11} fill="#ffd24a" /></g>;
        }))}
      </Obj>
      <Obj as="g" id="tag-p"><Label x={600} y={212} size={36} anchor="middle" fill="#ffd24a" spacing={4}>PHOSPHORUS</Label></Obj>

      {/* electrons and holes */}
      <Obj as="g" id="elec">
        {[...ELEC_L, ...ELEC_R].map(([x, y], i) => <g key={i}><circle cx={x} cy={y} r={14} fill={C.nType} /><rect x={x - 7} y={y - 2} width={14} height={4} fill="#06222c" /></g>)}
        <circle cx={392} cy={186} r={14} fill={C.nType} /><Label x={420} y={197} size={30} fill="var(--vt-muted)">extra electron</Label>
      </Obj>
      <Obj as="g" id="holes">
        {HOLES.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={14} fill="none" stroke="#ffd0dc" strokeWidth={5} />)}
        <circle cx={392} cy={236} r={14} fill="none" stroke="#ffd0dc" strokeWidth={5} /><Label x={420} y={247} size={30} fill="var(--vt-muted)">missing electron</Label>
      </Obj>

      {/* the gate */}
      <Obj as="g" id="gate-ox"><rect x={780} y={514} width={400} height={26} fill={C.oxide} /></Obj>
      <Obj as="g" id="gate"><rect x={800} y={420} width={360} height={94} rx={8} fill={mix('#c2704a', '#ffd24a', v)} stroke="#fff3c9" strokeWidth={3} opacity={1} /></Obj>
      <Obj as="g" id="tag-gate"><Label x={980} y={394} size={40} anchor="middle" weight={700}>GATE</Label></Obj>
      <Obj as="g" id="tag-source"><Label x={600} y={470} size={40} anchor="middle" weight={700}>SOURCE</Label></Obj>
      <Obj as="g" id="tag-drain"><Label x={1320} y={470} size={40} anchor="middle" weight={700}>DRAIN</Label></Obj>
      <Obj as="g" id="field">
        {[850, 930, 1010, 1090].map((x) => <line key={x} x1={x + 20} y1={548} x2={x + 20} y2={610} stroke="#fff3c9" strokeWidth={4} strokeDasharray="8 8" opacity={0.8} />)}
        <Label x={1205} y={528} size={30} fill="#8fe0c0" spacing={3}>INSULATOR</Label>
      </Obj>

      {/* voltage on the gate, channel, current */}
      <Obj as="g" id="vsrc">
        <path d="M 1100 420 L 1100 300 L 1224 300" fill="none" stroke="#c9d3e6" strokeWidth={5} />
        <line x1={1224} y1={262} x2={1224} y2={338} stroke="#c9d3e6" strokeWidth={9} />
        <line x1={1256} y1={278} x2={1256} y2={322} stroke="#c9d3e6" strokeWidth={9} />
        <Label x={1240} y={240} size={30} anchor="middle" fill="var(--vt-muted)" spacing={3}>VOLTAGE</Label>
      </Obj>
      <Obj as="g" id="channel"><rect x={760} y={540} width={400} height={34} fill={C.nType} opacity={0.75 * v} /></Obj>
      <Obj as="g" id="flow">
        {[0, 1, 2, 3, 4, 5, 6].map((k) => { const x = 600 + ((t * 260 + k * 110) % 780); return <circle key={k} cx={x} cy={558} r={13} fill="#ffffff" opacity={v > 0.5 ? v : 0} />; })}
      </Obj>
      <Obj as="g" id="bit"><text x={960} y={330} textAnchor="middle" fontSize={0} /><text x={1560} y={400} textAnchor="middle" fontSize={190} fontWeight={700} fill={v > 0.5 ? C.nType : 'var(--vt-faint)'} style={{fontFamily: MONO}}>{v > 0.5 ? '1' : '0'}</text></Obj>
    </svg>
  );
};

// ---------- scene 6: billions of switches, wired in layers ----------
const ISO_X = 420, ISO_Y = 210, ISO_CX = 960, ISO_CY = 420;
const iso = (u: number, v: number, h: number) => ({x: ISO_CX + (u - v) * ISO_X, y: ISO_CY + (u + v) * ISO_Y - h});
const P = (u: number, v: number, h: number) => { const p = iso(u, v, h); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; };
const WIRE_N = [0, 9, 7, 5, 3, 2], WIRE_W = [0, 4, 6, 9, 14, 20];
const VIA_AT: Array<[number, number]> = [[0.2, 0.2], [0.5, 0.35], [0.8, 0.7], [0.35, 0.8], [0.65, 0.15]];

const Slab = ({k, gz}: {k: number; gz: number}) => {
  const h = k * gz;
  const n = WIRE_N[k];
  return (
    <g>
      <polygon points={`${P(0, 0, h)} ${P(1, 0, h)} ${P(1, 1, h)} ${P(0, 1, h)}`} fill="var(--vt-panel2)" stroke="var(--vt-faint)" strokeWidth={2} opacity={0.94} />
      {k === 0 ? Array.from({length: 100}, (_, i) => {
        const a = ((i % 10) + 0.5) / 10, b = (Math.floor(i / 10) + 0.5) / 10, s = 0.03;
        return <polygon key={i} points={`${P(a - s, b - s, h)} ${P(a + s, b - s, h)} ${P(a + s, b + s, h)} ${P(a - s, b + s, h)}`} fill={i % 3 ? C.nType : C.si} />;
      }) : Array.from({length: n}, (_, i) => {
        const f = (i + 0.5) / n;
        const [p0, p1] = k % 2 ? [P(0.03, f, h), P(0.97, f, h)] : [P(f, 0.03, h), P(f, 0.97, h)];
        const [x0, y0] = p0.split(','), [x1, y1] = p1.split(',');
        return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} stroke="url(#g-metal)" strokeWidth={WIRE_W[k]} strokeLinecap="round" />;
      })}
    </g>
  );
};
const Vias = ({k, gz}: {k: number; gz: number}) => (
  <g>
    {VIA_AT.slice(0, k === 0 ? 5 : 3).map(([u, v], i) => {
      const a = iso(u, v, k * gz), b = iso(u, v, (k + 1) * gz);
      return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#f2c29a" strokeWidth={5} strokeLinecap="round" />;
    })}
  </g>
);

const WireArt = () => {
  const gz = useProp('gz', 36);
  return (
    <svg width={1920} height={1080} viewBox="0 0 1920 1080">
      <Defs />
      {[0, 1, 2, 3, 4, 5].map((k) => (
        <g key={k}>
          <Obj as="g" id={`ly-${k}`}><Slab k={k} gz={gz} /></Obj>
          {k < 5 ? <Obj as="g" id={`vias-${k}`}><Vias k={k} gz={gz} /></Obj> : null}
        </g>
      ))}
      <Obj as="g" id="tag-fine">
        <Label x={120} y={730} size={36} weight={700} fill="#f2c29a">Fine wires</Label>
        <Label x={120} y={776} size={32} fill="var(--vt-muted)">between neighbours</Label>
      </Obj>
      <Obj as="g" id="tag-wide">
        <Label x={1500} y={260} size={36} weight={700} fill="#f2c29a">Wide wires</Label>
        <Label x={1500} y={306} size={32} fill="var(--vt-muted)">across the chip</Label>
      </Obj>
      <Obj as="g" id="xs">
        <rect x={1440} y={560} width={320} height={190} rx={10} fill="var(--vt-panel)" stroke="var(--vt-faint)" strokeWidth={3} />
        <rect x={1500} y={600} width={200} height={110} rx={8} fill="url(#g-metal)" stroke="#7fd6e8" strokeWidth={9} />
        <Label x={1600} y={785} size={32} anchor="middle" fill={C.metal} spacing={3}>COPPER</Label>
        <Label x={1600} y={830} size={32} anchor="middle" fill="#7fd6e8" spacing={3}>BARRIER</Label>
      </Obj>
    </svg>
  );
};

// ---------- scene 7: test and dice;  scene 8: package ----------
const DIE_W = 54, DIE_H = 40, DIE_DX = 62, DIE_DY = 48;
const DIES = (() => {
  const r = rng(21);
  const out: Array<{x: number; y: number; ok: boolean}> = [];
  for (let row = -8; row <= 8; row++) for (let col = -8; col <= 8; col++) {
    const x = col * DIE_DX, y = row * DIE_DY;
    const inside = [-1, 1].every((sx) => [-1, 1].every((sy) => Math.hypot(x + sx * 27, y + sy * 20) <= 312));
    if (inside) out.push({x, y, ok: r() > 0.09});
  }
  out[33].ok = false;
  return out;
})();
const SOLO = (() => {
  let best = -1, bd = 1e9;
  DIES.forEach((d, i) => { const dist = Math.hypot(d.x, d.y); if (d.ok && dist < bd) { bd = dist; best = i; } });
  return best;
})();
// the layout drawn on every die: blocks of different sizes and colours
const BLOCKS = (() => {
  const r = rng(3);
  const cols = ['#5f86bd', '#e58a4a', '#4cc9f0', '#8d7bd8', '#7fd6a0'];
  return [[0.06, 0.08, 0.4, 0.4], [0.5, 0.08, 0.44, 0.2], [0.5, 0.32, 0.44, 0.16], [0.06, 0.54, 0.26, 0.38], [0.36, 0.54, 0.26, 0.38], [0.66, 0.54, 0.28, 0.38]].map(([x, y, w, h]) => ({x, y, w, h, c: cols[Math.floor(r() * cols.length)]}));
})();
const DieArt = ({x, y, w, h, fill, id}: {x: number; y: number; w: number; h: number; fill: string; id?: string}) => (
  <g>
    <rect x={x} y={y} width={w} height={h} fill={fill} stroke="#dbe8f7" strokeWidth={Math.max(1.5, w / 90)} />
    {BLOCKS.map((b, i) => <rect key={i} x={x + b.x * w} y={y + b.y * h} width={b.w * w} height={b.h * h} fill={b.c} opacity={0.75} />)}
  </g>
);

const TestArt = () => {
  const scan = useProp('scan', 0), cut = useProp('cut', 0), sep = useProp('sep', 0), solo = useProp('solo', 0), dust = useProp('dust', 0);
  const e = ease(sep), es = ease(solo);
  const cx = 960, cy = 480;
  const cur = Math.floor(scan);
  return (
    <svg width={1920} height={1080} viewBox="0 0 1920 1080">
      <Defs />
      <Obj as="g" id="tw"><circle cx={cx} cy={cy} r={335} fill="url(#g-disc)" stroke="#dbe8f7" strokeWidth={3} opacity={1 - e} /></Obj>
      <Obj as="g" id="dies">
        {DIES.map((d, i) => {
          const tested = i < scan, isSolo = i === SOLO;
          const px = cx + d.x * (1 + 0.22 * e), py = cy + d.y * (1 + 0.22 * e);
          const fill = tested ? (d.ok ? '#2f8f5b' : '#3a3f4c') : '#8fb0dc';
          const op = isSolo ? 1 : 1 - es * 1 - (d.ok ? 0 : e);
          const sc = isSolo ? lerp(1, 6.4, es) : 1;
          const tx = isSolo ? lerp(px, cx, es) : px, ty = isSolo ? lerp(py, cy, es) : py;
          return <g key={i} opacity={clamp(op)}><DieArt x={tx - (DIE_W * sc) / 2} y={ty - (DIE_H * sc) / 2} w={DIE_W * sc} h={DIE_H * sc} fill={fill} /></g>;
        })}
      </Obj>
      <Obj as="g" id="probe">
        {cur < DIES.length ? (() => { const d = DIES[cur]; const px = cx + d.x, py = cy + d.y; return (
          <g>
            <rect x={px - 34} y={py - 27} width={68} height={54} fill="none" stroke="#ffffff" strokeWidth={4} />
            {[-20, -7, 7, 20].map((o) => <line key={o} x1={px + o} y1={py - 12} x2={px + o * 1.6} y2={py - 70} stroke="#e9edf3" strokeWidth={3} />)}
            <rect x={px - 80} y={py - 94} width={160} height={26} rx={8} fill="#9aa3ae" />
          </g>); })() : null}
      </Obj>
      <Obj as="g" id="dust">
        <circle cx={cx + DIES[33].x + 6} cy={cy + DIES[33].y - 120 + 120 * dust} r={11} fill="#c9b79a" />
        <circle cx={cx + DIES[33].x - 8} cy={cy + DIES[33].y - 124 + 120 * dust} r={7} fill="#a8967a" />
        <Label x={cx + DIES[33].x + 90} y={cy + DIES[33].y - 140} size={34} fill="#d9c7a2">dust</Label>
      </Obj>
      <Obj as="g" id="marks">
        {DIES.map((d, i) => d.ok ? null : (
          <g key={i} opacity={1 - e}>
            <line x1={cx + d.x - 18} y1={cy + d.y - 14} x2={cx + d.x + 18} y2={cy + d.y + 14} stroke={C.bad} strokeWidth={6} strokeLinecap="round" />
            <line x1={cx + d.x + 18} y1={cy + d.y - 14} x2={cx + d.x - 18} y2={cy + d.y + 14} stroke={C.bad} strokeWidth={6} strokeLinecap="round" />
          </g>
        ))}
      </Obj>
      <Obj as="g" id="cutlines">
        {[-8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8].map((k) => (
          <g key={k} opacity={1 - e}>
            <line x1={cx - 330} y1={cy + k * DIE_DY - DIE_DY / 2 + 4} x2={cx - 330 + 660 * clamp(cut * 2)} y2={cy + k * DIE_DY - DIE_DY / 2 + 4} stroke="#ffffff" strokeWidth={2} />
            <line x1={cx + k * DIE_DX - DIE_DX / 2 + 4} y1={cy - 330} x2={cx + k * DIE_DX - DIE_DX / 2 + 4} y2={cy - 330 + 660 * clamp(cut * 2 - 1)} stroke="#ffffff" strokeWidth={2} />
          </g>
        ))}
      </Obj>
      <Obj as="g" id="t-tag"><Label x={960} y={870} size={36} anchor="middle" fill="var(--vt-muted)" spacing={4}>DIE</Label></Obj>
    </svg>
  );
};

// ---------- scene 8: the package ----------
const PAD_N = 12;
const PackArt = () => {
  const ds = useProp('ds', 1), bw = useProp('bw', 0), flip = useProp('flip', 0), shift = useProp('shift', 0), spd = useProp('spd', 0), tmp = useProp('tmp', 0), chk = useProp('chk', 0);
  const t = useTime();
  const cx = 960, cy = 480, pw = 760, ph = 600;
  const dw = 360 * ds, dh = 270 * ds;
  const sx = Math.abs(Math.cos(flip * Math.PI));
  const padsTop = Array.from({length: PAD_N}, (_, i) => cx - 300 + (i * 600) / (PAD_N - 1));
  const padsSide = Array.from({length: 9}, (_, i) => cy - 220 + (i * 440) / 8);
  const wires: Array<[number, number, number, number]> = [];
  padsTop.forEach((x, i) => { const fx = cx - dw / 2 + ((i + 0.5) / PAD_N) * dw; wires.push([fx, cy - dh / 2, x, cy - 255], [fx, cy + dh / 2, x, cy + 255]); });
  padsSide.forEach((y, i) => { const fy = cy - dh / 2 + ((i + 0.5) / 9) * dh; wires.push([cx - dw / 2, fy, cx - 345, y], [cx + dw / 2, fy, cx + 345, y]); });
  const needle = -120 + 240 * spd + 6 * Math.sin(t * 9) * spd;
  return (
    <svg width={1920} height={1080} viewBox="0 0 1920 1080">
      <Defs />
      <g transform={`translate(${shift} 0) translate(${cx} ${cy}) scale(${Math.max(0.001, sx)} 1) translate(${-cx} ${-cy})`} opacity={flip < 0.5 ? 1 : 0}>
        <Obj as="g" id="pkg">
          <rect x={cx - pw / 2} y={cy - ph / 2} width={pw} height={ph} rx={26} fill="#1f6b58" stroke="#8fe0c0" strokeWidth={4} />
          {padsTop.map((x, i) => <g key={i}><rect x={x - 11} y={cy - 275} width={22} height={34} fill="#e9c46a" /><rect x={x - 11} y={cy + 241} width={22} height={34} fill="#e9c46a" /></g>)}
          {padsSide.map((y, i) => <g key={i}><rect x={cx - 365} y={y - 11} width={34} height={22} fill="#e9c46a" /><rect x={cx + 331} y={y - 11} width={34} height={22} fill="#e9c46a" /></g>)}
        </Obj>
        <Obj as="g" id="pk-die"><DieArt x={cx - dw / 2} y={cy - dh / 2} w={dw} h={dh} fill="#8fb0dc" /></Obj>
        <Obj as="g" id="wires">
          {wires.map(([x0, y0, x1, y1], i) => <path key={i} d={`M ${x0} ${y0} Q ${(x0 + x1) / 2} ${(y0 + y1) / 2 - 18} ${x1} ${y1}`} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - bw} fill="none" stroke="#f4c27a" strokeWidth={3.5} />)}
        </Obj>
        <Obj as="g" id="lid">
          <rect x={cx - 350} y={cy - 270} width={700} height={540} rx={30} fill="url(#g-lid)" stroke="#f1f4f8" strokeWidth={4} />
          <rect x={cx - 300} y={cy - 220} width={600} height={440} rx={18} fill="none" stroke="#7d8794" strokeWidth={3} />
        </Obj>
        <Obj as="g" id="heat">
          {[-200, -80, 60, 190].map((x, i) => <path key={i} d={`M ${cx + x} ${cy - 276 - ((t * 50 + i * 30) % 60)} q 12 -18 0 -36 q -12 -18 0 -36`} fill="none" stroke={C.hot} strokeWidth={6} strokeLinecap="round" opacity={0.85} />)}
        </Obj>
        <Obj as="g" id="lid-tag"><Label x={cx} y={cy + 330} size={34} anchor="middle" fill="var(--vt-muted)" spacing={4}>HEAT SPREADER</Label></Obj>
        <Obj as="g" id="check"><path d={`M ${cx - 90} ${cy} L ${cx - 30} ${cy + 64} L ${cx + 100} ${cy - 70}`} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - chk} fill="none" stroke={C.ok} strokeWidth={26} strokeLinecap="round" strokeLinejoin="round" /></Obj>
      </g>
      <g transform={`translate(${shift} 0) translate(${cx} ${cy}) scale(${Math.max(0.001, sx)} 1) translate(${-cx} ${-cy})`} opacity={flip >= 0.5 ? 1 : 0}>
        <Obj as="g" id="bottom">
          <rect x={cx - pw / 2} y={cy - ph / 2} width={pw} height={ph} rx={26} fill="#1f6b58" stroke="#8fe0c0" strokeWidth={4} />
          {Array.from({length: 14 * 11}, (_, i) => <circle key={i} cx={cx - 312 + (i % 14) * 48} cy={cy - 240 + Math.floor(i / 14) * 48} r={13} fill="#e9c46a" />)}
        </Obj>
      </g>

      {/* the sand it came from */}
      <Obj as="g" id="sand-end"><g transform="translate(330 780) scale(0.5)"><Pile cx={0} base={0} quartz={0} /></g></Obj>
      <Obj as="g" id="end-arrow"><path d="M 600 600 L 690 600 L 690 570 L 760 620 L 690 670 L 690 640 L 600 640 Z" fill="var(--vt-text)" /></Obj>

      {/* the final tests */}
      <Obj as="g" id="dial">
        <path d="M 270 600 A 150 150 0 1 1 570 600" fill="none" stroke="var(--vt-border)" strokeWidth={22} strokeLinecap="round" />
        <line x1={420} y1={560} x2={420 + 120 * Math.sin((needle * Math.PI) / 180)} y2={560 - 120 * Math.cos((needle * Math.PI) / 180)} stroke={C.hot} strokeWidth={10} strokeLinecap="round" />
        <circle cx={420} cy={560} r={18} fill="var(--vt-text)" />
        <Label x={420} y={680} size={34} anchor="middle" fill="var(--vt-muted)" spacing={4}>SPEED</Label>
      </Obj>
      <Obj as="g" id="thermo">
        <rect x={1500} y={260} width={44} height={340} rx={22} fill="var(--vt-border)" />
        <rect x={1500} y={600 - 340 * tmp} width={44} height={340 * tmp} rx={22} fill={C.bad} />
        <circle cx={1522} cy={612} r={44} fill={C.bad} />
        <Label x={1522} y={720} size={34} anchor="middle" fill="var(--vt-muted)" spacing={4}>TEMPERATURE</Label>
      </Obj>
    </svg>
  );
};

export default <Doc id="chip-fab" title="How a Chip Is Made" lang="en" theme="visotalk/dark" canvas="16x9">
  <Part id="rail" x={120} y={30} w={1680} h={70}>{() => <Rail />}</Part>
  <Part id="poster" x={160} y={300} w={1600} h={420}>{() => <Poster />}</Part>
  <Scene id="sand">
    <Line id="s1">Every processor begins as something almost worthless: sand.</Line>
    <Line id="s1b">Not beach sand, but very pure quartz, which is almost nothing but silicon and oxygen.</Line>
    <Line id="s2" hold={1.4}>Ordinary sand is mostly silicon dioxide, silicon bound to oxygen.</Line>
    <Line id="s3" hold={1.4}>Silicon is the second most abundant element in the Earth's crust, after oxygen.</Line>
    <Line id="s4">To free it, the sand is heated in a furnace with carbon, which pulls the oxygen away.</Line>
    <Line id="s4b">At that heat the oxygen leaves as a gas, and molten silicon collects at the bottom.</Line>
    <Line id="s5" hold={1.4}>What remains is silicon, but still far too dirty for electronics.</Line>
    <Line id="s6">So it is purified again and again, until almost no other atom is left.</Line>
    <Line id="s7">Electronic grade silicon is among the purest materials people have ever made.</Line>
    <Part id="sandart">{() => <SandArt />}</Part>
    <Animation>
      <Appear on="rail" at="start" dur={0} />
      <Appear on="poster" at="start" dur={0} />
      <Appear on="sandart" at="start" dur={0} />
      <Disappear on="poster" line="s1" word="worthless" />
      <Appear on="pile" line="s1" word="sand" dur={0.8} />
      <Tween on="sandart" quartz={1} line="s1b" word="very pure quartz" dur={1.4} />
      <Appear on="quartz-tag" line="s1b" word="quartz" />

      <Tween on="pile" x={-520} line="s2" word="ordinary sand" dur={0.9} easing="easeInOut" />
      <Disappear on="quartz-tag" line="s2" word="ordinary sand" />
      <Appear on="lens" line="s2" word="mostly" />
      <Appear on={["m-si", "m-name"]} line="s2" word="silicon dioxide" />
      <Appear on={["m-ol", "m-or"]} line="s2" word="oxygen" />
      <Appear on="m-bonds" line="s2" word="oxygen" offset={0.2} />

      <Disappear on={["lens", "m-si", "m-ol", "m-or", "m-bonds", "m-name"]} line="s3" word="silicon" dur={0.4} />
      <Appear on="rank-si" line="s3" word="second most abundant" />
      <Appear on="crust-head" line="s3" word="crust" />
      <Appear on="rank-o" line="s3" word="after oxygen" />

      <Disappear on={["rank-si", "rank-o", "crust-head"]} line="s4" word="free it" dur={0.4} />
      <Appear on="heat-arrow" line="s4" word="heated" />
      <Appear on={["furn", "furn-name", "f-si", "f-ol", "f-or", "f-bonds"]} line="s4" word="furnace" />
      <Appear on={["fc-l", "fc-r"]} line="s4" word="carbon" />
      <Tween on={["fc-l", "fc-r"]} y={170} line="s4" word="pulls" dur={1.0} easing="easeInOut" />
      <Disappear on="f-bonds" line="s4" word="oxygen away" />

      <Tween on={["fc-l", "f-ol"]} y={-120} line="s4b" word="leaves as a gas" dur={1.8} easing="easeIn" />
      <Tween on={["fc-r", "f-or"]} y={-120} line="s4b" word="leaves as a gas" dur={1.8} easing="easeIn" />
      <Disappear on={["fc-l", "f-ol", "fc-r", "f-or"]} line="s4b" word="leaves as a gas" offset={1.2} dur={0.6} />
      <Appear on="furn-pool" line="s4b" word="molten silicon" />
      <Tween on="f-si" y={300} line="s4b" word="collects" dur={1.4} easing="easeInOut" />

      <Disappear on={["pile", "heat-arrow", "furn", "furn-name", "furn-pool", "f-si"]} line="s5" word="remains" dur={0.5} />
      <Appear on="lattice" line="s5" word="silicon" offset={0.2} dur={0.8} />
      <Appear on={["imp-0", "imp-1", "imp-2", "imp-3", "imp-4", "imp-5"]} stagger={0.2} line="s5" word="dirty" />
      <Appear on="imp-tag" line="s5" word="electronics" />

      <Disappear on="imp-tag" line="s6" word="purified" />
      <Disappear on={["imp-0", "imp-1", "imp-2", "imp-3", "imp-4", "imp-5"]} stagger={0.55} line="s6" word="again and again" />

      <Appear on="grade-tag" line="s7" word="electronic grade silicon" />
    </Animation>
  </Scene>
  <Scene id="wafer">
    <Line id="w1">The pure silicon is melted in a crucible.</Line>
    <Line id="w2">A small seed crystal is dipped into the melt, then lifted out very slowly while it turns.</Line>
    <Line id="w3" hold={1.4}>Atoms line up behind the seed, and a single perfect crystal grows into a heavy cylinder called an ingot.</Line>
    <Line id="w3b">It has to be one crystal, because every flaw in the pattern of atoms would scatter the electrons passing through.</Line>
    <Line id="w4" hold={1.2}>A wire saw slices the ingot into thin discs.</Line>
    <Line id="w5">Each disc is ground and polished until it is smooth as a mirror.</Line>
    <Line id="w5b">Over the decades, chipmakers have made wafers wider, because a wider disc holds more chips.</Line>
    <Line id="w6">This is a wafer, and it is the canvas for everything that follows.</Line>
    <Part id="waferart">{() => <WaferArt />}</Part>
    <Animation>
      <Appear on="waferart" at="start" dur={0} />
      <Appear on="bowl" line="w1" word="pure silicon" />
      <Tween on="waferart" melt={1} line="w1" word="melted" dur={1.6} />
      <Appear on="bowl-tag" line="w1" word="crucible" />

      <Appear on="seedrig" line="w2" word="seed crystal" />
      <Tween on="waferart" dip={1} line="w2" word="dipped" dur={1.2} easing="easeInOut" />
      <Tween on="waferart" pull={360} line="w2" word="lifted out" dur={9} easing="linear" />
      <Appear on="turn" line="w2" word="turns" />

      <Appear on={["inset", "lat"]} line="w3" word="atoms line up" />
      <Appear on="path-ok" line="w3" word="single perfect crystal" />
      <Appear on="ingot-tag" line="w3" word="ingot" />

      <Disappear on="ingot-tag" line="w3b" word="one crystal" />
      <Disappear on={["path-ok", "vac-atom"]} line="w3b" word="every flaw" />
      <Appear on="path-bad" line="w3b" word="scatter" />
      <Appear on="lat-tag" line="w3b" word="scatter" offset={0.6} />

      <Disappear on={["bowl", "bowl-tag", "seedrig", "ingot", "turn", "inset", "lat", "path-bad", "lat-tag"]} line="w4" word="wire saw" dur={0.5} offset={-0.3} />
      <Appear on="slices" line="w4" word="wire saw" offset={0.3} />
      <Appear on="saw" line="w4" word="wire saw" offset={0.2} />
      <Tween on="waferart" gap={40} line="w4" word="slices" dur={1.8} easing="easeInOut" />
      <Disappear on="saw" line="w4" word="thin discs" offset={0.9} />

      <Appear on="disc" line="w5" word="disc" dur={0} />
      <Disappear on="slices" line="w5" word="each disc" offset={0.4} dur={0.5} />
      <Tween on="waferart" face={1} line="w5" word="ground and polished" dur={1.6} easing="easeInOut" />
      <Tween on="waferart" shine={1} line="w5" word="smooth" dur={1.6} />

      <Appear on="rings" line="w5b" word="wafers wider" dur={0.2} />
      <Tween on="waferart" rad={330} line="w5b" word="wafers wider" dur={2.6} easing="easeInOut" />

      <Tween on="waferart" cxp={1300} line="w6" word="this is" dur={1.1} easing="easeInOut" />
      <Appear on="wlabel" line="w6" word="wafer" />
      <Appear on="wsub" line="w6" word="canvas" />
    </Animation>
  </Scene>
  <Scene id="litho">
    <Line id="l1" hold={1.4}>Now comes the step that draws the circuits: photolithography.</Line>
    <Line id="l1b">Think of it as printing with light, one layer at a time.</Line>
    <Line id="l2">The wafer is coated with a light sensitive layer called photoresist.</Line>
    <Line id="l3">Light shines through a mask, a stencil that holds one layer of the design.</Line>
    <Line id="l4">A lens shrinks that pattern and focuses it onto the wafer. The light is ultraviolet, because shorter waves can draw finer detail.</Line>
    <Line id="l5">Wherever light lands, the resist changes chemically.</Line>
    <Line id="l6">The wafer is then washed in a developer, which rinses the changed resist away and leaves the pattern behind as a stencil.</Line>
    <Line id="l7">Machines repeat this across the whole wafer, stepping it under the lens one small field after another.</Line>
    <Part id="lithoart">{() => <LithoArt />}</Part>
    <Animation>
      <Appear on="lithoart" at="start" dur={0} />
      <Appear on="ltitle" line="l1" word="photolithography" />
      <Disappear on="ltitle" line="l1b" word="think" />
      <Appear on="base" line="l1b" word="layer" />

      <Appear on="resist" line="l2" word="coated" dur={0.2} />
      <Tween on="lithoart" coat={1} line="l2" word="coated" dur={1.2} />
      <Appear on="tag-resist" line="l2" word="photoresist" />

      <Appear on="lamp" line="l3" word="light" />
      <Appear on="beam-top" line="l3" word="shines" />
      <Appear on="mask" line="l3" word="mask" />
      <Appear on="tag-mask" line="l3" word="mask" />
      <Appear on="beams" line="l3" word="stencil" />

      <Appear on={["lens", "tag-lens"]} line="l4" word="lens" />
      <Tween on="lithoart" shrink={1} line="l4" word="shrinks" dur={1.6} easing="easeInOut" />
      <Appear on="tag-uv" line="l4" word="ultraviolet" />

      <Tween on="lithoart" expo={1} line="l5" word="light lands" dur={1.4} />
      <Disappear on={["lamp", "tag-uv", "beam-top", "mask", "tag-mask", "beams", "lens", "tag-lens"]} line="l6" word="wafer" dur={0.5} />
      <Tween on={["base", "resist", "tag-resist"]} y={-190} line="l6" word="washed" dur={1.2} easing="easeInOut" />
      <Tween on="lithoart" dev={1} line="l6" word="rinses" dur={1.4} easing="easeInOut" />

      <Disappear on={["base", "resist", "tag-resist"]} line="l7" word="machines" dur={0.5} />
      <Appear on="topwafer" line="l7" word="across the whole wafer" />
      <Appear on="fields" line="l7" word="stepping" dur={0.2} />
      <Tween on="lithoart" step={47} line="l7" word="stepping" dur={5.5} easing="linear" />
    </Animation>
  </Scene>
  <Scene id="etch">
    <Line id="e1">With the stencil in place, the wafer is etched.</Line>
    <Line id="e2">Plasma or acid eats away whatever the resist does not cover, carving the pattern into the surface.</Line>
    <Line id="e3">The leftover resist is then stripped off.</Line>
    <Line id="e3b">After each step, the surface is polished flat again, so the next layer lands true.</Line>
    <Line id="e4">Next comes the opposite: deposition lays down new films, such as insulator and metal, one thin layer at a time.</Line>
    <Line id="e5">Add, pattern, remove. Chipmakers repeat that cycle again and again.</Line>
    <Part id="etchart">{() => <EtchArt />}</Part>
    <Animation>
      <Appear on="etchart" at="start" dur={0} />
      <Appear on={["stack2", "resist2", "tag-base"]} line="e1" word="stencil" />
      <Appear on="ions" line="e2" word="plasma" />
      <Appear on="tag-etch" line="e2" word="plasma" />
      <Tween on="etchart" etch={1} line="e2" word="eats away" dur={2.2} easing="easeInOut" />
      <Disappear on={["ions", "tag-etch"]} line="e2" word="carving" offset={1.5} />

      <Tween on="resist2" y={-60} line="e3" word="stripped off" dur={0.8} />
      <Disappear on="resist2" line="e3" word="stripped off" dur={0.8} />

      <Appear on="pad" line="e3b" word="polished" />
      <Disappear on="pad" line="e3b" word="next layer" offset={0.6} />

      <Appear on={["films", "tag-films"]} line="e4" word="deposition" dur={0.2} />
      <Tween on="etchart" film1={1} line="e4" word="insulator" dur={1.4} />
      <Tween on="etchart" film2={1} line="e4" word="metal" dur={1.4} />

      <Disappear on={["tag-films", "tag-base"]} line="e5" word="add" dur={0.3} />
      <Tween on={["stack2", "films"]} x={-340} line="e5" word="add" dur={1.0} easing="easeInOut" />
      <Appear on="cyc-ring" line="e5" word="add" offset={0.4} />
      <Appear on="cyc-add" line="e5" word="add" offset={0.4} />
      <Appear on="cyc-pattern" line="e5" word="pattern" />
      <Appear on="cyc-remove" line="e5" word="remove" />
      <Appear on="cyc-dot" line="e5" word="repeat" />
    </Animation>
  </Scene>
  <Scene id="dope">
    <Line id="d1">Pure silicon barely conducts electricity, so its behaviour is tuned on purpose.</Line>
    <Line id="d2">Atoms such as boron and phosphorus are fired into chosen regions as ions, a step called doping.</Line>
    <Line id="d3">Some regions now carry extra electrons, while others are short of them.</Line>
    <Line id="d4">Put those regions side by side and you have a transistor: a source, a drain, and a gate between them.</Line>
    <Line id="d4b">A thin insulator separates the gate from the silicon, so the gate works through an electric field and no current enters it.</Line>
    <Line id="d5">With no voltage on the gate, no current flows. Apply a voltage, and a channel opens and current passes.</Line>
    <Line id="d6">A switch with no moving parts: off is a zero, on is a one.</Line>
    <Part id="dopeart">{() => <DopeArt />}</Part>
    <Animation>
      <Appear on="dopeart" at="start" dur={0} />
      <Appear on="sub" line="d1" word="pure silicon" />
      <Appear on="meter" line="d1" word="conducts" />

      <Tween on="dopeart" ptint={1} line="d2" word="boron" dur={1.2} />
      <Appear on="tag-b" line="d2" word="boron" />
      <Appear on={["ions", "tag-p"]} line="d2" word="phosphorus" />
      <Appear on="wells" line="d2" word="fired" dur={0.2} />
      <Tween on="dopeart" well={1} line="d2" word="fired" dur={2.0} easing="easeOut" />
      <Disappear on={["ions", "tag-p", "tag-b"]} line="d2" word="doping" />

      <Appear on="elec" line="d3" word="extra electrons" />
      <Appear on="holes" line="d3" word="short of them" />

      <Disappear on={["elec", "holes"]} line="d4" word="side by side" dur={0.4} />
      <Appear on="tag-source" line="d4" word="source" />
      <Appear on="tag-drain" line="d4" word="drain" />
      <Appear on={["gate", "tag-gate"]} line="d4" word="gate" />

      <Appear on="gate-ox" line="d4b" word="thin insulator" />
      <Appear on="field" line="d4b" word="electric field" />

      <Disappear on="field" line="d5" word="with no voltage" dur={0.3} />
      <Appear on="vsrc" line="d5" word="no voltage" />
      <Tween on="dopeart" v={1} line="d5" word="apply a voltage" dur={1.2} />
      <Appear on={["channel", "flow"]} line="d5" word="a channel" dur={0.2} />

      <Tween on="dopeart" v={0} line="d6" word="off" dur={0.6} />
      <Appear on="bit" line="d6" word="zero" />
      <Tween on="dopeart" v={1} line="d6" word="on is a one" dur={0.6} />
    </Animation>
  </Scene>
  <Scene id="wire">
    <Line id="r1">A modern processor holds billions of these switches, but on their own they do nothing.</Line>
    <Line id="r2">They must be wired together.</Line>
    <Line id="r3">Above the transistors, layer after layer of metal wiring is built, each layer insulated from the next and joined to it by tiny vertical connections.</Line>
    <Line id="r3b">Copper is the usual metal, wrapped in a thin barrier so that it cannot leak into the silicon.</Line>
    <Line id="r4">Fine wires near the bottom link neighbouring transistors, while wider wires higher up carry signals across the whole chip.</Line>
    <Line id="r5">It is a city of roads, stacked many floors high.</Line>
    <Part id="wireart">{() => <WireArt />}</Part>
    <Animation>
      <Appear on="wireart" at="start" dur={0} />
      <Appear on="ly-0" line="r1" word="billions" dur={1.2} />
      <Appear on="vias-0" line="r2" word="wired" />
      <Appear on="ly-1" line="r2" word="wired" offset={0.3} />

      <Appear on={["ly-2", "ly-3", "ly-4", "ly-5"]} stagger={0.9} line="r3" word="layer after layer" />
      <Appear on={["vias-1", "vias-2", "vias-3", "vias-4"]} stagger={0.9} line="r3" word="layer after layer" offset={0.3} />

      <Appear on="xs" line="r3b" word="thin barrier" />
      <Disappear on="xs" line="r4" word="fine wires" dur={0.3} />

      <Appear on="tag-fine" line="r4" word="fine wires" />
      <Appear on="tag-wide" line="r4" word="wider wires" />

      <Disappear on={["tag-fine", "tag-wide"]} line="r5" word="city" dur={0.4} />
      <Tween on="wireart" gz={58} line="r5" word="stacked many floors high" dur={2.4} easing="easeInOut" />
    </Animation>
  </Scene>
  <Scene id="test">
    <Line id="t1" hold={1.4}>When the last layer is done, the wafer carries a grid of identical chips, called dies.</Line>
    <Line id="t2">Tiny probes touch each die and run electrical tests.</Line>
    <Line id="t2b">Even in the cleanest factory a single speck of dust can ruin a die, which is why fabs are cleanrooms where people wear full suits.</Line>
    <Line id="t3">Dies that fail are marked, because no wafer is perfect.</Line>
    <Line id="t4">A saw then cuts the wafer apart, and only the good dies move on.</Line>
    <Part id="testart">{() => <TestArt />}</Part>
    <Animation>
      <Appear on="testart" at="start" dur={0} />
      <Appear on="tw" line="t1" word="wafer" />
      <Appear on="dies" line="t1" word="grid of identical chips" dur={0.8} />
      <Appear on="t-tag" line="t1" word="dies" />

      <Disappear on="t-tag" line="t2" word="tiny probes" dur={0.3} />
      <Appear on="probe" line="t2" word="probes" dur={0.2} />
      <Tween on="testart" scan={85} line="t2" word="touch each die" dur={8} easing="linear" />

      <Appear on="dust" line="t2b" word="speck of dust" />
      <Tween on="testart" dust={1} line="t2b" word="speck of dust" dur={1.2} easing="easeIn" />
      <Disappear on="probe" line="t2b" word="fabs" dur={0.3} />
      <Disappear on="dust" line="t2b" word="cleanrooms" dur={0.4} />

      <Appear on="marks" line="t3" word="fail" stagger={0} />

      <Appear on="cutlines" line="t4" word="saw" dur={0.2} />
      <Tween on="testart" cut={1} line="t4" word="saw" dur={1.8} easing="linear" />
      <Tween on="testart" sep={1} line="t4" word="cuts the wafer apart" dur={1.6} easing="easeInOut" />
      <Tween on="testart" solo={1} line="t4" word="good dies" dur={1.6} easing="easeInOut" />
    </Animation>
  </Scene>
  <Scene id="pack">
    <Line id="p1">A bare die is fragile, and far too small to plug into anything.</Line>
    <Line id="p2">So it is mounted on a package, and fine wires link the die to the package's contacts.</Line>
    <Line id="p3" hold={1.6}>A cover seals it, often with a metal heat spreader that carries the warmth away.</Line>
    <Line id="p3b">Underneath, a field of metal contacts connects the package to the board of a computer.</Line>
    <Line id="p4" hold={2.6}>The finished processor is tested once more, at speed and at temperature.</Line>
    <Line id="p5">From a handful of sand to the brain of a computer, in a long chain of precise steps.</Line>
    <Part id="packart">{() => <PackArt />}</Part>
    <Animation>
      <Appear on="packart" at="start" dur={0} />
      <Set on="lid" y={-240} at="start" />
      <Appear on="pk-die" line="p1" word="bare die" dur={0.8} />

      <Appear on="pkg" line="p2" word="package" />
      <Tween on="packart" ds={0.66} line="p2" word="mounted" dur={1.0} easing="easeInOut" />
      <Appear on="wires" line="p2" word="fine wires" dur={0.1} />
      <Tween on="packart" bw={1} line="p2" word="fine wires" dur={2.0} easing="easeInOut" />

      <Appear on="lid" line="p3" word="cover" dur={0.3} />
      <Tween on="lid" y={0} line="p3" word="cover" dur={1.0} easing="easeOutQuart" />
      <Appear on="lid-tag" line="p3" word="heat spreader" />
      <Appear on="heat" line="p3" word="warmth" />
      <Disappear on={["heat", "lid-tag"]} line="p3b" word="underneath" dur={0.3} />
      <Tween on="packart" flip={1} line="p3b" word="underneath" dur={1.4} easing="easeInOut" />
      <Appear on="bottom" line="p3b" word="underneath" />

      <Tween on="packart" flip={0} line="p4" word="finished" dur={1.4} easing="easeInOut" />
      <Appear on="dial" line="p4" word="speed" />
      <Tween on="packart" spd={1} line="p4" word="speed" dur={1.6} />
      <Appear on="thermo" line="p4" word="temperature" />
      <Tween on="packart" tmp={1} line="p4" word="temperature" dur={1.6} />
      <Appear on="check" line="p4" word="temperature" offset={1.6} dur={0.1} />
      <Tween on="packart" chk={1} line="p4" word="temperature" offset={1.7} dur={0.8} />

      <Disappear on={["dial", "thermo"]} line="p5" word="handful" dur={0.4} />
      <Tween on="packart" shift={300} line="p5" word="handful" dur={1.0} easing="easeInOut" />
      <Appear on="sand-end" line="p5" word="sand" />
      <Appear on="end-arrow" line="p5" word="brain" />
    </Animation>
  </Scene>
</Doc>;
