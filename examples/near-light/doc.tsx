import {Doc, Scene, Part, Animation, Appear, Disappear, Tween, Set, Sound, Asset} from '@visotalk/jsx';
import {useProp, useDocTime, useFrame, useSounds, Obj} from '@visotalk/runtime';
import React, {useLayoutEffect, useMemo, useRef} from 'react';

/*
 * Near light speed: a film of pictures and sounds, no narration, at 100 BPM in 4/4 (a bar is 2.4 s). Every scene lasts whole bars, every event
 * sits on a beat, and the document is the one list of events: the picture's changes are the animation, the sound's are the <Sound>s, and the
 * picture answers the sounds it must flash with (an impact, a lamp's ping) by reading them with useSounds(). The sounds are made by sounds.py.
 */

const W = 1920, H = 1080, CX = 960, CY = 540, F = 1057; // a rectilinear lens: 30 degrees off the nose lands 610 px out
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const gamma = (b: number) => 1 / Math.sqrt(1 - b * b);

/** mulberry32: the lattice and the stars are the same in every frame and on every machine */
function seeded(seed: number) {
  return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** The world in the lattice's rest frame: plates on ten levels above and below the ship, some carrying a lamp, and a sphere of stars */
const PERIOD = 120;
const WORLD = (() => {
  const r = seeded(20261022), plates: {x: number; y: number; z: number; w: number; d: number}[] = [], lamps: {x: number; y: number; z: number; group: number}[] = [];
  for (const y of [-8.2, -6.0, -4.2, -2.8, -1.5, 1.5, 2.8, 4.2, 6.0, 8.2]) for (let x = -15.4; x <= 15.4; x += 2.2) for (let z = -60; z < 60; z += 3) {
    if (r() > 0.42) continue;
    const w = r() < 0.12 ? 2.8 : r() < 0.5 ? 1.6 : 1.0, d = r() < 0.5 ? 1.1 : 0.7, p = {x: x + (r() - 0.5) * 0.3, y, z: z + r() * 0.8, w, d};
    plates.push(p);
    if (r() < 0.14) lamps.push({x: p.x, y, z: p.z, group: Math.floor(r() * 6)});
  }
  const stars: {x: number; y: number; z: number; m: number}[] = [];
  for (let i = 0; i < 7000; i++) { const u = r() * 2 - 1, ph = r() * Math.PI * 2, s = Math.sqrt(1 - u * u); stars.push({x: s * Math.cos(ph), y: s * Math.sin(ph), z: u, m: r()}); }
  return {plates, lamps, stars};
})();

/** A rest-frame point (ship at the origin, flying along +z) on the screen after aberration, with the Doppler factor the ship sees; null outside the lens */
function project(x: number, y: number, z: number, b: number) {
  const r = Math.hypot(x, y, z); if (r < 0.4) return null;
  const c = z / r, cp = (c + b) / (1 + b * c);
  if (cp < 0.26) return null;
  const k = F * Math.sqrt(1 - cp * cp) / cp, rho = Math.hypot(x, y) || 1e-9;
  return {X: CX + k * x / rho, Y: CY - k * y / rho, D: 1 / (gamma(b) * (1 - b * cp)), r};
}
const wrapZ = (z: number, zc: number) => ((((z - zc + PERIOD / 2) % PERIOD) + PERIOD) % PERIOD) - PERIOD / 2;
/** Blue-white ahead (D > 1), dim red behind */
function tint(D: number) {
  if (D >= 1) { const t = clamp((D - 1) / 3, 0, 1); return [201 - 40 * t, 198 - 12 * t, 191 + 64 * t]; }
  const t = clamp((1 - D) / 0.7, 0, 1); return [201 - 10 * t, 198 - 110 * t, 191 - 130 * t];
}
const rgba = ([r, g, b]: number[], a: number) => `rgba(${r | 0},${g | 0},${b | 0},${clamp(a, 0, 1)})`;

function sprite(stops: [number, string][]) {
  const g = document.createElement('canvas'); g.width = g.height = 64;
  const c = g.getContext('2d')!, gr = c.createRadialGradient(32, 32, 0, 32, 32, 32);
  for (const [o, col] of stops) gr.addColorStop(o, col);
  c.fillStyle = gr; c.fillRect(0, 0, 64, 64); return g;
}

/** The lattice, drawn on a canvas: thousands of edges bent by the aberration, batched by colour */
function drawLattice(ctx: CanvasRenderingContext2D, b: number, zc: number, flare: number[], glow: {white: HTMLCanvasElement; amber: HTMLCanvasElement}) {
  const hi = clamp((b - 0.6) / 0.39, 0, 1) ** 2 * (3 - 2 * clamp((b - 0.6) / 0.39, 0, 1));
  ctx.fillStyle = '#070708'; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'lighter';
  for (const s of WORLD.stars) {
    const p = project(s.x * 500, s.y * 500, s.z * 500, b); if (!p) continue;
    ctx.fillStyle = rgba(tint(p.D), clamp(p.D ** 1.1, 0.15, 3) * (0.25 + 0.5 * s.m) * 0.32);
    const sz = s.m > 0.96 ? 2 : 1.1; ctx.fillRect(Math.round(p.X - sz / 2), Math.round(p.Y - sz / 2), sz, sz);
  }
  const buckets = new Map<string, {D: number; I: number; pts: number[]}>();
  for (const pl of WORLD.plates) {
    const z = wrapZ(pl.z, zc), fog = clamp(1 - Math.abs(z) / 58, 0, 1); if (fog <= 0) continue;
    const xs = [pl.x - pl.w / 2, pl.x + pl.w / 2], zs = [z - pl.d / 2, z + pl.d / 2];
    const corners = [[xs[0], zs[0]], [xs[1], zs[0]], [xs[1], zs[1]], [xs[0], zs[1]]];
    for (let e = 0; e < 4; e++) {
      const [ax, az] = corners[e], [bx, bz] = corners[(e + 1) % 4]; let prev: ReturnType<typeof project> = null;
      for (let k = 0; k <= 4; k++) {
        const p = project(ax + (bx - ax) * k / 4, pl.y, az + (bz - az) * k / 4, b);
        if (p && prev) {
          const D = (p.D + prev.D) / 2, I = clamp(D ** 0.9, 0.2, 2.2) * fog * clamp(p.r / 3, 0, 1);
          const key = `${Math.round(clamp(D, 0.2, 5) * 4)}|${Math.round(clamp(I, 0, 2) * 8)}`;
          let bk = buckets.get(key); if (!bk) { bk = {D, I, pts: []}; buckets.set(key, bk); }
          bk.pts.push(prev.X, prev.Y, p.X, p.Y);
        }
        prev = p;
      }
    }
  }
  ctx.lineWidth = 1;
  for (const bk of buckets.values()) {
    ctx.strokeStyle = rgba(tint(bk.D), 0.34 * bk.I); ctx.beginPath();
    for (let i = 0; i < bk.pts.length; i += 4) { ctx.moveTo(bk.pts[i], bk.pts[i + 1]); ctx.lineTo(bk.pts[i + 2], bk.pts[i + 3]); }
    ctx.stroke();
  }
  for (const l of WORLD.lamps) {
    const z = wrapZ(l.z, zc), fog = clamp(1 - Math.abs(z) / 50, 0, 1); if (fog <= 0) continue;
    const p0 = project(l.x, l.y, z, b), p1 = project(l.x, l.y + 0.55, z, b); if (!p0 || !p1) continue;
    const I = clamp(p1.D, 0.2, 2.5) * fog * (1 + 2.5 * flare[l.group]);
    ctx.strokeStyle = `rgba(255,170,80,${clamp(0.5 * I, 0, 1)})`; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(p0.X, p0.Y); ctx.lineTo(p1.X, p1.Y); ctx.stroke();
    const s = clamp(260 / p1.r, 6, 46) * (0.7 + 0.5 * flare[l.group]);
    ctx.globalAlpha = clamp(0.8 * I, 0, 1); ctx.drawImage(p1.D > 2 ? glow.white : glow.amber, p1.X - s / 2, p1.Y - s / 2, s, s); ctx.globalAlpha = 1;
  }
  if (hi > 0) { // the crowded, blue-white sky ahead
    const R = 40 + 170 * hi, g = ctx.createRadialGradient(CX, CY, 0, CX, CY, R);
    g.addColorStop(0, `rgba(225,230,255,${0.6 * hi})`); g.addColorStop(0.12, `rgba(170,185,255,${0.22 * hi})`); g.addColorStop(1, 'rgba(120,140,255,0)');
    ctx.fillStyle = g; ctx.fillRect(CX - R, CY - R, 2 * R, 2 * R);
  }
  ctx.globalCompositeOperation = 'source-over';
  return hi;
}

/** Radial streaks at high speed, a soft bloom, a vignette: post-processing through a quarter-size copy */
function finish(ctx: CanvasRenderingContext2D, small: HTMLCanvasElement, blur: HTMLCanvasElement, hi: number) {
  const s = small.getContext('2d')!, bl = blur.getContext('2d')!;
  s.clearRect(0, 0, 480, 270); s.drawImage(ctx.canvas, 0, 0, 480, 270);
  ctx.globalCompositeOperation = 'lighter';
  if (hi > 0.01) for (const k of [1.03, 1.07, 1.12]) { ctx.globalAlpha = 0.16 * hi; ctx.drawImage(small, CX - W * k / 2, CY - H * k / 2, W * k, H * k); }
  bl.clearRect(0, 0, 480, 270); bl.filter = 'blur(5px)'; bl.drawImage(small, 0, 0); bl.filter = 'none';
  ctx.globalAlpha = 0.35 + 0.45 * hi; ctx.drawImage(blur, 0, 0, W, H);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  const v = ctx.createRadialGradient(CX, CY, 300, CX, CY, 1150); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
}

/** The 30-degree ring is taller than the frame: only the two arcs inside it are drawn */
const RING_30 = (() => {
  const r = 610, a = Math.asin((CY - 2) / r), pt = (t: number) => `${(CX + r * Math.cos(t)).toFixed(1)} ${(CY - r * Math.sin(t)).toFixed(1)}`;
  return `M${pt(-a)}A${r} ${r} 0 0 0 ${pt(a)}M${pt(Math.PI - a)}A${r} ${r} 0 0 0 ${pt(Math.PI + a)}`;
})();

const mono: React.CSSProperties = {fontFamily: 'var(--vt-mono)', color: 'rgba(235,230,220,0.6)', letterSpacing: 2, fontSize: 14};

/** A light clock: a pulse bouncing between two mirrors, one tick per crossing (every 0.6 s of its own time) */
function LightClock({label, time, x}: {label: string; time: number; x: number}) {
  const ph = (time / 0.6) % 2, y = 30 * (ph < 1 ? ph : 2 - ph);
  return (
    <div style={{position: 'absolute', left: x - 50, top: 112, width: 100, textAlign: 'center'}}>
      <div style={{position: 'relative', height: 34}}>
        <div style={{position: 'absolute', left: 32, right: 32, top: 2, height: 1, background: 'rgba(235,230,220,0.5)'}} />
        <div style={{position: 'absolute', left: 32, right: 32, top: 32, height: 1, background: 'rgba(235,230,220,0.5)'}} />
        <div style={{position: 'absolute', left: 46, top: y - 2, width: 8, height: 8, borderRadius: 4, background: '#ffd9a0', boxShadow: '0 0 10px 3px rgba(255,170,80,0.8)'}} />
      </div>
      <div style={{...mono, fontSize: 11, marginTop: 8, color: 'rgba(235,230,220,0.4)'}}>{label}</div>
      <div style={{...mono, fontSize: 14, letterSpacing: 1, color: 'rgba(235,230,220,0.7)'}}>{time.toFixed(1)} s</div>
    </div>
  );
}

/** The flight: the lattice on a canvas, the reference rings, and the ship's instruments */
function Flight() {
  const ref = useRef<HTMLCanvasElement>(null);
  const t = useDocTime();
  const b = useProp('beta', 0), travel = useProp('travel', 0), ship = useProp('ship', 0), outside = useProp('outside', 0);
  const guides = useProp('guides', 0), mark90 = useProp('mark90', 0), clocks = useProp('clocks', 0);
  // a lamp flares on each ping the document plays; which lamps is fixed by the ping's place in the list
  const pings = useSounds().filter((s) => s.asset.startsWith('ping'));
  const flare = [0, 0, 0, 0, 0, 0];
  pings.forEach((s, i) => { if (t >= s.start && t < s.start + 1) flare[(i * 5) % 6] = Math.max(flare[(i * 5) % 6], Math.exp(-(t - s.start) / 0.22)); });
  const kit = useMemo(() => ({
    white: sprite([[0, 'rgba(255,255,255,1)'], [0.15, 'rgba(255,255,255,0.6)'], [1, 'rgba(255,255,255,0)']]),
    amber: sprite([[0, 'rgba(255,240,215,1)'], [0.12, 'rgba(255,180,90,0.9)'], [0.45, 'rgba(255,140,50,0.18)'], [1, 'rgba(255,120,40,0)']]),
    small: Object.assign(document.createElement('canvas'), {width: 480, height: 270}),
    blur: Object.assign(document.createElement('canvas'), {width: 480, height: 270}),
  }), []);
  useLayoutEffect(() => {
    const ctx = ref.current!.getContext('2d')!;
    const hi = drawLattice(ctx, b, travel, flare, kit);
    finish(ctx, kit.small, kit.blur, hi);
  });
  const c30 = Math.cos(Math.PI / 6), rest30 = Math.acos((c30 - b) / (1 - b * c30)) * 180 / Math.PI;
  const r90 = b > 0.3 ? F * Math.sqrt(1 - b * b) / b : 0;
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <canvas ref={ref} width={W} height={H} style={{position: 'absolute', inset: 0, width: W, height: H}} />
      <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
        <path d={RING_30} fill="none" stroke="rgba(235,230,220,0.22)" strokeDasharray="2 7" opacity={guides} />
        <text x={CX + 610 * Math.cos(-0.35) + 12} y={CY + 610 * Math.sin(-0.35)} fill="rgba(235,230,220,0.5)" fontFamily="var(--vt-mono)" fontSize={14} opacity={guides}>{Math.round(rest30)}°</text>
        {r90 > 0 && (
          <g opacity={mark90}>
            <circle cx={CX} cy={CY} r={r90} fill="none" stroke="rgba(235,235,255,0.6)" strokeWidth={1.2} />
            <path d={`M${CX - r90 - 6} ${CY}H${CX - 520}M${CX - 520} ${CY - 5}V${CY + 5}`} stroke="rgba(235,230,220,0.45)" />
            <text x={CX - 536} y={CY + 5} textAnchor="end" fill="rgba(235,230,220,0.75)" fontFamily="var(--vt-mono)" fontSize={15}>90°  →  {(Math.acos(b) * 180 / Math.PI).toFixed(1)}°</text>
          </g>
        )}
      </svg>
      <div style={{position: 'absolute', left: 48, top: 40, ...mono}}>
        <span style={{color: 'rgba(235,230,220,0.6)'}}>FIG. 05</span>
        <span style={{color: 'rgba(235,230,220,0.38)', marginLeft: 18}}>FLIGHT NEAR c</span>
      </div>
      <div style={{position: 'absolute', right: 48, top: 40, ...mono, textAlign: 'right', letterSpacing: 1, lineHeight: '20px'}}>
        <div>β = {b.toFixed(2)}</div><div style={{color: 'rgba(235,230,220,0.45)'}}>γ = {gamma(b).toFixed(2)}</div>
      </div>
      <div style={{opacity: clocks}}>
        <LightClock label="SHIP" time={ship} x={1760} />
        <LightClock label="OUTSIDE" time={outside} x={1856} />
      </div>
    </div>
  );
}

/** A white wash on each impact the document plays, gone in a quarter of a second */
function Flash() {
  const t = useDocTime();
  const level = useSounds().filter((s) => s.asset === 'impact' && t >= s.start).reduce((m, s) => Math.max(m, 0.32 * Math.exp(-(t - s.start) / 0.22)), 0);
  return <div style={{position: 'absolute', inset: 0, background: '#e1e1e6', opacity: level}} />;
}

/** The speed as a figure, bottom left: light while slow, heavy from 0.90 */
function Speed() {
  const value = useProp('value', 0.3), bold = useProp('bold', 0), pop = useProp('pop', 1);
  return (
    <div style={{position: 'absolute', left: 0, top: 0, fontFamily: 'var(--vt-sans)'}}>
      <div style={{...mono, fontSize: 13, color: 'rgba(235,230,220,0.4)'}}>β = v / c</div>
      <div style={{fontSize: 152, lineHeight: 1, fontWeight: bold ? 700 : 400, color: '#ece7dc', letterSpacing: -2, marginTop: 6,
        transform: `translateX(${(1 - pop) * -30}px) scale(${1 + (1 - pop) * 0.08})`, transformOrigin: 'left bottom', filter: `blur(${(1 - pop) * 8}px)`, opacity: pop}}>{value.toFixed(2)}</div>
    </div>
  );
}

/** Captions of a film with no narration: the words are on screen, not spoken, so they are the part's props */
function Caption() {
  const zh = useProp('zh', ''), en = useProp('en', '');
  return (
    <div style={{position: 'absolute', inset: 0, textAlign: 'center'}}>
      <div style={{fontFamily: 'var(--vt-sans)', fontSize: 30, color: 'rgba(236,232,224,0.95)', letterSpacing: 1}}>{zh}</div>
      <div style={{...mono, fontSize: 12, color: 'rgba(236,232,224,0.45)', letterSpacing: 2.4, marginTop: 12}}>{en}</div>
    </div>
  );
}

/** E = mc², a letter per beat; then it slides away into the value of c² */
function Formula() {
  const warm = useProp('warm', 0), out = useProp('out', 0);
  const glyph: React.CSSProperties = {fontFamily: 'var(--vt-sans)', fontWeight: 700, fontSize: 400, lineHeight: 1, color: '#ece7dc', letterSpacing: -6};
  return (
    <div style={{position: 'absolute', inset: 0, background: '#070707'}}>
      <div style={{position: 'absolute', inset: 0, background: `radial-gradient(circle at 1240px 470px, rgba(255,170,60,${(0.1 + 0.22 * warm) * (1 - out)}) 0, rgba(255,150,40,0) 900px)`}} />
      <div style={{position: 'absolute', left: 48, top: 40, ...mono}}>
        <span>FIG. 06</span><span style={{color: 'rgba(235,230,220,0.38)', marginLeft: 18}}>MASS-ENERGY</span>
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 270, display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 40,
        opacity: 1 - out, filter: `blur(${out * 26}px)`, transform: `translateX(${-out * 420}px)`}}>
        <Obj id="f-e" style={glyph}>E</Obj>
        <Obj id="f-eq" style={glyph}>=</Obj>
        <div style={{display: 'flex', alignItems: 'baseline'}}>
          <Obj id="f-m" style={glyph}>m</Obj>
          <Obj id="f-c2" style={{...glyph, color: '#f2b33d', textShadow: `0 0 ${40 + 60 * warm}px rgba(255,170,50,0.85)`}}>c<span style={{fontSize: 170, verticalAlign: 'top', lineHeight: 1}}>2</span></Obj>
        </div>
      </div>
    </div>
  );
}

const C2 = '89 875 517 873 681 764';
/** The value of c², its seventeen digits rolling and landing left to right as `settled` counts up */
function Digits() {
  const settled = useProp('settled', 0), unit = useProp('unit', 0), frame = useFrame();
  let k = 0;
  return (
    <div style={{position: 'absolute', inset: 0}}>
    <div style={{position: 'absolute', right: 48, top: 40, ...mono, textAlign: 'right', lineHeight: '20px'}}>c = 299 792 458 m/s<div style={{fontSize: 11, color: 'rgba(235,230,220,0.35)'}}>EXACT</div></div>
    <div style={{position: 'absolute', left: 216, top: 440, display: 'flex', alignItems: 'baseline', fontFamily: 'var(--vt-sans)', fontWeight: 700, color: '#ece7dc'}}>
      <span style={{fontSize: 76, color: '#f2b33d'}}>c<sup style={{fontSize: 38}}>2</sup></span>
      <span style={{fontSize: 76, margin: '0 26px'}}>=</span>
      {[...C2].map((ch, i) => {
        if (ch === ' ') return <span key={i} style={{width: 26}} />;
        const n = k++, landed = settled >= n + 1;
        const roll = String(seeded(frame * 31 + n)() * 10 | 0);
        return <span key={i} style={{fontSize: 82, width: 52, textAlign: 'center', display: 'inline-block', filter: landed ? 'none' : 'blur(3px)', opacity: landed ? 1 : 0.75}}>{landed ? ch : roll}</span>;
      })}
      <span style={{fontSize: 34, fontWeight: 400, marginLeft: 18, opacity: 0.6 * unit}}>m²/s²</span>
    </div>
    </div>
  );
}

export default <Doc id="near-light" title="Near light speed" lang="zh-CN" theme="visotalk/dark" canvas="16x9"
  tokens={{fonts: {sans: '"Inter", "Noto Serif SC", serif', mono: '"JetBrains Mono", monospace'}}}>
  <Asset id="sub" kind="audio" src="audio/sub.wav" license={{id: "user-owned", obligations: []}} />
  <Asset id="bass" kind="audio" src="audio/bass.wav" license={{id: "user-owned", obligations: []}} />
  <Asset id="pad-dm9-dark" kind="audio" src="audio/pad-dm9-dark.wav" license={{id: "user-owned", obligations: []}} />
  <Asset id="pad-dm9-mid" kind="audio" src="audio/pad-dm9-mid.wav" license={{id: "user-owned", obligations: []}} />
  <Asset id="pad-dm9-bright" kind="audio" src="audio/pad-dm9-bright.wav" license={{id: "user-owned", obligations: []}} />
  <Asset id="pad-dmaj9" kind="audio" src="audio/pad-dmaj9.wav" license={{id: "user-owned", obligations: []}} />
  <Asset id="pad-gsus" kind="audio" src="audio/pad-gsus.wav" license={{id: "user-owned", obligations: []}} />
  <Asset id="pad-dm9-hit" kind="audio" src="audio/pad-dm9-hit.wav" license={{id: "user-owned", obligations: []}} />
  <Asset id="kick" kind="audio" src="audio/kick.wav" license={{id: "user-owned", obligations: []}} />
  <Asset id="kick-long" kind="audio" src="audio/kick-long.wav" license={{id: "user-owned", obligations: []}} />
  <Asset id="impact" kind="audio" src="audio/impact.wav" license={{id: "user-owned", obligations: []}} />
  <Asset id="riser-short" kind="audio" src="audio/riser-short.wav" license={{id: "user-owned", obligations: []}} />
  <Asset id="riser-bar" kind="audio" src="audio/riser-bar.wav" license={{id: "user-owned", obligations: []}} />
  <Asset id="riser-long" kind="audio" src="audio/riser-long.wav" license={{id: "user-owned", obligations: []}} />
  <Asset id="riser-end" kind="audio" src="audio/riser-end.wav" license={{id: "user-owned", obligations: []}} />
  <Asset id="ping-1" kind="audio" src="audio/ping-1.wav" license={{id: "user-owned", obligations: []}} />
  <Asset id="ping-2" kind="audio" src="audio/ping-2.wav" license={{id: "user-owned", obligations: []}} />
  <Asset id="ping-3" kind="audio" src="audio/ping-3.wav" license={{id: "user-owned", obligations: []}} />
  <Asset id="ping-4" kind="audio" src="audio/ping-4.wav" license={{id: "user-owned", obligations: []}} />
  <Asset id="tick-ship" kind="audio" src="audio/tick-ship.wav" license={{id: "user-owned", obligations: []}} />
  <Asset id="tick-out-1" kind="audio" src="audio/tick-out-1.wav" license={{id: "user-owned", obligations: []}} />
  <Asset id="tick-out-030" kind="audio" src="audio/tick-out-030.wav" license={{id: "user-owned", obligations: []}} />
  <Asset id="tick-out-060" kind="audio" src="audio/tick-out-060.wav" license={{id: "user-owned", obligations: []}} />
  <Asset id="tick-out-090" kind="audio" src="audio/tick-out-090.wav" license={{id: "user-owned", obligations: []}} />
  <Asset id="tick-out-099" kind="audio" src="audio/tick-out-099.wav" license={{id: "user-owned", obligations: []}} />
  <Asset id="brake" kind="audio" src="audio/brake.wav" license={{id: "user-owned", obligations: []}} />
  <Asset id="breath" kind="audio" src="audio/breath.wav" license={{id: "user-owned", obligations: []}} />
  <Asset id="digits" kind="audio" src="audio/digits.wav" license={{id: "user-owned", obligations: []}} />

  <Part id="field" z={0}><Flight /></Part>
  <Part id="speed" x={96} y={700} w={700} h={200} z={5}><Speed /></Part>
  <Part id="cap" x={0} y={918} w={1920} h={110} z={8}><Caption /></Part>
  <Part id="flash" z={50}><Flash /></Part>

  {/* bars 1-2: cruising at rest; the instruments come on, the lamps blink */}
  <Scene id="cruise" duration={4.8}>
    <Animation>
      <Appear on={["field", "flash"]} at="start" dur={0}/>
      <Tween on="field" ship={24} at={0} dur={24} easing="linear"/>
      <Tween on="field" travel={6.72} outside={4.8} at={0} dur={4.8} easing="linear"/>
      <Tween on="field" guides={1} at={3.3} dur={1}/>
      <Tween on="field" clocks={1} at={3.3} dur={0.8}/>
    </Animation>
    <Sound asset="sub" at={0} loop dur={21.6} volume={-15}/>
    <Sound asset="pad-dm9-dark" at={0} volume={-11}/>
    <Sound asset="kick" at={0} volume={-13}/>
    <Sound asset="ping-4" at={0.3} volume={-15}/>
    <Sound asset="ping-1" at={1.2} volume={-15}/>
    <Sound asset="ping-4" at={2.1} volume={-15}/>
    <Sound asset="ping-2" at={2.7} volume={-15}/>
    <Sound asset="ping-1" at={3.3} volume={-15}/>
    <Sound asset="ping-1" at={3.9} volume={-15}/>
    <Sound asset="ping-4" at={4.2} volume={-15}/>
    <Sound asset="ping-3" at={4.5} volume={-15}/>
    <Sound asset="riser-bar" at={2.4} volume={-11}/>
    <Sound asset="tick-ship" at={3.6} loop dur={20.4} volume={-21}/>
    <Sound asset="tick-out-1" at={3.6} loop dur={1.2} volume={-23}/>
  </Scene>

  {/* bars 3-5: one step of speed on each downbeat, with a flash and a kick; the pad opens up with the speed */}
  <Scene id="accelerate" duration={7.2}>
    <Animation>
      <Tween on="field" beta={0.30} at={0} dur={0.9} easing="easeOut"/>
      <Tween on="field" beta={0.60} at={2.4} dur={0.9} easing="easeOut"/>
      <Tween on="field" beta={0.90} at={4.8} dur={0.9} easing="easeOut"/>
      <Tween on="field" travel={27.36} outside={7.32} at={0} dur={2.4} easing="linear"/>
      <Tween on="field" travel={65.28} outside={10.32} at={2.4} dur={2.4} easing="linear"/>
      <Tween on="field" travel={120.48} outside={15.82} at={4.8} dur={2.4} easing="linear"/>
      <Appear on="speed" at={0} dur={0}/>
      <Set on="speed" value={0.30} bold={0} pop={0} at={0}/>
      <Tween on="speed" pop={1} at={0} dur={0.18} easing="easeOut"/>
      <Set on="speed" value={0.60} pop={0} at={2.4}/>
      <Tween on="speed" pop={1} at={2.4} dur={0.18} easing="easeOut"/>
      <Set on="speed" value={0.90} bold={1} pop={0} at={4.8}/>
      <Tween on="speed" pop={1} at={4.8} dur={0.18} easing="easeOut"/>
      <Set on="cap" zh="β：你的速度，以光速为 1。" en="BETA: YOUR SPEED, IN UNITS OF THE SPEED OF LIGHT." at={0.6}/>
      <Appear on="cap" at={0.6} dur={0.35}/>
      <Disappear on="cap" at={3.9} dur={0.35}/>
    </Animation>
    <Sound asset="kick" at={0} volume={-9}/>
    <Sound asset="impact" at={0} volume={-13}/>
    <Sound asset="kick" at={2.4} volume={-9}/>
    <Sound asset="impact" at={2.4} volume={-13}/>
    <Sound asset="kick" at={4.8} volume={-8}/>
    <Sound asset="impact" at={4.8} volume={-12}/>
    <Sound asset="pad-dm9-mid" at={0} volume={-11}/>
    <Sound asset="pad-dm9-bright" at={4.8} volume={-11}/>
    <Sound asset="bass" at={0} loop dur={12} volume={-17}/>
    <Sound asset="riser-short" at={1.95} volume={-13}/>
    <Sound asset="riser-short" at={4.35} volume={-13}/>
    <Sound asset="riser-long" at={5.2} volume={-10}/>
    <Sound asset="tick-out-030" at={0} loop dur={2.4} volume={-23}/>
    <Sound asset="tick-out-060" at={2.4} loop dur={2.4} volume={-23}/>
    <Sound asset="tick-out-090" at={4.8} loop dur={2.4} volume={-23}/>
  </Scene>

  {/* bars 6-9: 0.99, the sky crowds in ahead; the chord turns major, the outside clock ticks seven times faster */}
  <Scene id="lightspeed" duration={9.6}>
    <Animation>
      <Tween on="field" beta={0.99} at={0} dur={0.9} easing="easeOut"/>
      <Tween on="field" travel={362} outside={83.88} at={0} dur={9.6} easing="linear"/>
      <Tween on="field" mark90={1} at={0.6} dur={0.8}/>
      <Set on="speed" value={0.99} pop={0} at={0}/>
      <Tween on="speed" pop={1} at={0} dur={0.18} easing="easeOut"/>
      <Disappear on="speed" at={1.4} dur={0.6}/>
      <Set on="cap" zh="接近光速时，整个宇宙挤到你眼前：前方更蓝、更亮，身后更红、更暗。" en="NEAR LIGHT SPEED THE UNIVERSE CROWDS IN AHEAD OF YOU: BLUER AND BRIGHTER IN FRONT, REDDER AND DARKER BEHIND." at={2.1}/>
      <Appear on="cap" at={2.1} dur={0.35}/>
      <Disappear on="cap" at={5.05} dur={0.35}/>
      <Set on="cap" zh="β = 0.99：你的 1 秒，是外面的 7 秒。" en="AT 99% OF LIGHT SPEED, ONE SECOND FOR YOU IS SEVEN OUTSIDE." at={6.0}/>
      <Appear on="cap" at={6.0} dur={0.35}/>
      <Disappear on="cap" at={9.25} dur={0.35}/>
    </Animation>
    <Sound asset="kick-long" at={0} volume={-7}/>
    <Sound asset="impact" at={0} volume={-11}/>
    <Sound asset="pad-dmaj9" at={0} volume={-10}/>
    <Sound asset="riser-short" at={4.35} volume={-15}/>
    <Sound asset="kick" at={4.8} volume={-19}/>
    <Sound asset="pad-gsus" at={4.8} volume={-13}/>
    <Sound asset="pad-dmaj9" at={7.2} dur={2.4} fadeOut={0.3} volume={-11}/>
    <Sound asset="bass" at={7.2} loop dur={2.4} volume={-17}/>
    <Sound asset="tick-out-099" at={0} loop dur={9.6} volume={-25}/>
  </Scene>

  {/* bars 10-11: the ship brakes in one bar (everything slides down), then a bar of near silence */}
  <Scene id="brake" duration={4.8}>
    <Animation>
      <Tween on="field" beta={0} at={0} dur={2.4} easing="easeInOut"/>
      <Tween on="field" travel={393} outside={90} at={0} dur={2.4} easing="easeOut"/>
      <Tween on="field" travel={396.4} at={2.4} dur={2.4} easing="linear"/>
      <Tween on="field" mark90={0} at={0} dur={0.5}/>
      <Tween on="field" guides={0} at={2.4} dur={0.6}/>
      <Set on="cap" zh="你的钟走了 24 秒，外面过了 90 秒。" en="YOUR CLOCK: 24 SECONDS. OUTSIDE: 90." at={2.1}/>
      <Appear on="cap" at={2.1} dur={0.35}/>
      <Disappear on="cap" at={4.3} dur={0.3}/>
    </Animation>
    <Sound asset="brake" at={0} volume={-9}/>
    <Sound asset="kick" at={0} volume={-13}/>
    <Sound asset="tick-out-090" at={0} loop dur={1.2} volume={-25}/>
    <Sound asset="tick-out-030" at={1.2} loop dur={1.2} volume={-23}/>
    <Sound asset="breath" at={2.4} volume={-13}/>
    <Sound asset="ping-2" at={2.7} volume={-17}/>
    <Sound asset="ping-4" at={3.3} volume={-17}/>
    <Sound asset="ping-1" at={3.9} volume={-17}/>
    <Sound asset="ping-3" at={4.2} volume={-17}/>
  </Scene>

  {/* bars 12-13: E = mc², a letter per beat, and c² as a number, the digits landing in turn */}
  <Scene id="formula" duration={6.0}>
    <Part id="formula" z={10}><Formula /></Part>
    <Part id="digits" z={11}><Digits /></Part>
    <Animation>
      <Disappear on={["field", "speed"]} at="start" dur={0}/>
      <Appear on="formula" at="start" dur={0}/>
      <Appear on="f-e" at={0} dur={0.12}/>
      <Appear on="f-eq" at={0.6} dur={0.12}/>
      <Appear on="f-m" at={1.2} dur={0.12}/>
      <Appear on="f-c2" at={1.8} dur={0.12}/>
      <Set on="formula" warm={1} at={1.8}/>
      <Tween on="formula" warm={0.25} at={1.8} dur={1} easing="easeOut"/>
      <Tween on="formula" out={1} at={2.4} dur={0.3} easing="easeIn"/>
      <Disappear on="formula" at={2.4} dur={0.3}/>
      <Appear on="digits" at={2.7} dur={0.2}/>
      <Tween on="digits" settled={17} at={2.7} dur={1.19} easing="linear"/>
      <Tween on="digits" unit={1} at={4.1} dur={0.3}/>
      <Set on="cap" zh="1905 年，爱因斯坦补了三页纸：质量就是能量。" en="IN 1905 EINSTEIN ADDED THREE PAGES: MASS IS ENERGY." at={0.8}/>
      <Appear on="cap" at={0.8} dur={0.35}/>
      <Disappear on="cap" at={4.3} dur={0.3}/>
      <Disappear on="digits" at={4.85} dur={0.55}/>
    </Animation>
    <Sound asset="pad-dm9-hit" at={0} volume={-11}/>
    <Sound asset="sub" at={0} loop dur={6} fadeOut={1} volume={-15}/>
    <Sound asset="kick" at={0} volume={-9}/>
    <Sound asset="kick" at={0.6} volume={-10}/>
    <Sound asset="kick" at={1.2} volume={-10}/>
    <Sound asset="kick" at={1.8} volume={-8}/>
    <Sound asset="kick" at={2.4} volume={-10}/>
    <Sound asset="digits" at={2.4} volume={-11}/>
    <Sound asset="riser-end" at={3.0} volume={-10}/>
    <Sound asset="kick" at={4.8} volume={-8}/>
    <Sound asset="impact" at={4.8} volume={-10}/>
  </Scene>
</Doc>;
