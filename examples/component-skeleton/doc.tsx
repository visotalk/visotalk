import {Appear, Beat, Doc, Line, Scene, Set, Text, Tween} from '@visotalk/jsx';
import {Skeleton} from "./components/skeleton.ts";

/**
 * The smallest complete component, placed in a `stage` slot and moved by the document (components/skeleton.ts; the techniques are in components/techniques.ts).
 * How a document talks to a component: the tag's attributes are its props (`shown`, `captions`); `<Tween>` moves a number from the value it has,
 * `<Set>` changes any prop at once; both are anchored on the words that name the thing, exactly as for a built-in object. `after` chains an action to
 * the end of another, and `during` keeps an object on screen for exactly the words it is wrapped around.
 */
export default <Doc
  spec="0.4.0"
  id="component-skeleton"
  title="A component skeleton"
  lang="en"
  theme="visotalk/dark"
  canvas="16x9"
  exports={{variants: [{preset: "16x9"}], fps: 30, captions: "burned", credits: "none"}}
>
  <Text id="head" text="A component, moved by the document" style="title"/>
  <Skeleton id="row" shown={0} captions={["first", "second", "third", "fourth"]}/>
  <Text id="hint" text="Captions are props too" style="caption"/>

  {/* Ideas: (a) numbered squares in a row; (b) a picture of your own. Layout: the row fills the width of the stage, captions under it. Motion: one square per phrase. */}
  <Scene id="row-scene" pattern="stage" slots={{title: "head", main: "row", note: "hint"}}>
    <Beat id="b1">
      <Appear on="row" at="start"/>
      {/* an action outside the line: `id` names it, and `after` starts the next one when it ends, so a longer `dur` moves the second too */}
      <Tween id="two" on="row" shown={2} line="l1" word="two squares" dur={1}/>
      <Tween on="row" shown={4} after="two" dur={1}/>
      <Line id="l1">The row grows one square at a time: two squares, then all four.</Line>
    </Beat>
    <Beat id="b2">
      {/* <Set> changes a prop at once, on the word that names it */}
      <Line id="l2">Then the captions <Set on="row" captions={["a", "b", "c", "d"]}>change</Set> without moving anything else, <Appear on="hint" during>and the note below stays for as long as these words are being said.</Appear></Line>
    </Beat>
  </Scene>
</Doc>;
