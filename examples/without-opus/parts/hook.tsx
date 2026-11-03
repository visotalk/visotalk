// The opening: films other makers and we made in code, each credited in its corner, cut to its own score (audio/opening.mp3, 120 BPM, a bar is 2 s; the same cut as the first VisoTalk promo's):
//   "intro" (bars 1-8): a question, then its film; the first for three bars, then faster until one lands every eighth note
//   "hook": the drop, the camera pulls back into a wall of them, and the film's own question comes up over it
import {Obj, useAsset, useProp, useTime, Video} from '@visotalk/runtime';

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const mix = (a: number, b: number, k: number) => a + (b - a) * k;
const SANS = 'var(--vt-sans)';
const MONO = 'var(--vt-mono)';
const INK = 'var(--vt-text)';
const MUTED = 'var(--vt-muted)';
const CUE = 'var(--vt-grad)';
const DATA = 'var(--vt-data)';

type Ask = {q: string; by: string; still: string; clip?: string; in?: number; rate?: number; at: number; end: number};

// scene seconds, cut to the score: 3 bars, 1, 1, two halves, four quarters, eight eighths (16 s)
// each film plays from the middle of its action, sped up: [question, who made it, still, clip, its first second, rate]
// the corner names each film's project; the link, the licence and the note that it was cut are in the video's description, which CC BY 4.0 allows for LemoLab's
const LEMO = 'LemoLab';
const HUASHU = 'huashu-motion';
const SHOTCRAFT = 'video-shotcraft';
const LIST: Array<[string, string, string, string?, number?, number?]> = [
  ['一副耳机，怎么拍出玻璃的质感？', LEMO, 'l-glass-product', 'c-glass-product', 0, 1.4],
  ['一把键盘拆开，里面有什么？', LEMO, 'l-teardown', 'c-teardown', 0, 1.5],
  ['一台机器，怎么一层层拆开？', HUASHU, 'x-huashu-gears', 'c-huashu-gears', 1.3, 1.5],
  ['一盏灯，怎么守过一场风暴？', LEMO, 'l-hd-2d', 'c-hd-2d', 0, 1.5],
  ['一扇彩窗，怎么讲完一个故事？', LEMO, 'l-stained-glass', 'c-stained-glass', 0, 1.5],
  ['闪电是从哪儿来的？', 'VisoTalk', 'poster-night-diagram', 'o-night', 1, 1.6],
  ['一百多个镜头，摆在一起什么样？', SHOTCRAFT, 'x-shotcraft-wall'],
  ['指着画面，就能改？', HUASHU, 'x-huashu-painting'],
  ['雨水落下来，都去哪儿了？', 'VisoTalk', 'poster-earth-block'],
  ['一页纸，怎么讲一个项目？', SHOTCRAFT, 'x-shotcraft-press'],
  ['微缩城市的早高峰，是什么样？', LEMO, 'l-tilt-shift'],
  ['同一份提案，换一身衣服？', HUASHU, 'x-huashu-pages'],
  ['大海到底有多深？', 'VisoTalk', 'poster-plumb-line'],
  ['镜头怎么层层落下？', SHOTCRAFT, 'x-shotcraft-cascade'],
  ['一场众筹，能有多少种样子？', HUASHU, 'x-huashu-design'],
  ['这一段，用什么风格？', HUASHU, 'x-huashu-flying'],
  ['白光里藏着什么？', 'VisoTalk', 'poster-light-bench'],
];
const SLOTS = [[0, 6], [6, 8], [8, 10], [10, 11], [11, 12], [12, 12.5], [12.5, 13], [13, 13.5], [13.5, 14],
  ...Array.from({length: 8}, (_, k) => [14 + k * 0.25, 14.25 + k * 0.25])];
const ASKS: Ask[] = LIST.map(([q, by, still, clip, inPt, rate], i) => ({q, by, still, clip, in: inPt, rate, at: SLOTS[i][0], end: SLOTS[i][1]}));

// how long the question is typed before its film lands: typed for the long slots, swapped in for the short ones
const typeFor = (a: Ask) => { const d = a.end - a.at; return d >= 6 ? 1.5 : d >= 2 ? 0.7 : d >= 1 ? 0.4 : d >= 0.5 ? 0.2 : 0.1; };
const landOf = (a: Ask) => a.at + typeFor(a);
// how long a film takes to rise into place (and push the others back): unhurried at first, quicker as the pace builds
const riseOf = (a: Ask) => a.end - a.at >= 6 ? 1.0 : Math.min(0.7, Math.max(0.2, (a.end - a.at) * 0.45));
const ease = (k: number) => { const x = clamp(k); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const out = (k: number) => 1 - Math.pow(1 - clamp(k), 3);

const CW = 1400, CH = 788, CY = 610;

/** Every film rises from below into the front place and pushes the ones before it back, so the frame never cuts: it flows */
const Card = ({a, i, t}: {a: Ask; i: number; t: number}) => {
  const rise = out((t - landOf(a)) / riseOf(a));
  const depth = ASKS.slice(i + 1).reduce((d, b) => d + ease((t - landOf(b)) / riseOf(b)), 0);
  const still = useAsset(a.still);
  if (rise <= 0 || depth > 7) return null;
  const tilt = i % 2 ? 1.4 : -1.4;
  const y = mix(560, 0, rise) - depth * 46, z = -depth * 190, rot = mix(tilt * 3, 0, rise) + tilt * Math.min(1, depth) * 0.6;
  const dim = clamp(depth * 0.2 + (1 - rise) * 0.2, 0, 0.92);
  const live = depth < 0.5;
  return (
    <div style={{position: 'absolute', left: 960 - CW / 2, top: CY - CH / 2, width: CW, height: CH, borderRadius: 16, overflow: 'hidden',
      transform: `translate3d(0, ${y}px, ${z}px) rotate(${rot}deg)`, opacity: clamp(rise * 3) * clamp(7 - depth),
      boxShadow: '0 40px 120px rgba(0,0,0,0.8)', outline: `2px solid ${live ? 'rgba(116,185,246,0.35)' : 'rgba(255,255,255,0.08)'}`}}>
      {live && a.clip
        ? <div style={{position: 'absolute', inset: 0}}><Video asset={a.clip} in={a.in ?? 0} start={landOf(a)} rate={a.rate} fit="cover" /></div>
        : <img src={still} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover'}} />}
      <div style={{position: 'absolute', inset: 0, background: '#05070A', opacity: dim}} />
    </div>
  );
};

/** One prompt box stays on screen: the question is typed into it, and the film rises out of the dark under it */
export const Asks = () => {
  const t = useTime();
  const cur = ASKS.reduce((n, a, i) => (t >= a.at ? i : n), 0);
  const a = ASKS[cur], prev = cur > 0 ? ASKS[cur - 1] : null;
  const tq = typeFor(a), land = landOf(a);
  let text = a.q;
  if (t < land) {
    const k = clamp((t - a.at) / Math.max(0.05, tq * 0.92));
    const erase = prev && tq >= 0.35 ? 0.25 : 0;
    if (k < erase && prev) text = prev.q.slice(0, Math.round(prev.q.length * (1 - k / erase)));
    else text = a.q.slice(0, Math.round(a.q.length * clamp((k - erase) / (1 - erase))));
  }
  const caret = Math.floor(t / 0.25) % 2 === 0 || t < land;
  const lift = ease((t - landOf(ASKS[0]) + 0.1) / 0.5);
  const boxY = mix(470, 58, lift), size = mix(84, 48, lift);
  const sent = Math.pow(1 - clamp((t - land) / 0.35), 2) * (t >= land ? 1 : 0);
  const n = ASKS.filter((x) => t >= landOf(x)).length;
  return (
    <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(1500px 1000px at 50% 60%, #111A27, #05070A)', overflow: 'hidden', perspective: 1700, perspectiveOrigin: '50% 30%'}}>
      <div style={{position: 'absolute', inset: 0, transformStyle: 'preserve-3d'}}>
        {ASKS.map((x, i) => <Card key={i} a={x} i={i} t={t} />).reverse()}
      </div>
      <div style={{position: 'absolute', left: 0, top: boxY, width: 1920, display: 'flex', justifyContent: 'center'}}>
        <div style={{fontFamily: SANS, fontSize: size, fontWeight: 800, color: INK, padding: `${mix(22, 12, lift)}px ${mix(44, 28, lift)}px`, borderRadius: 14,
          background: `rgba(10, 15, 22, ${mix(0, 0.86, lift)})`, border: `2px solid rgba(74, 168, 242, ${mix(0, 0.55, lift) + sent * 0.45})`,
          boxShadow: `0 0 ${40 * sent}px rgba(74, 168, 242, ${0.7 * sent})`, whiteSpace: 'nowrap'}}>
          <span style={{color: DATA, marginRight: 18, opacity: lift}}>⏎</span>{text}<span style={{color: CUE, opacity: caret ? 1 : 0}}>▍</span>
        </div>
      </div>
      <div style={{position: 'absolute', left: 64, bottom: 44, fontFamily: MONO, fontSize: 28, color: MUTED, letterSpacing: 2, opacity: lift}}>
        <span style={{color: DATA, fontSize: 40, fontWeight: 700, marginRight: 14}}>{String(n).padStart(2, '0')}</span>
      </div>
      <div style={{position: 'absolute', inset: 0, boxShadow: 'inset 0 0 260px rgba(0,0,0,0.75)', pointerEvents: 'none'}} />
      {/* who made the film in front: the latest one that has landed */}
      <Credit text={[...ASKS].reverse().find((x) => t >= landOf(x))?.by ?? ''} />
    </div>
  );
};

const Credit = ({text}: {text: string}) => (
  <div style={{position: 'absolute', right: 40, bottom: 26, padding: '6px 14px', borderRadius: 8, background: 'rgba(5,7,10,0.72)', fontFamily: MONO, fontSize: 22, color: INK, whiteSpace: 'nowrap', opacity: text ? 1 : 0}}>{text}</div>
);

const COLS = 9, ROWS = 6, TW = 360, TH = 202, GAP = 26;
const Thumb = ({asset}: {asset: string}) => <img src={useAsset(asset)} style={{width: '100%', height: '100%', objectFit: 'cover', display: 'block'}} />;

/** The drop: `pull` pulls the camera back from one film into a tilted wall of all of them; `dim` lets the question read over it */
export const Wall = () => {
  const pull = clamp(useProp('pull', 0) as number);
  const slam = clamp(useProp('slam', 0) as number);
  const dim = clamp(useProp('dim', 0) as number);
  const t = useTime();
  const e = 1 - Math.pow(1 - pull, 4);
  const scale = mix(5.6, 1, e);
  const rotY = mix(0, -16, e) + Math.sin(t * 0.6) * 1.5;
  const rotX = mix(0, 8, e);
  const W = COLS * TW + (COLS - 1) * GAP, H = ROWS * TH + (ROWS - 1) * GAP;
  const s = 1 + 0.6 * Math.pow(1 - slam, 3);
  return (
    <div style={{position: 'absolute', inset: 0, background: '#05070A', overflow: 'hidden', perspective: 1400}}>
      <div style={{position: 'absolute', left: 960 - W / 2, top: 540 - H / 2, width: W, height: H, transformStyle: 'preserve-3d',
        transform: `rotateX(${rotX}deg) rotateY(${rotY}deg) scale(${scale * 0.62})`, opacity: 1 - dim * 0.72}}>
        {Array.from({length: COLS * ROWS}, (_, k) => {
          const col = k % COLS, row = Math.floor(k / COLS);
          const centre = col === 4 && row === 2;
          return (
            <div key={k} style={{position: 'absolute', left: col * (TW + GAP), top: row * (TH + GAP), width: TW, height: TH, borderRadius: 8, overflow: 'hidden',
              boxShadow: '0 20px 50px rgba(0,0,0,0.6)', outline: centre ? `4px solid ${DATA}` : 'none'}}>
              <Thumb asset={centre ? ASKS[0].still : ASKS[(k * 7 + 3) % ASKS.length].still} />
            </div>
          );
        })}
      </div>
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(900px 520px at 50% 52%, rgba(5,7,10,0.0), rgba(5,7,10,0.82))'}} />
      <Obj id="claim" style={{position: 'absolute', left: 0, top: 400, width: 1920, textAlign: 'center', transform: `scale(${s})`}}>
        <div style={{fontFamily: SANS, fontSize: 150, fontWeight: 900, color: '#fff', textShadow: '0 10px 60px rgba(0,0,0,0.8)'}}>都是<span style={{color: DATA}}>代码</span>写出来的</div>
      </Obj>
      <Obj id="title" style={{position: 'absolute', left: 0, top: 300, width: 1920, textAlign: 'center'}}>
        <div style={{fontFamily: SANS, fontSize: 104, fontWeight: 900, color: INK, lineHeight: 1.25, textShadow: '0 10px 50px rgba(0,0,0,0.9)'}}>
          没有 <span style={{color: DATA}}>Opus</span>，<br />可以做出圈的 AI 视频吗？
        </div>
      </Obj>
    </div>
  );
};
