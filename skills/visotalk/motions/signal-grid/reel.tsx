// Signal Grid's reel: twenty seconds of its components at a brisk pace, for a player. Not a template: read it for how the parts move.
// One sheet all through, six pages of a lecture-and-report mix: a definition and its figure, a worked triangle, code and its cost,
// three causes and a table, a timeline making room for one event, two tenses beside three growth curves.
import React from 'react';
import type {ReactNode} from 'react';
import {Easing, useTime} from '@motionhub/runtime';
import {Sheet} from './parts/sheet.tsx';
import {Headline} from './parts/headline.tsx';
import {Passage} from './parts/passage.tsx';
import {Figures} from './parts/figures.tsx';
import {Working} from './parts/working.tsx';
import {Diagram} from './parts/diagram.tsx';
import {Listing} from './parts/code.tsx';
import {Bars} from './parts/bars.tsx';
import {Points} from './parts/points.tsx';
import {Table} from './parts/table.tsx';
import {Timeline} from './parts/timeline.tsx';
import {Card} from './parts/card.tsx';
import {Compare} from './parts/compare.tsx';
import {Plot} from './parts/plot.tsx';
import {Turn} from './parts/turn.tsx';

export const reel = {seconds: 20, width: 1920, height: 1080};
/** What happens when, for the motion's sound (sound.json): modules land, blocks wipe, figures count, the board re-flows, pages turn */
export const cues = [
  {at: 0.2, role: 'land'}, {at: 1.0, role: 'draw', dur: 0.5}, {at: 1.4, role: 'land'}, {at: 1.5, role: 'count', dur: 1.3},
  {at: 3.5, role: 'out'}, {at: 3.9, role: 'land'}, {at: 4.0, role: 'draw', dur: 1.4}, {at: 5.3, role: 'land'},
  {at: 7.2, role: 'cut'}, {at: 8.2, role: 'draw', dur: 0.5}, {at: 8.6, role: 'move', dur: 0.9}, {at: 9.0, role: 'count', dur: 1.0},
  {at: 10.8, role: 'cut'}, {at: 11.2, role: 'land'}, {at: 11.8, role: 'land'}, {at: 12.4, role: 'land'}, {at: 13.4, role: 'draw', dur: 0.5},
  {at: 14.4, role: 'cut'}, {at: 15.3, role: 'land'}, {at: 15.4, role: 'move', dur: 1.2}, {at: 17.6, role: 'cut'},
  {at: 18.1, role: 'draw', dur: 1.0}, {at: 18.4, role: 'draw', dur: 0.4},
];

type Ease = (x: number) => number;
const unit = (v: number) => Math.max(0, Math.min(1, v));
const sine: Ease = Easing.inOutSine, quart: Ease = Easing.outQuart, lin: Ease = Easing.linear;

/** A prop's value at t: `base`, then each move [start, duration, value, easing] in turn */
function track(t: number, base: number, ...moves: Array<[number, number, number, Ease?]>) {
  let v = base;
  for (const [a, d, to, e = sine] of moves) {
    if (t <= a) break;
    v = v + (to - v) * e(unit((t - a) / d));
  }
  return v;
}

/** A module on screen from a to b: 0.3 s in, 0.3 s out, nothing else moves it */
const On = ({t, a, b, children}: {t: number; a: number; b: number; children: ReactNode}) => {
  const o = Math.min(unit((t - a) / 0.3), unit((b - t) / 0.3));
  return o > 0 ? <div style={{position: 'absolute', inset: 0, opacity: o}}>{children}</div> : null;
};

/** A module unrolled into the columns a re-flow freed, from its column line at x px */
const Enter = ({x, e, children}: {x: number; e: number; children: ReactNode}) => (
  <div style={{position: 'absolute', inset: 0, clipPath: `inset(0 ${Math.round((1920 - x) * (1 - unit(e)))}px 0 ${x - 4}px)`}}>{children}</div>
);

const TRIANGLE = [
  {type: 'polygon', points: '20,60 100,60 20,0', fill: 'paper'},
  {type: 'rect', x: 20, y: 52, w: 8, h: 8},
  {type: 'line', x1: 100, y1: 60, x2: 20, y2: 0, part: 2},
];
const TRIANGLE_LABELS = [
  {text: 'a = 3', at: [20, 30], pos: [6, 30]},
  {text: 'b = 4', at: [60, 60], pos: [60, 70]},
  {text: 'c = ?', at: [60, 30], pos: [84, 22]},
];
const CODE = ['def has_duplicate(items):', '    for i in range(len(items)):', '        for j in range(i + 1, len(items)):', '            if items[i] == items[j]:', '                return True', '    return False'];
const COST = [{label: 'O(n)', value: 1000, shown: '1,000'}, {label: 'O(n log n)', value: 10000, shown: '≈ 10,000'}, {label: 'O(n²)', value: 1000000, shown: '1,000,000'}];
const CAUSES = [{title: 'More money in circulation'}, {title: 'Demand outruns supply'}, {title: 'Costs pass into prices'}];
const RATES = [['Euro area', '2%'], ['United States', '2%'], ['United Kingdom', '2%']];
const EVENTS = [{date: '1961', title: 'Kennedy sets the goal'}, {date: '1968', title: 'Apollo 8 orbits the Moon'}, {date: '1969', title: 'Apollo 11 lands'}, {date: '1972', title: 'Apollo 17, the last'}];
const TENSES = [
  {label: 'Simple past', rule: 'a finished time', examples: ['I lost my keys {yesterday}.']},
  {label: 'Present perfect', rule: 'time still open', examples: ['I\'ve lost my keys.']},
];
const n = (k: number) => Array.from({length: 11}, (_, i) => [i, k === 0 ? i : k === 1 ? (i === 0 ? 0 : i * Math.log2(i)) : i * i]);

export default function SignalGridReel() {
  const t = useTime();
  const page = t < 3.7 ? 1 : t < 7.4 ? 2 : t < 11 ? 3 : t < 14.6 ? 4 : t < 17.8 ? 5 : 6;
  const lit = track(t, 1, [1.6, 0.5, 8], [3.7, 0.4, 1], [5.4, 0.5, 8], [7.4, 0.4, 1], [8.6, 0.9, 8, quart], [11, 0.4, 1], [12.6, 0.5, 7], [14.6, 0.4, 1], [15.4, 1.0, 8, quart], [17.8, 0.4, 1], [19.2, 0.5, 9]);
  const span = track(t, 7, [1.6, 0.5, 5], [3.7, 0.4, 7], [5.4, 0.5, 5], [7.4, 0.4, 7], [8.6, 0.9, 5, quart], [11, 0.4, 6], [14.6, 0.4, 12], [15.4, 1.0, 5, quart], [17.8, 0.4, 8], [19.2, 0.5, 4]);
  const reveal = Math.max(track(t, 0, [8.6, 0.3, 1], [9.6, 0.5, 0]), track(t, 0, [15.4, 0.3, 1], [16.6, 0.5, 0]));
  // each page change is a column turn centred on the change
  const turns: Array<[number, string]> = [[3.7, '§2'], [7.4, '§3'], [11, '§4'], [14.6, '§5'], [17.8, '§6']];
  const active = turns.find(([b]) => t > b - 0.5 && t < b + 0.5);
  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden'}}>
      <Sheet head="Signal Grid · Lecture and report" folio={`0${page} / 06`} reveal={reveal} litCol={lit} litSpan={span} slot={t > 15.3 && t < 17 ? {col: 8, span: 5, top: 340, height: 480} : null} />

      <On t={t} a={0.2} b={3.6}><Headline kicker="§1 · A definition" title="Inflation, in one sentence" /></On>
      <On t={t} a={0.4} b={3.6}><Passage text="Inflation is a {sustained} rise in the general level of prices." index="A" label="Definition" col={1} span={7} top={340} mark={track(t, 0, [1.0, 0.5, 1, lin], [2.6, 0.2, 0])} gloss="one price rising is not inflation" /></On>
      <On t={t} a={1.4} b={3.6}><Figures items={[{value: '2%', label: 'the yearly target of many central banks', note: 'Fed · ECB · Bank of England'}]} col={8} span={5} top={340} count={track(t, 0, [1.5, 1.3, 1, quart])} focus={t > 2.8 ? 0 : -1} /></On>

      <On t={t} a={3.8} b={7.3}><Headline kicker="§2 · Geometry" title="a² + b² = c², worked" /></On>
      <On t={t} a={3.9} b={7.3}><Working steps={[{expr: 'a² + b² = c²', note: 'Pythagoras'}, {expr: '3² + 4² = {25}', note: '9 + 16'}, {expr: 'c = {5}', note: '√25'}]} index="A" label="The working" col={1} span={7} top={340} shown={t < 4.6 ? 1 : t < 5.3 ? 2 : 3} focus={t < 4.6 ? 0 : t < 5.3 ? 1 : 2} mark={track(t, 0, [4.6, 0.4, 1], [5.3, 0, 0], [5.31, 0.4, 1], [5.5, 0.1, 0])} /></On>
      <On t={t} a={3.9} b={7.3}><Diagram shapes={TRIANGLE} labels={TRIANGLE_LABELS} box={[110, 76]} index="B" label="A right triangle" col={8} span={5} top={340} height={420} draw={track(t, 0, [4.0, 1.4, 1, lin])} focus={t > 5.6 ? 2 : -1} /></On>

      <On t={t} a={7.5} b={10.9}><Headline kicker="§3 · Algorithms" title="A loop inside a loop costs n × n" /></On>
      <On t={t} a={7.5} b={10.9}><Listing lines={CODE} index="A" label="has_duplicate.py" col={1} span={7} top={340} size={25} marked={2} mark={track(t, 0, [8.2, 0.5, 1])} foot="n outer × up to n inner ≈ n² / 2 checks" /></On>
      <On t={t} a={8.6} b={10.9}><Enter x={1118} e={track(t, 0, [8.6, 0.9, 1, quart])}><Bars rows={COST} index="B" label="Steps when n = 1,000" col={8} span={5} top={340} scale="log" grow={track(t, 0, [9.0, 1.0, 1, quart])} focus={t > 10 ? 2 : -1} note="log scale" /></Enter></On>

      <On t={t} a={11.1} b={14.5}><Headline kicker="§4 · Economics" title="Three causes, one target" /></On>
      <On t={t} a={11.1} b={14.5}><Points items={CAUSES} index="A" label="Why prices rise" col={1} span={6} top={340} shown={t < 11.8 ? 1 : t < 12.4 ? 2 : 3} focus={t < 11.8 ? 0 : t < 12.4 ? 1 : t < 13.3 ? 2 : -1} /></On>
      <On t={t} a={12.6} b={14.5}><Table head={['Central bank', 'Target']} rows={RATES.map((r, i) => (i === 0 ? [r[0], `{${r[1]}}`] : r))} align={['left', 'right']} index="B" label="Inflation targets" col={7} span={6} top={340} shown={track(t, 0, [12.6, 0.6, 3, lin])} focus={t > 13.4 ? 0 : -1} mark={track(t, 0, [13.4, 0.5, 1])} /></On>

      <On t={t} a={14.7} b={17.7}><Headline kicker="§5 · History" title="Eleven years to the Moon" /></On>
      <On t={t} a={14.7} b={17.7}><Timeline events={EVENTS} index="A" label="Apollo, four dates" top={340} span={track(t, 12, [15.4, 1.0, 7, quart])} open={t > 15.3 ? 2 : -1} /></On>
      <On t={t} a={15.5} b={17.7}><Enter x={1118} e={track(t, 0, [15.5, 1.0, 1, quart])}><Card tab="20 July 1969" title="The first landing" body="Armstrong and Aldrin walk on the Moon; Collins stays in orbit." figure="2" figureLabel="people on the surface" col={8} top={340} height={480} /></Enter></On>

      <On t={t} a={17.9} b={20.5}><Headline kicker="§6 · Two at once" title="Grammar beside growth" /></On>
      <On t={t} a={17.9} b={20.5}><Compare columns={TENSES} col={1} span={8} top={340} size={38} mark={track(t, 0, [18.4, 0.4, 1], [19.0, 0.2, 0])} focus={t < 19.2 ? 0 : -1} /></On>
      <On t={t} a={17.9} b={20.5}><Plot series={[{label: 'n', points: n(0)}, {label: 'n log n', points: n(1)}, {label: 'n²', points: n(2)}]} x={{min: 0, max: 10, ticks: [0, 5, 10]}} y={{min: 0, max: 100, ticks: [0, 50, 100]}} index="C" label="Growth" col={9} span={4} top={340} height={380} draw={track(t, 0, [18.1, 1.0, 1])} focus={t > 19.2 ? 2 : -1} /></On>
      {active && <Turn turn={(t - active[0] + 0.5) / 1.0} label={active[1]} />}
    </div>
  );
}
