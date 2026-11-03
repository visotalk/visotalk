// Light Bench's sample: one example among many. Do not reuse its story, scenes, layout or timings; read it for technique, after your own scenes are planned.
// The science: a prism splits white light because the index of glass depends on wavelength (dense flint SF11, by Schott's Sellmeier formula); Newton's crucial experiment, first published in 1672, sent one colour through a second prism and it stayed one colour, and a lens brought the whole spectrum back to white (Newton, Opticks, 1704). Every beam here is traced by Snell's law in parts/optics.ts; the lens is an ideal thin lens, which has no colour error.
import {Doc, Scene, Line, Part, Animation, Appear, Tween} from '@visotalk/jsx';
import {useProp} from '@visotalk/runtime';
import {Bench, onBeam, type View} from '../parts/bench.tsx';
import {WAVES, dirOf, trace, type Optic, type P2} from '../parts/optics.ts';
import {Tag} from '../parts/tag.tsx';
import {Spectrum} from '../parts/spectrum.tsx';
import {Law} from '../parts/law.tsx';
import {Angle} from '../parts/angle.tsx';
import {Heading} from '../parts/heading.tsx';

const FROM: P2 = [-6.33, -3.67], AIM = 35;
// worked out from the trace: the fan leaves the prism at (0.6, 0.35), centred on -33.4 degrees and running away from the camera, so that it lands on the face of the card we can see
const AXIS = -32.74;
const CARD: P2 = [7.114, -3.842], JAWS: P2 = [4.385, -2.087], LENS: P2 = [4.301, -2.033], SECOND: P2 = [5.329, -2.864], CARD2: P2 = [5.556, -4.912];
const EXIT: P2 = [0.6, 0.346], PRISM: Optic = {kind: 'prism', at: [0, 0], flip: true};
// how far the glass really turned each colour, as the tags and the arc state it
const turned = (i: number) => { const p = trace(FROM, dirOf(AIM), WAVES[i], [PRISM]).pts, a = p[p.length - 2], b = p[p.length - 1]; return AIM - (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI; };
const RED = +turned(0).toFixed(1), VIOLET = +turned(6).toFixed(1);

const Plate = () => {
  const view: View = {yaw: useProp('yaw', -8), pitch: useProp('pitch', 26), dist: useProp('dist', 21), tx: useProp('tx', 0.8), ty: 1, tz: useProp('tz', -1.2)};
  const optics: Optic[] = [
    PRISM,
    {kind: 'card', at: CARD, rot: AXIS, w: 3, in: useProp('card', 1)},
    {kind: 'jaws', at: JAWS, rot: AXIS, slit: 0.219, width: 0.06, close: useProp('close', 0), in: useProp('jaws', 0)},
    {kind: 'prism', at: SECOND, rot: -65.02, side: 1.6, flip: true, in: useProp('second', 0)},
    {kind: 'card', at: CARD2, rot: -95, w: 1.6, in: useProp('card2', 0)},
    {kind: 'lens', at: LENS, rot: AXIS, f: 1.9, dia: 1.7, in: useProp('lens', 0)},
  ];
  // a tag names where the light really lands, so it asks the trace
  const land = (i: number) => onBeam(trace(FROM, dirOf(AIM), WAVES[i], optics).pts.at(-1)!);
  return (
    <Bench view={view} from={FROM} aim={AIM} reach={useProp('reach', 0)} optics={optics}>
      <Tag view={view} on={[0, 2, 0.2]} at={[640, 190]} width={300} text="Dense flint glass" note="60° prism" t={useProp('tGlass', 0)} />
      <Tag view={view} on={land(0)} at={[1530, 430]} width={310} text="Red bends least" note={`turned ${RED.toFixed(1)}°`} color={WAVES[0].css} t={useProp('tRed', 0)} />
      <Tag view={view} on={land(6)} at={[640, 300]} width={380} text="Violet bends most" note={`turned ${VIOLET.toFixed(1)}°`} color={WAVES[6].css} t={useProp('tViolet', 0)} />
      <Tag view={view} on={land(0)} at={[1380, 300]} width={460} text="Still only red" note="bent again, no new colour" color={WAVES[0].css} t={useProp('tStill', 0)} />
      <Tag view={view} on={land(3)} at={[1510, 180]} width={330} text="White again" note="all seven, one spot" t={useProp('tWhite', 0)} />
      <Angle view={view} at={EXIT} from={AIM - RED} to={AIM - VIOLET} r={4} text={`${(VIOLET - RED).toFixed(1)}° apart`} t={useProp('tFan', 0)} />
      <Spectrum at={[1320, 90]} source="n of SF11 glass (Schott)" show={useProp('nums', 0)} />
      <Law at={[80, 760]} law={<>n<sub>1</sub> sin θ<sub>1</sub> = n<sub>2</sub> sin θ<sub>2</sub></>} says="Snell's law: every beam here is computed" show={useProp('law', 0)} />
    </Bench>
  );
};

export default <Doc
  id="light-bench-sample"
  title="What white light is made of"
  poster={8.6}
  lang="en"
  canvas="16x9"
  theme="visotalk/dark"
  tokens={{
    colors: {bg: '#050608', panel: '#14171C', panel2: '#23262C', border: '#5B6572', text: '#FFFFFF', muted: '#B9C2CE', faint: '#23262C', data: '#FFFFFF', grad: '#FF4A3D', op: '#4A73FF', good: '#4CE05A', bad: '#FF4A3D', warn: '#FFE23D'},
    fonts: {sans: '"Hanken Grotesk", "Noto Sans SC", sans-serif', mono: '"JetBrains Mono", "Noto Sans SC", monospace', display: '"Hanken Grotesk", "Noto Sans SC", sans-serif'},
    caption: {font: 'sans', size: 36, weight: 500, color: '#FFFFFF', background: 'rgba(5, 6, 8, 0.72)', radius: 6, padding: [8, 24], bottom: 34},
  }}
  pacing={{lead: 0.4, hold: 0.5, tail: 0.9}}
  exports={{captions: 'burned'}}
>
  <Part id="plate">{() => <Plate />}</Part>
  <Part id="head" z={3}>{() => <Heading text="What is white light made of?" size={68} show={useProp('show', 0)} />}</Part>

  <Scene id="split" title="One beam, one prism">
    <Line id="a1">White light looks like one thing. Send it through a prism,</Line>
    <Line id="a2" hold={0.8}>and it fans out into colours, because glass bends each one by a different amount.</Line>
    <Animation>
      <Appear target={['plate', 'head']} at="start" dur={0} />
      <Tween target="head" to={{show: 1}} at="start" dur={0.6} easing="linear" />
      <Tween target="plate" to={{reach: 6.6}} line="a1" word="White" dur={1.4} easing="linear" />
      <Tween target="head" to={{show: 0}} line="a1" word="Send" dur={0.5} easing="linear" />
      <Tween target="plate" to={{reach: 16.5}} line="a1" word="prism" dur={1.5} easing="linear" />
      <Tween target="plate" to={{reach: 40}} line="a2" word="and" dur={0.2} easing="linear" />
      <Tween target="plate" to={{dist: 17, yaw: -6, tx: 2.1, tz: -1.6}} line="a1" word="Send" until={{line: 'a2', edge: 'end'}} easing="easeInOutSine" />
      <Tween target="plate" to={{tGlass: 1}} line="a1" word="prism" dur={0.7} easing="linear" />
      <Tween target="plate" to={{tGlass: 0, nums: 1}} line="a2" word="fans" dur={0.6} easing="linear" />
      <Tween target="plate" to={{tRed: 1, tViolet: 1}} line="a2" word="colours" dur={0.7} easing="linear" />
      <Tween target="plate" to={{law: 1}} line="a2" word="bends" dur={0.6} easing="linear" />
      <Tween target="plate" to={{tFan: 1}} line="a2" word="different" dur={0.9} easing="linear" />
    </Animation>
  </Scene>

  <Scene id="crucial" title="Did the glass add them?">
    <Line id="b1">But did the glass make those colours? Newton tested it.</Line>
    <Line id="b2">Close a slit on just the red, and send it through a second prism.</Line>
    <Line id="b3" hold={0.8}>It bends again, but it stays red. The prism adds nothing.</Line>
    <Animation>
      <Tween target="plate" to={{tRed: 0, tViolet: 0, tFan: 0, nums: 0, law: 0}} at="start" dur={0.5} easing="linear" />
      <Tween target="plate" to={{dist: 12, yaw: 6, pitch: 38, tx: 4.8, tz: -2.8}} line="b1" word="Newton" dur={3} easing="easeInOutSine" />
      <Tween target="plate" to={{jaws: 1}} line="b1" word="Newton" dur={1} easing="easeOutQuart" />
      <Tween target="plate" to={{close: 1}} line="b2" word="Close" dur={2.2} easing="linear" />
      <Tween target="plate" to={{dist: 11, yaw: -4}} line="b2" word="Close" until={{line: 'b3', edge: 'end'}} easing="easeInOutSine" />
      <Tween target="plate" to={{card: 0}} line="b2" word="and" dur={0.8} easing="easeInOutSine" />
      <Tween target="plate" to={{second: 1, card2: 1}} line="b2" word="second" dur={1} easing="easeOutQuart" />
      <Tween target="plate" to={{tStill: 1}} line="b3" word="stays" dur={0.7} easing="linear" />
      <Tween target="plate" to={{tStill: 0}} line="b3" edge="end" offset={0.3} dur={0.4} easing="linear" />
    </Animation>
  </Scene>

  <Scene id="again" title="Back to white">
    <Line id="c1">So gather the whole fan with a lens.</Line>
    <Line id="c2" hold={1.2}>And it comes back as white.</Line>
    <Line id="c3" hold={2}>White was never one colour. It was all of them, travelling together.</Line>
    <Animation>

      <Tween target="plate" to={{second: 0, card2: 0, card: 1, close: 0}} at="start" dur={0.9} easing="easeInOutSine" />
      <Tween target="plate" to={{jaws: 0}} at="start" offset={0.7} dur={0.8} easing="easeInOutSine" />
      <Tween target="plate" to={{dist: 13, yaw: -10, pitch: 26, tx: 4.6, tz: -2.6}} at="start" dur={2.4} easing="easeInOutSine" />
      <Tween target="plate" to={{lens: 1}} line="c1" word="lens" until={{line: 'c2', word: 'comes'}} easing="easeInOutSine" />
      <Tween target="plate" to={{tWhite: 1}} line="c2" word="white" dur={0.7} easing="linear" />
      <Tween target="plate" to={{dist: 21, yaw: 8, tx: 1.6, tz: -1.6}} line="c3" word="White" dur={5} easing="easeInOutSine" />
    </Animation>
  </Scene>
</Doc>;
