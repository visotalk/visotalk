import {Doc, Scene, Line, Part, Animation, Appear, Tween, Set, Disappear, Asset} from '@visotalk/jsx';
import {CoverPic, CoverTitle, CoverQuestion, BigLight, NameBlock} from './parts/s1-cover.tsx';
import {Inputs, MeetLabel, WhereQ} from './parts/s2-inputs.tsx';
import {Chloroplast, ChloroLabel, WorkshopLabels} from './parts/s3-chloroplast.tsx';
import {LightReaction} from './parts/s4-light.tsx';
import {Calvin} from './parts/s5-calvin.tsx';
import {Equation} from './parts/s6-equation.tsx';
import {WhyItMatters, Remember} from './parts/s7-why.tsx';

// The look is the deck's own: warm paper #fbf5e6, ink green #1f3b36, leaf green #2f8f5b,
// teal #0f766e, sun orange #f2a93b, water blue #4ba3c7, Noto Serif SC.

export default <Doc
  id="photosynthesis-zh"
  poster={5}
  title={"一片叶子怎样制造食物"}
  lang={"zh-CN"}
  voice={"minimax:Chinese (Mandarin)_News_Anchor"}
  theme="visotalk/light"
  canvas="16x9"
  tokens={{
    colors: {
      bg: '#fbf5e6',
      panel: '#f6eedb',
      panel2: '#dcefd9',
      border: '#d9cfb8',
      text: '#1f3b36',
      muted: '#5d7a70',
      faint: '#a8bdb4',
      data: '#2f8f5b',
      grad: '#0f766e',
      good: '#2f8f5b',
      warn: '#f2a93b',
      bad: '#c0563a',
    },
    fonts: {sans: '"Noto Serif SC", serif', mono: '"JetBrains Mono", monospace'},
  }}
>
  <Asset id="leaf-hero" kind="image" src="media/photosynthesis-zh-pptx-s01-1.png" license={{id: "user-owned", attribution: "", obligations: []}} />
  <Asset id="leaf-earth" kind="image" src="media/photosynthesis-zh-pptx-s07-1.png" license={{id: "user-owned", attribution: "", obligations: []}} />

  {/* Scene 1 — the deck's cover: one leaf, and the question of food */}
  <Scene id="leaf" title="一片叶子">
    <Line id="l1">先看这片叶子。它不追捕，也不捕食，却一直在长大。</Line>
    <Line id="l2">你也许会问：它靠什么活着？</Line>
    <Line id="l3">靠光。</Line>
    <Line id="l4">阳光、空气和水，在叶子里被做成糖。这件事叫光合作用。</Line>

    <Part id="cover-pic" x={880} y={180} w={960} h={640}><CoverPic /></Part>
    <Part id="cover-title" x={116} y={300} w={740} h={290}><CoverTitle /></Part>
    <Part id="cover-q" x={118} y={620} w={700} h={90}><CoverQuestion /></Part>
    <Part id="big-light" x={116} y={330} w={560} h={280}><BigLight /></Part>
    <Part id="name" x={116} y={400} w={740} h={280}><NameBlock /></Part>
    <Animation>
      <Set target="big-light" to={{s: 0}} at="start" />
      <Appear target={["cover-pic", "cover-title"]} at="start" />
      <Tween target="cover-pic" to={{glow: 1}} line="l1" word="叶子" dur={2.2} />
      <Appear target="cover-q" line="l2" word="靠什么活着" />
      <Disappear target={["cover-q", "cover-title"]} line="l3" word="靠光" dur={0.4} />
      <Appear target="big-light" line="l3" word="光" dur={0.5} />
      <Tween target="big-light" to={{s: 1}} line="l3" word="光" dur={0.6} />
      <Disappear target="big-light" line="l4" word="被做成糖" dur={0.5} />
      <Appear target="name" line="l4" word="光合作用" />
    </Animation>
  </Scene>

  {/* Scene 2 — the three inputs, from slide 2 */}
  <Scene id="three-inputs" title="需要三样东西">
    <Line id="l5">拆开看，它只要三样原料。</Line>
    <Line id="l6">光，从上面来，落在叶面上。</Line>
    <Line id="l7">水，由根从土里吸上来，顺着叶脉走进叶肉。</Line>
    <Line id="l8">还有二氧化碳，从叶片背面的气孔飘进来，看不见，却到处都是。</Line>
    <Line id="l9">三样缺一不可，而且要在同一个地方碰面。</Line>
    <Line id="l10">那么，它们到底在叶子的哪里碰面？</Line>

    <Part id="inputs" x={0} y={0} w={1920} h={900}><Inputs /></Part>
    <Part id="meet-label" x={180} y={330} w={520} h={70}><MeetLabel /></Part>
    <Part id="where-q" x={360} y={300} w={1200} h={200}><WhereQ /></Part>
    <Animation>
      <Set target="inputs" to={{sun: 0, ray: 0, water: 0, co2: 0, meet: 0, close: 0}} at="start" />
      <Appear target="inputs" line="l5" word="三样原料" />
      <Tween target="inputs" to={{sun: 1}} line="l6" word="光" dur={0.9} />
      <Tween target="inputs" to={{ray: 1}} line="l6" word="落在叶面上" dur={1.4} />
      <Tween target="inputs" to={{water: 1}} line="l7" word="水" dur={0.8} />
      <Tween target="inputs" to={{meet: 0}} line="l7" word="水" dur={0.6} />
      <Tween target="inputs" to={{co2: 1}} line="l8" word="二氧化碳" dur={1.6} />
      <Tween target="inputs" to={{meet: 1}} line="l9" word="碰面" dur={0.9} />
      <Appear target="meet-label" line="l9" word="碰面" />
      <Tween target="meet-label" to={{s: 1}} line="l9" word="碰面" dur={0.7} />
      <Tween target="inputs" to={{close: 1}} line="l10" word="哪里" dur={1.1} />
      <Appear target="where-q" line="l10" word="哪里" />
      <Tween target="where-q" to={{s: 1}} line="l10" word="哪里" dur={0.8} />
    </Animation>
  </Scene>

  {/* Scene 3 — slide 3, zoomed from the cell to the chloroplast */}
  <Scene id="chloroplast" title="相遇的地方：叶绿体">
    <Line id="l11">在叶肉细胞里。一个细胞只有几十分之一毫米，却装着几十个绿色的小工厂。</Line>
    <Line id="l12">这些小工厂，叫叶绿体。</Line>
    <Line id="l13">每个叶绿体，都分成两个车间。</Line>
    <Line id="l14">一边是一层层叠起来的膜，叫类囊体，负责抓住光。</Line>
    <Line id="l15">另一边是周围的液体，叫基质，负责把碳变成糖。</Line>

    <Part id="chloro" x={0} y={40} w={1920} h={880}><Chloroplast /></Part>
    <Part id="chloro-label" x={1130} y={150} w={440} h={100}><ChloroLabel /></Part>
    <Part id="workshops" x={210} y={690} w={1240} h={150}><WorkshopLabels /></Part>
    <Animation>
      <Set target="chloro" to={{cell: 1, grow: 0, split: 0, lightOn: 0, carbonOn: 0}} at="start" />
      <Appear target="chloro" line="l11" word="叶肉细胞" />
      <Tween target="chloro" to={{grow: 1}} line="l11" word="绿色的小工厂" dur={2.6} />
      <Tween target="chloro" to={{cell: 0}} line="l11" word="工厂" dur={1.2} />
      <Appear target="chloro-label" line="l12" word="叶绿体" />
      <Tween target="chloro-label" to={{s: 1}} line="l12" word="叶绿体" dur={0.7} />
      <Tween target="chloro" to={{split: 1}} line="l13" word="两个车间" dur={1.1} />
      <Appear target="workshops" line="l14" word="类囊体" dur={0} />
      <Tween target="workshops" to={{a: 1}} line="l14" word="类囊体" dur={0.8} />
      <Tween target="chloro" to={{lightOn: 1}} line="l14" word="抓住光" dur={1.2} />
      <Tween target="workshops" to={{b: 1}} line="l15" word="基质" dur={0.8} />
      <Tween target="chloro" to={{carbonOn: 1}} line="l15" word="碳变成糖" dur={1.2} />
    </Animation>
  </Scene>

  {/* Scene 4 — slides 4, step one: light splits water on the thylakoid */}
  <Scene id="light-reaction" title="第一步：光分解水">
    <Line id="l16">第一步，就发生在类囊体的膜上。</Line>
    <Line id="l17">光照到水分子上，把它拆开。</Line>
    <Line id="l18">水里的氧被放出来，变成氧气，从叶片飘走。</Line>
    <Line id="l19">拆开时放出的能量，被装进两个载体：ATP 和 NADPH。</Line>
    <Line id="l20">它们像两块充满电的电池，被送去隔壁车间。</Line>

    <Part id="light" x={0} y={30} w={1920} h={890}><LightReaction /></Part>
    <Animation>
      <Set target="light" to={{light: 0, split: 0, o2: 0, pack: 0, move: 0, dim: 0}} at="start" />
      <Appear target="light" line="l16" word="类囊体的膜" />
      <Tween target="light" to={{light: 1}} line="l17" word="光照到水分子" dur={1.2} />
      <Tween target="light" to={{split: 1}} line="l17" word="拆开" dur={1.2} />
      <Tween target="light" to={{o2: 1}} line="l18" word="氧气" dur={2.0} />
      <Tween target="light" to={{pack: 1}} line="l19" word="两个载体" dur={1.6} />
      <Tween target="light" to={{move: 1}} line="l20" word="电池" dur={2.2} />
    </Animation>
  </Scene>

  {/* Scene 5 — slide 5, step two: the Calvin cycle */}
  <Scene id="calvin" title="第二步：CO₂ 变成糖">
    <Line id="l21">第二步在基质里，叫卡尔文循环。</Line>
    <Line id="l22">二氧化碳进来，碳被固定住，接进一条碳链。</Line>
    <Line id="l23">固定碳要花能量，用的正是刚才那两块电池。</Line>
    <Line id="l24">一圈，又一圈。每转一圈，就多拼上一个糖的零件。</Line>
    <Line id="l25">最后，糖被造出来。</Line>

    <Part id="calvin" x={0} y={20} w={1850} h={900}><Calvin /></Part>
    <Animation>
      <Set target="calvin" to={{co2: 0, bind: 0, spend: 0, turn: 0, sugar: 0, arrive: 0}} at="start" />
      <Appear target="calvin" line="l21" word="基质里" />
      <Tween target="calvin" to={{co2: 1}} line="l22" word="二氧化碳" dur={1.4} />
      <Tween target="calvin" to={{bind: 1}} line="l22" word="固定住" dur={1.0} />
      <Tween target="calvin" to={{arrive: 1}} line="l23" word="两块电池" dur={1.2} />
      <Tween target="calvin" to={{spend: 1}} line="l23" word="花能量" dur={1.4} />
      <Tween target="calvin" to={{turn: 2}} line="l24" word="又一圈" dur={2.0} />
      <Tween target="calvin" to={{sugar: 1}} line="l25" word="糖被造出来" dur={1.0} />
    </Animation>
  </Scene>

  {/* Scene 6 — slide 6, the whole process on one line */}
  <Scene id="equation" title="一行写完全过程">
    <Line id="l26">现在，把这六页写成一行。</Line>
    <Line id="l27">六个二氧化碳，加六个水，在光的驱动下——</Line>
    <Line id="l28">变成一分子葡萄糖，和六个氧气。</Line>
    <Line id="l29">数一数：两边都是六个碳、十二个氢、十八个氧。一样多。</Line>

    <Part id="eq" x={0} y={60} w={1920} h={860}><Equation /></Part>
    <Animation>
      <Set target="eq" to={{reactants: 0, light: 0, products: 0, check: 0}} at="start" />
      <Appear target="eq" line="l27" word="六个二氧化碳" />
      <Tween target="eq" to={{reactants: 1}} line="l27" word="六个二氧化碳" dur={1.4} />
      <Tween target="eq" to={{light: 1}} line="l27" word="光的驱动" dur={1.2} />
      <Tween target="eq" to={{products: 1}} line="l28" word="葡萄糖" dur={1.4} />
      <Tween target="eq" to={{check: 1}} line="l29" word="数一数" dur={1.2} />
    </Animation>
  </Scene>

  {/* Scene 7 — slide 7, why it matters */}
  <Scene id="why" title="为什么重要">
    <Line id="l30">这就是全部。可它的分量，比一行公式大得多。</Line>
    <Line id="l31">你吸进的几乎每一口氧气，都来自这一步。</Line>
    <Line id="l32">几乎每一顿饭，也都从这一步开始。</Line>
    <Line id="l33">它还在把碳从空气里拉出来，存进叶子和土壤。</Line>

    <Part id="why" x={120} y={100} w={1680} h={760}><WhyItMatters /></Part>
    <Animation>
      <Set target="why" to={{o2: 0, food: 0, carbon: 0}} at="start" />
      <Appear target="why" line="l30" word="比一行公式" />
      <Tween target="why" to={{o2: 1}} line="l31" word="氧气" dur={0.9} />
      <Tween target="why" to={{food: 1}} line="l32" word="每一顿饭" dur={0.9} />
      <Tween target="why" to={{carbon: 1}} line="l33" word="碳从空气里" dur={1.0} />
    </Animation>
  </Scene>

  {/* Scene 8 — the one line to remember */}
  <Scene id="remember" title="记住这一句">
    <Line id="l34" hold={1}>所以，如果只记一句话，就记这一句：</Line>
    <Line id="l35" hold={2}>叶子把光，变成了食物。</Line>

    <Part id="remember" x={0} y={200} w={1920} h={620}><Remember /></Part>
    <Animation>
      <Set target="remember" to={{s: 0, line: 0}} at="start" />
      <Appear target="remember" line="l34" word="一句话" />
      <Tween target="remember" to={{s: 1}} line="l35" word="叶子把光" dur={1.2} />
    </Animation>
  </Scene>
</Doc>;
