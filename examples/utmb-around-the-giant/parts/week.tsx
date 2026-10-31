import {Obj} from '@visotalk/runtime';
import {C, F, Head, T} from './kit.tsx';

// Scene "week": the eight races of the week as bars from one start line, scaled to distance. The UTMB is the final, PTL is
// the longest; the named races grow on their words, the rest sit quiet as the festival around them.
const RACES = [
  {code: 'PTL', name: 'La Petite Trotte à Léon · teams of 2–3', km: 300, grow: true},
  {code: 'UTMB', name: 'Ultra-Trail du Mont-Blanc', km: 176, grow: true, main: true},
  {code: 'TDS', name: 'Sur les Traces des Ducs de Savoie', km: 148, grow: true},
  {code: 'CCC', name: 'Courmayeur – Champex – Chamonix', km: 101, grow: true},
  {code: 'OCC', name: 'Orsières – Champex – Chamonix', km: 57, grow: true},
  {code: 'MCC', name: 'Martigny-Combe – Chamonix', km: 40},
  {code: 'ETC', name: 'Experience Trail Courmayeur', km: 15},
  {code: 'YCC', name: 'Youth Chamonix – Courmayeur', km: 15},
];
const W = (km: number) => (km / 300) * 1000;
const TOP = 250, ROW = 76;

const stripe = 'repeating-linear-gradient(135deg, rgba(143,211,227,0.78) 0 9px, rgba(143,211,227,0.4) 9px 18px)';

export const Week = () => (
  <div style={{position: 'absolute', inset: 0}}>
    <Head kicker="The week" title="A week, eight races" size={72} w={900}
      sub="The UTMB is the final. Around it, a whole festival of trail running." />

    <Obj id="week-tag" style={{position: 'absolute', right: 80, top: 56, display: 'flex', alignItems: 'center', gap: 14}}>
      <span style={{width: 8, height: 8, background: C.accent}} />
      <span style={{fontFamily: F.mono, fontSize: 22, fontWeight: 700, letterSpacing: 3, color: C.accent}}>8 EVENTS · 10,000 RUNNERS</span>
    </Obj>

    {RACES.map((r, i) => {
      const y = TOP + i * ROW;
      const w = W(r.km);
      return (
        <div key={r.code}>
          <div style={{position: 'absolute', left: 80, top: y + 12, width: 90, fontFamily: F.mono, fontSize: 33, fontWeight: 700, color: r.main ? C.accent : C.ink, letterSpacing: 1}}>{r.code}</div>
          <div style={{position: 'absolute', left: 196, top: y + 22, width: 420, fontFamily: F.sans, fontSize: 24, color: r.main ? C.ink : C.quiet}}>{r.name}</div>
          <div style={{position: 'absolute', left: 600, top: y + 20, width: 144, textAlign: 'right', fontFamily: F.mono, fontSize: 24, color: r.grow ? C.ink : C.faint}}>{r.km} km</div>

          <div style={{position: 'absolute', left: 760, top: y + 19, width: w, height: 38, borderRadius: 3, border: `1px dashed ${r.grow ? 'rgba(241,237,230,0.16)' : 'transparent'}`, background: 'rgba(241,237,230,0.04)', boxSizing: 'border-box'}} />

          {r.grow ? (
            <Obj id={`bar-${r.code.toLowerCase()}`} style={{position: 'absolute', left: 760, top: y + 19, width: 0, height: 38, borderRadius: 3, background: r.main ? C.accent : r.code === 'PTL' ? stripe : 'rgba(143,211,227,0.58)'}} />
          ) : (
            <div style={{position: 'absolute', left: 760, top: y + 19, width: w, height: 38, borderRadius: 3, background: 'rgba(143,211,227,0.2)'}} />
          )}
        </div>
      );
    })}

    <Obj id="final" style={{position: 'absolute', left: 1362, top: TOP + ROW + 27, fontFamily: F.mono, fontSize: 21, fontWeight: 700, letterSpacing: 3, color: C.accent}}>THE FINAL</Obj>

    <Obj id="teams" style={{position: 'absolute', left: 1560, top: TOP + 27, fontFamily: F.mono, fontSize: 20, fontWeight: 700, letterSpacing: 2, color: '#0B1116'}}>25,000 m D+</Obj>
  </div>
);
