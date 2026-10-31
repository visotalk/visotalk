import {Doc, Scene, Line, Part, Animation, Appear, Tween, Set} from '@visotalk/jsx';
import {Walk} from './parts/walk.tsx';
import {Capture} from './parts/capture.tsx';
import {Tags} from './parts/tags.tsx';
import {Search} from './parts/search.tsx';
import {Close} from './parts/close.tsx';

export default <Doc id="notes-intro" poster={49} title={"Nook Notes"} lang={"en"} voice={"af_heart"} theme={"visotalk/light"} canvas={"16x9"} tokens={{"colors":{"bg":"#F6F3EA","text":"#1D2330","data":"#1F6FD0","good":"#1E9E55","bad":"#D13B3B","warn":"#B7791F"},"fonts":{"sans":"\"Inter\", sans-serif","mono":"\"JetBrains Mono\", monospace"}}} speed={1} pacing={{"lead":0.4,"hold":0.4,"tail":0.8}} exports={{"captions":"burned"}}>
  <Scene id="problem" title="The thought you lose">
    <Line id="l1">You have a good idea on the walk home, and by the time you sit down, it's gone.</Line>
    <Line id="l2">Not a bad idea: just nowhere quick to put it.</Line>
    <Line id="l3">Most of those thoughts are small, and worth keeping.</Line>

    <Part id="walk" x={0} y={40} w={1920} h={880}><Walk /></Part>

    <Animation>
      <Appear target="walk" at="start" dur={0} />
      <Set target="walk" to={{walk: 0, idea: 0, slot: 0, notes: 0}} at="start" />
      <Tween target="walk" to={{idea: 1}} line="l1" word="good idea" dur={0.5} />
      <Tween target="walk" to={{walk: 1}} line="l1" word="walk home" dur={3.2} />
      <Tween target="walk" to={{idea: 0}} line="l1" word="it&apos;s gone" dur={0.9} />
      <Tween target="walk" to={{slot: 1}} line="l2" word="nowhere quick" dur={0.8} />
      <Tween target="walk" to={{notes: 1}} line="l3" word="Most" dur={2.4} />
    </Animation>
  </Scene>

  <Scene id="capture" title="Capture it in one line">
    <Line id="l4">Nook Notes is a small notes app built for exactly that moment.</Line>
    <Line id="l5">Open it, type one line, close it.</Line>
    <Line id="l6">The note is kept, with nothing to set up first.</Line>

    <Part id="capture" x={0} y={40} w={1920} h={880}><Capture /></Part>

    <Animation>
      <Appear target="capture" at="start" dur={0} />
      <Set target="capture" to={{open: 0, chars: 0, out: 0, slot: 0}} at="start" />
      <Tween target="capture" to={{open: 1}} line="l4" word="Nook Notes" dur={0.7} />
      <Tween target="capture" to={{slot: 1}} line="l4" word="notes app" dur={0.7} />
      <Tween target="capture" to={{chars: 19}} line="l5" word="type one line" dur={1.6} />
      <Tween target="capture" to={{out: 1}} line="l6" word="kept" dur={0.9} />
    </Animation>
  </Scene>

  <Scene id="tag" title="Organise it with tags">
    <Line id="l7">Later, give it a tag: work, recipe, idea, whatever you'd look under.</Line>
    <Line id="l8">A tag is just a word, and a note can carry more than one.</Line>

    <Part id="tag" x={0} y={40} w={1920} h={880}><Tags /></Part>

    <Animation>
      <Appear target="tag" at="start" dur={0} />
      <Set target="tag" to={{note: 0, tags: 0}} at="start" />
      <Tween target="tag" to={{note: 1}} line="l7" word="Later" dur={0.7} />
      <Tween target="tag" to={{tags: 1}} line="l7" word="tag" dur={0.6} />
      <Tween target="tag" to={{tags: 3}} line="l7" word="recipe" dur={1.4} />
      <Tween target="tag" to={{tags: 4}} line="l8" word="more than one" dur={0.8} />
    </Animation>
  </Scene>

  <Scene id="search" title="Find it by keyword">
    <Line id="l9">When you need it again, you just search for any word you remember.</Line>
    <Line id="l10">Matching notes appear as you type, and tags narrow the list.</Line>
    <Line id="l11">You don't have to remember where you filed it, or what you called it.</Line>

    <Part id="search" x={0} y={40} w={1920} h={880}><Search /></Part>

    <Animation>
      <Appear target="search" at="start" dur={0} />
      <Set target="search" to={{chars: 0, rows: 0, narrow: 0}} at="start" />
      <Tween target="search" to={{chars: 7}} line="l9" word="search" dur={2.0} />
      <Tween target="search" to={{rows: 2}} line="l10" word="Matching notes" dur={0.9} />
      <Tween target="search" to={{rows: 4}} line="l10" word="as you type" dur={0.7} />
      <Tween target="search" to={{narrow: 1}} line="l10" word="tags narrow" dur={0.9} />
    </Animation>
  </Scene>

  <Scene id="close" title="Fictional example and one call to action">
    <Line id="l12">Nook Notes is a fictional app: an example of capture, tag, and search.</Line>
    <Line id="l13">Try it today: write one thought down, and give it a tag.</Line>

    <Part id="close" x={0} y={40} w={1920} h={880}><Close /></Part>

    <Animation>
      <Appear target="close" at="start" dur={0} />
      <Set target="close" to={{mark: 0, trio: 0, card: 0, write: 0, tag: 0}} at="start" />
      <Tween target="close" to={{mark: 1}} line="l12" word="fictional app" dur={0.7} />
      <Tween target="close" to={{trio: 3}} line="l12" word="capture" dur={1.6} />
      <Tween target="close" to={{card: 1}} line="l13" word="Try it today" dur={0.7} />
      <Tween target="close" to={{write: 1}} line="l13" word="write one thought down" dur={2.0} />
      <Tween target="close" to={{tag: 1}} line="l13" word="tag" dur={0.7} />
    </Animation>
  </Scene>
</Doc>;
