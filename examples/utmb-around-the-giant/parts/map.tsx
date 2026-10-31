import {Obj, useProp} from '@visotalk/runtime';
import {C, F, Head, T} from './kit.tsx';

// Scene "countries": the route drawn as it is spoken. A faint dashed loop is on the map from the first frame; each leg draws
// on the pass or town that the line names, and the country labels arrive with the country.
const ROUTE = 'M300,430 C330,490 340,545 360,590 C400,625 500,645 620,645 C690,642 750,625 790,600 C840,560 880,520 900,470 C915,410 905,350 890,300 C860,255 810,228 750,215 C690,205 620,200 560,205 C510,212 470,245 450,290 C420,330 350,390 300,430';

const Massif = () => (
  <g>
    <path d="M360,300 L410,250 L470,275 L510,225 L560,260 L610,215 L660,255 L710,230 L760,280 L790,340 L820,400 L780,460 L730,480 L690,530 L630,505 L580,545 L520,505 L470,520 L420,480 L390,430 L350,370 Z"
      fill="#18252C" stroke={C.edge} strokeWidth={1.5} />
    {[0, 1, 2].map((i) => (
      <ellipse key={i} cx={585} cy={378} rx={200 - i * 55} ry={140 - i * 38} fill="none" stroke={C.ice} strokeWidth={1} opacity={0.16} transform="rotate(-12 585 378)" />
    ))}
    {[[512, 300], [590, 268], [668, 308]].map(([x, y], i) => (
      <path key={i} d={`M${x - 13},${y + 8} L${x},${y - 12} L${x + 13},${y + 8} Z`} fill={C.ink} opacity={0.75} />
    ))}
    <text x={585} y={420} textAnchor="middle" fill={C.ink} fontSize={26} fontFamily={F.mono} letterSpacing={3}>MONT BLANC</text>
    <text x={585} y={450} textAnchor="middle" fill={C.quiet} fontSize={21} fontFamily={F.mono}>4,808 m</text>
  </g>
);

const Dot = ({x, y, r = 7, fill = C.ink}: {x: number; y: number; r?: number; fill?: string}) => (
  <circle cx={x} cy={y} r={r} fill={fill} stroke={C.ground} strokeWidth={2} />
);

const Pass = ({x, y, accent = false}: {x: number; y: number; accent?: boolean}) => (
  <path d={`M${x - 9},${y + 7} L${x},${y - 9} L${x + 9},${y + 7} Z`} fill={accent ? C.accent : C.ice} stroke={C.ground} strokeWidth={2} />
);

const Leg = ({id, d, p}: {id: string; d: string; p: number}) => (
  <path id={id} d={d} pathLength={1} fill="none" stroke={C.accent} strokeWidth={5} strokeLinecap="round"
    strokeDasharray={1} strokeDashoffset={1 - p} />
);

export const MapScene = () => {
  const d1 = useProp('d1', 0), d2 = useProp('d2', 0), d3 = useProp('d3', 0);
  const d4 = useProp('d4', 0), d5 = useProp('d5', 0), d6 = useProp('d6', 0);
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <Head kicker="The route" title="Three countries, one loop" size={72} w={540}
        sub="France, Italy and Switzerland — a single circuit around the massif." />

      <div style={{position: 'absolute', left: 640, top: 180, width: 1200, height: 700, borderRadius: 18, overflow: 'hidden', background: '#0C151A', boxShadow: `inset 0 0 0 1px ${C.edge}, 0 30px 80px rgba(0,0,0,0.35)`}}>
        <svg width={1200} height={700} viewBox="0 0 1200 700" style={{display: 'block'}}>
          {Array.from({length: 19}, (_, i) => <line key={`v${i}`} x1={i * 64} y1={0} x2={i * 64} y2={700} stroke={C.ink} strokeWidth={1} opacity={0.03} />)}
          {Array.from({length: 11}, (_, i) => <line key={`h${i}`} x1={0} y1={i * 64} x2={1200} y2={i * 64} stroke={C.ink} strokeWidth={1} opacity={0.03} />)}

          <path d={ROUTE} fill="none" stroke={C.ink} strokeWidth={2} strokeDasharray="5 9" opacity={0.28} />
          <path d={ROUTE} fill="none" stroke={C.ink} strokeWidth={54} opacity={0.02} />

          <Massif />

          <text x={168} y={566} fill={C.quiet} fontSize={28} fontFamily={F.mono} letterSpacing={7}>FRANCE</text>

          <Dot x={300} y={430} r={9} fill={C.accent} />
          <text x={300} y={396} textAnchor="middle" fill={C.ink} fontSize={24} fontFamily={F.mono} letterSpacing={2}>CHAMONIX</text>

          <Dot x={360} y={590} r={5} fill={C.quiet} />
          <text x={348} y={588} textAnchor="end" fill={C.quiet} fontSize={19} fontFamily={F.mono}>LES CONTAMINES</text>

          <Obj as="g" id="seigne">
            <Pass x={620} y={645} />
            <text x={620} y={618} textAnchor="middle" fill={C.ink} fontSize={19} fontFamily={F.mono}>COL DE LA SEIGNE · 2,516 m</text>
          </Obj>

          <Obj as="g" id="italy">
            <Dot x={790} y={600} r={8} fill={C.ink} />
            <text x={804} y={592} fill={C.ink} fontSize={21} fontFamily={F.mono}>COURMAYEUR</text>
            <text x={990} y={664} fill={C.quiet} fontSize={26} fontFamily={F.mono} letterSpacing={7}>ITALY</text>
          </Obj>

          <Obj as="g" id="ferret">
            <Pass x={900} y={470} accent />
            <text x={924} y={458} fill={C.accent} fontSize={22} fontFamily={F.mono} letterSpacing={1}>GRAND COL FERRET</text>
          </Obj>
          <Obj as="g" id="highest">
            <text x={924} y={486} fill={C.ink} fontSize={19} fontFamily={F.mono}>2,537 m · HIGHEST POINT</text>
          </Obj>

          <Obj as="g" id="switzerland">
            <Dot x={890} y={300} r={7} fill={C.ink} />
            <text x={902} y={292} fill={C.ink} fontSize={21} fontFamily={F.mono}>CHAMPEX-LAC</text>
            <text x={1000} y={206} fill={C.quiet} fontSize={24} fontFamily={F.mono} letterSpacing={6}>SWITZERLAND</text>
          </Obj>

          <Obj as="g" id="balme">
            <Pass x={560} y={205} />
            <text x={560} y={180} textAnchor="middle" fill={C.ink} fontSize={19} fontFamily={F.mono}>COL DE BALME · 2,204 m</text>
          </Obj>

          <Obj as="g" id="home">
            <circle cx={300} cy={430} r={30} fill="none" stroke={C.accent} strokeWidth={2} opacity={0.55} />
            <circle cx={300} cy={430} r={44} fill="none" stroke={C.accent} strokeWidth={1.5} opacity={0.25} />
          </Obj>

          <Leg id="leg1" d="M300,430 C330,490 340,545 360,590 C400,625 500,645 620,645" p={d1} />
          <Leg id="leg2" d="M620,645 C690,642 750,625 790,600" p={d2} />
          <Leg id="leg3" d="M790,600 C840,560 880,520 900,470" p={d3} />
          <Leg id="leg4" d="M900,470 C915,410 905,350 890,300" p={d4} />
          <Leg id="leg5" d="M890,300 C860,255 810,228 750,215 C690,205 620,200 560,205" p={d5} />
          <Leg id="leg6" d="M560,205 C510,212 470,245 450,290 C420,330 350,390 300,430" p={d6} />
        </svg>
      </div>

      <div style={{position: 'absolute', left: 80, top: 560, width: 500}}>
        <div style={{fontFamily: F.mono, fontSize: 20, letterSpacing: 4, color: C.accent}}>ONE LOOP · THREE BORDERS</div>
        <div style={{fontFamily: F.sans, fontSize: 25, lineHeight: 1.45, color: C.quiet, marginTop: 12}}>
          The Seigne, the Ferret, the Balme: three passes, three border crossings, one continuous trail.
        </div>
      </div>
    </div>
  );
};
