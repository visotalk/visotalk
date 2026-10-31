import {Doc, Scene, Line, Part, Animation, Appear, Tween, Set, Disappear, Asset} from '@visotalk/jsx';
import {Ctrl, Callouts} from './parts/intro.tsx';
import {C, LeafPic, ZoomLabel, Chloroplast, LeafOutline, Cell, LightStep, CalvinCycle, Compare, Equation, Claims, Closing, ChloroLabels, CellNote, Kicker} from './parts/figures.tsx';


export default <Doc id="photosynthesis" poster={78} title={"How a leaf makes food"} lang={"en"} voice={"af_heart"} theme="visotalk/light" tokens={{colors: {bg: "#fbf5e6", panel: "#f3e9d3", panel2: "#dcefd9", border: "#cfe0c4", text: "#1f3b36", muted: "#4a6b5e", faint: "#8aa294", data: "#2f8f5b", op: "#0f766e", grad: "#2f8f5b", warn: "#f2a93b", good: "#2f8f5b", bad: "#c26a4a"}, fonts: {sans: 'Georgia, "Liberation Serif", serif', mono: '"DejaVu Sans Mono", monospace'}}} canvas="16x9">
  <Asset id="leaf-intro" kind="image" src="media/photosynthesis-pptx-s01-1.png" license={{id: "user-owned", attribution: "", obligations: []}} />
  <Asset id="leaf-close" kind="image" src="media/photosynthesis-pptx-s07-1.png" license={{id: "user-owned", attribution: "", obligations: []}} />


  <Scene id="hook" title="A leaf that never eats">
    <Line id="l1">A plant never eats. It has no mouth, and it cannot get up and go looking for a meal.</Line>
    <Line id="l2">Yet a single leaf, on one sunny afternoon, builds everything it needs to grow.</Line>
    <Line id="l2b">Every leaf on the planet is running a small factory, and it has been running it for hundreds of millions of years.</Line>
    <Line id="l3">That trick is photosynthesis, and by the end of this you should be able to explain it in one line.</Line>

    <Part id="title" x={110} y={240} w={760} h={420}><Ctrl /></Part>
    <Part id="leaf" x={860} y={160} w={900} h={620}><LeafPic asset="leaf-intro" /></Part>
    <Animation>
      <Appear target="title" at="start" />
      <Appear target="leaf" line="l1" word="never eats" />
      <Tween target="leaf" to={{x: 60}} line="l2" word="sunny afternoon" dur={3.5} />
      <Tween target="leaf" to={{scale: 1.06}} line="l2b" word="hundreds of millions" dur={3} />
      <Set target="title" to={{step: 1}} line="l3" word="photosynthesis" />
    </Animation>
  </Scene>

  <Scene id="ingredients" title="Three things go in">
    <Line id="l4">Start with the ingredients. Everything a plant makes begins with three things.</Line>
    <Line id="l5">Light, falling on the leaf from above.</Line>
    <Line id="l6">Water, pulled up through the roots and carried along the veins into the leaf.</Line>
    <Line id="l7">And carbon dioxide, an invisible gas the leaf simply takes out of the air around it.</Line>
    <Line id="l8">Notice what is missing from that list: food. Nothing is brought in. The plant builds its own body from light, water and air.</Line>

    <Part id="leafbig" x={330} y={190} w={1500} h={660}><LeafPic asset="leaf-intro" /></Part>
    <Part id="callouts" x={330} y={120} w={1500} h={750}><Callouts /></Part>
    <Animation>
      <Appear target="leafbig" at="start" />
      <Appear target="callouts" line="l5" word="Light" dur={0} />
      <Appear target="c-light" line="l5" word="Light" />
      <Appear target="c-water" line="l6" word="Water" />
      <Appear target="c-co2" line="l7" word="carbon dioxide" />
      <Appear target="c-o2" line="l8" word="missing" />
    </Animation>
  </Scene>

  <Scene id="chloroplast" title="Where it happens">
    <Line id="l8b">And the part that does it is tiny, so we have to go and look.</Line>
    <Line id="l9">Now go inside the leaf, because that is where the work happens.</Line>
    <Line id="l10">Leaf cells are packed with small green packets called chloroplasts, dozens in a single cell.</Line>
    <Line id="l10b">Each one is a small oval body with its own set of folded membranes inside.</Line>
    <Line id="l11">Each chloroplast has two working parts. Stacks of flat discs, the thylakoids, catch the light.</Line>
    <Line id="l12">And around the discs, a fluid called the stroma, where the sugar gets put together.</Line>

    <Part id="leafzoom" x={160} y={100} w={1600} h={740}><LeafOutline /></Part>
    <Part id="zoomlabel" x={160} y={100} w={1600} h={740}><ZoomLabel /></Part>
    <Part id="cell" x={50} y={210} w={380} h={450}><Cell /></Part>
    <Part id="cellnote" x={40} y={650} w={360} h={120}><CellNote /></Part>
    <Part id="chloro" x={430} y={90} w={1440} h={600}><Chloroplast /></Part>
    <Part id="labels" x={440} y={700} w={1400} h={175}><ChloroLabels /></Part>
    <Animation>
      <Appear target="leafzoom" line="l8b" word="tiny" />
      <Appear target="zoomlabel" line="l8b" word="tiny" />
      <Disappear target="zoomlabel" line="l9" word="because that" dur={0.5} />
      <Disappear target="leafzoom" line="l10" word="Leaf cells" dur={0.5} />
      <Appear target="cell" line="l10" word="Leaf cells" />
      <Appear target="chloro" line="l10" word="packets" />
      <Appear target="cellnote" line="l10" word="packets" />
      <Tween target="chloro" to={{scale: 1.1}} line="l10b" word="membranes" dur={2.4} />
      <Appear target="labels" line="l11" word="thylakoids" dur={0} />
      <Appear target="granum-1" line="l10b" word="oval body" />
      <Appear target="granum-2" line="l10b" word="oval body" />
      <Appear target="granum-3" line="l10b" word="oval body" />
      <Tween target="chloro" to={{lit: 1}} line="l11" word="catch the light" dur={1.6} />
      <Appear target="lab-thyl" line="l11" word="thylakoids" />
      <Tween target="chloro" to={{stroma: 1}} line="l12" word="stroma" dur={1.8} />
      <Appear target="lab-stroma" line="l12" word="sugar gets put" />
    </Animation>
  </Scene>

  <Scene id="step-one" title="Step one: light splits water">
    <Line id="l13">Step one happens up in those discs, while the light is on.</Line>
    <Line id="l14">The light carries enough energy to do something drastic: it splits a water molecule apart.</Line>
    <Line id="l15">The oxygen is released, and it leaves the leaf through tiny pores.</Line>
    <Line id="l16">The rest of that energy is packed into two molecules, A T P and N A D P H.</Line>
    <Line id="l17">Think of them as charged batteries, made in the light, ready to be spent.</Line>

    <Part id="k-step1" x={120} y={90} w={900} h={80}><Kicker text="Step one" /></Part>
    <Part id="light" x={160} y={160} w={1600} h={720}><LightStep /></Part>
    <Animation>
      <Appear target="k-step1" at="start" dur={0} />
      <Appear target="light" at="start" dur={0} />
      <Appear target="rays" line="l13" word="light is on" />
      <Appear target="stack" line="l13" word="discs" />
      <Appear target="water-in" line="l14" word="splits a water" />
      <Tween target="light" to={{split: 1}} line="l14" word="apart" dur={1.5} />
      <Appear target="carrier-1" line="l16" word="A T P" />
      <Appear target="carrier-2" line="l16" word="N A D" />
      <Tween target="light" to={{charge: 1}} line="l17" word="charged batteries" dur={2} />
      <Appear target="oxygen-out" line="l15" word="tiny pores" />
    </Animation>
  </Scene>

  <Scene id="step-two" title="Step two: the Calvin cycle">
    <Line id="l18">Step two takes those charged carriers down into the stroma.</Line>
    <Line id="l19">There, carbon dioxide is caught and built up, carbon by carbon, into sugar.</Line>
    <Line id="l20">It is called the Calvin cycle, and it is a loop: it turns, and turns, and turns.</Line>

    <Part id="k-step2" x={120} y={90} w={900} h={80}><Kicker text="Step two" /></Part>
    <Part id="calvin" x={140} y={150} w={1660} h={700}><CalvinCycle /></Part>
    <Animation>
      <Appear target="k-step2" at="start" dur={0} />
      <Appear target="calvin" at="start" dur={0} />
      <Appear target="carriers-in" line="l18" word="charged carriers" />
      <Appear target="co2-in" line="l19" word="carbon dioxide" />
      <Tween target="calvin" to={{carbons: 3}} line="l19" word="carbon by carbon" dur={2.2} />
      <Appear target="sugar-out" line="l19" word="into sugar" />
      <Appear target="ring" line="l18" word="stroma" />
      <Tween target="calvin" to={{turn: 0.7}} line="l18" word="stroma" dur={2.2} />
      <Tween target="calvin" to={{turn: 2.6}} line="l20" word="and turns, and turns" offset={1.2} dur={5} />
      <Tween target="calvin" to={{carbons: 6}} line="l20" word="and turns, and turns" offset={1.2} dur={4.5} />
    </Animation>
  </Scene>

  <Scene id="check" title="A check">
    <Line id="l18b">Some of the sugar is burned at once for energy. Most of it is stored, or built into the plant itself.</Line>
    <Line id="l21">So here is a check. Which step needs the light directly?</Line>
    <Line id="l22">Only the first. The second can run in the dark, for as long as the batteries hold a charge.</Line>

    <Part id="k-check" x={120} y={90} w={900} h={80}><Kicker text="A quick check" /></Part>
    <Part id="compare" x={200} y={190} w={1520} h={690}><Compare /></Part>
    <Animation>
      <Appear target="k-check" line="l21" word="check" dur={0} />
      <Appear target="compare" line="l21" word="check" dur={0} />
      <Appear target="q" line="l21" word="check" />
      <Appear target="card1" line="l21" word="light directly" />
      <Appear target="card2" line="l21" word="light directly" offset={0.7} />
      <Appear target="tick1" line="l22" word="Only the first" />
      <Appear target="dark-note" line="l22" word="in the dark" />
    </Animation>
  </Scene>

  <Scene id="equation" title="The whole thing in one line">
    <Line id="l23">Put the two steps together, and the whole process fits into one line.</Line>
    <Line id="l24">Six carbon dioxide, plus six water, powered by light, become one sugar and six oxygen.</Line>
    <Line id="l25">Read it as a trade. The plant takes in air and water, and gives back food and air we can breathe.</Line>

    <Part id="eq" x={130} y={130} w={1660} h={720}><Equation /></Part>
    <Animation>
      <Appear target="eq" at="start" dur={0} />
      <Appear target="eq-co2" line="l24" word="Six carbon dioxide" />
      <Appear target="eq-h2o" line="l24" word="six water" />
      <Appear target="eq-light" line="l24" word="powered by light" />
      <Appear target="eq-sugar" line="l24" word="one sugar" />
      <Appear target="eq-o2" line="l24" word="six oxygen" />
      <Appear target="trade" line="l25" word="trade" />
    </Animation>
  </Scene>

  <Scene id="why" title="Why it matters">
    <Line id="l25b">Turn it around, and you have what animals, and fires, and rotting wood do: they spend sugar and give the gas back.</Line>
    <Line id="l26">Which is why this is not a small thing at all.</Line>
    <Line id="l27">Almost every breath of oxygen you take was made by a leaf doing exactly this.</Line>
    <Line id="l28">Almost every meal you eat starts with a plant that did it, or with an animal that ate one.</Line>
    <Line id="l29">And all the while it pulls carbon out of the air and locks it into sugar, and into wood.</Line>
    <Line id="l29b">Fields, forests, and the algae in the sea all run this same loop, and between them they keep the air as it is.</Line>

    <Part id="why-leaf" x={70} y={210} w={830} h={640}><LeafPic asset="leaf-close" /></Part>
    <Part id="claims" x={950} y={190} w={860} h={660}><Claims /></Part>
    <Animation>
      <Appear target="why-leaf" line="l26" word="not a small" />
      <Appear target="claims" line="l26" word="not a small" dur={0} />
      <Appear target="claim-1" line="l27" word="breath of oxygen" />
      <Appear target="claim-2" line="l28" word="every meal" />
      <Appear target="claim-3" line="l29" word="carbon out of the air" />
      <Appear target="claim-4" line="l29b" word="algae" />
    </Animation>
  </Scene>

  <Scene id="remember" title="Remember">
    <Line id="l30">So remember one line: a leaf turns light into food.</Line>

    <Part id="bg-leaf" x={1000} y={110} w={860} h={600}><LeafPic asset="leaf-close" /></Part>
    <Part id="closing" x={120} y={250} w={880} h={400}><Closing /></Part>
    <Animation>
      <Appear target="bg-leaf" at="start" />
      <Appear target="closing" line="l30" word="remember" />
      <Tween target="closing" to={{reveal: 1}} line="l30" word="a leaf turns" dur={2.4} />
    </Animation>
  </Scene>

</Doc>;
