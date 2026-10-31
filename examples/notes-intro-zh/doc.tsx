// A fictional notes app: the problem, the solution and one call to action.
import {Doc, Scene, Line, Part, Animation, Appear, Disappear, Tween, Set} from '@visotalk/jsx';
import {Thought, Places, LateSearch} from './parts/scene1.tsx';
import {Composer, Folders} from './parts/scene2.tsx';
import {Tagging, Pile} from './parts/scene3.tsx';
import {Recall, Paths} from './parts/scene4.tsx';
import {Stamp, NoClaims} from './parts/scene5.tsx';
import {Call} from './parts/scene6.tsx';

export default <Doc id="notes-intro-zh" poster={50} title={"拾记：随手记，找得到"} lang={"zh-CN"} voice={"minimax:Chinese (Mandarin)_News_Anchor"} speed={1.06} theme="visotalk/dark" tokens={{colors: {bg: '#F6F3EA', text: '#23201A', muted: '#847B69', faint: '#B7AC96', data: '#C2571F', border: '#E1D8C4', panel: '#FFFDF6', panel2: '#EFE9DA', good: '#2E7D6E', bad: '#D13B3B', warn: '#B8912E'}, fonts: {sans: '"Noto Sans SC", system-ui, sans-serif', mono: '"Noto Sans SC", monospace'}}} canvas="16x9">

  <Scene id="problem" title="问题：随手记，找不回">
    <Line id="l1">灵感转瞬即逝，能记住的却不多。</Line>
    <Line id="l2">你打开聊天窗口、备忘录，或者一张便利贴，随手一记。</Line>
    <Line id="l3">一周后想找回来，却不记得写在哪里。</Line>

    <Part id="thought" x={420} y={220} w={1080} h={400}><Thought /></Part>
    <Part id="places" x={190} y={130} w={1540} h={520}><Places /></Part>
    <Part id="late" x={330} y={620} w={1260} h={200}><LateSearch /></Part>

    <Animation>
      <Appear target="thought" at="start" dur={0.7} />
      <Disappear target="thought" line="l2" word="打开聊天窗口" dur={0.5} />

      <Appear target="places" line="l2" word="聊天窗口" dur={0.5} />
      <Appear target="c-chat" line="l2" word="聊天窗口" dur={0.45} />
      <Appear target="c-memo" line="l2" word="备忘录" dur={0.45} />
      <Appear target="c-sticky" line="l2" word="便利贴" dur={0.45} />
      <Appear target="late" line="l3" word="一周后" dur={0.5} />
      <Tween target="places" to={{dim: 1}} line="l3" word="一周后" dur={1.6} easing="easeOut" />
      <Appear target="q-empty" line="l3" word="不记得" dur={0.4} />
    </Animation>
  </Scene>

  <Scene id="capture" title="随手记一条">
    <Line id="l4">拾记把第一步做得极短：打开就是一行输入。</Line>
    <Line id="l5">写下一句话，按下回车，就结束了。</Line>
    <Line id="l6">不用先选文件夹，也不用想清楚分类。</Line>

    <Part id="composer" x={360} y={120} w={1200} h={520}><Composer /></Part>
    <Part id="folders" x={360} y={690} w={1200} h={170}><Folders /></Part>

    <Animation>
      <Set target="composer" to={{chars: 0, press: 0, caret: 1}} at="start" />
      <Appear target="composer" line="l4" word="一行输入" dur={0.5} />
      <Tween target="composer" to={{chars: 11}} line="l5" word="写下一句话" dur={2.2} easing="easeOut" />
      <Tween target="composer" to={{press: 1}} line="l5" word="按下回车" dur={0.18} easing="easeOut" />
      <Tween target="composer" to={{press: 0}} line="l5" word="就结束了" dur={0.4} easing="easeOut" />
      <Appear target="folders" line="l6" word="文件夹" dur={0.45} />
      <Tween target="folders" to={{strike: 1}} line="l6" word="不用想清楚分类" dur={1.1} easing="easeInOut" />
    </Animation>
  </Scene>

  <Scene id="tags" title="加标签整理">
    <Line id="l7">写完顺手加两个标签，比如产品和灵感。</Line>
    <Line id="l8">同一主题的笔记，自己聚成一摞。</Line>

    <Part id="tagging" x={450} y={190} w={1020} h={500}><Tagging /></Part>
    <Part id="pile" x={200} y={150} w={1490} h={570}><Pile /></Part>

    <Animation>
      <Set target="tagging" to={{p: 0, top: 0}} at="start" />
      <Appear target="tagging" line="l7" word="两个标签" dur={0.45} />
      <Tween target="tagging" to={{p: 1}} line="l7" word="产品" dur={0.5} easing="easeOut" />
      <Tween target="tagging" to={{top: 1}} line="l8" word="同一主题" dur={1.2} easing="easeInOut" />

      <Disappear target="tagging" line="l8" word="同一主题" dur={0.35} />
      <Set target="pile" to={{spread: 1, count: 0}} at="start" />
      <Appear target="pile" line="l8" word="同一主题" dur={0.4} />
      <Appear target="pile-0" line="l8" word="同一主题" dur={0.4} />
      <Appear target="pile-1" line="l8" word="同一主题" dur={0.4} />
      <Appear target="pile-2" line="l8" word="同一主题" dur={0.4} />
      <Appear target="pile-3" line="l8" word="同一主题" dur={0.4} />
      <Tween target={["pile-0", "pile-1", "pile-2"]} to={{spread: 0}} line="l8" word="聚成一摞" dur={1.5} easing="easeInOut" stagger={0.12} />
      <Tween target="pile" to={{count: 1}} line="l8" word="聚成一摞" dur={1.2} easing="easeOut" />
      <Appear target="pile-rail" line="l8" word="一摞" dur={0.4} />
      <Appear target="pile-count" line="l8" word="一摞" dur={0.4} />
    </Animation>
  </Scene>

  <Scene id="search" title="用关键词找回">
    <Line id="l9">只记得里面有一个词？</Line>
    <Line id="l10">在搜索框敲下它，那条笔记立刻回来。</Line>
    <Line id="l11">标签和关键词，两条路都通。</Line>

    <Part id="recall" x={220} y={150} w={1440} h={560}><Recall /></Part>
    <Part id="paths" x={340} y={260} w={1400} h={360}><Paths /></Part>

    <Animation>
      <Set target="recall" to={{field: 1, kw: 0, result: 0}} at="start" />
      <Appear target="qword" line="l9" word="一个词" dur={0.5} />
      <Appear target="recall" line="l9" word="一个词" dur={0.4} />
      <Tween target="recall" to={{kw: 1}} line="l10" word="敲下它" dur={0.8} easing="easeInOut" />
      <Tween target="recall" to={{result: 1}} line="l10" word="立刻回来" dur={0.7} easing="easeOut" />
      <Appear target="hit" line="l10" word="那条笔记" dur={0.5} />
      <Disappear target="recall" line="l11" dur={0.4} />
      <Appear target="paths" line="l11" word="两条路都通" dur={0.5} />
      <Tween target="paths" to={{p: 1}} line="l11" word="两条路都通" dur={1.6} easing="easeInOut" />
    </Animation>
  </Scene>

  <Scene id="note" title="虚构示例，不说数字">
    <Line id="l12">拾记是一个虚构示例，用来演示记录工具可以怎样工作。</Line>
    <Line id="l13">我们没有用户规模，也没有省下多少时间的实测数据。</Line>

    <Part id="stamp" x={300} y={210} w={1300} h={460}><Stamp /></Part>
    <Part id="claims" x={420} y={250} w={1200} h={460}><NoClaims /></Part>

    <Animation>
      <Appear target="stamp" line="l12" word="虚构示例" dur={0.5} />
      <Tween target="stamp" to={{s: 1}} line="l12" word="虚构示例" dur={0.5} easing="easeOutBack(1.6)" />
      <Disappear target="stamp" line="l13" dur={0.35} />
      <Appear target="claims" line="l13" word="用户规模" dur={0.45} />
      <Tween target="claims" to={{p: 1}} line="l13" word="实测数据" dur={1.1} easing="easeOut" />
    </Animation>
  </Scene>

  <Scene id="call" title="把今晚的想法写下来">
    <Line id="l14" hold={0.5}>把今晚冒出的第一个想法写下来，再加一个标签。</Line>

    <Part id="call" x={380} y={210} w={1200} h={500}><Call /></Part>

    <Animation>
      <Set target="call" to={{chars: 0, tag: 0}} at="start" />
      <Appear target="call" at="start" dur={0.5} />
      <Tween target="call" to={{chars: 12}} line="l14" word="写下来" dur={2.1} easing="easeOut" />
      <Tween target="call" to={{tag: 1}} line="l14" word="标签" dur={0.5} easing="easeOut" />
    </Animation>
  </Scene>
</Doc>;
