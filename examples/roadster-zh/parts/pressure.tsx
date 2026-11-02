// Pressure made visible on the floor, like paint on a test section that changes colour with the load on it: cyan where the air
// pressure is lower than the room's, orange where it is higher. With the floor open the air squeezed under the car makes a soft
// cyan footprint; with the skirts down and the fans on, the chamber under the car is emptied and its footprint goes deep cyan,
// with isobars rippling out from its edge.
import * as THREE from 'three';
import {useTunnel} from './world.tsx';
import {CAR, HEX, OPEN, SEALED, clamp, cp, easeOut, mix, velocity} from './tunnel.tsx';

export const meta = {
  name: {en: 'Pressure floor', 'zh-CN': '地面压力图'},
  purpose: 'data',
  line: 'The floor under and round the car glows with the air\'s pressure: cyan where it is lower, orange where it is higher; the emptied chamber under the car goes deep cyan with isobars round its edge.',
  fits: 'where suction comes from; how much lower the pressure under the car is than around it; before and after the fans',
  params: {
    show: {type: 'progress', default: 1, doc: '0 to 1: the colour develops from the car outwards'},
    seal: {type: 'progress', default: 0, doc: '0 the floor is open, 1 the skirts are down (as on the car)'},
    suction: {type: 'progress', default: 0, doc: '0 to 1: how far the fans have emptied the chamber under the car'},
  },
  preview: 25.5,
};

const W = 14, D = 7, NX = 140, NZ = 70;
const CACHE = new Map<string, Float32Array>();
function field(kind: 'open' | 'sealed') {
  if (CACHE.has(kind)) return CACHE.get(kind)!;
  const f = kind === 'open' ? OPEN : SEALED, out = new Float32Array((NX + 1) * (NZ + 1));
  for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++) {
    const x = -W / 2 + (W * i) / NX, z = -D / 2 + (D * j) / NZ;
    const inBody = (x / f.A) ** 2 + ((0.02 - f.CY) / f.B) ** 2 + (z / f.C) ** 2 < 1;
    out[j * (NX + 1) + i] = inBody ? 0 : cp(Math.min(1.8, velocity(f, x, 0.02, z)[3]));
  }
  CACHE.set(kind, out);
  return out;
}

export function PressureFloor({show = 1, seal = 0, suction = 0}: {show?: number; seal?: number; suction?: number}) {
  useTunnel(() => {
    const g = new THREE.PlaneGeometry(W, D, NX, NZ);
    g.rotateX(-Math.PI / 2);
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3), 3));
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false}));
    m.position.y = 0.008;
    m.renderOrder = 2;
    return m;
  }, (m, w) => {
    const sh = clamp(show), sl = clamp(seal), su = easeOut(clamp(suction));
    m.visible = sh > 0.001;
    if (!m.visible) return;
    const open = field('open'), sealed = field('sealed');
    const col = m.geometry.attributes.color as THREE.BufferAttribute, a = col.array as Float32Array;
    const low = new THREE.Color(HEX.low), high = new THREE.Color(HEX.high);
    const reachR = 1 + sh * 9;
    for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++) {
      const k = j * (NX + 1) + i, x = -W / 2 + (W * i) / NX, z = -D / 2 + (D * j) / NZ;
      let v = mix(open[k], sealed[k], sl);
      // the chamber: inside the skirts the pressure drops with the suction; outside, a rim of isobars
      const dx = Math.max(0, Math.abs(x) - CAR.chamberX), dz = Math.max(0, Math.abs(z) - CAR.chamberZ);
      const out = Math.sqrt(dx * dx + dz * dz), inside = out === 0;
      if (inside) v = mix(v, -2.4, su * mix(0.45, 1, sl));
      else v += -1.1 * su * Math.exp(-out / 0.35) * mix(0.6, 0.25, sl);
      const iso = !inside && su > 0 && out < 1.2 ? (0.5 + 0.5 * Math.cos((out - w.t * 0.35) * 26)) * (1 - out / 1.2) : 0;
      // develop from the car outwards
      const r = Math.sqrt((x / 2.4) ** 2 + (z / 1.1) ** 2), dev = clamp(reachR - r);
      const strength = v < 0 ? clamp(-v / 2.4) ** 0.8 : clamp(v / 0.9);
      const c = v < 0 ? low : high;
      const b = strength * dev * (inside ? 0.5 : 0.45) + (iso * strength * 0.35 * dev);
      a[k * 3] = c.r * b; a[k * 3 + 1] = c.g * b; a[k * 3 + 2] = c.b * b;
    }
    col.needsUpdate = true;
  });
  return null;
}
