// A small, complete document: the skeleton only (lines, parts, animation). Each picture is drawn in its own file under parts/.
import {Doc, Scene, Line, Part, Animation, Appear, Tween, Set} from '@visotalk/jsx';
import {Count} from './parts/count.tsx';
import {Orbit} from './parts/orbit.tsx';
import {Label} from './parts/label.tsx';

export default <Doc id="halley" title="Halley's Comet" lang="en" theme="visotalk/dark" canvas="16x9">
  <Scene id="return">
    <Line id="l1">Every seventy-six years or so, one comet comes back to the inner Solar System.</Line>
    <Line id="l2" hold={0.6}>Edmond Halley predicted its return in seventeen fifty-eight.</Line>

    <Part id="kicker" x={160} y={120} w={1200} h={72}><Label>Halley's Comet</Label></Part>
    <Part id="years" x={160} y={220} w={900} h={420}><Count unit="years" /></Part>
    <Part id="note" x={160} y={680} w={1200} h={80}><Label size={44}>Predicted in 1705 · seen again in 1758</Label></Part>
    <Animation>
      <Appear target="kicker" at="start" />
      <Appear target="years" line="l1" word="seventy-six years" />
      <Tween target="years" to={{value: 76}} line="l1" word="seventy-six years" dur={1.6} />
      <Appear target="note" line="l2" word="predicted" />
    </Animation>
  </Scene>

  <Scene id="orbit">
    <Line id="l3">Its path is a long ellipse that reaches past Neptune.</Line>
    <Line id="l4" hold={1}>It is close to the Sun for only a few months of each lap.</Line>

    <Part id="orbit" x={160} y={100} w={1600} h={760}><Orbit /></Part>
    <Animation>
      <Appear target={["orbit", "sun"]} at="start" />
      <Tween target="orbit" to={{draw: 1}} line="l3" word="long ellipse" dur={2} />
      <Appear target="neptune" line="l3" word="Neptune" />
      <Set target="orbit" to={{comet: 0}} at="start" />
      <Tween target="orbit" to={{comet: 1}} line="l4" word="close to the Sun" dur={2.5} />
    </Animation>
  </Scene>
</Doc>;
