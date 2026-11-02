// Forces in the tunnel. `ForceArrow` is one force as a slim glowing amber arrow in 3D that grows on its word, its name and figure on a plate
// beside it (HTML, so it never turns with the camera). `AirPush` is the room's air pressing on the car: short streaks of air running
// in at the skin from every side, thinning under the floor as the chamber is emptied. What is left over is one amber arrow towards
// the road, which turns with the car: on a wall or a ceiling it still points at the road.
import * as THREE from 'three';
import {softDot, useTunnel, useTunnelWorld} from './world.tsx';
import {CAR, HEX, SEALED, V, clamp, easeOut, phase, plate} from './tunnel.tsx';

export const meta = {
  name: {en: 'Force arrow', 'zh-CN': '力的箭头'},
  purpose: 'mark',
  line: 'A force as a slim glowing amber arrow in the tunnel that grows to its size on the word, with its name and figure on a plate beside it; or the room\'s air pressing on the car as streaks of air running in at its skin.',
  fits: 'a weight, a suction, a downforce; the atmosphere pushing harder from above than from below',
  params: {
    x: {type: 'number', default: 0, doc: 'where the arrow\'s tail is, along the tunnel (metres)'},
    y: {type: 'number', default: 2.2, doc: 'its tail, up'},
    z: {type: 'number', default: 0, doc: 'its tail, across'},
    dir: {type: 'down | up | left | right', default: 'down', doc: 'which way it points, in the section (down is towards the floor)'},
    length: {type: 'number', default: 1.4, doc: 'its full length in metres: draw forces to one scale'},
    grow: {type: 'progress', default: 1, doc: '0 to 1: the arrow grows from its tail'},
    label: {type: 'text', default: '', doc: 'the force\'s name'},
    value: {type: 'text', default: '', doc: 'its figure, with its unit'},
    tone: {type: 'force | low | high | calm', default: 'force', doc: 'amber for the force the sentence is about; the others for a second force'},
  },
  preview: 30.0,
};

const TONE: Record<string, string> = {force: HEX.force, low: HEX.low, high: HEX.high, calm: '#C9D6E8'};
const DIRS: Record<string, [number, number, number]> = {down: [0, -1, 0], up: [0, 1, 0], left: [-1, 0, 0], right: [1, 0, 0]};

// a force is light, not a solid: a slim shaft and head that glow (additive, so the bloom lifts them) and never hide the car behind
function arrowMesh(color: string) {
  const g = new THREE.Group();
  const m = new THREE.MeshBasicMaterial({color, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false});
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 1, 16), m);
  shaft.name = 'shaft';
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.34, 24), m);
  head.name = 'head';
  g.add(shaft, head);
  return g;
}

function setArrow(g: THREE.Object3D, x: number, y: number, z: number, d: [number, number, number], len: number) {
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...d));
  g.position.set(x, y, z);
  g.quaternion.copy(q);
  const shaft = g.getObjectByName('shaft')!, head = g.getObjectByName('head')!;
  const hl = Math.min(0.34, len * 0.45), sl = Math.max(0.001, len - hl);
  shaft.scale.set(1, sl, 1);
  shaft.position.y = sl / 2;
  head.position.y = sl + hl / 2;
  head.scale.setScalar(hl / 0.34);
  g.visible = len > 0.01;
}

export function ForceArrow({x = 0, y = 2.2, z = 0, dir = 'down', length = 1.4, grow = 1, label = '', value = '', tone = 'force'}: {
  x?: number; y?: number; z?: number; dir?: 'down' | 'up' | 'left' | 'right'; length?: number; grow?: number; label?: string; value?: string; tone?: string;
}) {
  const w = useTunnelWorld();
  const k = easeOut(clamp(grow));
  useTunnel(() => arrowMesh(TONE[tone] ?? HEX.force), (g) => setArrow(g, x, y, z, DIRS[dir], length * k));
  if (!label && !value) return null;
  const d = DIRS[dir], mid = w.project(x + d[0] * length * 0.5, y + d[1] * length * 0.5, z + d[2] * length * 0.5);
  const show = phase(grow, 0.4, 1);
  if (show <= 0 || !mid.front) return null;
  return (
    <div style={{position: 'absolute', left: mid.x + 40, top: mid.y - 50, opacity: show, padding: '10px 18px 12px', background: 'rgba(7, 11, 18, 0.82)',
      borderLeft: `4px solid ${TONE[tone] ?? HEX.force}`, whiteSpace: 'nowrap', transform: `translateX(${(1 - show) * -16}px)`}}>
      {label && <div style={{fontFamily: V.sans, fontSize: 34, fontWeight: 700, color: V.text}}>{label}</div>}
      {value && <div style={{...plate(40), color: TONE[tone] ?? HEX.force, marginTop: 2}}>{value}</div>}
    </div>
  );
}

/**
 * The room's air leaning on the car, drawn as air: short bright streaks that run in towards the skin from outside and fade as they
 * reach it, everywhere at once, so the car sits in a field of pressure rather than under a stack of arrows. `show` 0 to 1 brings in
 * the streaks over the roof; `around` 0 to 1 those at the nose, the tail and both flanks (the air presses from every side alike);
 * `under` 1 to 0 thins the few in the gap under the floor as the chamber is emptied; `net` 0 to 1 grows the one amber arrow of what
 * is left over, pressing the car to the road.
 */
const STREAK = 0.9, LEN = 0.22, PERIOD = 1.3;
type Mote = {p: [number, number, number]; n: [number, number, number]; group: 0 | 1 | 2; ph: number; reach: number};
function motes(): Mote[] {
  const out: Mote[] = [], {A, B, C, CY} = SEALED, N = 190;
  const ph = (i: number) => { const v = Math.sin(i * 12.9898 + 4.1) * 43758.5453; return v - Math.floor(v); };
  for (let i = 0; i < N; i++) {
    // points spread evenly over the body (a Fibonacci sphere mapped onto the ellipsoid), each pushed on along its normal
    const y = 1 - (i + 0.5) / N * 2, r = Math.sqrt(1 - y * y), th = i * 2.39996;
    const x = Math.cos(th) * r, z = Math.sin(th) * r;
    const py = CY + B * y;
    if (py < 0.2) continue;
    const n = [x / A, y / B, z / C], l = Math.hypot(n[0], n[1], n[2]);
    const nn: [number, number, number] = [n[0] / l, n[1] / l, n[2] / l];
    out.push({p: [A * x, py, C * z], n: nn, group: nn[1] > 0.55 ? 0 : 1, ph: ph(i), reach: STREAK});
  }
  // under the floor: a few short glints rising from the road into the gap
  for (let i = 0; i < 27; i++) {
    const x = -1.6 + (i % 9) * 0.4, z = -0.5 + Math.floor(i / 9) * 0.5;
    out.push({p: [x, CAR.sill - 0.02, z], n: [0, -1, 0], group: 2, ph: ph(i + 400), reach: CAR.sill - 0.03});
  }
  return out;
}

export function AirPush({show = 1, under = 1, net = 0, around = 0}: {show?: number; under?: number; net?: number; around?: number}) {
  const w = useTunnelWorld();
  const s = easeOut(clamp(show)), u = clamp(under), nt = easeOut(clamp(net)), ar = easeOut(clamp(around));
  useTunnel(() => {
    const g = new THREE.Group();
    const ms = motes();
    g.userData.motes = ms;
    const line = new THREE.BufferGeometry();
    line.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(ms.length * 6), 3));
    line.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(ms.length * 6), 3));
    const streaks = new THREE.LineSegments(line, new THREE.LineBasicMaterial({vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false}));
    streaks.name = 'streaks';
    const dot = new THREE.BufferGeometry();
    dot.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(ms.length * 3), 3));
    dot.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(ms.length * 3), 3));
    const heads = new THREE.Points(dot, new THREE.PointsMaterial({size: 0.09, map: softDot(), vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false}));
    heads.name = 'heads';
    const big = arrowMesh(HEX.force);
    big.name = 'net';
    g.add(streaks, heads, big);
    return g;
  }, (g) => {
    const ms = g.userData.motes as Mote[];
    const streaks = g.getObjectByName('streaks') as THREE.LineSegments, heads = g.getObjectByName('heads') as THREE.Points;
    const lp = streaks.geometry.attributes.position as THREE.BufferAttribute, lc = streaks.geometry.attributes.color as THREE.BufferAttribute;
    const hp = heads.geometry.attributes.position as THREE.BufferAttribute, hc = heads.geometry.attributes.color as THREE.BufferAttribute;
    const pale = new THREE.Color('#C9D6E8'), cyan = new THREE.Color(HEX.low);
    ms.forEach((m, i) => {
      const k = [s, ar * Math.max(s, 0.6), s * u][m.group];
      let f = w.t / PERIOD + m.ph;
      f -= Math.floor(f);
      // in from `reach` out to the skin; bright in the middle of its run, gone as it arrives
      const d = m.reach * (1 - f) + 0.03, len = Math.min(LEN, m.reach * 0.5);
      const hx = m.p[0] + m.n[0] * d, hy = m.p[1] + m.n[1] * d, hz = m.p[2] + m.n[2] * d;
      lp.setXYZ(i * 2, hx, hy, hz);
      lp.setXYZ(i * 2 + 1, hx + m.n[0] * len, hy + m.n[1] * len, hz + m.n[2] * len);
      hp.setXYZ(i, hx, hy, hz);
      const b = k * Math.sin(Math.PI * f) * 0.75, c = m.group === 2 ? cyan : pale;
      lc.setXYZ(i * 2, c.r * b, c.g * b, c.b * b);
      lc.setXYZ(i * 2 + 1, 0, 0, 0);
      hc.setXYZ(i, c.r * b, c.g * b, c.b * b);
    });
    lp.needsUpdate = lc.needsUpdate = hp.needsUpdate = hc.needsUpdate = true;
    setArrow(g.getObjectByName('net')!, 0, 2.9, 0, [0, -1, 0], 1.5 * nt);
  });
  return null;
}
