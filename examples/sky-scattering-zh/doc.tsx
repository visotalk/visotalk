// Why the daytime sky is blue and sunsets are red.
import {Doc, Scene, Line, Part, Animation, Appear, Disappear, Tween, Set} from '@visotalk/jsx';
import {WhiteLight} from './parts/white-light.tsx';
import {AirField, ScatterOne, TwoWaves} from './parts/air.tsx';
import {SkyFill} from './parts/sky.tsx';
import {VioletAsk} from './parts/violet.tsx';
import {Skim, Compare} from './parts/path.tsx';

export default <Doc id="sky-scattering-zh" poster={67} title={"天空为什么是蓝的，日落为什么是红的"} lang={"zh-CN"} voice={"minimax:Chinese (Mandarin)_News_Anchor"} theme="visotalk/dark" canvas="16x9">
  <Scene id="white-light" title="白色的阳光">
    <Line id="l1" text={"阳光看起来是白色的，其实里面混着很多种颜色。"}>先看一个你每天都见到的东西：阳光。它看起来是白色的，其实里面混着很多种颜色。</Line>
    <Line id="l2" text={"让一束阳光穿过棱镜，它散成一条彩色的带子。"}>让一束阳光穿过一块棱镜，它就会散开，变成一条彩色的带子。</Line>
    <Line id="l3" text={"从红到蓝，每种颜色都在，混在一起时却看不出来。"}>从红到蓝，每一种颜色都在里面，只是混在一起的时候，我们看不出来。</Line>

    <Part id="white-light" x={110} y={70} w={1700} h={740}><WhiteLight /></Part>
    <Animation>
      <Appear target="white-light" line="l1" word="阳光" dur={0} />
      <Appear target="beam" line="l1" word="阳光" />
      <Appear target="sun" line="l1" word="阳光" />
      <Tween target="white-light" to={{beam: 1}} line="l1" word="白色的" dur={1.6} />
      <Tween target="white-light" to={{hint: 1}} line="l1" word="其实" dur={1.6} />
      <Appear target="prism" line="l2" word="棱镜" />
      <Appear target="fan" line="l2" word="散开" />
      <Tween target="white-light" to={{split: 1}} line="l2" word="散开" dur={2} easing="easeOut" />
      <Appear target="screen" line="l2" word="彩色的" />
      <Appear target="lbl-red" line="l3" word="从红到蓝" />
      <Appear target="lbl-blue" line="l3" word="到蓝" />
    </Animation>
  </Scene>

  <Scene id="air-molecules" title="空气里的分子">
    <Line id="l4" text={"这样的光射进大气，会撞上空气里无数微小的分子。"}>这样的光射进大气层，会一头撞上空气里无数微小的分子。</Line>
    <Line id="l5" text={"分子把光向四面八方弹开，这叫散射。"}>这些分子比光的波长还小，却会把光向四面八方弹开，这就是散射。</Line>
    <Line id="l6" text={"波长短的蓝光比波长长的红光更容易被弹开。"}>关键就在这里：波长短的蓝光，比波长长的红光更容易被弹开，被弹走的次数多得多。</Line>

    <Part id="air-field" x={130} y={110} w={1660} h={700}><AirField /></Part>
    <Part id="scatter-one" x={130} y={110} w={1660} h={700}><ScatterOne /></Part>
    <Part id="two-waves" x={130} y={110} w={1660} h={700}><TwoWaves /></Part>
    <Animation>
      <Appear target="air-field" line="l4" word="大气层" dur={0} />
      <Appear target="beam" line="l4" word="大气层" />
      <Appear target="lbl-air" line="l4" word="空气里" />
      <Tween target="air-field" to={{field: 1}} line="l4" word="微小的分子" dur={1.6} />
      <Tween target="air-field" to={{dim: 1}} line="l5" word="向四面八方" dur={0.8} />
      <Appear target="scatter-one" line="l5" word="向四面八方" />
      <Tween target="scatter-one" to={{reach: 1}} line="l5" word="弹开" dur={1.8} easing="easeOut" />
      <Appear target="lbl-scatter" line="l5" word="散射" />
      <Disappear target="scatter-one" line="l6" word="蓝光" />
      <Appear target="two-waves" line="l6" word="蓝光" />
      <Appear target="red-path" line="l6" word="红光" />
      <Appear target="blue-path" line="l6" word="蓝光" />
      <Appear target="lbl-blue" line="l6" word="波长短" />
      <Appear target="lbl-red" line="l6" word="波长长的" />
      <Tween target="two-waves" to={{scatter: 1}} line="l6" word="被弹开" dur={2.2} />
    </Animation>
  </Scene>

  <Scene id="blue-sky" title="为什么天是蓝的">
    <Line id="l7" text={"于是蓝光被一次次拦下，散向各个方向。"}>于是阳光穿过大气的时候，蓝光被一次次拦下来，散向各个方向。</Line>
    <Line id="l8" text={"你抬头看天，收到的正是从各处弹来的蓝光。"}>你抬头看天，眼睛收到的，正是这些从四面八方弹来的蓝光。</Line>
    <Line id="l9" text={"它来自整片天空，不只一个方向，所以天是蓝的。"}>它来自整片天空，而不是某一个方向，所以整片天看起来都是蓝的。</Line>
    <Line id="l10" text={"天空的蓝来自散射光；直射的阳光少了蓝，就显得偏黄白。切勿直视太阳。"}>天空的蓝，正是这些被弹向四面八方的光；而直射过来的阳光少了蓝，看起来就偏黄、偏白。但千万不要直视太阳，那会伤害眼睛。</Line>

    <Part id="sky" x={110} y={50} w={1700} h={740}><SkyFill /></Part>
    <Animation>
      <Appear target="sky" line="l7" word="蓝光" dur={0} />
      <Appear target="haze" line="l7" word="蓝光" />
      <Tween target="sky" to={{haze: 1}} line="l7" word="散向各个方向" dur={2.4} easing="easeOut" />
      <Appear target="eye" line="l8" word="眼睛" />
      <Appear target="to-eye" line="l8" word="四面八方" />
      <Appear target="lbl-sky" line="l9" word="整片天空" />
      <Appear target="sun" line="l10" word="直射过来" />
      <Appear target="direct" line="l10" word="直射过来" />
      <Appear target="lbl-direct" line="l10" word="直射过来" offset={0.3} />
      <Tween target="sky" to={{tint: 1}} line="l10" word="偏黄" dur={1.4} />
      <Appear target="warn" line="l10" word="千万不要" />
    </Animation>
  </Scene>

  <Scene id="why-not-violet" title="那紫光呢">
    <Line id="l11" text={"紫光散射得更多，可太阳发出的紫光本来就少。"}>你也许会问，散射更多的不该是紫光吗？是的，可太阳发出的紫光本来就少，眼睛对紫光也不如对蓝光敏感。</Line>

    <Part id="violet" x={160} y={90} w={1600} h={680}><VioletAsk /></Part>
    <Animation>
      <Appear target="violet" line="l11" word="散射更多的不该是紫光" dur={0} />
      <Appear target="bar-violet" line="l11" word="散射更多的不该是紫光" />
      <Appear target="lbl-hint" line="l11" word="散射更多的不该是紫光" offset={0.4} />
      <Tween target="violet" to={{scale: 1}} line="l11" word="散射更多的不该是紫光" dur={1.4} easing="easeOut" />
      <Appear target="lbl-violet" line="l11" word="散射更多的不该是紫光" />
      <Appear target="bar-blue" line="l11" word="不如对蓝光敏感" offset={-1.6} />
      <Tween target="violet" to={{sun: 1}} line="l11" word="太阳发出的紫光" dur={1.2} easing="easeOut" />
      <Appear target="bar-sun" line="l11" word="太阳发出的紫光" />
      <Appear target="lbl-sun" line="l11" word="太阳发出的紫光" />
      <Appear target="lbl-hint2" line="l11" word="太阳发出的紫光" offset={0.4} />
      <Tween target="violet" to={{eye: 1}} line="l11" word="眼睛对紫光" dur={1.2} easing="easeOut" />
      <Appear target="bar-eye" line="l11" word="眼睛对紫光" />
      <Appear target="lbl-eye" line="l11" word="眼睛对紫光" />
      <Tween target="violet" to={{drop: 1}} line="l11" word="本来就少" dur={1.2} />
    </Animation>
  </Scene>

  <Scene id="long-path" title="傍晚的长路">
    <Line id="l12" text={"傍晚太阳低垂，阳光要斜着穿过厚得多的大气。"}>到了傍晚，太阳低垂，阳光得斜着穿过厚得多的大气。</Line>
    <Line id="l13" text={"路越长，蓝光被散射出直射光束的就越多。"}>这段路越长，被散射出直射光束的蓝光就越多，直射光也就越偏红。</Line>

    <Part id="skim" x={110} y={110} w={1700} h={600}><Skim /></Part>
    <Animation>
      <Appear target="skim" line="l12" word="傍晚" dur={0} />
      <Appear target="air" line="l12" word="傍晚" />
      <Set target="skim" to={{low: 1}} line="l12" word="太阳低垂" />
      <Appear target="low-sun" line="l12" word="太阳低垂" />
      <Tween target="skim" to={{air: 1}} line="l12" word="厚得多" dur={1.8} easing="easeOut" />
      <Appear target="lbl-thick" line="l12" word="厚得多" offset={0.5} />
      <Tween target="skim" to={{ray: 1}} line="l12" word="斜着穿过" dur={2} easing="easeInOut" />
      <Appear target="eye" line="l13" word="这段路越长" />
      <Appear target="low-path" line="l13" word="这段路越长" />
      <Appear target="lbl-red-share" line="l13" word="越长" offset={0.4} />
      <Tween target="skim" to={{tint: 1}} line="l13" word="蓝光" dur={2.4} />
    </Animation>
  </Scene>

  <Scene id="red-sunset" title="日落为什么是红的">
    <Line id="l14" text={"到达眼睛的直射光里，红橙的比例大大升高。"}>于是到达你眼睛的直射光里，红橙的比例大大升高，看上去就成了红色。</Line>
    <Line id="l15" text={"同一片天空，中午蓝，日落红，差别只在光走了多远。"}>所以同一片天空，中午是蓝的，日落是红的，差别只在于光走了多远。</Line>

    <Part id="skim" x={110} y={110} w={1700} h={600}><Skim /></Part>
    <Part id="compare" x={110} y={0} w={1700} h={780}><Compare /></Part>
    <Animation>
      <Set target="skim" to={{air: 1, ray: 1, low: 1, eye: 1, tint: 0.55}} at="start" />
      <Appear target="low-sun" at="start" />
      <Appear target="air" at="start" />
      <Appear target="low-path" at="start" />
      <Appear target="eye" at="start" />
      <Appear target="lbl-thick" at="start" />
      <Appear target="lbl-red-share" at="start" />
      <Appear target="skim" at="start" />
      <Tween target="skim" to={{tint: 1}} line="l14" word="红橙" dur={1.6} />
      <Appear target="lbl-red-share" line="l14" word="到达你眼睛" />
      <Disappear target="skim" line="l15" word="同一片天空" />
      <Appear target="compare" line="l15" word="同一片天空" dur={0} />
      <Appear target="noon-panel" line="l15" word="同一片天空" dur={0} />
      <Appear target="dusk-panel" line="l15" word="同一片天空" dur={0} />
      <Appear target="dusk-arrow" line="l15" word="同一片天空" dur={0} />
      <Tween target="compare" to={{noon: 1}} line="l15" word="中午" dur={0.9} />
      <Tween target="compare" to={{dusk: 1}} line="l15" word="日落" dur={1.2} />
    </Animation>
  </Scene>
</Doc>;
