// Idea Map's sample: one example among many. Do not reuse its story, scenes, layout or timings; read it for technique, after your own scenes are planned.
// Sources: GBD 2021 Antimicrobial Resistance Collaborators, The Lancet 404 (2024), 1199–1226, for 1.14 million deaths caused by
// resistant bacteria in 2021 and 1.91 million forecast for 2050; Fleming-Dutra et al., JAMA 315 (2016), 1864–1873, for at least 30% of US outpatient antibiotic
// prescriptions in 2010–11 being unnecessary. The whole film is one map under one camera (parts/world.tsx), a part whose props the scenes tween.
import {Doc, Scene, Line, Part, Animation, Appear, Tween, Set} from '@visotalk/jsx';
import {World} from './parts/world.tsx';


export default <Doc
  id="idea-map-sample"
  title="Why do antibiotics stop working?"
  poster={57.5}
  lang="en"
  canvas="16x9"
  theme="visotalk/light"
  tokens={{
    colors: {bg: '#F3F4F1', panel: '#FFFFFF', panel2: '#E8EBEC', border: '#B4BCC4', text: '#111418', muted: '#5C636D', faint: '#9FB6C8', data: '#111418', grad: '#F6CFC4', op: '#E0361C', good: '#2E7D5B', bad: '#E0361C', warn: '#C88A12'},
    fonts: {sans: '"Hanken Grotesk", "Noto Sans SC", sans-serif', mono: '"JetBrains Mono", "Noto Sans SC", monospace', display: '"Newsreader", "Noto Serif SC", serif'},
    caption: {font: 'sans', size: 36, weight: 500, color: '#111418', background: '#F3F4F1', radius: 0, padding: [8, 22], bottom: 54, maxWidth: 1400, rule: '#E0361C', ruleSide: 'left'},
  }}
  pacing={{lead: 0.3, hold: 0.4, tail: 1}}
  exports={{captions: 'burned'}}
>
  <Part id="map"><World /></Part>

  <Scene id="loop" title="The loop">
    <Line id="l1">Why do antibiotics stop working? Every course kills the bacteria it can, leaving the few that resist.</Line>
    <Line id="l2">Those survivors multiply and spread, so infections get harder to treat,</Line>
    <Line id="l3" hold={0.5}>and harder infections mean more antibiotics. The loop feeds itself.</Line>
    <Animation>
      <Appear target="map" at="start" dur={0} />
      <Tween target="map" to={{heading: 1}} at="start" dur={1.2} easing="linear" />
      <Tween target="map" to={{grow: 1}} line="l1" word="every course" dur={0.9} easing="linear" />
      <Tween target="map" to={{grow: 2}} line="l1" word="kills" dur={1.7} easing="linear" />
      <Tween target="map" to={{key: 1}} line="l1" word="kills" dur={0.6} easing="linear" />
      <Tween target="map" to={{grow: 3}} line="l2" word="multiply" dur={1.4} easing="linear" />
      <Tween target="map" to={{multiply: 1}} line="l2" word="spread" offset={0.2} dur={1.4} easing="linear" />
      <Tween target="map" to={{key: 2}} line="l2" word="multiply" dur={0.6} easing="linear" />
      <Tween target="map" to={{grow: 4}} line="l2" word="so infections" dur={1.4} easing="linear" />
      <Tween target="map" to={{grow: 5}} line="l3" word="more antibiotics" dur={1.3} easing="linear" />
      <Tween target="map" to={{view: 1}} line="l3" word="The loop" dur={1.2} easing="linear" />
      <Tween target="map" to={{loop: 1}} line="l3" word="feeds itself" dur={0.9} easing="linear" />
    </Animation>
  </Scene>

  <Scene id="feed" title="What feeds it">
    <Line id="l7" text="Unneeded prescriptions feed it: at least 30% of US outpatient prescriptions were unnecessary.">Unneeded prescriptions feed it: at least thirty percent of US outpatient prescriptions were unnecessary.</Line>
    <Line id="l8">Stewardship, prescribing only when needed, blocks it.</Line>
    <Animation>
      <Tween target="map" to={{view: 2}} line="l7" dur={1.6} easing="linear" />
      <Tween target="map" to={{grow: 6}} line="l7" word="Unneeded prescriptions" dur={1.3} easing="linear" />
      <Tween target="map" to={{hot2: 1}} line="l7" word="feed it" dur={0.3} easing="linear" />
      <Tween target="map" to={{key: 3}} line="l7" word="feed it" dur={0.6} easing="linear" />
      <Tween target="map" to={{fig30: 1}} line="l7" word="at least thirty percent" dur={1.6} easing="linear" />
      <Tween target="map" to={{grow: 7, hot2: 0}} line="l8" word="Stewardship" dur={1.3} easing="linear" />
      <Tween target="map" to={{view: 3}} line="l8" dur={1.2} easing="linear" />
      <Tween target="map" to={{key: 4}} line="l8" word="blocks" dur={0.6} easing="linear" />
    </Animation>
  </Scene>

  <Scene id="gene" title="What travels">
    <Line id="l4">Resistance often rides on a plasmid, a ring of DNA that bacteria share.</Line>
    <Line id="l5" hold={0.6}>One such gene makes beta-lactamase, an enzyme that works against penicillin.</Line>
    <Animation>
      <Tween target="map" to={{view: 4}} line="l4" dur={1.6} easing="linear" />
      <Tween target="map" to={{locator: 1}} line="l4" dur={0.6} easing="linear" />
      <Tween target="map" to={{grow: 8}} line="l4" word="a plasmid" dur={1.3} easing="linear" />
      <Tween target="map" to={{fig30: 0}} line="l4" dur={0.6} easing="linear" />
      <Tween target="map" to={{grow: 9}} line="l5" word="such gene" dur={1.1} easing="linear" />
      <Tween target="map" to={{key: 5}} line="l5" word="such gene" dur={0.6} easing="linear" />
      <Tween target="map" to={{rideMix: 1, speed: 70}} line="l5" word="makes" offset={-0.2} dur={0.5} easing="linear" />
      <Tween target="map" to={{grow: 10}} line="l5" word="makes" dur={1.6} easing="linear" />
      <Tween target="map" to={{view: 5}} line="l5" word="makes" dur={1.3} easing="linear" />
      <Tween target="map" to={{rideMix: 0, speed: 0}} line="l5" word="beta-lactamase" offset={0.3} dur={0.7} easing="linear" />
      <Tween target="map" to={{grow: 11}} line="l5" word="works against" dur={1.4} easing="linear" />
      <Tween target="map" to={{key: 6}} line="l5" word="works against" dur={0.6} easing="linear" />
      <Tween target="map" to={{struck: 1}} line="l5" word="penicillin" offset={0.3} dur={0.6} easing="linear" />
    </Animation>
  </Scene>

  <Scene id="cell" title="Two cells">
    <Line id="l6" hold={0.6}>Where penicillin stops a cell finishing its wall, the enzyme breaks the drug open first.</Line>
    <Animation>
      <Tween target="map" to={{cmp: 1}} line="l6" dur={0.9} easing="cubic-bezier(0.45, 0, 0.2, 1)" />
      <Tween target="map" to={{compare: 0.7}} line="l6" word="Where penicillin" dur={1.4} easing="linear" />
      <Tween target="map" to={{compare: 1}} line="l6" word="the enzyme" dur={1.1} easing="linear" />
      <Tween target="map" to={{cellAct: 1}} line="l6" word="finishing its wall" dur={2.6} easing="linear" />
    </Animation>
  </Scene>

  <Scene id="cost" title="The cost">
    <Line id="l9" hold={1.0} text="In 2021, resistant bacteria caused 1.14 million deaths; by 2050, a forecast 1.91 million.">In twenty twenty-one, resistant bacteria caused one point one four million deaths; by twenty fifty, a forecast one point nine one million.</Line>
    <Animation>
      <Tween target="map" to={{view: 6, cmp: 0}} line="l9" dur={1.8} easing="linear" />
      <Set target="map" to={{locator: 0}} at="start" />
      <Tween target="map" to={{loop: 0}} line="l9" dur={0.6} easing="linear" />
      <Tween target="map" to={{hot: 1}} line="l9" word="resistant bacteria" dur={0.3} easing="linear" />
      <Tween target="map" to={{chart: 0.55}} line="l9" word="caused" dur={1.4} easing="linear" />
      <Tween target="map" to={{chart: 1}} line="l9" word="a forecast" dur={1.2} easing="linear" />
    </Animation>
  </Scene>
</Doc>;
