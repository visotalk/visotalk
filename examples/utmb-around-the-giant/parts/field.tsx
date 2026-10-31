import {useProp} from '@visotalk/runtime';
import {C, F, Head, mix, T} from './kit.tsx';

// Scene "field": every starter is one dot. The field sweeps in as the count rises; on the finishers' sentence the 1,760 who
// reached Chamonix turn orange and the 1,001 who did not go quiet, then the finishing rate fills a bar.
const COLS = 71, N = 2761, FIN = 1760;
const DOTS = Array.from({length: N}, (_, i) => ({
  x: 6 + (i % COLS) * 16.1,
  y: 6 + Math.floor(i / COLS) * 12.4,
  dnf: (i * 7919) % N < N - FIN,
}));
const FIN_DOTS = DOTS.filter((d) => !d.dnf);
const DNF_DOTS = DOTS.filter((d) => d.dnf);

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

export const Field = () => {
  const reveal = useProp('reveal', 0);
  const started = useProp('started', 0);
  const finished = useProp('finished', 0);
  const live = useProp('live', 0);
  const dead = useProp('dead', 0);
  const rate = useProp('rate', 0);
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <Head kicker="The field" title="Who starts, who finishes" size={66} w={540} />

      <div style={{position: 'absolute', left: 80, top: 258}}>
        <div style={{fontFamily: F.display, fontWeight: 800, fontSize: 96, lineHeight: 1, color: C.ink}}>{started > 1 ? fmt(started) : '—'}</div>
        <div style={{fontFamily: F.mono, fontSize: 22, letterSpacing: 3, color: C.quiet, marginTop: 4}}>STARTED · 2024</div>
      </div>

      <div style={{position: 'absolute', left: 80, top: 398}}>
        <div style={{fontFamily: F.display, fontWeight: 800, fontSize: 96, lineHeight: 1, color: C.accent}}>{finished > 1 ? fmt(finished) : '—'}</div>
        <div style={{fontFamily: F.mono, fontSize: 22, letterSpacing: 3, color: C.quiet, marginTop: 4}}>REACHED CHAMONIX</div>
      </div>

      <div style={{position: 'absolute', left: 80, top: 540}}>
        <div style={{fontFamily: F.display, fontWeight: 800, fontSize: 58, lineHeight: 1, color: C.quiet}}>{dead > 0.05 ? '1,001' : '—'}</div>
        <div style={{fontFamily: F.mono, fontSize: 22, letterSpacing: 3, color: C.faint, marginTop: 4}}>DID NOT FINISH</div>
      </div>

      <div style={{position: 'absolute', left: 80, top: 652}}>
        <div style={{fontFamily: F.display, fontWeight: 800, fontSize: 74, lineHeight: 1, color: C.ink}}>{rate > 0.01 ? `${Math.round(rate * 100)}%` : '—'}</div>
        <div style={{fontFamily: F.mono, fontSize: 22, letterSpacing: 3, color: C.quiet, marginTop: 4}}>FINISHING RATE</div>
        <div style={{position: 'absolute', left: 0, top: 118, width: 330, height: 6, background: C.edge}} />
        <div style={{position: 'absolute', left: 0, top: 118, width: 330 * rate, height: 6, background: C.accent}} />
      </div>

      <div style={{position: 'absolute', left: 660, top: 268, width: 1160, height: 530, borderRadius: 16, background: 'rgba(241,237,230,0.025)', border: `1px solid ${C.edge}`}}>
        <svg width={1140} height={500} viewBox="0 0 1140 500" style={{position: 'absolute', left: 10, top: 15}}>
          <defs>
            <clipPath id="field-reveal"><rect x={0} y={0} width={reveal * 1140} height={500} /></clipPath>
          </defs>
          <g clipPath="url(#field-reveal)">
            <g fill={mix(C.ink, C.accent, live)} opacity={0.62 + 0.3 * live}>
              {FIN_DOTS.map((d, i) => <circle key={`f${i}`} cx={d.x} cy={d.y} r={4.1} />)}
            </g>
            <g fill={C.quiet} opacity={0.6 - 0.32 * dead}>
              {DNF_DOTS.map((d, i) => <circle key={`d${i}`} cx={d.x} cy={d.y} r={4.1} />)}
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
};
