import {Obj, useProp} from '@visotalk/runtime';
import {C, F, Head, mix, T} from './kit.tsx';

// Scene "night": the race seen as one night-to-dawn profile. The clock rail and the marker on the elevation profile move
// together as the hours pass; the sky behind them goes from dusk to dawn to a second night.
const PROFILE: Array<[number, number]> = [
  [0, 1035], [6, 1200], [12, 1653], [18, 1240], [25, 1150], [31, 1150], [38, 1700], [44, 2200],
  [50, 2479], [56, 1549], [62, 2000], [66, 2300], [70, 2516], [74, 2350], [78, 1700], [82, 1190],
  [88, 1750], [93, 1989], [97, 1769], [101, 2100], [105, 2537], [110, 2100], [116, 1700], [122, 1550],
  [130, 1466], [137, 1600], [142, 1300], [148, 1350], [152, 1900], [156, 2204], [160, 1800],
  [166, 1400], [171, 1200], [176, 1035],
];

const X = (km: number) => 110 + (km / 176) * 1700;
const Y = (alt: number) => 820 - ((alt - 1000) / 1700) * 460;
const linePath = PROFILE.map(([km, alt], i) => `${i === 0 ? 'M' : 'L'}${X(km).toFixed(1)},${Y(alt).toFixed(1)}`).join(' ');
const areaPath = `${linePath} L${X(176).toFixed(1)},820 L${X(0).toFixed(1)},820 Z`;

const altAt = (km: number) => {
  for (let i = 1; i < PROFILE.length; i++) {
    const [k1, a1] = PROFILE[i - 1], [k2, a2] = PROFILE[i];
    if (km <= k2) return a1 + ((a2 - a1) * (km - k1)) / Math.max(1, k2 - k1);
  }
  return 1035;
};

const STARS = Array.from({length: 46}, (_, i) => ({
  x: (i * 137 + 40) % 1860, y: (i * i * 53) % 340 + 24, r: i % 6 === 0 ? 1.9 : 1.1, o: 0.25 + (i % 7) * 0.07,
}));

const HOURS = [0, 6, 12, 18, 24, 30, 36, 42, 46.5];
const CLOCK = ['18:00', '00:00', '06:00', '12:00', '18:00', '00:00', '06:00', '12:00', '16:30'];

export const Night = () => {
  const t = useProp('t', 0);
  const phase = useProp('phase', 0);
  const km = t * 176;
  const markX = X(km);
  const markY = Y(altAt(km));
  const railX = 110 + t * 1700;
  const skyTop = mix('#060C15', '#0A1526', phase);
  const skyMid = mix('#0B1723', '#274450', phase);
  const skyHor = mix('#1A2A34', '#C98A5E', phase);
  return (
    <div style={{position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${skyTop} 0%, ${skyMid} 52%, ${skyHor} 82%, #0B1116 100%)`, overflow: 'hidden'}}>
      <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{position: 'absolute', inset: 0}}>
        {STARS.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={C.ink} opacity={s.o * (1 - phase)} />)}
      </svg>

      <Head kicker="The long night" title="A second day, a second night" size={64} w={800}
        sub="One start, 46 and a half hours, one finish line." />

      {/* the clock rail */}
      <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{position: 'absolute', inset: 0}}>
        <line x1={110} y1={262} x2={1810} y2={262} stroke={C.ink} strokeWidth={2} opacity={0.35} />
        {HOURS.map((h, i) => {
          const x = 110 + (h / 46.5) * 1700;
          const anchor = i === 0 ? 'start' : i === HOURS.length - 1 ? 'end' : 'middle';
          return (
            <g key={h}>
              <line x1={x} y1={254} x2={x} y2={276} stroke={C.ink} strokeWidth={1.5} opacity={0.45} />
              <text x={x} y={240} textAnchor={anchor} fill={C.quiet} fontSize={20} fontFamily={F.mono}>{CLOCK[i]}</text>
            </g>
          );
        })}
        {[0, 24].map((h) => (
          <rect key={h} x={110 + (h / 46.5) * 1700} y={262} width={(12 / 46.5) * 1700} height={9} fill={C.ink} opacity={0.09} />
        ))}

        <Obj as="g" id="snight">
          <rect x={110 + (24 / 46.5) * 1700} y={262} width={(12 / 46.5) * 1700} height={9} fill={C.accent} opacity={0.32} />
          <text x={110 + (30 / 46.5) * 1700} y={306} textAnchor="middle" fill={C.accent} fontSize={21} fontFamily={F.mono} letterSpacing={4}>SECOND NIGHT</text>
        </Obj>

        <Obj as="g" id="cut">
          <text x={1810} y={220} textAnchor="end" fill={C.accent} fontSize={24} fontFamily={F.mono} fontWeight={700}>46:30</text>
          <text x={1810} y={296} textAnchor="end" fill={C.ink} fontSize={20} fontFamily={F.mono} opacity={0.7}>CUT-OFF</text>
        </Obj>

        <path d={`M${railX - 9},${262 - 9} L${railX + 9},${262 - 9} L${railX},${262 + 11} Z`} fill={C.accent} />
        <line x1={railX} y1={262} x2={railX} y2={280} stroke={C.accent} strokeWidth={2} />

        {/* the profile */}
        <defs>
          <linearGradient id="prof" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={C.ice} stopOpacity={0.26} />
            <stop offset="1" stopColor={C.ice} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#prof)" />
        <path d={linePath} fill="none" stroke={C.ice} strokeWidth={2.5} strokeLinejoin="round" />

        {[[0, 1035], [82, 1190], [105, 2537], [130, 1466], [176, 1035]].map(([k, a]) => (
          <circle key={k} cx={X(k)} cy={Y(a)} r={5} fill={C.ink} stroke={C.ground} strokeWidth={2} />
        ))}

        <text x={110} y={850} textAnchor="start" fill={C.ink} fontSize={21} fontFamily={F.mono} letterSpacing={2}>CHAMONIX</text>
        <text x={X(82)} y={798} textAnchor="middle" fill={C.ink} fontSize={20} fontFamily={F.mono}>COURMAYEUR · 1,190 m</text>
        <text x={X(105)} y={384} textAnchor="middle" fill={C.accent} fontSize={21} fontFamily={F.mono}>GRAND COL FERRET · 2,537 m</text>
        <text x={X(130)} y={722} textAnchor="middle" fill={C.ink} fontSize={20} fontFamily={F.mono}>CHAMPEX-LAC · 1,466 m</text>
        <text x={1810} y={850} textAnchor="end" fill={C.ink} fontSize={21} fontFamily={F.mono} letterSpacing={2}>CHAMONIX</text>

        <Obj as="g" id="italy">
          <line x1={X(70)} y1={848} x2={X(105)} y2={848} stroke={C.ice} strokeWidth={2} />
          <line x1={X(70)} y1={840} x2={X(70)} y2={856} stroke={C.ice} strokeWidth={2} />
          <line x1={X(105)} y1={840} x2={X(105)} y2={856} stroke={C.ice} strokeWidth={2} />
          <text x={(X(70) + X(105)) / 2} y={878} textAnchor="middle" fill={C.ice} fontSize={22} fontFamily={F.mono} letterSpacing={6}>ITALY</text>
        </Obj>

        <circle cx={markX} cy={markY} r={9} fill={C.accent} stroke={C.ink} strokeWidth={2.5} />
        <line x1={markX} y1={markY + 12} x2={markX} y2={820} stroke={C.accent} strokeWidth={1.5} opacity={0.35} />
        {t < 0.96 ? <text x={markX} y={markY - 18} textAnchor="middle" fill={C.accent} fontSize={20} fontFamily={F.mono} fontWeight={700}>{Math.round(km)} km</text> : null}
      </svg>

      <div style={{position: 'absolute', left: 80, bottom: 188, fontFamily: F.mono, fontSize: 20, letterSpacing: 2, color: 'rgba(241,237,230,0.5)'}}>
        SCHEMATIC PROFILE · THE UTMB, 2024
      </div>
    </div>
  );
};
