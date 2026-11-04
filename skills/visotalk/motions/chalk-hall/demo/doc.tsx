// Chalk Hall's sample: one example among many. Do not reuse its story, scenes, layout or timings; read it for technique, after your own scenes are planned.
// One board proved and wiped, then a second that puts it to work over the first one's ghost: Pythagoras' theorem, the lesson every student meets (in China, eighth grade:
// the 3-4-5 triangle is written down in the Zhoubi Suanjing as gou three, gu four, xian five), then the distance between two points on a grid.
import React from 'react';
import {Doc, Scene, Line, Part, Animation, Appear, Tween, Asset, Sound} from '@visotalk/jsx';
import {useProp} from '@visotalk/runtime';
import {Board} from '../parts/board.tsx';
import {Heading} from '../parts/heading.tsx';
import {Plot} from '../parts/plot.tsx';
import {Working} from '../parts/working.tsx';
import {Wipe} from '../parts/wipe.tsx';
import {ChalkLine} from '../parts/line.tsx';
import {ChalkWord} from '../parts/write.tsx';
import {BoardSymbol} from '../parts/symbol.tsx';
import {BoardTable} from '../parts/table.tsx';
import {ChalkMark} from '../parts/mark.tsx';
import {handLine, handShape, type Pt} from '../parts/chalk.ts';

// the first board's figure in triangle units (y up): the right angle at the origin, the short sides 3 up and 4 across, a square on each side; 60 px a unit
const S = 60, OX = 210, OY = 440;
const px = (u: number, v: number): Pt => [OX + u * S, OY - v * S];
/** an open path of hand lines through the corners: a square's three new sides, drawn on from the side it shares with the triangle */
const path = (corners: Pt[], key: string) => corners.slice(1).flatMap((c, i) => handLine(corners[i], c, `${key}/${i}`).slice(i ? 1 : 0));

export default <Doc
  id="chalk-hall-sample"
  title="Pythagoras on the board"
  lang="en"
  canvas="16x9"
  theme="visotalk/dark"
  tokens={{
    colors: {bg: '#19241F', panel: '#2B3B34', panel2: '#101714', border: '#3A4842', text: '#EDEBE2', muted: '#ADB8B0', faint: '#56645D', data: '#9FCBE2', grad: '#F3D57A', op: '#F2A39E', good: '#B5DA9C', bad: '#F2A39E', warn: '#F3D57A'},
    fonts: {sans: '"Atkinson Hyperlegible Next", "Noto Sans SC", sans-serif', mono: '"JetBrains Mono", monospace', display: '"Patrick Hand", "LXGW WenKai", cursive'},
    caption: {font: 'sans', size: 34, color: '#EDEBE2', background: 'rgba(12, 18, 16, 0.86)', radius: 4, padding: [10, 26], bottom: 58, rule: '#F3D57A', ruleSide: 'top'},
  }}
  pacing={{lead: 0.4, hold: 0.5, tail: 1}}
  exports={{captions: 'burned'}}
>
  <Asset id="chalk-tap" kind="audio" src="../assets/chalk-tap.mp3" license={{id: "CC0-1.0", attribution: "Tomproberts", obligations: []}} source="https://commons.wikimedia.org/wiki/File:Chalkboard-writing.ogg" />
  <Asset id="chalk-write-a" kind="audio" src="../assets/chalk-write-a.mp3" license={{id: "CC0-1.0", attribution: "Tomproberts", obligations: []}} source="https://commons.wikimedia.org/wiki/File:Chalkboard-writing.ogg" />
  <Asset id="chalk-write-b" kind="audio" src="../assets/chalk-write-b.mp3" license={{id: "CC0-1.0", attribution: "Tomproberts", obligations: []}} source="https://commons.wikimedia.org/wiki/File:Chalkboard-writing.ogg" />
  <Asset id="chalk-write-c" kind="audio" src="../assets/chalk-write-c.mp3" license={{id: "CC0-1.0", attribution: "Tomproberts", obligations: []}} source="https://commons.wikimedia.org/wiki/File:Chalkboard-writing.ogg" />
  <Asset id="chalk-line" kind="audio" src="../assets/chalk-line.mp3" license={{id: "CC-BY-4.0", attribution: "Work With Sounds / La Fonderie", obligations: ["attribution"]}} source="https://commons.wikimedia.org/wiki/File:WWS_Chalk.ogg" />
  <Asset id="eraser" kind="audio" src="../assets/eraser.mp3" license={{id: "user-owned", obligations: []}} />
  <Scene id="lesson">
    <Part id="board"><Board ghost={0.6} remnants={[{text: 'y = 2x + 1', at: [700, 112]}, {text: 'v = d ÷ t', at: [1380, 40]}]} /></Part>

    <Line id="l1" text="Draw a right triangle with short sides 3 and 4.">Draw a right triangle with short sides three and four.</Line>
    <Line id="l2">Now build a square on each of its sides.</Line>
    <Line id="l3" text="The small squares hold 9 and 16: together, 25.">The small squares hold nine and sixteen: together, twenty-five.</Line>
    <Line id="l4">That is Pythagoras' theorem: a squared plus b squared equals c squared.</Line>
    <Line id="l5" text="So c² is 25, and the long side is 5.">So c squared is twenty-five, and the long side is five.</Line>
    <Line id="l6" text="In China it has been known for two thousand years: 3, 4, 5.">In China it has been known for two thousand years: three, four, five.</Line>
    <Line id="l7" hold={0.6}>Now use it to find a distance on a grid.</Line>
    <Line id="l8" text="Point A is at (1, 2), and point B is at (7, 10).">Point A is at one, two, and point B is at seven, ten.</Line>
    <Line id="l9">From A to B is six across and eight up.</Line>
    <Line id="l10" text="6² plus 8² is 100, so AB is 10.">Six squared plus eight squared is a hundred, so A B is ten.</Line>
    <Line id="l11" text="That is 3, 4, 5, doubled.">That is three, four, five, doubled.</Line>
    <Line id="l12" text="Another such triple is 5, 12, 13.">Another such triple is five, twelve, thirteen.</Line>

    {/* the first board: the triangle, a square on each side, their areas, the theorem worked to its boxed answer */}
    <Part id="title" x={110} y={48} w={1700} h={150}>{() => <Heading width={1700} title="Pythagoras' theorem" aside="Lesson 7 · Right triangles" write={useProp('write', 0)} />}</Part>
    <Part id="figure" x={60} y={190} w={720} h={700}>{() => {
      const tri = useProp('tri', 0), sq = useProp('sq', 0), sides = useProp('sides', 0), areas = useProp('areas', 0);
      const at = (p: Pt, child: React.ReactNode) => <div style={{position: 'absolute', left: p[0], top: p[1], transform: 'translate(-50%, -50%)'}}>{child}</div>;
      return (
        <>
          <ChalkLine width={720} height={700} weight={7} draw={tri} strokes={[handShape([px(0, 0), px(4, 0), px(0, 3)], 'tri')]} />
          <BoardSymbol kind="right-angle" at={px(0, 0)} size={24} chalk="blue" width={720} height={700} draw={tri} />
          <ChalkLine width={720} height={700} weight={5} chalk="blue" draw={sq}
            strokes={[path([px(0, 0), px(-3, 0), px(-3, 3), px(0, 3)], 'sq-a'), path([px(0, 0), px(0, -4), px(4, -4), px(4, 0)], 'sq-b'), path([px(0, 3), px(3, 7), px(7, 4), px(4, 0)], 'sq-c')]} />
          {at(px(0.4, 1.25), <ChalkWord text="[3]" size={50} write={Math.min(1, sides * 2)} />)}
          {at(px(1.9, 0.4), <ChalkWord text="[4]" size={50} write={Math.max(0, sides * 2 - 1)} />)}
          {at(px(1.75, 1.25), <ChalkWord text="c" size={50} write={Math.max(0, sides * 2 - 1)} />)}
          {at(px(-1.5, 1.5), <ChalkWord text="9" size={72} write={Math.min(1, areas * 3)} />)}
          {at(px(2, -2), <ChalkWord text="16" size={72} write={Math.min(1, Math.max(0, areas * 3 - 1))} />)}
          {at(px(3.5, 3.5), <ChalkWord text="25" size={72} write={Math.max(0, areas * 3 - 2)} />)}
        </>
      );
    }}</Part>
    <Part id="working" x={800} y={220} w={1080} h={480}>{() => (
      <Working size={96} column={330} write={useProp('write', 0)} box={useProp('box', 0)}
        lines={['a² + b² = c²', 'c² = [3]² + [4]² = 25', 'c = 5']} />
    )}</Part>
    <Part id="note" x={1060} y={720} w={760} h={130}>{() => <ChalkWord text="gou 3 · gu 4 · xian 5" size={56} chalk="faded" write={useProp('write', 0)} />}</Part>

    <Part id="wipe" x={0} y={0} w={1920} h={945}>{() => <Wipe progress={useProp('progress', 0)} />}</Part>

    {/* the second board, over the first one's ghost: two points on a grid, the legs dashed, the distance worked out, and the family of triples it belongs to */}
    <Part id="title2" x={110} y={48} w={1700} h={150}>{() => <Heading width={1700} title="Distance on a grid" aside="Pythagoras at work" write={useProp('write', 0)} />}</Part>
    <Part id="graph" x={100} y={180} w={960} h={710}>{() => (
      <Plot width={960} height={710} x={[0, 10]} y={[0, 10]} step={[2, 2]} axes={useProp('axes', 0)} draw={useProp('draw', 0)} plotted={useProp('plotted', 0)}
        curves={[{points: [[1, 2], [7, 2], [7, 10]], chalk: 'blue', weight: 5, dashed: true}, {points: [[6.55, 2], [6.55, 2.55], [7, 2.55]], chalk: 'blue', weight: 4}, {points: [[1, 2], [7, 10]], weight: 7}]}
        points={[{at: [1, 2], label: 'A', place: 'above-left'}, {at: [7, 10], label: 'B', place: 'left'},
          {at: [4, 2], label: '[6]', place: 'below', dot: false}, {at: [7, 6], label: '[8]', place: 'right', dot: false}]} />
    )}</Part>
    <Part id="distance" x={1100} y={190} w={780} h={400}>{() => (
      <Working size={78} write={useProp('write', 0)} box={useProp('box', 0)} lines={['AB² = [6]² + [8]²', 'AB² = 100', 'AB = 10']} />
    )}</Part>
    <Part id="triples" x={1160} y={585} w={600} h={320}>{() => (
      <BoardTable by="row" size={46} rule={useProp('rule', 0)} filled={useProp('filled', 0)} rows={[['a', 'b', 'c'], ['3', '4', '5'], ['6', '8', '10'], ['5', '12', '13']]} />
    )}</Part>
    <Part id="ring" x={1085} y={705} w={430} h={150}>{() => <ChalkMark kind="circle" width={430} height={150} chalk="pink" weight={6} progress={useProp('progress', 0)} />}</Part>

    {/* the chalk is heard: a tap as it lands, its scratch under every word written and line drawn, the felt under the wipe */}
    <Sound asset="chalk-tap" at="start" volume={-9} />
    <Sound asset="chalk-write-a" at="start" dur={1.0} fadeOut={0.08} volume={-13} />
    <Sound asset="chalk-tap" line="l1" word="right triangle" volume={-9} />
    <Sound asset="chalk-line" line="l1" word="right triangle" dur={1.2} fadeOut={0.1} volume={-14} />
    <Sound asset="chalk-tap" line="l1" word="three" volume={-9} />
    <Sound asset="chalk-write-b" line="l1" word="three" dur={0.8} fadeOut={0.08} volume={-13} />
    <Sound asset="chalk-tap" line="l2" word="square" volume={-9} />
    <Sound asset="chalk-line" line="l2" word="square" dur={1.6} fadeOut={0.1} volume={-14} />
    <Sound asset="chalk-tap" line="l3" word="nine" volume={-9} />
    <Sound asset="chalk-write-c" line="l3" word="nine" dur={0.4} fadeOut={0.08} volume={-13} />
    <Sound asset="chalk-tap" line="l3" word="sixteen" volume={-9} />
    <Sound asset="chalk-write-a" line="l3" word="sixteen" dur={0.4} fadeOut={0.08} volume={-13} />
    <Sound asset="chalk-tap" line="l3" word="twenty-five" volume={-9} />
    <Sound asset="chalk-write-b" line="l3" word="twenty-five" dur={0.4} fadeOut={0.08} volume={-13} />
    <Sound asset="chalk-tap" line="l4" word="a squared" volume={-9} />
    <Sound asset="chalk-write-c" line="l4" word="a squared" dur={1.6} fadeOut={0.08} volume={-13} />
    <Sound asset="chalk-tap" line="l5" word="So" volume={-9} />
    <Sound asset="chalk-write-a" line="l5" word="So" dur={1.3} fadeOut={0.08} volume={-13} />
    <Sound asset="chalk-tap" line="l5" word="long side" volume={-9} />
    <Sound asset="chalk-write-b" line="l5" word="long side" dur={0.5} fadeOut={0.08} volume={-13} />
    <Sound asset="chalk-line" line="l5" word="five" dur={0.6} fadeOut={0.1} volume={-14} />
    <Sound asset="chalk-tap" line="l6" word="In China" volume={-9} />
    <Sound asset="chalk-write-c" line="l6" word="In China" dur={1.6} fadeOut={0.08} volume={-13} />
    <Sound asset="eraser" line="l7" word="Now" dur={2.2} fadeOut={0.2} volume={-11} />
    <Sound asset="chalk-tap" line="l7" word="distance" volume={-9} />
    <Sound asset="chalk-write-a" line="l7" word="distance" dur={1.1} fadeOut={0.08} volume={-13} />
    <Sound asset="chalk-line" line="l7" word="grid" dur={1.4} fadeOut={0.1} volume={-14} />
    <Sound asset="chalk-tap" line="l8" word="Point A" volume={-9} />
    <Sound asset="chalk-tap" line="l8" word="point B" volume={-9} />
    <Sound asset="chalk-tap" line="l9" word="From A to B" volume={-9} />
    <Sound asset="chalk-line" line="l9" word="From A to B" dur={1.2} fadeOut={0.1} volume={-14} />
    <Sound asset="chalk-write-b" line="l9" word="six across" dur={0.4} fadeOut={0.08} volume={-13} />
    <Sound asset="chalk-write-c" line="l9" word="eight up" dur={0.4} fadeOut={0.08} volume={-13} />
    <Sound asset="chalk-tap" line="l10" word="Six squared" volume={-9} />
    <Sound asset="chalk-write-a" line="l10" word="Six squared" dur={1.1} fadeOut={0.08} volume={-13} />
    <Sound asset="chalk-write-b" line="l10" word="a hundred" dur={0.6} fadeOut={0.08} volume={-13} />
    <Sound asset="chalk-tap" line="l10" word="so A B" volume={-9} />
    <Sound asset="chalk-line" line="l10" word="so A B" dur={0.8} fadeOut={0.1} volume={-14} />
    <Sound asset="chalk-line" line="l10" word="ten" dur={0.6} fadeOut={0.1} volume={-14} />
    <Sound asset="chalk-tap" line="l11" word="That is" volume={-9} />
    <Sound asset="chalk-write-c" line="l11" word="three, four, five" dur={0.7} fadeOut={0.08} volume={-13} />
    <Sound asset="chalk-line" line="l11" word="doubled" dur={0.6} fadeOut={0.1} volume={-14} />
    <Sound asset="chalk-tap" line="l12" word="five, twelve, thirteen" volume={-9} />
    <Sound asset="chalk-write-a" line="l12" word="five, twelve, thirteen" dur={0.8} fadeOut={0.08} volume={-13} />

    <Animation>
      <Appear target="board" at="start" dur={0} />
      <Appear target="title" at="start" dur={0} />
      <Tween target="title" to={{write: 1}} at="start" dur={1.0} easing="linear" />
      <Appear target="figure" line="l1" word="right triangle" dur={0} />
      <Tween target="figure" to={{tri: 1}} line="l1" word="right triangle" dur={1.2} easing="easeInOutSine" />
      <Tween target="figure" to={{sides: 1}} line="l1" word="three" dur={0.8} easing="linear" />
      <Tween target="figure" to={{sq: 1}} line="l2" word="square" dur={1.6} easing="easeInOutSine" />
      <Tween target="figure" to={{areas: 0.34}} line="l3" word="nine" dur={0.4} easing="linear" />
      <Tween target="figure" to={{areas: 0.67}} line="l3" word="sixteen" dur={0.4} easing="linear" />
      <Tween target="figure" to={{areas: 1}} line="l3" word="twenty-five" dur={0.4} easing="linear" />
      <Appear target="working" line="l4" word="a squared" dur={0} />
      <Tween target="working" to={{write: 1}} line="l4" word="a squared" dur={1.6} easing="linear" />
      <Tween target="working" to={{write: 2}} line="l5" word="So" dur={1.3} easing="linear" />
      <Tween target="working" to={{write: 3}} line="l5" word="long side" dur={0.5} easing="linear" />
      <Tween target="working" to={{box: 1}} line="l5" word="five" dur={0.6} easing="easeInOutSine" />
      <Appear target="note" line="l6" word="In China" dur={0} />
      <Tween target="note" to={{write: 1}} line="l6" word="In China" dur={1.6} easing="linear" />

      <Appear target="wipe" line="l7" word="Now" dur={0} />
      <Tween target="wipe" to={{progress: 1}} line="l7" word="Now" dur={2.2} easing="linear" />

      {/* the next heading and the axes follow the eraser as it leaves the left of the board, so the board is never left bare */}
      <Appear target="title2" line="l7" word="distance" dur={0} />
      <Tween target="title2" to={{write: 1}} line="l7" word="distance" dur={1.1} easing="linear" />
      <Appear target="graph" line="l7" word="grid" dur={0} />
      <Tween target="graph" to={{axes: 1}} line="l7" word="grid" dur={1.4} easing="easeInOutSine" />
      <Tween target="graph" to={{plotted: 1}} line="l8" word="Point A" dur={0.4} easing="linear" />
      <Tween target="graph" to={{plotted: 2}} line="l8" word="point B" dur={0.4} easing="linear" />
      <Tween target="graph" to={{draw: 2}} line="l9" word="From A to B" dur={1.2} easing="easeInOutSine" />
      <Tween target="graph" to={{plotted: 3}} line="l9" word="six across" dur={0.4} easing="linear" />
      <Tween target="graph" to={{plotted: 4}} line="l9" word="eight up" dur={0.4} easing="linear" />
      <Appear target="distance" line="l10" word="Six squared" dur={0} />
      <Tween target="distance" to={{write: 1}} line="l10" word="Six squared" dur={1.1} easing="linear" />
      <Tween target="distance" to={{write: 2}} line="l10" word="a hundred" dur={0.6} easing="linear" />
      <Tween target="graph" to={{draw: 3}} line="l10" word="so A B" dur={0.8} easing="easeInOutSine" />
      <Tween target="distance" to={{write: 3}} line="l10" word="so A B" dur={0.6} easing="linear" />
      <Tween target="distance" to={{box: 1}} line="l10" word="ten" dur={0.6} easing="easeInOutSine" />
      <Appear target="triples" line="l11" word="That is" dur={0} />
      <Tween target="triples" to={{rule: 1}} line="l11" word="That is" dur={0.6} easing="linear" />
      <Tween target="triples" to={{filled: 1}} line="l11" word="three, four, five" dur={0.7} easing="linear" />
      <Tween target="triples" to={{filled: 2}} line="l11" word="doubled" dur={0.6} easing="linear" />
      <Appear target="ring" line="l11" word="doubled" dur={0} />
      <Tween target="ring" to={{progress: 1}} line="l11" word="doubled" dur={0.6} easing="easeInOutSine" />
      <Tween target="triples" to={{filled: 3}} line="l12" word="five, twelve, thirteen" dur={0.8} easing="linear" />
    </Animation>
  </Scene>
</Doc>;
