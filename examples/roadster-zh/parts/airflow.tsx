// The air: smoke released upstream that follows the streamlines round the car, with bright puffs running along each line at the
// air's speed. Each line is coloured by how fast the air moves on it: pale in the free stream, warm where it slows against the
// nose (higher pressure), cyan where it speeds over the roof or squeezes under the floor (lower pressure). With the floor open
// some smoke passes under the car; with the skirts down (`seal`) it is turned aside. With the fans on, the air inside the chamber
// is drawn to the fans, up the ducts and blown out over the tail in a jet.
import * as THREE from 'three';
import {softDot, useTunnel} from './world.tsx';
import {FAN_X, FAN_Y, fanPositions} from './car.tsx';
import {CAR, HEX, OPEN, SEALED, clamp, easeOut, seeded, speedColor, trace, type Streamline} from './tunnel.tsx';

export const meta = {
  name: {en: 'Smoke and airflow', 'zh-CN': '烟线与气流'},
  purpose: 'data',
  line: 'Smoke lines released upstream that bend round the car, coloured by the air\'s speed, with puffs running along them; with the fans on, the air of the sealed floor is drawn to the fans across the tail and leaves backwards; with the wind off, only that air moves.',
  fits: 'how air goes round and under a body; where it speeds up or slows; what the fans do to the air under the car',
  params: {
    reach: {type: 'progress', default: 1, doc: '0 to 1: how far the smoke has travelled down the tunnel from upstream'},
    rake: {type: 'sheet | wide', default: 'sheet', doc: 'one vertical sheet of smoke along the car (the classic rake), or lines spread over its whole width'},
    z: {type: 'number', default: 0, doc: 'where the sheet is, across (metres from the centre line)'},
    lines: {type: 'number', default: 36, doc: 'how many smoke lines (sheet) or rows (wide)'},
    seal: {type: 'progress', default: 0, doc: '0 the floor is open and smoke passes under the car, 1 the skirts are down and it is turned aside'},
    fans: {type: 'progress', default: 0, doc: '0 to 1: the air in the chamber is pumped up the ducts and out over the tail'},
    count: {type: 'number', default: 4, doc: 'the fans across the tail, as on the car: 4, 2 or 1'},
    laser: {type: 'progress', default: 0, doc: '0 to 1: a laser sheet lights the smoke\'s plane; the rest of the tunnel dims'},
    speed: {type: 'number', default: 1, doc: 'how fast the puffs run'},
    glow: {type: 'number', default: 1, doc: 'how bright the smoke is'},
    stream: {type: 'progress', default: 1, doc: '1 the tunnel\'s wind is blowing past the car; 0 the air outside is still (a car standing on a wall), and only the air the fans pump out moves'},
  },
  preview: 9.0,
};

const X0 = -13, X1 = 16, DS = 0.06, TRAIL = 22, PUFFS = 3;
const CACHE = new Map<string, Streamline[]>();

function seeds(rake: string, z: number, lines: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  if (rake === 'wide') {
    const cols = 11;
    for (let i = 0; i < lines; i++) for (let k = 0; k < cols; k++) {
      const y = 0.05 + 2.4 * Math.pow((i + 0.5) / lines, 1.5);
      out.push([y, -1.7 + (3.4 * k) / (cols - 1)]);
    }
  } else {
    for (let i = 0; i < lines; i++) out.push([0.035 + 2.6 * Math.pow((i + 0.5) / lines, 1.7), z]);
  }
  return out;
}

function family(kind: 'open' | 'sealed', rake: string, z: number, lines: number) {
  const key = `${kind}|${rake}|${z}|${lines}`;
  if (!CACHE.has(key)) CACHE.set(key, seeds(rake, z, lines).map(([y, zz]) => trace(kind === 'open' ? OPEN : SEALED, X0, y, zz, X1, DS)));
  return CACHE.get(key)!;
}

/** The air inside the chamber, drawn to the fans, up the ducts and out over the tail. */
function pumped(count: number): Streamline[] {
  const key = `pump|${count}`;
  if (CACHE.has(key)) return CACHE.get(key)!;
  // the air of the sealed floor goes to the central fans across the tail and leaves backwards, low, spreading as it slows
  const fans = fanPositions(count).filter((z) => Math.abs(z) < 0.5);
  const r = seeded(7 + count), out: Streamline[] = [];
  for (let i = 0; i < 56; i++) {
    const sx = (r() * 2 - 1) * CAR.chamberX * 0.95, sz = (r() * 2 - 1) * CAR.chamberZ * 0.9;
    let fz = fans[0];
    for (const f of fans) if (Math.abs(f - sz) < Math.abs(fz - sz)) fz = f;
    const j = (r() - 0.5) * 0.1, side = (r() - 0.5) * 0.6;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(sx, 0.05, sz), new THREE.Vector3(CAR.chamberX - 0.2, 0.06, sz * 0.5 + fz * 0.5), new THREE.Vector3(FAN_X - 0.1, FAN_Y - 0.05 + j, fz),
      new THREE.Vector3(FAN_X + 0.5, FAN_Y + j, fz + side * 0.2), new THREE.Vector3(3.8, 0.38 + j * 2, fz * 1.5 + side), new THREE.Vector3(6.0, 0.55 + j * 3, fz * 2 + side * 2.2),
    ], false, 'centripetal');
    const n = Math.round(curve.getLength() / DS), pts = new Float32Array(n * 3), sp = new Float32Array(n);
    const v = new THREE.Vector3();
    for (let k = 0; k < n; k++) {
      curve.getPointAt(k / (n - 1), v);
      pts.set([v.x, v.y, v.z], k * 3);
      sp[k] = 1.6;   // drawn as fast air
    }
    out.push({pts, speed: sp, n, length: n * DS});
  }
  CACHE.set(key, out);
  return out;
}

type Lines = {still: THREE.LineSegments; puffs: THREE.LineSegments; heads: THREE.Points; cap: number};

function makeLines(maxSeg: number, maxStill: number): Lines {
  const mk = (n: number) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 6), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 6), 3));
    g.setDrawRange(0, 0);
    return g;
  };
  const m = () => new THREE.LineBasicMaterial({vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false});
  const still = new THREE.LineSegments(mk(maxStill), m());
  const puffs = new THREE.LineSegments(mk(maxSeg), m());
  const hg = new THREE.BufferGeometry();
  hg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(maxSeg * 3), 3));
  hg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(maxSeg * 3), 3));
  hg.setDrawRange(0, 0);
  const heads = new THREE.Points(hg, new THREE.PointsMaterial({size: 0.12, map: softDot(), vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false}));
  still.frustumCulled = puffs.frustumCulled = heads.frustumCulled = false;
  return {still, puffs, heads, cap: maxSeg};
}

export function Airflow({reach = 1, rake = 'sheet', z = 0, lines = 36, seal = 0, fans = 0, count = 4, laser = 0, speed = 1, glow = 1, stream = 1}: {
  reach?: number; rake?: 'sheet' | 'wide'; z?: number; lines?: number; seal?: number; fans?: number; count?: number; laser?: number; speed?: number; glow?: number; stream?: number;
}) {
  useTunnel(() => {
    const g = new THREE.Group();
    const l = makeLines(60000, 200000);
    g.add(l.still, l.puffs, l.heads);
    g.userData.lines = l;
    // the laser sheet: a thin plane of cyan light along the tunnel
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(30, 3.2), new THREE.MeshBasicMaterial({color: HEX.low, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide}));
    sheet.position.set(1.5, 1.6, 0);
    sheet.name = 'sheet';
    g.add(sheet);
    return g;
  }, (g, w) => {
    const L = g.userData.lines as Lines;
    const t = w.t, xr = X0 + 0.5 + easeOut(clamp(reach)) * (X1 - X0), s = clamp(seal), f = clamp(fans), lz = clamp(laser);
    const sets: Array<[Streamline[], number, boolean]> = [];
    const st = clamp(stream);
    if (s < 1 && st > 0) sets.push([family('open', rake, z, lines), (1 - s) * st, false]);
    if (s > 0 && st > 0) sets.push([family('sealed', rake, z, lines), s * st, false]);
    if (f > 0) sets.push([pumped(count), f, true]);
    const sp = L.still.geometry.attributes.position as THREE.BufferAttribute, sc = L.still.geometry.attributes.color as THREE.BufferAttribute;
    const pp = L.puffs.geometry.attributes.position as THREE.BufferAttribute, pc = L.puffs.geometry.attributes.color as THREE.BufferAttribute;
    const hp = L.heads.geometry.attributes.position as THREE.BufferAttribute, hc = L.heads.geometry.attributes.color as THREE.BufferAttribute;
    const spa = sp.array as Float32Array, sca = sc.array as Float32Array, ppa = pp.array as Float32Array, pca = pc.array as Float32Array;
    const hpa = hp.array as Float32Array, hca = hc.array as Float32Array;
    let ns = 0, np = 0, nh = 0;
    const c: [number, number, number] = [0, 0, 0];
    const cyan = [0.31, 0.82, 1.0];
    for (const [fam, weight, pump] of sets) {
      fam.forEach((line, li) => {
        // the sheet dims what is off its plane when the laser is on
        const off = rake === 'wide' ? 1 - lz * 0.65 : 1;
        const base = weight * glow * off * (pump ? 0.6 : rake === 'wide' ? 0.5 : 0.32);
        // the still smoke: every other segment of the whole line, faint
        for (let k = 0; k < line.n - 2 && ns < 199990; k += 2) {
          const x = line.pts[k * 3];
          if (!pump && x > xr) break;
          const fade = pump ? 0.18 : Math.min(1, (xr - x) / 1.5) * clamp((x - X0) / 2);
          if (pump) { c[0] = cyan[0]; c[1] = cyan[1]; c[2] = cyan[2]; } else speedColor(line.speed[k], c);
          const b = base * fade;
          for (const kk of [k, k + 2]) {
            spa.set([line.pts[kk * 3], line.pts[kk * 3 + 1], line.pts[kk * 3 + 2]], ns * 3);
            sca.set([c[0] * b, c[1] * b, c[2] * b], ns * 3);
            ns++;
          }
        }
        // the puffs: bright heads with fading tails running along the line at the air's speed (faster where the air is faster)
        const rate = (pump ? 2.2 : 1.6) * speed / DS;
        for (let p = 0; p < PUFFS; p++) {
          const off0 = ((li * 0.618 + p / PUFFS) % 1) * line.n;
          const head = Math.floor((t * rate + off0) % line.n);
          const hx = line.pts[head * 3];
          if (!pump && hx > xr) continue;
          for (let k = 0; k < TRAIL && np < L.cap - 2; k++) {
            const a = head - k, b2 = a - 1;
            if (b2 < 0) break;
            const fade = (1 - k / TRAIL) ** 1.6 * weight * glow * off;
            if (pump) { c[0] = cyan[0]; c[1] = cyan[1]; c[2] = cyan[2]; } else speedColor(line.speed[a], c);
            ppa.set([line.pts[a * 3], line.pts[a * 3 + 1], line.pts[a * 3 + 2], line.pts[b2 * 3], line.pts[b2 * 3 + 1], line.pts[b2 * 3 + 2]], np * 3);
            pca.set([c[0] * fade, c[1] * fade, c[2] * fade, c[0] * fade * 0.8, c[1] * fade * 0.8, c[2] * fade * 0.8], np * 3);
            np += 2;
          }
          if (nh < L.cap - 1) {
            hpa.set([line.pts[head * 3], line.pts[head * 3 + 1], line.pts[head * 3 + 2]], nh * 3);
            const hb = weight * glow * off * 0.9;
            if (pump) { c[0] = cyan[0]; c[1] = cyan[1]; c[2] = cyan[2]; } else speedColor(line.speed[head], c);
            hca.set([c[0] * hb, c[1] * hb, c[2] * hb], nh * 3);
            nh++;
          }
        }
      });
    }
    L.still.geometry.setDrawRange(0, ns);
    L.puffs.geometry.setDrawRange(0, np);
    L.heads.geometry.setDrawRange(0, nh);
    sp.needsUpdate = sc.needsUpdate = pp.needsUpdate = pc.needsUpdate = hp.needsUpdate = hc.needsUpdate = true;
    const sheet = g.getObjectByName('sheet') as THREE.Mesh;
    sheet.position.z = z;
    (sheet.material as THREE.MeshBasicMaterial).opacity = 0.07 * lz;
    sheet.visible = lz > 0.01;
  });
  return null;
}
