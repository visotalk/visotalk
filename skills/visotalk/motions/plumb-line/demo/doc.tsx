// Plumb Line's sample: one example among many. Do not reuse its story, scenes, layout or timings; read it for technique, after your own scenes are planned.
// The science: sunlight reaches only about 200 m, the twilight zone runs to 1,000 m, the midnight zone to about 4,000 m, the abyss to about 6,000 m and the hadal zone to about 11,000 m (Woods Hole Oceanographic Institution, Ocean Zones);
// the deepest point is about 10,935 m (Deep Sea Research I, via NOAA), Everest stands 8,849 m, the Titanic lies at about 3,800 m, the deepest fish filmed was a snailfish at 8,336 m (University of Western Australia, 2023), and a dumbo octopus was filmed at about 6,900 m (Jamieson & Vecchione, Marine Biology 2020); pressure grows by about one atmosphere every 10 m; 76% of the animals observed from the surface to 3,900 m off California can make light (Martini & Haddock, Scientific Reports 2017). Sperm whales commonly dive past 1,000 m (NOAA Fisheries). Figures are not to scale.
import {Doc, Scene, Line, Part, Animation, Appear, Tween} from '@visotalk/jsx';
import {useProp} from '@visotalk/runtime';
import {C, EDGE, group} from '../parts/plumb.ts';
import {Strata} from '../parts/strata.tsx';
import {Gauge} from '../parts/gauge.tsx';
import {Bob} from '../parts/bob.tsx';
import {Rays} from '../parts/rays.tsx';
import {Cutouts, type Item} from '../parts/cutouts.tsx';
import {Sparks} from '../parts/sparks.tsx';
import {Standard} from '../parts/standard.tsx';
import {Callout} from '../parts/callout.tsx';
import {Heading} from '../parts/heading.tsx';

const BANDS = [{from: 0, color: '#3FA3C6'}, {from: 200, color: '#1F78A6'}, {from: 1000, color: '#144C79'}, {from: 4000, color: '#0E3159'}, {from: 6000, color: '#123460'}];
const FLOOR = {at: 6000, notch: [520, 1120] as [number, number], to: 10935, color: '#040A18'};
const TICKS = [{at: 200, label: '200 m'}, {at: 0, label: '0 m'}, {at: 1000, label: '1,000 m'}, {at: 4000, label: '4,000 m'}, {at: 6000, label: '6,000 m'}, {at: 10935, label: '10,935 m'}];
const ZONES = [
  {name: 'Sunlight', note: 'plants can grow', from: 0, to: 200},
  {name: 'Twilight', note: 'the light gives out', from: 200, to: 1000},
  {name: 'Midnight', note: 'only living light', from: 1000, to: 4000},
  {name: 'Abyss', note: 'near freezing', from: 4000, to: 6000},
  {name: 'Hadal', note: 'trenches only', from: 6000, to: 10935},
];
const SHIP = 'M-130 4L-108 36L-26 36L-16 -2L-30 -6L-40 -6L-40 -24L-62 -24L-62 -6L-96 -6L-96 -24L-118 -24L-118 4ZM14 10L36 40L122 30L150 -8L92 -6L92 -24L68 -24L68 -5L42 -4L42 -22L20 -22L20 2Z';
const DUMBO = 'M-60 -6C-60 -60 60 -60 60 -6C60 16 44 26 40 42C30 34 26 30 20 50C12 36 6 34 0 54C-6 34 -12 36 -20 50C-26 30 -30 34 -40 42C-44 26 -60 16 -60 -6ZM-58 -30C-92 -56 -96 -20 -62 -14ZM58 -30C92 -56 96 -20 62 -14Z';
const LIFE: Item[] = [
  {shape: 'fish', x: 340, depth: 62, size: 0.8, color: C.amber}, {shape: 'fish', x: 500, depth: 84, size: 0.55, color: C.amber}, {shape: 'fish', x: 250, depth: 100, size: 0.6, color: C.amber}, {shape: 'fish', x: 620, depth: 50, size: 0.5, color: C.amber},
  {shape: 'whale', x: 640, depth: 620, size: 1.5}, {shape: 'fish', x: 1160, depth: 860, size: 0.8, color: C.pale, flip: true}, {shape: 'fish', x: 1290, depth: 900, size: 0.55, color: C.pale, flip: true},
  {shape: 'jelly', x: 1180, depth: 1900, size: 1, color: C.pale}, {shape: 'angler', x: 640, depth: 2900, size: 1.3, color: '#2A5C8C'},
  {d: SHIP, x: 1040, depth: 3800, size: 1.2, color: '#0A2142'}, {d: DUMBO, x: 720, depth: 5000, size: 1.2, color: C.pale}, {shape: 'fish', x: 820, depth: 8336, size: 0.7, color: C.pale},
];

// one long take: the whole film is one camera and one weight moving down one axis, and both parts read the same camera
const useCam = () => ({at: useProp('at', 90), scale: Math.pow(10, useProp('ls', 0.602))});
const Plate = () => {
  const cam = useCam(), clock = useProp('clock', 0), d = useProp('d', 0);
  return <>
    <Strata cam={cam} sky="#BFE7F0" bands={BANDS} floor={FLOOR} clock={clock} />
    <div data-camera="" style={{position: 'absolute', left: 0, top: 0, width: EDGE, height: 880, overflow: 'hidden'}}>
      <Rays cam={cam} to={200} clock={clock} />
      <Cutouts cam={cam} items={LIFE} clock={clock} />
      <Sparks cam={cam} from={1000} to={4000} clock={clock} show={useProp('sparks', 0)} />
      <Standard cam={cam} x={820} base={10935} height={8849} t={useProp('peak', 0)} />
    </div>
    <Callout cam={cam} x={800} depth={200} at={[140, 620]} width={580} text="Nearly all the light ends here" note="about 200 m" source="Woods Hole" t={useProp('tSun', 0)} />
    <Callout cam={cam} x={760} depth={620} at={[110, 200]} width={480} text="Sperm whales hunt here" note="they dive past 1,000 m" t={useProp('tWhale', 0)} />
    <Callout cam={cam} x={1180} depth={1900} at={[110, 180]} width={560} text="3 in 4 animals make light" note="of those filmed, surface to 3,900 m" source="Martini & Haddock, 2017" t={useProp('tLight', 0)} />
    <Callout cam={cam} x={1040} depth={3800} at={[430, 90]} width={330} text="The Titanic" note="lies at about 3,800 m" t={useProp('tShip', 0)} />
    <Callout cam={cam} x={720} depth={5000} at={[110, 470]} width={420} text="Dumbo octopus" note="seen as deep as 6,900 m" t={useProp('tDumbo', 0)} />
    <Callout cam={cam} x={820} depth={8336} at={[110, 240]} width={570} text="The deepest fish ever filmed" note="8,336 m, a snailfish" t={useProp('tFish', 0)} />
    <Callout cam={cam} x={820} depth={10935 - 8849} at={[1130, 260]} width={360} text="Everest" note="8,849 m, height to scale" t={useProp('tPeak', 0)} />
    <Callout cam={cam} x={500} depth={100} at={[110, 200]} width={470} text="Nearly all the sunlight" note="the top 200 m, true to scale" t={useProp('tLine', 0)} />
    <Bob cam={cam} d={d} sub={`about ${group(Math.max(1, Math.round(d / 100) * 10))} atm`} />
  </>;
};

export default <Doc
  id="plumb-line-sample"
  title="How deep the sea goes"
  poster={38.5}
  lang="en"
  canvas="16x9"
  theme="visotalk/light"
  tokens={{
    colors: {bg: '#BFE7F0', panel: '#F7EFDD', panel2: '#E9DFC8', border: '#C8BFA8', text: '#1A2A44', muted: '#4C5A70', faint: '#C8BFA8', data: '#1F78A6', grad: '#C8892E', op: '#144C79', good: '#1F78A6', bad: '#C8892E', warn: '#F2B33D'},
    fonts: {sans: '"Atkinson Hyperlegible Next", "Noto Sans SC", sans-serif', mono: '"JetBrains Mono", "Noto Sans SC", monospace', display: '"Fraunces", "Noto Serif SC", serif'},
    caption: {font: 'sans', size: 36, weight: 500, color: '#1A2A44', background: 'rgba(247, 239, 221, 0.94)', radius: 6, padding: [8, 24], bottom: 34},
  }}
  pacing={{lead: 0.4, hold: 0.5, tail: 0.9}}
  exports={{captions: 'burned'}}
>
  <Part id="plate">{() => <Plate />}</Part>
  <Part id="axis" z={2}>{() => <Gauge cam={useCam()} ticks={TICKS} zones={ZONES} note="Figures not to scale" />}</Part>
  <Part id="head" z={3}>{() => <Heading text="How deep does the sea go?" size={68} show={useProp('show', 0)} />}</Part>

  <Scene id="light" title="The lit part">
    <Line id="a1">How deep does the sea go? Let a line down and find out.</Line>
    <Line id="a2" hold={1} text="The first 200 metres hold nearly all the sunlight.">The first two hundred metres hold nearly all the sunlight.</Line>
    <Animation>
      <Appear target={['plate', 'axis', 'head']} at="start" dur={0} />
      <Tween target="head" to={{show: 1}} at="start" dur={0.6} easing="linear" />
      <Tween target="plate" to={{clock: 9}} at="start" until="end" easing="linear" />
      <Tween target="head" to={{show: 0}} line="a1" word="Let" dur={0.5} easing="linear" />
      <Tween target="plate" to={{d: 200}} line="a2" word="first" dur={2.6} easing="easeInOutSine" />
      <Tween target="plate" to={{tSun: 1}} line="a2" word="sunlight" dur={0.7} easing="linear" />
    </Animation>
  </Scene>

  <Scene id="dark" title="Where it goes dark">
    <Line id="b1" text="By 1,000 metres, the last of it is gone.">By a thousand metres, the last of it is gone.</Line>
    <Line id="b2" hold={0.6}>Below that, the only light is made by the animals themselves.</Line>
    <Animation>
      <Tween target="plate" to={{clock: 18}} at="start" until="end" easing="linear" />
      <Tween target="plate" to={{tSun: 0}} at="start" dur={0.4} easing="linear" />
      <Tween target={['plate', 'axis']} to={{at: 600, ls: -0.022}} line="b1" word="By" dur={2.8} easing="easeInOutSine" />
      <Tween target="plate" to={{d: 1000}} line="b1" word="By" dur={2.8} easing="easeInOutSine" />
      <Tween target="plate" to={{tWhale: 1}} line="b1" word="gone" dur={0.7} easing="linear" />
      <Tween target="plate" to={{tWhale: 0}} line="b2" word="Below" dur={0.4} easing="linear" />
      <Tween target={['plate', 'axis']} to={{at: 2500, ls: -0.585}} line="b2" word="Below" dur={2.8} easing="easeInOutSine" />
      <Tween target="plate" to={{d: 2500}} line="b2" word="Below" dur={2.8} easing="easeInOutSine" />
      <Tween target="plate" to={{sparks: 1}} line="b2" word="only light" dur={1.4} easing="linear" />
      <Tween target="plate" to={{tLight: 1}} line="b2" word="animals" dur={0.7} easing="linear" />
    </Animation>
  </Scene>

  <Scene id="deep" title="And further">
    <Line id="c1" hold={0.5} text="At 4,000 metres, past the Titanic, the pressure is 400 times the air's.">At four thousand metres, past the Titanic, the pressure is four hundred times the air's.</Line>
    <Line id="c2" hold={0.8} text="And in the trenches, it goes on, to nearly 11,000.">And in the trenches, it goes on, to nearly eleven thousand.</Line>
    <Animation>
      <Tween target="plate" to={{clock: 30}} at="start" until="end" easing="linear" />
      <Tween target="plate" to={{tLight: 0}} at="start" dur={0.4} easing="linear" />
      <Tween target={['plate', 'axis']} to={{at: 4400, ls: -0.42}} line="c1" word="At" dur={2.6} easing="easeInOutSine" />
      <Tween target="plate" to={{d: 4000}} line="c1" word="At" dur={2.6} easing="easeInOutSine" />
      <Tween target="plate" to={{tShip: 1}} line="c1" word="Titanic" dur={0.7} easing="linear" />
      <Tween target="plate" to={{tDumbo: 1}} line="c1" word="pressure" dur={0.7} easing="linear" />
      <Tween target="plate" to={{tShip: 0, tDumbo: 0}} line="c2" word="And" dur={0.4} easing="linear" />
      <Tween target={['plate', 'axis']} to={{at: 8500, ls: -0.796}} line="c2" word="And" dur={3.2} easing="easeInOutSine" />
      <Tween target="plate" to={{d: 10900}} line="c2" word="And" dur={3.2} easing="easeInOutSine" />
      <Tween target="plate" to={{tFish: 1}} line="c2" word="eleven" dur={0.7} easing="linear" />
    </Animation>
  </Scene>

  <Scene id="whole" title="True to scale">
    <Line id="d1">Now pull back, and see it true to scale.</Line>
    <Line id="d2">Everest would vanish in here, with two kilometres to spare.</Line>
    <Line id="d3" hold={2}>And that thin line at the top? That is nearly all the sunlight there is.</Line>
    <Animation>
      <Tween target="plate" to={{clock: 46}} at="start" until="end" easing="linear" />
      <Tween target="plate" to={{tFish: 0}} at="start" dur={0.4} easing="linear" />
      <Tween target={['plate', 'axis']} to={{at: 5300, ls: -1.133}} line="d1" word="pull back" dur={3} easing="easeInOutSine" />
      <Tween target="plate" to={{peak: 1}} line="d2" word="Everest" dur={1.8} easing="linear" />
      <Tween target="plate" to={{tPeak: 1}} line="d2" word="vanish" dur={0.7} easing="linear" />
      <Tween target="plate" to={{tLine: 1}} line="d3" word="thin line" dur={0.7} easing="linear" />
    </Animation>
  </Scene>
</Doc>;
