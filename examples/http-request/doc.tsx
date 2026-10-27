import {Doc, Scene, Line, Part, Animation, Appear, Disappear, Tween, Set} from '@visotalk/jsx';
import {Obj, useProp} from '@visotalk/runtime';

/**
 * "From URL to Page": what happens between pressing Enter and the page appearing.
 * One wireframe page is the thread: it is the empty window's future in scene one, and it is painted, grown and left on screen in the last scene.
 * Every address, header and file name is an illustration (reserved example domains and documentation IP ranges), not a measurement.
 */

const SANS = 'var(--vt-sans)', MONO = 'var(--vt-mono)';
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const URL_TEXT = 'https://learn.example/tides';

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const mix = (a: string, b: string, t: number) => {
  const x = hex(a), y = hex(b);
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * clamp01(t))).join(',')})`;
};
const GREY = '#2c3548';

/** The wireframe page; `paint` 0 is outlines, 1 is the finished page. 800 x 520 units. */
function PageArt({paint}: {paint: number}) {
  const f = (c: string) => mix(GREY, c, paint);
  return (
    <svg viewBox="0 0 800 520" width="100%" height="100%" style={{display: 'block'}}>
      <rect x={2} y={2} width={796} height={516} rx={20} fill="#0F1420" stroke="#3A4559" strokeWidth={4} />
      <rect x={40} y={40} width={300} height={40} rx={10} fill={f('#E8ECF4')} />
      <rect x={440} y={48} width={90} height={24} rx={8} fill={f('#8792A6')} />
      <rect x={560} y={48} width={90} height={24} rx={8} fill={f('#8792A6')} />
      <rect x={670} y={48} width={90} height={24} rx={8} fill={f('#8792A6')} />
      <rect x={40} y={110} width={720} height={190} rx={16} fill={f('#4C8DFF')} />
      <path d="M40 300 L190 190 L300 255 L450 150 L600 260 L760 190 L760 284 A16 16 0 0 1 744 300 Z" fill={f('#FF8A4C')} opacity={paint} />
      <circle cx={620} cy={170} r={28} fill={f('#FBBF24')} />
      <rect x={40} y={336} width={460} height={20} rx={8} fill={f('#B4BDCC')} />
      <rect x={40} y={372} width={400} height={20} rx={8} fill={f('#B4BDCC')} />
      <rect x={40} y={408} width={430} height={20} rx={8} fill={f('#B4BDCC')} />
      <rect x={560} y={344} width={200} height={72} rx={36} fill={f('#4ADE80')} />
      <rect x={40} y={456} width={720} height={4} rx={2} fill={f('#3A4559')} />
    </svg>
  );
}

/** A small keycap-like badge */
const Pill = ({children, color, size = 34}: {children: any; color: string; size?: number}) => (
  <span style={{fontFamily: MONO, fontSize: size, color, border: `3px solid ${color}`, borderRadius: 14, padding: '4px 16px'}}>{children}</span>
);

/** A padlock; `open` 1 lifts the shackle, 0 closes it */
function Padlock({open, size}: {open: number; size: number}) {
  return (
    <svg viewBox="0 0 100 120" width={size} height={size * 1.2}>
      <path d={`M28 56 V${38 - open * 20} A22 22 0 0 1 72 ${38 - open * 20} V56`} fill="none" stroke="#4ADE80" strokeWidth={9} strokeLinecap="round" />
      <rect x={14} y={54} width={72} height={58} rx={12} fill="#4ADE80" />
      <circle cx={50} cy={80} r={8} fill="#0B0E14" />
      <rect x={46} y={84} width={8} height={16} rx={3} fill="#0B0E14" />
    </svg>
  );
}

/** A key, drawn as one outline */
const Key = ({size, color}: {size: number; color: string}) => (
  <svg viewBox="0 0 120 60" width={size} height={size / 2}>
    <circle cx={26} cy={30} r={18} fill="none" stroke={color} strokeWidth={9} />
    <path d="M44 30 H112 M92 30 V46 M108 30 V42" fill="none" stroke={color} strokeWidth={9} strokeLinecap="round" />
  </svg>
);

/** A horizontal arrow as one filled shape, 'right' or 'left' */
const Arrow = ({w, dir, color}: {w: number; dir: 'right' | 'left'; color: string}) => (
  <svg viewBox={`0 0 ${w} 40`} width={w} height={40} style={{display: 'block'}}>
    {dir === 'right'
      ? <path d={`M0 16 H${w - 30} V2 L${w} 20 L${w - 30} 38 V24 H0 Z`} fill={color} />
      : <path d={`M${w} 16 H30 V2 L0 20 L30 38 V24 H${w} Z`} fill={color} />}
  </svg>
);

const Tag = ({name, color}: {name: string; color: string}) => (
  <div style={{boxSizing: 'border-box', width: '100%', height: '100%', borderRadius: 24, background: 'var(--vt-panel)', border: `4px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SANS, fontSize: 52, fontWeight: 700, color}}>{name}</div>
);

const Label = ({children, color = 'var(--vt-muted)', size = 34}: {children: any; color?: string; size?: number}) => (
  <div style={{fontFamily: SANS, fontSize: size, color, fontWeight: 700, letterSpacing: 1}}>{children}</div>
);

// ------------------------------------------------------------------------------------------------ scene 1

function Window() {
  const chars = useProp('chars', 0);
  const shown = URL_TEXT.slice(0, Math.round(chars));
  return (
    <div style={{boxSizing: 'border-box', width: '100%', height: '100%', background: 'var(--vt-panel)', border: '4px solid var(--vt-border)', borderRadius: 28, overflow: 'hidden', position: 'relative'}}>
      <div style={{height: 110, background: 'var(--vt-panel2)', display: 'flex', alignItems: 'center', gap: 22, padding: '0 36px', borderBottom: '4px solid var(--vt-border)'}}>
        {['#F87171', '#FBBF24', '#4ADE80'].map((c) => <div key={c} style={{width: 22, height: 22, borderRadius: 11, background: c}} />)}
        <div style={{flex: 1, height: 70, borderRadius: 35, background: 'var(--vt-bg)', border: '3px solid var(--vt-faint)', display: 'flex', alignItems: 'center', padding: '0 34px', fontFamily: MONO, fontSize: 40, color: 'var(--vt-text)', marginLeft: 20}}>
          {shown}
          <span style={{display: 'inline-block', width: 4, height: 44, background: 'var(--vt-grad)', marginLeft: 4, opacity: chars > 0 && chars < URL_TEXT.length + 1 ? 1 : 0}} />
        </div>
      </div>
      <div style={{position: 'absolute', left: 275, top: 140, width: 770, height: 500}}>
        <Obj id="page">
          <PageArt paint={1} />
        </Obj>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ scene 2

const BOOK = [
  {id: 'a', name: 'shop.example', ip: '198.51.100.20'},
  {id: 'b', name: 'learn.example', ip: '203.0.113.7'},
  {id: 'c', name: 'mail.example', ip: '192.0.2.8'},
];

function Book() {
  const hl = useProp('hl', 0);
  return (
    <div style={{width: '100%', height: '100%', background: 'var(--vt-panel)', border: '4px solid var(--vt-border)', borderRadius: 28, padding: '34px 44px', boxSizing: 'border-box'}}>
      <Label color="var(--vt-op)" size={40}>DNS</Label>
      <div style={{marginTop: 18, display: 'grid', rowGap: 16}}>
        {BOOK.map((r) => (
          <div key={r.id} style={{position: 'relative', display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: 40, color: 'var(--vt-text)', padding: '16px 26px', borderRadius: 16, background: 'var(--vt-panel2)', boxShadow: r.id === 'b' && hl > 0.5 ? 'inset 0 0 0 5px #B794FF' : 'none'}}>
            <span style={{position: 'relative', zIndex: 1}}>{r.name}</span><span style={{position: 'relative', zIndex: 1, color: 'var(--vt-muted)'}}>{r.ip}</span>
          </div>
        ))}
      </div>
      <div style={{marginTop: 22, fontFamily: SANS, fontSize: 28, color: 'var(--vt-muted)'}}>example entries</div>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ scene 5

const CODE = ['<html>', '  <head>', '    <link css>', '    <script>', '  </head>', '  <body>', '    <h1>Tides</h1>', '    <img src>', '    <p>…</p>', '  </body>'];
const NODES = [
  {id: 'html', x: 80, y: 20, p: null as null | string},
  {id: 'head', x: 30, y: 150, p: 'html'},
  {id: 'body', x: 190, y: 150, p: 'html'},
  {id: 'h1', x: 60, y: 300, p: 'body'},
  {id: 'img', x: 190, y: 300, p: 'body'},
  {id: 'p', x: 320, y: 300, p: 'body'},
];
const np = (id: string) => NODES.find((n) => n.id === id)!;

function Tree() {
  return (
    <svg viewBox="0 0 440 380" width="100%" height="100%">
      {NODES.map((n) => (
        <Obj key={n.id} id={`node-${n.id}`} as="g">
          {n.p ? <path d={`M${np(n.p).x + 50} ${np(n.p).y + 56} L${n.x + 50} ${n.y}`} stroke="#8792A6" strokeWidth={5} fill="none" /> : null}
          <rect x={n.x} y={n.y} width={100} height={56} rx={14} fill="#171E2B" stroke="#B794FF" strokeWidth={4} />
          <text x={n.x + 50} y={n.y + 38} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize={28} fill="#E8ECF4">{n.id}</text>
        </Obj>
      ))}
    </svg>
  );
}

function PageWire() {
  const paint = useProp('paint', 0);
  return <PageArt paint={paint} />;
}

// ------------------------------------------------------------------------------------------------ document

export default <Doc id="http-request" poster={33} title={"From URL to Page"} lang={"en"} theme="visotalk/dark" canvas="16x9">
  <Scene id="type">
    <Line id="l1">You type a web address and press Enter.</Line>
    <Line id="l2">A moment later, a page appears.</Line>
    <Line id="l3">Here is everything that happens in between.</Line>
    <Part id="win" x={300} y={70} w={1320} h={680}>{() => <Window />}</Part>
    <Part id="enter" x={1250} y={770} w={370} h={100}>{() => (
      <div style={{boxSizing: 'border-box', width: '100%', height: '100%', borderRadius: 22, background: 'var(--vt-panel2)', border: '4px solid var(--vt-grad)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, fontFamily: MONO, fontSize: 44, color: 'var(--vt-grad)', fontWeight: 700}}>Enter <span>↵</span></div>
    )}</Part>
    <Animation>
      <Appear target="win" at="start" dur={0} />
      <Tween target="win" line="l1" word="type" to={{chars: 27}} dur={1.4} easing="linear" />
      <Appear target="enter" line="l1" word="press" />
      <Tween target="enter" id="press" line="l1" word="enter" to={{scale: 0.9}} dur={0.15} />
      <Tween target="enter" after="press" to={{scale: 1}} dur={0.2} />
      <Appear target="page" line="l2" word="page" />
      <Disappear target="page" line="l3" word="everything" />
      <Disappear target="enter" line="l3" word="everything" />
    </Animation>
  </Scene>

  <Scene id="dns">
    <Line id="l4">First, the browser needs a number. Computers find each other by address, not by name.</Line>
    <Line id="l5" text="So it asks DNS, the internet's phone book, and gets an IP address back.">So it asks D N S, the internet's phone book, and gets an I P address back.</Line>
    <Line id="l5b">Answers are remembered for a while, so the next visit skips this step.</Line>
    <Part id="browser" x={90} y={190} w={560} h={560}>{() => {
      const got = useProp('got', 0) > 0.5;
      return (
      <div style={{width: '100%', height: '100%', background: 'var(--vt-panel)', border: '4px solid var(--vt-border)', borderRadius: 28, padding: '34px 40px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 26}}>
        <Label color="var(--vt-data)" size={40}>Browser</Label>
        <div style={{fontFamily: MONO, fontSize: 40, color: 'var(--vt-text)'}}>
          <Obj id="name" style={{padding: '14px 20px', borderRadius: 14, background: 'var(--vt-panel2)'}}>learn.example</Obj>
        </div>
        <Obj id="slot" style={{height: 110, boxSizing: 'border-box', fontFamily: MONO, fontSize: 48, border: `4px ${got ? 'solid' : 'dashed'} ${got ? 'var(--vt-good)' : 'var(--vt-muted)'}`, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: got ? 'var(--vt-good)' : 'var(--vt-muted)', background: got ? 'var(--vt-panel2)' : 'transparent'}}>{got ? '203.0.113.7' : '? . ? . ? . ?'}</Obj>
        <div style={{fontFamily: SANS, fontSize: 28, color: 'var(--vt-muted)'}}>an example address</div>
        <Obj id="cached" style={{fontFamily: SANS, fontSize: 34, fontWeight: 700, color: 'var(--vt-warn)'}}>remembered for later</Obj>
      </div>
      );
    }}</Part>
    <Part id="book" x={1000} y={190} w={830} h={560}>{() => <Book />}</Part>
    <Part id="ask" x={640} y={300} w={380} h={120}>{() => (
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6}}>
        <div style={{fontFamily: MONO, fontSize: 32, color: 'var(--vt-text)'}}>learn.example?</div>
        <Arrow w={340} dir="right" color="#FF8A4C" />
      </div>
    )}</Part>
    <Part id="answer" x={640} y={500} w={380} h={120}>{() => (
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6}}>
        <div style={{fontFamily: MONO, fontSize: 32, color: 'var(--vt-good)'}}>203.0.113.7</div>
        <Arrow w={340} dir="left" color="#4ADE80" />
      </div>
    )}</Part>
    <Animation>
      <Appear target="browser" line="l4" word="browser" />
      <Appear target="slot" line="l4" word="number" />
      <Appear target="name" line="l4" word="by name" />
      <Appear target="book" line="l5" word="D N S" />
      <Appear target="ask" line="l5" word="phone book" />
      <Tween target="book" line="l5" word="address back" to={{hl: 1}} dur={0.2} />
      <Appear target="answer" line="l5" word="address back" />
      <Set target="browser" line="l5" word="address back" offset={0.5} to={{got: 1}} />
      <Appear target="cached" line="l5b" word="remembered" />
    </Animation>
  </Scene>

  <Scene id="connect">
    <Line id="l6" text="Next, the browser opens a connection to that address, with three tiny messages: hello, hello back, and agreed.">Next, the browser opens a connection to that address, with three tiny messages: hello, hello back, and agreed.</Line>
    <Line id="l7">Then both sides agree on a secret key, so everything after is encrypted. The padlock closes.</Line>
    <Part id="ends" x={0} y={0}>{() => (
      <div style={{position: 'relative', width: 1920, height: 1080, fontFamily: SANS}}>
        {[{x: 300, n: 'Browser', c: 'var(--vt-data)'}, {x: 1620, n: 'Server', c: 'var(--vt-grad)'}].map((e) => (
          <div key={e.n}>
            <div style={{position: 'absolute', left: e.x - 150, top: 70, width: 300, height: 90, borderRadius: 22, background: 'var(--vt-panel)', border: `4px solid ${e.c}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44, fontWeight: 700, color: e.c}}>{e.n}</div>
            <div style={{position: 'absolute', left: e.x - 2, top: 160, width: 0, height: 650, borderLeft: '4px dashed var(--vt-faint)'}} />
          </div>
        ))}
      </div>
    )}</Part>
    <Part id="m1" x={310} y={215} w={1300} h={110}>{() => (
      <div style={{position: 'relative', width: '100%', height: '100%'}}>
        <div style={{position: 'absolute', left: 0, top: 0, width: '100%', textAlign: 'center', fontFamily: SANS, fontSize: 46, fontWeight: 700, color: 'var(--vt-text)'}}>hello <span style={{fontFamily: MONO, fontSize: 30, color: 'var(--vt-muted)', fontWeight: 400}}>SYN</span></div>
        <div style={{position: 'absolute', left: 0, top: 64}}><Arrow w={1300} dir="right" color="#6CB6FF" /></div>
      </div>
    )}</Part>
    <Part id="m2" x={310} y={335} w={1300} h={110}>{() => (
      <div style={{position: 'relative', width: '100%', height: '100%'}}>
        <div style={{position: 'absolute', left: 0, top: 0, width: '100%', textAlign: 'center', fontFamily: SANS, fontSize: 46, fontWeight: 700, color: 'var(--vt-text)'}}>hello back <span style={{fontFamily: MONO, fontSize: 30, color: 'var(--vt-muted)', fontWeight: 400}}>SYN-ACK</span></div>
        <div style={{position: 'absolute', left: 0, top: 64}}><Arrow w={1300} dir="left" color="#FF8A4C" /></div>
      </div>
    )}</Part>
    <Part id="m3" x={310} y={455} w={1300} h={110}>{() => (
      <div style={{position: 'relative', width: '100%', height: '100%'}}>
        <div style={{position: 'absolute', left: 0, top: 0, width: '100%', textAlign: 'center', fontFamily: SANS, fontSize: 46, fontWeight: 700, color: 'var(--vt-text)'}}>agreed <span style={{fontFamily: MONO, fontSize: 30, color: 'var(--vt-muted)', fontWeight: 400}}>ACK</span></div>
        <div style={{position: 'absolute', left: 0, top: 64}}><Arrow w={1300} dir="right" color="#6CB6FF" /></div>
      </div>
    )}</Part>
    <Part id="keyl" x={360} y={640} w={200} h={110}>{() => <Key size={180} color="#FBBF24" />}</Part>
    <Part id="keyr" x={1360} y={640} w={200} h={110}>{() => <Key size={180} color="#FBBF24" />}</Part>
    <Part id="pipe" x={300} y={750} w={1320} h={80}>{() => (
      <div style={{boxSizing: 'border-box', width: '100%', height: '100%', borderRadius: 40, background: 'var(--vt-panel2)', border: '4px solid var(--vt-good)', display: 'flex', alignItems: 'center', paddingLeft: 60, fontFamily: SANS, fontSize: 38, color: 'var(--vt-good)', fontWeight: 700}}>encrypted</div>
    )}</Part>
    <Part id="lock" x={880} y={582} w={160} h={190}>{() => {
      const open = useProp('open', 1);
      return <Padlock open={open} size={140} />;
    }}</Part>
    <Animation>
      <Appear target="ends" at="start" dur={0} />
      <Appear target="m1" line="l6" word="hello" nth={1} />
      <Appear target="m2" line="l6" word="hello back" />
      <Appear target="m3" line="l6" word="agreed" />
      <Appear target={["keyl", "keyr"]} stagger={0.3} line="l7" word="secret key" />
      <Appear target="pipe" line="l7" word="encrypted" />
      <Appear target="lock" line="l7" word="padlock" />
      <Tween target="lock" line="l7" word="closes" to={{open: 0}} dur={0.5} easing="easeOutBack(2)" />
    </Animation>
  </Scene>

  <Scene id="http">
    <Line id="l8">Now the browser sends a request: get me this page.</Line>
    <Line id="l9" text="The server answers with a status code, 200 meaning success, and the page's HTML.">The server answers with a status code, two hundred meaning success, and the page's H T M L.</Line>
    <Part id="reqlabel" x={120} y={90} w={900} h={60}>{() => <Label color="var(--vt-data)" size={36}>REQUEST · browser → server · example</Label>}</Part>
    <Part id="req" x={120} y={150} w={960} h={240}>{() => {
      const chars = useProp('chars', 0);
      const text = 'GET /tides HTTP/1.1\nHost: learn.example';
      return (
        <div style={{width: '100%', height: '100%', boxSizing: 'border-box', background: 'var(--vt-panel)', border: '4px solid var(--vt-data)', borderRadius: 24, padding: '30px 40px', fontFamily: MONO, fontSize: 44, lineHeight: 1.5, color: 'var(--vt-text)', whiteSpace: 'pre'}}>{text.slice(0, Math.round(chars))}</div>
      );
    }}</Part>
    <Part id="reqarrow" x={1110} y={230} w={220} h={50}>{() => <Arrow w={200} dir="right" color="#6CB6FF" />}</Part>
    <Part id="srv" x={1350} y={180} w={400} h={110}>{() => <Tag name="Server" color="var(--vt-grad)" />}</Part>
    <Part id="brw" x={120} y={590} w={400} h={110}>{() => <Tag name="Browser" color="var(--vt-data)" />}</Part>
    <Part id="reslabel" x={840} y={450} w={960} h={60}>{() => <Label color="var(--vt-grad)" size={36}>RESPONSE · server → browser · example</Label>}</Part>
    <Part id="res" x={840} y={510} w={960} h={350}>{() => (
      <div style={{width: '100%', height: '100%', boxSizing: 'border-box', background: 'var(--vt-panel)', border: '4px solid var(--vt-grad)', borderRadius: 24, padding: '26px 40px', fontFamily: MONO, color: 'var(--vt-text)'}}>
        <Obj id="status" style={{fontSize: 56, fontWeight: 700, color: 'var(--vt-good)'}}>HTTP/1.1 200 OK</Obj>
        <div style={{fontSize: 32, color: 'var(--vt-muted)', margin: '10px 0 14px'}}>Content-Type: text/html</div>
        <Obj id="body" style={{fontSize: 34, lineHeight: 1.4, whiteSpace: 'pre', borderTop: '3px solid var(--vt-faint)', paddingTop: 14}}>{'<!doctype html>\n<h1>Tides</h1>\n<p>Twice a day…</p>'}</Obj>
      </div>
    )}</Part>
    <Part id="resarrow" x={560} y={620} w={220} h={50}>{() => <Arrow w={200} dir="left" color="#FF8A4C" />}</Part>
    <Animation>
      <Appear target="reqlabel" line="l8" word="request" />
      <Appear target="req" line="l8" word="request" />
      <Tween target="req" line="l8" word="request" to={{chars: 39}} dur={1.8} easing="linear" />
      <Appear target={["reqarrow", "srv"]} line="l8" word="get me" />
      <Appear target={["reslabel", "res", "resarrow", "brw"]} line="l9" word="server" />
      <Appear target="status" line="l9" word="status code" />
      <Appear target="body" line="l9" word="H T M L" />
    </Animation>
  </Scene>

  <Scene id="render">
    <Line id="l10" text="The browser reads that HTML from top to bottom, and finds more files it needs: styles, scripts and images.">The browser reads that H T M L from top to bottom, and finds more files it needs: styles, scripts and images.</Line>
    <Line id="l11">It fetches them, builds the page's structure, works out the layout, and paints the pixels.</Line>
    <Line id="l12">And the page appears.</Line>
    <Line id="l13">Scripts run, and the page is ready for your first click.</Line>
    <Part id="cursor" x={1250} y={570} w={90} h={110}>{() => (
      <svg viewBox="0 0 60 80" width={90} height={110}><path d="M6 4 L6 60 L22 46 L34 72 L44 67 L32 42 L54 42 Z" fill="#E8ECF4" stroke="#0B0E14" strokeWidth={4} strokeLinejoin="round" /></svg>
    )}</Part>
    <Part id="code" x={90} y={90} w={660} h={470}>{() => {
      return (
        <div style={{position: 'relative', width: '100%', height: '100%', boxSizing: 'border-box', background: 'var(--vt-panel)', border: '4px solid var(--vt-border)', borderRadius: 24, padding: '20px 30px', fontFamily: MONO, fontSize: 34, lineHeight: '42px', color: 'var(--vt-text)', whiteSpace: 'pre', overflow: 'hidden'}}>
          {CODE.join('\n')}
          <Obj id="scan" style={{position: 'absolute', left: 0, top: 20, width: 14, height: 42, background: '#FF8A4C'}} />
        </div>
      );
    }}</Part>
    <Part id="files" x={90} y={600} w={1000} h={150}>{() => (
      <div style={{display: 'flex', gap: 28, fontFamily: MONO, fontSize: 36, paddingTop: 40}}>
        {[{id: 'css', n: 'style.css', c: '#B794FF'}, {id: 'js', n: 'app.js', c: '#FBBF24'}, {id: 'img', n: 'tides.jpg', c: '#6CB6FF'}].map((f) => (
          <Obj key={f.id} id={`file-${f.id}`} style={{position: 'relative', padding: '22px 86px 22px 26px', borderRadius: 18, border: `4px solid ${f.c}`, color: f.c, background: 'var(--vt-panel)'}}>
            {f.n}
            <Obj id={`ok-${f.id}`} style={{position: 'absolute', right: 20, top: 24, width: 40, height: 40, borderRadius: 20, background: 'var(--vt-good)', color: '#0B0E14', fontSize: 28, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>✓</Obj>
          </Obj>
        ))}
      </div>
    )}</Part>
    <Part id="tree" x={820} y={90} w={440} h={400}>{() => <Tree />}</Part>
    <Part id="treelabel" x={820} y={500} w={440} h={60}>{() => <Label color="var(--vt-op)" size={34}>structure</Label>}</Part>
    <Part id="pagewire" x={1300} y={160} w={560} h={364}>{() => <PageWire />}</Part>
    <Part id="pagelabel" x={1300} y={540} w={560} h={60}>{() => <Label size={34}>layout, then paint</Label>}</Part>
    <Animation>
      <Appear target="files" at="start" dur={0} />
      <Appear target="code" line="l10" word="reads" />
      <Appear target="scan" line="l10" word="top to bottom" />
      <Tween target="scan" line="l10" word="top to bottom" to={{y: 378}} dur={2.4} easing="linear" />
      <Appear target="file-css" line="l10" word="styles" />
      <Appear target="file-js" line="l10" word="scripts" />
      <Appear target="file-img" line="l10" word="images" />
      <Disappear target="scan" line="l11" offset={0.2} />
      <Appear target={["ok-css", "ok-js", "ok-img"]} stagger={0.2} line="l11" word="fetches them" />
      <Appear target="tree" line="l11" word="structure" />
      <Appear target="treelabel" line="l11" word="structure" />
      <Appear target="pagewire" line="l11" word="layout" />
      <Appear target="pagelabel" line="l11" word="layout" />
      <Tween target="pagewire" line="l11" word="paints" to={{paint: 1}} dur={1.2} />
      <Disappear target={["code", "files", "tree", "treelabel", "pagelabel"]} line="l12" word="page" />
      <Tween target="pagewire" line="l12" word="page" to={{x: -620, y: 100, scale: 1.7}} dur={1.0} easing="easeInOutQuad" />
      <Set target="cursor" at="start" to={{x: -300, y: 170}} />
      <Appear target="cursor" line="l13" word="scripts" />
      <Tween target="cursor" line="l13" word="ready" to={{x: 0, y: 0}} dur={1.0} easing="easeInOutQuad" />
    </Animation>
  </Scene>
</Doc>;
