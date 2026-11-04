// Data Brief's sample: one example among many. Do not reuse its story, scenes, layout or timings; read it for technique, after your own scenes are planned.
// Every figure is real and sourced: US life expectancy and causes of death from the National Center for Health Statistics,
// "Mortality in the United States", NCHS Data Briefs No. 328 (2017), 395 (2019), 427 (2020), 492 (2022) and 521 (2023, December 2024).
// The years before 2020 are the series as NCHS revised it (2016: 78.7). Each scene is one exhibit; the guide moves on the word that names its value.
import {Doc, Scene, Line, Part, Animation, Appear, Tween, Set} from '@visotalk/jsx';
import {useProp} from '@visotalk/runtime';
import {Exhibit} from '../parts/exhibit.tsx';
import {Cover} from '../parts/cover.tsx';
import {Glossary} from '../parts/glossary.tsx';
import {Trend} from '../parts/trend.tsx';
import {Columns} from '../parts/columns.tsx';
import {Reading} from '../parts/reading.tsx';
import {Ranking} from '../parts/ranking.tsx';
import {Slope} from '../parts/slope.tsx';
import {Split} from '../parts/split.tsx';
import {Matrix} from '../parts/matrix.tsx';
import {Excerpt} from '../parts/excerpt.tsx';
import {List} from '../parts/list.tsx';
import {Heatmap} from '../parts/heatmap.tsx';
import {Donut} from '../parts/donut.tsx';

const SOURCE = 'NCHS, Mortality in the United States, Data Briefs 328–521';
const YEARS = ['2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023'];
const LIFE = [78.7, 78.6, 78.7, 78.8, 77.0, 76.4, 77.5, 78.4];
const CHANGE = [-0.1, 0.1, 0.1, -1.8, -0.6, 1.1, 0.9];
const CAUSES = [
  {label: 'Heart disease', value: 162.1},
  {label: 'Cancer', value: 141.8},
  {label: 'Unintentional injuries', value: 62.3},
  {label: 'Stroke', value: 39.0},
  {label: 'Chronic lower respiratory', value: 33.4},
  {label: 'Alzheimer disease', value: 27.7},
  {label: 'Diabetes', value: 22.4},
  {label: 'Kidney disease', value: 13.1},
  {label: 'Chronic liver disease', value: 13.0},
  {label: 'COVID-19', value: 11.9},
];
const RATES = [
  {label: 'Heart disease', a: 167.2, b: 162.1, change: '−3%'},
  {label: 'Cancer', a: 142.3, b: 141.8},
  {label: 'Unintentional injuries', a: 64.0, b: 62.3},
  {label: 'COVID-19', a: 44.5, b: 11.9, change: '−73%'},
  {label: 'Stroke', a: 39.5, b: 39.0},
];

export default <Doc
  id="data-brief-sample"
  title="How long Americans live"
  poster={12.6}
  lang="en"
  canvas="16x9"
  theme="visotalk/light"
  tokens={{
    colors: {bg: '#F3F4F1', panel: '#E6E9E4', panel2: '#DADED8', border: '#D3D7D1', text: '#14171C', muted: '#5F666E', faint: '#B4BAB5', data: '#1F44E0', grad: '#1F44E0', op: '#14171C', good: '#1D7F55', bad: '#C93C2A', warn: '#B07A00'},
    fonts: {sans: '"Hanken Grotesk", "Noto Sans SC", sans-serif', mono: '"JetBrains Mono", "Noto Sans SC", monospace', display: '"Hanken Grotesk", "Noto Sans SC", sans-serif'},
    caption: {font: 'sans', size: 34, weight: 500, color: '#14171C', background: 'none', padding: [6, 0], bottom: 64, rule: '#1F44E0', ruleSide: 'top'},
  }}
  pacing={{lead: 0.2, hold: 0.3, tail: 0.5}}
  exports={{captions: 'burned'}}
>
  <Scene id="cover" title="Cover">
    <Line id="l1">How long do Americans live?</Line>
    <Part id="cover">{() => <Cover series="Health statistics · United States" date="Data to 2023" title={'How long\nAmericans live'} dek="Life expectancy at birth, 2016 to 2023, and the causes of death behind it."
      contents={[{fig: '01', text: 'Life expectancy, 2016–2023'}, {fig: '04', text: 'Women and men'}, {fig: '06', text: 'Leading causes of death'}, {fig: '10', text: 'In the agency’s words'}, {fig: '11', text: 'Four findings'}]} reveal={useProp('reveal', 0)} />}</Part>
    <Animation>
      <Appear target="cover" at="start" dur={0} />
      <Tween target="cover" to={{reveal: 1}} line="l1" word="How long" dur={1.6} easing="easeOutSine" />
    </Animation>
  </Scene>

  <Scene id="term" title="What it measures">
    <Line id="l2">Life expectancy: how long a newborn would live at this year's death rates.</Line>
    <Part id="ex-term">{() => <Exhibit fig="1" figLabel="BOX" kicker="Method" headline="A measure of this year, not a forecast" unit="How the brief's main figure is defined" source="NCHS, life tables" reveal={useProp('reveal', 0)} />}</Part>
    <Part id="term" x={120} y={300} w={1680} h={500}>{() => <Glossary w={1680} terms={[{term: 'Life expectancy at birth', kind: 'period measure · years', text: "How long a newborn would live, on average, if this year's death rates held for the rest of its life.", mark: "this year's death rates"}]} reveal={useProp('reveal', 0)} marked={useProp('marked', 0)} />}</Part>
    <Animation>
      <Appear target={['ex-term', 'term']} at="start" dur={0} />
      <Tween target="ex-term" to={{reveal: 1}} at="start" dur={0.7} easing="easeOutQuad" />
      <Tween target="term" to={{reveal: 1}} line="l2" word="Life expectancy" dur={1.2} easing="easeOutQuad" />
      <Tween target="term" to={{marked: 1}} line="l2" word="this year's death rates" dur={1.0} easing="easeInOutSine" />
    </Animation>
  </Scene>

  <Scene id="trend" title="The dip">
    <Line id="l3" text="It held near 78.7, then fell to 76.4.">It held near seventy-eight point seven, then fell to seventy-six point four.</Line>
    <Part id="ex1">{() => <Exhibit fig="01" kicker="Life expectancy" headline="Life expectancy fell 2.4 years in two years" unit="Life expectancy at birth, United States, years" source={SOURCE} reveal={useProp('reveal', 0)} />}</Part>
    <Part id="trend" x={120} y={270} w={1680} h={540}>{() => (
      <Trend w={1680} h={540} categories={YEARS} series={[{label: 'All people', values: LIFE}]} min={74} max={80} step={1} decimals={1}
        draw={useProp('draw', 0)} at={useProp('at', -1)} atLabel={useProp('atLabel', '2016')}
        note={{series: 0, at: 5, lines: ['Lowest since 1996'], dx: 40, dy: 70}} noteDraw={useProp('noteDraw', 0)} />
    )}</Part>
    <Animation>
      <Appear target={['ex1', 'trend']} at="start" dur={0} />
      <Tween target="ex1" to={{reveal: 1}} at="start" dur={0.7} easing="easeOutQuad" />
      <Tween target="trend" to={{draw: 0.43}} line="l3" word="held near" dur={1.3} easing="easeInOutSine" />
      <Set target="trend" to={{at: 0}} line="l3" word="seventy-eight point seven" />
      <Tween target="trend" to={{draw: 1}} line="l3" word="then fell" dur={1.6} easing="easeInOutSine" />
      <Set target="trend" to={{atLabel: '2021'}} line="l3" word="seventy-six point four" />
      <Tween target="trend" to={{at: 5}} line="l3" word="seventy-six point four" dur={0.9} easing="easeInOutQuart" />
      <Tween target="trend" to={{noteDraw: 1}} line="l3" word="seventy-six point four" offset={0.5} dur={0.8} easing="easeOutQuad" />
    </Animation>
  </Scene>

  <Scene id="change" title="Year by year">
    <Line id="l4" text="Down 1.8, then 0.6; up 1.1, then 0.9.">Down one point eight, then point six; up one point one, then point nine.</Line>
    <Part id="ex2">{() => <Exhibit fig="02" kicker="Life expectancy" headline="Two years of losses, then two of gains" unit="Change in life expectancy at birth from the year before, years" source={SOURCE} reveal={useProp('reveal', 0)} />}</Part>
    <Part id="cols" x={120} y={260} w={1680} h={560}>{() => (
      <Columns w={1680} h={560} categories={YEARS.slice(1)} values={CHANGE} min={-2.5} max={1.5} step={0.5} decimals={1} signed
        grow={useProp('grow', 0)} at={useProp('at', -1)} atLabel={useProp('atLabel', '2020')} />
    )}</Part>
    <Animation>
      <Appear target={['ex2', 'cols']} at="start" dur={0} />
      <Tween target="ex2" to={{reveal: 1}} at="start" dur={0.7} easing="easeOutQuad" />
      <Tween target="cols" to={{grow: 1}} line="l4" word="Down" dur={1.4} easing="easeOutQuad" />
      <Set target="cols" to={{at: 3}} line="l4" word="one point eight" />
      <Set target="cols" to={{atLabel: '2021'}} line="l4" word="then point six" />
      <Tween target="cols" to={{at: 4}} line="l4" word="then point six" dur={0.7} easing="easeInOutQuart" />
      <Set target="cols" to={{atLabel: '2022'}} line="l4" word="one point one" />
      <Tween target="cols" to={{at: 5}} line="l4" word="one point one" dur={0.7} easing="easeInOutQuart" />
      <Set target="cols" to={{atLabel: '2023'}} line="l4" word="then point nine" />
      <Tween target="cols" to={{at: 6}} line="l4" word="then point nine" dur={0.7} easing="easeInOutQuart" />
    </Animation>
  </Scene>

  <Scene id="latest" title="The latest figure">
    <Line id="l5" text="By 2023, 78.4: short of 2019.">By twenty twenty-three, seventy-eight point four: short of twenty nineteen.</Line>
    <Part id="ex3">{() => <Exhibit fig="03" kicker="Life expectancy" headline="Almost back to where it was before the pandemic" unit="Life expectancy at birth, United States, 2023, years" source={SOURCE} reveal={useProp('reveal', 0)} />}</Part>
    <Part id="reading" x={120} y={290} w={1680} h={520}>{() => (
      <Reading w={1680} value={useProp('value', 75)} decimals={1} unit="years" label="Life expectancy at birth, 2023" change="+0.9 years" changeBase="against 77.5 in 2022"
        scaleMin={75} scaleMax={80} scaleStep={1} refs={[{value: 78.8, label: '2019: 78.8'}, {value: 76.4, label: '2021: 76.4'}]} fill={useProp('fill', 0)} guideLabel="2023" />
    )}</Part>
    <Animation>
      <Appear target={['ex3', 'reading']} at="start" dur={0} />
      <Tween target="ex3" to={{reveal: 1}} at="start" dur={0.7} easing="easeOutQuad" />
      <Tween target="reading" to={{value: 78.4, fill: 1}} line="l5" word="seventy-eight point four" offset={-0.5} dur={1.4} easing="easeOutQuart" />
    </Animation>
  </Scene>

  <Scene id="sexes" title="Women and men">
    <Line id="l9" text="Women outlive men: by 5.3 years in 2023.">Women outlive men: by five point three years in twenty twenty-three.</Line>
    <Part id="ex7">{() => <Exhibit fig="04" kicker="Women and men" headline="Women outlive men by 5.3 years" unit="Life expectancy at birth by sex, United States, years" source={SOURCE} reveal={useProp('reveal', 0)} />}</Part>
    <Part id="heat" x={120} y={262} w={1680} h={560}>{() => (
      <Heatmap w={1680} h={540} rows={['Women', 'Men']} columns={['2019', '2020', '2021', '2022', '2023']}
        values={[[81.4, 79.9, 79.3, 80.2, 81.1], [76.3, 74.2, 73.5, 74.8, 75.8]]} min={72} max={82} decimals={1} unit="years"
        shown={useProp('shown', 0)} at={useProp('at', -1)} atLabel="2023" cell={1} />
    )}</Part>
    <Animation>
      <Appear target={['ex7', 'heat']} at="start" dur={0} />
      <Tween target="ex7" to={{reveal: 1}} at="start" dur={0.7} easing="easeOutQuad" />
      <Tween target="heat" to={{shown: 1}} line="l9" word="Women" dur={1.0} easing="easeOutQuad" />
      <Set target="heat" to={{at: 4}} line="l9" word="five point three" />
    </Animation>
  </Scene>

  <Scene id="older" title="At sixty-five">
    <Line id="l9b" text="At 65, women can expect 20.7 more years.">At sixty-five, women can expect twenty point seven more years.</Line>
    <Part id="ex7b">{() => <Exhibit fig="05" kicker="Women and men" headline="At 65, women can expect 20.7 more years" unit="Life expectancy at birth and at age 65, United States, years" source="NCHS, Data Brief 521" reveal={useProp('reveal', 0)} />}</Part>
    <Part id="table" x={120} y={270} w={1680} h={540}>{() => (
      <Matrix w={1680} h={500} columns={[{name: 'At birth', sub: '2023'}, {name: 'At 65', sub: '2022'}, {name: 'At 65', sub: '2023'}]}
        rows={[{label: 'Women', cells: ['81.1', '20.2', '20.7']}, {label: 'Men', cells: ['75.8', '17.5', '18.2']}, {label: 'All people', cells: ['78.4', '18.9', '19.5']}]}
        rowH={110} at={useProp('at', -1)} best={2} note={['20.7 more years', '+0.5 on 2022']} noteAt={0} shown={useProp('shown', 0)} />
    )}</Part>
    <Animation>
      <Appear target={['ex7b', 'table']} at="start" dur={0} />
      <Tween target="ex7b" to={{reveal: 1}} at="start" dur={0.7} easing="easeOutQuad" />
      <Tween target="table" to={{shown: 3}} at="start" offset={0.2} dur={0.9} easing="easeOutQuad" />
      <Set target="table" to={{at: 0}} line="l9b" word="twenty point seven" offset={-0.3} />
    </Animation>
  </Scene>

  <Scene id="causes" title="Causes of death">
    <Line id="l6" text="COVID-19 fell from fourth leading cause of death to tenth.">Covid fell from fourth leading cause of death to tenth.</Line>
    <Part id="ex4">{() => <Exhibit fig="06" kicker="Causes of death" headline="COVID-19 fell to tenth among the leading causes" unit="The ten leading causes of death, 2023, age-adjusted deaths per 100,000" source="NCHS, Data Brief 521" reveal={useProp('reveal', 0)} />}</Part>
    <Part id="rank" x={120} y={262} w={1680} h={560}>{() => (
      <Ranking w={1680} h={560} rows={CAUSES} max={180} step={30} decimals={1} grow={useProp('grow', 0)} at={useProp('at', -1)} note={['Tenth in 2023', 'fourth in 2022']} noteAt={9} />
    )}</Part>
    <Animation>
      <Appear target={['ex4', 'rank']} at="start" dur={0} />
      <Tween target="ex4" to={{reveal: 1}} at="start" dur={0.7} easing="easeOutQuad" />
      <Tween target="rank" to={{grow: 1}} at="start" offset={0.3} dur={1.6} easing="easeOutQuad" />
      <Set target="rank" to={{at: 9}} line="l6" word="to tenth" offset={-0.3} />
    </Animation>
  </Scene>

  <Scene id="rates" title="Its rate">
    <Line id="l7">Heart disease barely moved; covid fell by three quarters.</Line>
    <Part id="ex5">{() => <Exhibit fig="07" kicker="Causes of death" headline="The COVID-19 death rate fell 73% in a year" unit="Age-adjusted deaths per 100,000, five leading causes of 2022" source="NCHS, Data Brief 521" reveal={useProp('reveal', 0)} />}</Part>
    <Part id="slope" x={120} y={270} w={1680} h={540}>{() => (
      <Slope w={1680} h={540} from="2022" to="2023" items={RATES} min={0} max={180} decimals={1} focus={useProp('focus', -1)} draw={useProp('draw', 0)} />
    )}</Part>
    <Animation>
      <Appear target={['ex5', 'slope']} at="start" dur={0} />
      <Tween target="ex5" to={{reveal: 1}} at="start" dur={0.7} easing="easeOutQuad" />
      <Tween target="slope" to={{draw: 1}} at="start" offset={0.2} dur={1.1} easing="easeInOutSine" />
      <Set target="slope" to={{focus: 0}} line="l7" word="Heart disease" />
      <Tween target="slope" to={{focus: 3}} line="l7" word="covid fell" dur={0.8} easing="easeInOutQuart" />
    </Animation>
  </Scene>

  <Scene id="share" title="The ten causes">
    <Line id="l8" text="Ten causes make up 70.9% of deaths.">Ten causes make up seventy point nine percent of deaths.</Line>
    <Part id="ex6">{() => <Exhibit fig="08" kicker="Causes of death" headline="Ten causes account for seven deaths in ten" unit="Share of all US deaths in 2023 (3,090,964 deaths), %" source="NCHS, Data Brief 521" reveal={useProp('reveal', 0)} />}</Part>
    <Part id="donut" x={120} y={262} w={1680} h={560}>{() => (
      <Donut w={1680} h={560} names={['The ten leading causes', 'All other causes']} values={[70.9, 29.1]} total={100} decimals={1}
        centre="70.9%" centreLabel="ten causes" grow={useProp('grow', 0)} share={useProp('share', -1)} />
    )}</Part>
    <Animation>
      <Appear target={['ex6', 'donut']} at="start" dur={0} />
      <Tween target="ex6" to={{reveal: 1}} at="start" dur={0.7} easing="easeOutQuad" />
      <Tween target="donut" to={{grow: 1}} line="l8" word="Ten causes" dur={1.2} easing="easeOutQuad" />
      <Set target="donut" to={{share: 0}} line="l8" word="seventy point nine" />
    </Animation>
  </Scene>

  <Scene id="split" title="A year before">
    <Line id="l8b" text="In 2022: 72.3%.">In twenty twenty-two: seventy-two point three.</Line>
    <Part id="ex6b">{() => <Exhibit fig="09" kicker="Causes of death" headline="The ten causes' share fell 1.4 points" unit="Share of all US deaths, 2022 and 2023, %" source="NCHS, Data Briefs 492 and 521" reveal={useProp('reveal', 0)} />}</Part>
    <Part id="split" x={120} y={262} w={1680} h={560}>{() => (
      <Split w={1680} names={['The ten leading causes', 'All other causes']} rows={[{label: '2022', parts: [72.3, 27.7]}, {label: '2023', parts: [70.9, 29.1]}]} total={100} decimals={1} barH={100}
        grow={useProp('grow', 0)} share={useProp('share', -1)} row={useProp('row', 1)} />
    )}</Part>
    <Animation>
      <Appear target={['ex6b', 'split']} at="start" dur={0} />
      <Tween target="ex6b" to={{reveal: 1}} at="start" dur={0.7} easing="easeOutQuad" />
      <Tween target="split" to={{grow: 1}} at="start" offset={0.2} dur={1.0} easing="easeOutQuad" />
      <Set target="split" to={{share: 0}} line="l8b" word="twenty twenty-two" />
      <Tween target="split" to={{row: 0}} line="l8b" word="twenty twenty-two" dur={0.5} easing="easeInOutQuart" />
    </Animation>
  </Scene>

  <Scene id="words" title="In its own words">
    <Line id="l10" text="The report: up 0.9 of a year.">The report: up nine tenths of a year.</Line>
    <Part id="ex8">{() => <Exhibit fig="10" kicker="The source" headline="The agency's summary of 2023" unit="Key findings, quoted exactly" source="NCHS, Data Brief 521, December 2024" reveal={useProp('reveal', 0)} />}</Part>
    <Part id="quote" x={120} y={290} w={1680} h={500}>{() => (
      <Excerpt w={1680} lines={['Life expectancy for the U.S. population', 'in 2023 was 78.4 years, an increase of', '0.9 year from 2022.']} size={60}
        by="Mortality in the United States, 2023" at={useProp('at', -1)} mark="0.9 year" marked={useProp('marked', 0)} />
    )}</Part>
    <Animation>
      <Appear target={['ex8', 'quote']} at="start" dur={0} />
      <Tween target="ex8" to={{reveal: 1}} at="start" dur={0.7} easing="easeOutQuad" />
      <Set target="quote" to={{at: 2}} line="l10" word="up nine tenths" offset={-0.2} />
      <Tween target="quote" to={{marked: 1}} line="l10" word="nine tenths" dur={0.6} easing="easeOutQuad" />
    </Animation>
  </Scene>

  <Scene id="findings" title="Findings">
    <Line id="l11">Four findings: a fall, a near recovery, a gap that stays, covid in retreat.</Line>
    <Part id="ex9">{() => <Exhibit fig="11" kicker="Summary" headline="Four findings" unit="What the exhibits show" source={SOURCE} reveal={useProp('reveal', 0)} />}</Part>
    <Part id="list" x={120} y={262} w={1680} h={540}>{() => (
      <List w={1680} h={520} items={[
        {stamp: 'FIG 01', text: 'Life expectancy fell 2.4 years from 2019 to 2021', value: '−2.4'},
        {stamp: 'FIG 03', text: 'By 2023 it was back to 78.4, still short of 2019', value: '78.4'},
        {stamp: 'FIG 04', text: 'Women outlive men by 5.3 years', value: '5.3'},
        {stamp: 'FIG 06', text: 'COVID-19 fell from fourth to tenth cause of death', value: '10th'},
      ]} shown={useProp('shown', 0)} at={useProp('at', -1)} />
    )}</Part>
    <Animation>
      <Appear target={['ex9', 'list']} at="start" dur={0} />
      <Tween target="ex9" to={{reveal: 1}} at="start" dur={0.7} easing="easeOutQuad" />
      <Set target="list" to={{at: 0}} line="l11" word="a fall" />
      <Tween target="list" to={{shown: 1}} line="l11" word="a fall" dur={0.4} easing="easeOutQuad" />
      <Tween target="list" to={{shown: 2, at: 1}} line="l11" word="a near recovery" dur={0.5} easing="easeOutQuad" />
      <Tween target="list" to={{shown: 3, at: 2}} line="l11" word="a gap that stays" dur={0.5} easing="easeOutQuad" />
      <Tween target="list" to={{shown: 4, at: 3}} line="l11" word="covid in retreat" dur={0.5} easing="easeOutQuad" />
    </Animation>
  </Scene>
</Doc>;
