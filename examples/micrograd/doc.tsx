import {Appear, Asset, Beat, Card, Chart, Chip, Code, CountUp, Counter, Disappear, Doc, DrawIn, Edge, Field, Flow, Graph, Highlight, Line, Math, Node, Run, Scene, Set, Stamp, State, Text} from '@visotalk/jsx';

/**
 * micrograd explainer, a port of the Remotion prototype.
 * Figures are from our own runs in the sandbox: the README example (g = 24.7041, a.grad = 138.8338,
 * b.grad = 645.5773) and a 100-step SGD training on two moons (data/moons.json).
 */
export default <Doc
  spec="0.4.0"
  id="micrograd"
  title="micrograd: autograd in 150 lines"
  lang="en"
  sources={[{id: "repo", url: "https://github.com/karpathy/micrograd", title: "karpathy/micrograd"}]}
  generator="port of the micrograd prototype"
  theme="visotalk/dark"
  voice="af_heart"
  speed={1}
  lexicon={{micrograd: "micro grad"}}
  canvas="16x9"
  exports={{variants: [{preset: "16x9"}], fps: 30, captions: "burned", credits: "none"}}
>
  <Asset id="moons" kind="data" src="data/moons.json" license={{id: "MIT", obligations: []}}/>

  <Chip id="fw-pytorch" text="PyTorch"/>
  <Chip id="fw-tf" text="TensorFlow"/>
  <Chip id="fw-jax" text="JAX"/>
  <Text id="autodiff" text="automatic differentiation" style="headline">
    <Run text="automatic differentiation" style="data"/>
  </Text>
  <Text id="mg-title" text="micrograd" style="monoHero">
    <Run text="micro"/>
    <Run text="grad" style="grad"/>
  </Text>
  <Text id="byline" text="by Andrej Karpathy · github.com/karpathy/micrograd" style="centerSub"/>
  <Counter id="n-engine" value={94} style="data" caption="engine.py"/>
  <Text id="n-plus" text="+" style="headline"/>
  <Counter id="n-nn" value={60} style="op" caption="nn.py"/>
  <Text id="n-eq" text="=" style="headline"/>
  <Counter id="n-total" value={154} style="grad" caption="lines of Python"/>
  <Text id="k-value" text="micrograd/engine.py" style="kicker"/>
  <Code
    id="code-value"
    lang="python"
    lines={[
      "class Value:",
      "    \"\"\" stores a single scalar value and its gradient \"\"\"",
      "",
      "    def __init__(self, data, _children=(), _op=''):",
      "        self.data = data",
      "        self.grad = 0",
      "        self._backward = lambda: None",
      "        self._prev = set(_children)",
      "        self._op = _op"
    ]}
  />
  <Card id="card-z" title="z = Value(-6.0)">
    <Field id="data" label="data" value={-6} format="0.0"/>
    <Field id="grad" label="grad" value={0} format="0"/>
    <Field id="prev" label="_prev" value="{x, y}"/>
    <Field id="op" label="_op" value="'*'"/>
  </Card>
  <Text id="k-forward" text="Forward pass · building the graph" style="kicker"/>
  <Text id="k-question" text="The question" style="kicker"/>
  <Text id="k-backward" text="Backward pass · chain rule" style="kicker"/>
  <Graph
    id="g"
    layout="manual"
    direction="lr"
    nodeWidth={250}
    label="Expression graph of o = x·y + 10"
    positions={{
      x: [0.125, 0.15],
      y: [0.125, 0.75],
      mul: [0.345, 0.45],
      z: [0.53, 0.45],
      c: [0.53, 0.94],
      add: [0.726, 0.65],
      o: [0.905, 0.65]
    }}
  >
    <Node id="x" kind="value" label="x">
      <Field id="data" label="data" value={2} format="0.0"/>
      <Field id="grad" label="grad" value={-3} format="0.0"/>
    </Node>
    <Node id="y" kind="value" label="y">
      <Field id="data" label="data" value={-3} format="0.0"/>
      <Field id="grad" label="grad" value={2} format="0.0"/>
    </Node>
    <Node id="mul" kind="op" label="×"/>
    <Node id="z" kind="value" label="z">
      <Field id="data" label="data" value={-6} format="0.0"/>
      <Field id="grad" label="grad" value={1} format="0.0"/>
    </Node>
    <Node id="c" kind="value" label="10">
      <Field id="data" label="data" value={10} format="0.0"/>
      <Field id="grad" label="grad" value={1} format="0.0"/>
    </Node>
    <Node id="add" kind="op" label="+"/>
    <Node id="o" kind="value" label="o">
      <Field id="data" label="data" value={4} format="0.0"/>
      <Field id="grad" label="grad" value={1} format="0.0"/>
    </Node>
    <Edge id="xm" from="x" to="mul"/>
    <Edge id="ym" from="y" to="mul"/>
    <Edge id="mz" from="mul" to="z"/>
    <Edge id="za" from="z" to="add"/>
    <Edge id="ca" from="c" to="add"/>
    <Edge id="ao" from="add" to="o"/>
  </Graph>
  <Math id="q-formula" tex={"\\dfrac{\\partial o}{\\partial x} = \\;?"}/>
  <Text id="q-gradient" text="= the gradient" style="callout"/>
  <Text id="sweep" text="← visit nodes in reverse order" style="sweep"/>
  <Text id="rule-x" text="x.grad += y.data × out.grad" style="rule"/>
  <Text id="rule-y" text="y.grad += x.data × out.grad" style="rule"/>
  <Math
    id="chain"
    tex={"\\frac{\\partial o}{\\partial x} = \\frac{\\partial o}{\\partial z}\\cdot\\frac{\\partial z}{\\partial x} = 1 \\times (-3) = -3"}
  />
  <Text id="k-rules" text="Local rules" style="kicker"/>
  <Text id="rules-title" text="Each op passes g = out.grad backwards" style="title">
    <Run text="Each op passes "/>
    <Run text="g" style="grad"/>
    <Run text=" = out.grad backwards"/>
  </Text>
  <Text id="t-add" text="Addition: copy it" style="body"/>
  <Graph
    id="g-add"
    layout="manual"
    direction="lr"
    nodeWidth={150}
    positions={{a: [0.14, 0.18], b: [0.14, 0.82], op: [0.52, 0.5], out: [0.86, 0.5]}}
  >
    <Node id="a" kind="value" label="a"/>
    <Node id="b" kind="value" label="b"/>
    <Node id="op" kind="op" label="+"/>
    <Node id="out" kind="value" label="out"/>
    <Edge id="ao" from="a" to="op" label="g"/>
    <Edge id="bo" from="b" to="op" label="g"/>
    <Edge id="oo" from="op" to="out" label="g"/>
  </Graph>
  <Code id="code-add" lines={["self.grad  += out.grad", "other.grad += out.grad"]} style="small"/>
  <Text id="t-mul" text="Multiplication: swap &amp; scale" style="body"/>
  <Graph
    id="g-mul"
    layout="manual"
    direction="lr"
    nodeWidth={150}
    positions={{a: [0.14, 0.18], b: [0.14, 0.82], op: [0.52, 0.5], out: [0.86, 0.5]}}
  >
    <Node id="a" kind="value" label="a"/>
    <Node id="b" kind="value" label="b"/>
    <Node id="op" kind="op" label="×"/>
    <Node id="out" kind="value" label="out"/>
    <Edge id="ao" from="a" to="op" label="b · g"/>
    <Edge id="bo" from="b" to="op" label="a · g"/>
    <Edge id="oo" from="op" to="out" label="g"/>
  </Graph>
  <Code
    id="code-mul"
    lines={["self.grad  += other.data * out.grad", "other.grad += self.data * out.grad"]}
    style="small"
  />
  <Text id="k-verify" text="README example · run in the sandbox" style="kicker"/>
  <Code
    id="code-readme"
    lang="python"
    lines={[
      "a = Value(-4.0)",
      "b = Value(2.0)",
      "c = a + b",
      "d = a * b + b**3",
      "c += c + 1",
      "c += 1 + c + (-a)",
      "d += d * 2 + (b + a).relu()",
      "d += 3 * d + (b - a).relu()",
      "e = c - d",
      "f = e**2",
      "g = f / 2.0",
      "g += 10.0 / f",
      "g.backward()"
    ]}
    style="small"
  />
  <Card id="results" title="our run">
    <Field id="g" label="g.data" value="24.7041"/>
    <Field id="a" label="a.grad  (dg/da)" value="138.8338"/>
    <Field id="b" label="b.grad  (dg/db)" value="645.5773"/>
  </Card>
  <Chip id="tests" text="test/test_engine.py · checked against PyTorch" style="accent"/>
  <Text id="k-nn" text="micrograd/nn.py · MLP(2, [16, 16, 1])" style="kicker"/>
  <Graph id="net" layout="layered" direction="lr" label="MLP with layers 2, 16, 16, 1">
    <Node id="n0_0" kind="neuron" label=""/>
    <Node id="n0_1" kind="neuron" label=""/>
    <Node id="n1_0" kind="neuron" label=""/>
    <Node id="n1_1" kind="neuron" label=""/>
    <Node id="n1_2" kind="neuron" label=""/>
    <Node id="n1_3" kind="neuron" label=""/>
    <Node id="n1_4" kind="neuron" label=""/>
    <Node id="n1_5" kind="neuron" label=""/>
    <Node id="n1_6" kind="neuron" label=""/>
    <Node id="n1_7" kind="neuron" label=""/>
    <Node id="n1_8" kind="neuron" label=""/>
    <Node id="n1_9" kind="neuron" label=""/>
    <Node id="n1_10" kind="neuron" label=""/>
    <Node id="n1_11" kind="neuron" label=""/>
    <Node id="n1_12" kind="neuron" label=""/>
    <Node id="n1_13" kind="neuron" label=""/>
    <Node id="n1_14" kind="neuron" label=""/>
    <Node id="n1_15" kind="neuron" label=""/>
    <Node id="n2_0" kind="neuron" label=""/>
    <Node id="n2_1" kind="neuron" label=""/>
    <Node id="n2_2" kind="neuron" label=""/>
    <Node id="n2_3" kind="neuron" label=""/>
    <Node id="n2_4" kind="neuron" label=""/>
    <Node id="n2_5" kind="neuron" label=""/>
    <Node id="n2_6" kind="neuron" label=""/>
    <Node id="n2_7" kind="neuron" label=""/>
    <Node id="n2_8" kind="neuron" label=""/>
    <Node id="n2_9" kind="neuron" label=""/>
    <Node id="n2_10" kind="neuron" label=""/>
    <Node id="n2_11" kind="neuron" label=""/>
    <Node id="n2_12" kind="neuron" label=""/>
    <Node id="n2_13" kind="neuron" label=""/>
    <Node id="n2_14" kind="neuron" label=""/>
    <Node id="n2_15" kind="neuron" label=""/>
    <Node id="n3_0" kind="neuron" label=""/>
    <Edge id="e0_0_0" from="n0_0" to="n1_0"/>
    <Edge id="e0_0_1" from="n0_0" to="n1_1"/>
    <Edge id="e0_0_2" from="n0_0" to="n1_2"/>
    <Edge id="e0_0_3" from="n0_0" to="n1_3"/>
    <Edge id="e0_0_4" from="n0_0" to="n1_4"/>
    <Edge id="e0_0_5" from="n0_0" to="n1_5"/>
    <Edge id="e0_0_6" from="n0_0" to="n1_6"/>
    <Edge id="e0_0_7" from="n0_0" to="n1_7"/>
    <Edge id="e0_0_8" from="n0_0" to="n1_8"/>
    <Edge id="e0_0_9" from="n0_0" to="n1_9"/>
    <Edge id="e0_0_10" from="n0_0" to="n1_10"/>
    <Edge id="e0_0_11" from="n0_0" to="n1_11"/>
    <Edge id="e0_0_12" from="n0_0" to="n1_12"/>
    <Edge id="e0_0_13" from="n0_0" to="n1_13"/>
    <Edge id="e0_0_14" from="n0_0" to="n1_14"/>
    <Edge id="e0_0_15" from="n0_0" to="n1_15"/>
    <Edge id="e0_1_0" from="n0_1" to="n1_0"/>
    <Edge id="e0_1_1" from="n0_1" to="n1_1"/>
    <Edge id="e0_1_2" from="n0_1" to="n1_2"/>
    <Edge id="e0_1_3" from="n0_1" to="n1_3"/>
    <Edge id="e0_1_4" from="n0_1" to="n1_4"/>
    <Edge id="e0_1_5" from="n0_1" to="n1_5"/>
    <Edge id="e0_1_6" from="n0_1" to="n1_6"/>
    <Edge id="e0_1_7" from="n0_1" to="n1_7"/>
    <Edge id="e0_1_8" from="n0_1" to="n1_8"/>
    <Edge id="e0_1_9" from="n0_1" to="n1_9"/>
    <Edge id="e0_1_10" from="n0_1" to="n1_10"/>
    <Edge id="e0_1_11" from="n0_1" to="n1_11"/>
    <Edge id="e0_1_12" from="n0_1" to="n1_12"/>
    <Edge id="e0_1_13" from="n0_1" to="n1_13"/>
    <Edge id="e0_1_14" from="n0_1" to="n1_14"/>
    <Edge id="e0_1_15" from="n0_1" to="n1_15"/>
    <Edge id="e1_0_0" from="n1_0" to="n2_0"/>
    <Edge id="e1_0_1" from="n1_0" to="n2_1"/>
    <Edge id="e1_0_2" from="n1_0" to="n2_2"/>
    <Edge id="e1_0_3" from="n1_0" to="n2_3"/>
    <Edge id="e1_0_4" from="n1_0" to="n2_4"/>
    <Edge id="e1_0_5" from="n1_0" to="n2_5"/>
    <Edge id="e1_0_6" from="n1_0" to="n2_6"/>
    <Edge id="e1_0_7" from="n1_0" to="n2_7"/>
    <Edge id="e1_0_8" from="n1_0" to="n2_8"/>
    <Edge id="e1_0_9" from="n1_0" to="n2_9"/>
    <Edge id="e1_0_10" from="n1_0" to="n2_10"/>
    <Edge id="e1_0_11" from="n1_0" to="n2_11"/>
    <Edge id="e1_0_12" from="n1_0" to="n2_12"/>
    <Edge id="e1_0_13" from="n1_0" to="n2_13"/>
    <Edge id="e1_0_14" from="n1_0" to="n2_14"/>
    <Edge id="e1_0_15" from="n1_0" to="n2_15"/>
    <Edge id="e1_1_0" from="n1_1" to="n2_0"/>
    <Edge id="e1_1_1" from="n1_1" to="n2_1"/>
    <Edge id="e1_1_2" from="n1_1" to="n2_2"/>
    <Edge id="e1_1_3" from="n1_1" to="n2_3"/>
    <Edge id="e1_1_4" from="n1_1" to="n2_4"/>
    <Edge id="e1_1_5" from="n1_1" to="n2_5"/>
    <Edge id="e1_1_6" from="n1_1" to="n2_6"/>
    <Edge id="e1_1_7" from="n1_1" to="n2_7"/>
    <Edge id="e1_1_8" from="n1_1" to="n2_8"/>
    <Edge id="e1_1_9" from="n1_1" to="n2_9"/>
    <Edge id="e1_1_10" from="n1_1" to="n2_10"/>
    <Edge id="e1_1_11" from="n1_1" to="n2_11"/>
    <Edge id="e1_1_12" from="n1_1" to="n2_12"/>
    <Edge id="e1_1_13" from="n1_1" to="n2_13"/>
    <Edge id="e1_1_14" from="n1_1" to="n2_14"/>
    <Edge id="e1_1_15" from="n1_1" to="n2_15"/>
    <Edge id="e1_2_0" from="n1_2" to="n2_0"/>
    <Edge id="e1_2_1" from="n1_2" to="n2_1"/>
    <Edge id="e1_2_2" from="n1_2" to="n2_2"/>
    <Edge id="e1_2_3" from="n1_2" to="n2_3"/>
    <Edge id="e1_2_4" from="n1_2" to="n2_4"/>
    <Edge id="e1_2_5" from="n1_2" to="n2_5"/>
    <Edge id="e1_2_6" from="n1_2" to="n2_6"/>
    <Edge id="e1_2_7" from="n1_2" to="n2_7"/>
    <Edge id="e1_2_8" from="n1_2" to="n2_8"/>
    <Edge id="e1_2_9" from="n1_2" to="n2_9"/>
    <Edge id="e1_2_10" from="n1_2" to="n2_10"/>
    <Edge id="e1_2_11" from="n1_2" to="n2_11"/>
    <Edge id="e1_2_12" from="n1_2" to="n2_12"/>
    <Edge id="e1_2_13" from="n1_2" to="n2_13"/>
    <Edge id="e1_2_14" from="n1_2" to="n2_14"/>
    <Edge id="e1_2_15" from="n1_2" to="n2_15"/>
    <Edge id="e1_3_0" from="n1_3" to="n2_0"/>
    <Edge id="e1_3_1" from="n1_3" to="n2_1"/>
    <Edge id="e1_3_2" from="n1_3" to="n2_2"/>
    <Edge id="e1_3_3" from="n1_3" to="n2_3"/>
    <Edge id="e1_3_4" from="n1_3" to="n2_4"/>
    <Edge id="e1_3_5" from="n1_3" to="n2_5"/>
    <Edge id="e1_3_6" from="n1_3" to="n2_6"/>
    <Edge id="e1_3_7" from="n1_3" to="n2_7"/>
    <Edge id="e1_3_8" from="n1_3" to="n2_8"/>
    <Edge id="e1_3_9" from="n1_3" to="n2_9"/>
    <Edge id="e1_3_10" from="n1_3" to="n2_10"/>
    <Edge id="e1_3_11" from="n1_3" to="n2_11"/>
    <Edge id="e1_3_12" from="n1_3" to="n2_12"/>
    <Edge id="e1_3_13" from="n1_3" to="n2_13"/>
    <Edge id="e1_3_14" from="n1_3" to="n2_14"/>
    <Edge id="e1_3_15" from="n1_3" to="n2_15"/>
    <Edge id="e1_4_0" from="n1_4" to="n2_0"/>
    <Edge id="e1_4_1" from="n1_4" to="n2_1"/>
    <Edge id="e1_4_2" from="n1_4" to="n2_2"/>
    <Edge id="e1_4_3" from="n1_4" to="n2_3"/>
    <Edge id="e1_4_4" from="n1_4" to="n2_4"/>
    <Edge id="e1_4_5" from="n1_4" to="n2_5"/>
    <Edge id="e1_4_6" from="n1_4" to="n2_6"/>
    <Edge id="e1_4_7" from="n1_4" to="n2_7"/>
    <Edge id="e1_4_8" from="n1_4" to="n2_8"/>
    <Edge id="e1_4_9" from="n1_4" to="n2_9"/>
    <Edge id="e1_4_10" from="n1_4" to="n2_10"/>
    <Edge id="e1_4_11" from="n1_4" to="n2_11"/>
    <Edge id="e1_4_12" from="n1_4" to="n2_12"/>
    <Edge id="e1_4_13" from="n1_4" to="n2_13"/>
    <Edge id="e1_4_14" from="n1_4" to="n2_14"/>
    <Edge id="e1_4_15" from="n1_4" to="n2_15"/>
    <Edge id="e1_5_0" from="n1_5" to="n2_0"/>
    <Edge id="e1_5_1" from="n1_5" to="n2_1"/>
    <Edge id="e1_5_2" from="n1_5" to="n2_2"/>
    <Edge id="e1_5_3" from="n1_5" to="n2_3"/>
    <Edge id="e1_5_4" from="n1_5" to="n2_4"/>
    <Edge id="e1_5_5" from="n1_5" to="n2_5"/>
    <Edge id="e1_5_6" from="n1_5" to="n2_6"/>
    <Edge id="e1_5_7" from="n1_5" to="n2_7"/>
    <Edge id="e1_5_8" from="n1_5" to="n2_8"/>
    <Edge id="e1_5_9" from="n1_5" to="n2_9"/>
    <Edge id="e1_5_10" from="n1_5" to="n2_10"/>
    <Edge id="e1_5_11" from="n1_5" to="n2_11"/>
    <Edge id="e1_5_12" from="n1_5" to="n2_12"/>
    <Edge id="e1_5_13" from="n1_5" to="n2_13"/>
    <Edge id="e1_5_14" from="n1_5" to="n2_14"/>
    <Edge id="e1_5_15" from="n1_5" to="n2_15"/>
    <Edge id="e1_6_0" from="n1_6" to="n2_0"/>
    <Edge id="e1_6_1" from="n1_6" to="n2_1"/>
    <Edge id="e1_6_2" from="n1_6" to="n2_2"/>
    <Edge id="e1_6_3" from="n1_6" to="n2_3"/>
    <Edge id="e1_6_4" from="n1_6" to="n2_4"/>
    <Edge id="e1_6_5" from="n1_6" to="n2_5"/>
    <Edge id="e1_6_6" from="n1_6" to="n2_6"/>
    <Edge id="e1_6_7" from="n1_6" to="n2_7"/>
    <Edge id="e1_6_8" from="n1_6" to="n2_8"/>
    <Edge id="e1_6_9" from="n1_6" to="n2_9"/>
    <Edge id="e1_6_10" from="n1_6" to="n2_10"/>
    <Edge id="e1_6_11" from="n1_6" to="n2_11"/>
    <Edge id="e1_6_12" from="n1_6" to="n2_12"/>
    <Edge id="e1_6_13" from="n1_6" to="n2_13"/>
    <Edge id="e1_6_14" from="n1_6" to="n2_14"/>
    <Edge id="e1_6_15" from="n1_6" to="n2_15"/>
    <Edge id="e1_7_0" from="n1_7" to="n2_0"/>
    <Edge id="e1_7_1" from="n1_7" to="n2_1"/>
    <Edge id="e1_7_2" from="n1_7" to="n2_2"/>
    <Edge id="e1_7_3" from="n1_7" to="n2_3"/>
    <Edge id="e1_7_4" from="n1_7" to="n2_4"/>
    <Edge id="e1_7_5" from="n1_7" to="n2_5"/>
    <Edge id="e1_7_6" from="n1_7" to="n2_6"/>
    <Edge id="e1_7_7" from="n1_7" to="n2_7"/>
    <Edge id="e1_7_8" from="n1_7" to="n2_8"/>
    <Edge id="e1_7_9" from="n1_7" to="n2_9"/>
    <Edge id="e1_7_10" from="n1_7" to="n2_10"/>
    <Edge id="e1_7_11" from="n1_7" to="n2_11"/>
    <Edge id="e1_7_12" from="n1_7" to="n2_12"/>
    <Edge id="e1_7_13" from="n1_7" to="n2_13"/>
    <Edge id="e1_7_14" from="n1_7" to="n2_14"/>
    <Edge id="e1_7_15" from="n1_7" to="n2_15"/>
    <Edge id="e1_8_0" from="n1_8" to="n2_0"/>
    <Edge id="e1_8_1" from="n1_8" to="n2_1"/>
    <Edge id="e1_8_2" from="n1_8" to="n2_2"/>
    <Edge id="e1_8_3" from="n1_8" to="n2_3"/>
    <Edge id="e1_8_4" from="n1_8" to="n2_4"/>
    <Edge id="e1_8_5" from="n1_8" to="n2_5"/>
    <Edge id="e1_8_6" from="n1_8" to="n2_6"/>
    <Edge id="e1_8_7" from="n1_8" to="n2_7"/>
    <Edge id="e1_8_8" from="n1_8" to="n2_8"/>
    <Edge id="e1_8_9" from="n1_8" to="n2_9"/>
    <Edge id="e1_8_10" from="n1_8" to="n2_10"/>
    <Edge id="e1_8_11" from="n1_8" to="n2_11"/>
    <Edge id="e1_8_12" from="n1_8" to="n2_12"/>
    <Edge id="e1_8_13" from="n1_8" to="n2_13"/>
    <Edge id="e1_8_14" from="n1_8" to="n2_14"/>
    <Edge id="e1_8_15" from="n1_8" to="n2_15"/>
    <Edge id="e1_9_0" from="n1_9" to="n2_0"/>
    <Edge id="e1_9_1" from="n1_9" to="n2_1"/>
    <Edge id="e1_9_2" from="n1_9" to="n2_2"/>
    <Edge id="e1_9_3" from="n1_9" to="n2_3"/>
    <Edge id="e1_9_4" from="n1_9" to="n2_4"/>
    <Edge id="e1_9_5" from="n1_9" to="n2_5"/>
    <Edge id="e1_9_6" from="n1_9" to="n2_6"/>
    <Edge id="e1_9_7" from="n1_9" to="n2_7"/>
    <Edge id="e1_9_8" from="n1_9" to="n2_8"/>
    <Edge id="e1_9_9" from="n1_9" to="n2_9"/>
    <Edge id="e1_9_10" from="n1_9" to="n2_10"/>
    <Edge id="e1_9_11" from="n1_9" to="n2_11"/>
    <Edge id="e1_9_12" from="n1_9" to="n2_12"/>
    <Edge id="e1_9_13" from="n1_9" to="n2_13"/>
    <Edge id="e1_9_14" from="n1_9" to="n2_14"/>
    <Edge id="e1_9_15" from="n1_9" to="n2_15"/>
    <Edge id="e1_10_0" from="n1_10" to="n2_0"/>
    <Edge id="e1_10_1" from="n1_10" to="n2_1"/>
    <Edge id="e1_10_2" from="n1_10" to="n2_2"/>
    <Edge id="e1_10_3" from="n1_10" to="n2_3"/>
    <Edge id="e1_10_4" from="n1_10" to="n2_4"/>
    <Edge id="e1_10_5" from="n1_10" to="n2_5"/>
    <Edge id="e1_10_6" from="n1_10" to="n2_6"/>
    <Edge id="e1_10_7" from="n1_10" to="n2_7"/>
    <Edge id="e1_10_8" from="n1_10" to="n2_8"/>
    <Edge id="e1_10_9" from="n1_10" to="n2_9"/>
    <Edge id="e1_10_10" from="n1_10" to="n2_10"/>
    <Edge id="e1_10_11" from="n1_10" to="n2_11"/>
    <Edge id="e1_10_12" from="n1_10" to="n2_12"/>
    <Edge id="e1_10_13" from="n1_10" to="n2_13"/>
    <Edge id="e1_10_14" from="n1_10" to="n2_14"/>
    <Edge id="e1_10_15" from="n1_10" to="n2_15"/>
    <Edge id="e1_11_0" from="n1_11" to="n2_0"/>
    <Edge id="e1_11_1" from="n1_11" to="n2_1"/>
    <Edge id="e1_11_2" from="n1_11" to="n2_2"/>
    <Edge id="e1_11_3" from="n1_11" to="n2_3"/>
    <Edge id="e1_11_4" from="n1_11" to="n2_4"/>
    <Edge id="e1_11_5" from="n1_11" to="n2_5"/>
    <Edge id="e1_11_6" from="n1_11" to="n2_6"/>
    <Edge id="e1_11_7" from="n1_11" to="n2_7"/>
    <Edge id="e1_11_8" from="n1_11" to="n2_8"/>
    <Edge id="e1_11_9" from="n1_11" to="n2_9"/>
    <Edge id="e1_11_10" from="n1_11" to="n2_10"/>
    <Edge id="e1_11_11" from="n1_11" to="n2_11"/>
    <Edge id="e1_11_12" from="n1_11" to="n2_12"/>
    <Edge id="e1_11_13" from="n1_11" to="n2_13"/>
    <Edge id="e1_11_14" from="n1_11" to="n2_14"/>
    <Edge id="e1_11_15" from="n1_11" to="n2_15"/>
    <Edge id="e1_12_0" from="n1_12" to="n2_0"/>
    <Edge id="e1_12_1" from="n1_12" to="n2_1"/>
    <Edge id="e1_12_2" from="n1_12" to="n2_2"/>
    <Edge id="e1_12_3" from="n1_12" to="n2_3"/>
    <Edge id="e1_12_4" from="n1_12" to="n2_4"/>
    <Edge id="e1_12_5" from="n1_12" to="n2_5"/>
    <Edge id="e1_12_6" from="n1_12" to="n2_6"/>
    <Edge id="e1_12_7" from="n1_12" to="n2_7"/>
    <Edge id="e1_12_8" from="n1_12" to="n2_8"/>
    <Edge id="e1_12_9" from="n1_12" to="n2_9"/>
    <Edge id="e1_12_10" from="n1_12" to="n2_10"/>
    <Edge id="e1_12_11" from="n1_12" to="n2_11"/>
    <Edge id="e1_12_12" from="n1_12" to="n2_12"/>
    <Edge id="e1_12_13" from="n1_12" to="n2_13"/>
    <Edge id="e1_12_14" from="n1_12" to="n2_14"/>
    <Edge id="e1_12_15" from="n1_12" to="n2_15"/>
    <Edge id="e1_13_0" from="n1_13" to="n2_0"/>
    <Edge id="e1_13_1" from="n1_13" to="n2_1"/>
    <Edge id="e1_13_2" from="n1_13" to="n2_2"/>
    <Edge id="e1_13_3" from="n1_13" to="n2_3"/>
    <Edge id="e1_13_4" from="n1_13" to="n2_4"/>
    <Edge id="e1_13_5" from="n1_13" to="n2_5"/>
    <Edge id="e1_13_6" from="n1_13" to="n2_6"/>
    <Edge id="e1_13_7" from="n1_13" to="n2_7"/>
    <Edge id="e1_13_8" from="n1_13" to="n2_8"/>
    <Edge id="e1_13_9" from="n1_13" to="n2_9"/>
    <Edge id="e1_13_10" from="n1_13" to="n2_10"/>
    <Edge id="e1_13_11" from="n1_13" to="n2_11"/>
    <Edge id="e1_13_12" from="n1_13" to="n2_12"/>
    <Edge id="e1_13_13" from="n1_13" to="n2_13"/>
    <Edge id="e1_13_14" from="n1_13" to="n2_14"/>
    <Edge id="e1_13_15" from="n1_13" to="n2_15"/>
    <Edge id="e1_14_0" from="n1_14" to="n2_0"/>
    <Edge id="e1_14_1" from="n1_14" to="n2_1"/>
    <Edge id="e1_14_2" from="n1_14" to="n2_2"/>
    <Edge id="e1_14_3" from="n1_14" to="n2_3"/>
    <Edge id="e1_14_4" from="n1_14" to="n2_4"/>
    <Edge id="e1_14_5" from="n1_14" to="n2_5"/>
    <Edge id="e1_14_6" from="n1_14" to="n2_6"/>
    <Edge id="e1_14_7" from="n1_14" to="n2_7"/>
    <Edge id="e1_14_8" from="n1_14" to="n2_8"/>
    <Edge id="e1_14_9" from="n1_14" to="n2_9"/>
    <Edge id="e1_14_10" from="n1_14" to="n2_10"/>
    <Edge id="e1_14_11" from="n1_14" to="n2_11"/>
    <Edge id="e1_14_12" from="n1_14" to="n2_12"/>
    <Edge id="e1_14_13" from="n1_14" to="n2_13"/>
    <Edge id="e1_14_14" from="n1_14" to="n2_14"/>
    <Edge id="e1_14_15" from="n1_14" to="n2_15"/>
    <Edge id="e1_15_0" from="n1_15" to="n2_0"/>
    <Edge id="e1_15_1" from="n1_15" to="n2_1"/>
    <Edge id="e1_15_2" from="n1_15" to="n2_2"/>
    <Edge id="e1_15_3" from="n1_15" to="n2_3"/>
    <Edge id="e1_15_4" from="n1_15" to="n2_4"/>
    <Edge id="e1_15_5" from="n1_15" to="n2_5"/>
    <Edge id="e1_15_6" from="n1_15" to="n2_6"/>
    <Edge id="e1_15_7" from="n1_15" to="n2_7"/>
    <Edge id="e1_15_8" from="n1_15" to="n2_8"/>
    <Edge id="e1_15_9" from="n1_15" to="n2_9"/>
    <Edge id="e1_15_10" from="n1_15" to="n2_10"/>
    <Edge id="e1_15_11" from="n1_15" to="n2_11"/>
    <Edge id="e1_15_12" from="n1_15" to="n2_12"/>
    <Edge id="e1_15_13" from="n1_15" to="n2_13"/>
    <Edge id="e1_15_14" from="n1_15" to="n2_14"/>
    <Edge id="e1_15_15" from="n1_15" to="n2_15"/>
    <Edge id="e2_0_0" from="n2_0" to="n3_0"/>
    <Edge id="e2_1_0" from="n2_1" to="n3_0"/>
    <Edge id="e2_2_0" from="n2_2" to="n3_0"/>
    <Edge id="e2_3_0" from="n2_3" to="n3_0"/>
    <Edge id="e2_4_0" from="n2_4" to="n3_0"/>
    <Edge id="e2_5_0" from="n2_5" to="n3_0"/>
    <Edge id="e2_6_0" from="n2_6" to="n3_0"/>
    <Edge id="e2_7_0" from="n2_7" to="n3_0"/>
    <Edge id="e2_8_0" from="n2_8" to="n3_0"/>
    <Edge id="e2_9_0" from="n2_9" to="n3_0"/>
    <Edge id="e2_10_0" from="n2_10" to="n3_0"/>
    <Edge id="e2_11_0" from="n2_11" to="n3_0"/>
    <Edge id="e2_12_0" from="n2_12" to="n3_0"/>
    <Edge id="e2_13_0" from="n2_13" to="n3_0"/>
    <Edge id="e2_14_0" from="n2_14" to="n3_0"/>
    <Edge id="e2_15_0" from="n2_15" to="n3_0"/>
  </Graph>
  <Text id="neuron-label" text="one neuron" style="label"/>
  <Math
    id="neuron"
    tex={"\\mathrm{ReLU}(\\,{\\color{#FF8A4C}w_1}\\,x_1 + {\\color{#FF8A4C}w_2}\\,x_2 + {\\color{#FF8A4C}b}\\,)"}
  />
  <Text id="neuron-note" text="every w and b is a Value with its own .grad" style="caption"/>
  <Card id="params" title="trainable Values">
    <Field id="l1" label="layer 1" value="16 × (2 + 1) = 48"/>
    <Field id="l2" label="layer 2" value="16 × (16 + 1) = 272"/>
    <Field id="out" label="output" value="1 × (16 + 1) = 17"/>
  </Card>
  <Counter id="params-total" value={337} style="grad" caption="trainable Values"/>
  <Chart
    id="moons"
    kind="scatter"
    data={{asset: "moons"}}
    encoding={{x: "x", y: "y", color: "class", value: "v"}}
    label="Two moons with the learned decision boundary"
  />
  <Text id="moons-note" text="our micrograd run · 100 SGD steps · 100% train accuracy" style="note"/>
  <Card id="step-forward" kicker="01 · forward" title="Record every operation" body="Value._prev, Value._op"/>
  <Card id="step-backward" kicker="02 · backward" title="Chain rule, in reverse" body="topological sort → _backward()"/>
  <Text id="outro-line" text="PyTorch does the same on tensors and GPUs — the idea is this small." style="centerSub"/>
  <Text id="outro-url" text="github.com/karpathy/micrograd" style="url"/>
  <Text id="footer" text="explainer made with VisoTalk" style="footer"/>

  <Scene
    id="hook"
    pattern="title"
    slots={{kicker: ["fw-pytorch", "fw-tf", "fw-jax"], title: "autodiff"}}
    options={{flow: {kicker: "center"}, gap: 24}}
  >
    <Beat id="idea">
      <State target="n-engine" visible={false}/>
      <State target="n-nn" visible={false}/>
      <State target="n-total" visible={false}/>
      <Line
        id="k1"
        text="Every deep learning framework you have heard of is built on one idea: automatic differentiation."
      />
      <Appear on={["fw-pytorch", "fw-tf", "fw-jax"]} line="k1" offset={0.3} stagger={0.3}/>
      <Appear on="autodiff" line="k1" word="automatic differentiation"/>
    </Beat>
    <Beat
      id="micrograd"
      pattern="title"
      slots={{
        title: "mg-title",
        subtitle: "byline",
        aside: ["n-engine", "n-plus", "n-nn", "n-eq", "n-total"]
      }}
    >
      <State target="n-engine" visible/>
      <State target="n-nn" visible/>
      <State target="n-total" visible/>
      <Line
        id="k2"
        text="micrograd, by Andrej Karpathy, shows that entire idea in about a hundred and fifty lines of Python."
      />
      <Disappear on={["fw-pytorch", "fw-tf", "fw-jax", "autodiff"]} at="start"/>
      <Appear on="mg-title" line="k2" offset={0.2}/>
      <Appear on="byline" line="k2" offset={0.7}/>
      <CountUp on="n-engine" line="k2" offset={3} dur={1} id="engine-count"/>
      <Appear on="n-plus" line="k2" offset={3.3}/>
      <CountUp on="n-nn" line="k2" offset={3.6} dur={1}/>
      <Appear on="n-eq" after="engine-count"/>
      <CountUp on="n-total" line="k2" offset={4.3} dur={1}/>
      <Appear on={["n-engine", "n-nn", "n-total"]} line="k2" offset={3} stagger={0.65}/>
    </Beat>
  </Scene>

  <Scene
    id="value"
    pattern="board"
    slots={{kicker: "k-value", main: "code-value", side: "card-z"}}
    options={{titleH: 0, band: false, note: false, side: 0.33}}
  >
    <Beat id="all">
      <Line id="v1" text="It starts with a single class, called Value."/>
      <Line id="v2" text="A Value wraps one number, and a slot for its gradient."/>
      <Line
        id="v3"
        text="It also remembers where it came from: the values it was computed from, and the operation that produced it."
      />
      <Appear on="code-value" line="v1" offset={0.1}/>
      <Appear on="card-z" line="v1" offset={1}/>
      <Highlight on="code-value" line="v2" offset={0} params={{lines: [4, 5], color: "data"}}/>
      <Appear on="card-z#grad" line="v2" offset={0}/>
      <Highlight on="code-value" line="v3" offset={0} params={{lines: [7, 8], color: "op"}}/>
      <Appear on={["card-z#prev", "card-z#op"]} line="v3" offset={1.2} stagger={0.3}/>
    </Beat>
  </Scene>

  <Scene id="forward" pattern="dag" slots={{kicker: "k-forward", graph: "g"}}>
    <Beat id="all">
      <State target="g#x.grad" visible={false}/>
      <State target="g#y.grad" visible={false}/>
      <State target="g#z.grad" visible={false}/>
      <State target="g#c.grad" visible={false}/>
      <State target="g#o.grad" visible={false}/>
      <Line id="f1" text="Take x equal to two, and y equal to minus three."/>
      <Line id="f2" text="Multiply them, and you get z, minus six."/>
      <Line id="f3" text="Add ten, and the output is four."/>
      <Line id="f4" text="Every step quietly records an edge, so plain arithmetic builds a graph as it runs."/>
      <Appear on="g#x" line="f1" offset={0.2}/>
      <Appear on="g#y" line="f1" offset={1.5}/>
      <Appear on="g#mul" line="f2" offset={0}/>
      <Appear on="g#z" line="f2" offset={1.4}/>
      <Appear on="g#c" line="f3" offset={0}/>
      <Appear on="g#add" line="f3" offset={0.3}/>
      <Appear on="g#o" line="f3" offset={1}/>
      <DrawIn on={["g#xm", "g#ym"]} line="f2" offset={0.2} dur={0.5}/>
      <DrawIn on="g#mz" line="f2" offset={1} dur={0.5}/>
      <DrawIn on={["g#za", "g#ca"]} line="f3" offset={0.5} dur={0.5}/>
      <DrawIn on="g#ao" line="f3" offset={0.8} dur={0.5}/>
      <Flow on={["g#xm", "g#ym", "g#mz", "g#za", "g#ca", "g#ao"]} line="f4" offset={0.3} dur={1.2} stagger={0.4}/>
    </Beat>
  </Scene>

  <Scene id="question" pattern="dag" slots={{kicker: "k-question", graph: "g", title: "q-formula", note: "q-gradient"}}>
    <Beat id="all">
      <Line id="q1">Training asks one question about that graph.</Line>
      <Line id="q2" text="If I nudge x a little, how much does the output change?"/>
      <Line id="q3" text="That number is the gradient."/>
      <Highlight on={["g#x", "g#o"]} line="q2" offset={0} dur={7}/>
      <Appear on="q-formula" line="q2" offset={0.8}/>
      <Appear on="q-gradient" line="q3" offset={0.1}/>
    </Beat>
  </Scene>

  <Scene
    id="rules"
    pattern="compare"
    slots={{
      kicker: "k-rules",
      title: "rules-title",
      left: ["t-add", "g-add", "code-add"],
      right: ["t-mul", "g-mul", "code-mul"]
    }}
    options={{stack: ["left", "right"], gap: 24}}
  >
    <Beat id="all">
      <Line id="r1" text="Each operation only knows its own local rule."/>
      <Line id="r2" text="Addition passes the incoming gradient straight through, to both inputs."/>
      <Line id="r3" text="Multiplication gives each input the other input's value, times the incoming gradient."/>
      <Appear on="rules-title" line="r1" offset={0.2}/>
      <Appear on={["t-add", "g-add", "code-add"]} line="r2" offset={0.2} stagger={0.15}/>
      <Flow
        on={["g-add#oo", "g-add#ao", "g-add#bo"]}
        line="r2"
        offset={1.2}
        stagger={0.3}
        params={{direction: "backward"}}
      />
      <Appear on={["t-mul", "g-mul", "code-mul"]} line="r3" offset={0.2} stagger={0.15}/>
      <Flow
        on={["g-mul#oo", "g-mul#ao", "g-mul#bo"]}
        line="r3"
        offset={1.2}
        stagger={0.3}
        params={{direction: "backward"}}
      />
    </Beat>
  </Scene>

  <Scene
    id="backward"
    pattern="dag"
    slots={{kicker: "k-backward", graph: "g", title: "sweep", aside: ["rule-x", "rule-y"], note: "chain"}}
  >
    <Beat id="all">
      <Line id="b1" text="Calling backward sets the output's gradient to one."/>
      <Line id="b2" text="It sorts the graph, so every node comes after its inputs, then walks it in reverse."/>
      <Line id="b3" text="The plus node hands one to z."/>
      <Line id="b4" text="The times node gives x the value of y, minus three, and gives y the value of x, two."/>
      <Line id="b5" text="That is the chain rule, applied one node at a time."/>
      <Stamp on="g#o.grad" line="b1" offset={1.4} dur={0.4}/>
      <Set on="g#x" line="b2" offset={0.6} params={{props: {badge: 1}}}/>
      <Set on="g#y" line="b2" offset={0.95} params={{props: {badge: 2}}}/>
      <Set on="g#z" line="b2" offset={1.2999999999999998} params={{props: {badge: 3}}}/>
      <Set on="g#c" line="b2" offset={1.65} params={{props: {badge: 4}}}/>
      <Set on="g#o" line="b2" offset={2} params={{props: {badge: 5}}}/>
      <Appear on="sweep" line="b2" offset={3}/>
      <Disappear on="sweep" line="b3" offset={0}/>
      <Highlight on={["g#add", "g#ao", "g#za", "g#ca"]} line="b3" offset={0.1} params={{hold: true}}/>
      <Flow on="g#ao" line="b3" offset={0} dur={1.33} params={{direction: "backward"}}/>
      <Flow on={["g#za", "g#ca"]} line="b3" offset={0.4} dur={1.33} params={{direction: "backward"}}/>
      <Stamp on={["g#z.grad", "g#c.grad"]} line="b3" offset={0.9} dur={0.4}/>
      <Highlight on={["g#mul", "g#mz", "g#xm", "g#ym"]} line="b4" offset={0.3} params={{hold: true}}/>
      <Flow on="g#mz" line="b4" offset={0.2} dur={1.33} params={{direction: "backward"}}/>
      <Flow on="g#xm" line="b4" offset={1.2} dur={1.33} params={{direction: "backward"}}/>
      <Appear on="rule-x" line="b4" offset={1}/>
      <Stamp on="g#x.grad" line="b4" offset={2.4} dur={0.4}/>
      <Flow on="g#ym" line="b4" offset={3.4} dur={1.33} params={{direction: "backward"}}/>
      <Appear on="rule-y" line="b4" offset={3.2}/>
      <Stamp on="g#y.grad" line="b4" offset={4.6} dur={0.4}/>
      <Appear on="chain" line="b5" offset={0.2}/>
    </Beat>
  </Scene>

  <Scene
    id="verify"
    pattern="board"
    slots={{kicker: "k-verify", main: "code-readme", side: ["results", "tests"]}}
    options={{titleH: 0, band: false, note: false, side: 0.47, stack: ["side"], gap: 40}}
  >
    <Beat id="all">
      <Line id="w1" text="The same engine runs the bigger example in the README."/>
      <Line id="w2" text="We ran it ourselves: the forward pass gives twenty four point seven zero four one."/>
      <Line
        id="w3"
        text="The gradients come out to one thirty eight point eight three for a, and six forty five point five eight for b, exactly as documented."
      />
      <Line id="w4" text="The repository's tests check these gradients against PyTorch."/>
      <Appear on="code-readme" line="w1" offset={0.2}/>
      <Appear on="results" line="w2" offset={2.4}/>
      <Stamp on="results#g" line="w2" offset={2.6} dur={0.5}/>
      <Stamp on="results#a" line="w3" offset={1.2} dur={0.5}/>
      <Stamp on="results#b" line="w3" offset={3.6} dur={0.5}/>
      <Appear on="tests" line="w4" offset={0.3}/>
    </Beat>
  </Scene>

  <Scene
    id="nn"
    pattern="board"
    slots={{kicker: "k-nn", main: "net"}}
    options={{titleH: 0, band: false, note: false, side: 0.45, hasSide: true}}
  >
    <Beat id="library">
      <State target="params-total" visible={false}/>
      <Line id="n1" text="On top of the engine, sixty lines build a small neural network library."/>
      <DrawIn on="net" line="n1" offset={0.8} dur={2.8}/>
    </Beat>
    <Beat id="neuron" slots={{side: ["neuron-label", "neuron", "neuron-note"]}} options={{stack: ["side"], gap: 10}}>
      <Line id="n2" text="A neuron is just a weighted sum plus a bias, passed through a ReLU."/>
      <Highlight on={["net#n1_5", "net#e0_0_5", "net#e0_1_5"]} line="n2" offset={0.2} params={{hold: true}}/>
      <Appear on={["neuron-label", "neuron", "neuron-note"]} line="n2" offset={0.2} stagger={0.2}/>
    </Beat>
    <Beat id="params" slots={{side: ["params", "params-total"]}} options={{gap: 30}}>
      <State target="params-total" visible/>
      <Line
        id="n3"
        text="Stack two hidden layers of sixteen neurons, and you get three hundred thirty seven trainable Values."
      />
      <Disappear on={["neuron-label", "neuron", "neuron-note"]} at="start"/>
      <Appear on="params" line="n3" offset={0.3}/>
      <Appear on={["params#l1", "params#l2", "params#out"]} line="n3" offset={0.6} stagger={0.6}/>
      <CountUp on="params-total" line="n3" offset={2.6} dur={1.33}/>
    </Beat>
    <Beat id="moons" slots={{side: ["moons", "moons-note"]}} options={{gap: 20}}>
      <Line id="n4" text="That is enough to learn this curved decision boundary on the two moons dataset."/>
      <Disappear on={["params", "params-total"]} at="start"/>
      <Appear on="moons" line="n4" offset={0}/>
      <DrawIn on="moons" line="n4" offset={0.3} dur={1.5}/>
      <Appear on="moons-note" line="n4" offset={1.8}/>
    </Beat>
  </Scene>

  <Scene
    id="outro"
    pattern="title"
    slots={{
      title: ["step-forward", "step-backward"],
      subtitle: "outro-line",
      aside: ["outro-url", "footer"]
    }}
    options={{gap: 60}}
  >
    <Beat id="all">
      <Line
        id="o1"
        text="So that is the whole trick: record the operations on the way forward, then run the chain rule on the way back."
      />
      <Line id="o2" text="Real frameworks do it on tensors and GPUs, but the idea is exactly this small."/>
      <Line id="o3" text="Read the source on GitHub, at karpathy slash micrograd."/>
      <Appear on="step-forward" line="o1" offset={1.2}/>
      <Appear on="step-backward" line="o1" offset={3.8}/>
      <Appear on="outro-line" line="o2" offset={0.4}/>
      <Appear on={["outro-url", "footer"]} line="o3" offset={0.3}/>
    </Beat>
  </Scene>
</Doc>;
