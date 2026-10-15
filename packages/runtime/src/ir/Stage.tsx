/**
 * IR stage: scenes as time windows; per scene, pattern layouts that change between beats (objects move by identity),
 * primitives looked up by object type, L1 overrides, and captions (live templates in the player).
 */
import React, {useMemo} from 'react';
import {anchorTime, evaluate, propsAt, scenePatterns, snap, wordTime, type Anchor, type Compiled, type ObjectDef, type Override, type TBeat, type VisoDoc} from '@visotalk/ir';
import {Scene, useDocTime, useRuntime} from '../react';
import {clamp01, easeInOutCubic} from '../motion';
import {compilePattern, lerpBox, type Box} from './patterns';
import {useIR, useScope} from './context';
import {frameStyle} from './frame';
import {view} from '@visotalk/ir';
import {PRIMITIVES} from './primitives';
import {lookPanel} from './primitives/common';
import {shapeBox} from './primitives/Shape';
import {C, F} from '../theme';

const MORPH = 0.6;

interface LayoutKey {
  t: number;
  boxes: Record<string, Box>;
  /** The objects the effective pattern places from t on (boxes also keeps earlier ones, for the morph) */
  placed: Set<string>;
}

function sceneLayouts(doc: VisoDoc, c: Compiled, sceneId: string, canvas: {width: number; height: number}): LayoutKey[] {
  const scene = doc.scenes.find((s) => s.id === sceneId)!;
  const sc = c.scenes.find((s) => s.id === sceneId)!;
  const keys: LayoutKey[] = [];
  const patterns = scenePatterns(scene);
  let current: Record<string, Box> = patterns.start ? compilePattern(patterns.start, canvas) : {};
  const placedBy = (p: typeof patterns.start) => new Set(Object.values(p?.slots ?? {}).flat());
  keys.push({t: sc.from, boxes: current, placed: placedBy(patterns.start)});
  scene.beats.forEach((b, i) => {
    const eff = patterns.beats[i];
    if (!b.pattern || !eff) return;
    current = {...current, ...compilePattern(eff, canvas)};
    keys.push({t: sc.beats[i].from, boxes: current, placed: placedBy(eff)});
  });
  return keys;
}

/**
 * An object is on screen only while a pattern places it: not before the beat that first places it, and not after the
 * beat that drops it from its slots, unless an explicit `disappear` in the scene ends it (that action then decides).
 */
function isPlaced(keys: LayoutKey[], c: Compiled, oid: string, t: number): boolean {
  let i = 0;
  while (i + 1 < keys.length && keys[i + 1].t <= t) i++;
  if (keys[i].placed.has(oid)) return true;
  const first = keys.findIndex((k) => k.placed.has(oid));
  if (first > i || first < 0) return false;
  return c.actions.some((a) => a.path === oid && a.motion === 'disappear');
}

function layoutAt(keys: LayoutKey[], t: number): Record<string, Box> {
  let i = 0;
  while (i + 1 < keys.length && keys[i + 1].t <= t) i++;
  const cur = keys[i];
  const prev = keys[i - 1];
  if (!prev || t >= cur.t + MORPH) return cur.boxes;
  const p = easeInOutCubic(clamp01((t - cur.t) / MORPH));
  const out: Record<string, Box> = {};
  for (const [id, b] of Object.entries(cur.boxes)) out[id] = prev.boxes[id] ? lerpBox(prev.boxes[id], b, p) : b;
  return out;
}

/** Override keys → absolute times, then piecewise interpolation per (target, prop) */
function overrideTimes(c: Compiled, ov: Override): Array<{t: number; v: number}> {
  const beats = c.scenes.flatMap((s) => s.beats);
  return ov.keys
    .map((k) => {
      const a = k.at as Anchor;
      let t = 0;
      if ('beat' in a) {
        const b: TBeat | undefined = a.ref ? beats.find((x) => `${x.scene}/${x.id}` === a.ref) : beats[0];
        t = b ? snap(c.fps, anchorTime(b, a, beats)) : 0;
      } else {
        const line = beats.flatMap((b) => b.lines).find((l) => l.id === a.line);
        t = line ? wordTime(line, a.word, a.edge ?? 'start') + (a.offset ?? 0) : 0;
      }
      return {t, v: Number(k.value)};
    })
    .sort((a, b) => a.t - b.t);
}

function applyOverrides(box: Box, objectId: string, overrides: Array<Override & {times: Array<{t: number; v: number}>}>, preset: string, t: number): Box {
  const out = {...box};
  for (const o of overrides) {
    if (o.target !== objectId || (o.preset && o.preset !== preset)) continue;
    const ks = o.times;
    let v = ks[0].v;
    for (let i = 0; i < ks.length; i++) {
      if (t >= ks[i].t) v = ks[i].v;
      if (i + 1 < ks.length && t >= ks[i].t && t < ks[i + 1].t) {
        v = ks[i].v + (ks[i + 1].v - ks[i].v) * easeInOutCubic((t - ks[i].t) / (ks[i + 1].t - ks[i].t));
      }
    }
    if (o.prop === 'x' || o.prop === 'y' || o.prop === 'w' || o.prop === 'h') out[o.prop] = v;
  }
  return out;
}

const SceneBody: React.FC<{sceneId: string}> = ({sceneId}) => {
  const {doc, c, preset} = useIR();
  const rt = useRuntime();
  const t = useDocTime();
  const keys = useMemo(() => sceneLayouts(doc, c, sceneId, {width: rt.width, height: rt.height}), [doc, c, sceneId, rt.width, rt.height]);
  const overrides = useMemo(() => (doc.overrides ?? []).map((o) => ({...o, times: overrideTimes(c, o)})), [doc, c]);
  const boxes = layoutAt(keys, t);
  const ids = useMemo(() => [...new Set(keys.flatMap((k) => Object.keys(k.boxes)))], [keys]);
  const frame = (oid: string, natural?: Box) => {
    const def: ObjectDef | undefined = doc.objects[oid];
    if (!def) return null;
    const o = {...def, ...propsAt(c, oid, t, def as unknown as Record<string, unknown>)} as ObjectDef; // `set` and state `props` change any property over time
    const box = boxes[oid] ?? keys.map((k) => k.boxes[oid]).find(Boolean)!;
    const Prim = PRIMITIVES[o.type] as React.FC<{id: string; o: ObjectDef; box: Box}> | undefined;
    // a shape is drawn at its own place on the canvas: the slot only decides when it is there
    const b = o.type === 'shape' ? shapeBox(o, {w: rt.width, h: rt.height}) : applyOverrides(box, oid, overrides, preset, t);
    const v = view(c, oid, t);
    let style = frameStyle(c, oid, t, b, boxes, isPlaced(keys, c, oid, t) ? v : {...v, presence: 0});
    let inner: Box = {x: 0, y: 0, w: b.w, h: b.h};
    if (natural) {
      // flow row member: the flex row positions it; keep motion styles, drop the absolute box
      const {position: _p, left: _l, top: _t, width: _w, height: _h, ...motion} = style;
      style = {...motion, position: 'relative', flex: '0 0 auto', height: natural.h, display: 'flex', alignItems: 'center'};
      inner = {x: 0, y: 0, w: natural.w, h: natural.h, natural: true};
    }
    // `scale`: the object is laid out in the slot divided by the factor and drawn zoomed back up, so its text and parts grow inside the same slot
    const k = !natural && Number.isFinite(o.scale) && o.scale! > 0 ? o.scale! : 1;
    if (k !== 1) inner = {x: 0, y: 0, w: b.w / k, h: b.h / k};
    const body = Prim ? <Prim id={oid} o={o} box={inner} {...(o.type === 'shape' ? {origin: {x: b.x, y: b.y}} : {})} /> : <div style={{color: C.muted}}>[{o.type}]</div>;
    return (
      <div key={oid} data-object={oid} style={{...style, ...(o.type === 'shape' ? {} : lookPanel(o.look))}}>
        {k === 1 ? body : <div style={{position: 'absolute', left: 0, top: 0, width: inner.w, height: inner.h, zoom: k}}>{body}</div>}
      </div>
    );
  };
  // flow rows: group members by slot, in slot order
  const flows = new Map<string, {info: NonNullable<Box['flow']>; ids: string[]}>();
  const loose: string[] = [];
  for (const oid of ids) {
    const f = boxes[oid]?.flow;
    if (!f) loose.push(oid);
    else (flows.get(f.group) ?? flows.set(f.group, {info: f, ids: []}).get(f.group)!).ids.push(oid);
  }
  const justify = {start: 'flex-start', center: 'center', end: 'flex-end'} as const;
  return (
    <div style={{position: 'absolute', inset: 0, background: C.bg, overflow: 'hidden'}}>
      {loose.map((oid) => frame(oid))}
      {[...flows].map(([g, {info, ids: members}]) => (
        <div key={`flow:${g}`} data-flow={g} style={{position: 'absolute', left: info.region.x, top: info.region.y, width: info.region.w, height: info.region.h,
          display: 'flex', alignItems: 'center', justifyContent: justify[info.align], gap: info.gap}}>
          {members.map((oid) => frame(oid, info.region))}
        </div>
      ))}
      <Captions sceneId={sceneId} />
    </div>
  );
};

const Captions: React.FC<{sceneId: string}> = ({sceneId}) => {
  const {c, doc, live} = useIR();
  const scope = useScope();
  const t = useDocTime();
  const mode = doc.exports?.captions ?? 'burned';
  if (!live && (mode === 'none' || mode === 'sidecar')) return null;
  const sc = c.scenes.find((s) => s.id === sceneId)!;
  const line = sc.beats.flatMap((b) => b.lines).find((l) => t >= l.from && t < l.from + l.duration + 0.2);
  if (!line) return null;
  const o = clamp01((t - line.from) / 0.2) * (1 - clamp01((t - line.from - line.duration) / 0.2));
  let text = line.text;
  if (live && line.live) {
    text = line.live.replace(/\{([^}]+)\}/g, (_, e: string) => {
      try {
        return String(evaluate(e, scope));
      } catch {
        return `{${e}}`;
      }
    });
  }
  return (
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 54, display: 'flex', justifyContent: 'center', opacity: o}}>
      <div data-caption={line.id} style={{maxWidth: 1500, textAlign: 'center', fontFamily: F.sans, fontSize: 34, lineHeight: 1.35, color: C.text,
        background: 'rgba(11,14,20,0.82)', padding: '10px 26px', borderRadius: 10}}>
        {text}
      </div>
    </div>
  );
};

/** All scenes of a compiled IR document */
export const IRStage: React.FC = () => {
  const {c} = useIR();
  return (
    <>
      {c.scenes.map((s) => (
        <Scene key={s.id} from={s.from} duration={s.duration} end={s.end}>
          <SceneBody sceneId={s.id} />
        </Scene>
      ))}
    </>
  );
};
