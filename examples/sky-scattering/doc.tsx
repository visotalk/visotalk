import {Doc, Scene, Line, Part, Animation, Appear, Disappear, Tween, Set} from '@visotalk/jsx';
import {SkyPanel, SunDisc} from './parts/skies.tsx';
import {Prism, Band} from './parts/prism.tsx';
import {Waves} from './parts/waves.tsx';
import {AirField, Redirect} from './parts/air.tsx';
import {Counts, Zigzag} from './parts/counts.tsx';
import {Dome} from './parts/dome.tsx';
import {VioletCard} from './parts/violet.tsx';
import {Paths} from './parts/paths.tsx';
import {TwoSkies} from './parts/twoskies.tsx';

export default <Doc id="sky-scattering" poster={115} title={"Why the sky is blue and sunsets are red"} lang={"en"} voice={"af_heart"} theme="visotalk/dark" canvas="16x9">
  <Scene id="two-skies" title="Two skies, one Sun">
    <Line id="l1">Look up on a clear day and the sky is blue.</Line>
    <Line id="l2">Stay out until evening and it turns orange, then red.</Line>
    <Line id="l3">Yet sunlight itself is white, whatever the hour.</Line>
    <Line id="l4">So where do those colours come from?</Line>

    <Part id="sky" x={0} y={0} w={1920} h={900}><SkyPanel /></Part>
    <Part id="sun" x={1180} y={110} w={300} h={300}><SunDisc /></Part>
    <Animation>
      <Appear target="sky" line="l1" word="sky" />
      <Appear target="sun" line="l1" word="sky" />
      <Tween target="sky" to={{phase: 1}} line="l2" word="orange" dur={2.6} easing="easeInOut" />
      <Tween target="sky" to={{grey: 1}} line="l3" word="white" dur={1.6} easing="easeInOut" />
      <Tween target="sun" to={{scale: 1.25}} line="l3" word="white" dur={1.6} easing="easeOut" />
      <Disappear target="sky" line="l4" word="colours" dur={1.2} />
    </Animation>
  </Scene>

  <Scene id="mixture" title="White is a mixture">
    <Line id="l5">Sunlight looks white, but white is not a colour of its own.</Line>
    <Line id="l6">It is a mixture of every colour we can see, all travelling together.</Line>
    <Line id="l7">A prism shows this: it spreads the mixture into a band.</Line>
    <Line id="l8">Red at one end, then orange, yellow, green, blue and violet.</Line>

    <Part id="band" x={0} y={180} w={1920} h={720}><Band /></Part>
    <Part id="prism" x={160} y={150} w={1600} h={660}><Prism /></Part>
    <Animation>
      <Appear target="band" line="l5" word="sunlight" dur={0} />
      <Tween target="band" to={{open: 1}} line="l6" word="every colour" dur={1.6} easing="easeInOut" />
      <Disappear target="band" line="l7" word="prism" dur={0.6} />
      <Appear target="prism" line="l7" word="prism" dur={0} />
      <Appear target="beamin" line="l7" word="prism" dur={0.5} />
      <Appear target={["ray-red", "ray-orange", "ray-yellow", "ray-green", "ray-blue", "ray-violet"]} line="l7" word="spreads" dur={0.5} stagger={0.04} />
      <Appear target="glass" line="l7" word="prism" dur={0.8} />
      <Tween target="prism" to={{fan: 1}} line="l7" word="spreads" dur={1.6} easing="easeInOut" />
      <Appear target={["lab-red", "lab-orange", "lab-yellow", "lab-green", "lab-blue", "lab-violet"]} line="l8" word="red" stagger={0.05} dur={0.4} />
    </Animation>
  </Scene>

  <Scene id="wave" title="Every colour is a wave">
    <Line id="l9">Each colour is a wave, and they differ only in the gap between one crest and the next.</Line>
    <Line id="l10">Red waves are stretched out, blue ones squeezed tight, but all travel at the same speed.</Line>

    <Part id="waves" x={160} y={150} w={1600} h={620}><Waves /></Part>
    <Animation>
      <Appear target={["waves", "wave-red"]} line="l9" word="wave" dur={0.1} />
      <Tween target="waves" to={{gap: 1}} line="l9" word="gap between" dur={1.4} easing="easeOut" />
      <Appear target="wave-blue" line="l10" word="blue ones" dur={0.9} />
    </Animation>
  </Scene>

  <Scene id="air" title="Air, and what it does to light">
    <Line id="l11">Now put something in the way: air.</Line>
    <Line id="l12">Air looks empty, but it teems with molecules far smaller than dust.</Line>
    <Line id="l13">Sunlight has to cross them to reach your eyes.</Line>
    <Line id="l14">When a wave meets one of these small molecules, it is redirected.</Line>
    <Line id="l15">We say the light is scattered.</Line>

    <Part id="airfield" x={160} y={170} w={1600} h={620}><AirField /></Part>
    <Part id="redirect" x={160} y={170} w={1600} h={620}><Redirect /></Part>
    <Animation>
      <Appear target="airfield" line="l11" word="air" dur={0} />
      <Tween target="airfield" to={{mols: 1}} line="l12" word="molecules" dur={1.6} />
      <Tween target="airfield" to={{beam: 1}} line="l13" word="cross" dur={1.4} easing="easeOut" />
      <Appear target="eye" line="l13" word="eyes" dur={0.5} />
      <Disappear target="airfield" line="l14" word="when a wave" dur={0.6} />
      <Appear target="redirect" line="l14" word="when a wave" dur={0} />
      <Tween target="redirect" to={{out: 1}} line="l14" word="redirected" dur={1.2} />
      <Tween target="redirect" to={{many: 1}} line="l15" word="scattered" dur={0.5} />
      <Tween target="redirect" to={{out: 0}} line="l15" word="scattered" dur={1.0} />
    </Animation>
  </Scene>

  <Scene id="unequal" title="Blue scatters most, so the sky fills with it">
    <Line id="l16">Not all colours scatter equally.</Line>
    <Line id="l17">A short wave is turned aside much more often than a long one.</Line>
    <Line id="l18">Blue and violet scatter several times more than red.</Line>
    <Line id="l19">So the blue part of sunlight is bounced around the sky.</Line>
    <Line id="l20">Some of it ends up coming at you from every direction at once.</Line>
    <Line id="l21">That is what you see when you look away from the Sun.</Line>
    <Line id="l22">Violet scatters even more, but there is less of it and our eyes barely notice.</Line>

    <Part id="counts" x={160} y={190} w={1600} h={620}><Counts /></Part>
    <Part id="dome" x={160} y={150} w={1600} h={660}><Dome /></Part>
    <Part id="violet-card" x={1290} y={12} w={610} h={198} z={2}><VioletCard /></Part>
    <Animation>
      <Appear target="counts" line="l16" word="colours" dur={0} />
      <Tween target="counts" to={{grow: 1}} line="l17" word="more often" dur={2.2} easing="easeOut" />
      <Tween target="counts" to={{grow: 1.15}} line="l18" word="several times" dur={0.8} />
      <Disappear target="counts" line="l19" word="blue part" dur={0.6} />
      <Appear target="dome" line="l19" word="blue part" dur={0} />
      <Tween target="dome" to={{fill: 1}} line="l19" word="bounced" dur={1.6} easing="easeInOut" />
      <Tween target="dome" to={{rays: 1}} line="l20" word="every direction" dur={1.4} />
      <Appear target="viewer" line="l21" word="see" dur={0.6} />
      <Tween target="dome" to={{sun: 1}} line="l21" word="away from" dur={1.4} />
      <Appear target="violet-card" line="l22" word="violet" dur={0} />
      <Tween target="violet-card" to={{scatter: 1}} line="l22" word="more" dur={0.9} easing="easeOut" />
      <Tween target="violet-card" to={{seen: 0.26}} line="l22" word="eyes" dur={0.9} easing="easeOut" />
    </Animation>
  </Scene>

  <Scene id="long-path" title="The long road at sunset">
    <Line id="l23">At midday the Sun is overhead, and its light takes the shortest route down.</Line>
    <Line id="l24">At sunset, it comes in almost flat, along the ground.</Line>
    <Line id="l25">That slanting path through the air is many times longer.</Line>
    <Line id="l26">The blue is scattered away long before it gets to you.</Line>
    <Line id="l27">The reds, which scatter little, keep going and arrive.</Line>
    <Line id="l28">Sunset is red because the blue has been scattered out of the beam on the way.</Line>

    <Part id="paths" x={160} y={110} w={1600} h={660}><Paths /></Part>
    <Animation>
      <Appear target="paths" line="l23" word="midday" dur={0} />
      <Appear target="noon" line="l23" word="midday" dur={0.8} />
      <Tween target="paths" to={{slant: 1}} line="l24" word="sunset" dur={2} easing="easeInOut" />
      <Tween target="paths" to={{lost: 1}} line="l26" word="scattered away" dur={1.4} />
      <Tween target="paths" to={{glow: 1}} line="l27" word="arrive" dur={1.2} />
    </Animation>
  </Scene>

  <Scene id="one-process" title="One process, two results">
    <Line id="l29">The blue day and the red evening are the same process.</Line>
    <Line id="l30">The longer the path, the more blue is scattered out of the beam.</Line>
    <Line id="l31">The sky is blue because the blue arrives; the sunset is red because it does not.</Line>

    <Part id="twoskies" x={0} y={120} w={1920} h={700}><TwoSkies /></Part>
    <Animation>
      <Appear target="twoskies" line="l29" word="blue day" dur={0} />
      <Tween target="twoskies" to={{rays: 1, red: 1}} line="l29" word="same process" dur={1.4} />
    </Animation>
  </Scene>
</Doc>;
