// Signal Grid's sample: one example among many. Do not reuse its story, scenes, layout or timings; read it for technique, after your own scenes are planned.
// Why leap years exist, as a seven-page lecture on one board that never cuts: every module is a part of <Doc>, so the sheet stays and the modules re-flow.
// Sources: the mean tropical year (365.2422 days) and the Gregorian rule, U.S. Naval Observatory, "Introduction to Calendars"
// (aa.usno.navy.mil/faq/calendars); the reform of 1582 and its dates, the bull Inter gravissimas (24 February 1582);
// Britain's change, the Calendar (New Style) Act 1750 (2 September 1752 followed by 14 September); Greece, 16 February 1923 followed by 1 March.
// The arithmetic: 365.25 − 365.2422 = 0.0078 days (11 min 14 s) a year; × 1,257 years (AD 325 to 1582) = 9.8 days;
// 365.2425 − 365.2422 = 0.0003 days (about 26 s) a year; over 1,000 years 7.8 and 0.3 days.
import {Doc, Scene, Line, Part, Animation, Appear, Disappear, Tween, Set} from '@visotalk/jsx';
import React from 'react';
import {useProp} from '@visotalk/runtime';
import {Sheet} from '../parts/sheet.tsx';
import {Headline} from '../parts/headline.tsx';
import {Diagram} from '../parts/diagram.tsx';
import {Figures} from '../parts/figures.tsx';
import {Flow} from '../parts/flow.tsx';
import {Working} from '../parts/working.tsx';
import {Plot} from '../parts/plot.tsx';
import {Timeline} from '../parts/timeline.tsx';
import {Card} from '../parts/card.tsx';
import {Points} from '../parts/points.tsx';
import {Listing} from '../parts/code.tsx';
import {Table} from '../parts/table.tsx';
import {Passage} from '../parts/passage.tsx';
import {Compare} from '../parts/compare.tsx';
import {Bars} from '../parts/bars.tsx';
import {Share} from '../parts/share.tsx';
import {Turn} from '../parts/turn.tsx';

// The orbit, in units of a 150 × 72 box: the Sun, the start of a year, and where 365 days end (the gap exaggerated).
const ORBIT = [
  {type: 'ellipse', cx: 75, cy: 37, rx: 48, ry: 30},
  {type: 'path', d: 'M75 37 L95.3 9.8 A48 30 0 0 0 75 7 Z', fill: 'faint', part: 2},
  {type: 'circle', cx: 75, cy: 37, r: 7, fill: 'ink'},
  {type: 'circle', cx: 75, cy: 7, r: 3.4, fill: 'paper'},
  {type: 'circle', cx: 95.3, cy: 9.8, r: 3.4, fill: 'paper'},
  {type: 'arrow', x1: 55, y1: 64.4, x2: 71, y2: 66.9},
];
const ORBIT_LABELS = [
  {text: 'Sun', at: [75, 37], pos: [43, 48]},
  {text: 'Spring equinox', at: [75, 7], pos: [39, 3]},
  {text: '365 days later', at: [95.3, 9.8], pos: [111, 2]},
];

const QUARTERS = [
  {label: 'Year 1', sub: '¼ day over'},
  {label: 'Year 2', sub: '½ day over'},
  {label: 'Year 3', sub: '¾ day over'},
  {label: 'Year 4', sub: 'one whole day: 29\u00a0February'},
];

const JULIAN = [
  {expr: '365 + {¼} = 365.25 days', note: 'Julian year'},
  {expr: '365.25 − 365.2422 = {0.0078} days', note: '11 min 14 s'},
  {expr: '0.0078 × 1,257 = {9.8} days', note: '325 → 1582'},
];

const EVENTS = [
  {date: '45 BC', title: 'Julian calendar', sub: 'Rome'},
  {date: '325', title: 'Council of Nicaea', sub: 'equinox on 21 March'},
  {date: '1582', title: 'Gregorian reform', sub: 'ten days cut'},
  {date: '1752', title: 'Britain switches', sub: 'eleven days cut'},
  {date: '1923', title: 'Greece switches', sub: 'thirteen days cut'},
];

const RULES = [
  {title: 'Divisible by {4}', body: 'a leap year', tag: '366 days'},
  {title: 'Divisible by {100}', body: 'not a leap year', tag: '365 days'},
  {title: 'Divisible by {400}', body: 'a leap year after all', tag: '366 days'},
];

const CODE = [
  'def is_leap(year):',
  '    if year % 400 == 0: return True',
  '    if year % 100 == 0: return False',
  '    return year % 4 == 0',
];

const YEARS = [
  ['1900', 'yes', 'yes', 'no', '{No}'],
  ['2000', 'yes', 'yes', 'yes', '{Yes}'],
  ['2024', 'yes', 'no', 'no', 'Yes'],
  ['2100', 'yes', 'yes', 'no', 'No'],
];

const CALENDARS = [
  {label: 'Julian · 45 BC', rule: 'every 4th year', examples: ['{100} leap days in 400 years', 'a year of {365.25} days'], key: '+ 11 min 14 s a year'},
  {label: 'Gregorian · 1582', rule: 'every 4th; centuries if ÷ 400', examples: ['{97} leap days in 400 years', 'a year of {365.2425} days'], key: '+ 26 s a year'},
];

/** A module entering in the columns the board freed: unrolled left to right from its column line (x px), while the grid shows. */
const Enter = ({x, e, children}: {x: number; e: number; children: React.ReactNode}) => (
  <div style={{position: 'absolute', inset: 0, clipPath: `inset(0 ${Math.round((1920 - x) * (1 - Math.min(1, Math.max(0, e))))}px 0 ${x - 4}px)`}}>{children}</div>
);

const DRIFT = [
  {label: 'Julian', value: 7.8, shown: '7.8 days'},
  {label: 'Gregorian', value: 0.3, shown: '0.3 days'},
];

export default <Doc
  id="signal-grid-sample"
  title="Why February has a 29th"
  poster={45.0}
  lang="en"
  canvas="16x9"
  theme="visotalk/light"
  tokens={{
    colors: {bg: '#EDEEEB', panel: '#FBFBFA', panel2: '#E2E4E1', border: '#0E0F11', text: '#0E0F11', muted: '#5D6166', faint: '#BFC3C2', data: '#FFD21F', grad: '#FFE66E', op: '#0E0F11', good: '#1F7A4D', bad: '#C23A22', warn: '#FFD21F'},
    fonts: {sans: '"Hanken Grotesk", "Noto Sans SC", sans-serif', mono: '"JetBrains Mono", "Noto Sans SC", monospace', display: '"Hanken Grotesk", "Noto Sans SC", sans-serif'},
    caption: {font: 'sans', size: 34, weight: 600, color: '#F4F5F2', background: '#0E0F11', radius: 0, padding: [10, 26], bottom: 58, rule: '#FFD21F', ruleSide: 'left'},
  }}
  pacing={{lead: 0.3, hold: 0.4, tail: 0.6}}
  exports={{captions: 'burned'}}
>
  <Part id="sheet">{() => <Sheet head="Calendars · Lecture 1" folio={useProp('folio', '01 / 07')} reveal={useProp('reveal', 0)} litCol={useProp('litCol', 1)} litSpan={useProp('litSpan', 0)} slot={useProp('slotOn', 0) ? {col: 8, span: 5, top: 340, height: 500} : null} />}</Part>

  <Part id="head-year"><Headline kicker="§1 · The year" title="Why does February sometimes have a 29th?" /></Part>
  <Part id="orbit">{() => <Diagram shapes={ORBIT} labels={ORBIT_LABELS} box={[150, 72]} index="A" label="One orbit, seen from above (the gap enlarged)" col={1} span={7} top={340} height={430} draw={useProp('draw', 0)} shown={useProp('shown', 0)} focus={useProp('focus', -1)} />}</Part>
  <Part id="leftover">{() => <Share items={[{label: 'left over', value: 0.2422, shown: '0.2422'}, {label: 'the rest of a day', value: 0.7578, shown: '0.7578'}]} index="B" label="The extra day, in parts" col={8} span={5} top={660} fill={useProp('fill', 0)} focus={useProp('focus', -1)} />}</Part>
  <Part id="year">{() => <Figures items={[{value: '365.2422', label: 'days in a year of seasons', note: 'the mean tropical year · USNO'}]} col={8} span={5} top={340} size={112} count={useProp('count', 0)} focus={useProp('focus', -1)} />}</Part>

  <Part id="head-quarter"><Headline kicker="§2 · The leap day" title="Four quarters make one leap day" /></Part>
  <Part id="quarters">{() => <Flow steps={QUARTERS} index="B" label="What the leftover adds up to" top={360} shown={useProp('shown', 1)} focus={useProp('focus', 0)} loop={{from: 3, to: 0, label: 'and the count starts again'}} looped={useProp('looped', 0)} />}</Part>

  <Part id="leap">{() => <Passage text={"A leap year has 366 days: the extra one is {29\u00a0February}."} index="C" label="The leap day" col={1} span={12} top={744} size={40} mark={useProp('mark', 0)} />}</Part>

  <Part id="head-julian"><Headline kicker="§3 · 45 BC" title="Caesar's year was eleven minutes too long" /></Part>
  <Part id="julian">{() => <Working steps={JULIAN} index="D" label="The error, worked" col={useProp('col', 1)} span={7} top={340} size={46} shown={useProp('shown', 1)} focus={useProp('focus', 0)} mark={useProp('mark', 1)} />}</Part>
  <Part id="drift">{() => <Enter x={1118} e={useProp('enter', 0)}><Plot series={[{label: '', points: [[325, 0], [1582, 9.8]]}]} x={{min: 325, max: 1582, ticks: [325, 1000, 1582], labels: ['AD 325', '1000', '1582']}} y={{min: 0, max: 12, ticks: [0, 0.5, 1, 4, 8, 12], title: 'days early'}} ymax={useProp('ymax', 1.2)} head="{v} days"
    marks={[{at: [1582, 9.8], label: '9.8 days', side: 'left'}]} index="E" label="The spring equinox, days early" col={8} span={5} top={340} height={380} draw={useProp('draw', 0)} marked={useProp('marked', 0)} focus={useProp('focus', -1)} /></Enter>}</Part>

  <Part id="head-reform"><Headline kicker="§4 · 1582" title="Ten days that never happened" /></Part>
  <Part id="events">{() => <Timeline events={EVENTS} index="F" label="The calendar changes" top={340} span={useProp('span', 12)} shown={useProp('shown', 5)} open={useProp('open', -1)} />}</Part>
  <Part id="bull">{() => <Enter x={1118} e={useProp('enter', 0)}><Card tab="24 Feb 1582 · Inter gravissimas" title="Ten days, cut" body="Thursday 4 October 1582 was followed by Friday 15 October." figure="10" figureLabel="days left out, to put the equinox back on 21 March" col={8} top={340} height={500} /></Enter>}</Part>

  <Part id="head-rule"><Headline kicker="§5 · The rule" title="Four, a hundred, four hundred" /></Part>
  <Part id="rules">{() => <Points items={RULES} index="G" label="Gregory's rule" col={useProp('col', 1)} span={useProp('span', 6)} top={340} shown={useProp('shown', 0)} focus={useProp('focus', -1)} />}</Part>
  <Part id="code">{() => <Enter x={972} e={useProp('enter', 0)}><Listing lines={CODE} index="H" label="is_leap.py" col={7} span={6} top={340} size={30} marked={useProp('marked', -1)} mark={useProp('mark', 0)} note="← first" foot="is_leap(1900) → False · is_leap(2000) → True" /></Enter>}</Part>

  <Part id="head-test"><Headline kicker="§6 · Test it" title="1900 was not a leap year. 2000 was." /></Part>
  <Part id="years">{() => <Table head={['Year', '÷ 4', '÷ 100', '÷ 400', 'Leap year']} rows={YEARS} index="I" label="Four years through the rule" col={1} span={7} top={340} shown={useProp('shown', 0)} focus={useProp('focus', -1)} mark={useProp('mark', 0)} />}</Part>

  <Part id="head-sum"><Headline kicker="§7 · Two calendars" title="Three days fewer every four hundred years" /></Part>
  <Part id="calendars">{() => <Compare columns={CALENDARS} keyLabel="Error" col={1} span={8} top={340} size={38} mark={useProp('mark', 0)} focus={useProp('focus', -1)} />}</Part>
  <Part id="drift-bars">{() => <Bars rows={DRIFT} index="C" label="Drift in 1,000 years" col={9} span={4} top={340} grow={useProp('grow', 0)} focus={useProp('focus', -1)} note="days the calendar slips" />}</Part>

  <Part id="turn" z={10}>{() => <Turn turn={useProp('turn', 0)} label={useProp('label', '')} />}</Part>

  <Scene id="year" title="The year">
    <Line id="l1" text="A calendar counts whole days, but a year of seasons lasts 365.2422 days.">A calendar counts whole days, but a year of seasons lasts three hundred and sixty-five point two four two two days.</Line>
    <Animation>
      <Appear target={['sheet', 'head-year', 'turn']} at="start" dur={0} />
      <Set target="sheet" to={{litCol: 1, litSpan: 7}} at="start" />
      <Appear target="orbit" at="start" dur={0} />
      <Tween target="orbit" to={{draw: 1}} line="l1" word="calendar" dur={1.6} easing="easeInOutSine" />
      <Tween target="orbit" to={{shown: 3}} line="l1" word="whole days" dur={0.9} easing="linear" />
      <Appear target="year" line="l1" word="a year of seasons" dur={0.3} />
      <Tween target="sheet" to={{litCol: 8, litSpan: 5}} line="l1" word="a year of seasons" dur={0.6} easing="easeInOutQuad" />
      <Tween target="year" to={{count: 1}} line="l1" word="a year of seasons" dur={1.8} easing="easeOutQuart" />
      <Set target="year" to={{focus: 0}} line="l1" word="point two four two two" />
      <Appear target="leftover" line="l1" word="point two four two two" dur={0.3} />
      <Tween target="leftover" to={{fill: 1}} line="l1" word="point two four two two" dur={1} easing="easeOutQuad" />
      <Set target="year" to={{focus: -1}} line="l1" edge="end" />
      <Set target="leftover" to={{focus: 0}} line="l1" edge="end" />
      <Set target="orbit" to={{focus: 2}} line="l1" word="whole days" offset={0.5} />
      <Set target="orbit" to={{focus: -1}} line="l1" word="a year of seasons" />
                </Animation>
  </Scene>

  <Scene id="quarter" title="The leap day">
    <Line id="l2" text="That is almost a quarter of a day over each year: in four years, one whole day, the 29th of February.">That is almost a quarter of a day over each year: in four years, one whole day, the twenty-ninth of February.</Line>
    <Animation>
      <Set target="turn" to={{turn: 0, label: '+ ¼ day'}} at="start" />
      <Tween target="turn" to={{turn: 1}} at="start" dur={1} easing="linear" />
      <Disappear target={['orbit', 'year', 'leftover', 'head-year']} at={0.45} dur={0} />
      <Set target="sheet" to={{folio: '02 / 07'}} at={0.45} />
      <Tween target="sheet" to={{reveal: 1, litCol: 1, litSpan: 3}} at="start" dur={0.5} easing="easeInOutQuad" />
      <Appear target={['head-quarter', 'quarters']} at={0.5} dur={0} />
      <Tween target="sheet" to={{reveal: 0}} line="l2" word="quarter" dur={0.6} easing="easeOutSine" />
      <Set target="quarters" to={{shown: 2, focus: 1}} line="l2" word="each year" />
      <Tween target="sheet" to={{litCol: 4}} line="l2" word="each year" dur={0.35} easing="easeInOutQuad" />
      <Set target="quarters" to={{shown: 3, focus: 2}} line="l2" word="in four years" />
      <Tween target="sheet" to={{litCol: 7}} line="l2" word="in four years" dur={0.35} easing="easeInOutQuad" />
      <Set target="quarters" to={{shown: 4, focus: 3}} line="l2" word="one whole day" />
      <Tween target="sheet" to={{litCol: 10}} line="l2" word="one whole day" dur={0.35} easing="easeInOutQuad" />
      <Tween target="quarters" to={{looped: 1}} line="l2" word="one whole day" offset={0.3} dur={1} easing="easeInOutSine" />
      <Appear target="leap" line="l2" word="one whole day" offset={0.3} dur={0.3} />
      <Set target="quarters" to={{focus: -1}} line="l2" word="twenty-ninth" />
      <Tween target="sheet" to={{litCol: 1, litSpan: 12}} line="l2" word="twenty-ninth" dur={0.4} easing="easeInOutQuad" />
      <Tween target="leap" to={{mark: 1}} line="l2" word="twenty-ninth" dur={0.5} easing="easeOutQuad" />
    </Animation>
  </Scene>

  <Scene id="julian" title="Caesar's year">
    <Line id="l3" text="Julius Caesar's calendar added that day every fourth year.">Julius Caesar's calendar added that day every fourth year.</Line>
    <Line id="l4" text="But that year is eleven minutes too long, and by 1582 the seasons were ten days off.">But that year is eleven minutes too long, and by fifteen eighty-two the seasons were ten days off.</Line>
    <Animation>
      <Set target="turn" to={{turn: 0, label: '45 BC'}} at="start" />
      <Tween target="turn" to={{turn: 1}} at="start" dur={1} easing="linear" />
      <Disappear target={['quarters', 'leap', 'head-quarter']} at={0.45} dur={0} />
      <Set target="sheet" to={{folio: '03 / 07'}} at={0.45} />
      <Appear target={['head-julian', 'julian']} at={0.5} dur={0} />
      <Set target="sheet" to={{litCol: 1, litSpan: 7}} at={0.3} />
      <Set target="julian" to={{shown: 2, focus: 1, mark: 0}} line="l4" word="eleven minutes" />
      <Tween target="julian" to={{mark: 1}} line="l4" word="eleven minutes" dur={0.5} easing="easeOutQuad" />
      <Tween target="sheet" to={{reveal: 1}} line="l3" word="added" dur={0.4} easing="easeOutSine" />
      <Appear target="drift" line="l3" word="added" dur={0} />
      <Tween target="drift" to={{enter: 1}} line="l3" word="added" dur={0.9} easing="easeOutQuart" />
      <Tween target="sheet" to={{reveal: 0}} line="l3" word="every fourth" dur={0.5} easing="easeOutSine" />
      <Tween target="julian" to={{mark: 0}} line="l4" word="too long" dur={0.3} easing="easeOutQuad" />
      <Tween target="sheet" to={{litCol: 8, litSpan: 5}} line="l4" word="too long" dur={0.5} easing="easeInOutQuad" />
      <Tween target="drift" to={{draw: 0.1}} line="l4" word="too long" dur={1.1} easing="linear" />
      <Tween target="drift" to={{ymax: 12}} line="l4" word="by fifteen" dur={1.3} easing="easeInOutQuart" />
      <Tween target="drift" to={{draw: 1}} line="l4" word="by fifteen" dur={1.5} easing="easeInOutSine" />
      <Set target="drift" to={{focus: 0}} line="l4" word="ten days" />
      <Set target="julian" to={{shown: 3, focus: 2}} line="l4" word="ten days" />
      <Tween target="drift" to={{marked: 1}} line="l4" word="ten days" dur={0.4} easing="easeOutQuad" />
    </Animation>
  </Scene>

  <Scene id="reform" title="1582">
    <Line id="l5" text="So Pope Gregory cut ten days: Thursday, the 4th of October, was followed by Friday, the 15th." hold={0.4}>So Pope Gregory cut ten days: Thursday, the fourth of October, was followed by Friday, the fifteenth.</Line>
    <Animation>
      <Set target="turn" to={{turn: 0, label: '1582'}} at="start" />
      <Tween target="turn" to={{turn: 1}} at="start" dur={1} easing="linear" />
      <Disappear target={['julian', 'drift', 'head-julian']} at={0.45} dur={0} />
      <Set target="sheet" to={{folio: '04 / 07', litCol: 1, litSpan: 12}} at={0.45} />
      <Appear target={['head-reform', 'events']} at={0.5} dur={0} />
      <Set target="events" to={{open: 2}} line="l5" word="gregory" />
      <Tween target="sheet" to={{reveal: 1, litCol: 8, litSpan: 5}} line="l5" word="cut ten days" dur={0.6} easing="easeInOutQuad" />
      <Set target="sheet" to={{slotOn: 1}} line="l5" word="cut ten days" />
      <Tween target="events" to={{span: 7}} line="l5" word="cut ten days" dur={1.1} easing="easeInOutQuad" />
      <Appear target="bull" line="l5" word="cut ten days" dur={0} />
      <Tween target="bull" to={{enter: 1}} line="l5" word="cut ten days" offset={0.2} dur={1.2} easing="easeOutQuart" />
      <Tween target="sheet" to={{reveal: 0}} line="l5" word="thursday" dur={0.5} easing="easeOutSine" />
    </Animation>
  </Scene>

  <Scene id="rule" title="The rule">
    <Line id="l6" text="His rule: every fourth year, but not whole centuries, unless they divide by four hundred." hold={1}>His rule: every fourth year, but not whole centuries, unless they divide by four hundred.</Line>
    <Animation>
      <Set target="turn" to={{turn: 0, label: '÷ 400'}} at="start" />
      <Tween target="turn" to={{turn: 1}} at="start" dur={1} easing="linear" />
      <Disappear target={['events', 'bull', 'head-reform']} at={0.45} dur={0} />
      <Set target="sheet" to={{folio: '05 / 07', slotOn: 0, litCol: 1, litSpan: 6}} at={0.45} />
      <Appear target={['head-rule', 'rules']} at={0.5} dur={0} />
      <Set target="rules" to={{shown: 1, focus: 0}} line="l6" word="every fourth" />
      <Set target="rules" to={{shown: 2, focus: 1}} line="l6" word="not whole centuries" />
      <Set target="rules" to={{shown: 3, focus: 2}} line="l6" word="four hundred" />
      <Tween target="sheet" to={{reveal: 1}} line="l6" word="whole centuries" dur={0.4} easing="easeOutSine" />
      <Appear target="code" line="l6" word="whole centuries" dur={0} />
      <Tween target="code" to={{enter: 1}} line="l6" word="whole centuries" dur={0.9} easing="easeOutQuart" />
      <Tween target="sheet" to={{litCol: 7, litSpan: 6}} line="l6" edge="end" dur={0.5} easing="easeInOutQuad" />
      <Tween target="sheet" to={{reveal: 0}} line="l6" word="unless" dur={0.5} easing="easeOutSine" />
      <Set target="rules" to={{focus: -1}} line="l6" edge="end" />
      <Set target="code" to={{marked: 1}} line="l6" edge="end" />
      <Tween target="code" to={{mark: 1}} line="l6" edge="end" dur={0.5} easing="easeOutQuad" />
    </Animation>
  </Scene>

  <Scene id="test" title="Test it">
    <Line id="l7" text="So 1900 was not a leap year, but 2000 was." hold={1}>So nineteen hundred was not a leap year, but two thousand was.</Line>
    <Animation>
      <Disappear target={['code', 'head-rule']} at="start" dur={0.3} />
      <Set target="sheet" to={{folio: '06 / 07', litCol: 1, litSpan: 7}} at="start" />
      <Appear target="head-test" at={0.3} dur={0.35} />
      <Tween target="sheet" to={{reveal: 1}} at="start" dur={0.3} easing="easeOutSine" />
      <Tween target="rules" to={{col: 8, span: 5}} at="start" dur={1} easing="easeInOutQuad" />
      <Appear target="years" at={0.7} dur={0.35} />
      <Tween target="years" to={{shown: 4}} at={0.7} dur={0.8} easing="linear" />
      <Tween target="sheet" to={{reveal: 0}} at={1.1} dur={0.5} easing="easeOutSine" />
      <Set target="years" to={{focus: 0}} line="l7" word="nineteen hundred" />
      <Tween target="years" to={{mark: 1}} line="l7" word="not a leap" dur={0.5} easing="easeOutQuad" />
      <Set target="years" to={{focus: 1, mark: 0}} line="l7" word="two thousand" />
      <Tween target="years" to={{mark: 1}} line="l7" word="two thousand" dur={0.5} easing="easeOutQuad" />
                </Animation>
  </Scene>

  <Scene id="sum" title="Two calendars">
    <Line id="l8" text="Caesar's calendar has 100 leap days in 400 years; Gregory's has 97.">Caesar's calendar has a hundred leap days in four hundred years; Gregory's has ninety-seven.</Line>
    <Line id="l9" text="In a thousand years, one drifts almost eight days; the other, a third of one." hold={1}>In a thousand years, one drifts almost eight days; the other, a third of one.</Line>
    <Animation>
      <Set target="turn" to={{turn: 0, label: '100 vs 97'}} at="start" />
      <Tween target="turn" to={{turn: 1}} at="start" dur={1} easing="linear" />
      <Disappear target={['years', 'rules', 'head-test']} at={0.45} dur={0} />
      <Set target="sheet" to={{folio: '07 / 07', litCol: 1, litSpan: 4}} at={0.45} />
      <Appear target={['head-sum', 'calendars']} at={0.5} dur={0} />
      <Set target="calendars" to={{focus: 0}} line="l8" word="caesar's" />
      <Set target="calendars" to={{focus: 1}} line="l8" word="gregory's" />
      <Tween target="sheet" to={{litCol: 5}} line="l8" word="gregory's" dur={0.5} easing="easeInOutQuad" />
      <Tween target="calendars" to={{mark: 1}} line="l8" word="ninety-seven" dur={0.5} easing="easeOutQuad" />
      <Tween target="calendars" to={{mark: 0}} line="l9" dur={0.3} easing="easeOutQuad" />
      <Set target="calendars" to={{focus: -1}} line="l9" offset={0.3} />
      <Appear target="drift-bars" line="l9" dur={0.3} />
      <Tween target="sheet" to={{litCol: 9, litSpan: 4}} line="l9" dur={0.6} easing="easeInOutQuad" />
      <Tween target="drift-bars" to={{grow: 1}} line="l9" word="drifts" dur={1.2} easing="easeOutQuart" />
      <Set target="drift-bars" to={{focus: 1}} line="l9" word="a third" />
    </Animation>
  </Scene>
</Doc>;
