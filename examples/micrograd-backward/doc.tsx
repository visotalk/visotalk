import {Appear, Beat, CountUp, Doc, DrawIn, Edge, Field, Flow, Graph, Line, Math, Node, Scene, Stamp, State, Text} from '@visotalk/jsx';

export default <Doc
  spec="0.4.0"
  id="micrograd-backward"
  title="micrograd: the backward pass"
  lang="en"
  sources={[{id: "repo", url: "https://github.com/karpathy/micrograd", title: "karpathy/micrograd"}]}
  theme="visotalk/dark"
  voice="af_heart"
  lexicon={{micrograd: "micro grad"}}
  canvas="16x9,9x16"
  params={{
    x: {type: "number", default: 2, min: -4, max: 4, step: 0.5, label: "x"},
    y: {type: "number", default: -3, min: -4, max: 4, step: 0.5, label: "y"}
  }}
  overrides={[
    {
      id: "rule-nudge",
      target: "rule",
      prop: "y",
      preset: "16x9",
      author: "human",
      keys: [{at: {beat: "start", ref: "backward/forward"}, value: 860}],
      note: "keep clear of captions"
    }
  ]}
  exports={{variants: [{preset: "16x9"}], fps: 30, captions: "burned", credits: "auto"}}
>

  <Text id="title" text="Backward pass" style="title"/>
  <Graph id="g" layout="layered" direction="lr">
    <Node id="x" kind="value" label="x">
      <Field id="data" label="data" value={{$expr: "x"}}/>
      <Field id="grad" label="grad" value={{$expr: "y"}}/>
    </Node>
    <Node id="y" kind="value" label="y">
      <Field id="data" label="data" value={{$expr: "y"}}/>
      <Field id="grad" label="grad" value={{$expr: "x"}}/>
    </Node>
    <Node id="mul" kind="op" label="×"/>
    <Node id="z" kind="value" label="z">
      <Field id="data" label="data" value={{$expr: "x * y"}}/>
      <Field id="grad" label="grad" value={1}/>
    </Node>
    <Edge id="e1" from="x" to="mul"/>
    <Edge id="e2" from="y" to="mul"/>
    <Edge id="e3" from="mul" to="z"/>
  </Graph>
  <Math id="rule" tex={"\\frac{\\partial z}{\\partial x} = y"}/>

  <Scene id="backward" title="Backward pass" pattern="dag" slots={{title: "title", graph: "g", note: "rule"}}>
    <Beat id="forward">
      <State target="title" visible/>
      <State target="g" visible/>
      <State target="g#x.grad" visible={false}/>
      <State target="g#y.grad" visible={false}/>
      <State target="g#z.grad" visible={false}/>
      <State target="rule" visible={false}/>
      <Line id="l1">First, the <DrawIn on="g" dur={1.2}>forward pass</DrawIn> computes <CountUp on="g#z.data">z equals</CountUp> x times y.</Line>
    </Beat>
    <Beat
      id="grads"
      interactions={[
        {
          id: "drag-x",
          on: {target: "g#x.data", event: "change"},
          do: [{setParam: "x", value: {$expr: "value"}}],
          export: "ignore"
        }
      ]}
    >
      <Line id="l2" text="Then gradients flow backward, starting from dz/dz = 1.">Then gradients flow <Flow on={["g#e3", "g#e1", "g#e2"]} stagger={0.3} params={{direction: "backward"}}>backward,</Flow> starting from d z by d z <Appear on="g#z.grad">equals one.</Appear></Line>
      <Line id="l3" text="For a product, each input gets the other input as its gradient."/>
      <Stamp on={["g#x.grad", "g#y.grad"]} line="l3" word="other input" stagger={0.2}/>
      <Appear on="rule" line="l3" word="each input"/>
    </Beat>
  </Scene>
</Doc>;
