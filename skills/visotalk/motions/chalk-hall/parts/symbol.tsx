import React from 'react';
import {ChalkDefs, handCircle, handLine, handShape, type Chalk, type Pt, type Stroke} from './chalk.ts';
import {ChalkLine} from './line.tsx';
import {Chalked} from './hand.ts';

export const meta = {
  name: {en: 'Board symbol', 'zh-CN': '图形符号'},
  purpose: 'mark',
  line: 'A textbook symbol chalked into a diagram: a right angle, a resistor, a cell, a lamp, a switch, a meter, a node, equal sides.',
  fits: 'a circuit built piece by piece; a right angle on a triangle; a junction',
  params: {
    kind: {type: 'right-angle | resistor | cell | lamp | switch | meter | node | equal', doc: 'which symbol'},
    at: {type: '[x, y]', doc: 'its centre in px inside the box (a right angle\'s corner)'},
    size: {type: 'px', default: 80, doc: 'its length along the wire, or a right angle\'s side'},
    rotate: {type: 'degrees', default: 0, doc: 'its turn: 0 lies along a horizontal wire; a right angle opens right and up at 0'},
    letter: {type: 'text', default: '', doc: 'the letter in a meter (A, V)'},
    open: {type: 'progress', default: 0, doc: 'a switch: 1 is open, 0 closed; tween it to close the circuit on the word'},
    draw: {type: 'progress', default: 1, doc: '0 to 1: how much of it is chalked'},
    chalk: {type: 'white | yellow | pink | blue', default: 'white', doc: 'which chalk'},
    width: {type: 'px', doc: 'the box\'s width'},
    height: {type: 'px', doc: 'the box\'s height'},
  },
  preview: 3.1,
};

export type SymbolKind = 'right-angle' | 'resistor' | 'cell' | 'lamp' | 'switch' | 'meter' | 'node' | 'equal';

/** The symbol's strokes around (0, 0), lying along x, `s` long */
function shape(kind: SymbolKind, s: number, open: number): Stroke[] {
  const h = s / 2;
  switch (kind) {
    case 'right-angle': return [[[0, -s], [s, -s], [s, 0]]];
    case 'resistor': return [handShape([[-h, -s * 0.2], [h, -s * 0.2], [h, s * 0.2], [-h, s * 0.2]], 'resistor')];
    case 'cell': return [handLine([-s * 0.12, -s * 0.42], [-s * 0.12, s * 0.42], 'cell-long', 0.004), handLine([s * 0.12, -s * 0.2], [s * 0.12, s * 0.2], 'cell-short', 0.004)];
    case 'lamp': {
      const r = s * 0.32, k = r * 0.7;
      return [handCircle([0, 0], r), [[-k, -k], [k, k]], [[-k, k], [k, -k]]];
    }
    case 'switch': {
      const a = 0.06 + 0.36 * open;
      return [[[-h, 0], [-h + s * 0.98 * Math.cos(a), -s * 0.98 * Math.sin(a)]], handCircle([-h, 0], 4, 0, 0.2), handCircle([h, 0], 4, 0, 0.2)];
    }
    case 'meter': return [handCircle([0, 0], s * 0.38)];
    case 'node': return [handCircle([0, 0], 4, 0, 0.3), handCircle([0, 0], 1.5, 0, 0.3)];
    case 'equal': return [[[-s * 0.12, -s * 0.2], [-s * 0.12, s * 0.2]], [[s * 0.12, -s * 0.2], [s * 0.12, s * 0.2]]];
  }
}

export function BoardSymbol({kind, at, size = 80, rotate = 0, letter = '', open = 0, draw = 1, chalk = 'white', width, height}: {kind: SymbolKind; at: Pt; size?: number; rotate?: number; letter?: string; open?: number; draw?: number; chalk?: Chalk; width: number; height: number}) {
  const a = (rotate * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  const strokes = shape(kind, size, open).map((st) => st.map(([x, y]) => [at[0] + x * c - y * s, at[1] + x * s + y * c] as Pt));
  return (
    <>
      <ChalkDefs />
      {/* a cell's plates and a lamp's body read best a little heavier than the wire */}
      <ChalkLine width={width} height={height} strokes={strokes} draw={draw} chalk={chalk} weight={kind === 'right-angle' || kind === 'equal' ? 5 : kind === 'cell' ? 9 : 7} />
      {kind === 'meter' && letter && draw >= 1 && (
        <Chalked pieces={[{text: letter, size: size * 0.55, chalk}]} style={{position: 'absolute', left: at[0], top: at[1], transform: 'translate(-50%, -58%)'}} />
      )}
    </>
  );
}
