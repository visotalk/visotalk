<p><img src="docs/brand/icon.svg" alt="VisoTalk" width="96" height="96"></p>

# VisoTalk

**Explainer videos your coding agent can write, check and render.**

A VisoTalk video is a document: the narration, the objects it talks about, and the words each object appears on. The engine owns time,
layout and rendering, so the same document renders to the same frames every time, and an agent edits a sentence instead of a timeline.

## Use it with your agent

```sh
npx skills add visotalk/visotalk -g        # the skill, for Claude Code, Codex and other agents
npx visotalk@latest doctor --fix           # once per machine: Chrome, the narration model, Python packages (about 1 GB)
```

Then ask: *"Use the visotalk skill to make a 30-second explainer about how a hash table works."* The agent writes `doc.tsx`, designs each scene,
looks at full-size stills, and renders `final.mp4`. About 3 seconds of rendering per second of video; the voice (Kokoro), the word timing and the rendering all run on your machine.

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

| Example | |
|---|---|
| [uv](examples/uv/doc.tsx) | A tool walkthrough with terminals and command output |
| [population](examples/population/doc.tsx) | Eight billion people as one drawn picture, with its own component |
| [moon-phases](examples/moon-phases/doc.tsx) | Why the Moon has phases: one picture that continues across scenes |
| [micrograd](examples/micrograd/doc.tsx) · [backward pass](examples/micrograd-backward/doc.tsx) | Code and graphs; the second is interactive in the web player |
| [liftoff](examples/liftoff/doc.tsx) | A book explainer with photographs and credits |
| [shape-sketch](examples/shape-sketch/doc.tsx) · [component-skeleton](examples/component-skeleton/doc.tsx) · [moon-component](examples/moon-component/doc.tsx) | Drawing with shapes, and writing a component the document places and times |

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
pnpm tsc:engine && pnpm test:engine
pnpm visotalk validate examples/moon-phases/doc.tsx
pnpm regression
```

`pnpm regression` renders the examples and compares them with golden frames. It needs the pinned Chrome that `npx visotalk@latest doctor --fix` installs.

## Status

Early. The document format is version 0.x and may change in any minor version.

## License

[MIT](LICENSE).
