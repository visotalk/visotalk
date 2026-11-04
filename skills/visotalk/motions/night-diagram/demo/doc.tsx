// Night Diagram's sample: one example among many. Do not reuse its story, scenes, layout or timings; read it for technique, after your own scenes are planned.
// The science: thunderstorm electrification by collisions of ice crystals and graupel in the mixed-phase region near -15 C, with positive charge carried up and the main negative
// charge left at mid levels (NOAA National Severe Storms Laboratory, Severe Weather 101); the channel can reach 50,000 F, about 28,000 C, five times the surface of the Sun, and sound takes about 3 s to cover a km
// (US National Weather Service, "The Science of Thunder"); about 44 flashes a second worldwide (Christian et al., J. Geophys. Res. 2003). The prism is dense flint
// SF11, its index by Schott's Sellmeier formula, and the light through it is traced by Snell's law (parts/optics.ts).
import {Doc, Scene, Line, Part, Animation, Appear, Tween} from '@visotalk/jsx';
import {useProp} from '@visotalk/runtime';
import {C, smooth} from '../parts/night.ts';
import {Sky} from '../parts/sky.tsx';
import {Mass} from '../parts/mass.tsx';
import {Motes} from '../parts/motes.tsx';
import {Arc} from '../parts/arc.tsx';
import {Ruler} from '../parts/ruler.tsx';
import {Pin} from '../parts/pin.tsx';
import {Reading} from '../parts/reading.tsx';
import {Lens} from '../parts/lens.tsx';
import {Heading} from '../parts/heading.tsx';
import {Pulse} from '../parts/pulse.tsx';
import {Dive} from '../parts/dive.tsx';
import {Refraction} from '../parts/refraction.tsx';

const CLOUD: Array<[number, number, number, number]> = [
  [610, 310, 110, 0.15], [1470, 290, 130, 0.2], [800, 290, 130, 0.35], [1250, 265, 145, 0.45], [1020, 250, 150, 0.6],
  [560, 490, 110, 0.2], [1420, 450, 140, 0.28], [720, 430, 170, 0.45], [1210, 405, 195, 0.55], [960, 380, 215, 0.72],
  [620, 610, 90, 0.05], [1460, 580, 90, 0.04], [800, 580, 160, 0.14], [1280, 585, 150, 0.1], [1040, 590, 190, 0.08],
];
const BOLT: Array<[number, number]> = [[1010, 660], [1050, 712], [1000, 748], [1072, 804], [1030, 834], [1090, 880]];
const FORKS: Array<Array<[number, number]>> = [[[1000, 748], [930, 792], [948, 818], [890, 870]], [[1072, 804], [1136, 840], [1128, 860], [1176, 880]]];
const FLOOR = 880, KM = 58;
const alt = (km: number) => FLOOR - km * KM;

// the small event the whole storm rests on: a soft hail pellet and an ice crystal meet, and part with opposite charges
const Collision = ({k}: {k: number}) => {
  const meet = smooth(k * 2), part = smooth(k * 2 - 1), gap = 96 * (1 - meet) + 92 * part;
  const up = -gap, down = gap * 0.8;
  return <>
    <rect x={-160} y={-160} width={320} height={320} fill="#0A1538" />
    <g transform={`translate(0 ${up}) scale(0.72)`}>
      <path d="M0 -44L38 -22V22L0 44L-38 22V-22Z" fill="#DDF3FF" />
      <path d="M0 -44V44M38 -22L-38 22M-38 -22L38 22" stroke="#7FB9DE" strokeWidth={3} />
      {part > 0.2 && <path d="M60 0H92M76 -16V16" stroke={C.ember} strokeWidth={8} strokeLinecap="round" opacity={part} />}
    </g>
    <g transform={`translate(0 ${down}) scale(0.72)`}>
      <circle r={62} fill="#9CB3D4" /><circle cy={-10} r={48} fill="#BCCFE6" />
      {part > 0.2 && <path d="M78 0H110" stroke={C.ice} strokeWidth={8} strokeLinecap="round" opacity={part} />}
    </g>
    {meet > 0.92 && part < 0.25 && <circle r={34} fill="#fff" opacity={1 - part * 4} />}
  </>;
};

// the planet at night: lightning falls mostly on land, so the flashes keep to these regions
const START = 9, PIVOT: [number, number] = [1350, 490];
const LAND: Array<[number, number, number, number]> = [[1010, 290, 170, 170], [1045, 510, 70, 150], [1350, 490, 130, 220], [1460, 290, 280, 90]];
const Globe = () => <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{position: 'absolute', inset: 0}}>
  <defs><radialGradient id="planet" cx="0.38" cy="0.32"><stop offset="0" stopColor="#2A5C9E" /><stop offset="1" stopColor="#0A1C44" /></radialGradient><clipPath id="round"><circle cx={1270} cy={470} r={392} /></clipPath></defs>
  <circle cx={1270} cy={470} r={412} fill="#4B86D8" opacity={0.14} />
  <circle cx={1270} cy={470} r={392} fill="url(#planet)" />
  <g clipPath="url(#round)" fill="#16335F" transform="translate(0 -60)">
    <path d="M880 250C980 210 1110 250 1130 340C1140 400 1080 440 1050 500C1090 540 1080 640 1040 700C1010 740 980 690 985 620C990 560 930 520 900 460C860 400 830 300 880 250Z" />
    <path d="M1230 280C1320 250 1400 270 1460 250C1560 230 1680 280 1700 360C1710 420 1620 440 1560 450C1520 480 1480 440 1450 470C1490 540 1480 640 1420 720C1380 770 1340 740 1320 660C1300 600 1250 560 1240 490C1230 440 1270 410 1240 370C1215 340 1200 300 1230 280Z" />
  </g>
</svg>;

export default <Doc
  id="night-diagram-sample"
  title="Where lightning comes from"
  poster={17.5}
  lang="en"
  canvas="16x9"
  theme="visotalk/dark"
  tokens={{
    colors: {bg: '#050A20', panel: '#101C44', panel2: '#1E2E5E', border: '#4B6AA8', text: '#FFFFFF', muted: '#C6D6F2', faint: '#1E2E5E', data: '#7FE9FF', grad: '#FFB65C', op: '#E6FBFF', good: '#7FE9FF', bad: '#FFB65C', warn: '#FFB65C'},
    fonts: {sans: '"Hanken Grotesk", "Noto Sans SC", sans-serif', mono: '"JetBrains Mono", "Noto Sans SC", monospace', display: '"Hanken Grotesk", "Noto Sans SC", sans-serif'},
    caption: {font: 'sans', size: 36, weight: 500, color: '#FFFFFF', background: 'rgba(5, 10, 32, 0.78)', radius: 10, padding: [10, 28], bottom: 34},
  }}
  pacing={{lead: 0.4, hold: 0.5, tail: 0.9}}
  exports={{captions: 'burned'}}
>
  <Part id="sky">{() => <Sky land={useProp('land', 1) > 0.5 ? FLOOR : null} fade={useProp('fade', 1)} stars={110} glow={[1030, 700, 700]} light={useProp('light', 0)} />}</Part>

  <Scene id="storm" title="Charging up, then the strike">
    <Line id="a1" text="Inside a storm cloud, at about −15 °C, ice crystals and soft hail collide.">Inside a storm cloud, at about minus fifteen degrees, ice crystals and soft hail collide.</Line>
    <Line id="a2">The light crystals rise, carrying positive charge to the top.</Line>
    <Line id="a2b">The heavy hail sinks with the negative.</Line>
    <Line id="a3" hold={1.6}>The charge builds, until the air can no longer hold it.</Line>
    <Part id="cloud" z={1}>{() => <Mass puffs={CLOUD} from={[1000, 680]} grow={useProp('grow', 0)} drift={useProp('drift', 0)} lit={[1030, 640, 620]} light={useProp('light', 0)} />}</Part>
    <Part id="ruler" z={2}>{() => <Ruler x={372} y0={alt(0)} y1={alt(12)} to={12} ticks={[0, 2, 4, 6, 8, 10, 12]} unit="km" t={useProp('t', 0)} level={6.5} levelLabel="-15 °C" levelTo={1540} levelShow={useProp('level', 0)} />}</Part>
    <Part id="plus" z={3}>{() => <Motes n={22} glyph="plus" color={C.ember} from={[760, 340, 480, 120]} to={[650, 150, 800, 150]} t={useProp('t', 0)} show={useProp('show', 0)} seed={2} />}</Part>
    <Part id="minus" z={3}>{() => <Motes n={30} glyph="minus" color={C.ice} from={[760, 340, 480, 120]} to={[620, 430, 880, 130]} t={useProp('t', 0)} show={useProp('show', 0)} seed={7} />}</Part>
    <Part id="bolt" z={4}>{() => <Arc path={BOLT} forks={FORKS} t={useProp('t', 0)} power={useProp('power', 1)} />}</Part>
    <Part id="p-top" z={5}>{() => <Pin at={[1440, 235]} elbow={[1560, 150]} to={1840} text="Positive top" note="light ice crystals" color={C.ember} t={useProp('t', 0)} />}</Part>
    <Part id="p-low" z={5}>{() => <Pin at={[1450, 520]} elbow={[1560, 420]} to={1840} text="Negative layer" note="heavy hail, sinking" color={C.ice} t={useProp('t', 0)} />}</Part>
    <Part id="lens" z={6}>{() => <Lens at={[1680, 660]} r={160} from={[1200, 503]} show={useProp('show', 0)} label="One collision">
      <Collision k={useProp('k', 0)} />
    </Lens>}</Part>
    <Part id="card" z={6}>{() => <Reading at={[1236, 610]} label="Temperature of the channel" prefix="up to" value={28000} unit="°C" note="five times the surface of the Sun" source="US National Weather Service" show={useProp('show', 0)} roll={useProp('roll', 0)} />}</Part>
    <Part id="head" z={7}>{() => <Heading text="Where does lightning come from?" size={64} show={useProp('show', 0)} />}</Part>
    <Animation>
      <Appear target={['sky', 'head', 'cloud', 'ruler']} at="start" dur={0} />
      <Tween target="head" to={{show: 1}} at="start" dur={0.5} />
      <Tween target="cloud" to={{grow: 1}} at="start" dur={1.8} easing="linear" />
      <Tween target="cloud" to={{drift: 30}} at="start" until="end" easing="linear" />
      <Tween target="ruler" to={{t: 1}} at="start" offset={0.3} dur={1} easing="linear" />

      <Appear target="lens" line="a1" word="collide" offset={-0.5} dur={0} />
      <Tween target="lens" to={{show: 1}} line="a1" word="collide" offset={-0.5} dur={0.5} easing="linear" />
      <Tween target="lens" to={{k: 1}} line="a1" word="collide" offset={-0.1} dur={2.2} easing="linear" />
      <Tween target="ruler" to={{level: 1}} line="a1" word="minus fifteen" dur={0.8} easing="easeOutQuart" />

      <Appear target={['plus', 'minus']} line="a2" word="light" dur={0} />
      <Tween target={['plus', 'minus']} to={{show: 1}} line="a2" word="light" dur={0.3} />
      <Tween target="plus" to={{t: 1}} line="a2" word="rise" dur={2.6} easing="linear" />
      <Appear target="p-top" line="a2" word="top" dur={0} />
      <Tween target="p-top" to={{t: 1}} line="a2" word="top" dur={0.7} easing="linear" />
      <Tween target="minus" to={{t: 1}} line="a2b" word="heavy" dur={2.2} easing="linear" />
      <Appear target="p-low" line="a2b" word="negative" dur={0} />
      <Tween target="p-low" to={{t: 1}} line="a2b" word="negative" dur={0.7} easing="linear" />

      <Tween target="lens" to={{show: 0}} line="a3" word="builds" dur={0.3} easing="linear" />
      <Tween target="sky" to={{light: 0.18}} line="a3" word="builds" dur={1.2} easing="easeInQuad" />
      <Appear target="bolt" line="a3" word="hold" dur={0} />
      <Tween target="bolt" to={{t: 1}} line="a3" word="hold" dur={0.14} easing="linear" />
      <Tween target="sky" to={{light: 1}} line="a3" word="hold" dur={0.1} easing="linear" />
      <Tween target="cloud" to={{light: 1}} line="a3" word="hold" dur={0.1} easing="linear" />
      <Tween target="bolt" to={{power: 0.4}} line="a3" word="hold" offset={0.2} dur={0.06} easing="linear" />
      <Tween target="bolt" to={{power: 1}} line="a3" word="hold" offset={0.28} dur={0.06} easing="linear" />
      <Tween target="sky" to={{light: 0.5}} line="a3" word="hold" offset={0.35} dur={1.6} easing="easeOutQuart" />
      <Tween target="cloud" to={{light: 0.35}} line="a3" word="hold" offset={0.35} dur={1.6} easing="easeOutQuart" />
      <Appear target="card" line="a3" word="hold" offset={0.4} dur={0} />
      <Tween target="card" to={{show: 1}} line="a3" word="hold" offset={0.4} dur={0.5} easing="linear" />
      <Tween target="card" to={{roll: 1}} line="a3" word="hold" offset={0.5} dur={0.9} easing="linear" />
    </Animation>
  </Scene>

  <Scene id="thunder" title="The stroke, close up">
    <Line id="b1">The stroke heats the air in an instant, and the air blasts outward.</Line>
    <Line id="b2" hold={0.8}>That blast is the thunder. Sound takes about three seconds to cover a kilometre.</Line>
    <Part id="close" z={1}>{() => <Dive at={[1060, FLOOR]} floor={FLOOR} s={useProp('s', 1)}>
      <Mass puffs={CLOUD} from={[1000, 680]} drift={30} lit={[1030, 640, 620]} light={0.35} />
      <Arc path={BOLT} forks={FORKS} power={useProp('power', 1)} />
    </Dive>}</Part>
    <Part id="rings" z={2}>{() => <Pulse at={[1072, 820]} r={800} n={9} floor={FLOOR} t={useProp('t', 0)} />}</Part>
    <Part id="p-air" z={3}>{() => <Pin at={[1100, 740]} elbow={[1400, 560]} to={1840} text="Hot air, expanding" note="faster than sound, at first" t={useProp('t', 0)} />}</Part>
    <Part id="card2" z={3}>{() => <Reading at={[80, 300]} label="Thunder travels" prefix="about" value={3} unit="s per km" note="count from the flash, then divide by three" source="US National Weather Service" color={C.ember} show={useProp('show', 0)} roll={useProp('roll', 0)} />}</Part>
    <Animation>
      <Appear target={['close', 'rings']} at="start" dur={0} />
      <Tween target="close" to={{s: 1.16}} at="start" dur={2.4} easing="easeInOutSine" />
      <Tween target="close" to={{power: 0.55}} at="start" dur={2} />
      <Tween target="rings" to={{t: 1}} line="b1" word="blasts" until={{line: 'b2', edge: 'end'}} easing="linear" />
      <Appear target="p-air" line="b1" word="heats the air" dur={0} />
      <Tween target="p-air" to={{t: 1}} line="b1" word="heats the air" dur={0.7} easing="linear" />
      <Appear target="card2" line="b2" word="Sound" dur={0} />
      <Tween target="card2" to={{show: 1}} line="b2" word="Sound" dur={0.5} easing="linear" />
      <Tween target="card2" to={{roll: 1}} line="b2" word="Sound" dur={0.6} easing="linear" />
      {/* the words leave before the camera does, so the pull-back starts from the picture alone */}
      <Tween target="card2" to={{show: 0}} line="b2" edge="end" offset={0.2} dur={0.4} easing="linear" />
      <Tween target="p-air" to={{t: 0}} line="b2" edge="end" offset={0.2} dur={0.4} easing="linear" />
    </Animation>
  </Scene>

  <Scene id="planet" title="The whole planet">
    <Line id="c1">Pull back far enough, and this is happening somewhere all the time.</Line>
    <Line id="c2" hold={2.2} text="About 44 flashes, every second.">About forty-four flashes, every second.</Line>
    <Part id="globe" z={1}>{() => <Dive at={PIVOT} floor={FLOOR} soft={40 + 120 * smooth((useProp('s', START) - 1.4) / 2)} s={useProp('s', START)}>
      {/* the planet comes up behind the storm, which stays solid as it shrinks onto its spot and only then gives way to the flashes */}
      <div style={{position: 'absolute', inset: 0, opacity: smooth((START - useProp('s', START)) / (START * 0.5))}}><Globe /></div>
      <div style={{position: 'absolute', inset: 0, transformOrigin: `${PIVOT[0]}px ${PIVOT[1]}px`, transform: `scale(${1 / START})`, opacity: smooth((useProp('s', START) - 1.4) / 1.4)}}>
        {/* it opens exactly where the close-up ended: pushed in 1.16 on the foot of the stroke */}
        <div style={{position: 'absolute', inset: 0, transformOrigin: `1060px ${FLOOR}px`, transform: `scale(${1 + 0.16 * smooth((useProp('s', START) - START * 0.8) / (START * 0.2))})`}}>
          <Mass puffs={CLOUD} from={[1000, 680]} drift={30} lit={[1030, 640, 620]} light={0.35} />
          <div style={{position: 'absolute', inset: 0, opacity: smooth((useProp('s', START) - 3.5) / 2.5)}}><Arc path={BOLT} forks={FORKS} power={0.55} /></div>
        </div>
      </div>
      {/* the flashes belong to the planet: they start only once it is in view */}
      <div style={{position: 'absolute', inset: 0, opacity: smooth((3 - useProp('s', START)) / 1.5)}}>
        {LAND.map(([x, y, w, h], i) => <Motes key={i} n={Math.round((w * h) / 1600)} glyph="dot" color={C.core} size={13 / Math.max(1, useProp('s', START) * 0.5)} from={[x - w / 2, y - h / 2, w, h]} to={[x - w / 2, y - h / 2, w, h]} twinkle={useProp('rate', 0)} seed={i * 9 + 2} />)}
      </div>
    </Dive>}</Part>
    <Part id="p-here" z={2}>{() => <Pin at={PIVOT} elbow={[1640, 250]} to={1840} text="This storm" note="one of many" color={C.ember} t={useProp('t', 0)} />}</Part>
    <Part id="card3" z={2}>{() => <Reading at={[80, 400]} label="Lightning worldwide" prefix="about" value={44} unit="per second" note="about 1.4 billion a year · planet illustrative" source="Christian et al., J. Geophys. Res. 2003" color={C.ice} show={useProp('show', 0)} roll={useProp('roll', 0)} />}</Part>
    <Animation>
      <Tween target="sky" to={{light: 0}} at="start" dur={1.2} />
      <Tween target="sky" to={{fade: 0}} at="start" dur={1.4} />
      <Appear target="globe" at="start" dur={0} />
      <Tween target="globe" to={{s: 0.88}} at="start" until={{line: 'c1', edge: 'end'}} easing="easeInOutSine" />
      <Tween target="globe" to={{rate: 1.2}} line="c1" word="somewhere" dur={0.1} />
      <Appear target="p-here" line="c1" word="all the time" dur={0} />
      <Tween target="p-here" to={{t: 1}} line="c1" word="all the time" dur={0.7} easing="linear" />
      <Appear target="card3" line="c2" word="forty-four" dur={0} />
      <Tween target="card3" to={{show: 1}} line="c2" word="forty-four" dur={0.5} easing="linear" />
      <Tween target="card3" to={{roll: 1}} line="c2" word="forty-four" dur={0.8} easing="linear" />
    </Animation>
  </Scene>

  <Scene id="glass" title="White light, opened">
    <Line id="d1">A flash looks white, but white light holds every colour.</Line>
    <Line id="d2" hold={1.4}>Through glass, each colour bends by its own angle: red the least, violet the most.</Line>
    <Part id="prism" z={1}>{() => <Refraction from={[400, 800]} aim={-33}
      glass={[{kind: 'prism', at: [960, 520], side: 340, in: useProp('prism', 0)}, {kind: 'card', at: [1440, 720], rot: 0, w: 320, in: useProp('card', 0)}]}
      reach={useProp('reach', 0)} power={useProp('power', 0)} />}</Part>
    <Part id="p-red" z={2}>{() => <Pin at={[1440, 712]} elbow={[1560, 600]} to={1840} text="Red bends least" note="690 nm" color={C.ember} t={useProp('t', 0)} />}</Part>
    <Part id="p-violet" z={2}>{() => <Pin at={[1440, 792]} elbow={[1560, 860]} to={1840} text="Violet bends most" note="410 nm" color={C.ice} t={useProp('t', 0)} />}</Part>
    <Part id="q4" z={3}>{() => <Heading text="What is in white light?" size={64} show={useProp('show', 0)} />}</Part>
    <Animation>
      <Tween target="sky" to={{land: 0}} at="start" dur={0.01} />
      <Tween target="sky" to={{fade: 1}} at="start" dur={1.0} />
      <Appear target="prism" at="start" dur={0} />
      <Appear target="q4" at="start" dur={0} />
      <Tween target="q4" to={{show: 1}} at="start" dur={0.6} easing="linear" />
      <Tween target="prism" to={{prism: 1}} line="d1" word="white light" dur={0.6} easing="easeOutQuart" />
      <Tween target="prism" to={{card: 1}} line="d1" word="every colour" dur={0.6} easing="easeOutQuart" />
      <Tween target="prism" to={{power: 1}} line="d2" word="Through glass" dur={0.2} easing="linear" />
      <Tween target="prism" to={{reach: 1500}} line="d2" word="Through glass" dur={1.4} easing="linear" />
      <Appear target="p-red" line="d2" word="red" dur={0} />
      <Tween target="p-red" to={{t: 1}} line="d2" word="red" dur={0.6} easing="linear" />
      <Appear target="p-violet" line="d2" word="violet" dur={0} />
      <Tween target="p-violet" to={{t: 1}} line="d2" word="violet" dur={0.6} easing="linear" />
    </Animation>
  </Scene>
</Doc>;
