import React from 'react';
import {ChalkDefs, unit} from './chalk.ts';
import {Mark} from './write.tsx';
import {Chalked, measure, type Piece} from './hand.ts';

export const meta = {
  name: {en: 'Working', 'zh-CN': '板演'},
  purpose: 'steps',
  line: 'Working chalked line under line, equals signs in one column, a reason in blue, the last line yellow and boxed.',
  fits: 'a formula worked with numbers; an equation solved; a list of steps or rules',
  params: {
    lines: {type: 'text[]', doc: 'the lines; a line that starts with = continues the one above; [x] is what is substituted (pink), {x} yellow; " | why" adds a reason in blue'},
    write: {type: 'number', default: 99, doc: 'how many lines are written so far, with fractions mid-line: tween 0 to 1, then to 2, on each line\'s word'},
    size: {type: 'px', default: 64, doc: 'the letters\' size'},
    column: {type: 'px', default: 0, doc: 'where the equals signs line up, from the left; 0 writes each line from the left edge'},
    box: {type: 'progress', default: 0, doc: '0 to 1: how much of the box round the last line is chalked'},
    result: {type: 'boolean', default: true, doc: 'the last line is the result, in yellow; false keeps every line white (a list of steps or rules)'},
  },
  preview: 18.7,
};

/** `a² + b² = c²  | why` → the left side, the right side (with its equals sign), and the reason */
function split(line: string) {
  const [body, why] = line.split(' | ');
  const i = body.indexOf('=');
  return i < 0 ? {lhs: body, rhs: '', why} : {lhs: body.slice(0, i).trimEnd(), rhs: body.slice(i), why};
}

export function Working({lines, write = 99, size = 64, column = 0, box = 0, result = true}: {lines: string[]; write?: number; size?: number; column?: number; box?: number; result?: boolean}) {
  const rowH = size * 1.32, gap = size * 0.3, small = size * 0.58;
  return (
    <div style={{position: 'relative', padding: '16px 44px'}}>
      <ChalkDefs />
      {lines.map((line, i) => {
        const last = result && i === lines.length - 1, shown = unit(write - i), {lhs, rhs, why} = split(line);
        const chalk = last ? 'yellow' : 'white';
        // every width is known from the hand's strokes: the left side ends at the column, the equals sign starts after it
        const lw = lhs ? measure(lhs, size).width : 0, lx = column ? column - lw : 0;
        const rx = (column || lw) + (lhs || column ? size * 0.28 : 0), r = rhs.replace(/^=\s*/, '= ');
        const end = (rhs ? rx + measure(r, size).width : lx + lw) + size * 0.12;
        const pieces: Piece[] = [
          ...(lhs ? [{text: lhs, x: lx, size, chalk} as Piece] : []),
          ...(rhs ? [{text: r, x: rx, size, chalk} as Piece] : []),
          ...(why ? [{text: why, x: end + size * 1.1, y: size * 0.92 - small * 0.92, size: small, chalk: 'blue'} as Piece] : []),
        ];
        return (
          <div key={i} style={{position: 'relative', height: rowH, marginBottom: gap, marginTop: last && i > 0 ? size * 0.2 : 0}}>
            {shown > 0 && <Chalked pieces={pieces} write={shown} seed={`working/${i}/${line}`} />}
            {last && box > 0 && (
              <div style={{position: 'absolute', top: 0, height: rowH, left: (lhs ? lx : rx) - size * 0.12, width: end - (lhs ? lx : rx) + size * 0.12}}>
                <Mark kind="box" progress={box} chalk="yellow" weight={Math.max(5, size / 11)} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
