// FICTION NOTICE: "Nook" and its "Quiet Hours" feature are invented for this demo. No real company,
// product, logo or look is depicted, and no usage figure, rating or user count is stated: every name,
// time and message on the phone screen is made-up example content.
import {Doc, Scene, Line, Part, Animation, Appear, Disappear, Tween} from '@visotalk/jsx';
import {useProp, Obj} from '@visotalk/runtime';

const INK = '#f2f3f5', MUTED = '#9aa0ab', SCREEN = '#14161a', CARD = '#1f2229', LINE = '#2e323b';
const ACCENT = '#47c9a8', URGENT = '#ff6b5e', GOLD = '#f2c14e';

const NOTES = [
  {title: 'Groceries', body: 'Oats, lemons, basil', day: 'Mon'},
  {title: 'Trip ideas', body: 'Night train, coast walk', day: 'Sun'},
  {title: 'Book club', body: 'Questions for Thursday', day: 'Fri'},
];
const SUMMARY = [
  {id: 'r1', color: ACCENT, text: 'Reminder: call back'},
  {id: 'r2', color: GOLD, text: 'Trip ideas edited'},
  {id: 'r3', color: '#7c9cff', text: 'New comment from Sam'},
];

// Axis of the time track: 6 PM (18) to 10 AM (34).
const TRACK_L = 28, TRACK_W = 368;
const trackX = (h: number) => TRACK_L + ((h - 18) / 16) * TRACK_W;
const clock12 = (h: number) => { const n = Math.round(h) % 24; return `${n % 12 === 0 ? 12 : n % 12} ${n >= 12 ? 'PM' : 'AM'}`; };
const clockHm = (h: number) => {
  const m = Math.round(h * 60), hh = Math.floor(m / 60) % 24, mm = m % 60;
  return `${hh % 12 === 0 ? 12 : hh % 12}:${mm < 10 ? '0' : ''}${mm}`;
};

const Tap = ({x, y, p}: {x: number; y: number; p: number}) => (
  <div style={{position: 'absolute', left: x - 50, top: y - 50, width: 100, height: 100, opacity: p > 0 && p < 1 ? 1 : 0}}>
    <div style={{position: 'absolute', left: 50 - (20 + p * 25), top: 50 - (20 + p * 25), width: 40 + p * 50, height: 40 + p * 50, borderRadius: '50%', border: `5px solid ${ACCENT}`, opacity: 1 - p, boxSizing: 'border-box'}} />
    <div style={{position: 'absolute', left: 38, top: 38, width: 24, height: 24, borderRadius: '50%', background: INK, opacity: 0.85 - p * 0.5}} />
  </div>
);

const Banner = ({id, top, bn, color, title, body}: {id: string; top: number; bn: number; color: string; title: string; body: string}) => (
  <Obj id={id} style={{position: 'absolute', left: 16, top: top - (1 - bn) * 44, width: 392, height: 68, borderRadius: 20, background: '#2b2f38', border: `1px solid ${LINE}`, boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 14, padding: '0 16px', fontFamily: 'var(--vt-sans)'}}>
    <div style={{width: 12, height: 12, borderRadius: 6, background: color, flex: 'none'}} />
    <div>
      <div style={{fontSize: 24, fontWeight: 700, color: INK, lineHeight: 1.1}}>{title}</div>
      <div style={{fontSize: 22, color: MUTED, lineHeight: 1.2}}>{body}</div>
    </div>
  </Obj>
);

const Phone = () => {
  const px = useProp('px', 320), sheet = useProp('sheet', 0), tog = useProp('tog', 0), g = useProp('g', 0);
  const rA = useProp('rA', 23), rB = useProp('rB', 30), clock = useProp('clock', 21.75);
  const bn1 = useProp('bn1', 0), bn2 = useProp('bn2', 0), bn3 = useProp('bn3', 0), bn4 = useProp('bn4', 0);
  const tapA = useProp('tapA', 0), tapB = useProp('tapB', 0), sum = useProp('sum', 0), push = useProp('push', 0);
  const SHH = 520, sheetTop = 804 - SHH, sheetO = Math.max(0, (sheet - 0.4) / 0.6);
  const listTop = 290 + push * 140, hm = Math.max(0, 1 - 8 * Math.max(bn1, bn2, bn3, bn4)) * Math.max(0, 1 - 4 * sum), listO = Math.max(0, 1 - sheet * 3);
  const handle = (h: number, glow: number) => ({position: 'absolute' as const, left: trackX(h) - 20, top: 168 - 20 + 7, width: 40, height: 40, borderRadius: 20, background: INK, boxShadow: `0 0 0 ${Math.round(glow * 10)}px rgba(71,201,168,${0.35 * glow})`});
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 820, fontFamily: 'var(--vt-sans)'}}>
      <div style={{position: 'absolute', left: px, top: 0, width: 440, height: 820, borderRadius: 64, background: '#07080a', border: '6px solid #343842', boxSizing: 'border-box'}} />
      <div style={{position: 'absolute', left: px + 8, top: 8, width: 424, height: 804, borderRadius: 56, overflow: 'hidden', background: SCREEN}}>
        {/* status bar */}
        <div style={{position: 'absolute', left: 30, top: 12, fontSize: 24, fontWeight: 700, color: INK}}>{clockHm(clock)}</div>
        <div style={{position: 'absolute', left: 167, top: 12, width: 90, height: 26, borderRadius: 13, background: '#000'}} />
        <svg style={{position: 'absolute', left: 372, top: 11, opacity: tog}} width="28" height="28" viewBox="0 0 28 28"><path d="M20 4 A11 11 0 1 0 24 18 A9 9 0 0 1 20 4 Z" fill={ACCENT} /></svg>
        {/* home */}
        <div style={{position: 'absolute', opacity: hm, left: 28, top: 56, width: 38, height: 38, borderRadius: 12, background: ACCENT, color: '#0b2a22', fontSize: 28, fontWeight: 700, textAlign: 'center', lineHeight: '38px'}}>N</div>
        <div style={{position: 'absolute', opacity: hm, left: 78, top: 54, fontSize: 40, fontWeight: 700, color: INK}}>Nook</div>
        <svg style={{position: 'absolute', left: 354, top: 58, opacity: 0.9 * hm}} width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="6" fill="none" stroke={INK} strokeWidth="3.5" /><circle cx="18" cy="18" r="13" fill="none" stroke={INK} strokeWidth="3.5" strokeDasharray="6 6.8" /></svg>
        <div style={{position: 'absolute', opacity: hm, left: 16, top: 120, width: 392, height: 56, borderRadius: 18, background: CARD, boxSizing: 'border-box', padding: '12px 20px', fontSize: 26, color: MUTED}}>Search notes</div>
        <div style={{position: 'absolute', opacity: hm * listO, left: 28, top: 236, fontSize: 24, fontWeight: 700, color: MUTED}}>Recent</div>
        {NOTES.map((n, i) => (
          <div key={n.title} style={{position: 'absolute', left: 16, opacity: listO, top: listTop + i * 116, width: 392, height: 104, borderRadius: 22, background: CARD, boxSizing: 'border-box', padding: '16px 20px'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 30, fontWeight: 700, color: INK}}><span>{n.title}</span><span style={{fontSize: 22, fontWeight: 400, color: MUTED, paddingTop: 6}}>{n.day}</span></div>
            <div style={{fontSize: 24, color: MUTED, marginTop: 6}}>{n.body}</div>
          </div>
        ))}
        {/* summary card */}
        <Obj id="sumcard" style={{position: 'absolute', left: 16, top: 56 + (1 - sum) * 40, width: 392, height: 270, borderRadius: 26, background: '#1b2b29', border: `2px solid ${ACCENT}`, boxSizing: 'border-box', padding: '18px 20px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', color: INK}}><span style={{fontSize: 32, fontWeight: 700}}>Your summary</span><span style={{fontSize: 24, color: ACCENT, fontWeight: 700}}>7:00 AM</span></div>
          {SUMMARY.map((r, i) => (
            <Obj key={r.id} id={r.id} style={{position: 'absolute', left: 20, top: 82 + i * 56, width: 348, height: 46, display: 'flex', alignItems: 'center', gap: 14, fontSize: 26, color: INK}}>
              <div style={{width: 14, height: 14, borderRadius: 7, background: r.color, flex: 'none'}} /><span>{r.text}</span>
            </Obj>
          ))}
        </Obj>
        {/* scrim and sheet */}
        <div style={{position: 'absolute', left: 0, top: 0, width: 424, height: 804, background: '#000', opacity: 0.55 * sheet}} />
        <div style={{position: 'absolute', left: 0, top: 804 - SHH * sheet, width: 424, height: SHH * sheet, borderRadius: '36px 36px 0 0', background: '#242831', borderTop: `2px solid ${LINE}`, boxSizing: 'border-box'}}/>
        {sheetO > 0.01 && <div style={{opacity: sheetO, position: 'absolute', left: 0, top: sheetTop, width: 424, height: SHH}}>
          <div style={{position: 'absolute', left: 188, top: 12, width: 48, height: 6, borderRadius: 3, background: '#4a4f5b'}} />
          <svg style={{position: 'absolute', left: 28, top: 36}} width="36" height="36" viewBox="0 0 36 36">
            <path d="M18 5 C11 5 9 11 9 17 L9 23 L6 27 L30 27 L27 23 L27 17 C27 11 25 5 18 5 Z" fill="none" stroke={tog > 0.5 ? ACCENT : INK} strokeWidth="3" strokeLinejoin="round" />
            <path d="M14 30 Q18 34 22 30" fill="none" stroke={tog > 0.5 ? ACCENT : INK} strokeWidth="3" />
            <path d="M5 5 L31 31" stroke={ACCENT} strokeWidth="3.5" strokeLinecap="round" opacity={tog} />
          </svg>
          <div style={{position: 'absolute', left: 76, top: 34, fontSize: 36, fontWeight: 700, color: INK}}>Quiet Hours</div>
          <div style={{position: 'absolute', left: 28, top: 92, fontSize: 46, fontWeight: 700, color: ACCENT}}>{clock12(rA)} – {clock12(rB)}</div>
          <div style={{position: 'absolute', left: TRACK_L, top: 175, width: TRACK_W, height: 14, borderRadius: 7, background: '#3a3f4b'}} />
          <div style={{position: 'absolute', left: trackX(rA), top: 175, width: trackX(rB) - trackX(rA), height: 14, borderRadius: 7, background: ACCENT}} />
          <div style={handle(rA, g)} />
          <div style={handle(rB, g)} />
          {[[18, '6 PM'], [24, '12 AM'], [30, '6 AM']].map(([h, t]) => (
            <div key={t as string} style={{position: 'absolute', left: trackX(h as number) - 40, top: 222, width: 80, textAlign: h === 18 ? 'left' : 'center', marginLeft: h === 18 ? 40 : 0, fontSize: 22, color: MUTED}}>{t}</div>
          ))}
          {/* toggle row */}
          <div style={{position: 'absolute', left: 16, top: 272, width: 392, height: 84, borderRadius: 22, background: CARD, boxSizing: 'border-box'}}>
            <div style={{position: 'absolute', left: 20, top: 24, fontSize: 28, color: INK}}>Hold notifications</div>
            <div style={{position: 'absolute', left: 292, top: 17, width: 84, height: 50, borderRadius: 25, background: tog > 0.5 ? ACCENT : '#4a4f5b'}}>
              <div style={{position: 'absolute', left: 4 + tog * 34, top: 4, width: 42, height: 42, borderRadius: 21, background: INK}} />
            </div>
          </div>
          <Obj id="heldchip" style={{position: 'absolute', left: 28, top: 364, fontSize: 24, fontWeight: 700, color: ACCENT}}>Held until {clock12(rB)}</Obj>
          <Obj id="urgent" style={{position: 'absolute', left: 16, top: 414, width: 392, height: 84, borderRadius: 22, background: CARD, border: `2px solid ${URGENT}`, boxSizing: 'border-box'}}>
            <div style={{position: 'absolute', left: 16, top: 14, width: 48, height: 48, borderRadius: 24, background: URGENT, color: '#2a0d0a', fontSize: 28, fontWeight: 700, textAlign: 'center', lineHeight: '48px'}}>M</div>
            <div style={{position: 'absolute', left: 78, top: 12, fontSize: 28, color: INK, fontWeight: 700}}>Mina R.</div>
            <div style={{position: 'absolute', left: 78, top: 44, fontSize: 22, color: MUTED}}>Always allowed</div>
            <div style={{position: 'absolute', left: 276, top: 22, padding: '4px 14px', borderRadius: 16, background: URGENT, color: '#2a0d0a', fontSize: 22, fontWeight: 700}}>Urgent</div>
          </Obj>
        </div>}
        {/* banners */}
        <Banner id="b1" top={52} bn={bn1} color={GOLD} title="Reminder" body="Call back at noon" />
        <Banner id="b2" top={128} bn={bn2} color="#7c9cff" title="Trip ideas edited" body="Sam changed the plan" />
        <Banner id="b3" top={204} bn={bn3} color={ACCENT} title="New comment" body="On Book club" />
        <Banner id="b4" top={52} bn={bn4} color={URGENT} title="Mina R. · Urgent" body="Call me when you land" />
        {/* taps */}
        <Tap x={372} y={76} p={tapA} />
        <Tap x={350} y={598} p={tapB} />
      </div>
      <Obj id="closing" style={{position: 'absolute', left: 540, top: 250, width: 500, color: INK}}>
        <div style={{fontSize: 130, fontWeight: 700, lineHeight: 0.98}}>Quiet<br />Hours</div>
      </Obj>
      <Obj id="tagline" style={{position: 'absolute', left: 544, top: 540, width: 480, fontSize: 48, color: ACCENT, fontWeight: 700}}>New in Nook</Obj>
    </div>
  );
};

export default <Doc id="app-demo" title="Quiet Hours in Nook" lang="en" theme="visotalk/dark" canvas="9x16" exports={{captions: 'words'}}>
  <Scene id="demo">
    <Line id="l1">Meet Quiet Hours, the new feature in Nook.</Line>
    <Line id="l2">Reminders, shared edits and comments all buzz at once.</Line>
    <Line id="l3">So open settings, and a sheet slides up.</Line>
    <Line id="l4">Drag the edges to set your quiet hours.</Line>
    <Line id="l5">Say, ten at night to seven in the morning.</Line>
    <Line id="l6">Flip the switch, and Nook holds every notification.</Line>
    <Line id="l6b">Nothing is lost. It is only held for later.</Line>
    <Line id="l7">An urgent contact? Their message still gets through.</Line>
    <Line id="l8">When the hours end, Nook delivers one summary.</Line>
    <Line id="l9">Everything you missed, waiting in one calm place.</Line>
    <Line id="l9b">Read it whenever you choose.</Line>
    <Line id="l10" hold={2.5}>Quiet Hours, new in Nook.</Line>
    <Part id="phone" x={0} y={160} w={1080} h={820}>{() => <Phone />}</Part>
    <Animation>
      <Appear on="phone" at="start" dur={0}/>
      <Appear on="b1" line="l2" word="reminders"/>
      <Tween on="phone" bn1={1} line="l2" word="reminders" dur={0.5} easing="easeOut"/>
      <Appear on="b2" line="l2" word="shared edits"/>
      <Tween on="phone" bn2={1} line="l2" word="shared edits" dur={0.5} easing="easeOut"/>
      <Appear on="b3" line="l2" word="comments"/>
      <Tween on="phone" bn3={1} line="l2" word="comments" dur={0.5} easing="easeOut"/>
      <Tween on="phone" tapA={1} line="l3" word="settings" dur={0.6}/>
      <Disappear on={["b1", "b2", "b3"]} line="l3" word="sheet"/>
      <Tween on="phone" bn1={0} bn2={0} bn3={0} line="l3" word="sheet" dur={0.4}/>
      <Tween on="phone" sheet={1} line="l3" word="sheet" dur={1.0} easing="easeOut"/>
      <Tween on="phone" g={1} line="l4" word="edges" dur={0.3}/>
      <Tween on="phone" rA={22} line="l5" word="ten at night" dur={0.9} easing="easeInOut"/>
      <Tween on="phone" rB={31} line="l5" word="seven in the morning" dur={0.9} easing="easeInOut"/>
      <Tween on="phone" g={0} line="l5" edge="end" dur={0.3}/>
      <Tween on="phone" tapB={1} line="l6" word="flip" dur={0.6}/>
      <Tween on="phone" tog={1} line="l6" word="switch" dur={0.35}/>
      <Appear on="heldchip" line="l6b" word="held"/>
      <Appear on="urgent" line="l7" word="urgent contact"/>
      <Appear on="b4" line="l7" word="still gets through"/>
      <Tween on="phone" bn4={1} line="l7" word="still gets through" dur={0.5} easing="easeOut"/>
      <Disappear on="b4" line="l8" word="delivers"/>
      <Tween on="phone" bn4={0} line="l8" word="delivers" dur={0.4}/>
      <Tween on="phone" sheet={0} line="l8" word="hours end" dur={0.8} easing="easeIn"/>
      <Tween on="phone" clock={31} line="l8" word="hours end" dur={1.5} easing="easeInOut"/>
      <Appear on="sumcard" line="l8" word="summary"/>
      <Tween on="phone" sum={1} push={1} line="l8" word="summary" dur={0.8} easing="easeOut"/>
      <Appear on={["r1", "r2", "r3"]} stagger={0.35} line="l9" word="you missed"/>
      <Tween on="phone" px={40} line="l10" word="quiet hours" dur={1} easing="easeInOut"/>
      <Appear on="closing" line="l10" word="quiet hours" offset={0.8}/>
      <Appear on="tagline" line="l10" word="new in nook"/>
    </Animation>
  </Scene>
</Doc>;
