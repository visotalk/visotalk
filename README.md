<p><img src="docs/brand/icon.svg" alt="VisoTalk" width="96" height="96"></p>

# VisoTalk

**Explainer videos your coding agent can write, check and render.**

A VisoTalk video is a document: the narration, the pictures it shows (ordinary React), and the words each thing appears on. The engine owns time and rendering,
so the same document renders to the same frames every time, and an agent edits a sentence instead of a timeline.

<p><a href="https://visotalk.dev/examples/moon-phases/"><img src="https://visotalk.dev/examples/moon-phases/preview.gif" alt="A VisoTalk video about the phases of the Moon" width="640"></a></p>

[Play it live, with sound, on visotalk.dev](https://visotalk.dev/examples/moon-phases/): the video is a document, and the same document renders to MP4.

## Use it with your agent

```sh
npx skills add visotalk/visotalk -g        # the skill, for Claude Code, Codex and other agents
npx visotalk@latest doctor --fix           # once per machine: Chrome, the narration model, Python packages (about 1 GB)
```

Then ask: *"Use the visotalk skill to make a 30-second explainer about how a hash table works."* The agent writes `doc.tsx`, draws it scene by scene,
looks at stills, and renders `final.mp4`. Rendering takes roughly 4 to 8 seconds per second of video on four cores; the voice (Kokoro), the word timing and the rendering all run on your machine.

You need Node.js 20 or later, `ffmpeg` and Python 3.9 or later. `visotalk doctor` shows what is missing; [packages/cli](packages/cli/README.md) has the details.

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
with CSS, SVG, data tables and loops, driven by the engine's clock.

## Examples

The video above is [moon-phases](examples/moon-phases/doc.tsx). Each of these plays live on [visotalk.dev](https://visotalk.dev/examples/).

<table>
  <tr>
    <td valign="top">
      <a href="https://visotalk.dev/examples/liftoff/"><img src="https://visotalk.dev/examples/liftoff/preview.gif" alt="Liftoff, by Eric Berger: a book explainer" width="400"></a><br>
      <b>Liftoff, by Eric Berger: a book explainer</b><br>Real photographs and video, credited per shot · <a href="examples/liftoff/doc.tsx">source</a>
    </td>
    <td valign="top">
      <a href="https://visotalk.dev/examples/uv/"><img src="https://visotalk.dev/examples/uv/preview.gif" alt="uv, the one tool for Python projects" width="400"></a><br>
      <b>uv, the one tool for Python projects</b><br>A tool walkthrough with terminals and output · <a href="examples/uv/doc.tsx">source</a>
    </td>
  </tr>
  <tr>
    <td valign="top" colspan="2" align="center">
      <a href="https://visotalk.dev/examples/population/"><img src="https://visotalk.dev/examples/population/preview.gif" alt="The eight billion" width="400"></a><br>
      <b>The eight billion</b><br>One drawn picture, with its own component · <a href="examples/population/doc.tsx">source</a>
    </td>
  </tr>
</table>


Run one: `npx visotalk@latest render examples/moon-phases/doc.tsx`.

## What is in this repository

| Path | |
|---|---|
| [skills/visotalk](skills/visotalk/SKILL.md) | The agent skill: how to design, write, check and render a video |
| [packages/cli](packages/cli) | `visotalk`: validate, design, still, review, qa, render, play, doctor |
| [packages/ir](packages/ir) · [jsx](packages/jsx) | The document format: parser, validator, time solver, and the tags |
| [packages/runtime](packages/runtime) · [exporter](packages/exporter) | The DOM renderer and player, and the deterministic capture and audio mix |
| [spec/ir/0.5/ir.ts](spec/ir/0.5/ir.ts) | The format's types: the source of truth for what a document may contain |
| [tests](tests) | Unit tests and the regression suite: determinism, golden frames, layout checks |
| [docs/brand](docs/brand) | The mark, the lockup and the colour tokens |

## Develop

```sh
pnpm install
pnpm tsc && pnpm test && pnpm build
pnpm visotalk validate examples/moon-phases/doc.tsx
pnpm regression
```

`pnpm regression` renders the examples and compares them with golden frames. It needs the pinned Chrome that `npx visotalk@latest doctor --fix` installs.

## Status

Early. The document format is version 0.x and may change in any minor version.

## License

[MIT](LICENSE).
