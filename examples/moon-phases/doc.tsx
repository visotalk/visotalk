import {Doc, Scene, Line, Part, Animation, Appear, Disappear, Tween, Set} from '@visotalk/jsx';
import {useProp} from '@visotalk/runtime';
import {PhaseDiscs, usePalette} from './components/moon.tsx';
import {Days, Earth, Ghosts, Moon, Orbit, PhaseName, Rays, Rim, Shadow, Sightline, Sun, View, Yesterday} from './components/orrery.tsx';

/** The small text parts: a scene's kicker and a note under it. A note's words can be changed by `<Set target="note" to={{text: "…"}}/>`. */
const Kicker = ({children}: {children: string}) => (
  <div style={{fontFamily: 'var(--vt-sans)', fontSize: 56, lineHeight: '56px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: usePalette().data}}>{children}</div>
);
const Note = ({color, children}: {color: 'data' | 'warn' | 'bad'; children: string}) => {
  const pal = usePalette();
  return <div style={{fontFamily: 'var(--vt-sans)', fontSize: 66, lineHeight: '72px', fontWeight: 700, textAlign: 'center', color: pal[color], WebkitTextStroke: `14px ${pal.ink}`, paintOrder: 'stroke fill'}}>{useProp('text', children)}</div>;
};

/**
 * Why the Moon has phases, in two looks from this one document: the dark one, and the light theme (`exports.variants`). The parts take the colours that are not theme
 * tokens from `usePalette` (components/moon.tsx), so nothing is drawn twice. The orrery (components/orrery.tsx) is a set of parts drawn from one geometry: the Sun fixed on the left, the Earth at the centre, the Moon
 * going round it, and the view of the Moon from Earth beside it. A scene's parts end with it, so each scene declares the layers it shows; they start from their base
 * props, and a Set at the start of the scene carries over what the story needs (the Moon's angle). The document moves `moon.angle` (0 new moon, 90 first quarter,
 * 180 full moon, 270 last quarter) on the words that name each phase. Within a scene a lap is written 0 to 360, then a Set puts the angle back to 0, which looks
 * the same, so every other angle in the file is a phase.
 */
export default <Doc id="moon-phases" poster={36} title="Why the Moon has phases" lang="en" theme="visotalk/dark" canvas="16x9"
  exports={{variants: [{preset: "16x9"}, {preset: "16x9", theme: "visotalk/light"}], fps: 30, captions: "burned"}}>
  <Scene id="change">
    <Line id="m1" hold={0.3}>Look up on different nights and the Moon seems to change shape: a sliver, a half, a full disc.</Line>
    <Line id="m2" hold={1}>But the Moon does not change shape. It only looks like it does.</Line>

    <Part id="t-change" x={96} y={44} w={1500} h={56}><Kicker>A month of Moons</Kicker></Part>
    <Part id="phases"><PhaseDiscs /></Part>
    <Part id="n-same" x={360} y={140} w={1200} h={72}><Note color="data">Same Moon, different light</Note></Part>
    <Animation>
      <Appear target="t-change" at="start" />
      <Appear target="phases" line="m1" word="sliver" dur={0} />
      <Appear target="sliver" line="m1" word="sliver" />
      <Appear target="half" line="m1" word="half" />
      <Appear target="full-disc" line="m1" word="full disc" />
      <Tween target="phases" to={{whole: 1}} line="m2" word="does not change shape" dur={1.4} />
      <Appear target="n-same" line="m2" word="only looks" />
    </Animation>
  </Scene>

  <Scene id="lit">
    <Line id="m3">Think of a ball held up in front of a lamp: one half is always bright.</Line>
    <Line id="m4" hold={1}>Half of the Moon is always lit by the Sun.</Line>

    <Part id="t-lit" x={96} y={44} w={1500} h={56}><Kicker>Half is always lit</Kicker></Part>
    <Part id="rays"><Rays /></Part>
    <Part id="sun"><Sun /></Part>
    <Part id="moon"><Moon /></Part>
    <Part id="rim"><Rim /></Part>
    <Part id="n-lit" x={360} y={140} w={1200} h={72}><Note color="warn">Always half lit</Note></Part>
    <Animation>
      <Appear target="t-lit" at="start" />
      <Set target="moon" to={{focus: 1}} at="start" />
      <Appear target="moon" line="m3" word="ball" dur={0.8} />
      <Appear target={["sun", "rays"]} line="m3" word="lamp" dur={1.2} />
      <Appear target="rim" line="m3" word="one half" dur={0.8} />
      <Appear target="moon-tag" line="m4" word="Moon" dur={0.5} />
      <Appear target="n-lit" line="m4" word="always lit" />
      <Appear target="sun-tag" line="m4" word="Sun" dur={0.5} />
    </Animation>
  </Scene>

  <Scene id="orbit">
    <Line id="m5" hold={1}>As the Moon circles the Earth, we see that lit half from different angles.</Line>
    <Line id="m6" hold={0.5}>At new moon, the Moon sits between the Earth and the Sun, so its lit side faces away from us.</Line>
    <Line id="m7" hold={0.5}>A week later, at first quarter, we see exactly half of the lit side.</Line>
    <Line id="m8" hold={0.5}>At full moon, the Earth is between the Sun and the Moon, so we see the whole lit face.</Line>
    <Line id="m9" hold={0.5}>In every phase the Moon is lit in just the same way. Only our viewpoint changes.</Line>
    <Line id="m10" hold={1.5}>Then the light shrinks again, through last quarter, back to new.</Line>

    <Part id="t-orbit" x={96} y={44} w={1500} h={56}><Kicker>The view from Earth</Kicker></Part>
    <Part id="orbit"><Orbit /></Part>
    <Part id="sun"><Sun /></Part>
    <Part id="earth"><Earth /></Part>
    <Part id="sightline"><Sightline /></Part>
    <Part id="ghosts"><Ghosts /></Part>
    <Part id="moon"><Moon /></Part>
    <Part id="view"><View /></Part>
    <Part id="phase-name"><PhaseName /></Part>
    <Animation>
      <Appear target={["t-orbit", "sun", "moon"]} at="start" />
      <Appear target="ghosts" line="m9" word="every phase" dur={0} />
      <Set target="orbit" to={{draw: 0}} at="start" />
      <Appear target="orbit" line="m5" word="circles" dur={0.3} />
      <Tween target="orbit" to={{draw: 1}} line="m5" word="circles" dur={1.2} />
      <Appear target="earth" line="m5" word="Earth" />
      <Appear target={["view", "sightline"]} line="m5" word="lit half" dur={0.8} />
      <Tween id="lap1" target="moon" to={{angle: 360}} line="m5" word="lit half" dur={3.5} />
      <Set target="moon" to={{angle: 0}} after="lap1" />

      <Appear target="phase-name" line="m6" word="new moon" />
      <Tween target="sightline" to={{emphasis: 1}} line="m6" word="between the Earth and the Sun" dur={1.2} />
      <Tween target="moon" to={{glow: 1}} line="m6" word="faces away" dur={0.8} />

      <Tween target="sightline" to={{emphasis: 0}} line="m7" word="week" dur={0.4} />
      <Tween target="moon" to={{angle: 90}} line="m7" word="week later" dur={2} />
      <Set target="phase-name" to={{text: "First quarter"}} line="m7" word="first quarter" />
      <Tween target="sightline" to={{emphasis: 1}} line="m7" word="exactly half" dur={0.6} />

      <Set target="phase-name" to={{text: "Full moon"}} line="m8" word="full moon" />
      <Tween target="sightline" to={{emphasis: 0}} line="m8" word="full moon" dur={0.4} />
      <Tween target="moon" to={{angle: 180}} line="m8" word="between" dur={2.2} />
      <Tween target="sightline" to={{emphasis: 1}} line="m8" word="see the whole" dur={1} />

      <Set target="sightline" to={{emphasis: 0}} line="m9" />
      <Set target="phase-name" to={{text: "Same light"}} line="m9" />
      <Appear target={["ghost0", "ghost1", "ghost2", "ghost3", "ghost4", "ghost5", "ghost6", "ghost7"]} line="m9" word="every phase" stagger={0.12} dur={0.5} />
      <Tween target="sightline" to={{emphasis: 1}} line="m9" word="viewpoint" dur={0.8} />

      <Disappear id="ghosts-out" target={["ghost0", "ghost1", "ghost2", "ghost3", "ghost4", "ghost5", "ghost6", "ghost7"]} line="m10" word="Then" dur={0.6} />
      <Disappear target="ghosts" after="ghosts-out" dur={0} />
      <Tween target="moon" to={{angle: 270}} line="m10" word="light shrinks" dur={1.8} />
      <Set target="phase-name" to={{text: "Last quarter"}} line="m10" word="last quarter" />
      <Tween target="moon" to={{angle: 360}} line="m10" word="back to" dur={1.2} />
      <Set target="phase-name" to={{text: "New moon"}} line="m10" word="new" />
    </Animation>
  </Scene>

  <Scene id="cycle">
    <Line id="m11" text="One full cycle takes about 29.5 days." hold={1.5}>One full cycle takes about twenty nine and a half days.</Line>
    <Line id="m12" hold={2}>In between, the Moon moves a little each night, so it rises later each night.</Line>

    <Part id="t-cycle" x={96} y={44} w={1500} h={56}><Kicker>One lap</Kicker></Part>
    <Part id="orbit"><Orbit /></Part>
    <Part id="sun"><Sun /></Part>
    <Part id="earth"><Earth /></Part>
    <Part id="sightline"><Sightline /></Part>
    <Part id="yesterday"><Yesterday /></Part>
    <Part id="moon"><Moon /></Part>
    <Part id="view"><View /></Part>
    <Part id="days"><Days /></Part>
    <Part id="n-late" x={360} y={140} w={1200} h={72}><Note color="warn">Rises later each night</Note></Part>
    <Animation>
      <Appear target={["t-cycle", "orbit", "sun", "earth", "sightline", "moon", "view"]} at="start" />
      <Tween id="lap2" target="moon" to={{angle: 360}} line="m11" word="One full cycle" dur={4} />
      <Set target="moon" to={{angle: 0}} after="lap2" />
      <Appear target="days" line="m11" word="twenty nine" dur={0.3} />
      <Tween target="days" to={{value: 29.5}} line="m11" word="twenty nine" dur={2.2} />

      {/* one night is 360 / 29.5 = 12.2 degrees of the orbit */}
      <Appear target="yesterday" line="m12" word="moves a little" />
      <Tween target="moon" to={{angle: 12.2}} line="m12" word="moves a little" dur={1.4} />
      <Appear target="n-late" line="m12" word="rises later" />
    </Animation>
  </Scene>

  <Scene id="side">
    <Line id="m13" hold={0.5}>And we always see the same side of the Moon, whatever the phase.</Line>
    <Line id="m14" hold={1.5}>It is not the Earth's shadow. That only happens in a lunar eclipse, which is much rarer.</Line>

    <Part id="t-side" x={96} y={44} w={1500} h={56}><Kicker>Not what you might think</Kicker></Part>
    <Part id="orbit"><Orbit /></Part>
    <Part id="shadow"><Shadow /></Part>
    <Part id="sun"><Sun /></Part>
    <Part id="earth"><Earth /></Part>
    <Part id="sightline"><Sightline /></Part>
    <Part id="moon"><Moon /></Part>
    <Part id="view"><View /></Part>
    <Part id="n-side" x={360} y={140} w={1200} h={72}><Note color="warn">Same face, every night</Note></Part>
    <Part id="n-ecl" x={360} y={140} w={1200} h={72}><Note color="bad">Lunar eclipse</Note></Part>
    <Animation>
      <Appear target={["t-side", "orbit", "shadow", "sun", "earth", "sightline", "moon", "view"]} at="start" />
      <Tween id="lap3" target="moon" to={{angle: 360}} line="m13" word="always see" dur={4} />
      <Set target="moon" to={{angle: 0}} after="lap3" />
      <Tween target="moon" to={{face: 1}} line="m13" word="same side" dur={0.6} />
      <Appear target="n-side" line="m13" word="whatever the phase" />

      <Disappear id="side-off" target="n-side" line="m14" word="happens" dur={0.4} />
      <Tween target="shadow" to={{reach: 1}} line="m14" word="shadow" dur={1.4} />
      <Appear target="n-ecl" after="side-off" />
      <Tween target="moon" to={{angle: 180}} line="m14" word="lunar eclipse" dur={2.4} />
      <Set target="n-ecl" to={{text: "Lunar eclipse: rare"}} line="m14" word="much rarer" />
    </Animation>
  </Scene>

  <Scene id="geometry">
    <Line id="m15" hold={2.5}>So the phases are just geometry: where the Moon is, and where we are looking from.</Line>

    <Part id="t-geo" x={96} y={44} w={1500} h={56}><Kicker>Just geometry</Kicker></Part>
    <Part id="orbit"><Orbit /></Part>
    <Part id="sun"><Sun /></Part>
    <Part id="earth"><Earth /></Part>
    <Part id="sightline"><Sightline /></Part>
    <Part id="moon"><Moon /></Part>
    <Part id="view"><View /></Part>
    <Animation>
      <Appear target={["t-geo", "orbit", "sun", "earth", "sightline", "moon", "view"]} at="start" />
      <Set target="moon" to={{angle: 180}} at="start" />
      <Tween target="moon" to={{angle: 225}} line="m15" word="where the Moon is" dur={1.4} />
      <Set target="moon" to={{text: "Position"}} line="m15" word="where the Moon is" />
      <Tween target="sightline" to={{emphasis: 1}} line="m15" word="where we are looking from" dur={1} />
      <Set target="earth" to={{text: "Viewpoint"}} line="m15" word="where we are looking from" />
    </Animation>
  </Scene>
</Doc>;
