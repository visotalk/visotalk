/**
 * graph: layered layout (longest path), value nodes as cards with field rows, op nodes as circles, cubic edges.
 * Motions: drawIn (layer by layer, edges after their source), flow (pulse along an edge, `direction: backward`),
 * appear/stamp/countUp on nodes and fields, morph (`params.to: [x, y]`, the manual-layout position in 0..1) to move a node and its edges. Fields targeted by an active `change` interaction are scrubbable.
 */
import React, {useMemo} from 'react';
import {motionProgress, motionStart, propsAt, resolveValue, viewOwn, type GraphObject, type TAction, type Compiled} from '@visotalk/ir';
import {useDocTime} from '../../react';
import {clamp01, easeInOutCubic, easeOutCubic} from '../../motion';
import {useIR, usePathView, useScope} from '../context';
import {C, F, alpha} from '../../theme';
import type {Box} from '../patterns';
import {FieldRow, ROW_H} from './Field';
import type {PrimitiveProps} from './common';

const NODE_W = 300, HEAD_H = 58, OP_D = 96, NEURON_R = 13;

function layoutGraph(g: GraphObject, box: Box) {
  const layer: Record<string, number> = {};
  const incoming = (id: string) => g.edges.filter((e) => e.to === id).map((e) => e.from);
  const depth = (id: string, seen = new Set<string>()): number => {
    if (layer[id] !== undefined) return layer[id];
    if (seen.has(id)) return 0;
    seen.add(id);
    const ins = incoming(id);
    return (layer[id] = ins.length ? 1 + Math.max(...ins.map((i) => depth(i, seen))) : 0);
  };
  g.nodes.forEach((n) => depth(n.id));
  const nL = Math.max(...Object.values(layer)) + 1;
  const pos: Record<string, {cx: number; cy: number; w: number; h: number; layer: number}> = {};
  const vertical = g.direction === 'tb';
  for (let L = 0; L < nL; L++) {
    const ns = g.nodes.filter((n) => layer[n.id] === L);
    ns.forEach((n, i) => {
      const op = n.kind === 'op';
      const neuron = n.kind === 'neuron';
      const k = Number(g.nodeScale ?? 1);
      const h = neuron ? NEURON_R * 2 : op ? OP_D * k : HEAD_H * k + (n.fields?.length ?? 0) * ROW_H;
      const manual = g.layout === 'manual' ? g.positions?.[n.id] : undefined;
      const w = neuron ? NEURON_R * 2 : op ? OP_D * k : Number(g.nodeWidth ?? NODE_W * k);
      // manual positions place node centres in the box shrunk by half the node, so nodes stay inside the box
      const cx = manual ? box.x + w / 2 + manual[0] * (box.w - w) : vertical ? box.x + ((i + 0.5) * box.w) / ns.length : box.x + ((L + 0.5) * box.w) / nL;
      const cy = manual ? box.y + h / 2 + manual[1] * (box.h - h) : vertical ? box.y + ((L + 0.5) * box.h) / nL : box.y + ((i + 0.5) * box.h) / ns.length;
      pos[n.id] = {cx, cy, w, h, layer: L};
    });
  }
  return {pos, nL};
}

/** Node centres at time t: each `morph` with `params.to` carries the node, in order, to that position over its duration */
function movedNodes(laid: ReturnType<typeof layoutGraph>['pos'], g: GraphObject, box: Box, c: Compiled, id: string, t: number) {
  const out = {...laid};
  for (const n of g.nodes) {
    const path = `${id}#${n.id}`;
    const moves = c.actions.filter((a) => a.path === path && a.motion === 'morph' && Array.isArray(a.params.to) && a.start <= t).sort((a, b) => a.start - b.start);
    if (!moves.length) continue;
    let {cx, cy} = laid[n.id];
    const {w, h} = laid[n.id];
    for (const m of moves) {
      const [x, y] = m.params.to as [number, number];
      const k = easeInOutCubic(clamp01(m.dur > 0 ? (t - m.start) / m.dur : 1));
      cx += (box.x + w / 2 + x * (box.w - w) - cx) * k;
      cy += (box.y + h / 2 + y * (box.h - h) - cy) * k;
    }
    out[n.id] = {...laid[n.id], cx, cy};
  }
  return out;
}

/** Presence of a sub-path (plain function, safe inside loops) */
const presenceOf = (c: Compiled, path: string, t: number) => viewOwn(c, path, t).presence;

const flowOf = (c: Compiled, path: string, t: number): {p: number; a: TAction} | null => {
  const a = c.actions.find((x) => x.path === path && x.motion === 'flow' && t >= x.start);
  return a ? {p: (t - a.start) / a.dur, a} : null;
};

export const Graph: React.FC<PrimitiveProps<GraphObject>> = ({id, o, box}) => {
  const {c} = useIR();
  const t = useDocTime();
  const scope = useScope();
  const gv = usePathView(id);
  const {pos: laid, nL} = useMemo(() => layoutGraph(o, box), [o, box]);
  const pos = useMemo(() => movedNodes(laid, o, box, c, id, t), [laid, o, box, c, id, t]);
  const draw = gv.entrance === 'drawIn' ? gv.entranceProgress ?? 1 : gv.presence > 0 ? 1 : 0;
  const layerP = (L: number) => clamp01((draw * (nL + 0.5) - L) * 1.5);
  const many = o.edges.length > 40;
  /** persistent highlight ("lit") once a highlight action on the path has started */
  const lit = (path: string) =>
    c.actions.some((a) => a.path === path && a.motion === 'highlight' && t >= a.start && (a.params.hold === true || t < a.start + a.dur));

  return (
    <div data-path={id} style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
      <svg width="100%" height="100%" style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        {o.edges.map((e) => {
          const a = pos[e.from], b = pos[e.to];
          const vertical = o.direction === 'tb';
          const x0 = vertical ? a.cx : a.cx + a.w / 2, y0 = vertical ? a.cy + a.h / 2 : a.cy;
          const x1 = vertical ? b.cx : b.cx - b.w / 2, y1 = vertical ? b.cy - b.h / 2 : b.cy;
          const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
          const d = vertical ? `M${x0},${y0} C${x0},${my} ${x1},${my} ${x1},${y1}` : `M${x0},${y0} C${mx},${y0} ${mx},${y1} ${x1},${y1}`;
          const own = motionProgress(c, `${id}#${e.id}`, 'drawIn', t);
          const ownStart = motionStart(c, `${id}#${e.id}`, 'drawIn');
          const p = ownStart !== undefined ? (own ?? 0) : clamp01((draw * (nL + 0.5) - a.layer - 0.6) * 1.5);
          const len = Math.hypot(x1 - x0, y1 - y0) * 1.2;
          const path = `${id}#${e.id}`;
          const ev = presenceOf(c, path, t);
          const flow = flowOf(c, path, t);
          const back = flow?.a.params.direction === 'backward';
          const fp = flow ? clamp01(flow.p) : 0;
          const u = back ? 1 - easeInOutCubic(fp) : easeInOutCubic(fp);
          const cp = vertical ? [x0, y0, x0, my, x1, my, x1, y1] : [x0, y0, mx, y0, mx, y1, x1, y1];
          const bez = (q0: number, q1: number, q2: number, q3: number) => (1 - u) ** 3 * q0 + 3 * (1 - u) ** 2 * u * q1 + 3 * (1 - u) * u ** 2 * q2 + u ** 3 * q3;
          const hot = lit(path);
          const colour = hot || (flow && back) ? C.grad : flow ? C.data : C.faint;
          const ang = vertical ? Math.PI / 2 : Math.atan2(y1 - (vertical ? my : y1), x1 - (vertical ? x1 : mx)) || 0;
          return (
            <g key={e.id} data-path={path} opacity={ev * (many && !hot ? 0.55 : 1)}>
              <path d={d} fill="none" style={{stroke: colour}} strokeWidth={many ? (hot ? 4 : 1) : flow || hot ? 4 : 3} strokeDasharray={len} strokeDashoffset={len * (1 - p)} />
              {!many && p > 0.95 && (
                <polygon style={{fill: colour}} points={`${x1},${y1} ${x1 - 16 * Math.cos(ang - 0.4)},${y1 - 16 * Math.sin(ang - 0.4)} ${x1 - 16 * Math.cos(ang + 0.4)},${y1 - 16 * Math.sin(ang + 0.4)}`} />
              )}
              {e.label && p > 0.9 && <text x={mx} y={my - 12} style={{fill: C.muted, fontFamily: F.mono}} fontSize={22} textAnchor="middle">{e.label}</text>}
              {flow && flow.p >= 0 && flow.p <= 1 && <circle cx={bez(cp[0], cp[2], cp[4], cp[6])} cy={bez(cp[1], cp[3], cp[5], cp[7])} r={11} style={{fill: colour}} />}
            </g>
          );
        })}
      </svg>
      {o.nodes.map((n) => {
        const k = Number(o.nodeScale ?? 1);
        const p = pos[n.id];
        const path = `${id}#${n.id}`;
        const nv = presenceOf(c, path, t);
        const presence = Math.min(nv, layerP(p.layer));
        const on = lit(path);
        const badge = propsAt(c, path, t).badge as number | string | undefined;
        const badgeP = badge !== undefined ? clamp01((t - (c.actions.find((a) => a.path === path && a.motion === 'set' && a.params.props && 'badge' in (a.params.props as object))?.start ?? 0)) / 0.3) : 0;
        const badgeEl = badge !== undefined ? (
          <div style={{position: 'absolute', right: -18, top: -18, width: 44, height: 44, borderRadius: 22, background: C.op, color: C.bg, fontFamily: F.mono, fontSize: 24,
            fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: badgeP, transform: `scale(${badgeP})`}}>{badge}</div>
        ) : null;
        const common: React.CSSProperties = {position: 'absolute', left: p.cx - p.w / 2, top: p.cy - p.h / 2, width: p.w, height: p.h,
          opacity: presence, visibility: presence > 0 ? 'visible' : 'hidden', transform: `translateY(${(1 - easeOutCubic(presence)) * 14}px)`, pointerEvents: 'auto'};
        if (n.kind === 'neuron') {
          const col = p.layer === 0 ? C.data : p.layer === nL - 1 ? C.grad : C.op;
          const r = on ? 18 : NEURON_R;
          return (
            <div key={n.id} data-path={path} style={{...common, left: p.cx - r, top: p.cy - r, width: r * 2, height: r * 2, borderRadius: '50%', boxSizing: 'border-box',
              background: on ? C.grad : C.panel2, border: `3px solid ${col}`}} />
          );
        }
        if (n.kind === 'op') {
          return (
            <div key={n.id} data-path={path} style={{...common, borderRadius: '50%', background: C.bg, border: `3px solid ${on ? C.grad : C.op}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.mono, fontSize: 46 * k, fontWeight: 700, color: on ? C.grad : C.op}}>
              {String(resolveValue(n.label, scope))}
            </div>
          );
        }
        return (
          <div key={n.id} data-path={path} style={{...common, background: C.panel2, border: `2px solid ${on ? C.grad : C.border}`, borderRadius: 14, overflow: 'visible',
            boxShadow: on ? `0 0 40px ${alpha(C.grad, 0.533)}` : 'none'}}>
            {badgeEl}
            <div style={{height: HEAD_H * k, display: 'flex', alignItems: 'center', padding: `0 ${20 * k}px`, fontFamily: F.mono, fontSize: 32 * k, fontWeight: 700, color: C.text}}>
              {String(resolveValue(n.label, scope))}
            </div>
            {(n.fields ?? []).map((f) => <FieldRow key={f.id} path={`${path}.${f.id}`} field={f} tone={f.id === 'grad' ? 'grad' : 'data'} />)}
          </div>
        );
      })}
    </div>
  );
};
