// Field Atlas's sample: one example among many. Do not reuse its story, scenes, layout or timings; read it for technique, after your own scenes are planned.
// The Indian Pacific, Sydney to Perth: 4,352 km and 70.5 to 75 hours one way (Wikipedia, "Indian Pacific"). The line is drawn through its towns,
// which is close enough at a continent's scale; the Adelaide leg runs out from Crystal Brook and back, as the train does. The straight is Guinness
// World Records' longest railway straight, 478 km between a point near Nurina and Loongana (WA) and one near Ooldea and Watson (SA); its two ends
// here are placed between those towns. Nullarbor is from Latin nullus arbor, no tree.
import {Doc, Scene, Line, Part, Animation, Appear, Tween} from '@visotalk/jsx';
import {useProp} from '@visotalk/runtime';
import {Atlas} from '../parts/atlas.tsx';
import {Route} from '../parts/route.tsx';
import {Regions} from '../parts/regions.tsx';
import {Legend} from '../parts/legend.tsx';
import {Stops} from '../parts/stops.tsx';
import {Gloss} from '../parts/gloss.tsx';
import {Place} from '../parts/place.tsx';
import {Plate} from '../parts/plate.tsx';
import {Note} from '../parts/note.tsx';
import {Locator} from '../parts/locator.tsx';
import {type LonLat} from '../parts/geo.ts';

// the straight's two ends, and the sidings on it, set on the one line between them
const EAST: LonLat = [131.7, -30.48], WEST: LonLat = [126.75, -30.97];
const on = (lon: number): LonLat => [lon, EAST[1] + ((EAST[0] - lon) / (EAST[0] - WEST[0])) * (WEST[1] - EAST[1])];
const COOK = on(130.41), FORREST = on(128.11), LOONGANA = on(127.03);
const STRAIGHT: LonLat[] = [EAST, WEST];

const LINE: LonLat[] = [
  [151.21, -33.88], [150.69, -33.75], [150.31, -33.71], [150.16, -33.48], [149.58, -33.42], [149.1, -33.28], [148.18, -33.14], [147.15, -33.09],
  [144.3, -32.9], [142.42, -32.39], [141.47, -31.95], [141.0, -32.08], [138.84, -32.97], [138.21, -33.35],
  [138.59, -34.92], [138.21, -33.35],                                                 // to Adelaide and back to Crystal Brook
  [138.01, -33.18], [137.77, -32.49], [136.8, -31.25], [134.57, -30.71], [131.83, -30.45], EAST, COOK, FORREST, LOONGANA, WEST,
  [125.33, -31.01], [123.57, -31.03], [121.47, -30.75], [119.33, -31.23], [118.28, -31.48], [116.67, -31.65], [115.88, -31.95],
];

const STOPS = [
  {lon: 151.21, lat: -33.88, name: 'Sydney', note: 'NSW'},
  {lon: 141.47, lat: -31.95, name: 'Broken Hill', note: 'NSW'},
  {lon: 138.59, lat: -34.92, name: 'Adelaide', note: 'SA'},
  {lon: COOK[0], lat: COOK[1], name: 'Cook', note: 'SA'},
  {lon: 121.47, lat: -30.75, name: 'Kalgoorlie', note: 'WA'},
  {lon: 115.88, lat: -31.95, name: 'Perth', note: 'WA'},
];
/** The states the line crosses */
const STATES = {'AU-NSW': 1, 'AU-SA': 1, 'AU-WA': 1};

function Map() {
  const draw = useProp('draw', 0), told = useProp('told', 0);
  return (
    <Atlas lon={useProp('lon', 70)} lat={useProp('lat', -8)} zoom={useProp('zoom', 0)} follow={LINE} followAt={draw} followMix={useProp('mix', 0)}
      under={<Regions values={STATES} max={2} reach={LINE} fill={draw} dim={useProp('dim', 0)} />}>
      <Place lon={130} lat={-34.9} name="Great Australian Bight" kind="water" size={32} zoomIn={1.6} zoomOut={3.4} show={useProp('bight', 0)} />
      <Place lon={146.4} lat={-30.2} name="New South Wales" kind="region" zoomIn={1.6} zoomOut={3.6} show={useProp('nsw', 0)} />
      <Place lon={135.6} lat={-27.6} name="South Australia" kind="region" zoomIn={1.6} zoomOut={3.6} show={useProp('sa', 0)} />
      <Place lon={120} lat={-25} name="Western Australia" kind="region" zoomIn={1.6} zoomOut={3.6} show={useProp('wa', 0)} />
      <Route path={LINE} draw={draw} told={told} head={useProp('head', 1)} />
      <Route path={STRAIGHT} draw={useProp('straight', 0)} head={useProp('headS', 1)} />
      <Legend title="States on the line" steps={[{value: 1, label: 'crossed'}]} max={2} shown={useProp('keys', 0)} paths={[{label: 'Indian Pacific', told}]} source="Natural Earth" x={96} y={96} show={useProp('legend', 0)} />
      <Stops stops={STOPS} reach={LINE} reached={draw} title="Indian Pacific" x={1404} y={96} show={useProp('stops', 0)} />
      <Place lon={130.9} lat={-29.55} name="South Australia" kind="region" zoomIn={4.2} show={useProp('close', 0)} />
      <Place lon={128.3} lat={-29.55} name="Western Australia" kind="region" zoomIn={4.2} show={useProp('close', 0)} />
      <Place lon={131.83} lat={-30.45} name="Ooldea" side="above" zoomIn={4.2} zoomOut={6} show={useProp('close', 0)} />
      <Place lon={COOK[0]} lat={COOK[1]} name="Cook" side="above" zoomIn={4.2} zoomOut={6} show={useProp('close', 0)} />
      <Place lon={FORREST[0]} lat={FORREST[1]} name="Forrest" side="above" zoomIn={4.2} zoomOut={6} show={useProp('close', 0)} />
      <Place lon={LOONGANA[0]} lat={LOONGANA[1]} name="Loongana" side="above" zoomIn={4.2} zoomOut={6} show={useProp('close', 0)} />
      <Gloss word="Nullarbor" origin="from Latin · nullus arbor" meaning="no tree" x={600} y={640} show={useProp('gloss', 0)} />
      <Note value={useProp('km', 0)} unit="km" label="Sydney to Perth by rail" x={120} y={130} show={useProp('kmShow', 0)} />
      <Note value={useProp('flat', 0)} unit="km" label="without a bend: the longest railway straight on Earth" x={96} y={130} accent show={useProp('flatShow', 0)} />
      <Locator x={1680} y={250} r={112} show={useProp('locator', 1)} />
      <Place lon={129.2} lat={-30.73} name="The long straight" kind="point" side="right" size={34} zoomOut={3.2} show={useProp('point', 0)} ripple={useProp('ripple', 0)} />
      <Plate kicker="Australia · the Indian Pacific" title="Ocean to ocean by rail" x={1010} y={110} size={78} show={useProp('title', 0)} />
      <Plate kicker="The Nullarbor · 30.7° S, 129.2° E" title="478 km without a bend" size={80} show={useProp('end', 0)} />
    </Atlas>
  );
}

export default <Doc
  id="field-atlas-sample"
  title="Ocean to ocean by rail"
  lang="en"
  canvas="16x9"
  theme="visotalk/light"
  tokens={{
    colors: {bg: '#ECE7DC', panel: '#FAF7EF', panel2: '#D3E1E3', border: '#A99D8B', text: '#22262B', muted: '#646A70', faint: '#DCD5C7', data: '#C23B26', grad: '#B98432', op: '#5F8A99', good: '#5E8A57', bad: '#B33A2B', warn: '#C98A2E'},
    fonts: {sans: '"Hanken Grotesk", "Noto Sans SC", sans-serif', mono: '"JetBrains Mono", monospace', display: '"Newsreader", "Noto Serif SC", serif'},
    caption: {font: 'sans', size: 34, weight: 500, color: '#22262B', background: 'rgba(250, 247, 239, 0.94)', radius: 2, padding: [10, 24], bottom: 56, maxWidth: 1240, shadow: '0 1px 2px rgba(34, 38, 43, 0.18)', rule: '#22262B', ruleSide: 'left'},
  }}
  pacing={{lead: 0.4, hold: 0.5, tail: 1}}
  exports={{captions: 'burned'}}
>
  <Part id="map">{() => <Map />}</Part>

  <Scene id="across" title="Coast to coast">
    <Line id="l1" text="The Indian Pacific runs from Sydney to Perth, from one ocean to the other.">The Indian Pacific runs from Sydney to Perth, from one ocean to the other.</Line>
    <Line id="l2" text="On the way it stops at Broken Hill, Adelaide, Cook and Kalgoorlie, across three states.">On the way it stops at Broken Hill, Adelaide, Cook and Kalgoorlie, across three states.</Line>
    <Line id="l3" text="4,352 kilometres, in about three days." hold={0.6}>Four thousand, three hundred and fifty-two kilometres, in about three days.</Line>
    <Animation>
      <Appear target="map" at="start" dur={0.6} />
      <Tween target="map" to={{title: 1}} at="start" offset={0.3} dur={1.4} easing="easeOutSine" />
      <Tween target="map" to={{lon: 133.5, lat: -28.2, zoom: 1.95}} at="start" until={{line: "l1", word: "Sydney"}} easing="easeInOutSine" />
      <Tween target="map" to={{title: 0}} line="l1" word="Sydney" dur={0.8} easing="easeInSine" />
      <Tween target="map" to={{stops: 1, nsw: 1}} line="l1" word="Sydney" dur={0.6} easing="easeOutSine" />
      <Tween target="map" to={{legend: 1, keys: 1}} line="l1" word="Perth" dur={0.8} easing="easeOutSine" />
      <Tween target="map" to={{draw: 1}} line="l1" word="runs" until={{line: "l2", edge: "end"}} easing="easeInOutSine" />
      <Tween target="map" to={{mix: 0.3}} line="l1" word="runs" dur={1.2} easing="easeInOutSine" />
      <Tween target="map" to={{sa: 1, bight: 1}} line="l2" word="Adelaide" dur={0.6} easing="easeOutSine" />
      <Tween target="map" to={{wa: 1}} line="l2" word="three states" dur={0.6} easing="easeOutSine" />
      <Tween target="map" to={{mix: 0, head: 0}} line="l2" edge="end" dur={1.2} easing="easeInOutSine" />
      <Tween target="map" to={{legend: 0}} line="l3" dur={0.6} easing="easeInSine" />
      <Tween target="map" to={{kmShow: 1}} line="l3" dur={0.6} easing="easeOutSine" />
      <Tween target="map" to={{km: 4352}} line="l3" dur={1.4} easing="easeOutQuart" />
    </Animation>
  </Scene>

  <Scene id="plain" title="The plain with no trees">
    <Line id="l4" text="Halfway across, it reaches the Nullarbor.">Halfway across, it reaches the Nullarbor.</Line>
    <Line id="l5" text="The name is Latin for no tree.">The name is Latin for no tree.</Line>
    <Line id="l6" text="And here the track runs dead straight for 478 kilometres, the longest railway straight on Earth." hold={0.8}>And here the track runs dead straight for four hundred and seventy-eight kilometres, the longest railway straight on Earth.</Line>
    <Animation>
      <Tween target="map" to={{kmShow: 0, stops: 0, nsw: 0, sa: 0, wa: 0, bight: 0, told: 1}} line="l4" dur={0.8} easing="easeInSine" />
      <Tween target="map" to={{lon: 129.2, lat: -30.75}} line="l4" until={{line: "l4", edge: "end", offset: 0.4}} easing="easeInOutSine" />
      <Tween target="map" to={{zoom: 5.0, dim: 1}} line="l4" offset={0.3} until={{line: "l4", edge: "end", offset: 0.8}} easing="easeInOut" />
      <Tween target="map" to={{close: 1}} line="l4" word="Nullarbor" dur={0.8} easing="easeOutSine" />
      <Tween target="map" to={{gloss: 0.5}} line="l4" word="Nullarbor" dur={0.8} easing="easeOutSine" />
      <Tween target="map" to={{gloss: 1}} line="l5" word="no tree" dur={0.7} easing="easeOutSine" />
      <Tween target="map" to={{straight: 1}} line="l6" word="dead straight" dur={1.6} easing="easeInOutSine" />
      <Tween target="map" to={{headS: 0}} line="l6" word="kilometres" dur={0.6} />
      <Tween target="map" to={{flatShow: 1}} line="l6" word="four hundred" dur={0.6} easing="easeOutSine" />
      <Tween target="map" to={{flat: 478}} line="l6" word="four hundred" dur={1.2} easing="easeOutQuart" />
    </Animation>
  </Scene>

  <Scene id="out" title="One line">
    <Line id="l7" text="From far enough away, it is one straight line across a continent." hold={1.4}>From far enough away, it is one straight line across a continent.</Line>
    <Animation>
      <Tween target="map" to={{flatShow: 0, gloss: 0, close: 0, locator: 0}} line="l7" dur={0.6} easing="easeInSine" />
      <Tween target="map" to={{lon: 131.5, lat: -24, zoom: 0.35, dim: 0}} line="l7" until={{line: "l7", edge: "end"}} easing="easeInOutSine" />
      <Tween target="map" to={{point: 1}} line="l7" word="one straight line" dur={0.8} easing="easeOutBack(1.6)" />
      <Tween target="map" to={{ripple: 1}} line="l7" word="one straight line" offset={0.2} dur={2.2} easing="linear" />
      <Tween target="map" to={{lon: 140}} line="l7" edge="end" until="end" easing="linear" />
      <Tween target="map" to={{end: 1}} line="l7" edge="end" offset={-0.2} dur={1.2} easing="easeOutSine" />
    </Animation>
  </Scene>
</Doc>;
