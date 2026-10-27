import {Doc, Scene, Line, Part, Animation, Appear, Disappear, Tween, Set} from '@visotalk/jsx';
import {useProp, useTime, Obj} from '@visotalk/runtime';

// Sonnet 18, typography only. Four parts, one per movement of the poem; every
// background is part of its part so a cross-fade between parts never dips to the theme.

const CREAM = '#f3ead7', INK = '#2b2622', MUTED = '#857a69';
const DUSK = '#1b1a24', DUSK_INK = '#efe6d3', DUSK_MUTED = '#9a96ad';
const SUN = '#c4800a', ASH = '#8d8678', HOT = '#d4420c';
const GOLD = '#ffcf5a', SOFT = '#f1e8d6', DIM = '#a89e8f';

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const mix = (a: string, b: string, t: number) => {
  const x = hex(a), y = hex(b);
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * clamp(t, 0, 1)).toString(16).padStart(2, '0')).join('');
};
const hash = (i: number, k: number) => { const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return s - Math.floor(s); };

const SERIF = '"Bitstream Charter", "Liberation Serif", serif';

const Words = ({text, f}: {text: string; f: (i: number) => any}) => (
  <>{text.split(' ').map((w, i) => <span key={i} style={{display: 'inline-block', marginRight: '0.26em', ...f(i)}}>{w}</span>)}</>
);

const Letters = ({text, f}: {text: string; f: (i: number) => any}) => (
  <>{[...text].map((ch, i) => <span key={i} style={{display: 'inline-block', whiteSpace: 'pre', ...f(i)}}>{ch}</span>)}</>
);

type SegProps = {id: string; size: number; color: string; weight?: number; italic?: boolean; track?: string; style?: any; children: any};
const Seg = ({id, size, color, weight = 400, italic = false, track = '0', style, children}: SegProps) => (
  <Obj id={id} style={{display: 'inline-block', fontSize: size, fontWeight: weight, fontStyle: italic ? 'italic' : 'normal', color,
    letterSpacing: track, lineHeight: 1.04, marginRight: '0.24em', whiteSpace: 'nowrap', transformOrigin: 'left bottom', ...style}}>{children}</Obj>
);

const Row = ({children, gap = 0}: {children: any; gap?: number}) => (
  <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', columnGap: gap}}>{children}</div>
);

// Earlier lines of a movement step back as the next one is read: focus is the index being read.
const Block = ({i, children}: {i: number; children: any}) => {
  const focus = useProp('focus', 0) as number;
  return <div style={{opacity: 1 - 0.6 * clamp(focus - i, 0, 1)}}>{children}</div>;
};

const Page = ({bg, children}: {bg: string; children: any}) => (
  <div style={{position: 'absolute', inset: 0, background: bg, fontFamily: SERIF, boxSizing: 'border-box', padding: '170px 84px 230px',
    display: 'flex', flexDirection: 'column', justifyContent: 'space-between'}}>{children}</div>
);

// ---- Quatrain one: the summer's day, then the wind, then the lease running out.
const Q1 = () => {
  const gale = useProp('gale', 0) as number;
  const lease = useProp('lease', 1) as number;
  const t = useTime();
  const shake = (i: number, amp: number) => ({
    transform: `translate(${Math.sin(t * 17 + i * 1.9) * gale * amp}px, ${Math.cos(t * 13 + i * 2.7) * gale * amp * 1.3}px) rotate(${Math.sin(t * 11 + i * 3.1) * gale * 2.5}deg)`,
  });
  return (
    <Page bg={CREAM}>
      <Block i={0}>
        <Row><Seg id="q1-a" size={66} color={MUTED} italic>Shall I compare thee to a</Seg></Row>
        <Row><Seg id="q1-b" size={132} color={SUN} weight={700} style={{marginTop: 4}}>summer’s day?</Seg></Row>
      </Block>
      <Block i={1}>
        <Row><Seg id="q1-c" size={66} color={MUTED} italic>Thou art more</Seg><Seg id="q1-d" size={158} color={INK} weight={700}>lovely</Seg></Row>
        <Row><Seg id="q1-e" size={66} color={MUTED} italic>and more</Seg><Seg id="q1-f" size={104} color={INK} italic>temperate</Seg></Row>
      </Block>
      <Block i={2}>
        <Row><Seg id="q1-g" size={96} color={INK} weight={700} style={{padding: '14px 0'}}><Words text="Rough winds do shake" f={(i) => shake(i, 6)} /></Seg></Row>
        <Row><Seg id="q1-h" size={66} color={MUTED} italic style={{padding: '8px 0'}}><Words text="the darling buds of May" f={(i) => shake(i + 40, 4)} /></Seg></Row>
      </Block>
      <Block i={3}>
        <Row><Seg id="q1-i" size={66} color={MUTED} italic>And summer’s lease hath</Seg></Row>
        <Row><Seg id="q1-j" size={80} color={INK} weight={700}>all too short a date</Seg></Row>
        <Obj id="lease-bar" style={{height: 12, width: `${Math.round(lease * 100)}%`, background: SUN, marginTop: 20}} />
      </Block>
    </Page>
  );
};

// ---- Quatrain two: the same cream ground dims to dusk while the words fail.
const Q2 = () => {
  const dusk = useProp('dusk', 0) as number;
  const heat = useProp('heat', 0) as number;
  const dim = useProp('dim', 0) as number;
  const stair = useProp('stair', 0) as number;
  const rag = useProp('rag', 0) as number;
  const ink = mix(INK, DUSK_INK, dusk), muted = mix(MUTED, DUSK_MUTED, dusk);
  return (
    <Page bg={mix(CREAM, DUSK, dusk)}>
      <Block i={0}>
        <Row><Seg id="q2-a" size={66} color={muted} italic>Sometime too</Seg>
          <Seg id="q2-b" size={230} color={HOT} weight={700} style={{textShadow: `0 0 ${Math.round(heat * 46)}px rgba(255,110,30,${0.7 * heat})`}}>hot</Seg></Row>
        <Row><Seg id="q2-c" size={66} color={muted} italic>the eye of heaven</Seg>
          <Seg id="q2-d" size={96} color={mix(INK, DUSK_INK, dusk)} weight={700}>shines,</Seg></Row>
      </Block>
      <Block i={1}>
        <Row><Seg id="q2-e" size={66} color={muted} italic>And often is his</Seg></Row>
        <Row><Seg id="q2-f" size={170} color={mix(SUN, ASH, dim)} weight={700} style={{opacity: 1 - 0.55 * dim}}>gold</Seg>
          <Seg id="q2-g" size={76} color={mix(ink, ASH, dim)} italic style={{opacity: 1 - 0.55 * dim}}>complexion</Seg></Row>
        <Row><Seg id="q2-h" size={76} color={muted} italic style={{opacity: 1 - 0.4 * dim}}>dimm’d;</Seg></Row>
      </Block>
      <Block i={2}>
        <Row><Seg id="q2-i" size={58} color={muted} italic>And every</Seg><Seg id="q2-j" size={120} color={ink} weight={700}>fair</Seg>
          <Seg id="q2-k" size={58} color={muted} italic>from</Seg><Seg id="q2-l" size={120} color={ink} weight={700}>fair</Seg></Row>
        <Row><Seg id="q2-m" size={66} color={muted} italic>sometime</Seg>
          <Seg id="q2-n" size={92} color={ink} weight={700} style={{paddingBottom: 70}}><Letters text="declines" f={(i) => ({transform: `translateY(${Math.round(stair * i * 9)}px)`})} /></Seg></Row>
      </Block>
      <Block i={3}>
        <Row><Seg id="q2-o" size={56} color={muted} italic>By chance or nature’s changing course</Seg></Row>
        <Row><Seg id="q2-p" size={118} color={ink} weight={700} track="0.03em" style={{padding: '20px 8px'}}>
          <Letters text="untrimm’d" f={(i) => ({transform: `translate(${Math.round((hash(i, 1) - 0.5) * rag * 8)}px, ${Math.round((hash(i, 2) - 0.5) * rag * 18)}px) rotate(${Math.round((hash(i, 3) - 0.5) * rag * 12)}deg)`})} />
        </Seg></Row>
      </Block>
    </Page>
  );
};

const glowBg = (g: number) =>
  `radial-gradient(ellipse 90% 60% at 50% 58%, rgba(196,128,10,${(0.6 * g).toFixed(3)}) 0%, rgba(27,26,36,0) 72%), ${DUSK}`;

// ---- Quatrain three: the turn. The ground warms and the words stop failing.
const Q3 = () => {
  const glow = useProp('glow', 0) as number;
  const bright = useProp('bright', 0) as number;
  const rule = useProp('rule', 0) as number;
  const t = useTime();
  const sh = (b: number) => `0 0 ${Math.round(b * 40)}px rgba(255,200,80,${0.65 * b})`;
  return (
    <Page bg={glowBg(glow)}>
      <Block i={0}>
        <Row><Seg id="q3-a" size={310} color={GOLD} weight={700} style={{textShadow: sh(bright)}}>But</Seg></Row>
        <Row><Seg id="q3-b" size={66} color={DIM} italic>thy</Seg><Seg id="q3-c" size={150} color={GOLD} weight={700} style={{textShadow: sh(bright)}}>eternal</Seg></Row>
        <Row><Seg id="q3-d" size={150} color={GOLD} weight={700} style={{textShadow: sh(bright)}}>summer</Seg></Row>
        <Row><Seg id="q3-e" size={84} color={SOFT} italic>shall not fade,</Seg></Row>
      </Block>
      <Block i={1}>
        <Row><Seg id="q3-f" size={66} color={DIM} italic>Nor lose possession of that</Seg></Row>
        <Row><Seg id="q3-g" size={160} color={GOLD} weight={700} style={{textShadow: sh(bright)}}>fair</Seg>
          <Seg id="q3-h" size={72} color={SOFT} italic>thou ow’st;</Seg></Row>
      </Block>
      <Block i={2}>
        <Row><Seg id="q3-i" size={66} color={DIM} italic>Nor shall</Seg><Seg id="q3-j" size={120} color={SOFT} weight={700}>death</Seg><Seg id="q3-k" size={66} color={DIM} italic>brag</Seg></Row>
        <Row><Seg id="q3-l" size={96} color={GOLD} weight={700}
          style={{marginTop: 24, transform: `translateX(${Math.round(Math.sin(t * 1.3) * 18)}px)`}}>thou wander’st</Seg></Row>
        <Row><Seg id="q3-m" size={66} color={DIM} italic>in his shade,</Seg></Row>
      </Block>
      <Block i={3}>
        <Row><Seg id="q3-n" size={66} color={DIM} italic>When in eternal</Seg></Row>
        <Row><Seg id="q3-o" size={130} color={SOFT} weight={700}>lines</Seg></Row>
        <div style={{height: 12, width: `${Math.round(rule * 100)}%`, background: GOLD, margin: '6px 0 18px'}} />
        <Row><Seg id="q3-p" size={70} color={SOFT} italic>to time thou</Seg><Seg id="q3-q" size={92} color={GOLD} weight={700}>grow’st:</Seg></Row>
      </Block>
    </Page>
  );
};

// ---- The couplet: the poem names itself.
const Q4 = () => {
  const glow = useProp('glow', 0.8) as number;
  const breath = useProp('breath', 0) as number;
  const sh = (b: number, a = 0.65) => `0 0 ${Math.round(b * 44)}px rgba(255,200,80,${a * b})`;
  return (
    <Page bg={glowBg(glow)}>
      <Block i={0}>
        <Row><Seg id="q4-a" size={70} color={DIM} italic>So long as</Seg></Row>
        <Row><Seg id="q4-b" size={84} color={SOFT} weight={700} track={`${(breath * 0.16).toFixed(3)}em`}>men can breathe</Seg></Row>
        <Row><Seg id="q4-c" size={84} color={SOFT} italic>or eyes can see,</Seg></Row>
      </Block>
      <Block i={1}>
        <Row><Seg id="q4-d" size={70} color={DIM} italic>So long lives</Seg></Row>
        <Row><Seg id="q4-e" size={250} color={GOLD} weight={700} style={{textShadow: sh(glow)}}>this,</Seg></Row>
        <Row><Seg id="q4-f" size={70} color={DIM} italic>and</Seg><Seg id="q4-g" size={120} color={GOLD} weight={700} style={{textShadow: sh(glow)}}>this</Seg>
          <Seg id="q4-h" size={70} color={DIM} italic>gives life to</Seg></Row>
        <Row><Seg id="q4-i" size={290} color={SOFT} weight={700} style={{textShadow: sh(glow, 0.9)}}>thee.</Seg></Row>
      </Block>
    </Page>
  );
};

export default <Doc id="sonnet-18" poster={36} title="Sonnet 18" lang="en" voice="bf_emma" speed={0.85} theme="visotalk/light" canvas="9x16" exports={{captions: 'none'}}>
  <Scene id="poem">
    <Line id="l1" hold={0.5}>Shall I compare thee to a summer's day?</Line>
    <Line id="l2" hold={0.5}>Thou art more lovely and more temperate:</Line>
    <Line id="l3" hold={0.5}>Rough winds do shake the darling buds of May,</Line>
    <Line id="l4" hold={1.0}>And summer's lease hath all too short a date;</Line>
    <Line id="l5" hold={0.5}>Sometime too hot the eye of heaven shines,</Line>
    <Line id="l6" hold={0.5}>And often is his gold complexion dimm'd;</Line>
    <Line id="l7" hold={0.5}>And every fair from fair sometime declines,</Line>
    <Line id="l8" hold={1.0}>By chance or nature's changing course untrimm'd;</Line>
    <Line id="l9" hold={0.5}>But thy eternal summer shall not fade,</Line>
    <Line id="l10" hold={0.5}>Nor lose possession of that fair thou ow'st;</Line>
    <Line id="l11" hold={0.5}>Nor shall death brag thou wander'st in his shade,</Line>
    <Line id="l12" hold={1.0}>When in eternal lines to time thou grow'st:</Line>
    <Line id="l13" hold={0.5}>So long as men can breathe or eyes can see,</Line>
    <Line id="l14" hold={2.2}>So long lives this, and this gives life to thee.</Line>

    <Part id="q1" z={1}><Q1 /></Part>
    <Part id="q2" z={2}><Q2 /></Part>
    <Part id="q3" z={3}><Q3 /></Part>
    <Part id="q4" z={4}><Q4 /></Part>

    <Animation>
      {/* Quatrain one */}
      <Appear target="q1" at="start" dur={0} />
      <Appear target="q1-a" line="l1" word="shall" />
      <Appear target="q1-b" line="l1" word="summer's" dur={0.7} easing="easeOutQuart" />
      <Tween target="q1" to={{focus: 1}} line="l2" dur={0.5} />
      <Appear target="q1-c" line="l2" word="thou" />
      <Appear target="q1-d" line="l2" word="lovely" dur={0.5} />
      <Appear target="q1-e" line="l2" word="and" />
      <Appear target="q1-f" line="l2" word="temperate" dur={1.2} easing="easeInOutSine" />
      <Tween target="q1" to={{focus: 2}} line="l3" dur={0.5} />
      <Appear target="q1-g" line="l3" word="rough" dur={0.25} />
      <Tween target="q1" to={{gale: 1}} line="l3" word="rough" dur={0.5} />
      <Appear target="q1-h" line="l3" word="the" />
      <Tween target="q1" to={{gale: 0}} line="l4" word="and" dur={0.8} />
      <Tween target="q1" to={{focus: 3}} line="l4" dur={0.5} />
      <Appear target="q1-i" line="l4" word="and" />
      <Appear target="lease-bar" line="l4" word="lease" dur={0.3} />
      <Appear target="q1-j" line="l4" word="all" dur={0.4} />
      <Tween target="q1" to={{lease: 0.16}} line="l4" word="short" dur={0.9} easing="easeInOutQuad" />

      {/* Quatrain two */}
      <Appear target="q2" line="l5" word="sometime" dur={0.15} />
      <Disappear target="q1" line="l5" word="sometime" offset={0.16} dur={0.05} />
      <Tween target="q2" to={{dusk: 0.2}} line="l5" dur={2} />
      <Appear target="q2-a" line="l5" word="sometime" />
      <Appear target="q2-b" line="l5" word="hot" dur={0.4} />
      <Tween target="q2" to={{heat: 1}} line="l5" word="hot" dur={1} />
      <Appear target="q2-c" line="l5" word="the" />
      <Appear target="q2-d" line="l5" word="shines" dur={0.5} />
      <Tween target="q2" to={{focus: 1}} line="l6" dur={0.5} />
      <Tween target="q2" to={{dusk: 0.45}} line="l6" dur={2} />
      <Tween target="q2" to={{heat: 0}} line="l6" dur={1.2} />
      <Appear target="q2-e" line="l6" word="and" />
      <Appear target="q2-f" line="l6" word="gold" dur={0.5} />
      <Appear target="q2-g" line="l6" word="complexion" />
      <Appear target="q2-h" line="l6" word="dimm'd" />
      <Tween target="q2" to={{dim: 1}} line="l6" word="dimm'd" dur={1.2} />
      <Tween target="q2" to={{focus: 2}} line="l7" dur={0.5} />
      <Tween target="q2" to={{dusk: 0.75}} line="l7" dur={2} />
      <Appear target="q2-i" line="l7" word="and" />
      <Appear target="q2-j" line="l7" word="fair" nth={1} dur={0.4} />
      <Appear target="q2-k" line="l7" word="from" />
      <Appear target="q2-l" line="l7" word="fair" nth={2} dur={0.4} />
      <Appear target="q2-m" line="l7" word="sometime" />
      <Appear target="q2-n" line="l7" word="declines" />
      <Tween target="q2" to={{stair: 1}} line="l7" word="declines" dur={1} easing="easeInQuad" />
      <Tween target="q2-l" to={{y: 34, scale: 0.62, rotate: 4}} line="l7" word="declines" dur={1} easing="easeInQuad" />
      <Tween target="q2" to={{focus: 3}} line="l8" dur={0.5} />
      <Tween target="q2" to={{dusk: 1}} line="l8" dur={2} />
      <Appear target="q2-o" line="l8" word="by" />
      <Appear target="q2-p" line="l8" word="untrimm'd" dur={0.4} />
      <Tween target="q2" to={{rag: 1}} line="l8" word="untrimm'd" dur={0.9} easing="easeOutBack(2)" />

      {/* Quatrain three: the volta */}
      <Appear target="q3" line="l9" word="but" dur={0.15} />
      <Disappear target="q2" line="l9" word="but" offset={0.16} dur={0.05} />
      <Set target="q3-a" to={{scale: 1.5}} line="l9" />
      <Appear target="q3-a" line="l9" word="but" dur={0.1} />
      <Tween target="q3-a" to={{scale: 1}} line="l9" word="but" dur={0.7} easing="easeOutQuart" />
      <Tween target="q3" to={{glow: 0.5}} line="l9" word="thy" dur={2} />
      <Appear target="q3-b" line="l9" word="thy" />
      <Appear target="q3-c" line="l9" word="eternal" dur={0.6} />
      <Appear target="q3-d" line="l9" word="summer" dur={0.6} />
      <Tween target="q3" to={{bright: 1}} line="l9" word="eternal" dur={1.2} />
      <Appear target="q3-e" line="l9" word="shall" />
      <Tween target="q3" to={{focus: 1}} line="l10" dur={0.5} />
      <Appear target="q3-f" line="l10" word="nor" />
      <Appear target="q3-g" line="l10" word="fair" dur={0.6} />
      <Appear target="q3-h" line="l10" word="thou" />
      <Tween target="q3" to={{focus: 2}} line="l11" dur={0.5} />
      <Appear target="q3-i" line="l11" word="nor" />
      <Appear target="q3-j" line="l11" word="death" dur={0.4} />
      <Tween target="q3-j" to={{scale: 0.4}} line="l11" word="brag" dur={0.8} easing="easeInOutQuad" />
      <Appear target="q3-k" line="l11" word="brag" />
      <Appear target="q3-l" line="l11" word="thou" dur={0.5} />
      <Appear target="q3-m" line="l11" word="in" />
      <Tween target="q3" to={{focus: 3}} line="l12" dur={0.5} />
      <Appear target="q3-n" line="l12" word="when" />
      <Appear target="q3-o" line="l12" word="lines" dur={0.5} />
      <Tween target="q3" to={{rule: 1}} line="l12" word="lines" dur={1.8} easing="easeInOutQuad" />
      <Tween target="q3" to={{glow: 0.8}} line="l12" dur={2} />
      <Appear target="q3-p" line="l12" word="to" />
      <Appear target="q3-q" line="l12" word="thou" dur={0.5} />
      <Tween target="q3-q" to={{scale: 1.35}} line="l12" edge="end" offset={-0.9} dur={0.8} easing="easeOutQuad" />

      {/* The couplet */}
      <Appear target="q4" line="l13" word="so" dur={0.15} />
      <Disappear target="q3" line="l13" word="so" offset={0.16} dur={0.05} />
      <Appear target="q4-a" line="l13" word="so" />
      <Appear target="q4-b" line="l13" word="men" dur={0.5} />
      <Tween target="q4" to={{breath: 1}} line="l13" word="breathe" dur={1.4} easing="easeInOutSine" />
      <Appear target="q4-c" line="l13" word="or" />
      <Tween target="q4" to={{focus: 1}} line="l14" dur={0.5} />
      <Appear target="q4-d" line="l14" word="so" />
      <Appear target="q4-e" line="l14" word="this" nth={1} dur={0.6} />
      <Appear target="q4-f" line="l14" word="and" />
      <Appear target="q4-g" line="l14" word="this" nth={2} dur={0.4} />
      <Appear target="q4-h" line="l14" word="gives" />
      <Appear target="q4-i" line="l14" word="thee" dur={0.9} easing="easeOutQuart" />
      <Tween target="q4" to={{glow: 1}} line="l14" word="thee" dur={1.6} />
    </Animation>
  </Scene>
</Doc>;
