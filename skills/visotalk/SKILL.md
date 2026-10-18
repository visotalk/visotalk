---
name: visotalk
description: Write, check and render a narrated explainer video as a VisoTalk document (TSX markup). Use when asked to make an explainer, a narrated diagram or code walkthrough, or a short video from a script; not for frame-level motion graphics, colour grading or avatars.
---

# Making an explainer with VisoTalk

You write one file, `doc.tsx`: a VisoTalk document, spec 0.5, a TSX module. A scene holds the narration **lines**, the **parts** (boxes of ordinary React that draw
what is on screen) and an **animation** that says when each thing appears or changes, anchored to the **words** of the narration. The skeleton (lines, parts, animations) is
*read* by the engine as literals; what is inside a part is React you write freely: CSS layout, SVG, data tables, loops. The engine owns time and rendering: you never
write frame numbers; the picture is a function of the clock and of numbers the document tweens. Then you validate it, look at stills, and render it.

This is a creative task, not a form to fill in. You are a video designer: design an explainer video of top professional standard. The viewer should understand the narration from what is on screen, and want to keep watching. The video is finished when someone who has not read the script would be glad to publish it, not when `qa` is clean: `qa` only proves nothing is broken. Everything inside a part is a material you may bend: size, colour, weight and layout are yours, and a picture you draw yourself (SVG, a chart from data, a component) is the normal way to get a scene that explains; the document keeps the words and the timing. Do not settle for the first arrangement that validates. And never deliver what a slide deck would give: a title, cards or chips arranged on a grid and made to fade or slide in is page layout plus entrance animation, and anyone can make it. Make work with a design of its own, the kind a top design studio would put its name to: a visual idea specific to this subject (a metaphor, a drawing driven by the data, one object that transforms instead of a new one appearing, a move of the frame), real typographic hierarchy, deliberate composition and negative space, and motion that carries meaning.

## Setup

- `visotalk <command> doc.tsx` is the CLI, an npm package: run it as `npx visotalk@latest <command> doc.tsx` (keep `@latest`: a copy installed earlier would run instead, and one older than 0.2 has no `doctor`), or install it once with `npm i -g visotalk@latest`
  (in the repository: `pnpm visotalk`). Node 20 or later and `ffmpeg` are needed. Work files go to `.visotalk/<meta.id>/`.
- Run `npx visotalk@latest doctor --fix` once on a machine before anything else. It reports what rendering needs and installs what is missing into
  `~/.visotalk` (the pinned Chrome, the Kokoro narration model, a Python environment with its packages, the word-timing weights; about 1 GB, a few
  minutes) so that every command finds them. It cannot install `ffmpeg` or Python 3.9+; it says so and you install those. It exits 0 when all is
  ready. Run `npx visotalk@latest doctor` to check without installing. `VISOTALK_CHROME`, `KOKORO_DIR`, `VISOTALK_PYTHON` and `TORCH_HOME` override what it
  installed; `VISOTALK_HOME` moves `~/.visotalk` (keep it short: narration fails under a path over about 90 characters).
- Reference, only when this file is not enough: the techniques in `references/` (`markup.md`, `parts.md`, `assets.md`), and the vocabulary
  itself: `visotalk schema` prints the tags, motions and hooks (`schema tags`, `schema motions`, `schema hooks`).
  Finished documents are in `examples/` of github.com/visotalk/visotalk. They show what the engine can do, not what to draw: do not reuse their look; your video has its own picture.

## Commands

| Command | Does | Cost |
|---|---|---|
| `validate doc.tsx` | syntax, references, anchors, and the code of your parts (no timers, `Math.random`, `Date`, network, CSS animations); prints one issue per line at `doc.tsx:line:col` | free |
| `init doc.tsx [--lines lines.json]` | a valid skeleton from your script (`{"title", "lang", "lines": [{"id", "text", "say", "intent"}]}`): every line in one scene `draft`, no parts, nothing drawn; it starts the narration in the background | seconds |
| `prepare doc.tsx` | narration audio per line (English, or Mandarin when `lang` is `zh…`) + word times (English only); writes `voice.json`. `init` and the first `still`, `sheet` or `qa` start it in the background; until it is ready they time each line from its words (about 2.8 a second; 3.8 characters in Chinese) and say so, so a picture never waits for it | minutes the first time |
| `sheet doc.tsx [--at 0.85]` | one frame per line as a contact sheet; prints the PNG path. Works from the skeleton, before anything is drawn | seconds |
| `still doc.tsx --line scene/line [--at 0.85]` or `--time 40` `[--out name.png]` | one frame at full size (1920x1080); `--at` is how far through the line (0 to 1), `--time` any second of the video (the end of the video gives its last frame, the picture a held last scene stays on). Prints the PNG path, the sentence spoken then with the phrases it is anchored on, and what the engine measured on the frame (where the ink is, how much room is left on each side, and any text crossed, overlapped, past an edge or under the captions). `sheet` shows each frame at a third of that, where small text and sparse scenes look fine | seconds |
| `qa doc.tsx` | overflow, clipping, text over text or cut by a shape, text under captions, a target no part registers, anchors on a weak alignment, on sampled frames; exit 1 on any issue | seconds |
| `render doc.tsx` | the video: `.visotalk/<id>/out/final.mp4` (roughly 4 to 8 s per second of video on four cores). It needs the real narration, and stops while an animation names a target no part registers | minutes |
| `play doc.tsx` | the interactive web player | |
| `build doc.tsx --artifact [--out DIR]` | the player for a Claude artifact: MP3 narration, no fonts, `player.html` (the page) and `artifact.json` (the files to publish with it). Publish it with the Artifact tool instead of rendering an MP4 when you only need to look at the result | seconds |

`build`, `play`, `qa`, `render` and `sheet` run `prepare` first whenever `KOKORO_DIR` (or `--tts-models`) is set; clips are cached, so it
is quick when no line changed. Without a model they reuse the existing `voice.json` and say so.

## Principles

What a good video does. How to write it is in `references/`; a rule here says what must be true, not which tag makes it so.

1. **A thing is on screen only from the word that names it.** Never show the whole picture at the start of a line and then highlight its parts: a highlight is not an appearance, and the viewer has already seen it. Build the picture up, one entrance per word.
2. **One visible change per sentence, on the word that names its subject**: the noun or the figure, not the start or the end of the sentence. A sentence that names two things is two changes on two words, not one object that shows both.
3. **Every object appears for a reason the narration gives**, and does not stay after the line that needed it.
4. **Give everything time to be seen and understood: at least two seconds** from when it appears to when it goes, and the last picture of a scene stays after the narration ends. A flash is allowed only when it is the point, and the design says so.
5. **Motion means something.** An arrival says "here is a new thing", a growth says "this quantity", a slide or morph says "this became that", a draw says "this leads there". A thing that grows, moves, replaces or becomes does that on screen: an entrance that pops is not that motion. A quantity that matters is shown changing (a figure that counts, a bar that grows to its length). Motion that means nothing is decoration: leave it out.
6. **One subject on stage at a time.** What a sentence replaces leaves, or moves into the new thing, before the new thing arrives; never show the before and after in one frame unless the sentence compares them. Things that merge go into each other without overprinting.
7. **Show the thing, not a label for it.** A sentence about a command points at the command and what it prints; about a file, at its contents; about a number, at the quantity it measures. For a feeling or a situation, draw a metaphor. Draw what carries the sentence; an aside stays in the narration. Where a familiar mark exists (a name, a product, a kind of thing), show it beside the name.
8. **Never what a slide deck would give.** A title, cards or chips on a grid with fade and slide entrances is page layout plus entrance animation. Each scene has a visual idea specific to its subject, real hierarchy, composition and negative space; a picture that fills a third of the frame with small text is not laid out yet.
9. **A pointer is easy to read.** An arrow, a bracket, a callout or a label that refers to the picture makes clear what it refers to: the line, the shape and the text are placed so that a viewer sees the connection at once. It need not touch what it explains; one that points at nothing in particular, or a label that seems to belong to nothing, confuses.
10. **A picture continues, it is not redrawn.** A picture that goes on over several sentences is one part with its numbers tweened, or the same elements moved or changed. A scene's parts end with it: a picture that goes on into the next scene is declared again there (a component, one line) and starts from its base props, or is a global part in `<Doc>`.
11. **The narration is in the lines**, not in the drawing: what is said is a `<Line>` (its caption comes from it), and a part draws the graphic and the short labels that belong to it (names, figures). A sentence drawn inside a part is invisible to the anchors and to translation.
12. **Text is short**: a label is a phrase, a figure a number and a name. Long sentences are the caption's job.
13. **Be honest.** Never invent a measured number or claim a result nobody measured. An example the viewer is told is an example (the plausible output of a command a line names) is not a measurement: draw it. Narration is fixed audio: never state a value that depends on a param.
14. **Material is licensed and local.** Every image, clip and sound is a declared asset with its licence and source, kept in the project's library; credits are generated. Rules: `references/assets.md`.
15. **Know what a scene shows before you draw it**, sentence by sentence: what is on stage, what arrives or leaves, which word fires it. Then check the picture against that.

## Workflow

There is no fixed procedure and nothing refuses a step: `validate` and `render` stop only for things that are wrong (a syntax error, an animation target no part registers, narration not ready). Planning, looking and judging are yours. A way that works:

1. **Gather** what the video states: facts, numbers, real command output.
2. **Script** the narration as short lines, one idea each. Write numbers as words in the line (`three hundred bytes`; put the digits in the caption with `text="… 300 bytes"`): a digit token gets no time of its own. Show the script to the person before building if they are there to answer. Then `visotalk init doc.tsx --lines lines.json`: you get a valid skeleton with the narration already being prepared, and `sheet` shows the first frames at once.
3. **Decide what each scene shows before you draw it**, in whatever form helps you (notes, a storyboard in the conversation). Questions worth asking, in this order:
   - *The thing itself.* What does each sentence point at in the world (principle 7)? The concrete things to put on screen (real names, lines, values), what each says that a word would not, which would be better as a real picture or logo you fetch (`references/assets.md`), or the metaphor for a feeling or a situation.
   - *Ideas.* At least two ways to show the scene that differ in kind, not the same boxes in two colours. A row of cards and a title is what anyone reaches for; set it beside something a slide deck cannot do (a metaphor drawn for this subject, a picture driven by the numbers, one object that becomes another, a change of scale) and pick on what a viewer who has never heard of the subject would understand.
   - *Board.* The chosen picture sentence by sentence: layout and sizes in px, clear of the captions (below y 900), what arrives, moves or leaves, on which word, and what continues from the previous scene.
4. **Draw one scene, look, then plan the next**: one `<Scene>` per idea, one `<Line>` per sentence, one `<Part>` per picture (its box is yours), the animation once the picture exists (`references/markup.md`, `parts.md`; `visotalk schema` lists the tags, motions and hooks). `validate` and fix every issue; each points at `doc.tsx:line:col`, most carry a `fix`, `--json` gives them as data. What you see in one scene (how big a label has to be, how much room a picture takes) decides how you design the next, so avoid drawing the whole video before looking at any of it.
5. **Look.** `sheet` shows every line at a third of the size and is the quick survey; `still` is the full-size frame at any moment, with what the engine measured on it, and the one that tells you whether a label can be read and whether a scene is crowded or bare. Which frames, how many and what to look for is your call: the moment a word fires, the end of a long scene, the busiest frame, a frame after a change. Read the PNG (Read tool) as a viewer who has not seen your plan: could a slide deck have made it, is the thing the sentence names on screen and big enough, is anything crossed, cut off or empty by accident? Redraw what fails. The narration is prepared in the background and lines are timed from their words until it is ready, so a word anchor can move when it lands.
6. `qa` for what you miss (an object on screen for under two seconds, overflow, text crossed or over text, a target nothing registers, a weak anchor); it cannot see whether a picture matches its sentence. `render` once you would publish it.

### Pace and scope

Time is finite and the document in `doc.tsx` when it ends is the whole deliverable, so a plan that polishes first and completes later can deliver nothing. Three habits that hold for any model:

- **Scope to the length asked.** Narration runs at about 2.8 words a second, so 45 seconds is about 120 words: four or five scenes of eight to ten seconds (principle 4 needs two seconds per object, and a scene needs room for its picture), not ten. More scenes only for a longer video.
- **Have a whole document early.** Once the first scene is drawn and looked at, draw the rest simply (one honest picture per scene, its animation anchored), run `validate` and `qa`, and fix what they say, within the first third of the time you have. Then spend what is left on the scenes that are weakest. A complete, plain document is a video; a half-polished one is not.
- **Look with a question.** A `still` answers one question (can this label be read at this size, is the scene crowded). Re-rendering the same moment after a one-pixel change is not looking: use `sheet` to survey, a few stills for the scenes you doubt, and `qa` (seconds) for what it measures.

## Techniques

How to make each of the above is in `references/`, one file per kind of question:

- `markup.md`: the syntax of `doc.tsx`, parts, targets, anchors, motions, `qa` and known gotchas.
- `parts.md`: drawing a part: CSS layout, data-driven pictures, motion by a number, SVG, theme tokens.
- `assets.md`: finding, keeping and declaring material from the internet.
