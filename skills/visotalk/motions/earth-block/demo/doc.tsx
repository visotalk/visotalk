// Earth Block's sample: one example among many. Do not reuse its story, scenes, layout or timings; read it for technique, after your own scenes are planned.
// The science: on natural ground cover about 10% of rain runs off, about 50% soaks in and about 40% returns to the air (US EPA's water balance figures); an aquifer is water in the gaps of sand or rock, not a lake,
// and pumping draws the water table down around a well (US Geological Survey, Water Science School); about 30% of Earth's fresh water is in the ground and about 0.3% in lakes, rivers and swamps (USGS, "Where is Earth's water?").
import {Doc, Scene, Line, Part, Animation, Appear, Tween} from '@visotalk/jsx';
import {useProp} from '@visotalk/runtime';
import {C, MONO, type P3, type Pt} from '../parts/earth.ts';
import {Paper} from '../parts/paper.tsx';
import {Block} from '../parts/block.tsx';
import {Fall} from '../parts/fall.tsx';
import {Seep} from '../parts/seep.tsx';
import {Core} from '../parts/core.tsx';
import {Grains} from '../parts/grains.tsx';
import {Shaft} from '../parts/shaft.tsx';
import {Tag} from '../parts/tag.tsx';
import {Slabs} from '../parts/slabs.tsx';
import {Heading} from '../parts/heading.tsx';

const LAYERS = [{h: 0.5, color: C.soil}, {h: 1.4, color: C.sand}, {h: 0.42, color: C.clay}, {h: 0.5, color: C.rock}];
const CLAY_TOP = -1.9, CUT = 4.6, WELL = 1.5;
const CORE_BANDS = [{h: 0.5, color: C.soil}, {h: 0.55, color: C.sand}, {h: 0.85, color: '#6E8CA3'}, {h: 0.42, color: C.clay}, {h: 0.5, color: C.rock}];
const RIVER = [{pts: [[0, 3.1], [1.9, 2.9], [3.3, 3.8], [4.6, 3.3], [6, 3.0], [6, 3.8], [4.7, 4.1], [3.2, 4.6], [1.8, 3.7], [0, 3.9]] as Array<[number, number]>, color: C.water}];
const FARM = [{x: 0.9, y: 0.8, w: 1, d: 0.8, h: 0.62, color: C.wall}, {x: 2.2, y: 0.7, w: 0.6, d: 0.6, h: 0.42, color: C.wall}];
const TREES = [[4.3, 1, 0.5], [5, 1.9, 0.7], [4.5, 2.2, 0.42], [3.4, 0.7, 0.55], [0.9, 2.1, 0.45], [1, 5, 0.55], [2.1, 5.2, 0.42], [4.6, 5.1, 0.6]].map(([x, y, h]) => ({x, y, w: 0.5, d: 0.5, h, color: C.leaf}));
// the cut face is what most of the film looks at
const onCut = (x: number, z: number): P3 => [x, CUT, z];
const SINK: P3[][] = [
  [onCut(1, 0), onCut(1.3, -0.5), onCut(1.1, -1.2), onCut(1.5, CLAY_TOP + 0.08)],
  [onCut(2.9, 0), onCut(2.7, -0.5), onCut(3.1, -1.2), onCut(2.8, CLAY_TOP + 0.08)],
  [onCut(5, 0), onCut(5.2, -0.5), onCut(4.8, -1.2), onCut(5.1, CLAY_TOP + 0.08)],
];
const RUN: P3[][] = [[[1, 3.5, 0], [1.9, 3.3, 0], [3.3, 4.2, 0], [4.7, 3.7, 0], [6, 3.4, 0]]];
const AIR: P3[][] = [[[1.2, 2.5, 0], [1.2, 2.5, 1.1], [1.6, 2.5, 2.2]], [[3.2, 2.6, 0], [3.1, 2.6, 1.2], [3.5, 2.6, 2.3]], [[4.8, 3, 0], [4.9, 3, 1], [4.6, 3, 2.1]]];
const DRILL: Pt = [3.3, 2.8], CORE_AT: Pt = [1440, 170];

// one plate from the first word to the last: every change below is this block moving, so the film is one unbroken look at one thing
const Plate = () => {
  const view = {at: [useProp('cx', 980), useProp('cy', 470)] as Pt, k: useProp('k', 60), yaw: useProp('yaw', 0)};
  const clock = useProp('clock', 0), dip = useProp('dip', 0);
  return <>
    <Block view={view} layers={LAYERS} ribbons={RIVER} solids={[...FARM, ...TREES]} lift={useProp('lift', 0.8)} cut={CUT} slide={useProp('slide', 0)} level={{z: useProp('table', CLAY_TOP), on: 2, dip: {x: WELL, depth: dip, width: 0.75}}} />
    <Core view={view} from={DRILL} to={CORE_AT} bands={CORE_BANDS} t={useProp('core', 0)} gone={useProp('coreGone', 0)} />
    <Shaft view={view} at={[WELL, CUT]} to={-1.8} t={useProp('well', 0)} rise={useProp('pump', 0)} />
    <Seep view={view} paths={SINK} clock={clock} reach={useProp('sink', 0)} />
    <Seep view={view} paths={RUN} n={9} clock={clock} reach={useProp('run', 0)} color={C.foam} size={7} />
    <Seep view={view} paths={AIR} n={4} clock={clock} reach={useProp('air', 0)} color={C.foam} />
    <Fall view={view} area={[0, 0, 6, 6]} clock={clock} show={useProp('rain', 0)} clear={[60, 40, 860, 150]} />
    <Tag view={view} on={[5.2, 3.5, 0]} elbow={[1520, 340]} to={1840} text="Runs off" note="about 10%" color={C.deep} t={useProp('tRun', 0)} />
    <Tag view={view} on={[4.6, 3, 2.1]} elbow={[1520, 180]} to={1840} text="Back to the air" note="about 40%" t={useProp('tAir', 0)} />
    <Tag view={view} on={[1.6, 6, -0.25]} elbow={[420, 640]} to={80} text="Soaks in" note="about 50%" color={C.soil} t={useProp('tIn', 0)} />
    <Tag view={view} on={onCut(0.5, -0.25)} elbow={[440, 360]} to={80} text="Soil" note="holds some, for roots" color={C.soil} t={useProp('tSoil', 0)} />
    <Tag view={view} on={onCut(0.6, -0.8)} elbow={[440, 520]} to={80} text="Sand" note="loose: water passes" color="#8A6A36" t={useProp('tSand', 0)} />
    <Tag view={view} on={onCut(0.9, -2.1)} elbow={[440, 680]} to={80} text="Clay" note="tight: water barely passes" color={C.clay} t={useProp('tClay', 0)} />
    <Tag view={view} on={onCut(5.5, -1.5)} elbow={[1560, 620]} to={1840} text="Aquifer" note="full, up to the table" color={C.deep} t={useProp('tAq', 0)} />
    <Tag view={view} on={onCut(WELL + 0.42, -1.05 - dip * 0.65)} elbow={[440, 620]} to={80} text="Water table" note="drawn down by the well" color={C.deep} t={useProp('tDown', 0)} />
  </>;
};
const Sample = () => <Grains at={[1660, 610]} size={300} from={[CORE_AT[0] + 40, CORE_AT[1] + 110]} show={useProp('show', 0)} level={useProp('level', 0)} label="Water, in the gaps" gone={useProp('gone', 0)} />;

export default <Doc
  id="earth-block-sample"
  title="Where the rain goes"
  poster={28.5}
  lang="en"
  canvas="16x9"
  theme="visotalk/light"
  tokens={{
    colors: {bg: '#EEF0E9', panel: '#FFFFFF', panel2: '#E2E5DC', border: '#C3CBC5', text: '#1D2230', muted: '#4E5866', faint: '#C3CBC5', data: '#2F7FC1', grad: '#D9622B', op: '#1D5C8C', good: '#2F7FC1', bad: '#D9622B', warn: '#C49A5E'},
    fonts: {sans: '"Atkinson Hyperlegible Next", "Noto Sans SC", sans-serif', mono: '"JetBrains Mono", "Noto Sans SC", monospace', display: '"Fraunces", "Noto Serif SC", serif'},
    caption: {font: 'sans', size: 36, weight: 500, color: '#1D2230', background: 'rgba(238, 240, 233, 0.86)', radius: 6, padding: [8, 24], bottom: 34},
  }}
  pacing={{lead: 0.4, hold: 0.5, tail: 0.9}}
  exports={{captions: 'burned'}}
>
  <Part id="paper">{() => <Paper note="Illustrative · depth not to scale" />}</Part>
  <Part id="plate" z={1}>{() => <Plate />}</Part>
  <Part id="sample" z={2}>{() => <Sample />}</Part>
  <Part id="slabs" z={2}>{() => <Slabs t={useProp('t', 0)} unit="%" scale={50} items={[{value: 30, label: 'of fresh water: in the ground', color: C.water, at: [1240, 380]}, {value: 0.3, label: 'lakes, rivers, swamps', color: C.deep, at: [1660, 540]}]} source="USGS, Where is Earth's water?" sourceAt={[1000, 800]} />}</Part>
  <Part id="shares" z={3}>{() => <div style={{position: 'absolute', right: 80, top: 846, fontFamily: MONO, fontSize: 26, color: C.read, opacity: useProp('show', 0)}}>Shares: US EPA, natural ground cover</div>}</Part>
  <Part id="head" z={3}>{() => <Heading text="Where does the rain go?" size={64} show={useProp('show', 0)} />}</Part>

  <Scene id="rain" title="Rain lands on a block of ground">
    <Line id="a1">Rain falls on a field. Where does it all go?</Line>
    <Line id="a2">About a tenth runs off, into the river.</Line>
    <Line id="a3">About four tenths goes back up into the air.</Line>
    <Line id="a4" hold={0.8}>And about half soaks in, where nobody can see it.</Line>
    <Animation>
      <Appear target={['paper', 'plate', 'head']} at="start" dur={0} />
      <Tween target="plate" to={{lift: 0, k: 84, cy: 380}} at="start" dur={2.4} easing="easeOutQuad" />
      <Tween target="head" to={{show: 1}} at="start" dur={0.6} easing="linear" />
      <Tween target="plate" to={{clock: 16}} at="start" until="end" easing="linear" />
      <Tween target="plate" to={{rain: 1}} line="a1" word="Rain" dur={1.2} easing="linear" />
      <Tween target="plate" to={{run: 1}} line="a2" word="runs off" dur={1.4} easing="linear" />
      <Tween target="plate" to={{tRun: 1}} line="a2" word="tenth" dur={0.7} easing="linear" />
      <Tween target="plate" to={{air: 1}} line="a3" word="four" dur={1.2} easing="linear" />
      <Tween target="plate" to={{tAir: 1}} line="a3" word="four" dur={0.7} easing="linear" />
      <Tween target="plate" to={{tIn: 1}} line="a4" word="half" dur={0.7} easing="linear" />
      <Appear target="shares" line="a2" word="tenth" dur={0} />
      <Tween target="shares" to={{show: 1}} line="a2" word="tenth" dur={0.5} easing="linear" />
    </Animation>
  </Scene>

  <Scene id="open" title="The ground, cut open">
    <Line id="b1">So cut the ground open.</Line>
    <Line id="b2">The soil holds on to some of it.</Line>
    <Line id="b3">The rest sinks on, down through loose sand,</Line>
    <Line id="b4">until it meets clay, which it can hardly pass.</Line>
    <Line id="b5" hold={0.8}>So it backs up, and the sand above the clay fills. That is an aquifer.</Line>
    <Animation>
      <Tween target="plate" to={{clock: 36}} at="start" until="end" easing="linear" />
      <Tween target="plate" to={{rain: 0, run: 0, air: 0, tRun: 0, tAir: 0, tIn: 0}} at="start" dur={0.6} easing="linear" />
      <Tween target="plate" to={{slide: 1}} line="b1" word="cut" dur={1.5} easing="easeInOutSine" />
      <Tween target="plate" to={{yaw: -20, k: 92, cy: 340, cx: 1000}} line="b1" word="cut" dur={2.2} easing="easeInOutSine" />
      <Tween target={['head', 'shares']} to={{show: 0}} line="b1" word="cut" dur={0.5} easing="linear" />
      <Tween target="plate" to={{sink: 0.3}} line="b2" word="soil" dur={1} easing="linear" />
      <Tween target="plate" to={{tSoil: 1}} line="b2" word="soil" dur={0.7} easing="linear" />
      <Tween target="plate" to={{sink: 0.72}} line="b3" word="sinks" dur={2} easing="linear" />
      <Tween target="plate" to={{tSand: 1}} line="b3" word="sand" dur={0.7} easing="linear" />
      <Tween target="plate" to={{sink: 1}} line="b4" word="until" dur={1} easing="linear" />
      <Tween target="plate" to={{tClay: 1}} line="b4" word="clay" dur={0.7} easing="linear" />
      <Tween target="plate" to={{table: -1.05}} line="b5" word="backs up" dur={3} easing="easeInOutSine" />
      <Tween target="plate" to={{tAq: 1}} line="b5" word="aquifer" dur={0.7} easing="linear" />
    </Animation>
  </Scene>

  <Scene id="core" title="Not a lake">
    <Line id="c1">It isn't an underground lake. Pull up a core,</Line>
    <Line id="c2" hold={0.8}>and it's only wet sand, with water in the gaps between the grains.</Line>
    <Animation>
      <Tween target="plate" to={{clock: 46}} at="start" until="end" easing="linear" />
      <Tween target="plate" to={{sink: 0, tSoil: 0, tSand: 0, tClay: 0, tAq: 0}} at="start" dur={0.5} easing="linear" />
      <Tween target="plate" to={{cx: 780, cy: 380}} at="start" dur={1.6} easing="easeInOutSine" />
      <Tween target="plate" to={{core: 1}} line="c1" word="Pull up" dur={2.4} easing="easeInOutSine" />
      <Appear target="sample" line="c2" word="wet" dur={0} />
      <Tween target="sample" to={{show: 1}} line="c2" word="wet" dur={0.6} easing="linear" />
      <Tween target="sample" to={{level: 1}} line="c2" word="water" dur={1.6} easing="easeInOutSine" />
    </Animation>
  </Scene>

  <Scene id="well" title="What it is worth">
    <Line id="d1">Sink a well, and it comes up to drink.</Line>
    <Line id="d2">Pump it, and the water table sinks around the well.</Line>
    <Line id="d3" text="That water is 30% of Earth's fresh water.">That water is thirty percent of Earth's fresh water.</Line>
    <Line id="d4" hold={2}>A hundred times what's in all its lakes and rivers.</Line>
    <Animation>
      <Tween target="plate" to={{coreGone: 1}} at="start" dur={0.5} easing="linear" />
      <Tween target="sample" to={{gone: 1}} at="start" dur={0.5} easing="linear" />
      <Tween target="plate" to={{well: 1}} line="d1" word="Sink" dur={1} easing="easeInOutSine" />
      <Tween target="plate" to={{pump: 0.42}} line="d1" word="comes up" dur={0.8} easing="linear" />
      <Tween target="plate" to={{cx: 960, cy: 350}} at="start" dur={1.4} easing="easeInOutSine" />
      <Tween target="plate" to={{dip: 0.6}} line="d2" word="Pump" dur={2.6} easing="easeInOutSine" />
      <Tween target="plate" to={{pump: 1}} line="d2" word="Pump" dur={0.8} easing="linear" />
      <Tween target="plate" to={{tDown: 1}} line="d2" word="water table" dur={0.7} easing="linear" />
      <Tween target="plate" to={{tDown: 0}} line="d3" word="That" dur={0.4} easing="linear" />
      <Tween target="plate" to={{cx: 460, cy: 360, k: 58}} line="d3" word="That" dur={1.6} easing="easeInOutSine" />
      <Appear target="slabs" line="d3" word="thirty" dur={0} />
      <Tween target="slabs" to={{t: 1}} line="d3" word="thirty" dur={0.9} easing="linear" />
    </Animation>
  </Scene>
</Doc>;
