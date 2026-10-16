<p><img src="docs/brand/icon.svg" alt="VisoTalk" width="96" height="96"></p>

# VisoTalk

**Explainer videos your coding agent can write, check and render.**

A VisoTalk video is a document: the narration, the objects it talks about, and the words each object appears on. The engine owns time,
layout and rendering, so the same document renders to the same frames every time, and an agent edits a sentence instead of a timeline.

<p><a href="https://visotalk.dev/examples/moon-phases/"><img src="https://visotalk.dev/examples/moon-phases/preview.gif" alt="A VisoTalk video about the phases of the Moon" width="640"></a></p>

[Play it live, with sound, on visotalk.dev](https://visotalk.dev/examples/moon-phases/): the video is a document, and the same document renders to MP4.

## Use it with your agent

```sh
npx skills add visotalk/visotalk -g        # the skill, for Claude Code, Codex and other agents
npx visotalk@latest doctor --fix           # once per machine: Chrome, the narration model, Python packages (about 1 GB)
```

Then ask: *"Use the visotalk skill to make a 30-second explainer about how a hash table works."* The agent writes `doc.tsx`, designs each scene,
looks at full-size stills, and renders `final.mp4`. Rendering takes roughly 4 to 8 seconds per second of video on four cores; the voice (Kokoro), the word timing and the rendering all run on your machine.

You need Node.js 20 or later, `ffmpeg` and Python 3.9 or later. `visotalk doctor` shows what is missing; [packages/cli](packages/cli/README.md) has the details.

## What a document looks like

Each `<Appear>` wraps the words that make something happen on screen. This is a line from [examples/uv](examples/uv/doc.tsx):

```tsx
<Beat id="h1">
  <Line id="h1l">Setting up a <Appear on="head1">Python project</Appear> usually means juggling a pile of tools.</Line>
</Beat>
```

The object `head1` appears on the word "Python", whenever the narration says it. The file is read, never run: there are no variables or loops,
only tags and literals.

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
    <td valign="top">
      <a href="https://visotalk.dev/examples/population/"><img src="https://visotalk.dev/examples/population/preview.gif" alt="The eight billion" width="400"></a><br>
      <b>The eight billion</b><br>One drawn picture, with its own component · <a href="examples/population/doc.tsx">source</a>
    </td>
    <td valign="top">
      <a href="https://visotalk.dev/examples/micrograd-backward/"><img src="https://visotalk.dev/examples/micrograd-backward/preview.gif" alt="micrograd: the backward pass" width="400"></a><br>
      <b>micrograd: the backward pass</b><br>Code and graphs; interactive in the web player · <a href="examples/micrograd-backward/doc.tsx">source</a>
    </td>
  </tr>
  <tr>
    <td valign="top" colspan="2" align="center">
      <a href="https://visotalk.dev/examples/shape-sketch/"><img src="https://visotalk.dev/examples/shape-sketch/preview.gif" alt="A picture from shapes" width="400"></a><br>
      <b>A picture from shapes</b><br>Drawing with shapes · <a href="examples/shape-sketch/doc.tsx">source</a>
    </td>
  </tr>
</table>

There are more in [examples](examples): [micrograd](examples/micrograd/doc.tsx) and the component examples ([component-skeleton](examples/component-skeleton/doc.tsx), [moon-component](examples/moon-component/doc.tsx)).

Run one: `npx visotalk@latest render examples/moon-phases/doc.tsx`.

## What is in this repository

| Path | |
|---|---|
| [skills/visotalk](skills/visotalk/SKILL.md) | The agent skill: how to design, write, check and render a video |
| [packages/cli](packages/cli) | `visotalk`: validate, design, still, review, qa, render, play, doctor |
| [packages/ir](packages/ir) · [jsx](packages/jsx) | The document format: parser, validator, time solver, and the tag types |
| [packages/runtime](packages/runtime) · [exporter](packages/exporter) | The DOM renderer and player, and the deterministic capture and audio mix |
| [spec/ir/0.4/ir.ts](spec/ir/0.4/ir.ts) | The format's types: the source of truth for what a document may contain |
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
