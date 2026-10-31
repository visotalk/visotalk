import {Doc, Scene, Line, Part, Animation, Appear, Tween} from '@visotalk/jsx';
import {Cover} from './parts/cover.tsx';
import {Uniform} from './parts/uniform.tsx';
import {Bernoulli} from './parts/bernoulli.tsx';
import {Binomial} from './parts/binomial.tsx';
import {Poisson} from './parts/poisson.tsx';
import {Geometric} from './parts/geometric.tsx';
import {Exponential} from './parts/exponential.tsx';
import {Normal} from './parts/normal.tsx';
import {Summary} from './parts/summary.tsx';

export default <Doc id="probability-shapes-zh" title={"概率分布：七种形状"} lang="zh-CN" voice={"minimax:Chinese (Mandarin)_Sincere_Adult"} speed={1} theme="visotalk/dark" canvas="16x9"
  tokens={{colors: {bg: '#131110'}, fonts: {sans: '"Noto Sans SC", sans-serif', mono: '"JetBrains Mono", monospace', display: '"Noto Serif SC", serif'},
    caption: {font: 'sans', size: 36, weight: 500, color: '#F1EAE0', background: 'rgba(15, 13, 12, 0.62)', radius: 8, padding: [10, 22], bottom: 36, maxWidth: 1500}}}>

  <Scene id="cover" title="封面">
    <Line id="c1">生活里到处是随机的数字：骰子的点数，人的身高，还要再等几分钟。</Line>
    <Line id="c2">它们看上去杂乱无章，其实都有各自的形状。</Line>
    <Line id="c3" hold={1.2}>这一集，我们认一认七种最常见的概率分布。</Line>

    <Part id="cover"><Cover /></Part>
    <Animation>
      <Appear target="cover" at="start" dur={0} />
      <Appear target={["shape-1", "shape-2", "shape-3", "shape-4", "shape-5", "shape-6", "shape-7"]} line="c2" word="形状" stagger={0.12} />
      <Appear target={["num-1", "num-2", "num-3", "num-4", "num-5", "num-6", "num-7"]} line="c3" word="七种" stagger={0.07} />
    </Animation>
  </Scene>

  <Scene id="uniform" title="均匀分布：掷骰子">
    <Line id="u1">先看最简单的一种：掷一次骰子。</Line>
    <Line id="u2">六个面，一到六，每一面的机会都是六分之一。</Line>
    <Line id="u3">把概率画成柱子的高度，六根柱子一样高。</Line>
    <Line id="u4">摸奖、摇号、抽签，画的都是这个形状。</Line>
    <Line id="u5">它叫均匀分布。</Line>
    <Line id="u6" hold={1.2}>每个结果，机会相同，这就是它的全部。</Line>

    <Part id="uniform"><Uniform /></Part>
    <Animation>
      <Appear target="uniform" at="start" dur={0.5} />
      <Tween target="uniform" to={{grow: 1}} line="u2" word="机会" dur={1.8} easing="easeOutQuart" />
      <Appear target="rule" line="u3" word="一样高" />
      <Appear target="tag-1" line="u4" word="摸奖" />
      <Appear target="tag-2" line="u4" word="摇号" />
      <Appear target="tag-3" line="u4" word="抽签" />
      <Appear target="formula" line="u5" word="均匀分布" />
    </Animation>
  </Scene>

  <Scene id="bernoulli" title="伯努利分布：一次硬币">
    <Line id="b1">如果一次试验，只有两个结果呢？</Line>
    <Line id="b2">抛一枚硬币，正面或者反面，这就是伯努利分布。</Line>
    <Line id="b3">一次罚球，进或不进；一次面试，过或不过。</Line>
    <Line id="b4" hold={1.2}>它只赌一把，只分两种。</Line>

    <Part id="bernoulli"><Bernoulli /></Part>
    <Animation>
      <Appear target="bernoulli" at="start" dur={0.5} />
      <Tween target="bernoulli" to={{grow: 1}} line="b1" word="两个结果" dur={1.2} easing="easeOutQuart" />
      <Tween target="bernoulli" to={{flip: 1}} line="b2" word="抛一枚硬币" dur={1.7} easing="easeOutQuart" />
      <Appear target="formula" line="b2" word="伯努利分布" />
      <Appear target="tag-1" line="b3" word="罚球" />
      <Appear target="tag-2" line="b3" word="面试" />
      <Appear target="kinds" line="b4" word="两种" />
    </Animation>
  </Scene>

  <Scene id="binomial" title="二项分布：十次硬币">
    <Line id="n1">把这一把，重复十次。</Line>
    <Line id="n2">抛十次硬币，正面会出现几次？</Line>
    <Line id="n3">零次到十次都有可能，但五次附近最多。</Line>
    <Line id="n4">这种「若干次里成功几次」的分布，叫二项分布。</Line>
    <Line id="n5">投篮十次中几个，质检一百件坏几件，都是它。</Line>
    <Line id="n6" hold={1.4}>试的次数再多，这座山包就会更光滑。</Line>

    <Part id="binomial"><Binomial /></Part>
    <Animation>
      <Appear target="binomial" at="start" dur={0.5} />
      <Tween target="binomial" to={{toss: 1}} line="n2" word="抛十次" dur={2.4} easing="easeInOut" />
      <Tween target="binomial" to={{grow: 1}} line="n3" word="零次到十次" dur={1.8} easing="easeOutQuart" />
      <Tween target="binomial" to={{peak: 1}} line="n3" word="最多" dur={0.7} />
      <Appear target="peak-label" line="n3" word="最多" />
      <Appear target="formula" line="n4" word="二项分布" />
      <Appear target="tag-1" line="n5" word="投篮" />
      <Appear target="tag-2" line="n5" word="质检" />
      <Tween target="binomial" to={{smooth: 1}} line="n6" word="更光滑" dur={1.8} easing="easeOutQuart" />
    </Animation>
  </Scene>

  <Scene id="poisson" title="泊松分布：一小时的客人">
    <Line id="p1">有些事，问的不是做几次，而是一段时间里发生几次。</Line>
    <Line id="p2">比如奶茶店，一小时会来几位客人？</Line>
    <Line id="p3">把一小时切成六格，一格一格地数一数。</Line>
    <Line id="p4">多数格子空着，或者只有一位，偶尔挤进好几个。</Line>
    <Line id="p5">一格里的客人，和下一格没有关系。</Line>
    <Line id="p6">这种数「单位时间里来几次」的，叫泊松分布。</Line>
    <Line id="p7" hold={1.6}>电话呼入、路口事故、书页上的错字，都归它管。</Line>

    <Part id="poisson"><Poisson /></Part>
    <Animation>
      <Appear target="poisson" at="start" dur={0.5} />
      <Appear target={["guest-1", "guest-2", "guest-3", "guest-4", "guest-5", "guest-6", "guest-7", "guest-8", "guest-9", "guest-10", "guest-11", "guest-12"]} line="p2" word="一小时" stagger={0.16} />
      <Appear target={["div-1", "div-2", "div-3", "div-4", "div-5"]} line="p3" word="六格" stagger={0.1} />
      <Tween target="poisson" to={{grow: 1}} line="p3" word="数一数" dur={1.8} easing="easeOutQuart" />
      <Tween target="poisson" to={{empty: 1}} line="p4" word="空着" dur={0.6} />
      <Tween target="poisson" to={{tall: 1}} line="p4" word="挤进好几个" dur={0.6} />
      <Appear target="divs-lit" line="p5" word="没有关系" />
      <Appear target={["mean", "formula"]} line="p6" word="泊松分布" stagger={0.2} />
      <Appear target="tag-1" line="p7" word="电话呼入" />
      <Appear target="tag-2" line="p7" word="路口事故" />
      <Appear target="tag-3" line="p7" word="错字" />
    </Animation>
  </Scene>

  <Scene id="geometric" title="几何分布：第一次成功">
    <Line id="g1">还有一类问题：要试多少次，才第一次成功？</Line>
    <Line id="g2">掷骰子，第一次掷出六点，要掷几把？</Line>
    <Line id="g3">运气好，一把就中；运气差，要等很久。</Line>
    <Line id="g4">越往后，概率越小，柱子一路下滑。</Line>
    <Line id="g5">这就是几何分布。</Line>
    <Line id="g6" hold={1.4}>抽卡抽到限定角色，就是这种心情。</Line>

    <Part id="geometric"><Geometric /></Part>
    <Animation>
      <Appear target="geometric" at="start" dur={0.5} />
      <Appear target={["throw-1", "throw-2", "throw-3", "throw-4"]} line="g2" word="六点" stagger={0.22} />
      <Tween target="geometric" to={{first: 1}} line="g3" word="一把就中" dur={0.8} />
      <Appear target="sixth" line="g3" word="一把就中" />
      <Appear target="dots" line="g3" word="要等很久" />
      <Tween target="geometric" to={{grow: 1}} line="g4" word="越往后" dur={2.2} easing="easeInOut" />
      <Appear target="formula" line="g5" word="几何分布" />
      <Appear target="tag-1" line="g6" word="抽卡" />
    </Animation>
  </Scene>

  <Scene id="exponential" title="指数分布：等下一班车">
    <Line id="e1">如果等的不是次数，而是时间呢？</Line>
    <Line id="e2">站在公交站，等下一班车。</Line>
    <Line id="e3">把到站看成随机事件，等待时间就服从指数分布。</Line>
    <Line id="e4">它的曲线一路下滑：等十分钟以上的机会，比等一分钟小得多。</Line>
    <Line id="e5" hold={1.6}>而且它没有记忆：已经等了很久，车也不会因此来得更快。</Line>

    <Part id="exponential"><Exponential /></Part>
    <Animation>
      <Appear target="exponential" at="start" dur={0.5} />
      <Tween target="exponential" to={{draw: 1}} line="e3" word="指数分布" dur={2} easing="easeInOutSine" />
      <Tween target="exponential" to={{tail: 1}} line="e4" word="十分钟以上" dur={1.2} easing="easeOutQuart" />
      <Appear target="pct-10" line="e4" word="十分钟以上" />
      <Appear target="pct-1" line="e4" word="一分钟" />
      <Tween target="exponential" to={{again: 1}} line="e5" word="没有记忆" dur={1.6} easing="easeOutQuart" />
    </Animation>
  </Scene>

  <Scene id="normal" title="正态分布：一群人的身高">
    <Line id="h1">最后一种，形状最眼熟。</Line>
    <Line id="h2">先说身高。随便找一大群人，看不出什么规律。</Line>
    <Line id="h3">按高矮分好格子，一格一格地数人数。</Line>
    <Line id="h4">大多数人在中间，特别高和特别矮的都很少。</Line>
    <Line id="h5">把格子的顶端连起来，是中间高、两边低的钟形曲线。</Line>
    <Line id="h6">身高、体重、考试成绩、测量误差，都近似这个形状。</Line>
    <Line id="h7" hold={1.8}>它叫正态分布，也叫高斯分布。</Line>

    <Part id="normal"><Normal /></Part>
    <Animation>
      <Appear target="normal" at="start" dur={0.5} />
      <Tween target="normal" to={{sort: 1}} line="h3" word="分好格子" dur={3} easing="easeInOut" />
      <Tween target="normal" to={{middle: 1}} line="h4" word="大多数" dur={0.8} />
      <Tween target="normal" to={{draw: 1}} line="h5" word="钟形曲线" dur={2} easing="easeInOutSine" />
      <Appear target="tag-1" line="h6" word="体重" />
      <Appear target="tag-2" line="h6" word="考试成绩" />
      <Appear target="tag-3" line="h6" word="测量误差" />
      <Appear target="formula" line="h7" word="正态分布" />
    </Animation>
  </Scene>

  <Scene id="summary" title="七种形状的地图">
    <Line id="s1">七种形状，其实只有两种底子。</Line>
    <Line id="s2">数出来的，是离散的：掷骰子、抛硬币、数客人、等第一次成功。</Line>
    <Line id="s3">量出来的，是连续的：等到的分钟，量到的厘米。</Line>
    <Line id="s4">看图先问一句：这根柱子，或者这条曲线，到底在数什么？</Line>
    <Line id="s5">形状认出来，问题就清楚了一半。</Line>
    <Line id="s6" hold={2}>下次遇到随机，先找它的形状。</Line>

    <Part id="summary"><Summary /></Part>
    <Animation>
      <Appear target="summary" at="start" dur={0.5} />
      <Tween target="summary" to={{d: 1}} line="s2" word="离散的" dur={1.3} easing="easeOutQuart" />
      <Tween target="summary" to={{c: 1}} line="s3" word="连续的" dur={1.3} easing="easeOutQuart" />
      <Tween target="summary" to={{qb: 1}} line="s4" word="柱子" dur={0.8} />
      <Tween target="summary" to={{qc: 1}} line="s4" word="曲线" dur={0.8} />
    </Animation>
  </Scene>
</Doc>;
