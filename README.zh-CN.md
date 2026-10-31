<div align="center">

<h1>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://visotalk.dev/lockup-dark.svg">
    <img src="docs/brand/lockup.svg" alt="VisoTalk" width="360">
  </picture>
</h1>

**做讲解视频，从此交给你的 Agent。**<br>
专注于讲解视频制作的开源 Agent Skill，基于旁白驱动的动效编排引擎和大量内置样式库，开箱即用。

[English](README.md) · **简体中文**

<a href="https://visotalk.dev/examples/"><img alt="观看示例" src="https://img.shields.io/badge/%E2%96%B6%20%E8%A7%82%E7%9C%8B%E7%A4%BA%E4%BE%8B-0E4F9C?style=for-the-badge"></a>
<a href="https://visotalk.dev/styles/"><img alt="样式" src="https://img.shields.io/badge/%E6%A0%B7%E5%BC%8F-17%20%E7%A7%8D%E5%86%85%E7%BD%AE-262D38?style=for-the-badge"></a>
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
| **17** 种内置样式 | 从手绘笔记本到叠在你自己录像上的标注 |
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
| *把这份课件做成讲给学生听的课，用 Lab Notebook 样式。* | 每一页变成讲解它的一场，课件里的图片一并带上 |
| *这是我的录像，给它加上 On Air 的图文。* | 你自己的音频或视频保留原话和原节奏，图文落在你说的词上 |
| *把这支片子做一个中文版。* | 一份语言覆盖层：新的台词和锚点，画面不变，按新的配音重新定时 |

需要 Node.js 20 或更高版本、`ffmpeg` 和 Python 3.9 或更高版本。`visotalk doctor` 会告诉你缺什么；详见 [packages/cli](packages/cli/README.md)。

## 样式

样式是 agent 可以照着做的一种观感：一份说明它是什么、不是什么的 `STYLE.md`，画它的组件，以及一支带旁白的样片。按名字选一个，
或者让 agent 以它为底做出你自己的样式。所有样片都可以在 [visotalk.dev/styles](https://visotalk.dev/styles/) 上播放。

<table>
<tr>
<td width="50%" valign="top"><a href="https://visotalk.dev/styles/red-pencil/"><img src="https://visotalk.dev/styles/red-pencil/poster.jpg" alt="Red Pencil" width="100%"></a><br><b>Red Pencil · 红笔批注</b> · <sub>报告、课程</sub><br><sub>一页印好的纸，边读边用红笔批改：圈出数字，划掉算错的合计并改正。</sub><br><sub><a href="https://visotalk.dev/styles/red-pencil/">▶ 样片</a> · <a href="skills/visotalk/styles/red-pencil/STYLE.md">STYLE.md</a></sub></td>
<td width="50%" valign="top"><a href="https://visotalk.dev/styles/lab-notebook/"><img src="https://visotalk.dev/styles/lab-notebook/poster.jpg" alt="Lab Notebook" width="100%"></a><br><b>Lab Notebook · 实验手记</b> · <sub>课程、科普</sub><br><sub>方格纸上，图随讲解一笔一笔画出来，结论用红框圈住。</sub><br><sub><a href="https://visotalk.dev/styles/lab-notebook/">▶ 样片</a> · <a href="skills/visotalk/styles/lab-notebook/STYLE.md">STYLE.md</a></sub></td>
</tr>
<tr>
<td width="50%" valign="top"><a href="https://visotalk.dev/styles/stage-light/"><img src="https://visotalk.dev/styles/stage-light/poster.jpg" alt="Stage Light" width="100%"></a><br><b>Stage Light · 聚光台</b> · <sub>产品、报告</sub><br><sub>暗色舞台上，一束柔光跟着正在说的东西走；醒目的窄体大数字。</sub><br><sub><a href="https://visotalk.dev/styles/stage-light/">▶ 样片</a> · <a href="skills/visotalk/styles/stage-light/STYLE.md">STYLE.md</a></sub></td>
<td width="50%" valign="top"><a href="https://visotalk.dev/styles/screen-desk/"><img src="https://visotalk.dev/styles/screen-desk/poster.jpg" alt="Screen Desk" width="100%"></a><br><b>Screen Desk · 屏幕工作台</b> · <sub>教程、产品</sub><br><sub>浅色桌面上的应用窗口、终端或手机；镜头飞到旁白点到的那个控件。</sub><br><sub><a href="https://visotalk.dev/styles/screen-desk/">▶ 样片</a> · <a href="skills/visotalk/styles/screen-desk/STYLE.md">STYLE.md</a></sub></td>
</tr>
<tr>
<td width="50%" valign="top"><a href="https://visotalk.dev/styles/on-air/"><img src="https://visotalk.dev/styles/on-air/poster.jpg" alt="On Air" width="100%"></a><br><b>On Air · 口播字条</b> · <sub>口播</sub><br><sub>实色字条叠在你自己的录像上，放在每个镜头留出的空处；画面主体仍是录像。</sub><br><sub><a href="https://visotalk.dev/styles/on-air/">▶ 样片</a> · <a href="skills/visotalk/styles/on-air/STYLE.md">STYLE.md</a></sub></td>
<td width="50%" valign="top"><a href="https://visotalk.dev/styles/marker-margin/"><img src="https://visotalk.dev/styles/marker-margin/poster.jpg" alt="Marker Margin" width="100%"></a><br><b>Marker Margin · 马克笔批注</b> · <sub>口播、教程</sub><br><sub>在录像前的玻璃上用马克笔标注：说到什么就圈什么，每次切镜头都擦干净。</sub><br><sub><a href="https://visotalk.dev/styles/marker-margin/">▶ 样片</a> · <a href="skills/visotalk/styles/marker-margin/STYLE.md">STYLE.md</a></sub></td>
</tr>
<tr>
<td width="50%" valign="top"><a href="https://visotalk.dev/styles/drafting-table/"><img src="https://visotalk.dev/styles/drafting-table/poster.jpg" alt="Drafting Table" width="100%"></a><br><b>Drafting Table · 绘图台</b> · <sub>科普、课程</sub><br><sub>深蓝图纸上用白线绘制机构：说到尺寸就量出尺寸，零件沿轴线分解。</sub><br><sub><a href="https://visotalk.dev/styles/drafting-table/">▶ 样片</a> · <a href="skills/visotalk/styles/drafting-table/STYLE.md">STYLE.md</a></sub></td>
<td width="50%" valign="top"><a href="https://visotalk.dev/styles/iso-works/"><img src="https://visotalk.dev/styles/iso-works/poster.jpg" alt="Iso Works" width="100%"></a><br><b>Iso Works · 等距工坊</b> · <sub>产品、报告</sub><br><sub>把一个系统画成小小的等距建筑，数据像方块一样在传送带上流动。</sub><br><sub><a href="https://visotalk.dev/styles/iso-works/">▶ 样片</a> · <a href="skills/visotalk/styles/iso-works/STYLE.md">STYLE.md</a></sub></td>
</tr>
<tr>
<td width="50%" valign="top"><a href="https://visotalk.dev/styles/depth-stage/"><img src="https://visotalk.dev/styles/depth-stage/poster.jpg" alt="Depth Stage" width="100%"></a><br><b>Depth Stage · 景深舞台</b> · <sub>故事、科普</sub><br><sub>黄昏时分一处地方的剪影层，一台镜头穿行其间，远处被雾气淡化。</sub><br><sub><a href="https://visotalk.dev/styles/depth-stage/">▶ 样片</a> · <a href="skills/visotalk/styles/depth-stage/STYLE.md">STYLE.md</a></sub></td>
<td width="50%" valign="top"><a href="https://visotalk.dev/styles/ink-scroll/"><img src="https://visotalk.dev/styles/ink-scroll/poster.jpg" alt="Ink Scroll" width="100%"></a><br><b>Ink Scroll · 墨卷</b> · <sub>故事、课程</sub><br><sub>手卷从右向左展开：墨色晕成山水人物，结论处盖上一方红印。为中文旁白而做。</sub><br><sub><a href="https://visotalk.dev/styles/ink-scroll/">▶ 样片</a> · <a href="skills/visotalk/styles/ink-scroll/STYLE.md">STYLE.md</a></sub></td>
</tr>
<tr>
<td width="50%" valign="top"><a href="https://visotalk.dev/styles/field-atlas/"><img src="https://visotalk.dev/styles/field-atlas/poster.jpg" alt="Field Atlas" width="100%"></a><br><b>Field Atlas · 地图志</b> · <sub>故事、科普、报告</sub><br><sub>随旁白移动的地图：镜头沿红色路线前行，区域按数值上色，从地球仪推近到小镇。</sub><br><sub><a href="https://visotalk.dev/styles/field-atlas/">▶ 样片</a> · <a href="skills/visotalk/styles/field-atlas/STYLE.md">STYLE.md</a></sub></td>
<td width="50%" valign="top"><a href="https://visotalk.dev/styles/evidence-board/"><img src="https://visotalk.dev/styles/evidence-board/poster.jpg" alt="Evidence Board" width="100%"></a><br><b>Evidence Board · 证据墙</b> · <sub>报告、故事</sub><br><sub>钉在深色毡板上的出处：镜头推近原文，荧光笔划出原句，红线把证据串成一案。</sub><br><sub><a href="https://visotalk.dev/styles/evidence-board/">▶ 样片</a> · <a href="skills/visotalk/styles/evidence-board/STYLE.md">STYLE.md</a></sub></td>
</tr>
<tr>
<td width="50%" valign="top"><a href="https://visotalk.dev/styles/clay-world/"><img src="https://visotalk.dev/styles/clay-world/poster.jpg" alt="Clay World" width="100%"></a><br><b>Clay World · 黏土小世界</b> · <sub>科普、故事</sub><br><sub>柔光下真正三维的手捏黏土：一捏成形，落地一压，切开看见里面。</sub><br><sub><a href="https://visotalk.dev/styles/clay-world/">▶ 样片</a> · <a href="skills/visotalk/styles/clay-world/STYLE.md">STYLE.md</a></sub></td>
<td width="50%" valign="top"><a href="https://visotalk.dev/styles/watercolor-tale/"><img src="https://visotalk.dev/styles/watercolor-tale/poster.jpg" alt="Watercolor Tale" width="100%"></a><br><b>Watercolor Tale · 水彩绘本</b> · <sub>故事、课程</sub><br><sub>摊开的透明水彩绘本：湿润的色块罩染在铅笔底稿上，翻页进入下一幅。</sub><br><sub><a href="https://visotalk.dev/styles/watercolor-tale/">▶ 样片</a> · <a href="skills/visotalk/styles/watercolor-tale/STYLE.md">STYLE.md</a></sub></td>
</tr>
<tr>
<td width="50%" valign="top"><a href="https://visotalk.dev/styles/pixel-quest/"><img src="https://visotalk.dev/styles/pixel-quest/poster.jpg" alt="Pixel Quest" width="100%"></a><br><b>Pixel Quest · 像素关卡</b> · <sub>教程、课程</sub><br><sub>16 位游戏画面：一步一关，经验条逐格填满，难点是一场 Boss 战。</sub><br><sub><a href="https://visotalk.dev/styles/pixel-quest/">▶ 样片</a> · <a href="skills/visotalk/styles/pixel-quest/STYLE.md">STYLE.md</a></sub></td>
<td width="50%" valign="top"><a href="https://visotalk.dev/styles/riso-pop/"><img src="https://visotalk.dev/styles/riso-pop/poster.jpg" alt="Riso Pop" width="100%"></a><br><b>Riso Pop · 孔版双色</b> · <sub>科普、产品</sub><br><sub>蓝粉两色孔版印刷：平涂色块、半调网点，叠印成紫，版位错开又弹回。</sub><br><sub><a href="https://visotalk.dev/styles/riso-pop/">▶ 样片</a> · <a href="skills/visotalk/styles/riso-pop/STYLE.md">STYLE.md</a></sub></td>
</tr>
<tr>
<td width="50%" valign="top"><a href="https://visotalk.dev/styles/live-studio/"><img src="https://visotalk.dev/styles/live-studio/poster.jpg" alt="Live Studio" width="100%"></a><br><b>Live Studio · 演播台</b> · <sub>口播、报告</sub><br><sub>叠在你画面上的电视包装：分层字条、台标和滚动字幕，比分条随数字上涨。</sub><br><sub><a href="https://visotalk.dev/styles/live-studio/">▶ 样片</a> · <a href="skills/visotalk/styles/live-studio/STYLE.md">STYLE.md</a></sub></td>
<td width="50%" valign="top"></td>
</tr>
</table>

`npx visotalk style list` 列出每种样式及其适用场景；`visotalk style use <name>` 把一种样式复制到你的作品里修改。
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

- **0.7.1** · 新增七种内置样式，共十七种：[Field Atlas](skills/visotalk/styles/field-atlas/STYLE.md)、[Evidence Board](skills/visotalk/styles/evidence-board/STYLE.md)、[Clay World](skills/visotalk/styles/clay-world/STYLE.md)、[Watercolor Tale](skills/visotalk/styles/watercolor-tale/STYLE.md)、[Pixel Quest](skills/visotalk/styles/pixel-quest/STYLE.md)、[Riso Pop](skills/visotalk/styles/riso-pop/STYLE.md) 和 [Live Studio](skills/visotalk/styles/live-studio/STYLE.md)。
- **0.7** · 在你自己的录像上加图文（[On Air](skills/visotalk/styles/on-air/STYLE.md)、[Marker Margin](skills/visotalk/styles/marker-margin/STYLE.md)），并可用 `visotalk recording --trim` 剪掉口头禅和长停顿。
- **0.7** · 十种内置样式，按适合的视频类型分组；部件可以用 three.js 画 3D。

<details>
<summary><b>仓库里有什么</b></summary>

| 路径 | |
|---|---|
| [skills/visotalk](skills/visotalk/SKILL.md) | agent skill：如何设计、编写、检查和渲染一支视频，以及内置样式 |
| [packages/cli](packages/cli) | `visotalk`：validate、still、sheet、qa、render、play、recording、style、doctor |
| [packages/ir](packages/ir) · [jsx](packages/jsx) | 文档格式：解析器、校验器、时间求解器和标签 |
| [packages/runtime](packages/runtime) · [exporter](packages/exporter) | DOM 渲染器和播放器，以及确定性的逐帧捕获和混音 |
| [spec/ir/0.7/ir.ts](spec/ir/0.7/ir.ts) | 格式的类型定义：文档能包含什么，以此为准 |
| [examples](examples) | visotalk.dev 上的每一支影片，都是文档 |
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
