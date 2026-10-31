import {Obj, useProp} from '@visotalk/runtime';
import {C, F, Head} from './kit.tsx';

// Scene "champions": two stopwatch dials whose arcs fill against the 46 h 30 limit. The times count up on the names; the bar
// underneath puts the median finisher and the cut-off on the same scale.

const START = 135, SWEEP = 270, LIMIT = 2790;
const pt = (cx: number, cy: number, r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
};
const arc = (cx: number, cy: number, r: number, a0: number, a1: number) => {
  const [x0, y0] = pt(cx, cy, r, a0);
  const [x1, y1] = pt(cx, cy, r, a1);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 ${large} 1 ${x1.toFixed(2)},${y1.toFixed(2)}`;
};
const clock = (m: number) => {
  const h = Math.floor(m / 60), mm = Math.floor(m % 60);
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
};

const Gauge = ({cx, cy, m, name, year}: {cx: number; cy: number; m: number; name: string; year: string}) => {
  const frac = Math.max(0, Math.min(1, m / LIMIT));
  const end = START + SWEEP * frac;
  return (
    <g>
      <circle cx={cx} cy={cy} r={150} fill="#0D161B" stroke={C.edge} strokeWidth={1} />
      <path d={arc(cx, cy, 165, START, START + SWEEP)} fill="none" stroke={C.edge} strokeWidth={10} />
      <path d={arc(cx, cy, 165, START, end)} fill="none" stroke={C.accent} strokeWidth={10} strokeLinecap="round" />
      {Array.from({length: 9}, (_, i) => {
        const a = START + (SWEEP * i) / 8;
        const [x0, y0] = pt(cx, cy, 184, a), [x1, y1] = pt(cx, cy, 196, a);
        return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} stroke={C.ink} strokeWidth={1.5} opacity={0.35} />;
      })}
      <text x={cx} y={cy - 14} textAnchor="middle" fill={C.ink} fontSize={96} fontFamily={F.display} fontWeight={800}>{clock(m)}</text>
      <text x={cx} y={cy + 48} textAnchor="middle" fill={C.quiet} fontSize={28} fontFamily={F.mono}>{year === '2023' ? '43″' : '31″'}</text>
      <text x={cx} y={cy - 216} textAnchor="middle" fill={C.ink} fontSize={26} fontFamily={F.mono} letterSpacing={2}>{name}</text>
      <text x={cx} y={cy - 186} textAnchor="middle" fill={C.quiet} fontSize={20} fontFamily={F.mono} letterSpacing={3}>{year} · {year === '2023' ? 'MEN' : 'WOMEN'}</text>
    </g>
  );
};

const bx = (min: number) => 200 + (min / LIMIT) * 1520;

export const Champions = () => {
  const m1 = useProp('m1', 0);
  const m2 = useProp('m2', 0);
  const bar = useProp('bar', 0);
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <Head kicker="The front" title="Two very fast laps" size={78} w={900}
        sub="The winning times of 2023 and 2024, against the 46 h 30 limit." />

      <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{position: 'absolute', inset: 0}}>
        <Gauge cx={470} cy={560} m={m1} name="JIM WALMSLEY" year="2023" />
        <Gauge cx={1450} cy={560} m={m2} name="KATIE SCHIDE" year="2024" />

        <Obj as="g" id="fieldbar">
          <line x1={200} y1={818} x2={200 + 1520 * bar} y2={818} stroke={C.faint} strokeWidth={4} />
          <text x={200} y={786} textAnchor="start" fill={C.quiet} fontSize={20} fontFamily={F.mono}>0 h</text>
          <line x1={bx(1177)} y1={796} x2={bx(1177)} y2={840} stroke={C.quiet} strokeWidth={2.5} />
          <line x1={bx(1329)} y1={796} x2={bx(1329)} y2={840} stroke={C.quiet} strokeWidth={2.5} />
        </Obj>

        <Obj as="g" id="median">
          <circle cx={bx(2434)} cy={818} r={9} fill={C.accent} />
          <text x={bx(2434)} y={786} textAnchor="middle" fill={C.accent} fontSize={22} fontFamily={F.mono} fontWeight={700}>MEDIAN · 40:34</text>
        </Obj>

        <Obj as="g" id="cutoff">
          <line x1={1720} y1={796} x2={1720} y2={840} stroke={C.ice} strokeWidth={3} />
          <text x={1720} y={856} textAnchor="end" fill={C.ice} fontSize={22} fontFamily={F.mono} fontWeight={700}>CUT-OFF · 46:30</text>
        </Obj>
      </svg>
    </div>
  );
};
