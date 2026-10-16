---
name: visotalk
description: Write, check and render a narrated explainer video as a VisoTalk document (TSX markup). Use when asked to make an explainer, a narrated diagram or code walkthrough, or a short video from a script; not for frame-level motion graphics, colour grading or avatars.
---

# Making an explainer with VisoTalk

You write one file, `doc.tsx`: a VisoTalk document, spec 0.4, written as TSX markup. It holds the narration lines, the objects they talk about, and
when each object appears, anchored to **words** by wrapping them. The file is *read*, never run: there are no variables, loops or imports of values, only tags
and literals. The engine owns time, layout and rendering; you never write frame numbers or coordinates. Then you validate it, look at stills, and render it.

This is a creative task, not a form to fill in. You are a video designer: design an explainer video of top professional standard. The viewer should understand the narration from what is on screen, and want to keep watching. The video is finished when someone who has not read the script would be glad to publish it, not when `qa` is clean: `qa` only proves nothing is broken. Every object and pattern here is a material you may bend: size, colour and weight are yours (`look`, `scale`), a picture you draw yourself (shapes, icons, a component) is the normal way to get a scene that explains, and the document keeps the words, the layout and the timing. Do not settle for the first arrangement that validates. And never deliver what a slide deck would give: a title, cards or chips arranged on a grid and made to fade or slide in is page layout plus entrance animation, and anyone can make it. Make work with a design of its own, the kind a top design studio would put its name to: a visual idea specific to this subject (a metaphor, a drawing driven by the data, one object that transforms instead of a new one appearing, a move of the frame), real typographic hierarchy, deliberate composition and negative space, and motion that carries meaning.

## Setup

- `visotalk <command> doc.tsx` is the CLI, an npm package: run it as `npx visotalk@latest <command> doc.tsx` (keep `@latest`: a copy installed earlier would run instead, and one older than 0.2 has no `doctor`), or install it once with `npm i -g visotalk@latest`
  (in the repository: `pnpm visotalk`). Node 20 or later and `ffmpeg` are needed. Work files go to `.visotalk/<meta.id>/`.
- Run `npx visotalk@latest doctor --fix` once on a machine before anything else. It reports what rendering needs and installs what is missing into
  `~/.visotalk` (the pinned Chrome, the Kokoro narration model, a Python environment with its packages, the word-timing weights; about 1 GB, a few
  minutes) so that every command finds them. It cannot install `ffmpeg` or Python 3.9+; it says so and you install those. It exits 0 when all is
  ready. Run `npx visotalk@latest doctor` to check without installing. `VISOTALK_CHROME`, `KOKORO_DIR`, `VISOTALK_PYTHON` and `TORCH_HOME` override what it
  installed; `VISOTALK_HOME` moves `~/.visotalk` (keep it short: narration fails under a path over about 90 characters).
- Reference, only when this file is not enough: the techniques in `references/` (`markup.md`, `objects.md`, `patterns.md`, `components.md`, `assets.md`), and the vocabulary
  itself: `visotalk schema` prints every object, motion, pattern and field the validator knows (in markup every field is an attribute, see "The document").
  Finished documents are in `examples/` of github.com/visotalk/visotalk. They show what the engine can do, not what to draw: do not reuse their look; your video has its own picture.

## Commands

| Command | Does | Cost |
|---|---|---|
| `validate doc.tsx` | syntax, references, anchors, styles; prints one issue per line at `doc.tsx:line:col` | free |
| `prepare doc.tsx` | narration audio per line + word times (English); writes `voice.json` | seconds |
| `sheet doc.tsx [--at 0.85]` | one frame per beat as a contact sheet; prints the PNG path | seconds |
| `still doc.tsx --beat scene/beat [--at 0.85]` or `--time 40` `[--out name.png]` | one frame at full size (1920x1080); prints the PNG path and three questions about it, which you answer with `review` after reading the image. `sheet` shows each frame at a third of that, where small text and sparse scenes look fine | seconds |
| `design doc.tsx scene [--step name --answer "…"]` | the design of one scene, one question at a time: with no `--answer` it asks the next of four (the thing itself, ideas, reflect, board), with `--step <name> --answer` it records your answer to that question (a step out of order is refused; an answered step is answered again) and the order and time are kept. Answers come one per command, at least five seconds apart: a batch is refused. It works before `doc.tsx` exists. `still` refuses a scene whose four are not answered | free |
| `review doc.tsx scene --seen "…" --designed yes\|no --distinct yes\|no --problems none\|"…"` | your answers about the still of that scene: `--seen` says where each phrase the sentence is anchored on appears on the image; `--designed` whether it is the picture and layout you designed; `--distinct` whether it is clearly more than a slide deck's layout and entrance animations would give; `--problems` what is small, empty, clipped, overlapping or missing. The scene counts only with `yes`, `yes` and `none` | free |
| `qa doc.tsx` | overflow, clipping, overlap, text under captions on sampled frames; exit 1 on any issue | seconds |
| `render doc.tsx` | the video: `.visotalk/<id>/out/final.mp4` (roughly 4 to 8 s per second of video on four cores). It refuses until every scene has a passing `review` since it last changed | minutes |
| `preview doc.tsx Pendulum [--at 0,0.5,1] [--props '{"angle":0.8}']` | one imported component alone, at those times (seconds since its scene started), in the box a `full` slot gives it; prints the PNG path | seconds |
| `play doc.tsx` | the interactive web player | |

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
10. **A picture continues, it is not redrawn.** Objects belong to the document: a picture that goes on over several sentences, or into the next scene, is the same objects moved or changed.
11. **Words belong to the document**, not to the drawing: titles, notes and captions are objects timed on words, so that they can be checked, edited and translated. A component draws its graphic and the labels that are part of it.
12. **Text is short**: a chip is a phrase, a card a number and a label. Long sentences are the caption's job.
13. **Be honest.** Never invent a measured number or claim a result nobody measured. An example the viewer is told is an example (the plausible output of a command a line names) is not a measurement: draw it. Narration is fixed audio: never state a value that depends on a param.
14. **Material is licensed and local.** Every image, clip and sound is a declared asset with its licence and source, kept in the project's library; credits are generated. Rules: `references/assets.md`.
15. **The design is decided before the drawing, and the document keeps to it.** A change to the picture is a change to the design answer first.

## Workflow

1. **Gather** what the video states: facts, numbers, real command output.
2. **Script** the narration as short lines, one idea each. Write numbers as words in the line (`three hundred bytes`; put the digits in the caption with `text="… 300 bytes"`): a digit token gets no time of its own. Show the script to the person before building if they are there to answer.
3. **Design before you write**, one scene at a time, with `visotalk design doc.tsx <scene-id>`. Follow these steps in this order, one command each, and never skip a step or run two at once:
   1. Decide the scene ids (one per idea) and write them down.
   2. For the first scene run `visotalk design doc.tsx <scene>`: it prints the next question.
   3. Read the question, think, and answer it alone with `visotalk design doc.tsx <scene> --step <name> --answer "…"`. One answer per command; a second command sent with it, or within five seconds of it, is refused.
   4. Run `visotalk design doc.tsx <scene>` again for the next question; repeat 3 and 4 until all four are answered, in the order the questions come (thing, ideas, reflect, board).
   5. Take the next scene through 2 to 4.
   6. When every scene has its four answers, fetch the material they named (`references/assets.md`) and only then write the document. If drawing shows that something is missing, go back and change the answer, then fetch.

   You may go round again, as often as the design needs: an answer already given is replaced with `--step <name> --answer` (go back to an earlier question when a later one shows it was wrong, then answer the later ones again). `still` prints the four answers back when you review the scene, and refuses a scene that lacks one. What the questions ask:
   - **The thing itself.** Before any idea: what does each sentence of this scene point at in the world (principle 7)? Write down the concrete things you will put on screen (real names, real lines, real values, each with its own colour, icon or shape so no two look alike), what each says that a word would not, and which of them would be better as a real picture, logo or clip you will fetch than drawn. For a feeling or a situation, say which metaphor. Name the aside you leave to the narration.
   - **Ideas.** Only pose options here, and do not choose: at least two ways to show what this scene says that are different in kind (not the same boxes in two colours), labelled (a), (b)…, each with its point of view, the one thing it makes the viewer see or feel, and what it would cost to build. A row of cards and a title is the default anyone reaches for; it is not an idea until you have set it beside another that you would be happy to ship. At least one idea must be something a slide deck cannot do (a metaphor drawn for this subject, a picture driven by the numbers, one object that becomes another, a change of scale or viewpoint); a slide-shaped idea can be the fallback, never the choice.
   - **Reflect.** The decision is made here, and only here: which idea (name it, (a), (b)…), and why. What would a viewer who has never heard of the subject understand from it that they would not from the others? Prefer the one that shows the mechanism, the proportion or the change over the one that lists the names. Say what you give up by not choosing the others.
   - **Board.** The chosen picture as a storyboard, one entry per sentence of the scene, in order: layout, motion and words together, so they cannot disagree. For each sentence say what is on stage and where (the hierarchy as sizes in px: a headline, the picture, a label; what is aligned to what; where the empty space is on purpose; the pattern slot or the coordinates; clear of the captions, below y 900), what arrives, moves or leaves and what each motion means, and on which word each of those fires and why that word. Say which sentences say replaces, grows, becomes or moves, and what does that on screen. Say which objects continue from the previous scene (the same ids, not drawn again). Only now is the design fixed: build it, and change it later only by changing the answer too.
4. **Structure**: one scene per idea, one beat per line or two. Pick a pattern per scene (`references/patterns.md`) to carry the picture you designed, not to decide it.
5. **Write `doc.tsx`** (syntax and techniques: `references/markup.md`, `objects.md`, `components.md`; `visotalk schema` lists the object types, motions and patterns, `schema object <type>` gives a type's fields and styles, so you never read the source), `validate`, fix every issue. A syntax error or an issue points at `doc.tsx:line:col`; most carry a `fix`; `--json` gives them as data (`{ok, issues, omitted}`, at most `--limit`).
6. `prepare`, then `sheet` and **look at the PNG** (Read tool). Fix what you see; `qa` finds what you miss (reveals off their word, an object on screen for under two seconds, overflow, overlap) and cannot see whether a picture matches its sentence.
   Then review as the designer and as the viewer. For each scene, `still` its key beat and read the full-size PNG (the sheet is too small to judge size). Ask three questions: could a slide deck, with its layout and entrance animations, have made this, or is it only labels about the thing the sentence points at (if so it is not finished: redesign it); is this the picture and the layout you designed in step 3, sentence by sentence (`still` prints the answers); and does it fully express what the narration says at this moment (every thing it names visible, big enough to read, nothing missing or wrong)? If an answer is no, or the scene is mostly empty space, small text, or a row of plain chips or cards, redraw it and look again. Repeat until all three are yes.
7. `render` once `qa` is clean **and** every scene has passed the questions above on a full-size still. `render` checks for you: it lists the scenes without a passing `review` since they last changed (a scene changes when it, an object it uses or a component's source changes) and stops; it also stops for a thing that is on screen more than 0.75 s away from the word that names it (`qa`'s `reveal.early` / `reveal.late`), so fix those first. The loop is: `still` the key beat, read the PNG, answer the questions with `review`; if you answer that something is wrong, change it and start again with a new `still`. A `still` you do not read, or an answer that does not describe the image, is a render you will have to redo.

## Techniques

How to make each of the above is in `references/`, one file per kind of question:

- `markup.md`: the syntax of `doc.tsx`, anchors, motions, `qa` and known gotchas.
- `objects.md`: text, chips, cards, counters, graphs, shapes, icons and drawings, the terminal.
- `patterns.md`: where objects go, what stays on screen, sizes.
- `components.md`: a picture that is code.
- `assets.md`: finding, keeping and declaring material from the internet.
