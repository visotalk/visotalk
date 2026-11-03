import {Doc, Asset, Scene, Line, Part, Animation, Appear, Disappear, Tween, Set, Sound} from '@visotalk/jsx';
import {useProp, useAsset, useDocTime, Obj, Video} from '@visotalk/runtime';
import {Lockup} from './parts/lockup.tsx';
import {Asks, Wall} from './parts/hook.tsx';

/*
 * Can a cheap model make an explainer worth sharing? Opus wrote four motions down, DeepSeek made four films with them, and this film shows each next to
 * the Opus sample it learned from, flaws included. The clips and stills under media/ are those films and samples, rendered without their captions,
 * cut to the seconds played and otherwise unchanged. The series' second film: the ground, the type and the music are examples/visotalk-intro's; the opening is the first promo's, with other makers' films among ours.
 */

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (t: number) => {const x = clamp(t); return x * x * (3 - 2 * x);};
const tint = (c: string, pct: number) => `color-mix(in srgb, ${c} ${pct}%, transparent)`;

const SANS = 'var(--vt-sans)';
const MONO = 'var(--vt-mono)';
const TEXT = 'var(--vt-text)';
const MUTED = 'var(--vt-muted)';
const FAINT = 'var(--vt-faint)';
const PANEL = 'var(--vt-panel)';
const BORDER = 'var(--vt-border)';
const CUE = 'var(--vt-grad)';
const DATA = 'var(--vt-data)';
const GOOD = 'var(--vt-good)';
const BAD = 'var(--vt-bad)';
const VIOLET = 'var(--vt-op)';
const AMBER = 'var(--vt-warn)';
const BG = 'var(--vt-bg)';

const FULL = {position: 'absolute', inset: 0} as const;
const CENTER = {...FULL, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'} as const;

// ---- the frame every scene sits in ----------------------------------------------------

function Backdrop() {
  const t = useDocTime();
  const bloom = (cx: number, cy: number, color: string, a: number) => `radial-gradient(ellipse 46% 56% at ${cx}% ${cy}%, color-mix(in srgb, ${color} ${a}%, transparent) 0%, transparent 100%)`;
  return (
    <div style={{...FULL, background: [
      `radial-gradient(${tint(TEXT, 7)} 1.5px, transparent 1.6px) 0 0 / 48px 48px`,
      bloom(22 + 10 * Math.sin(t * 0.06), 28 + 8 * Math.cos(t * 0.05), DATA, 16),
      bloom(80 + 8 * Math.cos(t * 0.05), 74 + 10 * Math.sin(t * 0.07), VIOLET, 14),
      BG,
    ].join(', ')}} />
  );
}

/** The mark in the corner: it stays away until VisoTalk has been introduced, then draws itself */
function Badge() {
  return <div style={{opacity: 0.8}}><Lockup width={200} draw={useProp('draw', 0)} /></div>;
}

function Chapter() {
  const n = useProp('n', '01');
  const name = useProp('name', '问题');
  return (
    <div style={{...FULL, display: 'flex', alignItems: 'center', gap: 16, fontFamily: MONO, fontSize: 24, letterSpacing: '0.08em'}}>
      <span style={{color: CUE}}>{n}</span>
      <span style={{width: 28, height: 2, background: FAINT}} />
      <span style={{color: MUTED, fontFamily: SANS}}>{name}</span>
    </div>
  );
}

const Window = ({children, title, width}: {children: React.ReactNode; title?: string; width: number}) => (
  <div style={{width, borderRadius: 18, background: PANEL, border: `2px solid ${BORDER}`, boxShadow: '0 40px 100px rgba(0,0,0,0.45)'}}>
    <div style={{display: 'flex', alignItems: 'center', gap: 10, padding: '18px 22px'}}>
      {['#ff6b6b', '#ffd166', '#4ade80'].map((c) => <span key={c} style={{width: 13, height: 13, borderRadius: 7, background: c, opacity: 0.8}} />)}
      {title && <span style={{marginLeft: 14, fontFamily: MONO, fontSize: 22, color: MUTED}}>{title}</span>}
    </div>
    {children}
  </div>
);

// ---- 01: the question -------------------------------------------------------------------

const Poster = ({asset, w, style}: {asset: string; w: number; style?: React.CSSProperties}) => (
  <img src={useAsset(asset)} style={{display: 'block', width: w, height: w * 9 / 16, objectFit: 'cover', borderRadius: 10, border: `2px solid ${BORDER}`, ...style}} />
);

const SERIF = '"Noto Serif SC", serif';
const GOOD_HEX = '#4ade80';
const EMBER = '#ff9a4d', ICE = '#7fdcff', NIGHT_A = '#0a1230', NIGHT_B = '#1c2c5e';

/** One plain, correct slide. As the narration names them, colour, type and camera each change it, in front of the viewer */
function Specimen() {
  const c = smooth(useProp('c', 0));
  const f = smooth(useProp('f', 0));
  const k = smooth(useProp('k', 0));
  const t = useDocTime();
  const W = 1040, H = 585;
  const fx = 800, fy = 372; // the focus the camera pushes in on
  const rays = [-92, -46, 0, 46, 92];
  const LX = 500; // the lens
  return (
    <div style={{position: 'absolute', left: 96, top: 130, width: W, height: H, borderRadius: 14, overflow: 'hidden', border: `2px solid ${tint(TEXT, 18 + 12 * c)}`, boxShadow: `0 40px 120px rgba(0,0,0,${0.25 + 0.4 * c})`, background: '#f4f4f2'}}>
      <div style={{position: 'absolute', inset: 0, opacity: c, background: `radial-gradient(ellipse 70% 80% at 62% 60%, ${NIGHT_B}, ${NIGHT_A} 75%)`}} />
      <div style={{position: 'absolute', inset: 0, transformOrigin: `${fx}px ${fy}px`, transform: `scale(${1 + 0.75 * k})`}}>
        <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
          <defs>
            <linearGradient id="glass" x1="0" x2="1"><stop offset="0%" stopColor="#ffffff" stopOpacity={0.05} /><stop offset="50%" stopColor="#bfe9ff" stopOpacity={0.32} /><stop offset="100%" stopColor="#ffffff" stopOpacity={0.06} /></linearGradient>
            <filter id="glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="5" /></filter>
            <radialGradient id="focus"><stop offset="0%" stopColor="#fff" stopOpacity={0.95} /><stop offset="35%" stopColor={EMBER} stopOpacity={0.6} /><stop offset="100%" stopColor={EMBER} stopOpacity={0} /></radialGradient>
          </defs>
          {rays.map((d, i) => {
            const col = i < 2 ? EMBER : i > 2 ? ICE : '#ffffff';
            const path = `M90 ${fy} L${LX} ${fy + d} L${fx} ${fy}`;
            return (
              <g key={d}>
                <path d={path} fill="none" stroke="#9a9a9a" strokeWidth={2} opacity={1 - c} />
                <path d={path} fill="none" stroke={col} strokeWidth={8} opacity={0.3 * c} filter="url(#glow)" />
                <path d={path} fill="none" stroke={col} strokeWidth={2.2} opacity={c} />
                <path d={path} fill="none" stroke="#fff" strokeWidth={3.2} strokeLinecap="round" pathLength={100} strokeDasharray="1.2 24" strokeDashoffset={-t * 14 - i * 5} opacity={c * 0.95} />
              </g>
            );
          })}
          <path d={`M${LX} ${fy - 140} Q${LX + 62} ${fy} ${LX} ${fy + 140} Q${LX - 62} ${fy} ${LX} ${fy - 140}Z`} fill={`url(#glass)`} stroke={c > 0.5 ? '#cfefff' : '#8c8c8c'} strokeWidth={2} />
          <circle cx={fx} cy={fy} r={66 + 5 * Math.sin(t * 2.2)} fill="url(#focus)" opacity={c} />
          <circle cx={fx} cy={fy} r={4} fill={c > 0.5 ? '#fff' : '#666'} />
        </svg>
        <div style={{position: 'absolute', left: 44, bottom: 30, fontFamily: 'Arial, sans-serif', fontSize: 25, lineHeight: 1.6, color: '#555', opacity: 1 - c}}>• 光经过透镜时发生折射<br />• 光线汇聚于焦点</div>
        <div style={{position: 'absolute', left: fx - 150, top: fy + 92, width: 300, textAlign: 'center', fontFamily: MONO, fontSize: 20, letterSpacing: '0.12em', color: '#fff', opacity: f * (1 - k * 0.3)}}>FOCUS</div>
      </div>
      {/* the title stays still above the camera: first as a slide's, then set */}
      <div style={{position: 'absolute', left: 44, top: 34, fontFamily: 'Arial, sans-serif', fontSize: 40, color: '#333', opacity: 1 - Math.max(c, f)}}>光为什么会弯</div>
      <div style={{position: 'absolute', left: 44, top: 34, fontFamily: 'Arial, sans-serif', fontSize: 40, color: '#e8eefc', opacity: c * (1 - f)}}>光为什么会弯</div>
      <div style={{position: 'absolute', left: 56, top: 24, fontFamily: SERIF, fontWeight: 900, fontSize: 58, letterSpacing: '0.01em', color: '#fff', opacity: f, transform: `translateY(${(1 - f) * 14}px)`, textShadow: '0 4px 24px rgba(0,0,0,0.7)'}}>光，为什么会弯</div>
      {/* the viewfinder, once a camera is what is being talked about */}
      <svg width={W} height={H} style={{position: 'absolute', inset: 0, opacity: k}}>
        {[[18, 18, 1, 1], [W - 18, 18, -1, 1], [18, H - 18, 1, -1], [W - 18, H - 18, -1, -1]].map(([x, y, a, b]) => <path key={`${x}${y}`} d={`M${x} ${y + 44 * b}V${y}H${x + 44 * a}`} fill="none" stroke="#fff" strokeWidth={3} opacity={0.85} />)}
      </svg>
    </div>
  );
}

/** One thing taste is made of: its name, a sample of it, and the line it becomes when it is written down */
function TasteRow({id, name, spec, typed, draw, children}: {id: string; name: string; spec: string; typed: number; draw: number; children: React.ReactNode}) {
  return (
    <Obj id={id} style={{position: 'relative', height: 122, borderTop: `2px solid ${tint(TEXT, 22)}`, boxSizing: 'border-box', paddingTop: 18, clipPath: `inset(0 ${(1 - smooth(draw)) * 100}% 0 0)`}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 54}}>
        <span style={{fontFamily: SERIF, fontWeight: 700, fontSize: 42, color: TEXT}}>{name}</span>
        {children}
      </div>
      <div style={{marginTop: 8, fontFamily: MONO, fontSize: 23, color: DATA, whiteSpace: 'pre'}}>{spec.slice(0, Math.round(typed * spec.length))}{typed > 0 && typed < 1 && <span style={{color: CUE}}>▍</span>}</div>
    </Obj>
  );
}

function Taste() {
  const rule = smooth(useProp('rule', 0));
  const t0 = clamp(useProp('t0', 0)), t1 = clamp(useProp('t1', 0)), t2 = clamp(useProp('t2', 0));
  const r0 = useProp('r0', 0), r1 = useProp('r1', 0), r2 = useProp('r2', 0), run = smooth(useProp('k', 0));
  const SWATCH = [NIGHT_A, NIGHT_B, EMBER, ICE, '#ffffff'];
  return (
    <div style={FULL}>
      <Specimen />
      <div style={{position: 'absolute', left: 96, top: 738, display: 'flex', gap: 48, fontFamily: SANS, fontWeight: 600, fontSize: 36, color: GOOD}}>
        <Obj id="taste-a">✓ 会写代码</Obj>
        <Obj id="taste-b">✓ 讲得清道理</Obj>
      </div>
      <div style={{position: 'absolute', left: 1210, top: 118, width: 614}}>
        <Obj id="taste-word" style={{fontFamily: SERIF, fontWeight: 900, fontSize: 168, lineHeight: 1.12, letterSpacing: '0.02em', color: TEXT}}>审美</Obj>
        <div style={{height: 4, width: `${rule * 100}%`, background: CUE, margin: '10px 0 26px'}} />
        <TasteRow id="taste-0" name="配色" spec="ember / ice on deep night" typed={t0} draw={r0}>
          <div style={{display: 'flex', gap: 10}}>{SWATCH.map((c) => <span key={c} style={{width: 38, height: 38, borderRadius: 19, background: c, border: `1px solid ${tint(TEXT, 30)}`}} />)}</div>
        </TasteRow>
        <TasteRow id="taste-1" name="字体" spec="serif 900 / mono, never default" typed={t1} draw={r1}>
          <span style={{fontSize: 46, color: TEXT}}><span style={{fontFamily: 'Arial, sans-serif', color: MUTED, textDecoration: 'line-through'}}>光</span><span style={{margin: '0 14px', color: FAINT}}>→</span><span style={{fontFamily: SERIF, fontWeight: 900}}>光</span></span>
        </TasteRow>
        <TasteRow id="taste-2" name="镜头" spec="hold, push in on the word, hold" typed={t2} draw={r2}>
          <svg width={230} height={40}><line x1={4} y1={20} x2={226} y2={20} stroke={tint(TEXT, 30)} strokeWidth={2} /><line x1={70} y1={20} x2={160} y2={20} stroke={CUE} strokeWidth={4} /><circle cx={70 + 90 * run} cy={20} r={9} fill={CUE} /></svg>
        </TasteRow>
        <Obj id="taste-ask" style={{marginTop: 8, paddingTop: 18, borderTop: `2px solid ${tint(TEXT, 22)}`, fontFamily: SERIF, fontWeight: 900, fontSize: 48, lineHeight: 1.3, color: CUE}}>能写成一套风格，<br />让别的模型复用吗？</Obj>
      </div>
    </div>
  );
}

// ---- 02: the experiment -------------------------------------------------------------------

const STYLES = [
  {asset: 'poster-night-diagram', name: 'Night Diagram', kind: '2D', q: '神经细胞放电的那一瞬'},
  {asset: 'poster-earth-block', name: 'Earth Block', kind: '2.5D', q: '街道下面埋着什么'},
  {asset: 'poster-plumb-line', name: 'Plumb Line', kind: '2D', q: '大气层有多高'},
  {asset: 'poster-light-bench', name: 'Light Bench', kind: '3D', q: '镜头怎么成像'},
];

/** The four first lines of a style file, the real ones of Night Diagram's MOTION.md, typed in */
const STYLE_MD = [
  '# Night Diagram',
  '',
  'A science diagram at night: one big',
  'glowing subject in a deep blue field,',
  'and around it the instruments of',
  'someone measuring it.',
  '',
  '- Light is the event.',
  '- Instruments are thin and quiet.',
  '- Scale is how it impresses.',
];
function StyleFile() {
  const typed = useProp('typed', 0);
  const all = STYLE_MD.join('\n');
  const shown = all.slice(0, Math.round(typed * all.length));
  return (
    <div style={{...FULL, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 60}}>
      <Window title="MOTION.md" width={800}>
        <div style={{height: 520, padding: '10px 36px', fontFamily: MONO, fontSize: 30, lineHeight: 1.6, color: TEXT, whiteSpace: 'pre'}}>{shown}<span style={{color: CUE, opacity: typed < 1 ? 1 : 0}}>▍</span></div>
        <div style={{padding: '0 36px 26px', fontFamily: MONO, fontSize: 26, color: AMBER}}>&lt; 8,000 bytes</div>
      </Window>
      <Obj id="style-posters" style={{display: 'grid', gridTemplateColumns: 'repeat(2, 400px)', gap: 24}}>
        {STYLES.map((s) => (
          <div key={s.asset}>
            <Poster asset={s.asset} w={400} />
            <div style={{marginTop: 10, fontFamily: MONO, fontSize: 24, color: MUTED}}>{s.name}</div>
          </div>
        ))}
      </Obj>
    </div>
  );
}

/** Opus's styles handed to DeepSeek, and the four questions it had not seen */
function Handoff() {
  return (
    <div style={{...CENTER, gap: 56}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 40, fontFamily: MONO, fontSize: 44}}>
        <span style={{padding: '14px 36px', borderRadius: 14, border: `2px solid ${VIOLET}`, color: TEXT}}>Claude Opus 5.5</span>
        <span style={{fontFamily: SANS, fontSize: 32, color: MUTED}}>写风格</span>
        <span style={{color: FAINT}}>→</span>
        <span style={{fontFamily: SANS, fontSize: 32, color: MUTED}}>照着做</span>
        <Obj id="hand-ds" style={{padding: '14px 36px', borderRadius: 14, border: `2px solid ${CUE}`, color: TEXT}}>DeepSeek V4.1 Flash</Obj>
      </div>
      <div style={{display: 'flex', gap: 30}}>
        {STYLES.map((s, i) => (
          <Obj key={s.asset} id={`hand-${i}`} style={{width: 410, boxSizing: 'border-box'}}>
            <Poster asset={s.asset} w={410} />
            <div style={{marginTop: 18, fontFamily: SANS, fontWeight: 700, fontSize: 36, lineHeight: 1.3, color: TEXT}}>{s.q}</div>
            <div style={{marginTop: 8, fontFamily: MONO, fontSize: 26, color: MUTED}}>{s.kind}</div>
          </Obj>
        ))}
      </div>
    </div>
  );
}

/**
 * The style and the film made with it. `split` 0: the Opus sample alone, large. `split` 1: it moves left and DeepSeek's film comes up beside it, on its own
 * scene clock, with what it cost underneath.
 */
function Compare({opus, opusIn, opusRate, topic, ds, dsIn, dsRate, motion, kind, q, cost, took}: {opus: string; opusIn: number; opusRate: number; topic: string; ds?: string; dsIn?: number; dsRate?: number; motion: string; kind: string; q: string; cost: string; took: string}) {
  const split = smooth(useProp('split', 0));
  const w = 1296 + (880 - 1296) * split, h = w * 9 / 16, x = 312 + (64 - 312) * split, y = 150 + (200 - 150) * split;
  const label = (head: string, c: string, rest: string) => (
    <div style={{display: 'flex', alignItems: 'baseline', gap: 18, whiteSpace: 'nowrap'}}>
      <span style={{fontFamily: MONO, fontWeight: 700, fontSize: 34, color: c}}>{head}</span>
      <span style={{fontFamily: SANS, fontSize: 32, color: TEXT}}>{rest}</span>
    </div>
  );
  return (
    <div style={FULL}>
      <div style={{position: 'absolute', left: x, top: y - 56}}>{label('Claude Opus 5.5', VIOLET, `${motion} · ${topic}`)}</div>
      <div style={{position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: 14, overflow: 'hidden', border: `2px solid ${VIOLET}`, background: '#000'}}>
        <Video asset={opus} in={opusIn} rate={opusRate} fit="cover" />
      </div>
      {ds && (
        <div style={{opacity: split}}>
          <div style={{position: 'absolute', left: 976, top: 144}}>{label('DeepSeek V4.1 Flash', CUE, q)}</div>
          <div style={{position: 'absolute', left: 976, top: 200, width: 880, height: 495, borderRadius: 14, overflow: 'hidden', border: `2px solid ${CUE}`, background: '#000'}}>
            <Video asset={ds} in={dsIn} rate={dsRate} fit="cover" />
          </div>
          <div style={{position: 'absolute', left: 976, top: 720, display: 'flex', gap: 56, fontFamily: MONO, fontSize: 38}}>
            <span style={{color: CUE}}>{kind}</span><span style={{color: GOOD}}>{cost}</span><span style={{color: MUTED}}>{took}</span>
          </div>
          <div style={{position: 'absolute', left: 64, top: 720, fontFamily: SANS, fontSize: 32, color: MUTED}}>风格，是 Claude Opus 5.5 给的</div>
        </div>
      )}
    </div>
  );
}

/** What the four finished films cost, as the benchmark harness reported over their runs */
const COSTS: Array<[string, string]> = [
  ['Night Diagram', '$0.089'], ['Earth Block', '$0.136'], ['Plumb Line', '$0.139'], ['Light Bench', '$0.211'],
];
function Bill() {
  const rows = useProp('rows', 0);
  const total = useProp('total', 0);
  return (
    <div style={CENTER}>
      <div style={{width: 920}}>
        {COSTS.map(([a, b], i) => (
          <div key={a} style={{display: 'flex', justifyContent: 'space-between', padding: '16px 0', borderBottom: `2px solid ${BORDER}`, opacity: smooth(rows * COSTS.length - i), fontSize: 42}}>
            <span style={{fontFamily: MONO, color: TEXT}}>{a}</span>
            <span style={{fontFamily: MONO, color: MUTED}}>{b}</span>
          </div>
        ))}
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 34, opacity: total}}>
          <span style={{fontFamily: SANS, fontSize: 40, color: MUTED}}>配音另算</span>
          <span style={{fontFamily: MONO, fontWeight: 700, fontSize: 104, color: CUE}}>$0.58</span>
        </div>
      </div>
    </div>
  );
}

// ---- 03: the honest part --------------------------------------------------------------------

/** A still of a film with the flaw ringed */
function Flaw({asset, x, y, rx, ry, note}: {asset: string; x: number; y: number; rx: number; ry: number; note: string}) {
  const ring = useProp('ring', 0);
  // the ring is in the film's own 1920 × 1080; the still is shown at the frame's 1296 wide
  const k = 1296 / 1920;
  return (
    <div style={FULL}>
      <div style={{position: 'absolute', left: 312, top: 128, width: 1296, height: 729, borderRadius: 14, overflow: 'hidden', border: `2px solid ${BORDER}`}}>
        <img src={useAsset(asset)} style={{width: '100%', height: '100%', display: 'block'}} />
        <svg width={1296} height={729} style={{position: 'absolute', inset: 0}}>
          <ellipse cx={x * k} cy={y * k} rx={rx * k} ry={ry * k} fill="none" stroke={BAD} strokeWidth={6} pathLength={1} strokeDasharray={`${ring} 1`} />
        </svg>
      </div>
      <div style={{position: 'absolute', left: 312, top: 76, fontFamily: SANS, fontWeight: 700, fontSize: 36, color: BAD, opacity: ring}}>{note}</div>
    </div>
  );
}

/** What one round proves, large; and what more rounds would buy, as a staircase that is drawn as an illustration and carries no measured height */
function Caveats() {
  const climb = useProp('climb', 0);
  const stat = (id: string, n: string, text: string, c: string) => (
    <Obj id={id} style={{display: 'flex', alignItems: 'center', gap: 44, padding: '28px 0', borderTop: `2px solid ${tint(TEXT, 22)}`}}>
      <span style={{width: 150, fontFamily: SERIF, fontWeight: 900, fontSize: 170, lineHeight: 1, color: c}}>{n}</span>
      <span style={{fontFamily: SERIF, fontWeight: 700, fontSize: 54, lineHeight: 1.3, color: TEXT}}>{text}</span>
    </Obj>
  );
  const STEP_W = 170, BASE = 790, STEP_H = [110, 200, 300, 410];
  return (
    <div style={FULL}>
      <div style={{position: 'absolute', left: 96, top: 210, width: 800}}>
        {stat('cav-0', '1', '每种风格，只跑了一次', CUE)}
        {stat('cav-1', '4', '个题目，都是我们挑的', DATA)}
      </div>
      <div style={{position: 'absolute', left: 1020, top: 0, width: 800, height: 1080}}>
        {STEP_H.map((h, i) => {
          const on = i === 0 ? 1 : smooth(climb * 3 - (i - 1));
          return (
            <div key={i} style={{position: 'absolute', left: i * (STEP_W + 14), top: BASE - h * on, width: STEP_W, height: h * on, boxSizing: 'border-box', borderRadius: '10px 10px 0 0', opacity: on,
              background: i === 0 ? `linear-gradient(${tint(CUE, 55)}, ${tint(CUE, 12)})` : tint(TEXT, 5), border: i === 0 ? `2px solid ${CUE}` : `2px dashed ${tint(TEXT, 35)}`, borderBottom: 'none'}}>
              <div style={{position: 'absolute', left: 0, right: 0, top: 16, textAlign: 'center', fontFamily: SANS, fontWeight: 700, fontSize: 30, color: i === 0 ? '#fff' : MUTED}}>第 {i + 1} 轮</div>
            </div>
          );
        })}
        <Obj id="cav-here" style={{position: 'absolute', left: 0, top: BASE - 170, width: STEP_W, textAlign: 'center', fontFamily: SANS, fontWeight: 700, fontSize: 28, color: CUE}}>这次</Obj>
        <div style={{position: 'absolute', left: 0, top: BASE, width: 4 * STEP_W + 42, height: 2, background: tint(TEXT, 40)}} />
        <Obj id="cav-cost" style={{position: 'absolute', left: 0, top: BASE + 18, whiteSpace: 'nowrap'}}>
          <span style={{fontFamily: MONO, fontWeight: 700, fontSize: 40, color: GOOD}}>$0.14</span>
          <span style={{marginLeft: 16, fontFamily: SANS, fontSize: 28, color: MUTED}}>这次平均做一支 · 台阶为示意</span>
        </Obj>
      </div>
    </div>
  );
}

const Headline = () => (
  <div style={CENTER}>
    <div style={{fontFamily: SANS, fontWeight: 800, fontSize: 150, letterSpacing: '-0.02em', color: TEXT}}>审美，<span style={{color: CUE}}>可以写下来</span>。</div>
  </div>
);

/** The verdict, row by row: what the four films support */
function Verdict() {
  const rows = [
    {id: 'v-2d', kind: '2D', asset: 'poster-night-diagram', say: '完全可以', c: GOOD, mark: '✓'},
    {id: 'v-25d', kind: '2.5D', asset: 'poster-earth-block', say: '也可以', c: GOOD, mark: '✓'},
    {id: 'v-3d', kind: '3D', asset: 'poster-light-bench', say: '呢？', c: AMBER, mark: '?'},
  ];
  return (
    <div style={{...CENTER, gap: 34}}>
      {rows.map((r) => (
        <Obj key={r.id} id={r.id} style={{display: 'flex', alignItems: 'center', gap: 60, width: 1300}}>
          <Poster asset={r.asset} w={360} />
          <span style={{width: 240, fontFamily: MONO, fontWeight: 700, fontSize: 88, color: TEXT}}>{r.kind}</span>
          <span style={{flex: 1, fontFamily: SANS, fontWeight: 700, fontSize: 64, color: r.c}}>{r.say}</span>
          <span style={{fontFamily: MONO, fontWeight: 700, fontSize: 96, color: r.c}}>{r.mark}</span>
        </Obj>
      ))}
    </div>
  );
}

/** The 3D film playing, with what it got right and what it did not */
function ThreeD() {
  const tag = (id: string, s: string, c: string) => <Obj id={id} style={{fontFamily: SANS, fontWeight: 700, fontSize: 46, color: c}}>{s}</Obj>;
  return (
    <div style={FULL}>
      <div style={{position: 'absolute', left: 96, top: 128, width: 1296, height: 729, borderRadius: 14, overflow: 'hidden', border: `2px solid ${BORDER}`, background: '#000'}}>
        <Video asset="bench" in={27} rate={1.5} fit="cover" />
      </div>
      <div style={{position: 'absolute', left: 1450, top: 220, display: 'flex', flexDirection: 'column', gap: 54}}>
        {tag('t-obj', '✓ 物体', GOOD)}
        {tag('t-ray', '✓ 光路', GOOD)}
        {tag('t-cam', '✗ 镜头', BAD)}
        {tag('t-exp', '✗ 曝光', BAD)}
      </div>
    </div>
  );
}

/** One question and one model, side by side: no style on the left, a style on the right, which comes up on its word */
function Own({left, leftIn = 0, leftHead, right, rightIn = 0, rightHead, rate = 1, rightId, children}: {left: string; leftIn?: number; leftHead: string; right: string; rightIn?: number; rightHead: string; rate?: number; rightId: string; children?: React.ReactNode}) {
  const pane = (asset: string, from: number, head: string, c: string, x: number) => (
    <div style={{position: 'absolute', left: x, top: 170}}>
      <div style={{fontFamily: SANS, fontWeight: 700, fontSize: 38, color: c, marginBottom: 18}}>{head}</div>
      <div style={{width: 880, height: 495, borderRadius: 14, overflow: 'hidden', border: `2px solid ${c}`, background: '#000'}}><Video asset={asset} in={from} rate={rate} fit="cover" /></div>
    </div>
  );
  return (
    <div style={FULL}>
      {pane(left, leftIn, leftHead, DATA, 64)}
      <Obj id={rightId}>{pane(right, rightIn, rightHead, CUE, 976)}</Obj>
      {children}
    </div>
  );
}

const TryModels = () => (
  <Obj id="own-try" style={{position: 'absolute', left: 0, right: 0, top: 780, display: 'flex', justifyContent: 'center', gap: 22, fontFamily: MONO, fontSize: 34, color: TEXT}}>
    {['DeepSeek', 'GLM', 'MiniMax', 'Kimi', 'Qwen'].map((m) => <span key={m} style={{padding: '8px 28px', borderRadius: 999, border: `2px solid ${BORDER}`}}>{m}</span>)}
    <span style={{padding: '8px 28px', borderRadius: 999, border: `2px solid ${CUE}`, color: CUE, fontFamily: SANS}}>你的模型？</span>
  </Obj>
);

/** What the style wrote down, pinned on the film's own frame; and what it could not: where the camera goes, a path with no answer */
function Writable() {
  const orbit = smooth(useProp('orbit', 0));
  const pinIn = smooth(useProp('pins', 0));
  const t = useDocTime();
  const FW = 1180, FH = FW * 9 / 16, K = FW / 1920; // the frame's size, and the still's own pixels to it
  const pin = (x: number, y: number, label: string, dx: number, dy: number) => (
    <g opacity={pinIn}>
      <circle cx={x * K} cy={y * K} r={7} fill={GOOD_HEX} />
      <circle cx={x * K} cy={y * K} r={14 + 3 * Math.sin(t * 2)} fill="none" stroke={GOOD_HEX} strokeWidth={2} opacity={0.6} />
      <line x1={x * K} y1={y * K} x2={x * K + dx} y2={y * K + dy} stroke={GOOD_HEX} strokeWidth={2} />
      <text x={x * K + dx} y={y * K + dy + (dy < 0 ? -12 : 36)} textAnchor="middle" fontFamily="var(--vt-sans)" fontWeight={700} fontSize={32} fill="#fff">{label}</text>
    </g>
  );
  // the camera goes round the bench, stops, and asks again
  const cx = 860 * K, cy = 500 * K, rx = 760 * K, ry = 330 * K;
  const steps = t * 0.45, stop = Math.floor(steps), a = -2.4 + (stop + smooth((steps - stop) * 1.8)) * 1.15;
  const camX = cx + rx * Math.cos(a), camY = cy + ry * Math.sin(a), toward = Math.atan2(cy - camY, cx - camX) * 180 / Math.PI;
  return (
    <div style={FULL}>
      <div style={{position: 'absolute', left: 96, top: 120, width: FW, height: FH, borderRadius: 14, overflow: 'hidden', border: `2px solid ${tint(TEXT, 22)}`, boxShadow: '0 40px 120px rgba(0,0,0,0.55)', background: '#000'}}>
        <img src={useAsset('bench-still')} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 1 - 0.28 * orbit}} />
        <svg width={FW} height={FH} style={{position: 'absolute', inset: 0}}>
          {pin(1088, 460, '玻璃', -150, -190)}
          {pin(1090, 610, '钢', -210, 90)}
          {pin(1288, 392, '光路', 90, -160)}
          <g opacity={orbit}>
            <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke={EMBER} strokeWidth={3} strokeDasharray="10 14" strokeDashoffset={-t * 18} />
            <g transform={`translate(${camX} ${camY}) rotate(${toward})`}>
              <rect x={-30} y={-20} width={46} height={40} rx={7} fill={EMBER} />
              <path d="M16 -11 L38 -24 V24 L16 11Z" fill={EMBER} />
            </g>
            <text x={camX} y={camY - 34} textAnchor="middle" fontFamily={SERIF} fontWeight={900} fontSize={46} fill="#fff">?</text>
          </g>
        </svg>
      </div>
      <div style={{position: 'absolute', left: 1330, top: 120, width: 494}}>
        <Obj id="w-yes">
          <div style={{fontFamily: SANS, fontWeight: 600, fontSize: 32, color: GOOD}}>风格写得下</div>
          <div style={{marginTop: 10, fontFamily: SERIF, fontWeight: 900, fontSize: 92, lineHeight: 1.2, color: TEXT}}>材料<br />光照</div>
        </Obj>
        <div style={{height: 2, margin: '30px 0', background: tint(TEXT, 22)}} />
        <Obj id="w-no">
          <div style={{fontFamily: SANS, fontWeight: 600, fontSize: 32, color: EMBER}}>写不下</div>
          <div style={{marginTop: 10, fontFamily: SERIF, fontWeight: 900, fontSize: 68, lineHeight: 1.25, color: TEXT}}>镜头<br />往哪儿走</div>
        </Obj>
        <Obj id="w-base" style={{marginTop: 26, fontFamily: SANS, fontWeight: 700, fontSize: 36, color: CUE}}>3D，还要靠模型底子</Obj>
      </div>
    </div>
  );
}

// ---- 04: the library ----------------------------------------------------------------------

function Meet() {
  const draw = useProp('draw', 0);
  return (
    <div style={{...CENTER, gap: 46}}>
      <Lockup width={940} draw={draw} />
      <Obj id="meet-tag" style={{fontFamily: SANS, fontSize: 52, color: MUTED}}>一个做讲解视频的 agent 技能</Obj>
      <Obj id="meet-rule" style={{marginTop: 40, fontFamily: SERIF, fontWeight: 900, fontSize: 76, color: TEXT}}>让更多模型，也做出<span style={{color: CUE}}>顶配的讲解视频</span></Obj>
    </div>
  );
}

const ALL_STYLES = ['stage-light', 'ink-scroll', 'riso-pop', 'night-diagram', 'clay-world', 'field-atlas', 'on-air',
  'earth-block', 'watercolor-tale', 'pixel-quest', 'iso-works', 'plumb-line', 'red-pencil', 'live-studio',
  'drafting-table', 'evidence-board', 'light-bench', 'lab-notebook', 'marker-margin', 'screen-desk', 'depth-stage'];
const TILE = 236, TILE_H = TILE * 9 / 16, TILE_GAP = 16;
/** The whole library, tile by tile; then the places for the styles that are not made yet */
function Library() {
  const tiles = useProp('tiles', 0);
  const next = useProp('next', 0);
  const more = useProp('more', 0);
  const dim = smooth(useProp('dim', 0));
  const x = (c: number) => 960 - (7 * TILE + 6 * TILE_GAP) / 2 + c * (TILE + TILE_GAP);
  const y = (r: number) => 140 + r * (TILE_H + TILE_GAP);
  return (
    <div style={FULL}>
      {ALL_STYLES.map((s, i) => {
        const k = smooth(tiles * ALL_STYLES.length - i);
        return <div key={s} style={{position: 'absolute', left: x(i % 7), top: y(Math.floor(i / 7)), opacity: k, transform: `scale(${0.9 + 0.1 * k})`}}><Poster asset={`poster-${s}`} w={TILE} /></div>;
      })}
      {Array.from({length: 7}, (_, c) => {
        const k = c === 0 ? smooth(next) : smooth(more * 6 - (c - 1));
        return <div key={c} style={{position: 'absolute', left: x(c), top: y(3), width: TILE, height: TILE_H, boxSizing: 'border-box', borderRadius: 10, border: `2px dashed ${c === 0 ? VIOLET : FAINT}`, opacity: k,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: 30, color: c === 0 ? VIOLET : FAINT}}>{c === 0 ? '+1 Opus 5.5' : '+1'}</div>;
      })}
      <div style={{...FULL, background: `radial-gradient(ellipse 60% 50% at 50% 46%, ${tint(BG, 96)}, ${tint(BG, 72)})`, opacity: dim}} />
      <Obj id="lib-claim" style={{position: 'absolute', left: 0, right: 0, top: 400, textAlign: 'center', fontFamily: SERIF, fontWeight: 900, fontSize: 132, color: TEXT, textShadow: '0 10px 50px rgba(0,0,0,0.8)'}}>审美，<span style={{color: CUE}}>可以写下来</span></Obj>
      <Obj id="lib-count" style={{position: 'absolute', left: 0, right: 0, top: 54, textAlign: 'center', fontFamily: MONO, fontSize: 36, color: CUE}}>21 motions</Obj>
      <Obj id="lib-any" style={{position: 'absolute', left: 0, right: 0, top: 812, display: 'flex', justifyContent: 'center', gap: 22, fontFamily: MONO, fontSize: 30, color: TEXT}}>
        {['DeepSeek', 'GLM', 'MiniMax', '…'].map((m) => <span key={m} style={{padding: '6px 26px', borderRadius: 999, border: `2px solid ${BORDER}`}}>{m}</span>)}
      </Obj>
    </div>
  );
}

// ---- 05: the close -------------------------------------------------------------------------

function MadeBy() {
  const c = {t: DATA, a: GOOD, s: AMBER};
  return (
    <div style={CENTER}>
      <Window title="without-opus/doc.tsx" width={1320}>
        <div style={{padding: '14px 44px 44px', fontFamily: MONO, fontSize: 38, lineHeight: 1.75, whiteSpace: 'pre', color: MUTED}}>
          <div><span style={{color: c.t}}>&lt;Scene</span> <span style={{color: c.a}}>id</span>=<span style={{color: c.s}}>"close"</span><span style={{color: c.t}}>&gt;</span></div>
          <Obj id="made-line"><span>  </span><span style={{color: c.t}}>&lt;Line</span> <span style={{color: c.a}}>id</span>=<span style={{color: c.s}}>"l28"</span><span style={{color: c.t}}>&gt;</span><span style={{fontFamily: SANS, color: TEXT}}>对了，这部片子本身……</span><span style={{color: c.t}}>&lt;/Line&gt;</span></Obj>
          <Obj id="made-act"><span>  </span><span style={{color: c.t}}>&lt;Appear</span> <span style={{color: c.a}}>target</span>=<span style={{color: c.s}}>"made"</span> <span style={{color: c.a}}>line</span>=<span style={{color: c.s}}>"l28"</span> <span style={{color: CUE}}>word=<span>"VisoTalk"</span></span><span style={{color: c.t}}> /&gt;</span></Obj>
          <div><span style={{color: c.t}}>&lt;/Scene&gt;</span></div>
        </div>
      </Window>
    </div>
  );
}

function Command() {
  const chars = useProp('chars', 0);
  const cmd = 'npx skills add visotalk/visotalk -g';
  return (
    <div style={CENTER}>
      <Window width={1180}>
        <div style={{padding: '18px 44px 46px', fontFamily: MONO, fontSize: 50, color: TEXT, whiteSpace: 'pre'}}>
          <span style={{color: GOOD}}>$ </span>{cmd.slice(0, Math.round(chars * cmd.length))}<span style={{color: CUE, opacity: chars < 1 ? 1 : 0}}>▍</span>
        </div>
      </Window>
    </div>
  );
}

function EndCard() {
  const draw = useProp('draw', 0);
  return (
    <div style={{...CENTER, gap: 56}}>
      <Lockup width={800} draw={draw} />
      <Obj id="end-title" style={{marginTop: 20, fontFamily: SANS, fontWeight: 800, fontSize: 96, color: TEXT}}>审美，<span style={{color: CUE}}>可以写下来</span>。</Obj>
      <Obj id="end-tag" style={{fontFamily: MONO, fontSize: 38, color: CUE}}>visotalk.dev</Obj>
    </div>
  );
}

// ---- the document -------------------------------------------------------------------------

export default <Doc id="without-opus" title="没有 Opus，可以做出圈的 AI 视频吗？" lang="zh-CN" poster={159.3} theme="visotalk/dark" canvas="16x9"
  tokens={{fonts: {sans: '"Inter", "Noto Sans SC", sans-serif', mono: '"JetBrains Mono", monospace'}}}
  voice="minimax:Chinese (Mandarin)_Radio_Host" speed={1.0} exports={{variants: [{preset: "16x9"}], fps: 30, captions: "burned"}}>
  <Asset id="poster-stage-light" kind="image" src="media/poster-stage-light.jpg" source="The stage-light motion's poster" license={{id: "user-owned", obligations: []}} />
  <Asset id="poster-ink-scroll" kind="image" src="media/poster-ink-scroll.jpg" source="The ink-scroll motion's poster" license={{id: "user-owned", obligations: []}} />
  <Asset id="poster-riso-pop" kind="image" src="media/poster-riso-pop.jpg" source="The riso-pop motion's poster" license={{id: "user-owned", obligations: []}} />
  <Asset id="poster-night-diagram" kind="image" src="media/poster-night-diagram.jpg" source="The night-diagram motion's poster" license={{id: "user-owned", obligations: []}} />
  <Asset id="poster-clay-world" kind="image" src="media/poster-clay-world.jpg" source="The clay-world motion's poster" license={{id: "user-owned", obligations: []}} />
  <Asset id="poster-field-atlas" kind="image" src="media/poster-field-atlas.jpg" source="The field-atlas motion's poster" license={{id: "user-owned", obligations: []}} />
  <Asset id="poster-on-air" kind="image" src="media/poster-on-air.jpg" source="The on-air motion's poster" license={{id: "user-owned", obligations: []}} />
  <Asset id="poster-earth-block" kind="image" src="media/poster-earth-block.jpg" source="The earth-block motion's poster" license={{id: "user-owned", obligations: []}} />
  <Asset id="poster-watercolor-tale" kind="image" src="media/poster-watercolor-tale.jpg" source="The watercolor-tale motion's poster" license={{id: "user-owned", obligations: []}} />
  <Asset id="poster-pixel-quest" kind="image" src="media/poster-pixel-quest.jpg" source="The pixel-quest motion's poster" license={{id: "user-owned", obligations: []}} />
  <Asset id="poster-iso-works" kind="image" src="media/poster-iso-works.jpg" source="The iso-works motion's poster" license={{id: "user-owned", obligations: []}} />
  <Asset id="poster-plumb-line" kind="image" src="media/poster-plumb-line.jpg" source="The plumb-line motion's poster" license={{id: "user-owned", obligations: []}} />
  <Asset id="poster-red-pencil" kind="image" src="media/poster-red-pencil.jpg" source="The red-pencil motion's poster" license={{id: "user-owned", obligations: []}} />
  <Asset id="poster-live-studio" kind="image" src="media/poster-live-studio.jpg" source="The live-studio motion's poster" license={{id: "user-owned", obligations: []}} />
  <Asset id="poster-drafting-table" kind="image" src="media/poster-drafting-table.jpg" source="The drafting-table motion's poster" license={{id: "user-owned", obligations: []}} />
  <Asset id="poster-evidence-board" kind="image" src="media/poster-evidence-board.jpg" source="The evidence-board motion's poster" license={{id: "user-owned", obligations: []}} />
  <Asset id="poster-light-bench" kind="image" src="media/poster-light-bench.jpg" source="The light-bench motion's poster" license={{id: "user-owned", obligations: []}} />
  <Asset id="poster-lab-notebook" kind="image" src="media/poster-lab-notebook.jpg" source="The lab-notebook motion's poster" license={{id: "user-owned", obligations: []}} />
  <Asset id="poster-marker-margin" kind="image" src="media/poster-marker-margin.jpg" source="The marker-margin motion's poster" license={{id: "user-owned", obligations: []}} />
  <Asset id="poster-screen-desk" kind="image" src="media/poster-screen-desk.jpg" source="The screen-desk motion's poster" license={{id: "user-owned", obligations: []}} />
  <Asset id="poster-depth-stage" kind="image" src="media/poster-depth-stage.jpg" source="The depth-stage motion's poster" license={{id: "user-owned", obligations: []}} />
  <Asset id="night" kind="video" src="media/night.mp4" source="DeepSeek with Night Diagram, vbench T8" license={{id: "user-owned", obligations: []}} />
  <Asset id="block" kind="video" src="media/block.mp4" source="DeepSeek with Earth Block, vbench T8" license={{id: "user-owned", obligations: []}} />
  <Asset id="plumb" kind="video" src="media/plumb.mp4" source="DeepSeek with Plumb Line, vbench T8" license={{id: "user-owned", obligations: []}} />
  <Asset id="bench" kind="video" src="media/bench.mp4" source="DeepSeek with Light Bench, vbench T8" license={{id: "user-owned", obligations: []}} />
  <Asset id="o-night" kind="video" src="media/opus-night.mp4" source="The Night Diagram motion's sample" license={{id: "user-owned", obligations: []}} />
  <Asset id="o-block" kind="video" src="media/opus-block.mp4" source="The Earth Block motion's sample" license={{id: "user-owned", obligations: []}} />
  <Asset id="o-plumb" kind="video" src="media/opus-plumb.mp4" source="The Plumb Line motion's sample" license={{id: "user-owned", obligations: []}} />
  <Asset id="o-bench" kind="video" src="media/opus-bench.mp4" source="The Light Bench motion's sample" license={{id: "user-owned", obligations: []}} />
  <Asset id="ds-free" kind="video" src="media/ds-free.mp4" source="DeepSeek with no style, vbench T4" license={{id: "user-owned", obligations: []}} />
  <Asset id="ds-long" kind="video" src="media/ds-long.mp4" source="DeepSeek with a style, vbench T4" license={{id: "user-owned", obligations: []}} />
  <Asset id="free" kind="video" src="media/free.mp4" source="DeepSeek with no style, vbench T8" license={{id: "user-owned", obligations: []}} />
  <Asset id="c-glass-product" kind="video" src="media/lemo/glass-product.mp4" source="https://github.com/lemomo-ai/lemo-opuscar/releases/tag/web" license={{id: "cc-by-4.0", attribution: "LemoLab × Claude Opus 5.5, github.com/lemomo-ai/lemo-opuscar (cut, sped up, without sound)", url: "https://creativecommons.org/licenses/by/4.0/", obligations: []}} />
  <Asset id="c-stained-glass" kind="video" src="media/lemo/stained-glass.mp4" source="https://github.com/lemomo-ai/lemo-opuscar/releases/tag/web" license={{id: "cc-by-4.0", attribution: "LemoLab × Claude Opus 5.5, github.com/lemomo-ai/lemo-opuscar (cut, sped up, without sound)", url: "https://creativecommons.org/licenses/by/4.0/", obligations: []}} />
  <Asset id="l-glass-product" kind="image" src="media/lemo/glass-product.jpg" source="https://github.com/lemomo-ai/lemo-opuscar/tree/main/docs/frames" license={{id: "cc-by-4.0", attribution: "LemoLab × Claude Opus 5.5, github.com/lemomo-ai/lemo-opuscar (cut, sped up, without sound)", url: "https://creativecommons.org/licenses/by/4.0/", obligations: []}} />
  <Asset id="l-stained-glass" kind="image" src="media/lemo/stained-glass.jpg" source="https://github.com/lemomo-ai/lemo-opuscar/tree/main/docs/frames" license={{id: "cc-by-4.0", attribution: "LemoLab × Claude Opus 5.5, github.com/lemomo-ai/lemo-opuscar (cut, sped up, without sound)", url: "https://creativecommons.org/licenses/by/4.0/", obligations: []}} />
  <Asset id="l-hd-2d" kind="image" src="media/lemo/hd-2d.jpg" source="https://github.com/lemomo-ai/lemo-opuscar/tree/main/docs/frames" license={{id: "cc-by-4.0", attribution: "LemoLab × Claude Opus 5.5, github.com/lemomo-ai/lemo-opuscar (cut, sped up, without sound)", url: "https://creativecommons.org/licenses/by/4.0/", obligations: []}} />
  <Asset id="l-tilt-shift" kind="image" src="media/lemo/tilt-shift.jpg" source="https://github.com/lemomo-ai/lemo-opuscar/tree/main/docs/frames" license={{id: "cc-by-4.0", attribution: "LemoLab × Claude Opus 5.5, github.com/lemomo-ai/lemo-opuscar (cut, sped up, without sound)", url: "https://creativecommons.org/licenses/by/4.0/", obligations: []}} />
  <Asset id="l-teardown" kind="image" src="media/lemo/teardown.jpg" source="https://github.com/lemomo-ai/lemo-opuscar/tree/main/docs/frames" license={{id: "cc-by-4.0", attribution: "LemoLab × Claude Opus 5.5, github.com/lemomo-ai/lemo-opuscar (cut, sped up, without sound)", url: "https://creativecommons.org/licenses/by/4.0/", obligations: []}} />
  <Asset id="l-ukiyoe" kind="image" src="media/lemo/ukiyoe.jpg" source="https://github.com/lemomo-ai/lemo-opuscar/tree/main/docs/frames" license={{id: "cc-by-4.0", attribution: "LemoLab × Claude Opus 5.5, github.com/lemomo-ai/lemo-opuscar (cut, sped up, without sound)", url: "https://creativecommons.org/licenses/by/4.0/", obligations: []}} />
  <Asset id="l-cel-anime-80s" kind="image" src="media/lemo/cel-anime-80s.jpg" source="https://github.com/lemomo-ai/lemo-opuscar/tree/main/docs/frames" license={{id: "cc-by-4.0", attribution: "LemoLab × Claude Opus 5.5, github.com/lemomo-ai/lemo-opuscar (cut, sped up, without sound)", url: "https://creativecommons.org/licenses/by/4.0/", obligations: []}} />
  <Asset id="bench-still" kind="image" src="media/bench-still.jpg" source="The Light Bench film, one frame" license={{id: "user-owned", obligations: []}} />
  <Asset id="c-huashu-gears" kind="video" src="media/ext/huashu-gears.mp4" source="https://github.com/alchaincyf/huashu-motion/releases/tag/v0.2.0" license={{id: "mit", attribution: "Huashu, github.com/alchaincyf/huashu-motion (cut, sped up, without sound)", url: "https://github.com/alchaincyf/huashu-motion/blob/main/LICENSE", obligations: []}} />
  <Asset id="x-huashu-design" kind="image" src="media/ext/huashu-design.jpg" source="https://github.com/alchaincyf/huashu-motion/releases/tag/v0.2.0" license={{id: "mit", attribution: "Huashu, github.com/alchaincyf/huashu-motion (cut, sped up, without sound)", url: "https://github.com/alchaincyf/huashu-motion/blob/main/LICENSE", obligations: []}} />
  <Asset id="x-huashu-pages" kind="image" src="media/ext/huashu-pages.jpg" source="https://github.com/alchaincyf/huashu-motion/releases/tag/v0.2.0" license={{id: "mit", attribution: "Huashu, github.com/alchaincyf/huashu-motion (cut, sped up, without sound)", url: "https://github.com/alchaincyf/huashu-motion/blob/main/LICENSE", obligations: []}} />
  <Asset id="x-huashu-gears" kind="image" src="media/ext/huashu-gears.jpg" source="https://github.com/alchaincyf/huashu-motion/releases/tag/v0.2.0" license={{id: "mit", attribution: "Huashu, github.com/alchaincyf/huashu-motion (cut, sped up, without sound)", url: "https://github.com/alchaincyf/huashu-motion/blob/main/LICENSE", obligations: []}} />
  <Asset id="x-huashu-painting" kind="image" src="media/ext/huashu-painting.jpg" source="https://github.com/alchaincyf/huashu-motion/releases/tag/v0.2.0" license={{id: "mit", attribution: "Huashu, github.com/alchaincyf/huashu-motion (cut, sped up, without sound)", url: "https://github.com/alchaincyf/huashu-motion/blob/main/LICENSE", obligations: []}} />
  <Asset id="x-huashu-flying" kind="image" src="media/ext/huashu-flying.jpg" source="https://github.com/alchaincyf/huashu-motion/releases/tag/v0.2.0" license={{id: "mit", attribution: "Huashu, github.com/alchaincyf/huashu-motion (cut, sped up, without sound)", url: "https://github.com/alchaincyf/huashu-motion/blob/main/LICENSE", obligations: []}} />
  <Asset id="x-shotcraft-wall" kind="image" src="media/ext/shotcraft-wall.jpg" source="https://github.com/Vincentwei1021/video-shotcraft/releases/tag/showcase-media" license={{id: "apache-2.0", attribution: "video-shotcraft, github.com/Vincentwei1021/video-shotcraft (cut, sped up, without sound)", url: "https://github.com/Vincentwei1021/video-shotcraft/blob/main/LICENSE", obligations: []}} />
  <Asset id="x-shotcraft-cascade" kind="image" src="media/ext/shotcraft-cascade.jpg" source="https://github.com/Vincentwei1021/video-shotcraft/releases/tag/showcase-media" license={{id: "apache-2.0", attribution: "video-shotcraft, github.com/Vincentwei1021/video-shotcraft (cut, sped up, without sound)", url: "https://github.com/Vincentwei1021/video-shotcraft/blob/main/LICENSE", obligations: []}} />
  <Asset id="x-shotcraft-press" kind="image" src="media/ext/shotcraft-press.jpg" source="https://github.com/Vincentwei1021/video-shotcraft/releases/tag/showcase-media" license={{id: "apache-2.0", attribution: "video-shotcraft, github.com/Vincentwei1021/video-shotcraft (cut, sped up, without sound)", url: "https://github.com/Vincentwei1021/video-shotcraft/blob/main/LICENSE", obligations: []}} />
  <Asset id="c-teardown" kind="video" src="media/lemo/teardown.mp4" source="https://github.com/lemomo-ai/lemo-opuscar/releases/tag/web" license={{id: "cc-by-4.0", attribution: "LemoLab × Claude Opus 5.5, github.com/lemomo-ai/lemo-opuscar (cut, sped up, without sound)", url: "https://creativecommons.org/licenses/by/4.0/", obligations: []}} />
  <Asset id="c-hd-2d" kind="video" src="media/lemo/hd-2d.mp4" source="https://github.com/lemomo-ai/lemo-opuscar/releases/tag/web" license={{id: "cc-by-4.0", attribution: "LemoLab × Claude Opus 5.5, github.com/lemomo-ai/lemo-opuscar (cut, sped up, without sound)", url: "https://creativecommons.org/licenses/by/4.0/", obligations: []}} />
  <Asset id="flaw-night" kind="image" src="media/flaw-night.jpg" source="The Night Diagram film, one frame" license={{id: "user-owned", obligations: []}} />
  <Asset id="flaw-block" kind="image" src="media/flaw-block.jpg" source="The Earth Block film, one frame" license={{id: "user-owned", obligations: []}} />
  <Asset id="music" kind="audio" src="audio/music.mp3" source="https://pixabay.com/music/corporate-tutorial-technology-182513/"
    license={{id: "pixabay-content", attribution: "Tutorial technology by PaulYudin, Pixabay", url: "https://pixabay.com/service/license-summary/", obligations: []}} />
  <Asset id="opening" kind="audio" src="audio/opening.mp3" source="The first VisoTalk promo's score, music/make_music.py (generated)" license={{id: "user-owned", obligations: []}} />
  <Asset id="ding" kind="audio" src="ding.mp3" source="examples/visotalk-intro/make-music.py (generated)" license={{id: "user-owned", obligations: []}} />
  <Asset id="tick" kind="audio" src="tick.mp3" source="examples/visotalk-intro/make-music.py (generated)" license={{id: "user-owned", obligations: []}} />
  <Asset id="miss" kind="audio" src="miss.mp3" source="examples/visotalk-intro/make-music.py (generated)" license={{id: "user-owned", obligations: []}} />
  <Asset id="swoosh" kind="audio" src="swoosh.mp3" source="examples/visotalk-intro/make-music.py (generated)" license={{id: "user-owned", obligations: []}} />
  <Asset id="chime" kind="audio" src="chime.mp3" source="examples/visotalk-intro/make-music.py (generated)" license={{id: "user-owned", obligations: []}} />

  <Part id="ground" z={-10}><Backdrop /></Part>
  <Part id="chapter" x={96} y={48} w={900} h={44} z={5}><Chapter /></Part>
  <Part id="badge" x={1584} y={50} w={240} h={52} z={5}><Badge /></Part>

  <Scene id="intro" title="Bars 1-8: a question, then its film, faster and faster, before a word" duration={16}>
    <Part id="intro"><Asks /></Part>
    <Sound asset="opening" at="start" dur={28} volume={0} duck={5} fadeOut={3} />
    <Animation>
      <Appear target="intro" at="start" dur={0} />
    </Animation>
  </Scene>

  <Scene id="hook" title="The drop: a wall of them; then the question">
    <Line id="a1">最近，用 Opus 这样的顶配模型做的视频，挺出圈的。</Line>
    <Line id="a2" hold={1.2}>这些片子，如果没有 Opus，还做得出来吗？</Line>
    <Part id="hook"><Wall /></Part>
    <Animation>
      <Appear target="hook" at="start" dur={0} />
      <Appear target="claim" at="start" dur={0} />
      <Tween target="hook" to={{slam: 1}} at="start" dur={0.35} easing="easeOutQuart" />
      <Tween target="hook" to={{pull: 1}} at="start" dur={1.6} easing="linear" />
      <Disappear target="claim" line="a2" word="如果没有" />
      <Tween target="hook" to={{dim: 1}} line="a2" word="如果没有" dur={0.8} />
      <Appear target="title" line="a2" word="做得出来" dur={0.6} />
    </Animation>
  </Scene>

  <Scene id="question">
    <Line id="l3">别的模型也会写代码，也讲得清道理。差距最大的地方，往往是审美。</Line>
    <Line id="l4">可审美是什么？是配色，是字体，是镜头什么时候动、什么时候不动。</Line>
    <Line id="l5" hold={0.9}>那能不能把审美写下来，做成一套风格，让不同的模型都能参考和复用？</Line>
    <Part id="taste"><Taste /></Part>
    <Animation>
      <Appear target={["ground", "chapter"]} at="start" dur={0} />
      <Appear target="taste" at="start" dur={0.3} />
      <Appear target="taste-a" line="l3" word="写代码" dur={0.3} />
      <Appear target="taste-b" line="l3" word="讲得清" dur={0.3} />
      <Appear target="taste-word" line="l3" word="审美" dur={0.5} />
      <Tween target="taste" to={{rule: 1}} line="l3" word="审美" dur={0.7} />
      <Appear target="taste-0" line="l4" word="配色" dur={0} />
      <Tween target="taste" to={{r0: 1}} line="l4" word="配色" dur={0.5} />
      <Tween target="taste" to={{c: 1}} line="l4" word="配色" dur={0.9} />
      <Appear target="taste-1" line="l4" word="字体" dur={0} />
      <Tween target="taste" to={{r1: 1}} line="l4" word="字体" dur={0.5} />
      <Tween target="taste" to={{f: 1}} line="l4" word="字体" dur={0.6} />
      <Appear target="taste-2" line="l4" word="镜头" dur={0} />
      <Tween target="taste" to={{r2: 1}} line="l4" word="镜头" dur={0.5} />
      <Tween target="taste" to={{k: 1}} line="l4" word="什么时候动" dur={1} easing="easeInOutSine" />
      <Tween target="taste" to={{t0: 1}} line="l5" word="写下来" dur={0.3} easing="linear" />
      <Tween target="taste" to={{t1: 1}} line="l5" word="写下来" offset={0.16} dur={0.3} easing="linear" />
      <Tween target="taste" to={{t2: 1}} line="l5" word="写下来" offset={0.32} dur={0.3} easing="linear" />
      <Appear target="taste-ask" line="l5" word="复用" dur={0.4} />
    </Animation>
    <Sound asset="tick" line="l5" word="写下来" volume={-10} />
  </Scene>

  <Scene id="experiment">
    <Line id="l6" text="我们让 Opus 把审美写成四套风格：一份不到 8000 字节的说明，加一组画好的组件。">我们让 Opus 把审美写成四套风格：一份不到八千字节的说明，加一组画好的组件。</Line>
    <Line id="l7">然后交给一个价格低得多的模型：DeepSeek。四套风格，四个它没见过的问题。</Line>
    {/* the opening's score has faded; the film's own music comes in with the experiment */}
    <Sound asset="music" line="l6" loop volume={-8} duck={3} fadeIn={1.2} fadeOut={4} />
    <Part id="style-file"><StyleFile /></Part>
    <Part id="handoff"><Handoff /></Part>
    <Animation>
      <Set target="chapter" to={{n: "02", name: "试一下"}} at="start" />
      <Appear target="style-file" at="start" dur={0.3} />
      <Tween target="style-file" to={{typed: 1}} line="l6" word="四套风格" until={{line: "l6", edge: "end"}} easing="linear" />
      <Appear target="style-posters" line="l6" word="四套风格" dur={0.5} />
      <Disappear target="style-file" line="l7" dur={0.3} />
      <Appear target="handoff" line="l7" dur={0.3} />
      <Appear target="hand-ds" line="l7" word="DeepSeek" dur={0.3} />
      <Appear target="hand-0" line="l7" word="四个" dur={0.3} />
      <Appear target="hand-1" line="l7" word="四个" offset={0.15} dur={0.3} />
      <Appear target="hand-2" line="l7" word="四个" offset={0.3} dur={0.3} />
      <Appear target="hand-3" line="l7" word="四个" offset={0.45} dur={0.3} />
    </Animation>
  </Scene>

  <Scene id="n-style">
    <Line id="n1">第一套，夜光图解。Opus 的样片，讲闪电从哪儿来。</Line>
    <Part id="c-na"><Compare opus="o-night" opusIn={0} opusRate={1.2} topic="闪电从哪儿来" motion="Night Diagram" kind="2D" q="神经细胞放电" cost="$0.089" took="10.5 min" /></Part>
    <Animation><Appear target="c-na" at="start" dur={0.3} /></Animation>
  </Scene>
  <Scene id="n-film">
    <Line id="n2">DeepSeek 换成神经细胞放电的那一瞬。细胞膜、离子、放电曲线，全是它照着风格的规矩自己画的。</Line>
    <Part id="c-nb"><Compare opus="o-night" opusIn={6} opusRate={1.2} topic="闪电从哪儿来" ds="night" dsIn={0} dsRate={2.2} motion="Night Diagram" kind="2D" q="神经细胞放电" cost="$0.089" took="10.5 min" /></Part>
    <Animation>
      <Appear target="c-nb" at="start" dur={0} />
      <Tween target="c-nb" to={{split: 1}} at="start" dur={0.7} />
    </Animation>
  </Scene>
  <Scene id="b-style">
    <Line id="b1">第二套，大地块。Opus 切开一块地，讲雨水去了哪儿。</Line>
    <Part id="c-ba"><Compare opus="o-block" opusIn={1.7} opusRate={1.3} topic="雨水去哪儿了" motion="Earth Block" kind="2.5D" q="街道下面埋着什么" cost="$0.136" took="15.8 min" /></Part>
    <Animation><Appear target="c-ba" at="start" dur={0.3} /></Animation>
  </Scene>
  <Scene id="b-film">
    <Line id="b2">DeepSeek 换成街道下面埋着什么。它把一条街切开，一层一层往下讲，讲到地铁隧道。</Line>
    <Part id="c-bb"><Compare opus="o-block" opusIn={11.4} opusRate={1.3} topic="雨水去哪儿了" ds="block" dsIn={0} dsRate={4} motion="Earth Block" kind="2.5D" q="街道下面埋着什么" cost="$0.136" took="15.8 min" /></Part>
    <Animation>
      <Appear target="c-bb" at="start" dur={0} />
      <Tween target="c-bb" to={{split: 1}} at="start" dur={0.7} />
    </Animation>
  </Scene>
  <Scene id="p-style">
    <Line id="p1">第三套，铅垂线。Opus 放下一根线，一路沉到海底。</Line>
    <Part id="c-pa"><Compare opus="o-plumb" opusIn={0} opusRate={1.5} topic="大海有多深" motion="Plumb Line" kind="2D" q="大气层有多高" cost="$0.139" took="14.3 min" /></Part>
    <Animation><Appear target="c-pa" at="start" dur={0.3} /></Animation>
  </Scene>
  <Scene id="p-film">
    <Line id="p2">DeepSeek 反过来往上走：大气层有多高。一路爬到一万公里，再退回来，护住我们的，只有细细一条线。</Line>
    <Part id="c-pb"><Compare opus="o-plumb" opusIn={12} opusRate={1.5} topic="大海有多深" ds="plumb" dsIn={0} dsRate={4.5} motion="Plumb Line" kind="2D" q="大气层有多高" cost="$0.139" took="14.3 min" /></Part>
    <Animation>
      <Appear target="c-pb" at="start" dur={0} />
      <Tween target="c-pb" to={{split: 1}} at="start" dur={0.7} />
    </Animation>
  </Scene>
  <Scene id="o-style">
    <Line id="o1">第四套，光学台。这回是 3D，Opus 用一块棱镜，把白光拆开。</Line>
    <Part id="c-oa"><Compare opus="o-bench" opusIn={0} opusRate={1.2} topic="白光里有什么" motion="Light Bench" kind="3D" q="镜头怎么成像" cost="$0.211" took="25.5 min" /></Part>
    <Animation><Appear target="c-oa" at="start" dur={0.3} /></Animation>
  </Scene>
  <Scene id="o-film">
    <Line id="o2">DeepSeek 换成镜头怎么成像，光路是它一条一条算出来的。</Line>
    <Part id="c-ob"><Compare opus="o-bench" opusIn={8} opusRate={1.2} topic="白光里有什么" ds="bench" dsIn={0} dsRate={2} motion="Light Bench" kind="3D" q="镜头怎么成像" cost="$0.211" took="25.5 min" /></Part>
    <Animation>
      <Appear target="c-ob" at="start" dur={0} />
      <Tween target="c-ob" to={{split: 1}} at="start" dur={0.7} />
    </Animation>
  </Scene>
  <Scene id="bill">
    <Line id="l14" hold={0.8}>四部片子，模型费一共不到一美元，配音另算。</Line>
    <Part id="bill-card"><Bill /></Part>
    <Animation>
      <Appear target="bill-card" at="start" dur={0} />
      <Tween target="bill-card" to={{rows: 1}} line="l14" until={{line: "l14", word: "不到一美元"}} easing="linear" />
      <Tween target="bill-card" to={{total: 1}} line="l14" word="不到一美元" dur={0.3} />
    </Animation>
    <Sound asset="ding" line="l14" word="不到一美元" volume={-12} />
  </Scene>

  <Scene id="honest">
    <Line id="l15">先说毛病。夜光图解的细胞里，冒出了一排不该有的地平线。</Line>
    <Line id="l16">大地块的管线，中途消失了一幕。</Line>
    <Line id="l17">每种风格只跑了一次，题目也是我们挑的。</Line>
    <Line id="l17b" hold={0.8}>但这只是第一轮的结果。多修几轮，还能继续提升，毕竟 DeepSeek 省钱，修得起。</Line>
    <Part id="flaw-1"><Flaw asset="flaw-night" x={760} y={862} rx={560} ry={66} note="不该有的地平线" /></Part>
    <Part id="flaw-2"><Flaw asset="flaw-block" x={900} y={530} rx={430} ry={190} note="管线，这一幕不见了" /></Part>
    <Part id="caveats"><Caveats /></Part>
    <Animation>
      <Set target="chapter" to={{n: "03", name: "老实话"}} at="start" />
      <Appear target="flaw-1" at="start" dur={0.3} />
      <Tween target="flaw-1" to={{ring: 1}} line="l15" word="地平线" dur={0.6} />
      <Disappear target="flaw-1" line="l16" dur={0.2} />
      <Appear target="flaw-2" line="l16" dur={0.2} />
      <Tween target="flaw-2" to={{ring: 1}} line="l16" word="消失了" dur={0.6} />
      <Disappear target="flaw-2" line="l17" dur={0.2} />
      <Appear target="caveats" line="l17" dur={0} />
      <Appear target="cav-0" line="l17" word="只跑了一次" dur={0.4} />
      <Appear target="cav-1" line="l17" word="我们挑的" dur={0.4} />
      <Appear target="cav-here" line="l17b" word="第一轮" dur={0.3} />
      <Tween target="caveats" to={{climb: 1}} line="l17b" word="多修几轮" dur={1.6} easing="easeInOutSine" />
      <Appear target="cav-cost" line="l17b" word="省钱" dur={0.4} />
    </Animation>
  </Scene>
  <Scene id="conclusion">
    <Line id="l18" hold={1}>但结论已经看得出来：审美可以写下来。</Line>
    <Line id="l19" hold={0.3}>2D，完全可以。</Line>
    <Line id="l20" hold={1.4} text="2.5D，也可以。">二点五D，也可以。</Line>
    <Part id="headline"><Headline /></Part>
    <Part id="verdict"><Verdict /></Part>
    <Animation>
      <Appear target="headline" line="l18" word="审美" dur={0.4} />
      <Disappear target="headline" line="l19" dur={0.2} />
      <Appear target="verdict" line="l19" dur={0} />
      <Appear target="v-2d" line="l19" dur={0.3} />
      <Appear target="v-25d" line="l20" dur={0.3} />
      <Appear target="v-3d" line="l20" edge="end" dur={0.3} />
    </Animation>
    <Sound asset="chime" line="l19" volume={-12} />
    <Sound asset="chime" line="l20" volume={-12} />
  </Scene>
  <Scene id="three-d">
    <Line id="l21">3D 呢？物体和光路都对，可镜头几乎不动，光也过曝了。</Line>
    <Line id="l22" hold={1}>风格写得下材料，写不下镜头该往哪儿走。3D，还要靠模型底子。</Line>
    <Part id="three"><ThreeD /></Part>
    <Part id="writable"><Writable /></Part>
    <Animation>
      <Appear target="three" at="start" dur={0.3} />
      <Appear target="t-obj" line="l21" word="物体" dur={0.25} />
      <Appear target="t-ray" line="l21" word="光路" dur={0.25} />
      <Appear target="t-cam" line="l21" word="镜头" dur={0.25} />
      <Appear target="t-exp" line="l21" word="过曝" dur={0.25} />
      <Disappear target="three" line="l22" dur={0.3} />
      <Appear target="writable" line="l22" dur={0} />
      <Appear target="w-yes" line="l22" word="写得下" dur={0.4} />
      <Tween target="writable" to={{pins: 1}} line="l22" word="材料" dur={0.5} />
      <Appear target="w-no" line="l22" word="写不下" dur={0.4} />
      <Tween target="writable" to={{orbit: 1}} line="l22" word="镜头" dur={0.6} />
      <Appear target="w-base" line="l22" word="模型底子" dur={0.4} />
    </Animation>
  </Scene>

  <Scene id="lens-pair">
    <Line id="m1">同一道题，不给风格，它老老实实画了一张 2D 图，讲得还不差。</Line>
    <Line id="m2">给了风格，它才真正做成了 3D，只是还没讲得更清楚。</Line>
    <Part id="own-a"><Own left="free" leftIn={0} leftHead="镜头怎么成像 · 不给风格 · 2D" right="bench" rightIn={22} rightHead="镜头怎么成像 · 给了风格 · 3D" rate={1.5} rightId="own-a-r" /></Part>
    <Animation>
      <Appear target="own-a" at="start" dur={0.3} />
      <Appear target="own-a-r" line="m2" dur={0.3} />
    </Animation>
  </Scene>
  <Scene id="tesla-pair">
    <Line id="m3">再换一道题，特斯拉 Roadster 怎么贴在墙上。不给风格，是一张平面示意图。</Line>
    <Line id="m4">给了风格，车轮和气流都立起来了，这回强了一大截。</Line>
    <Line id="m5" hold={1}>所以 3D 这一块，大家可以多换几个模型，自己试试。</Line>
    <Part id="own-b"><Own left="ds-free" leftHead="Roadster 怎么贴墙 · 不给风格" right="ds-long" rightHead="Roadster 怎么贴墙 · 给了风格" rightId="own-b-r"><TryModels /></Own></Part>
    <Animation>
      <Appear target="own-b" at="start" dur={0.3} />
      <Appear target="own-b-r" line="m4" dur={0.3} />
      <Appear target="own-try" line="m5" word="多换几个模型" dur={0.4} />
    </Animation>
  </Scene>

  <Scene id="visotalk">
    <Line id="l23">这些风格，就放在 VisoTalk 里。</Line>
    <Line id="l24" hold={1}>VisoTalk 是一个做讲解视频的 agent 技能。它的目标，是让更多模型，也能做出顶配的讲解视频。</Line>
    <Line id="l25">它有一座样式库，今天是二十一套风格。</Line>
    <Line id="l26">这就是我们说的，审美，可以写下来。Opus 这样的顶配模型写一次，样式库就多一套，此后每个模型都能用。</Line>
    <Line id="l27" hold={1}>你用什么模型不重要。顶配模型的审美，可以一直攒下去。</Line>
    <Part id="meet"><Meet /></Part>
    <Part id="library"><Library /></Part>
    <Animation>
      <Set target="chapter" to={{n: "04", name: "样式库"}} at="start" />
      <Disappear target="chapter" line="l23" word="VisoTalk" dur={0.2} />
      <Appear target="meet" line="l23" word="VisoTalk" dur={0} />
      <Tween target="meet" to={{draw: 1}} line="l23" word="VisoTalk" dur={2.15} easing="linear" />
      <Appear target="meet-tag" line="l24" word="agent 技能" dur={0.4} />
      <Appear target="meet-rule" line="l24" word="更多模型" dur={0.4} />
      <Disappear target="meet" line="l25" dur={0.3} />
      <Appear target="chapter" line="l25" dur={0.3} />
      <Appear target="badge" line="l25" dur={0} />
      <Tween target="badge" to={{draw: 1}} line="l25" dur={1.2} easing="linear" />
      <Appear target="library" line="l25" dur={0} />
      <Tween target="library" to={{tiles: 1}} line="l25" word="样式库" until={{line: "l25", word: "二十一套"}} easing="linear" />
      <Appear target="lib-count" line="l25" word="二十一套" dur={0.3} />
      <Tween target="library" to={{dim: 1}} line="l26" word="审美" dur={0.4} />
      <Appear target="lib-claim" line="l26" word="审美" dur={0.5} />
      <Disappear target="lib-claim" line="l26" word="顶配模型" dur={0.4} />
      <Tween target="library" to={{dim: 0}} line="l26" word="顶配模型" dur={0.5} />
      <Tween target="library" to={{next: 1}} line="l26" word="多一套" dur={0.5} />
      <Appear target="lib-any" line="l26" word="每个模型" dur={0.4} />
      <Tween target="library" to={{more: 1}} line="l27" word="一直攒下去" dur={1.2} />
    </Animation>
    <Sound asset="swoosh" line="l23" word="VisoTalk" volume={-12} />
    <Sound asset="ding" line="l23" word="VisoTalk" offset={0.52} volume={-12} />
    <Sound asset="ding" line="l26" word="多一套" volume={-13} />
  </Scene>

  <Scene id="close">
    <Line id="l28" hold={0.8}>对了，这部片子本身，也是 VisoTalk 来做的。</Line>
    <Line id="l30">VisoTalk 开源，一条命令就能把技能装进你的 agent。</Line>
    <Line id="l31" hold={5}>审美，可以写下来。</Line>
    <Part id="made"><MadeBy /></Part>
    <Part id="cmd"><Command /></Part>
    <Part id="end"><EndCard /></Part>
    <Animation>
      <Set target="chapter" to={{n: "05", name: "还有一件事"}} at="start" />
      <Appear target="made" at="start" dur={0.3} />
      <Appear target="made-line" line="l28" dur={0.3} />
      <Appear target="made-act" line="l28" word="VisoTalk" dur={0.3} />
      <Disappear target="made" line="l30" dur={0.3} />
      <Appear target="cmd" line="l30" word="一条命令" dur={0.3} />
      <Tween target="cmd" to={{chars: 1}} line="l30" word="一条命令" dur={1.4} easing="linear" />
      <Disappear target={["cmd", "chapter", "badge"]} line="l31" dur={0.4} />
      <Appear target="end" line="l31" dur={0} />
      <Tween target="end" to={{draw: 1}} line="l31" dur={2.15} easing="linear" />
      <Appear target="end-title" line="l31" word="审美" dur={0.8} />
      <Appear target="end-tag" line="l31" edge="end" offset={1.2} dur={0.8} />
    </Animation>
    <Sound asset="swoosh" line="l31" volume={-12} />
    <Sound asset="ding" line="l31" offset={0.52} volume={-12} />
  </Scene>
</Doc>;
