# Components: a picture that is code

When the built-in objects will not draw what a line needs, write a component: a TypeScript file in `components/` that draws one picture in a box. The document places it and times it; the component never decides when anything happens. Use a built-in object when it already looks good (a `<Graph>`, a `<Chart>`, a plain title); when it looks plain or leaves the scene empty, draw it.

Draw the **picture** in a component and keep the words and the layout in the document: titles, notes and captions are `<Text>` and `<Chip>` objects in the pattern's slots (so a word anchors them, `qa` checks them and the document can be edited and translated), and the component draws only its graphic and the labels that belong to it (node names, values, a marker). `qa` reports (`component.text`) three or more plain words drawn inside a component module; if they are part of the graphic itself (a marker named "you are here" on a map), end that line with `// label`. One component draws one picture; do not put a whole video's timeline inside one. For a big picture use the `stage` pattern's `main`.

A component may draw on a canvas (free-form graphics: curves, orbits, a graph with moving labels) or be HTML and CSS (text, rows, columns, tables, windows: let the browser lay it out with grid, flex and wrapping instead of placing every coordinate by hand). `mount(host)` gets a `div` either way; the frame is a function of the props only, so no CSS transitions or animations. Pick the one that makes the layout easy.

```ts
// components/pendulum.ts
import {defineComponent, type TimedContext} from '@visotalk/runtime';

interface Props { angle: number }   // radians from the vertical

export const Pendulum = defineComponent<Props>({
  contract: 'visotalk/timed@1',
  mount(host) {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'width:100%;height:100%;display:block';
    host.appendChild(canvas);
    const g = canvas.getContext('2d')!;
    return {
      render(ctx: TimedContext<Props>) {
        canvas.width = ctx.width * ctx.pixelRatio; canvas.height = ctx.height * ctx.pixelRatio;
        g.setTransform(ctx.pixelRatio, 0, 0, ctx.pixelRatio, 0, 0);
        // draw ctx.props.angle in the ctx.width × ctx.height box, with ctx.theme.colors
      },
    };
  },
});
```

```tsx
import {Pendulum} from './components/pendulum.ts';
…
<Pendulum id="swing" angle={0}/>                  {/* the tag: its attributes are the props */}
<Scene id="s" pattern="board" slots={{main: "swing"}}>
  <Beat id="b1"><Line id="l1">The weight <Tween on="swing" angle={0.8} dur={1.5}>swings</Tween> to the side.</Line></Beat>
</Scene>
```

- **The picture is a pure function of its props and time.** `render(ctx)` gets `props` (with the document's `Set` and `Tween` applied), `width` and `height` (the box its slot gave it), `time` (since the scene started), `local` (since its first entrance), `theme` (colours and fonts), `random(key)` and `pixelRatio`. It may be called for any time in any order. No `Date`, `Math.random`, `requestAnimationFrame`, timers or network: use `ctx.random("name")` for randomness and `ctx.local` for slow motion of its own.
- **Anything the narration names goes through props**, changed on the words: `<Set on="swing" angle={0.4}/>` is instant, `<Tween on="swing" angle={0.8} dur={1}>…</Tween>` moves numbers over `dur` from the value they have (it chains with `after`). Put the meaning in props (`angle`, `step`, `highlight`), not in time, so the picture follows the narration when a line is reworded.
- **Prop names that are taken.** On the tag, `id`, `label` and `style` belong to the object. On `<Set>` and `<Tween>`, `on`, `id`, `dur`, `stagger`, `easing`, `params`, `during`, `at`, `after`, `line`, `word`, `mark`, `edge` and `offset` belong to the action, so a prop with one of those names goes in `params={{props: {mark: 1}}}`; `validate` refuses it otherwise, and says so. Easiest is to name props differently.
- **Colours** are `ctx.theme.colors.<key>` with the keys `bg`, `panel`, `panel2`, `border`, `text`, `muted`, `faint`, `data`, `grad`, `op`, `good`, `bad`, `warn`; there is no `accent`, and `tsc` rejects any other key. Fonts are `ctx.theme.fonts.sans` and `.mono`.
- **Fill the box and fit it**: draw relative to `ctx.width` and `ctx.height`, leave a margin, keep text at 28 px or more. `qa` reports a component that overflows its box; it cannot see inside it, so `visotalk preview doc.tsx Pendulum --at 0,1 --props '{"angle":0.8}'` shows it alone (try the extreme props and several times) and `sheet` at the words that matter shows it in place. Write a component with `preview` in the loop: draw, `preview` at two or three props and times, fix, only then use it in the document.
- A document may import nothing but the tags and components. `tsc` (with `jsxImportSource: "@visotalk/jsx"`) checks a component's props against its `Props` type; `validate` does not.
- **Draw so the same frame is the same twice.** Round positions to whole pixels, draw an arrow as one filled shape rather than a stroked shaft under a filled head (their antialiasing differs from run to run), and use font weights 400 and 700.
- **Start from the skeleton.** `examples/component-skeleton/components/skeleton.ts` is the bare shape of a component (props in, one frame out, canvas drawing plus HTML captions) and `techniques.ts` holds small proven snippets (`clamp`, `stagger`, `ease`, whole-pixel `arrow`, `fitFont`, `gridOf`). `doc.tsx` there is the other half: how the document hands a component its props on the words (`<Set>`, a `<Tween id>` with a second one `after`, `<Appear during>`). They show how a component is built, not what yours should look like: write your own drawing and the props the narration moves. `examples/moon-component` is a fuller one.
