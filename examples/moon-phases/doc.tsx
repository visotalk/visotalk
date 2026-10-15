import {Appear, Beat, CountUp, Counter, Disappear, Doc, Line, Scene, Set, Text, Tween} from '@visotalk/jsx';
import {Phases} from "./components/phases.ts";
import {Orb} from "./components/orb.ts";

/**
 * Why the Moon has phases. One orrery component (Orb) carries the story from a ball in front of a lamp to the Sun, Earth, Moon geometry;
 * the document moves its numeric props on the words that name each part.
 */
export default <Doc
  spec="0.4.0"
  id="moon-phases"
  title="Why the Moon has phases"
  lang="en"
  theme="visotalk/dark"
  canvas="16x9"
  exports={{variants: [{preset: "16x9"}], fps: 30, captions: "burned", credits: "none"}}
>
  <Text id="t-change" text="A month of Moons" style="kicker"/>
  <Text id="t-lit" text="Half is always lit" style="kicker"/>
  <Text id="t-orbit" text="The view from Earth" style="kicker"/>
  <Text id="t-cycle" text="One lap" style="kicker"/>
  <Text id="t-side" text="Not what you might think" style="kicker"/>
  <Text id="t-geo" text="Just geometry" style="kicker"/>

  <Phases id="ph" shown={0} whole={0}/>
  <Text id="n-same" text="Same Moon, different light" style="caption" look={{size: 44, color: "data"}}/>

  <Orb id="orb" sun={0} ball={0} focus={1} rim={0} earth={0} orbit={0} rays={0} tagSun={0} tagMoon={0} tagEarth={0} tagPos={0} tagView={0}
    view={0} angle={0} align={0} glow={0.6} ghosts={0} gOne={0} gAngle={0} face={0} shadow={0} sight={0}/>
  <Text id="n-lit" text="Always half lit" style="caption" look={{size: 44, color: "warn"}}/>
  <Text id="tag" text="New moon" style="caption" look={{size: 48, color: "data", weight: 700}}/>
  <Counter id="days" value={29.5} format="0.0" unit="days" style="data" scale={0.55}/>
  <Text id="n-late" text="Rises later each night" style="caption" look={{size: 44, color: "warn"}}/>
  <Text id="n-side" text="Same face, every night" style="caption" look={{size: 44, color: "warn"}}/>
  <Text id="n-ecl" text="Lunar eclipse" style="caption" look={{size: 48, color: "bad", weight: 700}}/>

  <Scene id="change" pattern="stage" slots={{title: "t-change", main: "ph"}}>
    <Beat id="b1" hold={0.3}>
      <Appear on="t-change" at="start"/>
      <Line id="m1">Look up on different nights and the Moon seems to change shape: a <Tween id="s1" on="ph" shown={1} dur={0.7}>sliver</Tween>, a <Tween on="ph" shown={2} dur={0.7}>half</Tween>, a <Tween on="ph" shown={3} dur={0.7}>full disc</Tween>.</Line>
    </Beat>
    <Beat id="b2" slots={{note: "n-same"}} hold={1}>
      <Line id="m2">But the Moon <Tween on="ph" whole={1} dur={1.4}>does not change shape</Tween>. It <Appear on="n-same">only looks</Appear> like it does.</Line>
    </Beat>
  </Scene>

  <Scene id="lit" pattern="stage" slots={{title: "t-lit", main: "orb"}}>
    <Beat id="b3">
      <Appear on="t-lit" at="start"/>
      <Line id="m3">Think of a <Tween on="orb" ball={1} dur={0.8}>ball</Tween> held up in front of a <Tween on="orb" sun={1} rays={1} dur={1.2}>lamp</Tween>: <Tween on="orb" rim={1} dur={1.2}>one half</Tween> is always bright.</Line>
    </Beat>
    <Beat id="b4" slots={{note: "n-lit"}} hold={1}>
      <Line id="m4">Half of the <Tween on="orb" tagMoon={1} dur={0.5}>Moon</Tween> is <Appear on="n-lit">always lit</Appear> by the <Tween on="orb" tagSun={1} dur={0.5}>Sun</Tween>.</Line>
    </Beat>
  </Scene>

  <Scene id="orbit" pattern="stage" slots={{title: "t-orbit", main: "orb"}}>
    <Beat id="b5" hold={1}>
      <Tween on="orb" rim={0} line="m5" word="circles" dur={0.5}/>
      <Line id="m5">As the Moon <Tween on="orb" orbit={1} earth={1} dur={1.2}>circles</Tween> the <Tween on="orb" focus={0} tagEarth={1} dur={1.4}>Earth</Tween>, we see that <Tween on="orb" view={1} dur={0.8}>lit half</Tween> from <Tween on="orb" angle={360} dur={3.5} easing="easeInOut">different angles</Tween>.</Line>
    </Beat>
    <Beat id="b6" slots={{note: "tag"}} hold={0.5}>
      <Line id="m6">At <Appear on="tag">new moon</Appear>, the Moon sits <Tween on="orb" align={1} dur={1.2}>between the Earth and the Sun</Tween>, so its lit side <Tween on="orb" glow={1} dur={0.8}>faces away</Tween> from us.</Line>
    </Beat>
    <Beat id="b7" hold={0.5}>
      <Tween on="orb" align={0} line="m7" word="week" dur={0.4}/>
      <Line id="m7">A <Tween on="orb" angle={450} dur={2} easing="easeInOut">week later</Tween>, at <Set on="tag" text="First quarter">first quarter</Set>, we see <Tween on="orb" sight={1} dur={0.6}>exactly half</Tween> of the lit side.</Line>
    </Beat>
    <Beat id="b8" hold={0.5}>
      <Line id="m8">At <Set on="tag" text="Full moon">full moon</Set>, the Earth is <Tween on="orb" angle={540} dur={2.2} easing="easeInOut">between</Tween> the Sun and the Moon, so we <Tween on="orb" align={1} dur={1}>see the whole</Tween> lit face.</Line>
    </Beat>
    <Beat id="b9" hold={0.5}>
      <Tween on="orb" align={0} line="m9" word="In" dur={0.4}/>
      <Set on="orb" sight={0} at="start"/>
      <Set on="tag" text="Same light" at="start"/>
      <Line id="m9">In <Tween on="orb" ghosts={1} dur={1.4}>every phase</Tween> the Moon is lit in just the same way. Only our <Tween on="orb" sight={1} dur={0.8}>viewpoint</Tween> changes.</Line>
    </Beat>
    <Beat id="b10" hold={1.5}>
      <Tween on="orb" ghosts={0} line="m10" word="Then" dur={0.6}/>
      <Line id="m10">Then the <Tween on="orb" angle={630} dur={1.8} easing="easeInOut">light shrinks</Tween> again, through <Set on="tag" text="Last quarter">last quarter</Set>, <Tween id="back" on="orb" angle={720} dur={1.2} easing="easeInOut">back to</Tween> <Set on="tag" text="New moon">new</Set>.</Line>
    </Beat>
  </Scene>

  <Scene id="cycle" pattern="stage" slots={{title: "t-cycle", main: "orb"}}>
    <Beat id="b11" slots={{note: "days"}} hold={1.5}>
      <Tween on="orb" angle={1080} line="m11" word="One full cycle" dur={5} easing="easeInOut"/>
      <Appear on="days" line="m11" word="twenty nine"/>
      <Line id="m11">One full cycle takes about <CountUp on="days" dur={2.2}>twenty nine and a half</CountUp> days.</Line>
    </Beat>
    <Beat id="b12" slots={{note: "n-late"}} hold={2}>
      <Set on="orb" gAngle={1080} at="start"/>
      <Line id="m12">In between, the Moon <Tween on="orb" gOne={1} angle={1095} dur={1.4}>moves a little</Tween> each night, so it <Appear on="n-late">rises later</Appear> each night.</Line>
    </Beat>
  </Scene>

  <Scene id="side" pattern="stage" slots={{title: "t-side", main: "orb"}}>
    <Beat id="b13" slots={{note: "n-side"}} hold={0.5}>
      <Tween on="orb" gOne={0} line="m13" word="And" dur={0.4}/>
      <Tween on="orb" angle={1455} line="m13" word="always see" dur={4} easing="easeInOut"/>
      <Line id="m13">And we always see the <Tween on="orb" face={1} dur={0.6}>same side</Tween> of the Moon, <Appear on="n-side">whatever the phase</Appear>.</Line>
    </Beat>
    <Beat id="b14" slots={{note: "n-ecl"}} hold={1.5}>
      <Appear on="n-ecl" line="m14" word="lunar eclipse"/>
      <Line id="m14">It is not the <Tween on="orb" shadow={1} dur={1.4}>Earth's shadow</Tween>. That only happens in a <Tween on="orb" angle={1620} dur={2.4} easing="easeInOut">lunar eclipse</Tween>, which is <Set on="n-ecl" text="Lunar eclipse: rare">much rarer</Set>.</Line>
    </Beat>
  </Scene>

  <Scene id="geometry" pattern="stage" slots={{title: "t-geo", main: "orb"}}>
    <Beat id="b15" hold={2.5}>
      <Tween on="orb" shadow={0} line="m15" word="So" dur={0.8}/>
      <Line id="m15">So the phases are just geometry: <Tween on="orb" tagPos={1} angle={1665} dur={1.4}>where the Moon is</Tween>, and <Tween on="orb" tagView={1} sight={1} dur={1}>where we are looking from</Tween>.</Line>
    </Beat>
  </Scene>
</Doc>;
