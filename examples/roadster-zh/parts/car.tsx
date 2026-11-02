// The test car: a generic low two-seat coupé of the motion's own design, never a real model. Its body is lofted from cross
// sections along its length (a rounded box that closes at the nose and the tail), the cabin is a tinted glass bubble on top,
// four wheels on a slight stance. `xray` fades the paint to a glass ghost with lit edges and shows what is under the floor:
// the chamber the fans empty, the fans themselves, the ducts that carry the air up and out at the tail, and the skirts that
// drop to seal the chamber. `paint` maps the air's pressure onto the body, cyan where it is lower, orange where it is higher.
import * as THREE from 'three';
import {useTunnel} from './world.tsx';
import {CAR, HEX, OPEN, clamp, cp, easeOut, mix, phase, velocity} from './tunnel.tsx';

export const meta = {
  name: {en: 'Test car', 'zh-CN': '试验车'},
  purpose: 'data',
  line: 'A generic low coupé in liquid silver on the rolling road; it turns to glass to show the sealed floor, the fans across its tail and the skirts, and can wear the pressure of the air as colour.',
  fits: 'the object the air acts on; what is under its floor; where the air pushes harder or softer on its skin',
  params: {
    show: {type: 'progress', default: 1, doc: '0 to 1: the edges are drawn, then the paint comes up'},
    xray: {type: 'progress', default: 0, doc: '0 to 1: the paint turns to a glass ghost and the floor, chamber, fans and ducts show'},
    fans: {type: 'number', default: 0, doc: 'how fast the fans turn, 0 to 1'},
    count: {type: 'number', default: 4, doc: 'how many fans across the tail: 4 (two central for the sealed floor, two outboard), 2 or 1'},
    skirt: {type: 'progress', default: 0, doc: '0 to 1: the skirts drop from the sills to the floor, lit in the force colour'},
    paint: {type: 'progress', default: 0, doc: '0 to 1: the paint gives way to the pressure of the air on the skin'},
    lift: {type: 'number', default: 0, doc: 'metres the car is held above the floor (0 on its wheels)'},
    grip: {type: 'progress', default: 0, doc: '0 to 1: the four patches where the tyres touch the road light up in the force colour'},
    wing: {type: 'progress', default: 0, doc: '0 to 1: a rear wing on two struts rises from the tail deck (for comparing downforce that needs speed)'},
    x: {type: 'number', default: 0, doc: 'where it stands along the tunnel (metres)'},
  },
  preview: 11.0,
};

// the body's sections along its length: [x, sill height, shoulder height, half width], nose at -x (the air comes from -x)
const BODY: Array<[number, number, number, number]> = [
  [-2.25, 0.26, 0.34, 0.55], [-2.1, 0.17, 0.44, 0.82], [-1.8, 0.14, 0.56, 0.96], [-1.42, 0.13, 0.66, 1.0],
  [-1.0, 0.13, 0.64, 0.96], [-0.5, 0.13, 0.70, 0.93], [0.2, 0.13, 0.76, 0.94], [0.9, 0.13, 0.82, 0.99],
  [1.42, 0.13, 0.86, 1.02], [1.9, 0.15, 0.84, 0.97], [2.15, 0.22, 0.80, 0.86], [2.25, 0.30, 0.74, 0.70],
];
// the cabin, a low fastback: [x, base, top, half width at the top]
const CABIN: Array<[number, number, number, number]> = [
  [-0.85, 0.66, 0.67, 0.35], [-0.45, 0.70, 0.93, 0.50], [0.05, 0.74, 1.08, 0.52], [0.55, 0.78, 1.10, 0.50],
  [1.1, 0.82, 1.0, 0.44], [1.7, 0.85, 0.88, 0.30], [2.0, 0.84, 0.845, 0.18],
];
const sample = <T extends number[]>(rows: T[], x: number): number[] => {
  for (let i = 0; i < rows.length - 1; i++) {
    const a = rows[i], b = rows[i + 1];
    if (x <= b[0]) {
      const k = (x - a[0]) / (b[0] - a[0]), s = k * k * (3 - 2 * k);
      return a.map((v, j) => mix(v, b[j], j === 0 ? k : s));
    }
  }
  return rows[rows.length - 1].slice();
};
// the fenders: the body is fuller at the top over each axle, so the haunches swell over the wheels
const haunch = (x: number) => Math.exp(-(((Math.abs(x) - CAR.wheelX) / 0.42) ** 2));
const shape = (x: number): [number, number, number, number] => {
  const [, b, t, w] = sample(BODY, x);
  return [b, t + 0.03 * haunch(x), w, w * (0.7 + 0.22 * haunch(x))];
};
const se = (c: number, n: number) => Math.sign(c) * Math.pow(Math.abs(c), 2 / n);

/** A loft: `rings` sections from x0 to x1, each a superellipse of `seg` points; `at(x)` gives [bottom, top, half width at the bottom, at the top]. */
function loft(x0: number, x1: number, rings: number, seg: number, n: number, at: (x: number) => [number, number, number, number], upperOnly = false) {
  const pos: number[] = [], idx: number[] = [];
  for (let i = 0; i <= rings; i++) {
    const u = i / rings, x = mix(x0, x1, (1 - Math.cos(u * Math.PI)) / 2);   // denser at the ends, where it closes
    const [b, t, wb, wt] = at(x);
    // round the ends shut
    const end = Math.min(1, Math.sin(u * Math.PI) * 3.2);
    const cy = (b + t) / 2, hh = (t - b) / 2 * Math.sqrt(end), close = Math.sqrt(end);
    for (let j = 0; j <= seg; j++) {
      const th = upperOnly ? (j / seg) * Math.PI : (j / seg) * Math.PI * 2 - Math.PI / 2;
      const c = Math.cos(th), s = Math.sin(th);
      const yv = upperOnly ? b + (t - b) * se(s, n) * Math.sqrt(end) : cy + hh * se(s, n);
      const up = clamp((yv - b) / Math.max(0.001, t - b));
      const w = mix(wb, wt, up) * close;
      pos.push(x, yv, w * se(c, n));
    }
  }
  for (let i = 0; i < rings; i++) for (let j = 0; j < seg; j++) {
    const a = i * (seg + 1) + j, b = a + seg + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function tireGeometry() {
  const r = CAR.wheelR, w = 0.15, pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 16; i++) {
    const a = -Math.PI / 2 + (i / 16) * Math.PI;
    pts.push(new THREE.Vector2(r - 0.05 + Math.cos(a) * 0.05, Math.sin(a) * w));
  }
  pts.unshift(new THREE.Vector2(0.21, -w));
  pts.push(new THREE.Vector2(0.21, w));
  const g = new THREE.LatheGeometry(pts, 64);
  g.rotateX(Math.PI / 2);
  return g;
}

// the fans sit side by side across the tail, in the diffuser, blowing backwards (the layout of Tesla's patent US 12,377,920:
// two central fans draw from the sealed floor, two outboard fans from outside it)
export const FAN_X = 2.0, FAN_Y = 0.3;
const FAN_Z = [-0.66, -0.22, 0.22, 0.66];
export function fanPositions(count: number): number[] {
  if (count >= 4) return FAN_Z;
  if (count === 1) return [0];
  return [-0.22, 0.22];
}

export function TestCar({show = 1, xray = 0, fans = 0, count = 4, skirt = 0, paint = 0, lift = 0, x = 0, grip = 0, wing = 0}: {
  show?: number; xray?: number; fans?: number; count?: number; skirt?: number; paint?: number; lift?: number; x?: number; grip?: number; wing?: number;
}) {
  useTunnel(() => {
    const car = new THREE.Group();
    const bodyG = loft(-CAR.half, CAR.half, 110, 80, 3.2, shape);
    // the pressure on the skin, worked out once per vertex from the open-floor flow just outside it
    const p = bodyG.attributes.position as THREE.BufferAttribute, n = bodyG.attributes.normal as THREE.BufferAttribute;
    const col = new Float32Array(p.count * 3), base = new THREE.Color('#AEB8C6');
    bodyG.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const cps = new Float32Array(p.count);
    for (let i = 0; i < p.count; i++) {
      const [, , , s] = velocity(OPEN, p.getX(i) + n.getX(i) * 0.2, Math.max(0.02, p.getY(i) + n.getY(i) * 0.2), p.getZ(i) + n.getZ(i) * 0.2);
      cps[i] = cp(Math.min(s, 1.8));
      col.set([base.r, base.g, base.b], i * 3);
    }
    car.userData.cps = cps;
    const paintM = new THREE.MeshPhysicalMaterial({color: '#FFFFFF', vertexColors: true, metalness: 0.8, roughness: 0.24, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.1, transparent: true});
    const body = new THREE.Mesh(bodyG, paintM);
    body.name = 'body';
    car.add(body);
    const cabG = loft(-0.85, 2.0, 50, 48, 2.6, (x) => {
      const [, b, t, w] = sample(CABIN, x);
      return [b, t, w + 0.24, w];
    }, true);
    const glass = new THREE.Mesh(cabG, new THREE.MeshPhysicalMaterial({color: '#0B1626', metalness: 0.2, roughness: 0.02, clearcoat: 1, transparent: true, opacity: 0.95, envMapIntensity: 2.6}));
    glass.name = 'glass';
    car.add(glass);
    // lit edges for the ghost: the outline of the body where its surface turns sharply
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(bodyG, 28), new THREE.LineBasicMaterial({color: HEX.low, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false}));
    edges.name = 'edges';
    car.add(edges);
    const wire = new THREE.LineSegments(new THREE.WireframeGeometry(loft(-CAR.half, CAR.half, 22, 24, 3.2, shape)), new THREE.LineBasicMaterial({color: HEX.low, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false}));
    wire.name = 'wire';
    car.add(wire);
    // lights: a thin white bar at the nose, a red one across the tail
    const lamp = (w: number, c: string, xx: number, y: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.025, w), new THREE.MeshBasicMaterial({color: c}));
      m.position.set(xx, y, 0);
      m.name = 'lamp';
      return m;
    };
    car.add(lamp(0.9, '#EAF6FF', -2.17, 0.36), lamp(1.05, '#FF3B4A', 2.2, 0.68));
    // wheels
    const tire = tireGeometry(), tireM = new THREE.MeshStandardMaterial({color: '#0B0D10', roughness: 0.85, metalness: 0});
    const rimM = new THREE.MeshStandardMaterial({color: '#9AA4B2', roughness: 0.25, metalness: 1});
    const wheels = new THREE.Group();
    wheels.name = 'wheels';
    for (const wx of [-CAR.wheelX, CAR.wheelX]) for (const s of [-1, 1]) {
      const wg = new THREE.Group();
      wg.position.set(wx, CAR.wheelR, s * CAR.wheelZ);
      wg.add(new THREE.Mesh(tire, tireM));
      const spokes = new THREE.Group();
      for (let k = 0; k < 5; k++) {
        const sp = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.4, 0.03), rimM);
        sp.rotation.z = (k / 5) * Math.PI * 2;
        sp.position.z = s * 0.1;
        spokes.add(sp);
      }
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.02, 40), new THREE.MeshStandardMaterial({color: '#20262F', roughness: 0.5, metalness: 0.8}));
      hub.rotation.x = Math.PI / 2;
      hub.position.z = s * 0.085;
      spokes.add(hub);
      spokes.name = 'spokes';
      wg.add(spokes);
      wheels.add(wg);
    }
    car.add(wheels);
    // under the floor: the floor pan, the chamber, the fans and their ducts, the skirts
    const under = new THREE.Group();
    under.name = 'under';
    const pan = new THREE.Mesh(new THREE.BoxGeometry(CAR.chamberX * 2, 0.01, CAR.chamberZ * 2), new THREE.MeshBasicMaterial({color: HEX.low, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false}));
    pan.position.y = CAR.sill;
    under.add(pan);
    const outline = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(CAR.chamberX * 2, CAR.sill - 0.01, CAR.chamberZ * 2)),
      new THREE.LineBasicMaterial({color: HEX.low, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending}));
    outline.position.y = (CAR.sill + 0.01) / 2;
    under.add(outline);
    for (const fz of [...FAN_Z, 0]) {
      const fan = new THREE.Group();
      fan.position.set(FAN_X, FAN_Y, fz);
      fan.userData.key = `${fz}`;
      // the ring faces backwards: its axis runs along the car
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.016, 10, 60), new THREE.MeshBasicMaterial({color: HEX.low}));
      ring.rotation.y = Math.PI / 2;
      fan.add(ring);
      const blades = new THREE.Group();
      blades.name = 'blades';
      for (let k = 0; k < 7; k++) {
        const bl = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.16, 0.045), new THREE.MeshBasicMaterial({color: '#9FE6FF', transparent: true, opacity: 0.85}));
        bl.position.y = 0.09;
        bl.rotation.y = 0.5;
        const arm = new THREE.Group();
        arm.rotation.x = (k / 7) * Math.PI * 2;
        arm.add(bl);
        blades.add(arm);
      }
      fan.add(blades);
      // the central fans' duct: from the back of the sealed floor up into the fan
      if (Math.abs(fz) < 0.5) {
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(CAR.chamberX - 0.25 - FAN_X, CAR.sill - 0.06 - FAN_Y, -fz * 0.3), new THREE.Vector3(-0.12, -0.12, 0), new THREE.Vector3(0, 0, 0),
        ]);
        fan.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.15, 16, false),
          new THREE.MeshBasicMaterial({color: HEX.low, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide})));
      }
      under.add(fan);
    }
    const skirtM = new THREE.MeshBasicMaterial({color: HEX.force, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false});
    const skirts = new THREE.Group();
    skirts.name = 'skirts';
    for (const s of [-1, 1]) {
      const side = new THREE.Mesh(new THREE.BoxGeometry(CAR.chamberX * 2, 1, 0.025), skirtM);
      side.position.z = s * CAR.chamberZ;
      skirts.add(side);
      const end = new THREE.Mesh(new THREE.BoxGeometry(0.025, 1, CAR.chamberZ * 2), skirtM);
      end.position.x = s * CAR.chamberX;
      skirts.add(end);
    }
    under.add(skirts);
    car.add(under);
    // the soft shadow under the car
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 2.5), new THREE.MeshBasicMaterial({color: '#000000', transparent: true, opacity: 0.6, depthWrite: false,
      alphaMap: shadowAlpha()}));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.006;
    shadow.name = 'shadow';
    car.add(shadow);
    // the contact patches: a palm-sized glow under each tyre, on the road
    const patches = new THREE.Group();
    patches.name = 'patches';
    for (const wx of [-CAR.wheelX, CAR.wheelX]) for (const sz of [-1, 1]) {
      const m = new THREE.Mesh(new THREE.CircleGeometry(0.5, 40), new THREE.MeshBasicMaterial({color: HEX.force, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, alphaMap: shadowAlpha()}));
      m.rotation.x = -Math.PI / 2;
      m.scale.set(0.5, 0.36, 1);
      m.position.set(wx, 0.01, sz * CAR.wheelZ);
      patches.add(m);
    }
    car.add(patches);
    // a rear wing, upside-down aerofoil on two struts over the tail deck
    const rw = new THREE.Group();
    rw.name = 'wing';
    const foil = new THREE.Shape();
    foil.moveTo(-0.22, 0); foil.bezierCurveTo(-0.12, -0.07, 0.1, -0.06, 0.22, -0.01); foil.bezierCurveTo(0.08, 0.01, -0.12, 0.02, -0.22, 0);
    const wg = new THREE.ExtrudeGeometry(foil, {depth: 1.7, bevelEnabled: false});
    wg.translate(0, 0, -0.85);
    const wingM = new THREE.MeshPhysicalMaterial({color: '#202A38', metalness: 0.4, roughness: 0.35, clearcoat: 1});
    const blade = new THREE.Mesh(wg, wingM);
    blade.position.set(1.95, 1.12, 0);
    rw.add(blade);
    for (const sz of [-0.45, 0.45]) {
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.02), wingM);
      strut.position.set(1.95, 0.98, sz);
      rw.add(strut);
    }
    car.add(rw);
    return car;
  }, (car, w) => {
    const sh = clamp(show), drawn = easeOut(phase(sh, 0, 0.55)), filled = easeOut(phase(sh, 0.35, 1));
    const xr = easeOut(clamp(xray)), pt = clamp(paint), sk = easeOut(clamp(skirt));
    car.position.set(x, lift, 0);
    car.visible = sh > 0;
    const body = car.getObjectByName('body') as THREE.Mesh, glass = car.getObjectByName('glass') as THREE.Mesh;
    const pm = body.material as THREE.MeshPhysicalMaterial;
    pm.opacity = filled * mix(1, 0.1, xr);
    pm.depthWrite = xr < 0.5;
    // the paint: pearl, or the pressure on it
    const col = (body.geometry.attributes.color as THREE.BufferAttribute), cps = car.userData.cps as Float32Array;
    if (car.userData.painted !== pt) {
      const base = new THREE.Color('#AEB8C6'), low = new THREE.Color(HEX.low), high = new THREE.Color(HEX.high), c = new THREE.Color();
      for (let i = 0; i < cps.length; i++) {
        const v = cps[i];
        c.copy(base);
        if (pt > 0) c.lerp(v > 0 ? high : low, pt * clamp(Math.abs(v) / (v > 0 ? 0.7 : 1.4)) * 0.95);
        col.setXYZ(i, c.r, c.g, c.b);
      }
      col.needsUpdate = true;
      car.userData.painted = pt;
    }
    (glass.material as THREE.MeshPhysicalMaterial).opacity = filled * mix(0.92, 0.08, xr);
    glass.visible = filled > 0.01;
    const edges = car.getObjectByName('edges') as THREE.LineSegments;
    (edges.material as THREE.LineBasicMaterial).opacity = Math.max(drawn * (1 - filled) * 0.9, xr * 0.7);
    (edges.material as THREE.LineBasicMaterial).color.set(xr > 0 ? HEX.low : '#DCE6F2');
    const wire = car.getObjectByName('wire') as THREE.LineSegments;
    (wire.material as THREE.LineBasicMaterial).opacity = xr * 0.14 + drawn * (1 - filled) * 0.25;
    car.traverse((o) => { if (o.name === 'lamp') o.visible = filled > 0.5; });
    // the wheels roll only when the car drives along the road (`OnTrack`'s `along`); the rolling road under a car held still does not turn them
    const wheels = car.getObjectByName('wheels') as THREE.Group;
    wheels.children.forEach((wg) => {
      wg.visible = filled > 0.01;
      (wg.getObjectByName('spokes') as THREE.Group).rotation.z = w.travel / CAR.wheelR;
    });
    // under the floor
    const under = car.getObjectByName('under') as THREE.Group;
    under.visible = xr > 0.01 || sk > 0.01;
    const want = new Set(fanPositions(count).map((z) => `${z}`));
    under.children.forEach((o) => {
      if (o.userData.key !== undefined) {
        o.visible = want.has(o.userData.key) && xr > 0.01;
        (o.getObjectByName('blades') as THREE.Group).rotation.x = w.t * 26 * clamp(fans);
      } else if (o.name !== 'skirts') {
        o.visible = xr > 0.01;
      }
    });
    const skirts = car.getObjectByName('skirts') as THREE.Group;
    const hgt = Math.max(0.001, CAR.sill * sk);
    skirts.scale.y = hgt;
    skirts.position.y = CAR.sill - hgt / 2;
    skirts.visible = sk > 0.01;
    const wn = easeOut(clamp(wing)), rwing = car.getObjectByName('wing') as THREE.Group;
    rwing.visible = wn > 0.01;
    rwing.scale.set(1, Math.max(0.01, wn), 1);
    rwing.position.y = 0.86 * (1 - wn);
    const gp = clamp(grip), pulse = 0.85 + 0.15 * Math.sin(w.t * 6);
    (car.getObjectByName('patches') as THREE.Group).children.forEach((m) => { ((m as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = gp * pulse; m.visible = gp > 0.01; });
    const shadow = car.getObjectByName('shadow') as THREE.Mesh;
    (shadow.material as THREE.MeshBasicMaterial).opacity = 0.65 * filled * (1 - clamp(lift / 1.5));
    shadow.position.y = 0.006 - lift;
  });
  return null;
}

let SHADOW: THREE.CanvasTexture | null = null;
function shadowAlpha() {
  if (SHADOW) return SHADOW;
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(128, 64, 10, 128, 64, 128);
  grd.addColorStop(0, '#ffffff');
  grd.addColorStop(0.6, '#888888');
  grd.addColorStop(1, '#000000');
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 128);
  SHADOW = new THREE.CanvasTexture(c);
  return SHADOW;
}
