# The document: syntax, anchors and motions

How to write `doc.tsx`. What it must achieve is in `SKILL.md`; this file is how.

```tsx
import {Doc, Scene, Line, Part, Animation, Appear, Tween} from '@visotalk/jsx';
import {useProp, Obj} from '@visotalk/runtime';

const WAITS = [123, 33, 14];   // module code: data, helpers, components. The engine does not read it; your parts use it.

export default <Doc id="demo" title="A short explainer" lang="en" theme="visotalk/dark" canvas="16x9">
  <Scene id="waits">
    <Line id="l1">The second billion took one hundred and twenty three years.</Line>
    <Line id="l2" text="The third took only 33 years.">The third took only thirty three years.</Line>
    <Part id="chart" x={160} y={220} w={1600} h={500}>{() => (
      <div>{WAITS.map((years, i) => <Obj key={i} id={`bar${i}`} style={{height: 60, width: years * 10, background: 'var(--vt-data)', marginBottom: 16}} />)}</div>
    )}</Part>
    <Animation>
      <Appear on="bar0" line="l1" word="second billion"/>
      <Appear on="bar1" line="l2" word="third"/>
    </Animation>
  </Scene>
</Doc>;
```

A document is a TSX module with two readers. The **skeleton** (`Doc`, `Scene`, `Line`, `Part`, `Animation` and the motion tags) is read by the engine as text and never run, so it is data: tags, string, number, boolean, list and object literals, and no variables in them, no loops that make lines or scenes. The **inside of a `<Part>`** is ordinary React, compiled and run by the player: elements, or a function that returns them (a function child is a component, so hooks work in it), using anything in the module above `export default`: data, helpers, components, imports from your own files and from packages. `export default` and the final `;` are optional.

Attributes of the skeleton: `id="text"` is a string read as JSX reads it (no escapes: a quote or a backslash puts the value in braces, `text={"say \"hi\""}`); `{…}` is a number, `true`/`false`, a list or an object; a list always takes braces (`on={["a", "b"]}`). A name is not a value: a target is referred to by its id **as a string**. In text (a line's words) write `&lt;` `&gt;` `&amp;` for `<` `>` `&`, and `&#123;` `&#125;` for `{` `}`. Comments are `{/* … */}`. A part's closing `</Part>` is found as text: never write that text inside a part.

## Lines

- The words inside `<Line id>` are what is spoken. Write numbers as words (`three hundred bytes`): the aligner hears words, and a digit token gets no time of its own. When the caption must differ, give `text="… 300 bytes"`. `hold={seconds}` is extra silence after the line (default 0.4).
- A scene without lines needs `duration={seconds}`.
- The narration is the clock: lines run in order, each starting 0.4 s after the previous one ends; the scene starts 0.4 s before its first line and keeps 0.8 s after its last.

## Scenes and parts

- A `<Scene>` holds its lines, its parts and one `<Animation>`. Everything a scene shows, says and does is in it.
- A **part** is a box (`x`, `y`, `w`, `h`, default the whole 1920 × 1080 canvas; `z` stacks) holding React. **It is invisible until an `<Appear>` shows it** (a part nothing appears is an error, `part.appear`). It is mounted when its scene starts and released when the scene ends: the next scene starts from nothing, so a picture that goes on is declared again in that scene (the same id is fine) and starts from its base props. A `<Part>` directly in `<Doc>` is global: it stays across scenes with the props the document gave it (a title, an axis that never leaves), and any scene may appear or disappear it.
- Hooks and helpers come from `@visotalk/runtime`; `visotalk schema hooks` lists them. They only work inside a part's React.

## Targets

**Every id** (document, scene, line, part, target) starts with a lowercase letter, then a-z, 0-9, `_` and `-`: `bar-0`, `new-moon`, never `barZero` (`id.format`). The document's id names the work folder `.visotalk/<id>/`; `init` takes it from the title unless you give `--id`, and changing it later prepares the narration again.

What an action acts on is a **target**: a part (by its id) or an element a part registers. Register an element with `<Obj id="bar0" style={{…}}>` (a div; `as="g"` for an svg group) or by spreading `{...useTarget("bar0")}` on any element (merge your own style over the returned one, never replace it). `Obj` is imported from `@visotalk/runtime`. Ids are unique within a scene, and a part is a target by its own id, so do not reuse the part's id inside it. An action whose target nothing registers is reported by `qa` and stops `render` (`target.unregistered`).

**Words a person may edit** (in the Studio): draw them with `useText('title', 'The words as written')` (`import {useText} from '@visotalk/runtime'`; the id and the words are string literals). `<Doc texts={{title: '…'}}>` then holds what the person wrote in their place and the call keeps the words you wrote until it does. Use it for the few words worth editing, not for every label.

The engine drives a target's opacity (`appear`, `disappear`) and, with `<Tween>`/`<Set>` on `x`, `y` (px), `scale`, `rotate` (deg), its transform. Any other number you tween is yours to read: `const w = useProp("bar0", "w", 2)` (the value now; `2` before the first tween), then use `w` however the picture needs (`useProp("w", 2)` reads a prop of the part the hook runs in): one `angle` on one target can move everything a component draws from it.

## Animation: when things happen

`<Animation>` holds actions, in any order, each saying when it starts: exactly one of

- `line="l1" word="phrase"`: the start of that phrase in the line's speech; `edge="end"` for the end of it. The phrase is what the aligner hears: case aside, punctuation ignored, numbers spelled out. In languages written with spaces a phrase is whole words (`one` is not in `money`); in Chinese, Japanese and Thai it is any run of characters, so write enough of them to occur once. `validate` reports `anchor.word` if it is not there, and `anchor.ambiguous` if it occurs twice, listing every occurrence with its surroundings: write a longer phrase that occurs once, or `nth={2}` for the second occurrence (`validate --anchors` shows what each anchor finds).
- `line="l1" mark="name"`: a phrase named in the line itself, `<Line id="l1">The curve <Mark id="rise">keeps rising</Mark> and flattens.</Line>`. Use it only when a phrase cannot say it: the same words twice, or a place no short phrase names. A `<Mark>` wraps whole words and holds nothing else; the Mark's words are spoken like the rest.
- `line="l1"` alone: the start of the line (`edge="end"`: its end).
- `after="id"`: when the action with that `id` ends (`edge="start"`: begins together). The chain must start from a word, a scene time or a scene edge; `validate` reports `anchor.action`, `anchor.cycle`, `action.id`, `anchor.after-negative`. Use it so two actions stay in order when a `dur` changes; do not add durations by hand.
- `at={2.5}`: seconds from the start of the scene; `at="start"` or `at="end"`: the scene's edges.

`offset={seconds}` shifts any of them.

Motions: `<Appear>`, `<Disappear>` (`dur` default 0.45 and 0.3 s), `<Tween>` (numbers over `dur`, default 0.6 s, from the value they have), `<Set>` (at once; numbers, strings, `true`/`false`). `on` is one id or a list (`on={["a", "b"]}` with `stagger={0.1}` between them); `easing` is `linear`, `easeIn`, `easeOut` or `easeInOut` (cubic), those with `Sine`, `Quad`, `Quart`, `Quint` or `Back` after them (`easeOutQuart`, `easeInOutSine`, `easeOutBack(2.2)` overshoots by 2.2), or `cubic-bezier(0.25, 0.1, 0.25, 1)`; a `<Tween>` also takes `repeat={n}` (n more plays; -1 for the whole film) and `yoyo` (every other play backwards: a breathing bar, a button that is pressed and comes back), and moves colours (`fill="#426894"`, `hsl(212 46% 68%)`) and lengths (`w="40%"`, `h="12px"`, one unit from start to end) as well as numbers; the other attributes of `<Tween>` and `<Set>` are the props they change (a prop cannot be named like an action's own attribute: `on`, `id`, `dur`, `stagger`, `easing`, `repeat`, `yoyo`, `at`, `after`, `line`, `word`, `nth`, `mark`, `edge`, `offset`).

- A part is invisible until its first `appear`; so is any other target whose first action is an `appear`. Inside a part of `<Doc>` (global) every registered target is invisible until an `<Appear>` shows it, like the part (a target nothing appears is `target.never-appears`); inside a scene's part a target no action names is visible with its part (give it an `<Appear>` to reveal it later). `<Appear>` of what is already visible changes nothing; an action must start while its scene is running (`qa` reports `action.outside-scene`). A scene's actions reach only its own parts' targets; a global part's targets are reached by every scene's actions.
- `<Appear>` shows a thing whole; a thing that grows, slides or becomes another needs `<Tween>` on a number you read (`w`, `x`, `scale`, a `progress`). Build a picture up one entrance per word; never show it whole and then highlight.
- **Music and sounds**: `<Sound asset="bed" at="start" loop volume={-8} duck={4} fadeIn={1.2} fadeOut={4}/>` in a `<Scene>` (beside `<Animation>`, not inside it) plays an `<Asset id="bed" kind="audio" src="music.mp3" license={{…}}/>`. It starts where an action may (a word, `at`, `"start"`/`"end"`; not `after`). `volume` and `duck` are dB: the narration is never touched, so `volume` is how far under its file the sound sits and `duck` how much further it steps back while someone speaks (it comes back in the pauses). `loop` without `dur` runs to the end of the film, so one sound is a bed across scenes; `fadeOut` needs `dur` or `loop`. A short effect is `<Sound asset="tick" line="l2" word="five" volume={-3}/>`. `visotalk build --artifact` bundles the files as 96 kbit/s MP3; `render` mixes them with the narration. The `license` is real: the credits list it, and a track someone else made is `source` + `obligations`.
- A figure appears on the word that says it, not on the word before it; when a line names two things, each gets its own action on its own words.

## `qa`, in short

`qa` renders sampled frames and checks the layout and the animation against the page: ink past the canvas or under the captions, clipped text, two pieces of text drawn over each other (`text-overlap`, wherever they are), text cut through by a shape (`text-crossed`: the edge of a card or a bar, a line across it), an object on screen for under two seconds (`visible.brief`), a target no part registers (`target.unregistered`) or registers twice (`target.duplicate`), anchors resting on an estimated or weak alignment (`align.*`). It cannot see whether a picture matches its sentence or looks good: reading `sheet` and `still` is your job.

`validate` also refuses what makes a frame depend on anything but the engine's clock, in your module and in the project files it imports: `Math.random`, `Date`, timers, `fetch`, and CSS animations or transitions (`code.nondeterministic`, with the replacement: `useTime()`, `random(key)`, a `<Tween>`).

## Known gotchas

- Word timing needs English and `torchaudio`; otherwise `prepare` warns and word anchors fall back to the phrase's character position, which can be half a second off (`qa` reports `align.estimated`; an anchor on a word the aligner was unsure of, usually a letter spoken by its name, `align.weak`).
- `render` is minutes long (and may outlast a tool's timeout: run it in the background); `validate`, `sheet` and `qa` are not. Spend renders only on a clean sheet.
- `sheet` and `qa` write `sheet.png` to the same path every time, and a viewer can show the previous image from its cache. Pass `--out sheet-2.png` (a new name each time) when you look at a sheet again after a fix.
- `still --at` on a line can land in trailing silence, where no sentence is spoken: pass `--time` for an exact second.
- Large lowercase letters in the sans font can read as capitals (a short lowercase name): use the mono font for such a name.
- Words you draw inside a part are not narration: they are not anchors, not captions and not translated. Keep them short (a label, a figure).
