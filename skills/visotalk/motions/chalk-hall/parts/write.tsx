import React from 'react';
import {CHALK, ChalkDefs, unit, type Chalk} from './chalk.ts';
import {Chalked} from './hand.ts';

export type MarkKind = 'underline' | 'box' | 'circle' | 'tick' | 'cross';

/**
 * A mark chalked round or under whatever it sits on, as a hand makes it: an underline left to right, a box side by side,
 * a loop round from the left, a tick or a cross over it. Coordinates are fractions of the thing marked, so it fits any word.
 */
export function Mark({kind, progress, chalk = 'yellow', weight = 6}: {kind: MarkKind; progress: number; chalk?: Chalk; weight?: number}) {
  if (progress <= 0) return null;
  const color = CHALK[chalk], p = unit(progress);
  const line = {stroke: color, strokeWidth: weight, strokeLinecap: 'round' as const, strokeOpacity: 0.95};
  const pct = (v: number) => `${(v * 100).toFixed(2)}%`;
  if (kind === 'underline') {
    const x = -0.02 + 1.06 * p;
    return (
      <svg style={{position: 'absolute', left: 0, right: 0, top: '100%', height: 26, width: '100%', overflow: 'visible'}}>
        <g filter="url(#chalk-grain-mark)"><line x1="0" y1="45%" x2={pct(x)} y2={pct(0.45 - 0.25 * p)} {...line} /></g>
      </svg>
    );
  }
  if (kind === 'box') {
    // top, right, bottom, left, each a little past its corner
    const sides: [number, number, number, number][] = [[-0.01, 0, 1.015, 0.01], [1, -0.03, 0.995, 1.04], [1.01, 1, -0.015, 0.985], [0, 1.03, 0.005, -0.04]];
    let tip: [number, number] = [0, 0];
    const drawn = sides.map(([x1, y1, x2, y2], i) => {
      const t = unit(p * 4 - i);
      if (t <= 0) return null;
      const x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t;
      tip = [x, y];
      return <line key={i} x1={pct(x1)} y1={pct(y1)} x2={pct(x)} y2={pct(y)} {...line} />;
    });
    return (
      <svg style={{position: 'absolute', left: -22, right: -22, top: -10, bottom: -10, width: 'calc(100% + 44px)', height: 'calc(100% + 20px)', overflow: 'visible'}}>
        <g filter="url(#chalk-grain-mark)">{drawn}</g>
      </svg>
    );
  }
  if (kind === 'tick' || kind === 'cross') {
    // a tick is one stroke down then up; a cross is two strokes, each taking half the time
    const strokes: [number, number][][] = kind === 'tick' ? [[[0.02, 0.55], [0.36, 0.96], [1, 0.02]]] : [[[0.04, 0.02], [0.98, 0.98]], [[0.96, 0.04], [0.02, 0.96]]];
    const segs = strokes.flatMap((st) => st.slice(1).map((q, i) => [st[i], q] as [[number, number], [number, number]]));
    const lens = segs.map(([a, b]) => Math.hypot(b[0] - a[0], b[1] - a[1])), total = lens.reduce((a, b) => a + b, 0);
    let left = p * total, tip: [number, number] = segs[0][0];
    const drawn = segs.map(([a, b], i) => {
      if (left <= 0) return null;
      const t = Math.min(1, left / lens[i]); left -= lens[i];
      tip = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      return <line key={i} x1={pct(a[0])} y1={pct(a[1])} x2={pct(tip[0])} y2={pct(tip[1])} {...line} />;
    });
    return (
      <svg style={{position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', overflow: 'visible'}}>
        <g filter="url(#chalk-grain-mark)">{drawn}</g>
      </svg>
    );
  }
  const a0 = Math.PI * 0.92, a = a0 + (Math.PI * 2 + 0.35) * p;
  const pts = Array.from({length: 61}, (_, i) => {
    const t = a0 + ((a - a0) * i) / 60, w = 1 + 0.03 * Math.sin(t * 2);
    return [0.5 + Math.cos(t) * 0.5 * w, 0.5 + Math.sin(t) * 0.5 * w];
  });
  return (
    <svg style={{position: 'absolute', left: -34, right: -34, top: -16, bottom: -16, width: 'calc(100% + 68px)', height: 'calc(100% + 32px)', overflow: 'visible'}}>
      <g filter="url(#chalk-grain-mark)">{pts.slice(1).map((q, i) => <line key={i} x1={pct(pts[i][0])} y1={pct(pts[i][1])} x2={pct(q[0])} y2={pct(q[1])} {...line} />)}</g>
    </svg>
  );
}

export const meta = {
  name: {en: 'Chalk word', 'zh-CN': '板书字'},
  purpose: 'term',
  line: 'A word, label, figure or short quote chalked on the word that names it, marked when it matters.',
  fits: 'a part\'s name on a diagram; a key term; the deciding word; a big number',
  params: {
    text: {type: 'text', doc: 'a few words; [x] chalks x pink, {x} yellow'},
    write: {type: 'progress', default: 1, doc: '0 to 1: how much is written, stroke by stroke in the order a hand writes'},
    size: {type: 'px', default: 56, doc: 'the letters\' size'},
    chalk: {type: 'white | yellow | pink | blue | faded', default: 'white', doc: 'which chalk, by what it means'},
    mark: {type: 'underline | box | circle | tick | cross | none', default: 'none', doc: 'how it is marked'},
    marked: {type: 'progress', default: 0, doc: '0 to 1: how much of the mark is chalked'},
    markChalk: {type: 'white | yellow | pink | blue', default: 'yellow', doc: 'the mark\'s chalk'},
    tilt: {type: 'degrees', default: 0, doc: 'how far it leans'},
    width: {type: 'px', default: 0, doc: 'wrap within this width (a quote, a definition); 0 keeps one line'},
  },
  preview: 10.1,
};

export function ChalkWord({text, write = 1, size = 56, chalk = 'white', mark = 'none', marked: m = 0, markChalk = 'yellow', tilt = 0, width = 0}: {text: string; write?: number; size?: number; chalk?: Chalk; mark?: MarkKind | 'none'; marked?: number; markChalk?: Chalk; tilt?: number; width?: number}) {
  return (
    <div style={{position: 'relative', display: 'inline-block', transform: tilt ? `rotate(${tilt}deg)` : undefined, transformOrigin: 'left center'}}>
      <ChalkDefs />
      <Chalked pieces={[{text, size, chalk}]} write={unit(write)} width={width} />
      {mark !== 'none' && <Mark kind={mark} progress={m} chalk={markChalk} weight={Math.max(4, size / 10)} />}
    </div>
  );
}
