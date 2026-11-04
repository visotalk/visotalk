import React from 'react';
import {ChalkDefs, handLine, unit, type Pt} from './chalk.ts';
import {ChalkLine} from './line.tsx';
import {Chalked, measure} from './hand.ts';

export const meta = {
  name: {en: 'Board table', 'zh-CN': '板书表格'},
  purpose: 'compare',
  line: 'A table ruled by hand, filled column by column or row by row as it is worked out; two columns make a T-chart.',
  fits: 'a function\'s values; two things compared point by point; products against features',
  params: {
    rows: {type: 'text[][]', doc: 'the rows; the first cell of each (or, filled by row, the first row) names it; [x] chalks x pink, {x} yellow'},
    size: {type: 'px', default: 44, doc: 'the letters\' size; every column is as wide as its widest cell'},
    rule: {type: 'progress', default: 1, doc: '0 to 1: the rules chalked, with the names'},
    filled: {type: 'number', default: 99, doc: 'how many columns (or rows) after the names are filled so far, with fractions mid-way'},
    by: {type: 'column | row', default: 'column', doc: 'fill column by column (values worked out) or row by row (points made one after another)'},
    lines: {type: 'boolean', default: false, doc: 'a rule between every row, not only under the first'},
  },
  preview: 42.2,
};

export function BoardTable({rows, size = 44, rule = 1, filled = 99, by = 'column', lines = false}: {rows: string[][]; size?: number; rule?: number; filled?: number; by?: 'column' | 'row'; lines?: boolean}) {
  const rowH = Math.round(size * 1.7), cols = Math.max(...rows.map((r) => r.length)), pad = size * 0.55;
  // every column takes its widest cell, measured from the hand's own strokes, so a Chinese cell is never cut to a Latin width
  const widths = Array.from({length: cols}, (_, c) => Math.max(...rows.map((r) => (r[c] ? measure(r[c].replace(/[[\]{}]/g, ''), size).width : 0))) + pad * 2);
  const edges = widths.reduce((e, w) => [...e, e[e.length - 1] + w], [0]);
  const width = edges[cols], height = rows.length * rowH;
  const rules: Pt[][] = [
    handLine([edges[1], 4], [edges[1], height - 4], 'table-v', 0.004),
    ...rows.slice(1).map((_, i) => i === 0 || lines ? handLine([0, (i + 1) * rowH], [width, (i + 1) * rowH], `table-h${i}`, 0.004) : null).filter((l): l is Pt[] => !!l),
  ];
  return (
    <div style={{position: 'relative', width, height}}>
      <ChalkDefs />
      <ChalkLine width={width} height={height} weight={5} draw={rule} strokes={rules} />
      {rows.flatMap((row, r) => row.map((text, c) => {
        // the first column (or row) is written with the rules; the rest one column (or row) at a time
        const k = by === 'column' ? c : r, shown = k === 0 ? unit(rule * 2) : unit(filled - (k - 1));
        if (!text || shown <= 0) return null;
        const w = measure(text.replace(/[[\]{}]/g, ''), size).width;
        return (
          <Chalked key={`${r}-${c}`} pieces={[{text, size}]} write={shown} seed={`table/${r}/${c}/${text}`}
            style={{position: 'absolute', top: r * rowH + (rowH - size * 1.32) / 2, left: c === 0 ? edges[c] + pad : edges[c] + (widths[c] - w) / 2}} />
        );
      }))}
    </div>
  );
}
