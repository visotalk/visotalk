import {Asset, Doc, Scene, Line, Part, Animation, Appear, Tween} from '@visotalk/jsx';
import {Ground} from './parts/kit.tsx';
import {Cover} from './parts/cover.tsx';
import {Numbers} from './parts/numbers.tsx';
import {MapScene} from './parts/map.tsx';
import {Night} from './parts/night.tsx';
import {Field} from './parts/field.tsx';
import {Week} from './parts/week.tsx';
import {Entry} from './parts/entry.tsx';
import {Champions} from './parts/champions.tsx';
import {Finish} from './parts/finish.tsx';

export default <Doc id="utmb-around-the-giant" title="UTMB: Around the Giant" lang="en" voice="minimax:English_Trustworthy_Man" theme="visotalk/dark" canvas="16x9"
  tokens={{colors: {bg: '#0B1116'}, fonts: {sans: '"Hanken Grotesk", sans-serif', mono: '"JetBrains Mono", monospace', display: '"Big Shoulders Display", sans-serif'}}}>
  <Asset id="cover-photo" kind="image" src="media/utmb-flegere.jpg"
    license={{id: 'CC-BY-SA-4.0', attribution: 'Anthospace / Wikimedia Commons', obligations: ['attribution', 'share-alike']}}
    source="https://commons.wikimedia.org/wiki/File:UTMB_2021-_La_Fl%C3%A9g%C3%A8re_and_the_Chamonix_valley_are_revealed._It_is_deliverance_for_runners-_UPLCJF.jpg" />
  <Asset id="finish-photo" kind="image" src="media/chamonix-valley.jpg"
    license={{id: 'CC-BY-SA-3.0', attribution: 'Ximonic, Simo Räsänen / Wikimedia Commons', obligations: ['attribution', 'share-alike']}}
    source="https://commons.wikimedia.org/wiki/File:Chamonix_valley_from_la_Fl%C3%A9g%C3%A8re,2010_07.JPG" />

  <Part id="ground"><Ground /></Part>

  <Scene id="place" title="The mountain and the town">
    <Line id="l1" text={"Mont Blanc rises 4,808 metres above the sea — the highest ground in Western Europe."}>Mont Blanc rises four thousand eight hundred and eight metres above the sea, the highest ground in Western Europe.</Line>
    <Line id="l2">At its foot sits Chamonix, and every August this valley becomes the capital of trail running.</Line>
    <Part id="cover" h={900}><Cover /></Part>
    <Animation>
      <Appear target="ground" at="start" dur={0} />
      <Appear target="cover" at="start" dur={0} />
      <Tween target="cover" to={{px: 68, py: 46}} at="start" until="end" easing="linear" />
      <Appear target="alt" line="l1" word="four thousand eight hundred and eight metres" />
      <Appear target="since" line="l2" word="August" />
    </Animation>
  </Scene>

  <Scene id="loop" title="The loop in numbers">
    <Line id="l3" text={"The Ultra-Trail du Mont-Blanc is one loop around the massif: about 176 kilometres."}>The Ultra Trail du Mont Blanc is one loop around the massif: about one hundred and seventy-six kilometres.</Line>
    <Line id="l4" text={"Runners climb almost 10,000 metres — more ascent than Everest, from sea level."}>Runners climb almost ten thousand metres, more ascent than Everest, from sea level.</Line>
    <Line id="l5" text={"And it all has to be done inside 46 and a half hours."}>And it all has to be done inside forty-six and a half hours.</Line>
    <Part id="loop"><Numbers /></Part>
    <Animation>
      <Appear target="loop" at="start" dur={0.5} />
      <Tween target="loop" to={{km: 176}} line="l3" until={{line: "l3", word: "one hundred and seventy-six kilometres"}} easing="easeOutQuart" />
      <Tween target="loop" to={{climb: 9915}} line="l4" until={{line: "l4", word: "ten thousand metres"}} easing="easeOutQuart" />
      <Tween target="loop" to={{everest: 8849}} line="l4" word="Everest" dur={1.3} easing="easeOutQuart" />
      <Appear target="limit" line="l5" word="forty-six and a half hours" />
    </Animation>
  </Scene>

  <Scene id="countries" title="Three countries">
    <Line id="l6">The route crosses three countries. From Chamonix it climbs to the Col de la Seigne, then drops into Italy at Courmayeur.</Line>
    <Line id="l7" text={"Then the Grand Col Ferret — 2,537 metres, the highest point of the race — takes it into Switzerland."}>Then the Grand Col Ferret, two thousand five hundred and thirty-seven metres, the highest point of the race, takes it into Switzerland.</Line>
    <Line id="l8">One last valley, one last climb, and the trail turns back toward Chamonix.</Line>
    <Part id="map"><MapScene /></Part>
    <Animation>
      <Appear target="map" at="start" dur={0.5} />
      <Appear target="seigne" line="l6" word="Col de la Seigne" />
      <Tween target="map" to={{d1: 1}} line="l6" word="Col de la Seigne" dur={1.6} easing="easeInOutSine" />
      <Appear target="italy" line="l6" word="Courmayeur" />
      <Tween target="map" to={{d2: 1}} line="l6" word="Courmayeur" dur={1.2} easing="easeInOutSine" />
      <Appear target="ferret" line="l7" word="Grand Col Ferret" />
      <Tween target="map" to={{d3: 1}} line="l7" word="Grand Col Ferret" dur={1.4} easing="easeInOutSine" />
      <Appear target="highest" line="l7" word="highest point" />
      <Appear target="switzerland" line="l7" word="Switzerland" />
      <Tween target="map" to={{d4: 1}} line="l7" word="Switzerland" dur={1.2} easing="easeInOutSine" />
      <Appear target="balme" line="l8" word="last climb" />
      <Tween target="map" to={{d5: 1}} line="l8" word="last climb" dur={1.0} easing="easeInOutSine" />
      <Appear target="home" line="l8" word="Chamonix" />
      <Tween target="map" to={{d6: 1}} line="l8" word="Chamonix" dur={1.2} easing="easeInOutSine" />
    </Animation>
  </Scene>

  <Scene id="night" title="The long night">
    <Line id="l9">It starts at six in the evening, and the first night is spent climbing.</Line>
    <Line id="l10">Dawn finds the leaders in Italy. Behind them, the field is still strung across the mountains.</Line>
    <Line id="l11">Then comes a second day, a second night, and a clock that never stops.</Line>
    <Part id="night"><Night /></Part>
    <Animation>
      <Appear target="night" at="start" dur={0.5} />
      <Appear target="italy" line="l10" word="Italy" />
      <Tween target="night" to={{t: 0.26, phase: 1}} line="l10" word="Dawn" dur={2.5} easing="easeInOutSine" />
      <Tween target="night" to={{t: 0.55, phase: 0.9}} line="l11" word="second day" dur={1.0} easing="easeInOutSine" />
      <Appear target="snight" line="l11" word="second night" />
      <Tween target="night" to={{t: 0.8, phase: 0.05}} line="l11" word="second night" dur={1.0} easing="easeInOutSine" />
      <Appear target="cut" line="l11" word="clock" />
      <Tween target="night" to={{t: 1, phase: 0.5}} line="l11" word="clock" until="end" easing="easeInOutSine" />
    </Animation>
  </Scene>

  <Scene id="field" title="The field">
    <Line id="l12" text={"In 2024, 2,761 runners started."}>In twenty twenty-four, two thousand seven hundred and sixty-one runners started.</Line>
    <Line id="l13" text={"1,760 reached Chamonix. The other thousand did not."}>One thousand seven hundred and sixty reached Chamonix. The other thousand did not.</Line>
    <Line id="l14" text={"That is a finishing rate of about 64 percent."}>That is a finishing rate of about sixty-four percent.</Line>
    <Part id="field"><Field /></Part>
    <Animation>
      <Appear target="field" at="start" dur={0.5} />
      <Tween target="field" to={{reveal: 1}} line="l12" dur={1.2} easing="easeInOutSine" />
      <Tween target="field" to={{started: 2761}} line="l12" word="two thousand seven hundred and sixty-one runners" dur={1.6} easing="easeOutQuart" />
      <Tween target="field" to={{finished: 1760, live: 1}} line="l13" word="reached Chamonix" dur={1.4} easing="easeOutQuart" />
      <Tween target="field" to={{dead: 1}} line="l13" word="did not" dur={1.0} easing="easeOutQuart" />
      <Tween target="field" to={{rate: 0.64}} line="l14" word="sixty-four percent" dur={1.2} easing="easeOutQuart" />
    </Animation>
  </Scene>

  <Scene id="week" title="A week of races">
    <Line id="l15" text={"The UTMB is the final of a whole week of racing: eight events, 10,000 runners."}>The UTMB is the final of a whole week of racing: eight events, ten thousand runners.</Line>
    <Line id="l16" text={"The CCC covers 101 kilometres. The TDS, 148. The OCC, 57."}>The C C C covers a hundred and one kilometres. The T D S, a hundred and forty-eight. The O C C, fifty-seven.</Line>
    <Line id="l17" text={"And the PTL: 300 kilometres and 25,000 metres of climbing, run in teams."}>And the P T L: three hundred kilometres and twenty-five thousand metres of climbing, run in teams.</Line>
    <Part id="week"><Week /></Part>
    <Animation>
      <Appear target="week" at="start" dur={0.5} />
      <Tween target="bar-utmb" to={{w: 587}} line="l15" word="eight events" dur={1.2} easing="easeOutQuart" />
      <Appear target="week-tag" line="l15" word="eight events" />
      <Appear target="final" line="l15" word="eight events" />
      <Tween target="bar-ccc" to={{w: 337}} line="l16" word="hundred and one kilometres" dur={1.1} easing="easeOutQuart" />
      <Tween target="bar-tds" to={{w: 493}} line="l16" word="forty-eight" dur={1.1} easing="easeOutQuart" />
      <Tween target="bar-occ" to={{w: 190}} line="l16" word="fifty-seven" dur={1.1} easing="easeOutQuart" />
      <Tween target="bar-ptl" to={{w: 1000}} line="l17" word="three hundred kilometres" dur={1.5} easing="easeOutQuart" />
      <Appear target="teams" line="l17" word="twenty-five thousand metres" />
    </Animation>
  </Scene>

  <Scene id="entry" title="How you get in">
    <Line id="l18">You cannot simply sign up. Runners earn a Running Stone at another race, then enter a lottery.</Line>
    <Line id="l19">About one in three gets a place on the start line.</Line>
    <Line id="l20">The rest keep collecting stones, and try again next year.</Line>
    <Part id="entry"><Entry /></Part>
    <Animation>
      <Appear target="entry" at="start" dur={0.5} />
      <Appear target="stone" line="l18" word="Running Stone" />
      <Appear target="ring1" line="l18" word="Running Stone" />
      <Appear target="drum" line="l18" word="lottery" />
      <Appear target="ring2" line="l18" word="lottery" />
      <Tween target="entry" to={{f1: 1}} line="l18" word="lottery" dur={1.2} easing="easeInOutSine" />
      <Appear target="bib" line="l19" word="one in three" />
      <Appear target="ring3" line="l19" word="one in three" />
      <Appear target="odds" line="l19" word="one in three" />
      <Tween target="entry" to={{f2: 1}} line="l19" word="one in three" dur={1.2} easing="easeInOutSine" />
      <Tween target="entry" to={{ret: 1}} line="l20" word="next year" dur={1.6} easing="easeInOutSine" />
      <Appear target="again" line="l20" word="next year" />
    </Animation>
  </Scene>

  <Scene id="champions" title="The front of the race">
    <Line id="l21" text={"At the front, the race is something else. In 2023, Jim Walmsley ran it in 19 hours 37."}>At the front, the race is something else. In twenty twenty-three, Jim Walmsley ran it in nineteen hours thirty-seven.</Line>
    <Line id="l22" text={"A year later, Katie Schide finished in 22 hours 9 — the fastest woman the race had seen."}>A year later, Katie Schide finished in twenty-two hours nine, the fastest woman the race had seen.</Line>
    <Line id="l23" text={"The middle of the field takes about 40 hours. The clock allows 46 and a half."}>The middle of the field takes about forty hours. The clock allows forty-six and a half.</Line>
    <Part id="champions"><Champions /></Part>
    <Animation>
      <Appear target="champions" at="start" dur={0.5} />
      <Tween target="champions" to={{m1: 1177}} line="l21" until={{line: "l21", word: "nineteen hours thirty-seven"}} easing="linear" />
      <Tween target="champions" to={{m2: 1329}} line="l22" until={{line: "l22", word: "twenty-two hours nine"}} easing="linear" />
      <Appear target="fieldbar" line="l23" word="forty hours" />
      <Tween target="champions" to={{bar: 1}} line="l23" word="forty hours" dur={1.2} easing="easeInOutSine" />
      <Appear target="median" line="l23" word="forty hours" />
      <Appear target="cutoff" line="l23" word="forty-six and a half" />
    </Animation>
  </Scene>

  <Scene id="finish" title="The finish">
    <Line id="l24">For most, the prize is not the podium. It is the moment the valley opens and Chamonix appears below.</Line>
    <Line id="l25" hold={2}>One loop, three countries, one long night — and a mountain that waits for whoever will go around it.</Line>
    <Part id="finish" h={900}><Finish /></Part>
    <Animation>
      <Appear target="finish" at="start" dur={0.5} />
      <Tween target="finish" to={{px: 64, py: 52}} at="start" until="end" easing="linear" />
      <Appear target="title" line="l24" word="valley opens" />
      <Appear target="tag" line="l25" word="one loop" />
    </Animation>
  </Scene>
</Doc>;
