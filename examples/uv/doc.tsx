import {Doc, Text, Shape, Terminal, Step, Scene, Beat, Line, Appear, Disappear, Tween, Set, Typewriter, Stamp} from '@visotalk/jsx';

export default <Doc id="uv" title="uv, the one tool for Python projects" lang="en" theme="visotalk/dark" canvas="16x9">
  <Text id="head1" text="Python project setup" style="title" look={{size: 72}}/>
  <Text id="kick1" text="Astral" style="kicker"/>
  <Shape id="t-pip" shape="rect" x={150} y={300} w={300} h={110} text="pip" look={{size: 44, font: "mono", color: "#4f9cf0", stroke: "#4f9cf0", fill: "panel", radius: 18}}/>
  <Shape id="j-pip" shape="rect" x={150} y={422} w={300} h={44} text="install packages" look={{size: 28, color: "muted", stroke: "transparent", fill: "transparent"}}/>
  <Shape id="t-virtualenv" shape="rect" x={610} y={300} w={300} h={110} text="virtualenv" look={{size: 44, font: "mono", color: "#3ecf8e", stroke: "#3ecf8e", fill: "panel", radius: 18}}/>
  <Shape id="j-virtualenv" shape="rect" x={610} y={422} w={300} h={44} text="environments" look={{size: 28, color: "muted", stroke: "transparent", fill: "transparent"}}/>
  <Shape id="t-piptools" shape="rect" x={1070} y={300} w={300} h={110} text="pip-tools" look={{size: 44, font: "mono", color: "#f0b429", stroke: "#f0b429", fill: "panel", radius: 18}}/>
  <Shape id="j-piptools" shape="rect" x={1070} y={422} w={300} h={44} text="pin versions" look={{size: 28, color: "muted", stroke: "transparent", fill: "transparent"}}/>
  <Shape id="t-pipx" shape="rect" x={1530} y={300} w={300} h={110} text="pipx" look={{size: 44, font: "mono", color: "#c084fc", stroke: "#c084fc", fill: "panel", radius: 18}}/>
  <Shape id="j-pipx" shape="rect" x={1530} y={422} w={300} h={44} text="command line tools" look={{size: 28, color: "muted", stroke: "transparent", fill: "transparent"}}/>
  <Shape id="t-pyenv" shape="rect" x={380} y={600} w={300} h={110} text="pyenv" look={{size: 44, font: "mono", color: "#f472b6", stroke: "#f472b6", fill: "panel", radius: 18}}/>
  <Shape id="j-pyenv" shape="rect" x={380} y={722} w={300} h={44} text="Python itself" look={{size: 28, color: "muted", stroke: "transparent", fill: "transparent"}}/>
  <Shape id="t-poetry" shape="rect" x={840} y={600} w={300} h={110} text="poetry" look={{size: 44, font: "mono", color: "#22d3ee", stroke: "#22d3ee", fill: "panel", radius: 18}}/>
  <Shape id="j-poetry" shape="rect" x={840} y={722} w={300} h={44} text="publish" look={{size: 28, color: "muted", stroke: "transparent", fill: "transparent"}}/>
  <Shape id="t-twine" shape="rect" x={1300} y={600} w={300} h={110} text="twine" look={{size: 44, font: "mono", color: "#fb923c", stroke: "#fb923c", fill: "panel", radius: 18}}/>
  <Shape id="j-twine" shape="rect" x={1300} y={722} w={300} h={44} text="publish" look={{size: 28, color: "muted", stroke: "transparent", fill: "transparent"}}/>
  <Shape id="uvblock" shape="rect" x={960} y={480} w={4} h={4} look={{stroke: "grad", fill: "grad", radius: 30}}/>
  <Shape id="uvtxt" shape="rect" x={560} y={380} w={800} h={200} text="uv" look={{size: 90, font: "mono", color: "#0a0d14", stroke: "transparent", fill: "transparent"}}/>
  <Shape id="ic-bin" shape="icon" icon="package" x={600} y={690} w={90} look={{stroke: "good", strokeWidth: 2.2}}/>
  <Shape id="tx-bin" shape="rect" x={710} y={690} w={360} h={90} text="one binary" look={{size: 48, color: "good", stroke: "transparent", fill: "transparent"}}/>
  <Shape id="ic-rust" shape="icon" icon="cog" x={1130} y={690} w={90} look={{stroke: "#fb923c", strokeWidth: 2.2}}/>
  <Shape id="tx-rust" shape="rect" x={1240} y={690} w={260} h={90} text="Rust" look={{size: 48, color: "#fb923c", stroke: "transparent", fill: "transparent"}}/>

  <Text id="head2" text="10x to 100x faster than pip?" style="title"/>
  <Text id="kick2" text="The README claim" style="kicker"/>
  <Shape id="r-line" shape="line" x1={260} y1={560} x2={1660} y2={560} draw={0} look={{stroke: "muted", strokeWidth: 4}}/>
  <Shape id="r-t1" shape="line" x1={260} y1={535} x2={260} y2={585} look={{stroke: "muted", strokeWidth: 4}}/>
  <Shape id="r-t10" shape="line" x1={960} y1={535} x2={960} y2={585} look={{stroke: "muted", strokeWidth: 4}}/>
  <Shape id="r-t100" shape="line" x1={1660} y1={535} x2={1660} y2={585} look={{stroke: "muted", strokeWidth: 4}}/>
  <Shape id="r-l1" shape="rect" x={190} y={600} w={140} h={60} text="1x" look={{size: 40, font: "mono", color: "muted", stroke: "transparent", fill: "transparent"}}/>
  <Shape id="r-l10" shape="rect" x={890} y={600} w={140} h={60} text="10x" look={{size: 40, font: "mono", color: "muted", stroke: "transparent", fill: "transparent"}}/>
  <Shape id="r-l100" shape="rect" x={1590} y={600} w={140} h={60} text="100x" look={{size: 40, font: "mono", color: "muted", stroke: "transparent", fill: "transparent"}}/>
  <Shape id="r-band" shape="rect" x={960} y={515} w={4} h={90} look={{stroke: "grad", fill: "grad", radius: 12}}/>
  <Shape id="r-pip" shape="rect" x={190} y={450} w={140} h={60} text="pip" look={{size: 40, font: "mono", color: "#4f9cf0", stroke: "transparent", fill: "transparent"}}/>

  <Text id="head3" text="The benchmark" style="title"/>
  <Shape id="k-ic1" shape="icon" icon="laptop" x={200} y={380} w={130} look={{stroke: "#4f9cf0", strokeWidth: 2}}/>
  <Shape id="k-tx1" shape="rect" x={120} y={540} w={290} h={120} text="same machine" look={{size: 38, color: "#4f9cf0", stroke: "transparent", fill: "transparent"}}/>
  <Shape id="k-ic2" shape="icon" icon="code" x={620} y={380} w={130} look={{stroke: "#f0b429", strokeWidth: 2}}/>
  <Shape id="k-tx2" shape="rect" x={540} y={540} w={290} h={120} text="same Python" look={{size: 38, color: "#f0b429", stroke: "transparent", fill: "transparent"}}/>
  <Shape id="k-ic3" shape="icon" icon="flame" x={1040} y={380} w={130} look={{stroke: "#fb923c", strokeWidth: 2}}/>
  <Shape id="k-tx3" shape="rect" x={960} y={540} w={290} h={120} text="warm cache" look={{size: 38, color: "#fb923c", stroke: "transparent", fill: "transparent"}}/>
  <Shape id="k-ic4" shape="icon" icon="package" x={1460} y={380} w={130} look={{stroke: "#3ecf8e", strokeWidth: 2}}/>
  <Shape id="k-tx4" shape="rect" x={1380} y={540} w={290} h={120} text="38 packages" look={{size: 38, color: "#3ecf8e", stroke: "transparent", fill: "transparent"}}/>
  <Shape id="k-sub" shape="rect" x={1380} y={650} w={290} h={50} text="Trio's docs" look={{size: 28, color: "muted", stroke: "transparent", fill: "transparent"}}/>

  <Text id="head4" text="Install time" style="title"/>
  <Shape id="b-pipl" shape="rect" x={120} y={360} w={200} h={90} text="pip" look={{size: 48, font: "mono", color: "#4f9cf0", stroke: "transparent", fill: "transparent"}}/>
  <Shape id="b-pip" shape="rect" x={340} y={360} w={4} h={90} look={{stroke: "#4f9cf0", fill: "#4f9cf0", radius: 14}}/>
  <Shape id="b-pipt" shape="rect" x={375} y={360} w={320} h={90} text="more than 8 s" look={{size: 44, weight: 700, color: "bg", stroke: "transparent", fill: "transparent", align: "left"}}/>
  <Shape id="b-uvl" shape="rect" x={120} y={560} w={200} h={90} text="uv" look={{size: 48, font: "mono", color: "good", stroke: "transparent", fill: "transparent"}}/>
  <Shape id="b-uv" shape="rect" x={340} y={560} w={4} h={90} look={{stroke: "good", fill: "good", radius: 8}}/>
  <Shape id="b-uvt" shape="rect" x={385} y={560} w={160} h={90} text="0.17 s" look={{size: 48, weight: 700, color: "good", stroke: "transparent", fill: "transparent"}}/>

  <Shape id="r-mark" shape="circle" x={1419} y={530} w={60} h={60} look={{stroke: "#fff", fill: "good", strokeWidth: 4}}/>
  <Shape id="r-50" shape="rect" x={1289} y={390} w={320} h={100} text="about 50x" look={{size: 60, weight: 700, color: "good", stroke: "good", fill: "panel", radius: 20}}/>

  <Text id="head5" text="A full project manager" style="title"/>
  <Shape id="poetry" shape="rect" x={660} y={440} w={600} h={150} text="poetry" look={{size: 80, font: "mono", color: "#22d3ee", stroke: "#22d3ee", fill: "panel", radius: 28}}/>
  <Terminal id="term" title="~/demo" scale={1.3}>
    <Step id="init" cmd="uv init demo" out={["Initialized project `demo`"]}/>
    <Step id="add" cmd="uv add requests" out={["Creating virtual environment at: .venv", "Resolved packages", "Installed packages"]}/>
    <Step id="run" cmd="uv run python main.py" out={["Hello from demo!"]}/>
    <Step id="lock" cmd="uv lock" out={["Resolved packages"]}/>
  </Terminal>
  <Shape id="f-ic1" shape="icon" icon="file-text" x={1040} y={290} w={70} look={{stroke: "#4f9cf0", strokeWidth: 2.2}}/>
  <Shape id="f-tx1" shape="rect" x={1130} y={285} w={380} h={80} text="pyproject.toml" look={{size: 44, font: "mono", color: "#4f9cf0", stroke: "transparent", fill: "transparent", align: "left"}}/>
  <Shape id="f-ic2" shape="icon" icon="lock" x={1040} y={530} w={70} look={{stroke: "#f0b429", strokeWidth: 2.2}}/>
  <Shape id="f-tx2" shape="rect" x={1130} y={525} w={200} h={80} text="uv.lock" look={{size: 44, font: "mono", color: "#f0b429", stroke: "transparent", fill: "transparent", align: "left"}}/>
  <Shape id="f-ic3" shape="icon" icon="folder" x={1040} y={410} w={70} look={{stroke: "#3ecf8e", strokeWidth: 2.2}}/>
  <Shape id="f-tx3" shape="rect" x={1130} y={405} w={170} h={80} text=".venv/" look={{size: 44, font: "mono", color: "#3ecf8e", stroke: "transparent", fill: "transparent", align: "left"}}/>
  <Shape id="act" shape="rect" x={1010} y={740} w={790} h={80} text="source .venv/bin/activate" look={{size: 36, font: "mono", color: "muted", stroke: "bad", fill: "transparent", radius: 14}}/>
  <Shape id="act-x" shape="line" x1={1010} y1={840} x2={1800} y2={720} draw={0} look={{stroke: "bad", strokeWidth: 8}}/>
  <Shape id="p-lin" shape="rect" x={1010} y={740} w={240} h={80} text="Linux" look={{size: 38, color: "#fb923c", stroke: "#fb923c", fill: "panel", radius: 16}}/>
  <Shape id="p-mac" shape="rect" x={1280} y={740} w={240} h={80} text="macOS" look={{size: 38, color: "#c084fc", stroke: "#c084fc", fill: "panel", radius: 16}}/>
  <Shape id="p-win" shape="rect" x={1550} y={740} w={240} h={80} text="Windows" look={{size: 38, color: "#4f9cf0", stroke: "#4f9cf0", fill: "panel", radius: 16}}/>
  <Shape id="e-lin" shape="line" x1={1075} y1={620} x2={1130} y2={730} arrow draw={0} look={{stroke: "#f0b429", strokeWidth: 3}}/>
  <Shape id="e-mac" shape="line" x1={1100} y1={620} x2={1400} y2={730} arrow draw={0} look={{stroke: "#f0b429", strokeWidth: 3}}/>
  <Shape id="e-win" shape="line" x1={1125} y1={620} x2={1670} y2={730} arrow draw={0} look={{stroke: "#f0b429", strokeWidth: 3}}/>

  <Scene id="tools" pattern="stage" slots={{title: "head1", kicker: "kick1", main: ["uvblock", "uvtxt", "ic-bin", "tx-bin", "ic-rust", "tx-rust", "t-pip", "j-pip", "t-virtualenv", "j-virtualenv", "t-piptools", "j-piptools", "t-pipx", "j-pipx", "t-pyenv", "j-pyenv", "t-poetry", "j-poetry", "t-twine", "j-twine"]}}>
    <Beat id="h1">
      <Line id="h1l">Setting up a <Appear on="head1">Python project</Appear> usually means juggling a pile of tools.</Line>
    </Beat>
    <Beat id="h2" hold={1.5}>
      <Line id="h2l"><Appear on="t-pip">pip</Appear> to <Appear on="j-pip">install packages</Appear>, <Appear on="t-virtualenv">virtualenv</Appear> for <Appear on="j-virtualenv">environments</Appear>, <Appear on="t-piptools">pip-tools</Appear> to <Appear on="j-piptools">pin versions</Appear>, <Appear on="t-pipx">pipx</Appear> for <Appear on="j-pipx">command line tools</Appear>, <Appear on="t-pyenv">pyenv</Appear> for <Appear on="j-pyenv">Python itself</Appear>, and <Appear on="t-poetry">poetry</Appear> or <Appear on="t-twine">twine</Appear> to <Appear on={["j-poetry", "j-twine"]}>publish</Appear>.</Line>
    </Beat>
    <Beat id="h3" hold={2.5}>
      <Line id="h3l"><Set on="head1" text="uv">uv</Set>, from <Appear on="kick1">Astral</Appear>, the team behind <Set on="kick1" text="Astral, the team behind Ruff">Ruff</Set>, <Disappear on={["j-pip", "j-virtualenv", "j-piptools", "j-pipx", "j-pyenv", "j-poetry", "j-twine"]} stagger={0.05}>replaces</Disappear> all of <Tween id="mv" on={["t-pip", "t-virtualenv", "t-piptools", "t-pipx", "t-pyenv", "t-poetry", "t-twine"]} x={810} y={425} dur={0.8}>them</Tween> with a <Appear on={["ic-bin", "tx-bin"]}>single binary</Appear>, written in <Appear on={["ic-rust", "tx-rust"]}>Rust</Appear>.</Line>
      <Disappear on={["t-pip", "t-virtualenv", "t-piptools", "t-pipx", "t-pyenv", "t-poetry", "t-twine"]} after="mv"/>
      <Appear on="uvblock" after="mv"/>
      <Appear on="uvtxt" after="mv" offset={0.7}/>
      <Tween on="uvblock" x={560} y={380} w={800} h={200} after="mv" dur={0.7}/>
    </Beat>
  </Scene>

  <Scene id="speed" pattern="stage" slots={{title: "head2", kicker: "kick2", main: ["r-line", "r-t1", "r-t10", "r-t100", "r-l1", "r-l10", "r-l100", "r-band", "r-pip"]}}>
    <Beat id="s1" hold={2}>
      <Line id="s1l">The headline feature is <Appear on={["head2", "kick2", "r-line"]}>speed</Appear>: the <Appear on={["r-t1", "r-t10", "r-t100", "r-l1", "r-l10", "r-l100"]}>README</Appear> claims <Appear on="r-band">ten to a hundred</Appear> times faster than <Appear on="r-pip">pip</Appear>.</Line>
      <Tween on="r-line" draw={1} line="s1l" word="speed" dur={0.8}/>
      <Tween on="r-band" w={700} line="s1l" word="ten to a hundred" dur={1.0}/>
    </Beat>
    <Beat id="s2" slots={{title: "head3", kicker: null, main: ["k-ic1", "k-tx1", "k-ic2", "k-tx2", "k-ic3", "k-tx3", "k-ic4", "k-tx4", "k-sub"]}} hold={1.5}>
      <Line id="s2l">So we measured it ourselves: <Appear on={["head3", "k-ic1", "k-tx1"]}>same machine</Appear>, <Appear on={["k-ic2", "k-tx2"]}>same Python</Appear>, a <Appear on={["k-ic3", "k-tx3"]}>warm cache</Appear>, and the <Appear on={["k-ic4", "k-tx4"]}>thirty eight packages</Appear> behind <Appear on="k-sub">Trio's documentation</Appear>.</Line>
    </Beat>
    <Beat id="s3" slots={{title: "head4", main: ["b-pipl", "b-pip", "b-pipt", "b-uvl", "b-uv", "b-uvt"]}} hold={2}>
      <Line id="s3l"><Appear on={["head4", "b-uvl", "b-uv"]}>uv</Appear> is done almost instantly, in about a <Appear on="b-uvt">sixth of a second</Appear>. <Appear on={["b-pipl", "b-pip"]}>pip needs</Appear> <Appear on="b-pipt">more than eight</Appear>.</Line>
      <Tween on="b-uv" w={28} line="s3l" word="uv" dur={0.3}/>
      <Tween on="b-pip" w={1300} line="s3l" word="pip needs" dur={1.6}/>
    </Beat>
    <Beat id="s4" slots={{title: "head2", kicker: "kick2", main: ["r-line", "r-t1", "r-t10", "r-t100", "r-l1", "r-l10", "r-l100", "r-band", "r-pip", "r-mark", "r-50"]}} hold={2.5}>
      <Line id="s4l">That is about <Appear on="r-mark">fifty</Appear> <Appear on="r-50">times faster</Appear>, right inside the range the README promises.</Line>
    </Beat>
  </Scene>

  <Scene id="project" pattern="split" slots={{title: "head5"}}>
    <Beat id="p1" slots={{right: ["poetry"]}}>
      <Line id="p1l">uv is also a full <Appear on="head5">project manager</Appear>, in the spirit of <Appear on="poetry">Poetry</Appear>.</Line>
    </Beat>
    <Beat id="p2" slots={{left: "term", right: ["f-ic1", "f-tx1", "f-ic2", "f-tx2", "f-ic3", "f-tx3"]}}>
      <Line id="p2l"><Typewriter on="term#init">uv init</Typewriter> <Appear on={["f-ic1", "f-tx1"]}>creates a project</Appear>, and <Typewriter on="term#add">uv add</Typewriter> resolves, <Appear on={["f-ic2", "f-tx2"]}>locks</Appear>, and installs a dependency, creating the <Appear on={["f-ic3", "f-tx3"]}>virtual environment</Appear> for you.</Line>
    </Beat>
    <Beat id="p3" slots={{right: ["f-ic1", "f-tx1", "f-ic2", "f-tx2", "f-ic3", "f-tx3", "act", "act-x"]}}>
      <Line id="p3l"><Typewriter on="term#run">uv run</Typewriter> executes commands inside that environment, so there is <Appear on="act">no activate step</Appear> to forget.</Line>
      <Tween on="act-x" draw={1} line="p3l" word="to forget" dur={0.6}/>
    </Beat>
    <Beat id="p4" slots={{right: ["f-ic1", "f-tx1", "f-ic2", "f-tx2", "f-ic3", "f-tx3", "p-lin", "p-mac", "p-win", "e-lin", "e-mac", "e-win"]}} hold={2.5}>
      <Line id="p4l">And <Typewriter on="term#lock">uv lock</Typewriter> maintains a universal lockfile that works across <Appear on={["p-lin", "p-mac", "p-win"]} stagger={0.25}>platforms</Appear>.</Line>
      <Tween on={["e-lin", "e-mac", "e-win"]} draw={1} line="p4l" word="platforms" offset={0.4} dur={0.6}/>
    </Beat>
  </Scene>
</Doc>;
