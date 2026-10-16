# Objects: what each one is for and how to use it

How to use the objects. What a scene must show is in `SKILL.md`.

**Objects that render**: `text`, `chip`, `card`, `counter`, `math` (TeX), `code`, `terminal`, `graph` (node `kind`: `value`, `op`, `neuron`, `box`), `chart` (`bar`, `line`, `scatter`, `heatmap`), `steps`, `timeline`, `image`, `video`, `credits`, `shape`. `connector` is in the spec but draws a placeholder: use a `graph` or `<Shape>` for boxes and arrows.

## Text, chips, cards, counters

- Keep text short: a chip is a phrase, a card a number and a label. Long sentences are the caption's job.
- **Size chips by their text.** A chip is one line that never wraps: about 0.55 × its font size per character, plus its padding (a `default` chip is 32 px, so about 18 px a character and 52 px of padding). Several chips in one array slot split the slot into equal cells, and a chip wider than its cell runs over its neighbour. Keep a chip to two or three words, and give a row of chips `options={{flow: ["slot"]}}` so each keeps its natural width (`gap` spaces them); the row must still fit the slot (about 1680 px wide on a 1080p board), or `qa` reports `offscreen`: shorten the text or split the chips over two slots. `qa` also reports `overlap` for chips that run into each other.
- A card's style `stats` and `stats-accent` show its title and its fields only (no kicker or body). A counter's `unit` is written after the number, with a space before a word and none before a symbol (`%`).

## Graphs

- A `layered` layout puts a node in the column of its longest incoming path and stacks nodes of one layer in list order; `layout="manual"` takes `positions={{node: [x, y]}}` with x and y from 0 to 1 across the pattern's region. One row of nodes leaves the rest of the region empty: use two rows, `direction="tb"`, or put the rest of the story in cards.
- Node labels are 32 px and edge labels 22 px, small on a 1080p frame: keep them to a word or two, and put the sentence in a `<Card>` or `<Text>`. `nodeScale={1.6}` makes nodes, their header and their text 1.6 times larger together (`nodeWidth` sets the width alone and wins). In `layout="manual"` the `positions` are fractions of the box, so larger nodes sit closer: re-space them, or `qa` will not tell you and the sheet will.
- **Build a graph up, never draw it whole.** A node enters with `<Appear on="g#node">`, an edge with `<DrawIn on="g#edge">`, each around the word that names it; a part that is on screen from the start and only highlighted later was shown before it was named (parts with no entrance of their own enter with the graph).
- **Name every graph part the narration points at.** A node or edge whose `label` is not a word of the narration cannot be checked, so give it `says="…"`: the words that name it, exactly as the line spells them (`<Edge … says="link"/>`). `qa` then reports `reveal.early` / `reveal.late` when it enters off that word.
- The edges on a moved node keep their other end where it was: an edge from a label to node `a` stretches from the label's new place back to `a`, it does not turn to point at `b`. To re-point it, `<Disappear>` that edge and `<DrawIn>` a second one with `after="<id of the morph>"`, so it starts once the label has arrived. To change a field's text on a word, use `<Set on="g#node.field" value="…">` around the word.

## Shapes

`<Shape>` is a free-drawing brick: a rect, circle, line (with `arrow`) or path (`path="M … C …"`, canvas px) at its own place on the 1920 x 1080 canvas, whatever slot it sits in (the slot only decides when it is there: put every shape of a picture in one array slot, `main: ["a", "b", "c"]`).

- Its numbers (`x`, `y`, `w`, `h`, `x1`…`y2`, `draw` 0 to 1) can be tweened (`<Tween on="bar" h={300}>` grows a bar, `<Tween on="link" draw={1}>` draws a line). A tween starts from the value the shape was declared with.
- It has `look={{fill, stroke, strokeWidth, radius, size, color}}` and a centred `text`; each shape is its own object, so a word anchors it and `qa` checks it, its `text` included (`reveal.early` / `reveal.late`).
- A shape with a `text` has a panel fill and border by default: for plain words set `fill` and `stroke` to `"transparent"`.
- **Place shapes from the data they show.** When shapes draw numbers (bars, a ruler, a curve), write down the few numbers every position comes from (origin, scale per unit, row pitch) and compute the coordinates from them, the pointers and labels too: then an arrow can be aimed at a place in the picture (the end of a bar, a gap between two) and a label put beside it, so that the connection reads at once. Coordinates guessed one by one are how a pointer ends up aimed at empty space.
- Use shapes to build a picture without writing component code; [`examples/shape-sketch`](https://github.com/visotalk/visotalk/tree/main/examples/shape-sketch) is one.

## Icons and drawings

- `<Shape shape="icon" icon="name" x={200} y={300} w={120} look={{stroke: "good", strokeWidth: 2}}/>` draws one of the built-in icons (`visotalk schema icons` lists them; `w` alone makes it square, `look.fill` fills it, `draw` reveals it, and it moves and scales like any shape).
- `<Shape shape="svg" x={…} y={…} w={120} svg={'<svg viewBox="0 0 32 32"><path d="…" fill="#336699"/></svg>'}/>` draws markup of your own, keeping its colours (only path, circle, ellipse, rect, line, polyline, polygon and g are read).
- **One icon becoming another**: `<Set on="mark" icon="turtle"/>` swaps it at once. For a crossfade put the two icons at the same `x`, `y`, `w` and give the first a `<Disappear>` and the second a `<Crossfade>` on the same words and the same `dur`: halfway both are half there. `<Morph>` does not interpolate shapes (it moves an object between a pattern's boxes, a graph node by `to`): to move a shape, `<Tween>` its `x` and `y`.
- Licence and source of anything you did not draw yourself: `references/assets.md`.

## A terminal

A `<Terminal>` holds `<Step>`s, each a command and its output lines, and nothing is on screen until the document reveals a step: a `<Typewriter on="term#stepid">` types that command and, a moment later, prints its output (an `<Appear>` shows it whole). Anchor each `Typewriter` on the words that name the command, so the command is typed while it is spoken. The newest lines stay in view, so a long session scrolls by itself.

```tsx
<Terminal id="term" title="~/work">
  <Step id="first" cmd="tool init sample" out={["Created `sample`"]}/>
  <Step id="second" cmd="tool run sample" out={["Started", "Done in 120ms"]}/>
</Terminal>
<Scene id="demo" pattern="stage" slots={{title: "head", main: "term"}}>
  <Beat id="b1">
    <Line id="l1">First <Typewriter on="term#first">tool init</Typewriter> sets it up, then <Typewriter on="term#second">tool run</Typewriter> runs it.</Line>
  </Beat>
</Scene>
```

(Or outside a line: `<Typewriter on="term#second" line="l1" word="tool run"/>`.) The terminal fills its slot: alone in `stage`'s `main` it is large; to put free shapes (files appearing, an arrow) beside it, use `split` with the terminal in `left` and the shapes in `right`. The output is the output the narration names: a real capture, or a plausible example the viewer is told is one; never an invented measurement. A terminal drawn by hand from shapes is slower to make, smaller and less clear than this one.
