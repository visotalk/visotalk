import React from 'react';
import {ChalkDefs, type Chalk} from './chalk.ts';
import {Mark, type MarkKind} from './write.tsx';

export const meta = {
  name: {en: 'Chalk mark', 'zh-CN': '粉笔圈点'},
  purpose: 'mark',
  line: 'A ring, box, underline, tick or cross chalked over any part of the board as the narration points at it.',
  fits: 'a graph\'s vertex; a word in a sentence; a wrong step crossed out; an item ticked',
  params: {
    kind: {type: 'circle | box | underline | tick | cross', default: 'circle', doc: 'how it marks'},
    width: {type: 'px', doc: 'the width it covers, the mark and its dust included: what it marks sits at its middle, a little above for the dust that falls'},
    height: {type: 'px', doc: 'the height it covers, the mark and its dust included'},
    progress: {type: 'progress', default: 0, doc: '0 to 1: how much is chalked; tween it on the word that points'},
    chalk: {type: 'white | yellow | pink | blue', default: 'yellow', doc: 'yellow for the result, pink for what is given or wrong'},
    weight: {type: 'px', default: 6, doc: 'the stroke'},
  },
  preview: 39.0,
};

/** Room round the mark inside the box: the hand's overshoot, the puff at the chalk's head, and below it the dust that falls */
const INSET: Record<MarkKind, React.CSSProperties> = {
  circle: {left: 60, right: 60, top: 40, bottom: 66}, box: {left: 48, right: 48, top: 34, bottom: 60},
  underline: {left: 24, right: 24, top: 0, bottom: 74}, tick: {left: 22, right: 22, top: 22, bottom: 50}, cross: {left: 22, right: 22, top: 22, bottom: 50},
};

export function ChalkMark({kind = 'circle', width, height, progress = 0, chalk = 'yellow', weight = 6}: {kind?: MarkKind; width: number; height: number; progress?: number; chalk?: Chalk; weight?: number}) {
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width, height}}>
      <ChalkDefs />
      {/* a ring and a box are drawn round their middle with room for the hand's overshoot, so they keep inside the box */}
      <div style={{position: 'absolute', ...INSET[kind]}}><Mark kind={kind} progress={progress} chalk={chalk} weight={weight} /></div>
    </div>
  );
}
