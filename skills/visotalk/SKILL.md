---
name: visotalk
description: Write, check and render a narrated explainer video as a VisoTalk document (TSX markup). Use when asked to make an explainer, a narrated diagram or code walkthrough, a short video from a script, or graphics timed to someone's own voice-over or talking-head recording; not for frame-level motion graphics, colour grading or avatars.
---

# Making an explainer with VisoTalk

You write one file, `doc.tsx`: a VisoTalk document (spec 0.7, a TSX module). A scene holds the narration **lines**, the **parts** (boxes of ordinary React that draw what is on screen) and an **animation** that says when each thing appears or changes, anchored to the **words** of the narration. The engine reads the skeleton (lines, parts, animations) as literals and owns time: you never write frame numbers; a picture is a function of the clock and of numbers the document tweens.

This is a creative task. You are a video designer making an explainer of top professional standard: the viewer understands the narration from what is on screen and wants to keep watching. It is finished when someone who has not read the script would be glad to publish it, not when `qa` is clean. Each scene needs a visual idea of its own subject (a metaphor, a drawing driven by the data, one object that transforms, a move of the frame) and motion that carries meaning. How it looks (palette, faces, density, the character of motion, the captions) is the work's style, below: this skill does not choose a look.

**A complete small document is in `example/`** (`doc.tsx` and `parts/`, about 4,000 characters): read it before you write your own; it shows the imports, a part per file, a number counted up by a tween, an SVG drawn by a tweened `draw`, and entrances on words. Copy its structure, not its look.

## Setup

- The CLI is the npm package `visotalk`: run it as `npx visotalk@latest <command> doc.tsx` (keep `@latest`), or install it once with `npm i -g visotalk@latest` (in the repository: `pnpm visotalk`). Node 22.12 or later and `ffmpeg` are needed. Work files go to `.visotalk/<id>/`. Run `visotalk doctor --fix` once on a new machine (`references/setup.md`).
- Narration is Kokoro unless the document names a voice: `<Doc voice="minimax:English_Trustworthy_Man">` uses MiniMax with `MINIMAX_API_KEY` from the environment (a China account also has `MINIMAX_BASE_URL=https://api.minimaxi.com`). Never write a key into a command line or a file, and never print it.
- **Given a recording** (someone's voice-over or talking-head video) instead of a script: it is the narration and the clock, and `references/recorded.md` replaces steps 1 and 2 of the workflow and the pace rules.
- Other voices and providers, Chinese, Japanese and Korean, fonts, `render` (a video file), `play`, `export`/`import`, `build --artifact` and other languages: `references/setup.md`.

## Commands

| Command | Does | Cost |
|---|---|---|
| `validate doc.tsx` | syntax, references, anchors, and your parts' code as text (no timers, `Math.random`, `Date`, network, CSS animations); one issue per line at `doc.tsx:line:col`, most with a `fix` | free |
| `init doc.tsx --lines lines.json` | a valid skeleton from your script (`{"title", "lang", "voice", "canvas", "lines": [{"id", "text", "say", "intent"}]}`): every line in one scene `draft`, nothing drawn; starts the narration in the background | seconds |
| `prepare doc.tsx` | narration audio and word times (`voice.json`). Until it is ready, `sheet`, `still` and `qa` time each line from its words (about 2.8 a second) and say so | minutes |
| `sheet doc.tsx [--at 0.85] [--shots]` | one frame per line as one contact-sheet picture (JPEG, about 1280 wide); works from the skeleton. `--shots`: one frame per shot of a video recording instead | seconds |
| `still doc.tsx --time 12,31,47` or `--line scene/line[,…] [--at 0.85]` | several moments in one call, returned as **one** picture (two frames a row, up to six) with, for each moment, the sentence spoken then and what the engine measured (where the ink is, room on each side, anything past an edge or under the captions): often enough without the picture. `--png` gives full-size frames for the smallest print | seconds |
| `qa doc.tsx` | on sampled frames: past its box or the canvas, cut off, under the captions, on screen under two seconds or never, a target no part registers, weak anchors. Overlap is not checked (layering is a normal way to show things). One line per problem, `--full` for all; exit 1 on any issue | seconds |
| `build doc.tsx --out DIR` | the finished web page, `DIR/index.html` and its files, playing from a folder (file://) or a server. Deliver it as built: do not edit, inline or re-bundle it | seconds |
| `asset search "<words>"` / `asset get N --id NAME` | openly licensed pictures (Wikimedia Commons, then Openverse) as text candidates; `get` saves one to `media/NAME.jpg` and prints the `<Asset>` to paste into `<Doc>` (`references/assets.md`) | seconds |
| `style list` / `style show <slug-or-directory>` / `style use <slug-or-directory> doc.tsx` / `style check doc.tsx` | choose, copy and inspect a complete independent style; check local locks and literal component metadata | free |
| `schema [tags\|motions\|hooks]` | the vocabulary | free |

**Pictures cost context.** `sheet`, `still` and `qa` keep a ledger per document: a frame unchanged since you saw it is named, not drawn again, and past a budget of pictures (15, `VISOTALK_LOOK_BUDGET`) they print only what they measured unless `--image` asks for one more. They use Chrome one at a time: run them one after another with a tool timeout of minutes.

## Styles

A style is the look of a work: `style/STYLE.md` (what each colour means, the faces, the ground, how things move, its native moves and pitfalls), `style.json` (the tokens written on `<Doc>`, including the caption's skin, `tokens.caption`) and `style/parts/` (components that draw its material). Every work has one before its first scene is drawn.

When a work has `style/`, read its `STYLE.md` and `style.json` before drawing. Otherwise choose one: `style list` gives each built-in style in one line with the kinds of video it is made for, its look and the subjects it fits; pick among those made for this kind of video the one whose uses match the topic (or offer two or three when the person is there to choose), `style show <slug>` for its components, then `style use <slug> doc.tsx`, which copies it once and writes its tokens on `<Doc>`. When none fits, write `style/STYLE.md` yourself in the same eleven numbered sections (`style check` lists them) and set the tokens on `<Doc>`. Follow the work's local copy, adapting its guidance, components and document together when asked. Never reset it from a catalogue during a follow-up. Run `style check doc.tsx` after adaptation. When the person asks for a change to the look, decide first whether it belongs to the style or to this work alone: what any work in this look should share (the ground, colours, faces, the caption skin, how a component draws) goes into `style/`; what serves only this story (one scene's layout, a chart only it needs) goes into the work's own `parts/`. When you cannot tell, ask. Each change you make to `style/` adds one plain line to `style/CHANGES.md` saying what changed in words the person would use (`- Ground changed to newsprint`), because that list is what they read before keeping the look as a style of their own. Leave `style/previews/`, `style/poster.jpg` and `style.json`'s `slug` and `version` as they are: they are written for you. In `style.json`, `scenarios` names one to three kinds of video the style is made for (`talking-head` means drawn over a person's own footage, with no ground of its own) and `tags` two to six words for its look, both from the closed lists `style list` ends with; `uses` is free words. A component card names an exact `style/parts/*.tsx` file: read its literal `meta` and actual parameters before importing it, and drive a `progress` parameter from the document through its part: `<Part id="tag">{() => <NameTag name="…" show={useProp('show', 0)}/>}</Part>`, then `<Tween target="tag" to={{show: 1}} …/>` (the pack's `demo/doc.tsx` does it for each). A sample demonstrates technique; never reuse its story, scene list or timings. A work's copy changes only by your edits: a newer version of the style it came from reaches it only when the person applies it.

## Principles

What a good video does. How to write it is in `references/`; a rule here says what must be true, not which tag makes it so.

1. **A thing is on screen only from the word that names it.** Never show the whole picture at the start of a line and then highlight its parts: a highlight is not an appearance, and the viewer has already seen it. Build the picture up, one entrance per word.
2. **One visible change per sentence, on the word that names its subject**: the noun or the figure, not the start or the end of the sentence. A sentence that names two things is two changes on two words, not one object that shows both.
3. **Every object appears for a reason the narration gives**, and does not stay after the line that needed it.
4. **Give everything time to be seen and understood: at least two seconds** from when it appears to when it goes, and the last picture of a scene stays after the narration ends. A flash is allowed only when it is the point, and the design says so.
5. **Motion means something.** An arrival says "here is a new thing", a growth says "this quantity", a slide or morph says "this became that", a draw says "this leads there". A thing that grows, moves, replaces or becomes does that on screen: an entrance that pops is not that motion. A quantity that matters is shown changing (a figure that counts, a bar that grows to its length). Motion that means nothing is decoration: leave it out.
6. **One subject on stage at a time.** What a sentence replaces leaves, or moves into the new thing, before the new thing arrives; never show the before and after in one frame unless the sentence compares them. Things that merge go into each other without overprinting.
7. **Show the thing, not a label for it.** A sentence about a command points at the command and what it prints; about a file, at its contents; about a number, at the quantity it measures. For a feeling or a situation, draw a metaphor. Draw what carries the sentence; an aside stays in the narration. Where a familiar mark exists (a name, a product, a kind of thing), show it beside the name.
8. **Never what a slide deck would give.** A title, cards or chips on a grid with fade and slide entrances is page layout plus entrance animation. Each scene has a visual idea specific to its subject, and the thing the sentence is about is large enough to read at a glance; how full the frame is and how things enter are the style's.
9. **A pointer is easy to read.** An arrow, a bracket, a callout or a label that refers to the picture makes clear what it refers to: the line, the shape and the text are placed so that a viewer sees the connection at once. It need not touch what it explains; one that points at nothing in particular, or a label that seems to belong to nothing, confuses.
10. **A picture continues, it is not redrawn.** A picture that goes on over several sentences is one part with its numbers tweened, or the same elements moved or changed. A scene's parts end with it: a picture that goes on into the next scene is declared again there (a component, one line) and starts from its base props, or is a global part in `<Doc>`.
11. **The narration is in the lines**, not in the drawing: what is said is a `<Line>` (its caption comes from it), and a part draws the graphic and the short labels that belong to it (names, figures). A sentence drawn inside a part is invisible to the anchors and to the captions; a label a translation must change is drawn with `useText`.
12. **Text is short**: a label is a phrase, a figure a number and a name. Long sentences are the caption's job.
13. **Be honest.** Never invent a measured number or claim a result nobody measured. An example the viewer is told is an example (the plausible output of a command a line names) is not a measurement: draw it. Narration is fixed audio: never state a value that depends on a param.
14. **Material is licensed and local.** Every image, clip and sound is a declared asset with its licence and source, kept in the project's library; credits are generated. Rules: `references/assets.md`.
15. **Know what a scene shows before you draw it**, sentence by sentence: what is on stage, what arrives or leaves, which word fires it. Then check the picture against that.

## Workflow

Nothing refuses a step; planning, looking and judging are yours. A way that works:

1. **Gather** what the video states: facts, numbers, real output.
2. **Script** short lines, one idea each. Write numbers as words in the line (`three hundred bytes`, digits in the caption with `text="… 300 bytes"`). Then `visotalk init doc.tsx --lines lines.json`.
3. **Settle the style** (above), then **decide what each scene shows before you draw it**: what each sentence points at in the world (principle 7); at least two ideas that differ in kind, picking the one a newcomer would understand; then the board, sentence by sentence: layout and sizes in px, clear of the captions (below y 900), what arrives, moves or leaves on which word.
4. **Draw one scene, look, then plan the next**: one `<Scene>` per idea, one `<Line>` per sentence, one `<Part>` per picture, the animation once the picture exists (`references/markup.md`, `parts.md`). Keep `doc.tsx` to the skeleton and put each scene's drawing in its own file under `parts/`, imported as in `example/`: an edit then touches one small file. `validate` and fix every issue.
5. **Look**, as a viewer who has not seen your plan: could a slide deck have made it, is the thing the sentence names on screen and big enough, is anything cut off or empty by accident? Redraw what fails. How to look cheaply is below.
6. `qa` for what you miss; it cannot see whether a picture matches its sentence. Deliver with `build doc.tsx --out DIR`.

### Pace and scope

- **Scope to the length asked.** About 2.8 words a second, so 45 seconds is about 120 words; a scene adds 1.2 s of lead and tail. Four or five scenes of eight to ten seconds for 45 s, not ten.
- **Have a whole document early.** After the first scene is drawn and looked at, draw the rest simply, `validate`, `qa`, fix, within the first third of your time; then improve the weakest scenes. A complete plain document is a video; a half-polished one is not.
- **Stop `qa` on time.** At most three runs: once when whole, then after each round of fixes, fixing every problem a viewer would notice scene by scene in one edit each. Then build.
- **Look as little as you can, through a helper if you have one.** Every picture you read stays in your conversation and is sent again with every later step: a few dozen make every step slower and dearer and can pass the size a model accepts. Reading what `still` measured costs words; reading the picture costs far more.
  - **If your harness can hand a task to a subagent, do all looking there and do not read images yourself.** The pictures live and die in the helper's short conversation and yours keeps only its few lines; helpers can look at several scenes in parallel while you write the next; and a fresh eye judges a frame as a viewer does. Give it the scenes or seconds, what each should show and what you doubt; it runs `sheet` and `still`, reads them, fixes in the scene files what a viewer would notice, looks once more and answers in a few lines. The same for a downloaded photo and for a last look at the built page. `agents/visotalk-look.md` is such a helper (written for opencode; its text works as any harness's subagent prompt).
  - **Without one, look yourself only when words cannot tell you.** Measurements and `qa` first; a picture only for what they cannot say (does it look like the thing, is it a slide deck, is it crowded). A round is one `sheet`, one `still` call with every moment you doubt, one pass of fixes; at most three rounds.

## References

Read one only when you need it:

- `references/markup.md`: the syntax of `doc.tsx`, parts, targets, anchors, motions, `qa`, languages and known gotchas.
- `references/parts.md`: drawing a part: CSS layout, data-driven pictures, motion by a number, SVG, theme tokens.
- `references/assets.md`: finding, keeping and declaring material from the internet.
- `references/explainers.md`: reporting what a source found, series, covers, phone screens, chapters, illustrations, the independent check.
- `references/setup.md`: setup, voices, CJK, fonts, and `render`, `play`, `export`, `build --artifact`.
- `references/recorded.md`: a person's own recording as the narration: what may not change, pauses, the presenter's place, a transparent layer for an editor.
