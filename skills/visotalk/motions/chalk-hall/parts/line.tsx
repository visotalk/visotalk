import React from 'react';
import {CHALK, ChalkDefs, partial, strokeGrain, unit, type Chalk, type Pt, type Stroke} from './chalk.ts';

export const meta = {
  name: {en: 'Chalk line', 'zh-CN': '粉笔线'},
  purpose: 'steps',
  line: 'Any line or shape chalked as the narration describes it, stroke after stroke, an arrowhead if it points.',
  fits: 'a triangle; a circuit\'s wires; a cell wall; a timeline; a cause\'s arrow to its effect',
  params: {
    strokes: {type: 'points[][]', doc: 'what to draw, in px inside the box: each stroke a list of [x, y], drawn one after another (handLine, handShape, handCircle, handArc in chalk.ts make them)'},
    draw: {type: 'progress', default: 1, doc: '0 to 1: how much is chalked; tween it on the word'},
    width: {type: 'px', doc: 'the box\'s width'},
    height: {type: 'px', doc: 'the box\'s height'},
    chalk: {type: 'white | yellow | pink | blue | faded', default: 'white', doc: 'which chalk, by what it means'},
    weight: {type: 'px', default: 7, doc: 'the stroke'},
    dashed: {type: 'boolean', default: false, doc: 'dashed, for a construction line or an axis of symmetry'},
    arrow: {type: 'boolean', default: false, doc: 'an arrowhead at the end of the last stroke, chalked once the line is done'},
  },
  preview: 5.8,
};

export function ChalkLine({strokes, draw = 1, width, height, chalk = 'white', weight = 7, dashed = false, arrow = false}: {strokes: Stroke[]; draw?: number; width: number; height: number; chalk?: Chalk; weight?: number; dashed?: boolean; arrow?: boolean}) {
  const color = CHALK[chalk];
  const {d} = partial(strokes, draw);
  const last = strokes[strokes.length - 1];
  const tip = last[last.length - 1], from = last[Math.max(0, last.length - 2)];
  const a = Math.atan2(tip[1] - from[1], tip[0] - from[0]), s = weight * 3.4;
  const wing = (k: number): Pt => [tip[0] - Math.cos(a + k) * s, tip[1] - Math.sin(a + k) * s];
  const headDraw = unit((draw - 0.97) / 0.03);
  const g = strokeGrain([...strokes, [wing(0.5), wing(-0.5)]], weight * 4, chalk);
  const barbs = arrow && headDraw > 0 ? partial([[wing(0.5), tip, wing(-0.5)]], headDraw).d : '';
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
      <ChalkDefs />
      {/* the dust the stroke leaves beside itself, then the stroke broken into chalk's grain */}
      <path d={d} fill="none" stroke={color} strokeWidth={weight * 3} strokeOpacity={0.07} strokeLinecap="round" strokeLinejoin="round" filter="url(#chalk-haze)" />
      {g.el}
      <g filter={`url(#${g.id})`}>
        <path d={d + barbs} fill="none" stroke={color} strokeWidth={weight} strokeOpacity={0.94} strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray={dashed ? `${weight * 2.6} ${weight * 2.4}` : undefined} />
      </g>
    </svg>
  );
}
