import {Appear, Beat, Doc, Scene, Text, Tween} from '@visotalk/jsx';
import {Moon} from "./components/moon.ts";

/** A component placed and timed by the document: the picture is code (components/moon.ts); when it appears and what it shows is this file. */
export default <Doc
  spec="0.4.0"
  id="moon-component"
  title="A component placed and timed by the document"
  lang="en"
  theme="visotalk/dark"
  canvas="16x9"
  exports={{variants: [{preset: "16x9"}], fps: 30, captions: "none", credits: "none"}}
>
  <Text id="head" text="The phases of the Moon" style="title"/>
  <Moon id="view" phase={0}/>
  <Text id="note" text="the picture is code; when it appears and what it shows is the document" style="caption"/>

  <Scene id="phases" pattern="board" slots={{title: "head", main: "view", note: "note"}} options={{band: false}}>
    <Beat id="start" duration={2.5}>
      <Appear on="view" at="start" offset={0.3}/>
      <Appear on="note" at="start" offset={1.2}/>
    </Beat>
    <Beat id="quarter" duration={2.5}>
      <Tween on="view" phase={0.25} at="start" dur={1.5}/>
    </Beat>
    <Beat id="full" duration={2.5}>
      <Tween on="view" phase={0.5} at="start" dur={1.5}/>
    </Beat>
    <Beat id="last" duration={2.5}>
      <Tween on="view" phase={0.75} id="last-quarter" at="start" dur={1.5}/>
      <Tween on="view" phase={1} after="last-quarter" offset={0.2} dur={1}/>
    </Beat>
  </Scene>
</Doc>;
