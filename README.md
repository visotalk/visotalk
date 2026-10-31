<div align="center">

<h1>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://visotalk.dev/lockup-dark.svg">
    <img src="docs/brand/lockup.svg" alt="VisoTalk" width="360">
  </picture>
</h1>

**English** · [&#20013;&#25991;](README.zh-CN.md)

An open-source agent skill for explainer videos: a narration-driven motion engine and a library of built-in styles, ready out of the box.

<a href="https://visotalk.dev/examples/"><img alt="Watch the examples" src="https://img.shields.io/badge/%E2%96%B6%20Watch%20the%20examples-0E4F9C?style=for-the-badge"></a>
<a href="https://visotalk.dev/styles/"><img alt="Styles" src="https://img.shields.io/badge/Styles-10%20built%20in-262D38?style=for-the-badge"></a>
<a href="https://visotalk.dev/docs"><img alt="Docs" src="https://img.shields.io/badge/Docs-visotalk.dev-262D38?style=for-the-badge"></a>
<a href="https://discord.gg/zDYMHqZMNy"><img alt="Discord" src="https://img.shields.io/badge/Discord-join-5865F2?style=for-the-badge&logo=discord&logoColor=white"></a>
<a href="https://x.com/visotalk"><img alt="Follow on X" src="https://img.shields.io/badge/X-@visotalk-000000?style=for-the-badge&logo=x&logoColor=white"></a>

[![npm](https://img.shields.io/npm/v/visotalk?color=0E4F9C&label=npm)](https://www.npmjs.com/package/visotalk)
[![npm downloads](https://img.shields.io/npm/dm/visotalk?color=0E4F9C)](https://www.npmjs.com/package/visotalk)
[![CI](https://github.com/visotalk/visotalk/actions/workflows/ci.yaml/badge.svg)](https://github.com/visotalk/visotalk/actions/workflows/ci.yaml)
[![License: MIT](https://img.shields.io/badge/license-MIT-2EA44F)](LICENSE)
[![Claude Code skill](https://img.shields.io/badge/Claude%20Code-skill-d97757)](skills/visotalk/SKILL.md)
[![Codex skill](https://img.shields.io/badge/Codex-skill-10a37f)](skills/visotalk/SKILL.md)

<a href="https://visotalk.dev/examples/visotalk-intro/"><img src="https://visotalk.dev/examples/visotalk-intro/preview.gif" alt="Narration is the new timeline: the VisoTalk introduction film, made with VisoTalk" width="100%"></a>

[**▶ Play it with sound**](https://visotalk.dev/examples/visotalk-intro/) · [Read its source](examples/visotalk-intro/doc.tsx) · 4 minutes, one document, the same sentence in five languages

</div>

## What it does

Ask your agent for an explainer. It writes `doc.tsx`, where every animation starts on a word of the narration; rewrite, revoice or translate
the narration and the picture follows. It is not a video generator: every frame is drawn by code, so a fix is an edit to a sentence.

| | |
|---|---|
| **10** built-in styles | from a hand-drawn notebook to marks over your own footage |
| **4** narration languages | English, Chinese, Japanese and Korean, with word-level timing in each |
| **Frame for frame** | two renders of a document are identical, checked frame by frame in the regression suite |
| **On your machine** | the voice (Kokoro), the word timing and the rendering run locally; roughly 4 to 8 s per second of video on four cores |

## Quick start

```sh
npx skills add visotalk/visotalk -g        # the skill, for Claude Code, Codex and other agents
npx visotalk@latest doctor --fix           # once per machine: Chrome, the narration model, Python packages (about 1 GB)
```

Or hand your agent the link: *"Install this skill for me: https://github.com/visotalk/visotalk"*. Then say what you want:

| Say | What happens |
|---|---|
| *Use the visotalk skill to make a 60-second explainer about how a hash table works.* | The agent writes the script and `doc.tsx`, draws it scene by scene, looks at stills and renders `final.mp4` |
| *Turn this deck into a lesson for my students, in the Lab Notebook style.* | Each slide becomes a scene that explains it; the deck's pictures come along |
| *Here is my recording. Put On Air graphics on it.* | Your own audio or video keeps its words and its clock; the graphics land on what you say |
| *Make the same film in Chinese.* | A language overlay: new lines and anchors, the same pictures, retimed to the new voice |

You need Node.js 20 or later, `ffmpeg` and Python 3.9 or later. `visotalk doctor` shows what is missing; [packages/cli](packages/cli/README.md) has the details.

## Styles

A style is a look an agent can follow: a `STYLE.md` that says what it is and is not, components that draw it, and a narrated sample. Pick one by
name, or ask the agent to make your own from it. Every sample plays on [visotalk.dev/styles](https://visotalk.dev/styles/).

<table>
<tr>
<td width="50%" valign="top"><a href="https://visotalk.dev/styles/red-pencil/"><img src="https://visotalk.dev/styles/red-pencil/poster.jpg" alt="Red Pencil" width="100%"></a><br><b>Red Pencil</b> · <sub>report, lesson</sub><br><sub>A printed page marked up in red as it is read: figures circled, wrong sums struck and corrected.</sub><br><sub><a href="https://visotalk.dev/styles/red-pencil/">▶ sample</a> · <a href="skills/visotalk/styles/red-pencil/STYLE.md">STYLE.md</a></sub></td>
<td width="50%" valign="top"><a href="https://visotalk.dev/styles/lab-notebook/"><img src="https://visotalk.dev/styles/lab-notebook/poster.jpg" alt="Lab Notebook" width="100%"></a><br><b>Lab Notebook</b> · <sub>lesson, science</sub><br><sub>Squared paper where the diagram is drawn stroke by stroke as it is explained, the result boxed in red.</sub><br><sub><a href="https://visotalk.dev/styles/lab-notebook/">▶ sample</a> · <a href="skills/visotalk/styles/lab-notebook/STYLE.md">STYLE.md</a></sub></td>
</tr>
<tr>
<td width="50%" valign="top"><a href="https://visotalk.dev/styles/stage-light/"><img src="https://visotalk.dev/styles/stage-light/poster.jpg" alt="Stage Light" width="100%"></a><br><b>Stage Light</b> · <sub>product, report</sub><br><sub>A dark stage where one soft light follows what is being said; large condensed figures.</sub><br><sub><a href="https://visotalk.dev/styles/stage-light/">▶ sample</a> · <a href="skills/visotalk/styles/stage-light/STYLE.md">STYLE.md</a></sub></td>
<td width="50%" valign="top"><a href="https://visotalk.dev/styles/screen-desk/"><img src="https://visotalk.dev/styles/screen-desk/poster.jpg" alt="Screen Desk" width="100%"></a><br><b>Screen Desk</b> · <sub>tutorial, product</sub><br><sub>An app window, a terminal or a phone on a pale desk; the camera flies to the control the narration names.</sub><br><sub><a href="https://visotalk.dev/styles/screen-desk/">▶ sample</a> · <a href="skills/visotalk/styles/screen-desk/STYLE.md">STYLE.md</a></sub></td>
</tr>
<tr>
<td width="50%" valign="top"><a href="https://visotalk.dev/styles/on-air/"><img src="https://visotalk.dev/styles/on-air/poster.jpg" alt="On Air" width="100%"></a><br><b>On Air</b> · <sub>talking head</sub><br><sub>Solid ink tags on your own footage, set where each shot leaves room; the footage stays the picture.</sub><br><sub><a href="https://visotalk.dev/styles/on-air/">▶ sample</a> · <a href="skills/visotalk/styles/on-air/STYLE.md">STYLE.md</a></sub></td>
<td width="50%" valign="top"><a href="https://visotalk.dev/styles/marker-margin/"><img src="https://visotalk.dev/styles/marker-margin/poster.jpg" alt="Marker Margin" width="100%"></a><br><b>Marker Margin</b> · <sub>talking head, tutorial</sub><br><sub>A felt-tip marker on the glass over your footage: things looped as they are named, wiped clean at every cut.</sub><br><sub><a href="https://visotalk.dev/styles/marker-margin/">▶ sample</a> · <a href="skills/visotalk/styles/marker-margin/STYLE.md">STYLE.md</a></sub></td>
</tr>
<tr>
<td width="50%" valign="top"><a href="https://visotalk.dev/styles/drafting-table/"><img src="https://visotalk.dev/styles/drafting-table/poster.jpg" alt="Drafting Table" width="100%"></a><br><b>Drafting Table</b> · <sub>science, lesson</sub><br><sub>A mechanism drafted in white line on deep blue: dimensions measured out as they are said, parts exploded along their axis.</sub><br><sub><a href="https://visotalk.dev/styles/drafting-table/">▶ sample</a> · <a href="skills/visotalk/styles/drafting-table/STYLE.md">STYLE.md</a></sub></td>
<td width="50%" valign="top"><a href="https://visotalk.dev/styles/iso-works/"><img src="https://visotalk.dev/styles/iso-works/poster.jpg" alt="Iso Works" width="100%"></a><br><b>Iso Works</b> · <sub>product, report</sub><br><sub>A system as small isometric buildings, with data riding between them as cubes on belts.</sub><br><sub><a href="https://visotalk.dev/styles/iso-works/">▶ sample</a> · <a href="skills/visotalk/styles/iso-works/STYLE.md">STYLE.md</a></sub></td>
</tr>
<tr>
<td width="50%" valign="top"><a href="https://visotalk.dev/styles/depth-stage/"><img src="https://visotalk.dev/styles/depth-stage/poster.jpg" alt="Depth Stage" width="100%"></a><br><b>Depth Stage</b> · <sub>story, science</sub><br><sub>Silhouette layers of a place at dusk under one camera that travels through them, haze paling what is far.</sub><br><sub><a href="https://visotalk.dev/styles/depth-stage/">▶ sample</a> · <a href="skills/visotalk/styles/depth-stage/STYLE.md">STYLE.md</a></sub></td>
<td width="50%" valign="top"><a href="https://visotalk.dev/styles/ink-scroll/"><img src="https://visotalk.dev/styles/ink-scroll/poster.jpg" alt="Ink Scroll" width="100%"></a><br><b>Ink Scroll</b> · <sub>story, lesson</sub><br><sub>A handscroll unrolled from the right: ink washes bloom into hills and rivers, and a red seal is pressed on the conclusion.</sub><br><sub><a href="https://visotalk.dev/styles/ink-scroll/">▶ sample</a> · <a href="skills/visotalk/styles/ink-scroll/STYLE.md">STYLE.md</a></sub></td>
</tr>
</table>

`npx visotalk style list` prints every style with its scenarios; `visotalk style use <name>` copies one into your work to change.
More films, in four languages, are on [visotalk.dev/examples](https://visotalk.dev/examples/) with their sources in [examples/](examples/).

## What a document looks like

A scene holds its lines, its parts (boxes of React that draw the picture) and an animation that says on which word each thing happens:

```tsx
<Scene id="intro">
  <Line id="h1">Setting up a Python project usually means juggling a pile of tools.</Line>
  <Part id="tools">{() => <ToolGrid />}</Part>
  <Animation><Appear on="tools" line="h1" word="juggling"/></Animation>
</Scene>
```

The part `tools` appears on the word "juggling", whenever the narration says it. The lines, parts and animations are literals the engine reads; what a part draws is React,
with CSS, SVG, three.js, data tables and loops, driven by the engine's clock.

## What's new

- **0.7** · Graphics on your own recording ([On Air](skills/visotalk/styles/on-air/STYLE.md), [Marker Margin](skills/visotalk/styles/marker-margin/STYLE.md)), with `visotalk recording --trim` to cut hesitations and long pauses.
- **0.7** · Ten built-in styles, grouped by the kind of video each is made for, and parts that draw in 3D with three.js.

<details>
<summary><b>What is in this repository</b></summary>

| Path | |
|---|---|
| [skills/visotalk](skills/visotalk/SKILL.md) | The agent skill: how to design, write, check and render a video, and the built-in styles |
| [packages/cli](packages/cli) | `visotalk`: validate, still, sheet, qa, render, play, recording, style, doctor |
| [packages/ir](packages/ir) · [jsx](packages/jsx) | The document format: parser, validator, time solver, and the tags |
| [packages/runtime](packages/runtime) · [exporter](packages/exporter) | The DOM renderer and player, and the deterministic capture and audio mix |
| [spec/ir/0.7/ir.ts](spec/ir/0.7/ir.ts) | The format's types: the source of truth for what a document may contain |
| [examples](examples) | Every film on visotalk.dev, as documents |
| [tests](tests) | Unit tests and the regression suite: determinism, golden frames, layout checks |
| [docs/brand](docs/brand) | The mark, the lockup and the colour tokens |

</details>

<details>
<summary><b>Develop</b></summary>

```sh
pnpm install
pnpm tsc && pnpm test && pnpm build
pnpm visotalk validate examples/moon-phases/doc.tsx
pnpm regression
```

`pnpm regression` renders the examples and compares them with golden frames. It needs the pinned Chrome that `npx visotalk@latest doctor --fix` installs.

</details>

## Status

Early. The document format is version 0.x and may change in any minor version. Questions and ideas are welcome on [Discord](https://discord.gg/zDYMHqZMNy) and in the [issues](https://github.com/visotalk/visotalk/issues).

## License

[MIT](LICENSE).
