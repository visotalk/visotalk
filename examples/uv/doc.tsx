import {Doc, Scene, Line, Part, Animation, Appear, Disappear, Tween, Set} from '@visotalk/jsx';
import {Obj, useProp} from '@visotalk/runtime';

// ---------------------------------------------------------------- data: what the picture is drawn from

/** Theme tokens by the name a person would give the colour; the two with no token are mixes of two tokens. */
const mix = (a: string, b: string) => `color-mix(in srgb, var(--vt-${a}) 55%, var(--vt-${b}))`;
const COLOR = {
  blue: 'var(--vt-data)', green: 'var(--vt-good)', yellow: 'var(--vt-warn)', purple: 'var(--vt-op)',
  orange: 'var(--vt-grad)', red: 'var(--vt-bad)', pink: mix('bad', 'op'), cyan: mix('data', 'good'),
};

/** The tools uv replaces, in the order the narration names them. */
const TOOLS = [
  {name: 'pip', job: 'install packages', color: COLOR.blue},
  {name: 'virtualenv', job: 'environments', color: COLOR.green},
  {name: 'pip-tools', job: 'pin versions', color: COLOR.yellow},
  {name: 'pipx', job: 'command line tools', color: COLOR.purple},
  {name: 'pyenv', job: 'Python itself', color: COLOR.pink},
  {name: 'poetry', job: 'publish', color: COLOR.cyan},
  {name: 'twine', job: 'publish', color: COLOR.orange},
];
const TOOL_ROWS = [TOOLS.slice(0, 4), TOOLS.slice(4)];

/** The benchmark set-up, one card each. */
const BENCH = [
  {id: 'machine', icon: 'laptop', text: 'same machine', color: COLOR.blue},
  {id: 'python', icon: 'code', text: 'same Python', color: COLOR.yellow},
  {id: 'cache', icon: 'flame', text: 'warm cache', color: COLOR.orange},
  {id: 'packages', icon: 'package', text: '38 packages', color: COLOR.green},
];

/** The two install bars; the document tweens each bar's `t` (seconds) to the time it stands for, 8 and 0.17. */
const BARS = [
  {id: 'pip', color: COLOR.blue, label: 'more than 8 s'},
  {id: 'uv', color: COLOR.green, label: '0.17 s'},
];
const PX_PER_SECOND = 125;

/** The speed claim on a log axis from 1x to 100x. */
const AXIS = {x0: 260, x1: 1660, y: 350, marks: [1, 10, 100]};
const axisX = (times: number) => AXIS.x0 + (Math.log10(times) / 2) * (AXIS.x1 - AXIS.x0);

/** What `uv` leaves in a project, in the order it creates them. */
const FILES = [
  {id: 'pyproject', icon: 'file-text', name: 'pyproject.toml', color: COLOR.blue},
  {id: 'venv', icon: 'folder', name: '.venv/', color: COLOR.green},
  {id: 'lock', icon: 'lock', name: 'uv.lock', color: COLOR.yellow},
];
const PLATFORMS = [
  {id: 'linux', name: 'Linux', color: COLOR.orange},
  {id: 'mac', name: 'macOS', color: COLOR.purple},
  {id: 'win', name: 'Windows', color: COLOR.blue},
];

/** The terminal session: each step is typed and answered while its tween runs from 0 to 1. */
const STEPS = [
  {id: 'init', cmd: 'uv init demo', out: ['Initialized project `demo`']},
  {id: 'add', cmd: 'uv add requests', out: ['Creating virtual environment at: .venv', 'Resolved packages', 'Installed packages']},
  {id: 'run', cmd: 'uv run python main.py', out: ['Hello from demo!']},
  {id: 'lock', cmd: 'uv lock', out: ['Resolved packages']},
];

// ---------------------------------------------------------------- components

const MONO = 'var(--vt-mono)';
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

// Lucide icons (ISC), 24x24 stroke paths.
const ICONS: Record<string, string[]> = {
  package: ['M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z', 'M12 22V12', 'M3.29 7L12 12L20.71 7', 'm7.5 4.27 9 5.15'],
  cog: ['M11 10.27 7 3.34', 'm11 13.73-4 6.93', 'M12 22v-2', 'M12 2v2', 'M14 12h8', 'm17 20.66-1-1.73', 'm17 3.34-1 1.73', 'M2 12h2', 'm20.66 17-1.73-1', 'm20.66 7-1.73 1', 'm3.34 17 1.73-1', 'm3.34 7 1.73 1', 'M10 12a2 2 0 1 0 4 0a2 2 0 1 0 -4 0', 'M4 12a8 8 0 1 0 16 0a8 8 0 1 0 -16 0'],
  laptop: ['M18 5a2 2 0 0 1 2 2v8.526a2 2 0 0 0 .212.897l1.068 2.127a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45l1.068-2.127A2 2 0 0 0 4 15.526V7a2 2 0 0 1 2-2z', 'M20.054 15.987H3.946'],
  code: ['m16 18 6-6-6-6', 'm8 6-6 6 6 6'],
  flame: ['M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4'],
  'file-text': ['M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z', 'M14 2v5a1 1 0 0 0 1 1h5', 'M10 9H8', 'M16 13H8', 'M16 17H8'],
  lock: ['M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-7a2 2 0 0 1 2 -2z', 'M7 11V7a5 5 0 0 1 10 0v4'],
  folder: ['M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z'],
};
function Icon({name, size, color}: {name: string; size: number; color: string}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {ICONS[name].map((d) => <path key={d} d={d} />)}
    </svg>
  );
}

/** The kicker and the title, on every scene; each scene sets their text with `<Set target="head" to={{text: "…"}}/>`. */
function Heading() {
  const kick = String(useProp('kick', 'text', ''));
  const head = String(useProp('head', 'text', ''));
  return (
    <div style={{padding: '0 120px', fontFamily: 'var(--vt-sans)'}}>
      <Obj id="kick" style={{height: 44, fontSize: 32, letterSpacing: 4, textTransform: 'uppercase', color: 'var(--vt-muted)'}}>{kick}</Obj>
      <Obj id="head" style={{fontSize: 76, fontWeight: 700, lineHeight: 1.1, color: 'var(--vt-text)'}}>{head}</Obj>
    </div>
  );
}

/** The seven tools as tiles with a job under each; `merge` (0 to 1, tweened on the part) pulls every tile to the middle, where the uv block grows. */
function Toolbox() {
  const merge = useProp('merge', 0);
  const blockW = useProp('uvblock', 'w', 4), blockH = useProp('uvblock', 'h', 4);
  const W = 1920, TILE = {w: 340, h: 110, gap: 120}, ROW_TOP = [50, 350], CENTER = {x: W / 2, y: 290};
  return (
    <div style={{position: 'absolute', inset: 0, fontFamily: MONO}}>
      {TOOL_ROWS.map((row, r) => {
        const left0 = (W - (row.length * TILE.w + (row.length - 1) * TILE.gap)) / 2;
        return row.map((tool, i) => {
          const left = left0 + i * (TILE.w + TILE.gap), top = ROW_TOP[r];
          const dx = CENTER.x - (left + TILE.w / 2), dy = CENTER.y - (top + TILE.h / 2);
          return (
            <div key={tool.name}>
              <Obj id={`t-${tool.name}`} style={{
                position: 'absolute', left, top, width: TILE.w, height: TILE.h, boxSizing: 'border-box', borderRadius: 20,
                border: `3px solid ${tool.color}`, background: 'var(--vt-panel)', color: tool.color, fontSize: 42, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transform: `translate(${dx * merge}px, ${dy * merge}px)`, opacity: 1 - clamp01((merge - 0.8) / 0.2),
              }}>{tool.name}</Obj>
              <Obj id={`j-${tool.name}`} style={{position: 'absolute', left, top: top + TILE.h + 14, width: TILE.w, textAlign: 'center', fontSize: 30, color: 'var(--vt-muted)', fontFamily: 'var(--vt-sans)'}}>{tool.job}</Obj>
            </div>
          );
        });
      })}
      <Obj id="uvblock" style={{position: 'absolute', left: CENTER.x - blockW / 2, top: CENTER.y - blockH / 2, width: blockW, height: blockH, borderRadius: 30, background: 'var(--vt-grad)'}} />
      <Obj id="uvtxt" style={{position: 'absolute', left: CENTER.x - 200, top: CENTER.y - 130, width: 400, height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 150, fontWeight: 700, fontFamily: MONO, color: 'var(--vt-bg)'}}>uv</Obj>
      {[{id: 'bin', icon: 'package', text: 'one binary', color: COLOR.green, left: 520}, {id: 'rust', icon: 'cog', text: 'Rust', color: COLOR.orange, left: 1130}].map((p) => (
        <Obj key={p.id} id={p.id} style={{position: 'absolute', left: p.left, top: 530, display: 'flex', alignItems: 'center', gap: 24, color: p.color, fontSize: 52, fontFamily: 'var(--vt-sans)'}}>
          <Icon name={p.icon} size={90} color={p.color} />{p.text}
        </Obj>
      ))}
    </div>
  );
}

/** The 1x to 100x axis: the line is drawn, the band between 10x and 100x fills, a marker lands at the measured speed-up. */
function Ruler() {
  const draw = useProp('r-line', 'draw', 0), fill = useProp('r-band', 'fill', 0);
  const mono = {fontFamily: MONO, color: 'var(--vt-muted)', fontSize: 40, position: 'absolute' as const, width: 160, textAlign: 'center' as const};
  const MEASURED = 50;
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <Obj id="r-band" style={{position: 'absolute', left: axisX(10), top: AXIS.y - 45, width: fill * (axisX(100) - axisX(10)), height: 90, borderRadius: 12, background: `color-mix(in srgb, ${COLOR.orange} 85%, transparent)`}} />
      <Obj id="r-line" style={{position: 'absolute', left: AXIS.x0, top: AXIS.y - 2, width: draw * (AXIS.x1 - AXIS.x0), height: 4, background: 'var(--vt-muted)'}} />
      <Obj id="r-ticks" style={{position: 'absolute', left: AXIS.x0 - 80, top: AXIS.y - 25, width: AXIS.x1 - AXIS.x0 + 160, height: 120}}>
        {AXIS.marks.map((times) => (
          <div key={times}>
            <div style={{position: 'absolute', left: axisX(times) - AXIS.x0 + 78, top: 0, width: 4, height: 50, background: 'var(--vt-muted)'}} />
            <div style={{...mono, left: axisX(times) - AXIS.x0, top: 65}}>{times}x</div>
          </div>
        ))}
      </Obj>
      <Obj id="r-pip" style={{...mono, left: axisX(1) - 80, top: AXIS.y - 120, color: COLOR.blue}}>pip</Obj>
      <Obj id="r-mark" style={{position: 'absolute', left: axisX(MEASURED) - 30, top: AXIS.y - 30, width: 60, height: 60, boxSizing: 'border-box', borderRadius: 30, background: COLOR.green, border: '4px solid var(--vt-text)'}} />
      <Obj id="r-50" style={{position: 'absolute', left: axisX(MEASURED) - 190, top: AXIS.y - 210, width: 380, height: 100, boxSizing: 'border-box', borderRadius: 20, border: `3px solid ${COLOR.green}`, background: 'var(--vt-panel)', color: COLOR.green, fontSize: 60, fontWeight: 700, fontFamily: 'var(--vt-sans)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>about {MEASURED}x</Obj>
    </div>
  );
}

/** One benchmark condition per card, evenly spread; the last one carries its source under it. */
function Bench() {
  const stride = 440;
  return (
    <div style={{position: 'absolute', inset: 0, fontFamily: 'var(--vt-sans)'}}>
      {BENCH.map((b, i) => {
        const cx = 960 + (i - (BENCH.length - 1) / 2) * stride;
        return (
          <Obj key={b.id} id={`k-${b.id}`} style={{position: 'absolute', left: cx - 190, top: 200, width: 380, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, color: b.color, fontSize: 42, fontWeight: 700}}>
            <Icon name={b.icon} size={150} color={b.color} />{b.text}
          </Obj>
        );
      })}
      <Obj id="k-source" style={{position: 'absolute', left: 960 + 1.5 * stride - 190, top: 480, width: 380, textAlign: 'center', fontSize: 30, color: 'var(--vt-muted)'}}>Trio's docs</Obj>
    </div>
  );
}

/** Install times as bars: `t` (seconds, tweened per bar) sets the length, the label follows the bar's end. */
function Bars() {
  return (
    <div style={{position: 'absolute', inset: 0}}>
      {BARS.map((b, i) => <BarRow key={b.id} b={b} top={190 + i * 200} />)}
    </div>
  );
}

function BarRow({b, top}: {b: (typeof BARS)[number]; top: number}) {
  const t = useProp(`b-${b.id}`, 't', 0);
  const end = 300 + Math.max(8, t * PX_PER_SECOND);
  return (
  <div>
    <Obj id={`b-${b.id}-name`} style={{position: 'absolute', left: 120, top, width: 160, height: 90, display: 'flex', alignItems: 'center', fontFamily: MONO, fontSize: 48, color: b.color}}>{b.id}</Obj>
    <Obj id={`b-${b.id}`} style={{position: 'absolute', left: 300, top, width: end - 300, height: 90, borderRadius: 14, background: b.color}} />
    <Obj id={`b-${b.id}-time`} style={{position: 'absolute', left: end + 24, top, height: 90, display: 'flex', alignItems: 'center', fontSize: 48, fontWeight: 700, color: b.color, whiteSpace: 'nowrap', fontFamily: 'var(--vt-sans)'}}>{b.label}</Obj>
  </div>
  );
}

/** A macOS-style window. Each step is typed and answered by its own tween `p` (0 to 1): the first part types the command, the rest prints the output. */
function Terminal({title}: {title: string}) {
  return (
    <div style={{position: 'absolute', inset: 0, borderRadius: 20, border: '2px solid var(--vt-border)', background: 'var(--vt-panel)', overflow: 'hidden', fontFamily: MONO, fontSize: 33}}>
      <div style={{height: 56, display: 'flex', alignItems: 'center', gap: 12, padding: '0 22px', background: 'var(--vt-panel2)', borderBottom: '2px solid var(--vt-border)', color: 'var(--vt-muted)'}}>
        {[COLOR.red, COLOR.yellow, COLOR.green].map((c) => <span key={c} style={{width: 18, height: 18, borderRadius: 9, background: c}} />)}
        <span style={{marginLeft: 18}}>{title}</span>
      </div>
      <div style={{padding: '22px 28px', lineHeight: '52px', color: 'var(--vt-text)'}}>
        {STEPS.map((s) => <Step key={s.id} s={s} />)}
      </div>
    </div>
  );
}

const TYPING = 0.45;
function Step({s}: {s: (typeof STEPS)[number]}) {
  const p = useProp(`step-${s.id}`, 'p', 0);
  const typed = Math.round(clamp01(p / TYPING) * s.cmd.length);
  return (
    <Obj id={`step-${s.id}`} style={{visibility: p > 0 ? 'visible' : 'hidden'}}>
      <div><span style={{color: COLOR.green}}>$ </span>{s.cmd.slice(0, typed)}{typed < s.cmd.length && <span style={{color: 'var(--vt-muted)'}}>▌</span>}</div>
      {s.out.map((line, k) => (
        <div key={line} style={{color: 'var(--vt-muted)', visibility: p >= TYPING + ((1 - TYPING) * (k + 1)) / (s.out.length + 1) ? 'visible' : 'hidden'}}>{line}</div>
      ))}
    </Obj>
  );
}

/** The project's files, one row each. */
function Files() {
  return (
    <div style={{position: 'absolute', inset: 0}}>
      {FILES.map((f, i) => (
        <Obj key={f.id} id={`f-${f.id}`} style={{position: 'absolute', left: 0, top: i * 120, height: 90, display: 'flex', alignItems: 'center', gap: 28, color: f.color, fontFamily: MONO, fontSize: 44}}>
          <Icon name={f.icon} size={70} color={f.color} />{f.name}
        </Obj>
      ))}
    </div>
  );
}

/** The activate command, marked by a red "no" sign beside it that is drawn (a line across the text would cut it). */
function Activate() {
  const draw = useProp('act-x', 'draw', 0);
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <Obj id="act" style={{position: 'absolute', left: 0, top: 70, width: 790, height: 80, boxSizing: 'border-box', borderRadius: 14, border: `3px solid ${COLOR.red}`, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingLeft: 60, fontFamily: MONO, fontSize: 36, color: 'var(--vt-muted)'}}>
        source .venv/bin/activate
        <Obj id="act-x" style={{position: 'absolute', left: 24, top: 10, width: 54, height: 54}}>
          <svg width="54" height="54" viewBox="0 0 54 54" fill="none" stroke={COLOR.red} strokeWidth={6} strokeLinecap="round">
            <circle cx={27} cy={27} r={22} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
            <line x1={11} y1={43} x2={43} y2={11} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
          </svg>
        </Obj>
      </Obj>
    </div>
  );
}

/** The three platform badges, with an arrow from the lockfile to each. */
function Platforms() {
  const draw = useProp('edges', 'draw', 0);
  const BADGE = {w: 240, h: 80, stride: 270, top: 116}, ORIGIN = {x: 60, y: 0};
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <Obj id="edges" style={{position: 'absolute', left: 0, top: 0, width: 830, height: BADGE.top - 6}}>
        <svg width="830" height={BADGE.top - 6} style={{overflow: 'visible'}}>
          {PLATFORMS.map((p, i) => {
            const tx = BADGE.w / 2 + i * BADGE.stride, ty = BADGE.top - 8;
            const angle = Math.atan2(ty - ORIGIN.y, tx - ORIGIN.x);
            const head = [-0.45, 0.45].map((a) => `${tx - 24 * Math.cos(angle + a)},${ty - 24 * Math.sin(angle + a)}`).join(' ');
            return (
              <g key={p.id} stroke={COLOR.yellow} strokeWidth={3} fill="none" strokeLinecap="round">
                <line x1={ORIGIN.x} y1={ORIGIN.y} x2={tx} y2={ty} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
                <polyline points={`${head.split(' ')[0]} ${tx},${ty} ${head.split(' ')[1]}`} opacity={clamp01((draw - 0.85) / 0.15)} />
              </g>
            );
          })}
        </svg>
      </Obj>
      {PLATFORMS.map((p, i) => (
        <Obj key={p.id} id={`p-${p.id}`} style={{position: 'absolute', left: i * BADGE.stride, top: BADGE.top, width: BADGE.w, height: BADGE.h, boxSizing: 'border-box', borderRadius: 16, border: `3px solid ${p.color}`, background: 'var(--vt-panel)', color: p.color, fontSize: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--vt-sans)'}}>{p.name}</Obj>
      ))}
    </div>
  );
}

export default <Doc id="uv" poster={79} title="uv, the one tool for Python projects" lang="en" theme="visotalk/dark" canvas="16x9">
  <Part id="title" x={0} y={40} w={1920} h={170}>{() => <Heading />}</Part>

  <Scene id="tools">
    <Line id="h1l">Setting up a Python project usually means juggling a pile of tools.</Line>
    <Line id="h2l" hold={1.5}>pip to install packages, virtualenv for environments, pip-tools to pin versions, pipx for command line tools, pyenv for Python itself, and poetry or twine to publish.</Line>
    <Line id="h3l" hold={2.5}>uv, from Astral, the team behind Ruff, replaces all of them with a single binary, written in Rust.</Line>
    <Part id="toolbox" x={0} y={230} w={1920} h={650}>{() => <Toolbox />}</Part>
    <Animation>
      <Appear target="title" line="h1l" word="Python project" dur={0}/>
      <Appear target="toolbox" line="h2l" word="pip" dur={0}/>
      <Set target="head" to={{text: "Python project setup"}} at="start"/>
      <Set target="kick" to={{text: "Astral"}} at="start"/>
      <Appear target="head" line="h1l" word="Python project"/>

      <Appear target="t-pip" line="h2l" word="pip"/>
      <Appear target="j-pip" line="h2l" word="install packages"/>
      <Appear target="t-virtualenv" line="h2l" word="virtualenv"/>
      <Appear target="j-virtualenv" line="h2l" word="environments"/>
      <Appear target="t-pip-tools" line="h2l" word="pip-tools"/>
      <Appear target="j-pip-tools" line="h2l" word="pin versions"/>
      <Appear target="t-pipx" line="h2l" word="pipx"/>
      <Appear target="j-pipx" line="h2l" word="command line tools"/>
      <Appear target="t-pyenv" line="h2l" word="pyenv"/>
      <Appear target="j-pyenv" line="h2l" word="Python itself"/>
      <Appear target="t-poetry" line="h2l" word="poetry"/>
      <Appear target="t-twine" line="h2l" word="twine"/>
      <Appear target={["j-poetry", "j-twine"]} line="h2l" word="publish"/>

      <Set target="head" to={{text: "uv"}} line="h3l" word="uv"/>
      <Appear target="kick" line="h3l" word="Astral"/>
      <Set target="kick" to={{text: "Astral, the team behind Ruff"}} line="h3l" word="Ruff"/>
      <Disappear target={["j-pip", "j-virtualenv", "j-pip-tools", "j-pipx", "j-pyenv", "j-poetry", "j-twine"]} stagger={0.05} line="h3l" word="replaces"/>
      <Tween id="mv" target="toolbox" to={{merge: 1}} dur={0.8} line="h3l" word="them"/>
      <Appear target="uvblock" after="mv"/>
      <Tween target="uvblock" to={{w: 1000, h: 260}} dur={0.7} after="mv"/>
      <Appear target="uvtxt" after="mv" offset={0.7}/>
      <Appear target="bin" line="h3l" word="single binary"/>
      <Appear target="rust" line="h3l" word="Rust"/>
    </Animation>
  </Scene>

  <Scene id="speed">
    <Line id="s1l" hold={2}>The headline feature is speed: the README claims ten to a hundred times faster than pip.</Line>
    <Line id="s2l" hold={1.5}>So we measured it ourselves: same machine, same Python, a warm cache, and the thirty eight packages behind Trio's documentation.</Line>
    <Line id="s3l" hold={2}>uv is done almost instantly, in about a sixth of a second. pip needs more than eight.</Line>
    <Line id="s4l" hold={2.5}>That is about fifty times faster, right inside the range the README promises.</Line>
    <Part id="ruler" x={0} y={230} w={1920} h={650}>{() => <Ruler />}</Part>
    <Part id="bench" x={0} y={230} w={1920} h={650}>{() => <Bench />}</Part>
    <Part id="bars" x={0} y={230} w={1920} h={650}>{() => <Bars />}</Part>
    <Animation>
      <Appear target="ruler" line="s1l" word="speed" dur={0}/>
      <Set target="head" to={{text: "10x to 100x faster than pip?"}} at="start"/>
      <Set target="kick" to={{text: "The README claim"}} at="start"/>
      <Appear target="r-line" line="s1l" word="speed"/>
      <Tween target="r-line" to={{draw: 1}} dur={0.8} line="s1l" word="speed"/>
      <Appear target="r-ticks" line="s1l" word="README"/>
      <Appear target="r-band" line="s1l" word="ten to a hundred"/>
      <Tween target="r-band" to={{fill: 1}} dur={1} line="s1l" word="ten to a hundred"/>
      <Appear target="r-pip" line="s1l" word="pip"/>

      <Disappear target="ruler" line="s2l"/>
      <Set target="head" to={{text: "The benchmark"}} line="s2l"/>
      <Set target="kick" to={{text: ""}} line="s2l"/>
      <Appear target="bench" line="s2l" word="same machine" dur={0}/>
      <Appear target="k-machine" line="s2l" word="same machine"/>
      <Appear target="k-python" line="s2l" word="same Python"/>
      <Appear target="k-cache" line="s2l" word="warm cache"/>
      <Appear target="k-packages" line="s2l" word="thirty eight packages"/>
      <Appear target="k-source" line="s2l" word="Trio's documentation"/>

      <Disappear target="bench" line="s2l" edge="end" offset={1.1}/>
      <Appear target="bars" line="s3l"/>
      <Set target="head" to={{text: "Install time"}} line="s3l" word="uv"/>
      <Appear target={["b-uv-name", "b-uv"]} line="s3l" word="uv"/>
      <Tween target="b-uv" to={{t: 0.17}} dur={0.3} line="s3l" word="uv"/>
      <Appear target="b-uv-time" line="s3l" word="sixth of a second"/>
      <Appear target={["b-pip-name", "b-pip"]} line="s3l" word="pip needs"/>
      <Tween target="b-pip" to={{t: 8}} dur={1.6} line="s3l" word="pip needs"/>
      <Appear target="b-pip-time" line="s3l" word="more than eight"/>

      <Disappear target="bars" line="s3l" edge="end" offset={1.4}/>
      <Appear target="ruler" line="s4l"/>
      <Set target="head" to={{text: "10x to 100x faster than pip?"}} line="s4l"/>
      <Set target="kick" to={{text: "The README claim"}} line="s4l"/>
      <Appear target="r-mark" line="s4l" word="fifty"/>
      <Appear target="r-50" line="s4l" word="times faster"/>
    </Animation>
  </Scene>

  <Scene id="project">
    <Line id="p1l" hold={2}>uv is also a full project manager, in the spirit of Poetry.</Line>
    <Line id="p2l">uv init creates a project, and uv add resolves, locks, and installs a dependency, creating the virtual environment for you.</Line>
    <Line id="p3l" hold={1}>uv run executes commands inside that environment, so there is no activate step to forget.</Line>
    <Line id="p4l" hold={2.5}>And uv lock maintains a universal lockfile that works across platforms.</Line>
    <Part id="poetry" x={660} y={440} w={600} h={150}>{() => (
      <div style={{width: '100%', height: '100%', boxSizing: 'border-box', borderRadius: 28, border: `3px solid ${COLOR.cyan}`, background: 'var(--vt-panel)', color: COLOR.cyan, fontFamily: MONO, fontSize: 80, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>poetry</div>
    )}</Part>
    <Part id="term" x={100} y={230} w={840} h={640}>{() => <Terminal title="~/demo" />}</Part>
    <Part id="files" x={1010} y={230} w={800} h={340}>{() => <Files />}</Part>
    <Part id="outcome" x={1010} y={600} w={830} h={260}>{() => <><Activate /><Platforms /></>}</Part>
    <Animation>
      <Set target="head" to={{text: "A full project manager"}} at="start"/>
      <Set target="kick" to={{text: ""}} at="start"/>
      <Appear target="files" line="p2l" word="creates a project" dur={0}/>
      <Appear target="outcome" line="p3l" word="no activate step" dur={0}/>
      <Appear target="poetry" line="p1l" word="Poetry"/>

      <Disappear target="poetry" line="p1l" edge="end" offset={1.6}/>
      <Appear target="term" line="p2l" word="uv init"/>
      <Tween target="step-init" to={{p: 1}} dur={1} line="p2l" word="uv init"/>
      <Appear target="f-pyproject" line="p2l" word="creates a project"/>
      <Tween target="step-add" to={{p: 1}} dur={1.6} line="p2l" word="uv add"/>
      <Appear target="f-lock" line="p2l" word="locks"/>
      <Appear target="f-venv" line="p2l" word="virtual environment"/>

      <Tween target="step-run" to={{p: 1}} dur={1.2} line="p3l" word="uv run"/>
      <Appear target="act" line="p3l" word="no activate step"/>
      <Appear target="act-x" line="p3l" word="to forget"/>
      <Tween target="act-x" to={{draw: 1}} dur={0.6} line="p3l" word="to forget"/>

      <Disappear target="act" line="p4l"/>
      <Tween target="step-lock" to={{p: 1}} dur={1} line="p4l" word="uv lock"/>
      <Appear target={["p-linux", "p-mac", "p-win"]} stagger={0.25} line="p4l" word="platforms"/>
      <Appear target="edges" line="p4l" word="platforms" offset={0.4}/>
      <Tween target="edges" to={{draw: 1}} dur={0.6} line="p4l" word="platforms" offset={0.4}/>
    </Animation>
  </Scene>
</Doc>;
