// A small, complete document: the skeleton only (lines, parts, animation). parts/kit.tsx is the film's look in code;
// each scene's picture is one part in its own file, filling the kit's frame.
// Each scene opens on its picture (at="start", a short fade after the first) and the words change it.
import {Doc, Scene, Line, Part, Animation, Appear, Tween, Set} from '@visotalk/jsx';
import {Return} from './parts/count.tsx';
import {Orbit} from './parts/orbit.tsx';

export default <Doc id="halley" title="Halley's Comet" lang="en" theme="visotalk/dark" canvas="16x9"
  tokens={{colors: {bg: '#0D1320'}, fonts: {sans: '"Inter", sans-serif', mono: '"JetBrains Mono", monospace', display: '"Newsreader", serif'}}}>
  <Scene id="return">
    <Line id="l1">Every seventy-six years or so, one comet comes back to the inner Solar System.</Line>
    <Line id="l2" hold={0.6}>Edmond Halley predicted its return in seventeen fifty-eight.</Line>

    <Part id="return"><Return /></Part>
    <Animation>
      <Appear target="return" at="start" dur={0} />
      <Tween target="return" to={{value: 76}} line="l1" word="seventy-six years" dur={1.6} easing="easeOutQuart" />
      <Appear target={["y0", "y1", "y2", "y3"]} line="l1" word="comes back" stagger={0.15} />
      <Appear target="note" line="l2" word="predicted" />
    </Animation>
  </Scene>

  <Scene id="orbit">
    <Line id="l3">Its path is a long ellipse that reaches past Neptune.</Line>
    <Line id="l4" hold={1}>It is close to the Sun for only a few months of each lap.</Line>

    <Part id="orbit"><Orbit /></Part>
    <Animation>
      <Appear target={["orbit", "sun"]} at="start" dur={0.5} />
      <Tween target="orbit" to={{draw: 1}} line="l3" word="long ellipse" dur={2} easing="easeInOutSine" />
      <Appear target="neptune" line="l3" word="Neptune" />
      <Set target="orbit" to={{comet: 0}} at="start" />
      <Tween target="orbit" to={{comet: 1}} line="l4" word="close to the Sun" dur={2.5} easing="easeInOutSine" />
    </Animation>
  </Scene>
</Doc>;
