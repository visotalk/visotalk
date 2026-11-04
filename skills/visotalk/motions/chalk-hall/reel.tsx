// Chalk Hall's reel: twenty seconds of its components at a brisk pace over three boards (a circuit, a comparison, bars), for a player. Not a template: read it for how the parts move.
import type {ReactNode} from 'react';
import {Easing, Sequence, interpolate, useTime} from '@motionhub/runtime';
import {Board} from './parts/board.tsx';
import {Heading} from './parts/heading.tsx';
import {Plot} from './parts/plot.tsx';
import {Working} from './parts/working.tsx';
import {Wipe} from './parts/wipe.tsx';
import {ChalkLine} from './parts/line.tsx';
import {ChalkWord} from './parts/write.tsx';
import {BoardSymbol} from './parts/symbol.tsx';
import {BoardTable} from './parts/table.tsx';
import {ChalkMark} from './parts/mark.tsx';
import {handLine} from './parts/chalk.ts';

export const reel = {seconds: 20, width: 1920, height: 1080};

/** What happens when, for the motion's sound (sound.json): chalk writes or draws, a mark lands, the eraser sweeps, a bar is raised, the last box closes */
export const cues = [
  {at: 0.0, role: 'draw', dur: 0.6}, {at: 0.3, role: 'draw', dur: 1.0}, {at: 1.2, role: 'draw', dur: 1.0}, {at: 2.2, role: 'draw', dur: 0.5},
  {at: 2.8, role: 'land'}, {at: 3.1, role: 'draw', dur: 0.4}, {at: 3.6, role: 'draw', dur: 2.3}, {at: 5.9, role: 'land'}, {at: 6.4, role: 'move', dur: 2.2},
  {at: 8.6, role: 'draw', dur: 0.6}, {at: 9.0, role: 'draw', dur: 0.6}, {at: 9.6, role: 'draw', dur: 0.8}, {at: 10.8, role: 'draw', dur: 0.8},
  {at: 12.0, role: 'draw', dur: 1.0}, {at: 13.1, role: 'land'}, {at: 13.6, role: 'land'},
  {at: 14.8, role: 'cut'}, {at: 15.3, role: 'draw', dur: 0.8}, {at: 16.2, role: 'count'}, {at: 16.5, role: 'count'}, {at: 16.8, role: 'count'},
  {at: 17.1, role: 'count'}, {at: 17.4, role: 'count'}, {at: 17.8, role: 'draw', dur: 0.5}, {at: 18.3, role: 'land'}, {at: 18.4, role: 'draw', dur: 0.5}, {at: 18.9, role: 'out'},
];

const hand = Easing.inOutSine, lin = Easing.linear;
/** A stroke's progress: the hand eases in and out of a line; writing is linear */
const at = (t: number, a: number, b: number, to = 1, from = 0, easing = hand) => interpolate(t, [a, b], [from, to], {easing});

function Box({x, y, w, h, children}: {x: number; y: number; w: number; h: number; children: ReactNode}) {
  return <div style={{position: 'absolute', left: x, top: y, width: w, height: h}}>{children}</div>;
}

// a series circuit in a box of 900 x 560: the cell on the left, the lamp at the top, the ammeter on the right, the switch at the foot
const L = 80, R = 780, T = 70, F = 470;
const WIRES = [
  handLine([L, F], [L, 325], 'w1'), handLine([L, 215], [L, T], 'w2'), handLine([L, T], [378, T], 'w3'), handLine([482, T], [R, T], 'w4'),
  handLine([R, T], [R, 224], 'w5'), handLine([R, 336], [R, F], 'w6'), handLine([R, F], [487, F], 'w7'), handLine([373, F], [L, F], 'w8'),
];

/** 0–8.6 s: a circuit built piece by piece, its switch closed, the power worked and boxed; then the eraser takes the board */
function Circuit() {
  const t = useTime(), parts = at(t, 1.2, 2.2), names = at(t, 2.2, 2.7, 1, 0, lin);
  const box = (x: number, y: number, child: ReactNode, tr = 'translate(-50%, -50%)') => <div style={{position: 'absolute', left: x, top: y, transform: tr}}>{child}</div>;
  return (
    <>
      <Box x={110} y={48} w={1700} h={150}><Heading width={1700} title="Power in a circuit" aside="Physics · 3" write={at(t, 0, 0.6, 1, 0, lin)} /></Box>
      <Box x={100} y={220} w={900} h={560}>
        <ChalkLine width={900} height={560} weight={6} draw={at(t, 0.3, 1.3)} strokes={WIRES} />
        <BoardSymbol kind="cell" at={[L, 270]} size={110} rotate={90} width={900} height={560} draw={parts} />
        <BoardSymbol kind="lamp" at={[430, T]} size={110} width={900} height={560} draw={parts} />
        <BoardSymbol kind="meter" letter="A" at={[R, 280]} size={120} rotate={90} width={900} height={560} draw={parts} />
        <BoardSymbol kind="switch" at={[430, F]} size={110} open={at(t, 2.8, 3.1, 0, 1)} width={900} height={560} draw={parts} />
        <ChalkLine width={900} height={560} chalk="pink" weight={5} arrow draw={at(t, 3.1, 3.5)} strokes={[handLine([700, F - 40], [560, F - 40], 'current')]} />
        {box(L - 40, 270, <ChalkWord text="[12 V]" size={52} write={names} />, 'translate(-100%, -50%)')}
        {box(430, T + 66, <ChalkWord text="lamp" size={46} write={names} />)}
        {box(R + 76, 280, <ChalkWord text="[0.5 A]" size={52} write={names} />, 'translate(0, -50%)')}
      </Box>
      <Box x={1080} y={300} w={800} h={500}>
        <Working size={80} column={80} write={interpolate(t, [3.6, 4.5, 4.7, 5.4, 5.5, 5.9], [0, 1, 1, 2, 2, 3], {easing: lin})} box={at(t, 5.9, 6.4)}
          lines={['P = V × I | power', 'P = [12 V] × [0.5 A]', 'P = 6 W']} />
      </Box>
      <Wipe progress={at(t, 6.4, 8.6, 1, 0, lin)} />
    </>
  );
}

/** 8.6–14.8 s (from 0 here): a T-chart filled row by row over the old board's ghost, the conclusion written, underlined and ticked */
function Compare() {
  const t = useTime();
  return (
    <>
      <Box x={110} y={48} w={1700} h={150}><Heading width={1700} title="Series or parallel?" aside="Physics · 3" write={at(t, 0, 0.6, 1, 0, lin)} /></Box>
      <Box x={200} y={220} w={1520} h={330}>
        <BoardTable by="row" size={50} lines rule={at(t, 0.4, 1.0, 1, 0, lin)} filled={interpolate(t, [1.0, 1.8, 2.2, 3.0], [0, 1, 1, 2], {easing: lin})}
          rows={[['', 'series', 'parallel'], ['current', 'the same everywhere', 'splits between lamps'], ['one lamp fails', 'all go dark', '[the others stay lit]']]} />
      </Box>
      <Box x={420} y={640} w={1000} h={200}><ChalkWord text="{homes are wired in parallel}" size={80} mark="underline" markChalk="yellow" write={at(t, 3.4, 4.4, 1, 0, lin)} marked={at(t, 4.5, 4.9)} /></Box>
      <Box x={1460} y={600} w={170} h={180}><ChalkMark kind="tick" width={170} height={180} chalk="yellow" weight={9} progress={at(t, 5.0, 5.4)} /></Box>
    </>
  );
}

/** 15–20 s (from 0 here): a clean board: bars raised one by one, the tallest ringed, the figure written big and underlined */
function Bars() {
  const t = useTime();
  return (
    <>
      <Box x={110} y={48} w={1700} h={150}><Heading width={1700} title="Rain each month" aside="mm" write={at(t, 0.3, 0.9, 1, 0, lin)} /></Box>
      <Box x={110} y={170} w={1100} h={720}>
        <Plot width={1100} height={720} x={[0, 6]} y={[0, 100]} step={[1, 20]} names={['month', 'mm']} axes={at(t, 0.5, 1.2)} bar={0.62}
          grown={interpolate(t, [1.2, 2.7], [0, 5], {easing: lin})} guide={at(t, 3.0, 3.5)} guides={[{y: 58.6, label: 'mean 58.6'}]}
          bars={[{at: 1, value: 48}, {at: 2, value: 62}, {at: 3, value: 91, chalk: 'yellow'}, {at: 4, value: 55}, {at: 5, value: 37}]} />
      </Box>
      <Box x={562} y={135} w={260} h={190}><ChalkMark width={260} height={190} progress={at(t, 3.5, 4.0)} /></Box>
      <Box x={1300} y={330} w={560} h={300}><ChalkWord text="{91 mm}" size={150} mark="underline" markChalk="pink" write={at(t, 3.4, 3.9, 1, 0, lin)} marked={at(t, 3.9, 4.2)} /></Box>
    </>
  );
}

export default function Reel() {
  const t = useTime();
  return (
    <>
      <Board ghost={0.6} remnants={t < 14.8 ? [{text: 'v = d ÷ t', at: [1250, 150]}] : [{text: 'P = 6 W', at: [1400, 760]}]} />
      <Sequence from={0} duration={14.8}><Circuit /></Sequence>
      <Sequence from={8.6} duration={6.2}><Compare /></Sequence>
      <Sequence from={14.8}><Bars /></Sequence>
    </>
  );
}
