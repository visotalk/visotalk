# Patterns: where objects go

A scene's `pattern="name"` with `slots={{slot: "id"}}` maps **slots** to object ids. A beat may replace it (`pattern="name"` with its own `slots`) or patch it: `slots` alone, **with no `pattern` attribute**, merges over the current one (`null` removes a slot): `<Beat id="b2" slots={{note: "n2"}}>`. `pattern` is only ever the name of a pattern, a string; writing it as an object is an error. An array of ids splits the slot's region into a row (a grid for `grid`; `options={{columns: 3, stack: ["slot"], gap: 40}}`). A `pattern` that is not a pattern name, or a slot the pattern does not have, is a `validate` error (`pattern.kind`, `pattern.slot`).

## What is on screen

An object is on screen only while a pattern places it: not before the beat that first places it, and not after a patch replaces it (a `slots` swap or `null`), unless the scene has a `<Disappear>` on it, which then decides.

**Objects carry over between scenes.** An object belongs to the document, not to a scene: nothing is cleared when a scene ends except what the next scene does not place. An object placed by both scenes stays on screen where it was, with the props a tween left it (a shape tweened to `x={700}` starts the next scene at 700), and it needs no entrance in the new scene; give it one and it is hidden until then, so leave it out when the picture continues. So a picture that goes on is the same objects moved or changed, never declared again under a new id and redrawn; a picture that continues over several sentences is one scene with several beats, each beat free to patch the slots.

## The patterns

| Pattern | Slots | Use for |
|---|---|---|
| `title` | kicker, title, subtitle, aside | opening and closing cards |
| `board` | kicker, title, band, main, wide, side, note | general: chips under a title, main area, side column, note line |
| `dag` | kicker, title, graph, note, aside | a mechanism as nodes and arrows |
| `compare` | kicker, title, left, right | two things side by side (stacked on a portrait canvas) |
| `steps` | kicker, title, main, note | a list of steps, highlighted in turn |
| `timeline` | kicker, title, track, main, left, right, note | dated events, with a photo and text below |
| `grid` | kicker, title, items, note | many cards or chips |
| `codeOutput` | kicker, title, code, output | code next to what it printed (`options.split`) |
| `photoStory` | media, side, sideLabel, kicker, title, lowerThird, statement, upper, center, lower, foot, badge | text over full-bleed media |
| `split` | kicker, title, left, right, below | two columns (`options.ratio`, `options.below`) |
| `full` | kicker, title, main | one object across the whole canvas |
| `stage` | kicker, title, main, note | one big picture under a compact title: `main` is 1680 x 690 px (600 with a `note`), twice the area of `board`'s |

## Sizes

- The `board` main slot is small: about 1680 x 550 px (460 with its `band`), under the title and above the notes. For a picture that should be big, use `stage` (a component drawing one picture, a chart or free shapes; the title, notes and labels stay objects of the document, so they are timed on words, checked by `qa` and editable) or `full`: its `main` is the whole 1920 x 1080 canvas, and the title (y 110 to 220) and the captions (below y 900) are drawn over it, so draw between y 70 and 890 with no title slot, or between y 230 and 890 with one.
- Regions stay above the caption band (below y 900).
- The `dag` slots `note` and `aside` are one short band (about 110 px tall): put one chip or one line there, and a row of chips in `board`'s `band` or as nodes of the graph.
- In `timeline`, `track` sits under the title and `main` is for a timeline placed alone, so use one of the two. A `note` slot in `grid` or `steps` takes its own band at the bottom.

## Choosing

By content: a mechanism or flow → `dag`; numbers or a benchmark → `chart` or `counter` cards in `compare`/`grid`; a command or program → `codeOutput` with a real `terminal` (for any shell scene, instead of drawing one: `references/objects.md`, "A terminal"); a story with photos → `photoStory`. The pattern carries the picture you designed; it does not decide it.
