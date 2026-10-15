import {Appear, Beat, Doc, Scene, Set, Shape, Text, Tween} from '@visotalk/jsx';

/** A picture built from shapes, each drawn at its own place and timed on its own: a path of commits, a label that slides, a fork that grows, a built-in icon and a drawing of your own as SVG. No component code. */
export default <Doc
  spec="0.4.0"
  id="shape-sketch"
  title="A picture from shapes"
  lang="en"
  theme="visotalk/dark"
  canvas="16x9"
  exports={{variants: [{preset: "16x9"}], fps: 30, captions: "none", credits: "none"}}
>
  <Text id="head" text="Shapes, placed and timed one by one" style="title"/>
  <Shape id="c1" shape="circle" x={260} y={560} w={120} h={120} text="a1" look={{size: 40, stroke: "data", fill: "panel", color: "data"}}/>
  <Shape id="c2" shape="circle" x={600} y={560} w={120} h={120} text="b2" look={{size: 40, stroke: "data", fill: "panel", color: "data"}}/>
  <Shape id="c3" shape="circle" x={940} y={560} w={120} h={120} text="c3" look={{size: 40, stroke: "data", fill: "panel", color: "data"}}/>
  <Shape id="e21" shape="line" x1={600} y1={620} x2={380} y2={620} arrow draw={0} look={{stroke: "muted"}}/>
  <Shape id="e32" shape="line" x1={940} y1={620} x2={720} y2={620} arrow draw={0} look={{stroke: "muted"}}/>
  <Shape id="main" shape="rect" x={900} y={420} w={200} h={80} text="main" look={{size: 40, fill: "good", stroke: "good", color: "bg", radius: 40}}/>
  <Shape id="fork" shape="path" path="M 1060 620 C 1180 620 1180 460 1320 460" draw={0} look={{stroke: "grad", strokeWidth: 6}}/>
  <Shape id="c4" shape="circle" x={1320} y={400} w={120} h={120} text="d4" look={{size: 40, stroke: "grad", fill: "panel", color: "grad"}}/>

  <Shape id="mark" shape="icon" icon="git-branch" x={1500} y={300} w={110} look={{stroke: "good", strokeWidth: 2.5}}/>
  <Shape id="logo" shape="svg" x={1640} y={300} w={110} svg={'<svg viewBox="0 0 32 32"><path d="M16 2 L30 28 H2 Z" fill="#3776ab"/><circle cx="16" cy="20" r="5" fill="#ffd43b"/></svg>'}/>

  <Scene id="s" pattern="stage" slots={{title: "head", main: ["c1", "c2", "c3", "e21", "e32", "main", "fork", "c4", "mark", "logo"]}}>
    <Beat id="b1" duration={2.4}>
      <Appear on="c1" at="start"/>
      <Appear on="c2" at="start" offset={0.3}/>
      <Appear on="c3" at="start" offset={0.6}/>
      <Tween on="e21" draw={1} at="start" offset={0.9} dur={0.5}/>
      <Tween on="e32" draw={1} at="start" offset={1.2} dur={0.5}/>
    </Beat>
    <Beat id="b2" duration={2.4}>
      <Appear on="main" at="start"/>
      <Appear on="mark" at="start" offset={0.4}/>
      <Appear on="logo" at="start" offset={0.7}/>
    </Beat>
    <Beat id="b3" duration={2.4}>
      <Appear on="fork" at="start"/>
      <Tween on="fork" draw={1} at="start" dur={0.8}/>
      <Appear on="c4" at="start" offset={0.7}/>
      <Tween on="main" x={1280} y={300} at="start" offset={0.7} dur={0.8}/>
    </Beat>
  </Scene>
</Doc>;
