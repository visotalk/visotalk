# The document: syntax, anchors and motions

How to write `doc.tsx`. What it must achieve is in `SKILL.md`; this file is how.

```tsx
import {Doc, Text, Chip, Scene, Beat, Line, Appear, Stamp} from '@visotalk/jsx';

export default <Doc id="demo" title="A short explainer" lang="en" theme="visotalk/dark" canvas="16x9">
  <Text id="title" text="The first idea" style="title"/>
  <Chip id="tag" text="a label" style="mono"/>

  <Scene id="intro" pattern="title" slots={{title: "title", aside: "tag"}}>
    <Beat id="b1">
      <Appear on="title" line="l1" offset={0.1}/>
      <Line id="l1">The first thing we name is a <Stamp on="tag">label</Stamp>.</Line>
    </Beat>
  </Scene>
</Doc>;
```

This is a static subset of TSX. The first line imports the tags you use from `@visotalk/jsx` (an editor or `tsc` with `jsxImportSource: "@visotalk/jsx"` then checks attribute names; the engine reads the line and ignores it, and nothing else may be imported). `export default` and the final `;` are optional. Attributes: `text="…"` is a string and is read as JSX reads it (no escapes: a quote, a backslash or a newline puts the value in braces, `text={"say \"hi\""}`); `{…}` is a number, `true`/`false`, a list `[a, b]` or an object `{key: value}`; a list always takes braces (`on={["a", "b"]}`). There are no names: an object is referred to by its id **as a string**, `on="tag"`. A bare attribute is `true` (`during`). In text, write `&lt;` `&gt;` `&amp;` for `<` `>` `&`, and `&#123;` `&#125;` for `{` `}`. Comments are `{/* … */}`.

## Objects, ids, parts

- **Ids** match `^[a-z][a-z0-9_-]*$`. An object is one element (`<Text>`, `<Chip>`, `<Card>`, `<Counter>`, `<Math>`, `<Code>`, `<Terminal>`, `<Graph>`, `<Chart>`, `<Steps>`, `<Timeline>`, `<Image>`, `<Video>`, `<Credits>`, `<Shape>`) with an `id`; the other attributes are its fields (`visotalk schema object <type>` lists them). Declare it anywhere in the `<Doc>` or a `<Scene>`; it is shared by the whole document and referenced by id everywhere. List fields that hold objects are child tags: `<Node>` and `<Edge>` in a `<Graph>`, `<Field>` in a `<Card>` or `<Node>`, `<Item>` in `<Steps>` and `<Timeline>`, `<Step>` in `<Terminal>`, `<Run>` in `<Text>`; other lists (a chart's `data`, a code block's `lines`) are `{[...]}` attributes.
- **Sub-parts** are addressed `"object#part.field"`: a graph node `on="g#x"`, its field `on="g#x.value"`, a steps item `on="s#item"`.
- **Styles** are per object type and per theme, listed in `packages/ir/src/themes.ts`; an unknown style is a `style.unknown` issue.
- **Look and scale are free.** `style` is a shorthand; over it any object takes `look={{size: 56, color: "data", weight: 700, font: "mono", align: "center", padding: 16, background: "panel", border: "grad", radius: 24}}` (`size`, `color`, `weight`, `font`, `align` and `padding` set the text of a `<Text>` or a `<Chip>`; `background`, `border` and `radius` give any object a panel; colours are theme names (`data`, `grad`, `muted`, `good`, `bad`...) or any CSS colour), and `scale={1.5}` on any object draws it that much larger inside its slot, text and parts together. The default sizes are a starting point.

## Lines, beats, state

- **Lines**: the text inside `<Line id>` is what is spoken (`say`) and shown. When the caption must differ from the speech, write the caption as `text="…"`. A `<Beat>` with no `<Line>` needs `duration={seconds}`; `hold={seconds}` adds time after the last line. `live="…"` is a player-only caption for values that change with params.
- **State** (`<State target="id" visible={false} emphasis="dim" props={{…}}/>`, in the beat) sets `visible`, `emphasis` or `props` at a beat's start. A motion tag is an action. An object whose first action in the scene is an entrance is hidden until then: no `<State visible={false}>` needed.

## Anchors

- An action is a motion tag (`<Stamp on="tag">…</Stamp>`; `on` names the target, or `on={["a", "b"]}` for several). **Inside a `<Line>`, it wraps the words that trigger it**, and the action starts on the first of them: `<Stamp on="tag">label</Stamp>`. Add `edge="end"` to anchor on the end of the words, or `offset={0.1}` seconds. Outside a line, `at="start"` or `at="end"` is the beat's start or end (a position is needed: `<Appear on="x" at="start"/>`), `line="l1"` is that line's start, and `line="l1" word="phrase"` anchors on the first occurrence of a phrase in that line's speech without wrapping it (`offset` and `edge` work on all of them).
- An element inside a `<Line>` wraps the words it fires on; one at the very end of a line with no words after it is an error. The explicit form `line="l1" word="phrase"` must match the line's speech exactly, case aside, punctuation included, or `validate` reports `anchor.word`.
- **After another action**: give the first action an `id` and the second `after="id"` (`edge="start"` to begin together, `offset={…}` to shift). It starts when the first one ends, so two actions that must stay in order do when a `dur` changes; do not add the duration to a word by hand. The chain must start from a word or a beat; an `id` is unique in the document and is written on an action outside a `<Line>`; `validate` reports `anchor.action`, `anchor.cycle`, `anchor.after-open` (a `kenBurns` without `dur`) and `action.id`.
- **Wrapping several words is a range**; the `during` attribute on an entrance motion keeps its target on screen for exactly those words and removes it when they end: `<Appear on="card" during>these words</Appear>`. Use it when a phrase repeats in the line, a reveal should happen on one of several items, or something belongs on screen only while it is being said. A wrapped span goes around whole words; punctuation next to a word moves with it.
- **Build a picture up, one entrance per word**: graph nodes, edges and labels are separate `<Appear>` / `<DrawIn>` targets, timeline items are `"timeline#item"`, a figure is one card or chip each. A group or list shown whole on the line's first word is one reveal: give each item its own entrance on its own word, or use a `<Steps>` list (dimmed until highlighted) and `<Highlight>` each item on its word.
- A figure appears on the word that says it, not on the word before it. When two things are named in one line, wrap each one's words (`The <Appear on="first">second</Appear> step took <Appear on="card">a long time</Appear>`). `qa` checks figures (`reveal.number-early`).

## Motions

`<Appear>`, `<Disappear>`, `<Stamp>`, `<Wipe>`, `<Crossfade>`, `<Typewriter>`, `<DrawIn>` (graphs, timelines), `<CountUp>` (counters), `<Flow>` (graph edges), `<Highlight>`, `<Set>`, `<Tween>` (numeric props over `dur`), `<Morph>`, `<KenBurns>` (images). `dur={s}`, `stagger={s}`, `easing`, and `params={{…}}` are optional.

- `<Set on="id" text="…"/>` changes any property of an object from that moment (a text, a chip, a card, a counter, a field); its other attributes are the props (a prop named like one of the action's own attributes goes in `params={{props: {…}}}`).
- `<Tween on="id" w={300}>` moves a number from the value it has: a shape declared `w={2}` and tweened to `w={1300}` grows. A prop with no number before it jumps to its end value.
- `<Appear>` shows its target whole at once; a thing that grows, slides or becomes another needs `<Tween>` on `x`, `y`, `w`, `h` or `scale`, `<Morph>` or `<DrawIn>`.
- **A figure that climbs**: put it in a `<Counter>` and run `<CountUp>` on the words that give it (a range is two counters, or one that climbs to the upper figure with the lower beside it); a figure set as text or as a shape's `text` just appears. `<CountUp>` does not hide its target: a counter is on screen with its final number from the scene's start, then jumps to zero and counts; give it an `<Appear>` on the same word first, or hide it with `<State target="id" visible={false}/>` until then.
- **Several things that merge into one** slide each toward the target along its own row and end side by side or against its edge, then give way to it; sent onto one point their text overprints into noise. What is replaced must have gone, or be going, when the replacement arrives: a `disappear` chained `after` a long slide arrives late.
- To move a graph node, and the edges on it, use `<Morph on="g#node" params={{to: [x, y]}}>` (the new position across the graph's region, 0 to 1, the same as `positions`).

## `qa`, in short

`qa` checks layout and when things appear against what the narration says (each is more than 0.3 s off, and carries a `fix`): `reveal.early` / `reveal.late` for text a line says, including a chip's, a graph part's `says` and a shape's `text` (a heading style such as `title` or `kicker` is not checked); `reveal.number-early` for a figure of two or more digits on screen before the line speaks it; `visible.brief` for an object on screen for under two seconds (give the scene's last beat a `hold`, move a `disappear` later, or merge the picture into the next one). It cannot see a picture drawn whole and then only highlighted, or whether a picture matches its sentence: reading the sheet at the right word is still your job. `sheet --at 0.2` (a fraction of each beat) prints the time and the spoken word of every cell, which is how to check the events inside a beat.

## Known gotchas

- Word timing needs English and `torchaudio`; otherwise `prepare` warns and word anchors fall back to the phrase's character position, which can be half a second off (`qa` reports it as `align.estimated`, and an anchor on a word the aligner was unsure of, usually a letter spoken by its name, as `align.weak`).
- `render` is minutes long (and may outlast a tool's timeout: run it in the background); `validate`, `sheet` and `qa` are not. Spend renders only on a clean sheet.
- `sheet` and `qa` write `sheet.png` to the same path every time, and a viewer can show the previous image from its cache. Pass `--out sheet-2.png` (a new name each time) when you look at a sheet again after a fix.
- `still --at` on a beat can land in trailing silence, where no sentence is spoken: pass `--time` for an exact second.
- Narration is fixed audio: never state a value that depends on a param. Use `live` for the caption.
- Large lowercase letters in the sans font can read as capitals (a short lowercase name): set `look.font` to `"mono"` for such a name.
