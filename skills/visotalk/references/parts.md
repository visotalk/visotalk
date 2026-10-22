# Drawing a part: layout, data, motion

A part is React in a box. The document places it and times it; the part decides what is drawn. This file is how to draw well and keep the picture a function of the clock.

## Layout is CSS, and the box is yours

A part's box is `x`, `y`, `w`, `h` on the 1920 × 1080 canvas (the captions use the band below y 880: keep everything above it). A 9:16 film is 1080 × 1920 with its own zones (a part's box is usually `x={0} y={160} w={1080} h={820}`, the upper half): `explainers.md`, "A phone screen". Inside it, lay out with flex and grid and let the browser place things, instead of typing coordinates:

```tsx
<Part id="rows" x={140} y={160} w={1640} h={680}>{() => (
  <div style={{display: 'grid', gridTemplateColumns: '180px 1fr 240px', alignItems: 'center', rowGap: 28, fontFamily: 'var(--vt-sans)', fontSize: 44, color: 'var(--vt-text)'}}>
    {ROWS.map((r) => (<React.Fragment key={r.id}>…</React.Fragment>))}
  </div>
)}</Part>
```

Use the whole box. A picture that fills a third of the frame with small text is not laid out yet: size the hero (a chart, a drawing) to 70% or more of the width and let labels hang off it. Text is 28 px or more; headlines 72 px or more.

## Data drives the picture

A table in the module and a scale function replace the hundred hand-placed shapes: bars, rows, ticks, dots and axes are `.map` over data, with positions from `scale(value)`. Targets inside a loop get ids from the data (`bar-${row.id}`), so each can have its own entrance on its own word:

```tsx
const X = (year: number) => 200 + ((year - 1700) / 400) * 1500;
…{MILESTONES.map((m) => <Obj key={m.n} id={`dot-${m.n}`} style={{position: 'absolute', left: X(m.year), top: 300, width: 24, height: 24, borderRadius: 12, background: 'var(--vt-grad)'}} />)}
```

`<Animation>` stays literal, one action per word: write the few that matter by hand; a long run of similar actions (one per bar) is fine to write out, because it is the timing, and timing is the document's job.

## Motion by a number

`<Tween>` moves a number; the part draws from it. Prefer this to many entrances when one thing changes continuously:

```tsx
const progress = useProp('moon', 'progress', 0);   // 0 to 1, tweened by the document on the words
```

`x`, `y`, `scale`, `rotate` on a target move the element itself without any code. For anything else read the prop and compute: a bar's width, an angle, how many characters of a command are typed, which of three states is lit. One `angle` can drive every tick of a dial and the hand. Use absolute values (`angle={90}` is a quarter turn) rather than accumulated ones, so the number means something to a reader.

For motion of its own that needs no word (a slow drift, a pulse), draw by `useTime()` (seconds since the scene on screen started: in a global part of `<Doc>`, which stays on across scenes, it starts again at 0 in every scene, so a motion that must run on without a jump, such as a flow or a clock, draws by `useDocTime()` from `@visotalk/runtime`, the time since the film began). Never use a timer, `Date`, `Math.random` (use `random("key")`), a CSS transition or animation, or `fetch`: `validate` refuses them, because a frame must be the same every time it is drawn.

## Pictures

- **SVG** for anything drawn: lines, arrows, curves, circles, rings, icons (a few `<path>`s each), the Moon's lit shape. Inline `<svg viewBox>` scales cleanly, QA can see inside it, and `<Obj as="g">` makes a group a target. A stroke that reveals itself is `strokeDasharray` with `strokeDashoffset` from a tweened `draw` prop (0 to 1 of the path length).
- **HTML** for text, rows, windows, tables, code and terminals: a terminal is a dark box with lines; type a command with a tweened `chars` prop (`text.slice(0, Math.round(chars))`).
- **Canvas** only when nothing else will do (thousands of particles): QA cannot see inside it.
- **Colours and fonts** are theme tokens as CSS variables: `var(--vt-bg|panel|panel2|border|text|muted|faint|data|grad|op|good|bad|warn)`, `var(--vt-sans)`, `var(--vt-mono)`; or `useTheme()` for the values. Give each thing its own colour so no two look alike; never rely on one accent.
- **Real material**: an `<Asset>` (see `assets.md`) is read with `useAsset(id)` and used as `<img src>`.
- **Several scenes, one picture**: a scene's parts end with it. Write the picture as a component in the module code and declare `<Part id="orrery"><Orrery/></Part>` in each scene that shows it; it starts from its base props, so set what should carry over with `<Set>` at the start of the scene. Only a part in `<Doc>` stays: use it for what never leaves (a title, an axis).
- **One id per part**: read the part's own props with `useProp("name", base)` (`<Set on="note" text="…"/>` for `<Part id="note">`), so the id is written once; `useProp("id", "name", base)` reads a target inside it.

## Keep it checkable

- Register every element an animation names (`<Obj id>` or `{...useTarget("id")}`); `qa` reports one nothing registers, and one registered twice. A part whose targets all have an `<Appear>` still needs one of its own.
- `validate` reads a part's code as text; a JSX typo in it shows only when `qa` or `still` compiles it. A scale of exactly 0 is fine (`qa` skips a shape with no area), but keep a flip or a growth off 0 if the shape must be seen.
- `qa` ignores `clipPath` and measures the geometry, so a circle clipped to a strip is reported past it: draw the arc inside the strip instead. For a painted ground that reaches under the captions, use a `div` that fades out by y 900, and art in SVG above it.
- A translucent ring or band laid over text is reported as crossing it: show the state by styling the element itself (a `boxShadow` from a tweened number). A box with a border and `width: 100%` needs `boxSizing: 'border-box'`, or `qa` reports 8 px past its box.
- A long `<Tween>` anchored on the last phrase of a line can lose to the next line's changes: anchor it early and let it run for the whole line.
- Keep text clear: `qa` reports two texts drawn over each other and text that a shape cuts through (an edge of a card or a bar over part of it, a line across it). A label fully on a card is fine; shapes layering over shapes is not checked, so look at the still.
- Draw so the same frame is the same twice: whole-pixel positions for crisp edges; arrows as one filled shape; font weights 400 and 700.
- Look at full-size stills (`still`), not only the sheet: small text, empty areas and collisions only show there.
