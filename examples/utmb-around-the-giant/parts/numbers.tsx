import {Obj, useProp} from '@visotalk/runtime';
import {C, F, Head, mix, T} from './kit.tsx';

// Scene "loop": the race card. Three figures count up on their words (km, metres of climb, the limit) and the panel on the
// right compares the total ascent with Everest: the UTMB bar grows past the Everest bar as the line names it.
const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
const MAXH = 360;
const SCALE = MAXH / 10500;

export const Numbers = () => {
  const km = useProp('km', 0);
  const climb = useProp('climb', 0);
  const everest = useProp('everest', 0);
  const hUTMB = climb * SCALE;
  const hEv = everest * SCALE;
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <Head kicker="The race" title="One loop around the massif" size={78} sub="The Ultra-Trail du Mont-Blanc, in three numbers." />

      <div style={{position: 'absolute', left: 80, top: 288}}>
        <div style={{display: 'flex', alignItems: 'baseline', gap: 20}}>
          <span style={{fontFamily: F.display, fontWeight: 800, fontSize: 132, lineHeight: 1, color: C.ink}}>{km > 0.5 ? fmt(km) : "—"}</span>
          <span style={{fontFamily: F.mono, fontSize: 34, color: C.quiet}}>km</span>
        </div>
        <div style={{fontFamily: F.sans, fontSize: 27, color: C.quiet, marginTop: 2}}>one lap of the massif</div>
      </div>

      <div style={{position: 'absolute', left: 80, top: 462}}>
        <div style={{display: 'flex', alignItems: 'baseline', gap: 20}}>
          <span style={{fontFamily: F.display, fontWeight: 800, fontSize: climb > 0.5 ? 132 : 58, lineHeight: 1, color: climb > 0.5 ? C.ink : C.faint}}>{climb > 0.5 ? fmt(climb) : "—"}</span>
          {climb > 0.5 ? <span style={{fontFamily: F.mono, fontSize: 34, color: C.quiet}}>m</span> : null}
        </div>
        <div style={{fontFamily: F.sans, fontSize: 27, color: C.quiet, marginTop: 2}}>of positive ascent</div>
      </div>

      <Obj id="limit" style={{position: 'absolute', left: 80, top: 646}}>
        <div style={{display: 'flex', alignItems: 'baseline', gap: 20}}>
          <span style={{fontFamily: F.display, fontWeight: 800, fontSize: 132, lineHeight: 1, color: C.ink}}>46:30</span>
          <span style={{fontFamily: F.mono, fontSize: 34, color: C.quiet}}>h</span>
        </div>
        <div style={{fontFamily: F.sans, fontSize: 27, color: C.quiet, marginTop: 2}}>time limit, Friday to Sunday</div>
      </Obj>

      <div style={{position: 'absolute', left: 980, top: 226, width: 860, height: 600, borderRadius: 20, background: `linear-gradient(155deg, ${C.panel2}, #0C1418)`, border: `1px solid ${C.edge}`, boxShadow: '0 26px 70px rgba(0,0,0,0.35)'}}>
        <div style={{position: 'absolute', left: 42, top: 36, fontFamily: F.mono, fontSize: 20, fontWeight: 700, letterSpacing: 4, color: C.accent}}>TOTAL ASCENT</div>
        <div style={{position: 'absolute', left: 42, top: 68, fontFamily: F.sans, fontSize: 24, color: C.quiet}}>The race against the mountain, from sea level</div>

        <div style={{position: 'absolute', left: 0, top: 486, width: 860, height: 1, background: C.edge}} />

        <div style={{position: 'absolute', left: 196, top: 486 - MAXH, width: 176, height: MAXH, border: `1.5px dashed ${C.edge}`, background: 'rgba(241,237,230,0.045)', boxSizing: 'border-box'}} />
        <div style={{position: 'absolute', left: 470, top: 486 - MAXH, width: 176, height: MAXH, border: `1.5px dashed ${C.edge}`, background: 'rgba(241,237,230,0.045)', boxSizing: 'border-box'}} />

        <div style={{position: 'absolute', left: 196, top: 486 - hUTMB, width: 176, height: hUTMB, background: C.accent}} />
        <div style={{position: 'absolute', left: 470, top: 486 - hEv, width: 176, height: hEv, background: C.ice}} />

        {climb > 40 ? <div style={{position: 'absolute', left: 196, top: 486 - hUTMB - 46, width: 176, textAlign: 'center', fontFamily: F.mono, fontSize: 30, fontWeight: 700, color: C.accent}}>{climb > 0.5 ? fmt(climb) : "—"} m</div> : null}
        {everest > 40 ? <div style={{position: 'absolute', left: 470, top: 486 - hEv - 46, width: 176, textAlign: 'center', fontFamily: F.mono, fontSize: 30, fontWeight: 700, color: C.ice}}>{fmt(everest)} m</div> : null}

        <div style={{position: 'absolute', left: 196, top: 500, width: 176, textAlign: 'center', fontFamily: F.mono, fontSize: 24, letterSpacing: 2, color: C.ink}}>UTMB</div>
        <div style={{position: 'absolute', left: 470, top: 500, width: 176, textAlign: 'center', fontFamily: F.mono, fontSize: 24, letterSpacing: 2, color: C.quiet}}>EVEREST</div>

        {everest > 40 ? <>
          <div style={{position: 'absolute', left: 150, top: 486 - hEv, width: 530, height: 1, background: `repeating-linear-gradient(90deg, ${C.ice} 0 8px, transparent 8px 16px)`, opacity: 0.55}} />
          <div style={{position: 'absolute', left: 690, top: 486 - hEv - 15, fontFamily: F.sans, fontSize: 23, color: C.ice}}>Everest, from sea level</div>
        </> : null}

        <div style={{position: 'absolute', left: 42, top: 546, fontFamily: F.sans, fontSize: 22, color: C.faint}}>UTMB 2024 course: 176.4 km · 9,915 m D+</div>
      </div>
    </div>
  );
};
