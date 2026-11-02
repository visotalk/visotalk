// The wind tunnel every Wind Tunnel component stands in: one three.js scene per scene. A dark test section seen through its glass:
// a polished floor that mirrors the car and the smoke, a rolling road under the wheels running with the air, glass walls on ribs,
// two light strips along the ceiling, haze down the tunnel. One camera orbits, dollies and can turn over (`spin`). For a car on a
// wall or a ceiling there is a faint road that leaves the floor, curls up a tall wall and over onto a ledge high above: a car
// stands on it at a distance along it inside `<OnTrack>`, and drives by tweening that distance.
// Every frame is drawn from the clock and the props in a layout effect; a component adds its objects with `useTunnel` and sets them
// while it renders, so the world draws once, last. Words stay in HTML over the canvas, placed with `project`.
import React, {createContext, useContext, useLayoutEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {Reflector} from 'three/addons/objects/Reflector.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {useCanvas, useDocTime} from '@visotalk/runtime';
import {DEG, HEX, clamp} from './tunnel.tsx';

export const meta = {
  name: {en: 'Test section', 'zh-CN': '风洞试验段'},
  purpose: 'ground',
  line: 'The wind tunnel in 3D: a polished floor that mirrors the car and the smoke, a rolling road, glass walls, light strips and haze; the camera orbits and can turn over, and a car can drive a faint road from the floor up a wall and onto a ceiling.',
  fits: 'every scene: yaw and pitch to walk round the car, dist to push in; <OnTrack> to drive a car up a wall and onto the ceiling; spin 180 to see a car on the ceiling the right way up',
  params: {
    yaw: {type: 'number', default: -32, doc: 'degrees the camera has turned round the car; 0 looks at its side, negative from the front'},
    pitch: {type: 'number', default: 14, doc: 'degrees the camera looks down; negative looks up from below the floor\'s level'},
    dist: {type: 'number', default: 9.5, doc: 'metres from the camera to what it looks at (the car is 4.5 m long)'},
    tx: {type: 'number', default: 0, doc: 'what the camera looks at, along the tunnel (metres)'},
    ty: {type: 'number', default: 0.6, doc: 'what the camera looks at, up'},
    tz: {type: 'number', default: 0, doc: 'what the camera looks at, across'},
    fov: {type: 'number', default: 32, doc: 'the lens: smaller is longer and flatter'},
    air: {type: 'number', default: 1, doc: 'how fast the rolling road runs with the air (0 stopped); the wheels do not turn with it'},
    road: {type: 'progress', default: 0, doc: '0 to 1: how much of the road a car drives on shows: a faint glass deck and two thin edge lines, never enough to hide the car (0 unseen)'},
    spin: {type: 'number', default: 0, doc: 'degrees the camera has turned over about the way it looks: 180 shows a car hanging from the ceiling as if it stood on a road'},
    shake: {type: 'progress', default: 0, doc: 'a jolt of the camera: tween to 1 and back to 0 over half a second'},
    walls: {type: 'progress', default: 1, doc: '1 the glass walls, the ceiling and the rolling road are there; 0 only the floor in the haze (the ledge a car drives onto is then the only ceiling)'},
    glow: {type: 'number', default: 0.3, doc: 'how much the bright things (smoke, lamps, pressure, arrows) bloom into the haze; 0 for none'},
  },
  preview: 3.0,
};

export type Tunnel = {
  scene: THREE.Scene;
  /** where a component's objects go: the section, or the frame of a place on the road (`OnTrack`) */
  rig: THREE.Group;
  camera: THREE.PerspectiveCamera;
  t: number;
  /** metres along the road of the frame the component stands in: what the wheels roll with */
  travel: number;
  /** where a point of that frame lands on the 1920×1080 frame, and whether it is in front of the camera */
  project: (x: number, y: number, z: number) => {x: number; y: number; front: boolean};
};
const TunnelContext = createContext<Tunnel | null>(null);
export const useTunnelWorld = () => {
  const w = useContext(TunnelContext);
  if (!w) throw new Error('a Wind Tunnel component stands inside <TestSection>');
  return w;
};

/** Add an object to the section once (`build`), and set it every frame while the component renders (`update`). */
export function useTunnel<T extends THREE.Object3D>(build: () => T, update: (o: T, w: Tunnel) => void): T {
  const w = useTunnelWorld();
  const ref = useRef<T | null>(null);
  if (!ref.current) ref.current = build();
  const o = ref.current;
  update(o, w);
  useLayoutEffect(() => {
    w.rig.add(o);
    return () => {
      w.rig.remove(o);
      o.traverse((c) => {
        const m = c as THREE.Mesh;
        m.geometry?.dispose();
        const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
        for (const x of mats) { (x as THREE.MeshStandardMaterial).map?.dispose(); x.dispose(); }
      });
    };
  }, [w.rig, o]);
  return o;
}

/** A soft round texture: dots of light, haze and contact shadows. */
let SOFT: THREE.CanvasTexture | null = null;
export function softDot() {
  if (SOFT) return SOFT;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.35, 'rgba(255,255,255,0.45)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  SOFT = new THREE.CanvasTexture(c);
  return SOFT;
}

const H = 7, HALF_W = 16, LONG = 80;  // the section's height, half width and length

/** The rolling road's belt: dark rubber with faint seams that run with the air. */
function beltTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = '#0B1018';
  g.fillRect(0, 0, 512, 64);
  for (let i = 0; i < 8; i++) {
    g.fillStyle = 'rgba(120,150,190,0.10)';
    g.fillRect(i * 64, 0, 3, 64);
  }
  g.fillStyle = 'rgba(79,209,255,0.10)';
  g.fillRect(0, 0, 512, 2);
  g.fillRect(0, 62, 512, 2);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function buildHall() {
  const g = new THREE.Group();
  // the floor: a mirror under a dark, slightly glossy skin, so reflections are dim and soft at the edges
  const mirror = new Reflector(new THREE.PlaneGeometry(LONG, HALF_W * 2), {textureWidth: 1024, textureHeight: 512, color: 0x202833});
  mirror.rotation.x = -Math.PI / 2;
  mirror.position.y = -0.002;
  g.add(mirror);
  const skin = new THREE.Mesh(new THREE.PlaneGeometry(LONG, HALF_W * 2),
    new THREE.MeshLambertMaterial({color: '#05080D', transparent: true, opacity: 0.84}));
  skin.rotation.x = -Math.PI / 2;
  g.add(skin);
  // the floor's grid: a line a metre, brighter every five, like the scale painted on a test section
  const grid: number[] = [], gcol: number[] = [];
  for (let x = -LONG / 2; x <= LONG / 2; x += 1) {
    const k = Math.round(x) % 5 === 0 ? 0.16 : 0.07;
    grid.push(x, 0.003, -HALF_W, x, 0.003, HALF_W);
    gcol.push(k, k * 1.3, k * 1.7, k, k * 1.3, k * 1.7);
  }
  for (let z = -HALF_W; z <= HALF_W + 0.01; z += 1) {
    grid.push(-LONG / 2, 0.003, z, LONG / 2, 0.003, z);
    gcol.push(0.06, 0.08, 0.11, 0.06, 0.08, 0.11);
  }
  const gg = new THREE.BufferGeometry();
  gg.setAttribute('position', new THREE.Float32BufferAttribute(grid, 3));
  gg.setAttribute('color', new THREE.Float32BufferAttribute(gcol, 3));
  g.add(new THREE.LineSegments(gg, new THREE.LineBasicMaterial({vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false})));
  // the rolling road and the turntable ring round it
  const belt = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 1.2), new THREE.MeshStandardMaterial({map: beltTexture(), roughness: 0.9, metalness: 0}));
  belt.rotation.x = -Math.PI / 2;
  belt.position.y = 0.004;
  belt.name = 'belt';
  g.add(belt);
  const ring = new THREE.Mesh(new THREE.RingGeometry(3.55, 3.6, 160), new THREE.MeshBasicMaterial({color: HEX.low, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false}));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.005;
  const ticks: number[] = [];
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2, r0 = i % 6 === 0 ? 3.7 : 3.64;
    ticks.push(Math.cos(a) * 3.6, 0.006, Math.sin(a) * 3.6, Math.cos(a) * r0 * 1.02, 0.006, Math.sin(a) * r0 * 1.02);
  }
  const tg = new THREE.BufferGeometry();
  tg.setAttribute('position', new THREE.Float32BufferAttribute(ticks, 3));
  const tick = new THREE.LineSegments(tg, new THREE.LineBasicMaterial({color: HEX.low, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending}));
  // the glass walls on their ribs, and the ceiling with its two light strips: the enclosure, which a scene can take away
  const shell = new THREE.Group();
  shell.name = 'shell';
  g.add(shell);
  // the turntable belongs to the room: it goes with the walls
  shell.add(ring, tick);
  const glass = new THREE.MeshPhysicalMaterial({color: '#0E1826', roughness: 0.15, metalness: 0, transparent: true, opacity: 0.22, side: THREE.DoubleSide});
  const rib = new THREE.MeshStandardMaterial({color: '#141C28', roughness: 0.5, metalness: 0.7});
  for (const s of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(LONG, H), glass);
    wall.position.set(0, H / 2, s * HALF_W);
    shell.add(wall);
    for (let x = -LONG / 2; x <= LONG / 2; x += 3) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(0.12, H, 0.18), rib);
      r.position.set(x, H / 2, s * (HALF_W + 0.05));
      shell.add(r);
      // a faint cyan line where each rib meets the floor
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.012, 0.02), new THREE.MeshBasicMaterial({color: HEX.low, transparent: true, opacity: 0.5}));
      foot.position.set(x, 0.02, s * (HALF_W - 0.05));
      shell.add(foot);
    }
  }
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(LONG, HALF_W * 2), new THREE.MeshStandardMaterial({color: '#05080C', roughness: 0.9, metalness: 0, envMapIntensity: 0.1}));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = H;
  shell.add(ceil);
  for (const z of [-2.4, 2.4]) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(LONG, 0.04, 0.34), new THREE.MeshBasicMaterial({color: '#7F93AE'}));
    strip.position.set(0, H - 0.03, z);
    shell.add(strip);
  }
  for (let x = -LONG / 2; x <= LONG / 2; x += 3) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.22, HALF_W * 2), rib);
    beam.position.set(x, H - 0.11, 0);
    shell.add(beam);
  }
  return {group: g, belt, shell};
}

/**
 * The road a car drives on to reach a wall or a ceiling, drawn only faintly (`road`). It runs along the floor towards -x, leaves it at x = 0 and curls up a wall
 * (radius R) at x = -R, climbs it, and curls over (radius R) onto a ledge 2R + rise up that runs back towards +x over the floor
 * (the shape of the launch's ramp: a short curl, a tall wall, an overhang). `s` is the distance along it in
 * metres: 0 where it leaves the floor, negative on the floor before that. A car on it drives nose first towards -x, so on the ledge
 * it hangs upside down, nose towards +x.
 */
export const TRACK = {R: 3.5, rise: 5, start: -50, ledge: 12, half: 2.6};
const A1 = Math.PI * TRACK.R / 2, A2 = A1 + TRACK.rise, A3 = A2 + A1;
/** Where the road leaves the floor, reaches the wall, leaves the wall and reaches the ledge: `s` of each. */
export const TRACK_AT = {floor: 0, wall: A1, top: A2, ledge: A3, end: A3 + TRACK.ledge};

/** The frame of the road at `s`: its point (x, y) and how far it has turned about z (0 on the floor, -π/2 on the wall, -π on the ledge). */
export function trackPose(s: number): {x: number; y: number; a: number} {
  const {R, rise} = TRACK;
  if (s <= 0) return {x: -s, y: 0, a: 0};
  if (s <= A1) { const f = s / R; return {x: -R * Math.sin(f), y: R - R * Math.cos(f), a: -f}; }
  if (s <= A2) return {x: -R, y: R + (s - A1), a: -Math.PI / 2};
  if (s <= A3) { const f = (s - A2) / R; return {x: -R * Math.cos(f), y: R + rise + R * Math.sin(f), a: -Math.PI / 2 - f}; }
  return {x: s - A3, y: 2 * R + rise, a: -Math.PI};
}

/** A point given in the road's frame at `s` (x along the car, nose at -x; y off the road; z across), in the section. */
export function onTrack(s: number, x: number, y: number, z: number): [number, number, number] {
  const p = trackPose(s), c = Math.cos(p.a), n = Math.sin(p.a);
  return [p.x + x * c - y * n, p.y + x * n + y * c, z];
}

const DS = 0.1;
/** The road as a ghost: a deck of faint glass and two thin edge lines with ties across every metre, all light that adds to the
 * frame and writes no depth, so the car is never behind it. */
function buildRoad() {
  const g = new THREE.Group();
  const {start, half} = TRACK, n = Math.round((TRACK_AT.end - start) / DS);
  const deck: number[] = [], edge: number[] = [], ties: number[] = [];
  const at = (s: number, y: number, z: number) => onTrack(s, 0, y, z);
  for (let i = 0; i < n; i++) {
    const s0 = start + i * DS, s1 = s0 + DS;
    const a = at(s0, 0.004, -half), b = at(s0, 0.004, half), c = at(s1, 0.004, half), d = at(s1, 0.004, -half);
    deck.push(...a, ...b, ...c, ...a, ...c, ...d);
    for (const z of [-half, half]) edge.push(...at(s0, 0.006, z), ...at(s1, 0.006, z));
    if (Math.abs(s0 - Math.round(s0)) < DS / 2) ties.push(...at(s0, 0.005, -half), ...at(s0, 0.005, half));
  }
  const geo = (pos: number[]) => { const q = new THREE.BufferGeometry(); q.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); return q; };
  const glow = (color: string) => ({color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false});
  const plane = new THREE.Mesh(geo(deck), new THREE.MeshBasicMaterial({...glow('#4A6A90'), side: THREE.DoubleSide}));
  plane.name = 'deck';
  const lines = new THREE.LineSegments(geo(edge), new THREE.LineBasicMaterial(glow('#9FB2CC')));
  lines.name = 'edge';
  const rungs = new THREE.LineSegments(geo(ties), new THREE.LineBasicMaterial(glow('#6F86A6')));
  rungs.name = 'ties';
  g.add(plane, lines, rungs);
  return g;
}

/** How much of the road shows (0 to 1): faint, so it reads as a wall nobody built rather than a thing in front of the car. */
function showRoad(g: THREE.Group, k: number) {
  g.visible = k > 0;
  const op: Record<string, number> = {deck: 0.06, edge: 0.45, ties: 0.12};
  for (const o of g.children) (((o as THREE.Mesh).material) as THREE.Material & {opacity: number}).opacity = op[o.name] * k;
}

/**
 * A place on the road: its children stand in the road's frame at distance `along` (the car on its wheels at the frame's origin, nose
 * towards -x), so a car drives by tweening `along`, and its wheels roll with it. `wheels` turns the wheels further on the spot, metres
 * of road, as a rolling road under a car held still in the wind does. Every Wind Tunnel component can stand inside.
 */
export function OnTrack({along = 0, wheels = 0, children}: {along?: number; wheels?: number; children?: React.ReactNode}) {
  const w = useTunnelWorld();
  const frame = useMemo(() => new THREE.Group(), []);
  const p = trackPose(along);
  frame.position.set(p.x, p.y, 0);
  frame.rotation.set(0, 0, p.a);
  useLayoutEffect(() => {
    w.rig.add(frame);
    return () => { w.rig.remove(frame); };
  }, [w.rig, frame]);
  const here: Tunnel = {...w, rig: frame, travel: along + wheels, project: (x, y, z) => w.project(...onTrack(along, x, y, z))};
  return <TunnelContext.Provider value={here}>{children}</TunnelContext.Provider>;
}

export function TestSection({yaw = -32, pitch = 14, dist = 9.5, tx = 0, ty = 0.6, tz = 0, fov = 32, air = 1, road = 0, spin = 0, shake = 0, glow = 0.3, walls = 1, children}: {
  yaw?: number; pitch?: number; dist?: number; tx?: number; ty?: number; tz?: number; fov?: number; air?: number; road?: number; spin?: number; shake?: number; glow?: number; walls?: number; children?: React.ReactNode;
}) {
  const t = useDocTime();
  const {width, height} = useCanvas();
  const canvas = useRef<HTMLCanvasElement>(null);
  const renderer = useRef<THREE.WebGLRenderer | null>(null);
  const post = useRef<{composer: EffectComposer; bloom: UnrealBloomPass} | null>(null);

  const set = useMemo(() => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(HEX.bg);
    scene.fog = new THREE.FogExp2(HEX.bg, 0.045);
    const camera = new THREE.PerspectiveCamera(fov, width / height, 0.05, 200);
    const rig = new THREE.Group();
    scene.add(rig);
    const hall = buildHall();
    rig.add(hall.group);
        // light: the ceiling strips as long soft sources, a cool rim from downstream, a little fill from the floor
    const top = new THREE.DirectionalLight('#E4EEFF', 1.6);
    top.position.set(-2, 8, 3);
    const rim = new THREE.DirectionalLight('#7FD8FF', 1.4);
    rim.position.set(9, 2.5, -6);
    const warm = new THREE.DirectionalLight('#FFB37A', 0.5);
    warm.position.set(-9, 1.5, 5);
    rig.add(top, rim, warm);
    scene.add(new THREE.HemisphereLight('#203048', '#05080D', 0.6));
    const road = buildRoad();
    rig.add(road);
    return {scene, camera, rig, road, belt: hall.belt, shell: hall.shell};
  }, []);

  const {camera, belt} = set;
  set.shell.visible = walls > 0.5;
  belt.visible = walls > 0.5;
  showRoad(set.road, clamp(road));
  // the rolling road runs at the air's speed
  const bt = (belt.material as THREE.MeshStandardMaterial).map!;
  bt.repeat.set(6.4 / 3, 1);
  bt.offset.x = -(t * air * 1.6 / 3) % 1;
  // the camera: an orbit round what it looks at, drifting a little so a held frame is never frozen
  const a = (90 - yaw - Math.sin(t * 0.27) * 0.6) * DEG, e = (pitch + Math.sin(t * 0.19) * 0.3) * DEG;
  const j = clamp(shake) * dist * 0.01;
  const jx = j * (Math.sin(t * 61) * 0.6 + Math.sin(t * 97 + 1) * 0.4), jy = j * (Math.sin(t * 73 + 2) * 0.8 + Math.sin(t * 131) * 0.5);
  camera.fov = fov;
  camera.aspect = width / height;
  camera.position.set(tx + jx + Math.cos(a) * Math.cos(e) * dist, ty + jy + Math.sin(e) * dist, tz + Math.sin(a) * Math.cos(e) * dist);
  camera.lookAt(tx, ty, tz);
  camera.rotateZ(spin * DEG);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  set.scene.updateMatrixWorld();

  const v = new THREE.Vector3();
  const world: Tunnel = {
    scene: set.scene, rig: set.rig, camera, t, travel: 0,
    project: (x, y, z) => {
      v.set(x, y, z).applyMatrix4(set.rig.matrixWorld);
      const front = v.clone().applyMatrix4(camera.matrixWorldInverse).z < 0;
      v.project(camera);
      return {x: (v.x + 1) / 2 * width, y: (1 - v.y) / 2 * height, front};
    },
  };

  useLayoutEffect(() => {
    if (!canvas.current) return;
    if (!renderer.current) {
      const r = new THREE.WebGLRenderer({canvas: canvas.current, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance'});
      r.setPixelRatio(1);
      r.outputColorSpace = THREE.SRGBColorSpace;
      r.toneMapping = THREE.ACESFilmicToneMapping;
      r.toneMappingExposure = 1.05;
      const pm = new THREE.PMREMGenerator(r);
      set.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
      set.scene.environmentIntensity = 0.55;
      pm.dispose();   // the room's reflections: a studio, dimmed, so paint and glass have something to mirror
      renderer.current = r;
      // a soft bloom: what is bright (smoke, lamps, the pressure glow, arrows) bleeds a little light into the haze
      const composer = new EffectComposer(r);
      composer.setPixelRatio(1);
      composer.addPass(new RenderPass(set.scene, camera));
      const bloom = new UnrealBloomPass(new THREE.Vector2(width / 2, height / 2), glow, 0.4, 0.86);
      composer.addPass(bloom);
      composer.addPass(new OutputPass());
      post.current = {composer, bloom};
    }
    renderer.current.setSize(width, height, false);
    const p = post.current!;
    p.composer.setSize(width, height);
    p.bloom.strength = glow;
    if (glow > 0) p.composer.render(); else renderer.current.render(set.scene, camera);
  });
  useLayoutEffect(() => () => { post.current?.composer.dispose(); post.current = null; renderer.current?.dispose(); renderer.current?.forceContextLoss(); renderer.current = null; }, []);

  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden', background: HEX.bg}}>
      <canvas ref={canvas} width={width} height={height} style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}} />
      <div style={{position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(120% 90% at 50% 46%, transparent 52%, rgba(2, 4, 8, 0.72) 100%)'}} />
      <TunnelContext.Provider value={world}>{children}</TunnelContext.Provider>
    </div>
  );
}
