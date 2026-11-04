// Data Brief's reel: twenty-two seconds of its components at a brisk pace, for a player. Not a template: read it for how the parts move.
// The figures are the sample's (NCHS, US life expectancy and causes of death); each scene is an exhibit, some with two figures side by side to show more of the parts.
import type {ReactNode} from 'react';
import {Easing, Sequence, interpolate, useTime} from '@motionhub/runtime';
import {Exhibit} from './parts/exhibit.tsx';
import {Cover} from './parts/cover.tsx';
import {Glossary} from './parts/glossary.tsx';
import {Excerpt} from './parts/excerpt.tsx';
import {Trend} from './parts/trend.tsx';
import {Columns} from './parts/columns.tsx';
import {Reading} from './parts/reading.tsx';
import {Ranking} from './parts/ranking.tsx';
import {Slope} from './parts/slope.tsx';
import {Split} from './parts/split.tsx';
import {Matrix} from './parts/matrix.tsx';
import {List} from './parts/list.tsx';
import {Donut} from './parts/donut.tsx';
import {Heatmap} from './parts/heatmap.tsx';

export const reel = {seconds: 22, width: 1920, height: 1080};
/** What happens when, for the motion's sound (sound.json): marks land, the guide slides, lines draw, figures count, exhibits cut */
export const cues = [
  {at: 0.2, role: 'land'}, {at: 1.3, role: 'draw', dur: 0.8},
  {at: 3.0, role: 'cut'}, {at: 4.0, role: 'move', dur: 0.8}, {at: 5.6, role: 'move', dur: 0.6},
  {at: 6.6, role: 'cut'}, {at: 6.9, role: 'draw', dur: 1.4}, {at: 8.6, role: 'move', dur: 0.9}, {at: 9.5, role: 'land'},
  {at: 10.2, role: 'cut'}, {at: 10.5, role: 'draw', dur: 0.9}, {at: 11.0, role: 'count', dur: 1.2}, {at: 12.0, role: 'move', dur: 0.7},
  {at: 13.4, role: 'cut'}, {at: 14.3, role: 'move', dur: 0.9}, {at: 15.0, role: 'draw', dur: 0.9},
  {at: 16.6, role: 'cut'}, {at: 16.8, role: 'draw', dur: 0.9}, {at: 17.9, role: 'move', dur: 0.6},
  {at: 19.4, role: 'cut'}, {at: 19.7, role: 'draw', dur: 0.6}, {at: 20.0, role: 'land'}, {at: 20.4, role: 'move', dur: 0.4},
];

const out = Easing.outQuad, slide = Easing.inOutQuart, ease = Easing.inOutSine;
const at = (t: number, from: number, to: number, a: number, b: number, easing = ease) => interpolate(t, [from, to], [a, b], {easing, clamp: true});

function Box({x, y, w, h, children}: {x: number; y: number; w: number; h: number; children: ReactNode}) {
  return <div style={{position: 'absolute', left: x, top: y, width: w, height: h}}>{children}</div>;
}

const YEARS = ['2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023'];
const LIFE = [78.7, 78.6, 78.7, 78.8, 77.0, 76.4, 77.5, 78.4];
const CHANGE = [-0.1, 0.1, 0.1, -1.8, -0.6, 1.1, 0.9];
const CAUSES = [{label: 'Heart disease', value: 162.1}, {label: 'Cancer', value: 141.8}, {label: 'Injuries', value: 62.3}, {label: 'Stroke', value: 39.0}, {label: 'Lung disease', value: 33.4}, {label: 'COVID-19', value: 11.9}];
const SRC = 'NCHS, Mortality in the United States, Data Briefs 328–521';

function Opening() {
  const t = useTime();
  return <Cover series="Health statistics · United States" date="Data to 2023" title={'How long\nAmericans live'} dek="Life expectancy at birth, and the causes of death behind it."
    contents={['Life expectancy', 'Year to year', 'The latest figure', 'Causes of death']} reveal={at(t, 0.1, 2.4, 0, 1, out)} />;
}

function Method() {
  const t = useTime();
  return (
    <>
      <Exhibit fig="1" figLabel="BOX" kicker="Method" headline="A measure of this year, not a forecast" unit="How the main figure is defined, and how the agency reports it" source="NCHS" reveal={at(t, 0, 0.6, 0, 1, out)} />
      <Box x={120} y={290} w={800} h={520}><Glossary w={800} terms={[{term: 'Life expectancy', kind: 'period measure · years', text: "How long a newborn would live if this year's death rates held.", mark: "this year's death rates"}]} reveal={at(t, 0.1, 0.9, 0, 1, out)} marked={at(t, 1.0, 1.8, 0, 1)} /></Box>
      <Box x={1000} y={330} w={800} h={420}>
        <Excerpt w={800} size={40} lines={['Life expectancy for the U.S.', 'population in 2023 was', '78.4 years, an increase of', '0.9 year from 2022.']} by="Mortality in the United States, 2023"
          at={t < 2.4 ? -1 : at(t, 2.6, 3.2, 1, 3, slide)} mark="0.9 year" marked={at(t, 3.2, 3.6, 0, 1, out)} shown={at(t, 1.6, 2.4, 0, 4)} />
      </Box>
    </>
  );
}

function Line() {
  const t = useTime();
  return (
    <>
      <Exhibit fig="01" kicker="Life expectancy" headline="Life expectancy fell 2.4 years in two years" unit="Life expectancy at birth, United States, years" source={SRC} reveal={at(t, 0, 0.6, 0, 1, out)} />
      <Box x={120} y={270} w={1680} h={540}>
        <Trend w={1680} h={540} categories={YEARS} series={[{label: 'All people', values: LIFE}]} min={74} max={80} step={1} decimals={1}
          draw={at(t, 0.3, 1.9, 0, 1)} at={t < 1.9 ? -1 : at(t, 2.0, 2.9, 3, 5, slide)} atLabel={t < 2.5 ? '2019' : '2021'}
          note={{series: 0, at: 5, lines: ['Lowest since 1996'], dx: 40, dy: 70}} noteDraw={at(t, 2.9, 3.6, 0, 1, out)} />
      </Box>
    </>
  );
}

function Figures() {
  const t = useTime();
  return (
    <>
      <Exhibit fig="02" kicker="Life expectancy" headline="Two years of losses, then a near recovery" unit="Change from the year before, and the 2023 figure, years" source={SRC} reveal={at(t, 0, 0.6, 0, 1, out)} />
      <Box x={120} y={270} w={820} h={540}>
        <Columns w={820} h={540} categories={YEARS.slice(1).map((y) => `’${y.slice(2)}`)} values={CHANGE} min={-2.5} max={1.5} step={0.5} decimals={1} signed
          grow={at(t, 0.3, 1.2, 0, 1, out)} at={t < 1.6 ? 3 : at(t, 1.8, 2.5, 3, 6, slide)} atLabel={t < 2.2 ? '2020' : '2023'} />
      </Box>
      <Box x={1020} y={290} w={780} h={520}>
        <Reading w={780} value={at(t, 0.8, 2.0, 75, 78.4, Easing.outQuart)} decimals={1} unit="years" label="Life expectancy, 2023" scaleMin={75} scaleMax={80} scaleStep={1}
          refs={[{value: 78.8, label: '2019'}]} fill={at(t, 0.8, 2.0, 0, 1, Easing.outQuart)} guideLabel="2023" />
      </Box>
    </>
  );
}

function Causes() {
  const t = useTime();
  const rates = [{label: 'Heart disease', a: 167.2, b: 162.1}, {label: 'Cancer', a: 142.3, b: 141.8}, {label: 'COVID-19', a: 44.5, b: 11.9, change: '−73%'}];
  return (
    <>
      <Exhibit fig="04" kicker="Causes of death" headline="The COVID-19 death rate fell 73% in a year" unit="Age-adjusted deaths per 100,000, 2022 and 2023" source="NCHS, Data Brief 521" reveal={at(t, 0, 0.6, 0, 1, out)} />
      <Box x={120} y={262} w={860} h={560}>
        <Ranking w={860} h={520} rows={CAUSES} max={180} step={60} decimals={1} grow={at(t, 0.2, 1.1, 0, 1, out)} at={t < 0.9 ? 0 : t < 2.2 ? at(t, 0.9, 1.8, 0, 5, slide) : -1} />
      </Box>
      <Box x={1040} y={290} w={760} h={520}>
        <Slope w={760} h={500} from="2022" to="2023" items={rates} min={0} max={180} decimals={1} focus={t < 2.2 ? -1 : 2} draw={at(t, 1.6, 2.5, 0, 1)} />
      </Box>
    </>
  );
}

function Shares() {
  const t = useTime();
  return (
    <>
      <Exhibit fig="08" kicker="Causes and sexes" headline="Seven deaths in ten; women ahead every year" unit="Share of US deaths, 2023, %; life expectancy by sex, years" source="NCHS, Data Brief 521" reveal={at(t, 0, 0.6, 0, 1, out)} />
      <Box x={120} y={262} w={800} h={560}>
        <Donut w={800} h={520} names={['Ten leading causes', 'All others']} values={[70.9, 29.1]} total={100} decimals={1} centre="70.9%" grow={at(t, 0.2, 1.1, 0, 1, out)} share={t < 1.0 || t >= 1.6 ? -1 : 0} />
      </Box>
      <Box x={1000} y={300} w={800} h={500}>
        <Heatmap w={800} h={440} rows={['Women', 'Men']} columns={['’19', '’20', '’21', '’22', '’23']} values={[[81.4, 79.9, 79.3, 80.2, 81.1], [76.3, 74.2, 73.5, 74.8, 75.8]]}
          min={72} max={82} decimals={1} unit="years" shown={at(t, 0.4, 1.2, 0, 1, out)} at={t < 1.6 ? -1 : at(t, 1.6, 2.2, 0, 2, slide)} atLabel="2021" cell={1} />
      </Box>
    </>
  );
}

function Close() {
  const t = useTime();
  return (
    <>
      <Exhibit fig="09" kicker="Summary" headline="Seven in ten deaths come from ten causes" unit="Share of US deaths, 2023, and life expectancy by sex" source="NCHS, Data Brief 521" reveal={at(t, 0, 0.6, 0, 1, out)} />
      <Box x={120} y={300} w={1680} h={200}>
        <Split w={1680} names={['The ten leading causes', 'All other causes']} rows={[{label: '2023', parts: [70.9, 29.1]}]} total={100} decimals={1} barH={96} grow={at(t, 0.2, 0.9, 0, 1, out)} share={t < 0.8 || t >= 1.3 ? -1 : 0} />
      </Box>
      <Box x={120} y={560} w={860} h={260}>
        <Matrix w={860} h={260} columns={[{name: '2019'}, {name: '2023'}]} rows={[{label: 'Women', cells: ['81.4', '81.1']}, {label: 'Men', cells: ['76.3', '75.8']}]} rowH={70}
          shown={at(t, 0.5, 1.1, 0, 2, out)} at={t < 1.3 || t >= 1.9 ? -1 : at(t, 1.3, 1.6, 0, 1, slide)} best={1} />
      </Box>
      <Box x={1040} y={560} w={760} h={260}>
        <List w={760} h={240} items={[{text: 'A fall of 2.4 years'}, {text: 'A near recovery'}, {text: 'COVID-19 in retreat'}]} shown={at(t, 0.5, 1.1, 0, 3, out)} at={t < 1.9 ? -1 : at(t, 1.9, 2.4, 0, 2, slide)} />
      </Box>
    </>
  );
}

export default function Reel() {
  return (
    <div style={{position: 'absolute', inset: 0, background: 'var(--color-bg)'}}>
      <Sequence from={0} duration={3.0}><Opening /></Sequence>
      <Sequence from={3.0} duration={3.6}><Method /></Sequence>
      <Sequence from={6.6} duration={3.6}><Line /></Sequence>
      <Sequence from={10.2} duration={3.2}><Figures /></Sequence>
      <Sequence from={13.4} duration={3.2}><Causes /></Sequence>
      <Sequence from={16.6} duration={2.8}><Shares /></Sequence>
      <Sequence from={19.4}><Close /></Sequence>
    </div>
  );
}
