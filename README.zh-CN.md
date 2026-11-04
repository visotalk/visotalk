<div align="center">

<h1>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://visotalk.dev/lockup-dark.svg">
    <img src="docs/brand/lockup.svg" alt="VisoTalk" width="360">
  </picture>
</h1>

**做讲解视频，从此交给你的 Agent。**<br>
专注于讲解视频制作的开源 Agent Skill，基于旁白驱动的动效编排引擎和大量内置风格库，开箱即用。

[English](README.md) · **简体中文**

<a href="https://visotalk.dev/examples/"><img alt="观看示例" src="https://img.shields.io/badge/%E2%96%B6%20%E8%A7%82%E7%9C%8B%E7%A4%BA%E4%BE%8B-0E4F9C?style=for-the-badge"></a>
<a href="https://visotalk.dev/motions/"><img alt="风格" src="https://img.shields.io/badge/%E9%A3%8E%E6%A0%BC-21%20%E7%A7%8D%E5%86%85%E7%BD%AE-262D38?style=for-the-badge"></a>
<a href="https://visotalk.dev/docs"><img alt="文档" src="https://img.shields.io/badge/%E6%96%87%E6%A1%A3-visotalk.dev-262D38?style=for-the-badge"></a>
<a href="https://discord.gg/zDYMHqZMNy"><img alt="Discord" src="https://img.shields.io/badge/Discord-%E5%8A%A0%E5%85%A5-5865F2?style=for-the-badge&logo=discord&logoColor=white"></a>
<a href="https://x.com/visotalk"><img alt="在 X 上关注" src="https://img.shields.io/badge/X-@visotalk-000000?style=for-the-badge&logo=x&logoColor=white"></a>

[![npm](https://img.shields.io/npm/v/visotalk?color=0E4F9C&label=npm)](https://www.npmjs.com/package/visotalk)
[![npm downloads](https://img.shields.io/npm/dm/visotalk?color=0E4F9C)](https://www.npmjs.com/package/visotalk)
[![CI](https://github.com/visotalk/visotalk/actions/workflows/ci.yaml/badge.svg)](https://github.com/visotalk/visotalk/actions/workflows/ci.yaml)
[![License: MIT](https://img.shields.io/badge/license-MIT-2EA44F)](LICENSE)
[![Claude Code skill](https://img.shields.io/badge/Claude%20Code-skill-d97757)](skills/visotalk/SKILL.md)
[![Codex skill](https://img.shields.io/badge/Codex-skill-10a37f)](skills/visotalk/SKILL.md)

<a href="https://visotalk.dev/examples/visotalk-intro-zh-cn/"><img src="https://visotalk.dev/examples/visotalk-intro/preview.gif" alt="旁白，就是新的时间线：用 VisoTalk 做的 VisoTalk 介绍片" width="100%"></a>

[**▶ 带声音播放（中文版）**](https://visotalk.dev/examples/visotalk-intro-zh-cn/) · [查看源文件](examples/visotalk-intro/doc.tsx) · 4 分钟，一份文档，同一句话五种语言

</div>

## 它做什么

让你的 agent 做一支讲解视频，它会写出 `doc.tsx`，每个动画都从旁白里的某个词开始；改写、换声音或翻译旁白，画面都会跟着走。
它不是视频生成模型：每一帧都由代码画出，修改就是改一句话。

| | |
|---|---|
| **21** 种内置风格 | 从手绘笔记本到叠在你自己录像上的标注 |
| **4** 种旁白语言 | 英语、中文、日语、韩语，每种都对齐到词 |
| **逐帧一致** | 同一份文档两次渲染完全相同，回归测试逐帧核对 |
| **在你的电脑上运行** | 语音（Kokoro）、对词和渲染都在本机；四核上每秒视频大约需要 4 到 8 秒 |

## 快速开始

```sh
npx skills add visotalk/visotalk -g        # 安装 skill，适用于 Claude Code、Codex 等 agent
npx visotalk@latest doctor --fix           # 每台机器一次：Chrome、旁白模型、Python 包（约 1 GB）
```

或者直接把链接交给 agent：*"帮我安装这个 skill：https://github.com/visotalk/visotalk"*。然后说出你想要的：

| 这样说 | 会发生什么 |
|---|---|
| *用 visotalk skill 做一支 60 秒的讲解视频，讲哈希表是怎么工作的。* | agent 写脚本和 `doc.tsx`，一场一场地画，看静帧，最后渲染出 `final.mp4` |
| *把这份课件做成讲给学生听的课，用 Lab Notebook 风格。* | 每一页变成讲解它的一场，课件里的图片一并带上 |
| *这是我的录像，给它加上 On Air 的图文。* | 你自己的音频或视频保留原话和原节奏，图文落在你说的词上 |
| *把这支片子做一个中文版。* | 一份语言覆盖层：新的台词和锚点，画面不变，按新的配音重新定时 |

需要 Node.js 20 或更高版本、`ffmpeg` 和 Python 3.9 或更高版本。`visotalk doctor` 会告诉你缺什么；详见 [packages/cli](packages/cli/README.md)。

## 风格

风格是 agent 可以照着做的一种观感：一份说明它是什么、不是什么的 `MOTION.md`，画它的组件，以及一支带旁白的样片。按名字选一个，
或者让 agent 以它为底做出你自己的风格。所有样片都可以在 [visotalk.dev/motions](https://visotalk.dev/motions/) 上播放。

<table>
<tr>
<td width="50%" valign="top"><a href="https://visotalk.dev/motions/red-pencil/"><img src="https://visotalk.dev/motions/red-pencil/poster.jpg" alt="Red Pencil" width="100%"></a><br><b>Red Pencil · 红笔批注</b> · <sub>报告、课程</sub><br><sub>一页印好的纸，边读边用红笔批改：圈出数字，划掉算错的合计并改正。</sub><br><sub><a href="https://visotalk.dev/motions/red-pencil/">▶ 样片</a> · <a href="skills/visotalk/motions/red-pencil/MOTION.md">MOTION.md</a></sub></td>
<td width="50%" valign="top"><a href="https://visotalk.dev/motions/lab-notebook/"><img src="https://visotalk.dev/motions/lab-notebook/poster.jpg" alt="Lab Notebook" width="100%"></a><br><b>Lab Notebook · 实验手记</b> · <sub>课程、科普</sub><br><sub>方格纸上，图随讲解一笔一笔画出来，结论用红框圈住。</sub><br><sub><a href="https://visotalk.dev/motions/lab-notebook/">▶ 样片</a> · <a href="skills/visotalk/motions/lab-notebook/MOTION.md">MOTION.md</a></sub></td>
</tr>
<tr>
<td width="50%" valign="top"><a href="https://visotalk.dev/motions/stage-light/"><img src="https://visotalk.dev/motions/stage-light/poster.jpg" alt="Stage Light" width="100%"></a><br><b>Stage Light · 聚光台</b> · <sub>产品、报告</sub><br><sub>暗色舞台上，一束柔光跟着正在说的东西走；醒目的窄体大数字。</sub><br><sub><a href="https://visotalk.dev/motions/stage-light/">▶ 样片</a> · <a href="skills/visotalk/motions/stage-light/MOTION.md">MOTION.md</a></sub></td>
<td width="50%" valign="top"><a href="https://visotalk.dev/motions/screen-desk/"><img src="https://visotalk.dev/motions/screen-desk/poster.jpg" alt="Screen Desk" width="100%"></a><br><b>Screen Desk · 屏幕工作台</b> · <sub>教程、产品</sub><br><sub>浅色桌面上的应用窗口、终端或手机；镜头飞到旁白点到的那个控件。</sub><br><sub><a href="https://visotalk.dev/motions/screen-desk/">▶ 样片</a> · <a href="skills/visotalk/motions/screen-desk/MOTION.md">MOTION.md</a></sub></td>
</tr>
<tr>
<td width="50%" valign="top"><a href="https://visotalk.dev/motions/on-air/"><img src="https://visotalk.dev/motions/on-air/poster.jpg" alt="On Air" width="100%"></a><br><b>On Air · 口播字条</b> · <sub>口播</sub><br><sub>实色字条叠在你自己的录像上，放在每个镜头留出的空处；画面主体仍是录像。</sub><br><sub><a href="https://visotalk.dev/motions/on-air/">▶ 样片</a> · <a href="skills/visotalk/motions/on-air/MOTION.md">MOTION.md</a></sub></td>
<td width="50%" valign="top"><a href="https://visotalk.dev/motions/marker-margin/"><img src="https://visotalk.dev/motions/marker-margin/poster.jpg" alt="Marker Margin" width="100%"></a><br><b>Marker Margin · 马克笔批注</b> · <sub>口播、教程</sub><br><sub>在录像前的玻璃上用马克笔标注：说到什么就圈什么，每次切镜头都擦干净。</sub><br><sub><a href="https://visotalk.dev/motions/marker-margin/">▶ 样片</a> · <a href="skills/visotalk/motions/marker-margin/MOTION.md">MOTION.md</a></sub></td>
</tr>
<tr>
<td width="50%" valign="top"><a href="https://visotalk.dev/motions/drafting-table/"><img src="https://visotalk.dev/motions/drafting-table/poster.jpg" alt="Drafting Table" width="100%"></a><br><b>Drafting Table · 绘图台</b> · <sub>科普、课程</sub><br><sub>深蓝图纸上用白线绘制机构：说到尺寸就量出尺寸，零件沿轴线分解。</sub><br><sub><a href="https://visotalk.dev/motions/drafting-table/">▶ 样片</a> · <a href="skills/visotalk/motions/drafting-table/MOTION.md">MOTION.md</a></sub></td>
<td width="50%" valign="top"><a href="https://visotalk.dev/motions/iso-works/"><img src="https://visotalk.dev/motions/iso-works/poster.jpg" alt="Iso Works" width="100%"></a><br><b>Iso Works · 等距工坊</b> · <sub>产品、报告</sub><br><sub>把一个系统画成小小的等距建筑，数据像方块一样在传送带上流动。</sub><br><sub><a href="https://visotalk.dev/motions/iso-works/">▶ 样片</a> · <a href="skills/visotalk/motions/iso-works/MOTION.md">MOTION.md</a></sub></td>
</tr>
<tr>
<td width="50%" valign="top"><a href="https://visotalk.dev/motions/depth-stage/"><img src="https://visotalk.dev/motions/depth-stage/poster.jpg" alt="Depth Stage" width="100%"></a><br><b>Depth Stage · 景深舞台</b> · <sub>故事、科普</sub><br><sub>黄昏时分一处地方的剪影层，一台镜头穿行其间，远处被雾气淡化。</sub><br><sub><a href="https://visotalk.dev/motions/depth-stage/">▶ 样片</a> · <a href="skills/visotalk/motions/depth-stage/MOTION.md">MOTION.md</a></sub></td>
<td width="50%" valign="top"><a href="https://visotalk.dev/motions/ink-scroll/"><img src="https://visotalk.dev/motions/ink-scroll/poster.jpg" alt="Ink Scroll" width="100%"></a><br><b>Ink Scroll · 墨卷</b> · <sub>故事、课程</sub><br><sub>手卷从右向左展开：墨色晕成山水人物，结论处盖上一方红印。为中文旁白而做。</sub><br><sub><a href="https://visotalk.dev/motions/ink-scroll/">▶ 样片</a> · <a href="skills/visotalk/motions/ink-scroll/MOTION.md">MOTION.md</a></sub></td>
</tr>
<tr>
<td width="50%" valign="top"><a href="https://visotalk.dev/motions/field-atlas/"><img src="https://visotalk.dev/motions/field-atlas/poster.jpg" alt="Field Atlas" width="100%"></a><br><b>Field Atlas · 地图志</b> · <sub>故事、科普、报告</sub><br><sub>随旁白移动的地图：镜头沿红色路线前行，区域按数值上色，从地球仪推近到小镇。</sub><br><sub><a href="https://visotalk.dev/motions/field-atlas/">▶ 样片</a> · <a href="skills/visotalk/motions/field-atlas/MOTION.md">MOTION.md</a></sub></td>
<td width="50%" valign="top"><a href="https://visotalk.dev/motions/evidence-board/"><img src="https://visotalk.dev/motions/evidence-board/poster.jpg" alt="Evidence Board" width="100%"></a><br><b>Evidence Board · 证据墙</b> · <sub>报告、故事</sub><br><sub>钉在深色毡板上的出处：镜头推近原文，荧光笔划出原句，红线把证据串成一案。</sub><br><sub><a href="https://visotalk.dev/motions/evidence-board/">▶ 样片</a> · <a href="skills/visotalk/motions/evidence-board/MOTION.md">MOTION.md</a></sub></td>
</tr>
<tr>
<td width="50%" valign="top"><a href="https://visotalk.dev/motions/clay-world/"><img src="https://visotalk.dev/motions/clay-world/poster.jpg" alt="Clay World" width="100%"></a><br><b>Clay World · 黏土小世界</b> · <sub>科普、故事</sub><br><sub>柔光下真正三维的手捏黏土：一捏成形，落地一压，切开看见里面。</sub><br><sub><a href="https://visotalk.dev/motions/clay-world/">▶ 样片</a> · <a href="skills/visotalk/motions/clay-world/MOTION.md">MOTION.md</a></sub></td>
<td width="50%" valign="top"><a href="https://visotalk.dev/motions/watercolor-tale/"><img src="https://visotalk.dev/motions/watercolor-tale/poster.jpg" alt="Watercolor Tale" width="100%"></a><br><b>Watercolor Tale · 水彩绘本</b> · <sub>故事、课程</sub><br><sub>摊开的透明水彩绘本：湿润的色块罩染在铅笔底稿上，翻页进入下一幅。</sub><br><sub><a href="https://visotalk.dev/motions/watercolor-tale/">▶ 样片</a> · <a href="skills/visotalk/motions/watercolor-tale/MOTION.md">MOTION.md</a></sub></td>
</tr>
<tr>
<td width="50%" valign="top"><a href="https://visotalk.dev/motions/pixel-quest/"><img src="https://visotalk.dev/motions/pixel-quest/poster.jpg" alt="Pixel Quest" width="100%"></a><br><b>Pixel Quest · 像素关卡</b> · <sub>教程、课程</sub><br><sub>16 位游戏画面：一步一关，经验条逐格填满，难点是一场 Boss 战。</sub><br><sub><a href="https://visotalk.dev/motions/pixel-quest/">▶ 样片</a> · <a href="skills/visotalk/motions/pixel-quest/MOTION.md">MOTION.md</a></sub></td>
<td width="50%" valign="top"><a href="https://visotalk.dev/motions/riso-pop/"><img src="https://visotalk.dev/motions/riso-pop/poster.jpg" alt="Riso Pop" width="100%"></a><br><b>Riso Pop · 孔版双色</b> · <sub>科普、产品</sub><br><sub>蓝粉两色孔版印刷：平涂色块、半调网点，叠印成紫，版位错开又弹回。</sub><br><sub><a href="https://visotalk.dev/motions/riso-pop/">▶ 样片</a> · <a href="skills/visotalk/motions/riso-pop/MOTION.md">MOTION.md</a></sub></td>
</tr>
<tr>
<td width="50%" valign="top"><a href="https://visotalk.dev/motions/live-studio/"><img src="https://visotalk.dev/motions/live-studio/poster.jpg" alt="Live Studio" width="100%"></a><br><b>Live Studio · 演播台</b> · <sub>口播、报告</sub><br><sub>叠在你画面上的电视包装：分层字条、台标和滚动字幕，比分条随数字上涨。</sub><br><sub><a href="https://visotalk.dev/motions/live-studio/">▶ 样片</a> · <a href="skills/visotalk/motions/live-studio/MOTION.md">MOTION.md</a></sub></td>
<td width="50%" valign="top"><a href="https://visotalk.dev/motions/night-diagram/"><img src="https://visotalk.dev/motions/night-diagram/poster.jpg" alt="Night Diagram" width="100%"></a><br><b>Night Diagram · 夜光图解</b> · <sub>科普</sub><br><sub>夜色中的科学图解：深蓝底上发光的大主体，用细尺度量，用细线标注。</sub><br><sub><a href="https://visotalk.dev/motions/night-diagram/">▶ 样片</a> · <a href="skills/visotalk/motions/night-diagram/MOTION.md">MOTION.md</a></sub></td>
</tr>
<tr>
<td width="50%" valign="top"><a href="https://visotalk.dev/motions/earth-block/"><img src="https://visotalk.dev/motions/earth-block/poster.jpg" alt="Earth Block" width="100%"></a><br><b>Earth Block · 大地块</b> · <sub>科普</sub><br><sub>教科书般浅色底上的一块等轴测世界，边讲边切开。</sub><br><sub><a href="https://visotalk.dev/motions/earth-block/">▶ 样片</a> · <a href="skills/visotalk/motions/earth-block/MOTION.md">MOTION.md</a></sub></td>
<td width="50%" valign="top"><a href="https://visotalk.dev/motions/plumb-line/"><img src="https://visotalk.dev/motions/plumb-line/poster.jpg" alt="Plumb Line" width="100%"></a><br><b>Plumb Line · 铅垂线</b> · <sub>科普</sub><br><sub>一根铅垂线穿过层层剪纸，每层都在真实深度；最后镜头拉远，按真实比例看全貌。</sub><br><sub><a href="https://visotalk.dev/motions/plumb-line/">▶ 样片</a> · <a href="skills/visotalk/motions/plumb-line/MOTION.md">MOTION.md</a></sub></td>
</tr>
<tr>
<td width="50%" valign="top"><a href="https://visotalk.dev/motions/light-bench/"><img src="https://visotalk.dev/motions/light-bench/poster.jpg" alt="Light Bench" width="100%"></a><br><b>Light Bench · 光学台</b> · <sub>科普</sub><br><sub>真 3D 的黑色光学台：光束按斯涅尔定律穿过玻璃计算，一次一种颜色。</sub><br><sub><a href="https://visotalk.dev/motions/light-bench/">▶ 样片</a> · <a href="skills/visotalk/motions/light-bench/MOTION.md">MOTION.md</a></sub></td>
<td width="50%" valign="top"></td>
</tr>
</table>

`npx visotalk motion list` 列出每种风格及其适用场景；`visotalk motion use <name>` 把一种风格复制到你的作品里修改。
更多影片（四种语言）在 [visotalk.dev/examples](https://visotalk.dev/examples/)，源文件在 [examples/](examples/)。

## 文档长什么样

一场（scene）包含它的台词、部件（画画面的 React 盒子），以及一段说明每样东西在哪个词上发生的动画：

```tsx
<Scene id="intro">
  <Line id="h1">Setting up a Python project usually means juggling a pile of tools.</Line>
  <Part id="tools">{() => <ToolGrid />}</Part>
  <Animation><Appear on="tools" line="h1" word="juggling"/></Animation>
</Scene>
```

部件 `tools` 在旁白说到 "juggling" 时出现，无论这个词落在第几秒。台词、部件和动画是引擎读取的字面量；部件画什么由 React 决定，
可以用 CSS、SVG、three.js、数据表和循环，由引擎的时钟驱动。

## 最近更新

- **0.8.5** · 内置风格按常用程度和通用程度排序；Field Atlas 换了新样片，Field Atlas、Depth Stage 和 Night Diagram 增加了新组件。`motion share` 已移除：要把风格发布到 [motionhub.dev](https://motionhub.dev)，请向它的仓库提交 pull request。
- **0.8.4** · 目录里的风格改用作者名命名：`visotalk motion use @creator/slug doc.tsx`，名字以 `motion search` 列出的为准。
- **0.8.3** · 新增四种内置风格，共二十一种：[Night Diagram](skills/visotalk/motions/night-diagram/MOTION.md)、[Earth Block](skills/visotalk/motions/earth-block/MOTION.md)、[Plumb Line](skills/visotalk/motions/plumb-line/MOTION.md) 和 [Light Bench](skills/visotalk/motions/light-bench/MOTION.md)。构建后再编辑页面时，旁白和配乐的音量比例保持不变。
- **0.8.2** · 风格的组件现在用 `@motionhub/runtime` 绘制。
- **0.8.1** · 查找并使用别人做的风格：`visotalk motion search [关键词]` 搜索 [motionhub.dev](https://motionhub.dev) 上的目录，`motion show` 和 `motion use` 可以直接用目录里的 slug。
- **0.8** · 风格改称 *motion*：`visotalk motion list | show | use | check`，风格包在 `skills/visotalk/motions/`，含 `motion.json` 和 `MOTION.md`，作品里的副本在 `motion/`。动画标签改称 *action*（`visotalk schema actions`，校验码 `action.*`），spec 0.8 把动作的类型字段改名为 `kind`；为 0.7 写的文档无需改动。
- **0.7.1** · 新增七种内置风格，共十七种：[Field Atlas](skills/visotalk/motions/field-atlas/MOTION.md)、[Evidence Board](skills/visotalk/motions/evidence-board/MOTION.md)、[Clay World](skills/visotalk/motions/clay-world/MOTION.md)、[Watercolor Tale](skills/visotalk/motions/watercolor-tale/MOTION.md)、[Pixel Quest](skills/visotalk/motions/pixel-quest/MOTION.md)、[Riso Pop](skills/visotalk/motions/riso-pop/MOTION.md) 和 [Live Studio](skills/visotalk/motions/live-studio/MOTION.md)。
- **0.7** · 在你自己的录像上加图文（[On Air](skills/visotalk/motions/on-air/MOTION.md)、[Marker Margin](skills/visotalk/motions/marker-margin/MOTION.md)），并可用 `visotalk recording --trim` 剪掉口头禅和长停顿。
- **0.7** · 十种内置风格，按适合的视频类型分组；部件可以用 three.js 画 3D。

<details>
<summary><b>仓库里有什么</b></summary>

| 路径 | |
|---|---|
| [skills/visotalk](skills/visotalk/SKILL.md) | agent skill：如何设计、编写、检查和渲染一支视频，以及内置风格 |
| [packages/cli](packages/cli) | `visotalk`：validate、still、sheet、qa、render、play、recording、motion、doctor |
| [packages/ir](packages/ir) · [jsx](packages/jsx) | 文档格式：解析器、校验器、时间求解器和标签 |
| [packages/runtime](packages/runtime) · [exporter](packages/exporter) | DOM 渲染器和播放器，以及确定性的逐帧捕获和混音 |
| [spec/ir/0.8/ir.ts](spec/ir/0.8/ir.ts) | 格式的类型定义：文档能包含什么，以此为准 |
| [examples](examples) | visotalk.dev 上的每一支影片，都是可以阅读的文档。只有 `uv`、`moon-phases`、`population` 和 `liftoff` 带媒体和旁白，其余的请在网站上播放 |
| [tests](tests) | 单元测试和回归测试：确定性、基准帧、版面检查 |
| [docs/brand](docs/brand) | 标志、组合标和颜色 token |

</details>

<details>
<summary><b>开发</b></summary>

```sh
pnpm install
pnpm tsc && pnpm test && pnpm build
pnpm visotalk validate examples/moon-phases/doc.tsx
pnpm regression
```

`pnpm regression` 渲染示例并与基准帧比对，需要 `npx visotalk@latest doctor --fix` 安装的固定版本 Chrome。

</details>

## 状态

早期阶段。文档格式为 0.x 版本，任何 minor 版本都可能变化。欢迎在 [Discord](https://discord.gg/zDYMHqZMNy) 和 [issues](https://github.com/visotalk/visotalk/issues) 里提问和交流。

## 许可证

[MIT](LICENSE)。
