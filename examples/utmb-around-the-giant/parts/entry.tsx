import {Obj, useProp} from '@visotalk/runtime';
import {C, F, Head} from './kit.tsx';

// Scene "entry": the way onto the start line as a three-step diagram. The flow draws from the stone to the lottery to the
// start line; the 1-in-3 figure lands under the last node, and a return arc closes the loop for next year.
const PATH_RETURN = 'M1620,574 C1620,800 1450,856 960,856 C470,856 300,800 300,574';

export const Entry = () => {
  const f1 = useProp('f1', 0);
  const f2 = useProp('f2', 0);
  const ret = useProp('ret', 0);
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <Head kicker="Getting in" title="The way in" size={80} w={620}
        sub="Not a sign-up: a stone, then a draw, then a start line." />

      <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{position: 'absolute', inset: 0}}>
        <line x1={300} y1={500} x2={1620} y2={500} stroke={C.ink} strokeWidth={2} strokeDasharray="4 10" opacity={0.18} />
        <path d="M300,500 L960,500" pathLength={1} fill="none" stroke={C.accent} strokeWidth={3} strokeDasharray={1} strokeDashoffset={1 - f1} />
        <path d="M960,500 L1620,500" pathLength={1} fill="none" stroke={C.accent} strokeWidth={3} strokeDasharray={1} strokeDashoffset={1 - f2} />
        <path d={PATH_RETURN} pathLength={1} fill="none" stroke={C.accent} strokeWidth={2} strokeDasharray={1} strokeDashoffset={1 - ret} opacity={0.7} />
        {ret > 0.9 ? <path d="M300,574 L292,594 L308,594 Z" fill={C.accent} /> : null}

        {[300, 960, 1620].map((x, i) => (
          <g key={x}>
            <circle cx={x} cy={500} r={74} fill={C.panel} stroke={C.edge} strokeWidth={1.5} />
            <text x={x} y={404} textAnchor="middle" fill={C.quiet} fontSize={22} fontFamily={F.mono} letterSpacing={4}>{`0${i + 1}`}</text>
          </g>
        ))}

        <Obj as="g" id="ring1"><circle cx={300} cy={500} r={82} fill="none" stroke={C.accent} strokeWidth={2} /></Obj>
        <Obj as="g" id="ring2"><circle cx={960} cy={500} r={82} fill="none" stroke={C.accent} strokeWidth={2} /></Obj>
        <Obj as="g" id="ring3"><circle cx={1620} cy={500} r={82} fill="none" stroke={C.accent} strokeWidth={2} /></Obj>

        <Obj as="g" id="stone">
          <path d="M274,504 L286,476 L316,480 L330,506 L312,528 L284,522 Z" fill={C.ice} />
          <path d="M274,504 L312,528 M286,476 L274,504 L330,506 M316,480 L330,506" stroke={C.ground} strokeWidth={2} fill="none" />
        </Obj>

        <Obj as="g" id="drum">
          <circle cx={960} cy={500} r={34} fill="none" stroke={C.ink} strokeWidth={2.5} />
          <rect x={932} y={480} width={22} height={30} rx={2} fill={C.accent} transform="rotate(-14 943 495)" />
          <rect x={958} y={476} width={22} height={30} rx={2} fill={C.ice} transform="rotate(10 969 491)" />
          <rect x={974} y={490} width={20} height={28} rx={2} fill={C.ink} opacity={0.8} transform="rotate(26 984 504)" />
        </Obj>

        <Obj as="g" id="bib">
          <rect x={1590} y={466} width={60} height={72} rx={4} fill={C.ink} />
          <text x={1620} y={516} textAnchor="middle" fill={C.ground} fontSize={30} fontFamily={F.mono} fontWeight={700}>1</text>
          <circle cx={1602} cy={478} r={2.6} fill={C.ground} /><circle cx={1638} cy={478} r={2.6} fill={C.ground} />
          <circle cx={1602} cy={526} r={2.6} fill={C.ground} /><circle cx={1638} cy={526} r={2.6} fill={C.ground} />
        </Obj>

        <text x={300} y={610} textAnchor="middle" fill={C.ink} fontSize={26} fontFamily={F.mono} letterSpacing={2}>RUNNING STONE</text>
        <text x={960} y={610} textAnchor="middle" fill={C.ink} fontSize={26} fontFamily={F.mono} letterSpacing={2}>THE LOTTERY</text>
        <text x={1620} y={610} textAnchor="middle" fill={C.ink} fontSize={26} fontFamily={F.mono} letterSpacing={2}>THE START LINE</text>

        <text x={300} y={648} textAnchor="middle" fill={C.quiet} fontSize={23} fontFamily={F.sans}>finish a UTMB World Series race</text>
        <text x={300} y={678} textAnchor="middle" fill={C.quiet} fontSize={23} fontFamily={F.sans}>to earn one</text>
        <text x={960} y={648} textAnchor="middle" fill={C.quiet} fontSize={23} fontFamily={F.sans}>every stone is one entry</text>
        <text x={960} y={678} textAnchor="middle" fill={C.quiet} fontSize={23} fontFamily={F.sans}>in the draw</text>

        <Obj as="g" id="odds">
          <text x={1620} y={292} textAnchor="middle" fill={C.accent} fontSize={84} fontFamily={F.display} fontWeight={800}>≈ 1 IN 3</text>
          <text x={1620} y={334} textAnchor="middle" fill={C.quiet} fontSize={22} fontFamily={F.mono} letterSpacing={3}>GETS A PLACE</text>
        </Obj>

        <Obj as="g" id="again">
          <text x={960} y={896} textAnchor="middle" fill={C.accent} fontSize={22} fontFamily={F.mono} letterSpacing={4}>TRY AGAIN NEXT YEAR</text>
        </Obj>
      </svg>
    </div>
  );
};
