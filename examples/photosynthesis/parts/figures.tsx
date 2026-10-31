import {Obj, useProp, useAsset} from '@visotalk/runtime';

export const C = {
  green: '#2f8f5b',
  teal: '#0f766e',
  dark: '#1f3b36',
  amber: '#f2a93b',
  blue: '#4ba3c7',
  cream: '#fbf5e6',
  pale: '#dcefd9',
  mute: '#4a6b5e',
};

export const T = ({s = 40, c = C.dark, w = 400, lh = 1.25, children}: any) => (
  <div style={{fontFamily: 'var(--vt-sans)', fontSize: s, lineHeight: lh, fontWeight: w, color: c}}>{children}</div>
);

export const LeafPic = ({asset, grow = 1}: {asset: string; grow?: number}) => {
  const src = useAsset(asset);
  return <img src={src} style={{width: '100%', height: '100%', objectFit: 'contain', transform: `scale(${grow})`}} />;
};

// ---------- a chloroplast: an oval body with grana stacks in a fluid ----------
export const Chloroplast = () => {
  const lit = useProp('lit', 0);
  const stroma = useProp('stroma', 0);
  const stacks = [
    {x: 210, y: 190, n: 5},
    {x: 340, y: 250, n: 6},
    {x: 470, y: 180, n: 4},
  ];
  return (
    <svg viewBox="0 0 760 500" width="100%" height="100%">
      <ellipse cx={380} cy={250} rx={350} ry={225} fill={C.pale} stroke={C.green} strokeWidth={6} />
      <ellipse cx={380} cy={250} rx={330} ry={205} fill={C.green} opacity={0.10 + 0.25 * stroma} />
      {stacks.map((s, i) => (
        <Obj as="g" key={i} id={`granum-${i + 1}`}>
          {Array.from({length: s.n}, (_, k) => (
            <rect key={k} x={s.x - 55} y={s.y + k * 26} width={110} height={16} rx={8}
              fill={lit > 0.05 ? C.amber : C.teal} opacity={0.75 + 0.25 * lit} />
          ))}
        </Obj>
      ))}
      {Array.from({length: 7}, (_, k) => (
        <path key={k} d={`M 120 ${120 + k * 44} Q 380 ${96 + k * 44}, 640 ${124 + k * 44}`} fill="none" stroke={C.teal} strokeWidth={3} opacity={0.18} />
      ))}
      {Array.from({length: 26}, (_, i) => (
        <circle key={i} cx={130 + ((i * 137) % 500)} cy={90 + ((i * 89) % 330)} r={5} fill={C.teal} opacity={0.35} />
      ))}
      <Obj as="g" id="stroma-label-dot">
        <circle cx={640} cy={330} r={14} fill={C.teal} opacity={0.5} />
      </Obj>
    </svg>
  );
};

// ---------- step one: light splits water, carriers charge ----------
export const LightStep = () => {
  const split = useProp('split', 0);
  const charge = useProp('charge', 0);
  return (
    <svg viewBox="0 0 1600 720" width="100%" height="100%">
      {/* light rays from above */}
      <Obj as="g" id="rays">
        {[0, 1, 2, 3, 4].map((i) => (
          <line key={i} x1={300 + i * 52} y1={30} x2={360 + i * 52} y2={196} stroke={C.amber} strokeWidth={10} strokeLinecap="round" strokeDasharray="16 18" />
        ))}
        <circle cx={420} cy={26} r={20} fill={C.amber} opacity={0.5} />
      </Obj>
      {/* water in */}
      <Obj as="g" id="water-in">
        <circle cx={110} cy={330} r={66} fill="#ffffff" stroke={C.blue} strokeWidth={6} />
        <text x={110} y={346} textAnchor="middle" fontSize={44} fontFamily="var(--vt-sans)" fill={C.blue}>H₂O</text>
        <line x1={182} y1={330} x2={300} y2={330} stroke={C.blue} strokeWidth={6} strokeLinecap="round" />
        <polygon points="300,314 328,330 300,346" fill={C.blue} />
      </Obj>
      {/* the grana stack */}
      <Obj as="g" id="stack">
        <rect x={296} y={168} width={392} height={328} rx={30} fill="none" stroke={C.teal} strokeWidth={3} strokeDasharray="12 12" opacity={0.5} />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect key={i} x={336} y={196 + i * 48} width={312} height={30} rx={15} fill={C.teal} />
        ))}
        <text x={492} y={540} textAnchor="middle" fontSize={30} fontFamily="var(--vt-sans)" fill={C.mute}>the thylakoid discs</text>
      </Obj>
      {/* oxygen leaves */}
      <Obj as="g" id="oxygen-out" opacity={split}>
        <circle cx={880} cy={300 - 60 * split} r={52} fill="#ffffff" stroke={C.teal} strokeWidth={5} opacity={split} />
        <text x={880} y={316 - 60 * split} textAnchor="middle" fontSize={40} fontFamily="var(--vt-sans)" fill={C.teal} opacity={split}>O₂</text>
        <path d={`M 936 ${286 - 60 * split} C 1090 ${190 - 60 * split}, 1230 ${150}, 1370 150`} fill="none" stroke={C.teal} strokeWidth={5} strokeDasharray="12 12" opacity={split} />
        <polygon points="1370,134 1400,150 1370,166" fill={C.teal} opacity={split} />
        <text x={1420} y={162} fontSize={32} fontFamily="var(--vt-sans)" fill={C.teal} opacity={split}>out of the leaf</text>
      </Obj>
      {/* carriers */}
      {[{x: 700, name: 'ATP'}, {x: 1140, name: 'NADPH'}].map((b, i) => (
        <Obj as="g" key={b.name} id={`carrier-${i + 1}`}>
          <rect x={b.x} y={478} width={340} height={104} rx={16} fill="#ffffff" stroke={C.green} strokeWidth={5} />
          <rect x={b.x + 6} y={484} width={328 * charge} height={92} rx={11} fill={C.green} opacity={0.9} />
          <text x={b.x + 24} y={546} fontSize={48} fontFamily="var(--vt-sans)" fontWeight={700} fill={charge > 0.5 ? '#ffffff' : C.dark}>{b.name}</text>
          <text x={b.x + 2} y={620} fontSize={28} fontFamily="var(--vt-sans)" fill={C.mute}>charged carrier</text>
        </Obj>
      ))}
      <line x1={600} y1={500} x2={700} y2={530} stroke={C.green} strokeWidth={4} strokeDasharray="8 10" opacity={0.6} />
    </svg>
  );
};

// ---------- step two: the Calvin cycle ----------
export const CalvinCycle = () => {
  const turn = useProp('turn', 0);
  const carbons = useProp('carbons', 0);
  const R = 232, CX = 660, CY = 340;
  const len = 2 * Math.PI * R;
  const hex = (k: number, rad: number) => {
    const a = -Math.PI / 2 + (k * Math.PI) / 3;
    return [CX + rad * Math.cos(a), CY + rad * Math.sin(a)];
  };
  return (
    <svg viewBox="0 0 1620 720" width="100%" height="100%">
      <circle cx={CX} cy={CY} r={R} fill="#ffffff" stroke={C.pale} strokeWidth={30} />
      <Obj as="g" id="ring">
        <circle cx={CX} cy={CY} r={R} fill="none" stroke={C.green} strokeWidth={14}
          strokeDasharray={len} strokeDashoffset={len * (1 - Math.min(1, turn / 2.4))}
          strokeLinecap="round" transform={`rotate(-90 ${CX} ${CY})`} />
        <circle cx={CX + R * Math.cos(-Math.PI / 2 + turn * 1.15)} cy={CY + R * Math.sin(-Math.PI / 2 + turn * 1.15)} r={24} fill={C.amber} />
      </Obj>
      <text x={CX} y={CY + 22} textAnchor="middle" fontSize={46} fontFamily="var(--vt-sans)" fontWeight={700} fill={C.dark}>one carbon</text>
      <text x={CX} y={CY + 70} textAnchor="middle" fontSize={46} fontFamily="var(--vt-sans)" fontWeight={700} fill={C.dark}>per turn</text>

      {/* the six carbons of the sugar, joining up as the turns pass */}
      {[0, 1, 2, 3, 4, 5].map((k) => {
        const [x, y] = hex(k, 196);
        const [x2, y2] = hex((k + 1) % 6, 196);
        const on = carbons > k;
        return (
          <g key={k}>
            {on && carbons > k + 1 && <line x1={x} y1={y} x2={x2} y2={y2} stroke={C.amber} strokeWidth={5} opacity={0.8} />}
            <circle cx={x} cy={y} r={on ? 26 : 12} fill={on ? C.amber : C.pale} />
          </g>
        );
      })}

      {/* CO2 in */}
      <Obj as="g" id="co2-in">
        <circle cx={120} cy={CY} r={62} fill="#ffffff" stroke={C.teal} strokeWidth={6} />
        <text x={120} y={CY + 16} textAnchor="middle" fontSize={40} fontFamily="var(--vt-sans)" fill={C.teal}>CO₂</text>
        <line x1={196} y1={CY} x2={CX - R - 24} y2={CY} stroke={C.teal} strokeWidth={6} strokeDasharray="14 14" />
        <polygon points={`${CX - R - 26},${CY - 16} ${CX - R + 4},${CY} ${CX - R - 26},${CY + 16}`} fill={C.teal} />
      </Obj>

      {/* carriers in, over the top */}
      <Obj as="g" id="carriers-in">
        <text x={120} y={110} fontSize={34} fontFamily="var(--vt-sans)" fill={C.green}>ATP + NADPH</text>
        <path d={`M 330 120 C 450 132, 480 210, 520 300`} fill="none" stroke={C.green} strokeWidth={5} strokeDasharray="13 13" />
        <polygon points="520,282 530,306 506,310" fill={C.green} />
      </Obj>

      {/* sugar out */}
      <Obj as="g" id="sugar-out">
        <line x1={CX + R + 6} y1={CY} x2={CX + R + 130} y2={CY} stroke={C.amber} strokeWidth={6} />
        <polygon points={`${CX + R + 130},${CY - 18} ${CX + R + 166},${CY} ${CX + R + 130},${CY + 18}`} fill={C.amber} />
        <rect x={CX + R + 196} y={CY - 54} width={300} height={108} rx={18} fill={C.amber} opacity={0.92} />
        <text x={CX + R + 346} y={CY + 18} textAnchor="middle" fontSize={46} fontFamily="var(--vt-sans)" fontWeight={700} fill="#ffffff">sugar</text>
        <text x={CX + R + 196} y={CY + 108} fontSize={28} fontFamily="var(--vt-sans)" fill={C.mute}>six carbons, joined</text>
      </Obj>
    </svg>
  );
};

// ---------- the leaf itself, for the zoom: the deck's picture with one cell boxed ----------
export const LeafOutline = () => {
  const src = useAsset('leaf-intro');
  return (
    <div style={{position: 'relative', width: '100%', height: '100%'}}>
      <img src={src} style={{width: '100%', height: '100%', objectFit: 'contain'}} />
      <div style={{position: 'absolute', left: '45%', top: '33%', width: 104, height: 104, border: `5px dashed ${C.amber}`, boxSizing: 'border-box'}} />
    </div>
  );
};

export const ZoomLabel = () => (
  <div style={{position: 'relative', width: '100%', height: '100%', fontFamily: 'var(--vt-sans)', color: C.amber, fontSize: 32, fontWeight: 700}}>
    <div style={{position: 'absolute', left: '54%', top: '28%'}}>one cell, a fraction of a millimetre</div>
  </div>
);

// ---------- a cell packed with chloroplasts ----------
export const Cell = () => {
  const fill = useProp('fill', 1);
  const spots = [];
  for (let i = 0; i < 14; i++) spots.push({x: 90 + (i % 4) * 140, y: 90 + Math.floor(i / 4) * 118});
  return (
    <svg viewBox="0 0 660 560" width="100%" height="100%">
      <rect x={30} y={30} width={600} height={500} rx={40} fill={C.pale} stroke={C.green} strokeWidth={7} opacity={0.85} />
      {spots.map((s, i) => (
        <ellipse key={i} cx={s.x + 60} cy={s.y + 50} rx={52} ry={34} fill={C.green} opacity={0.9} />
      ))}
    </svg>
  );
};

// ---------- the check: which step needs the light ----------
const Sun = () => (
  <svg viewBox="0 0 100 100" width={64} height={64}>
    <circle cx={50} cy={50} r={22} fill={C.amber} />
    {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
      <line key={a} x1={50 + 30 * Math.cos((a * Math.PI) / 180)} y1={50 + 30 * Math.sin((a * Math.PI) / 180)}
        x2={50 + 40 * Math.cos((a * Math.PI) / 180)} y2={50 + 40 * Math.sin((a * Math.PI) / 180)}
        stroke={C.amber} strokeWidth={6} strokeLinecap="round" />
    ))}
  </svg>
);

const Battery = ({level}: {level: number}) => (
  <svg viewBox="0 0 120 60" width={104} height={52}>
    <rect x={4} y={8} width={100} height={44} rx={8} fill="none" stroke={C.green} strokeWidth={5} />
    <rect x={106} y={22} width={10} height={16} rx={3} fill={C.green} />
    <rect x={12} y={16} width={84 * level} height={28} rx={4} fill={C.green} />
  </svg>
);

export const Compare = () => (
  <div style={{fontFamily: 'var(--vt-sans)', color: C.dark, height: '100%', display: 'flex', flexDirection: 'column'}}>
    <Obj id="q" style={{width: '100%'}}>
      <div style={{fontSize: 54, fontWeight: 700, color: C.dark, marginBottom: 40}}>Which step needs the light directly?</div>
    </Obj>
    <div style={{display: 'flex', gap: 44}}>
      <Obj id="card1" style={{flex: 1, display: 'flex'}}>
        <div style={{background: '#ffffff', border: `6px solid ${C.green}`, borderRadius: 24, padding: '34px 40px', height: 330, boxSizing: 'border-box'}}>
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
            <div style={{fontSize: 26, letterSpacing: 4, color: C.mute, textTransform: 'uppercase'}}>Step one</div>
            <Sun />
          </div>
          <div style={{fontSize: 60, fontWeight: 700, marginTop: 18, lineHeight: 1.1}}>In the discs</div>
          <div style={{marginTop: 18, fontSize: 34, color: C.green}}>light splits water here</div>
          <div style={{marginTop: 14, fontSize: 34, color: C.mute}}>and the carriers get charged</div>
        </div>
      </Obj>
      <Obj id="card2" style={{flex: 1, display: 'flex'}}>
        <div style={{background: '#ffffff', border: `6px solid ${C.pale}`, borderRadius: 24, padding: '34px 40px', height: 330, boxSizing: 'border-box'}}>
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
            <div style={{fontSize: 26, letterSpacing: 4, color: C.mute, textTransform: 'uppercase'}}>Step two</div>
            <Battery level={0.8} />
          </div>
          <div style={{fontSize: 60, fontWeight: 700, marginTop: 18, lineHeight: 1.1}}>In the stroma</div>
          <div style={{marginTop: 18, fontSize: 34, color: C.teal}}>CO₂ is built into sugar here</div>
          <div style={{marginTop: 14, fontSize: 34, color: C.mute}}>no light needed, only the charge</div>
        </div>
      </Obj>
    </div>
    <Obj id="tick1" style={{marginTop: 44}}>
      <div style={{display: 'flex', alignItems: 'baseline', gap: 18}}>
        <div style={{fontSize: 52, fontWeight: 700, color: C.green}}>only step one</div>
        <div style={{fontSize: 38, color: C.mute}}>needs the light itself</div>
      </div>
    </Obj>
    <Obj id="dark-note" style={{marginTop: 14}}>
      <div style={{fontSize: 34, color: C.mute}}>step two runs on the charge already stored, for a while</div>
    </Obj>
  </div>
);

// ---------- the equation ----------
const Term = ({id, children, color}: any) => (
  <Obj id={id} style={{whiteSpace: 'nowrap'}}>
    <span style={{color}}>{children}</span>
  </Obj>
);

const Ring = ({label, color}: {label: string; color: string}) => (
  <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8}}>
    <div style={{width: 64, height: 64, borderRadius: 32, border: `5px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 700, color}}>{label}</div>
  </div>
);

export const Equation = () => (
  <div style={{fontFamily: 'var(--vt-sans)', color: C.dark, width: '100%', height: '100%', display: 'flex', flexDirection: 'column'}}>
    <div style={{fontSize: 30, letterSpacing: 5, textTransform: 'uppercase', color: C.mute}}>The whole thing, in one line</div>

    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, fontSize: 108, fontWeight: 700, lineHeight: 1, whiteSpace: 'nowrap', marginTop: 46}}>
      <Term id="eq-co2" color={C.teal}>6 CO₂</Term>
      <span style={{color: C.mute, fontWeight: 400}}>+</span>
      <Term id="eq-h2o" color={C.blue}>6 H₂O</Term>
      <Obj id="eq-light" style={{position: 'relative', width: 250, height: 132, margin: '0 14px'}}>
        <svg viewBox="0 0 250 132" width={250} height={132}>
          <text x={125} y={34} textAnchor="middle" fontSize={30} fontFamily="var(--vt-sans)" fontWeight={700} fill={C.amber}>light</text>
          <line x1={10} y1={86} x2={218} y2={86} stroke={C.amber} strokeWidth={7} strokeLinecap="round" />
          <polygon points="218,68 246,86 218,104" fill={C.amber} />
        </svg>
      </Obj>
      <Term id="eq-sugar" color={C.amber}>C₆H₁₂O₆</Term>
      <span style={{color: C.mute, fontWeight: 400}}>+</span>
      <Term id="eq-o2" color={C.green}>6 O₂</Term>
    </div>

    <Obj id="trade" style={{marginTop: 92, width: '100%'}}>
      <div style={{display: 'flex', gap: 56}}>
        <div style={{flex: 1, background: '#ffffff', border: `5px solid ${C.teal}`, borderRadius: 22, padding: '30px 40px'}}>
          <div style={{fontSize: 26, letterSpacing: 4, textTransform: 'uppercase', color: C.mute}}>the plant takes in</div>
          <div style={{display: 'flex', alignItems: 'center', gap: 24, marginTop: 16}}>
            <div style={{display: 'flex', gap: 10}}><Ring label="CO₂" color={C.teal} /><Ring label="CO₂" color={C.teal} /></div>
            <div style={{fontSize: 40, color: C.dark}}>air</div>
            <div style={{fontSize: 40, color: C.mute, margin: '0 6px'}}>+</div>
            <Ring label="H₂O" color={C.blue} />
            <div style={{fontSize: 40, color: C.dark}}>water</div>
          </div>
        </div>
        <div style={{flex: 1, background: '#ffffff', border: `5px solid ${C.amber}`, borderRadius: 22, padding: '30px 40px'}}>
          <div style={{fontSize: 26, letterSpacing: 4, textTransform: 'uppercase', color: C.mute}}>and gives back</div>
          <div style={{display: 'flex', alignItems: 'center', gap: 24, marginTop: 16}}>
            <div style={{height: 62, padding: '0 18px', borderRadius: 12, background: C.amber, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, color: '#ffffff'}}>sugar</div>
            <div style={{fontSize: 40, color: C.dark}}>food</div>
            <div style={{fontSize: 40, color: C.mute, margin: '0 6px'}}>+</div>
            <Ring label="O₂" color={C.green} />
            <Ring label="O₂" color={C.green} />
            <div style={{fontSize: 40, color: C.dark}}>air</div>
          </div>
        </div>
      </div>
    </Obj>

    <div style={{flexGrow: 1}} />
    <div style={{flex: 'none', paddingTop: 40, borderTop: `2px solid ${C.pale}`, fontSize: 34, color: C.mute, lineHeight: 1.35}}>
      the sugar is glucose, C₆H₁₂O₆ — the same molecule your own cells burn for fuel
    </div>
  </div>
);

// ---------- why it matters: claims beside slide 7's leaf ----------
export const Claims = () => (
  <div style={{height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', fontFamily: 'var(--vt-sans)', color: C.dark}}>
    <div style={{fontSize: 30, letterSpacing: 5, textTransform: 'uppercase', color: C.mute, marginBottom: 34}}>why it matters</div>
    <Obj id="claim-1" style={{width: '100%'}}>
      <div style={{borderLeft: `8px solid ${C.green}`, paddingLeft: 26, marginBottom: 30}}>
        <div style={{fontSize: 40, fontWeight: 700, lineHeight: 1.15}}>every breath</div>
        <div style={{fontSize: 32, color: C.mute, marginTop: 4}}>almost all the oxygen you take in</div>
      </div>
    </Obj>
    <Obj id="claim-2" style={{width: '100%'}}>
      <div style={{borderLeft: `8px solid ${C.amber}`, paddingLeft: 26, marginBottom: 30}}>
        <div style={{fontSize: 40, fontWeight: 700, lineHeight: 1.15}}>every meal</div>
        <div style={{fontSize: 32, color: C.mute, marginTop: 4}}>a plant made it, or an animal that ate one</div>
      </div>
    </Obj>
    <Obj id="claim-3" style={{width: '100%'}}>
      <div style={{borderLeft: `8px solid ${C.teal}`, paddingLeft: 26, marginBottom: 30}}>
        <div style={{fontSize: 40, fontWeight: 700, lineHeight: 1.15}}>the carbon</div>
        <div style={{fontSize: 32, color: C.mute, marginTop: 4}}>pulled from the air, locked into sugar and wood</div>
      </div>
    </Obj>
    <Obj id="claim-4" style={{width: '100%'}}>
      <div style={{borderLeft: `8px solid ${C.mute}`, paddingLeft: 26}}>
        <div style={{fontSize: 40, fontWeight: 700, lineHeight: 1.15}}>everywhere</div>
        <div style={{fontSize: 32, color: C.mute, marginTop: 4}}>fields, forests, sea algae — the same loop</div>
      </div>
    </Obj>
  </div>
);

// ---------- closing line ----------
export const Closing = () => {
  const reveal = useProp('reveal', 0);
  return (
    <div style={{fontFamily: 'var(--vt-sans)', color: C.dark}}>
      <div style={{fontSize: 30, letterSpacing: 6, textTransform: 'uppercase', color: C.mute, marginBottom: 26}}>Remember</div>
      <div style={{fontSize: 96, lineHeight: 1.08, fontWeight: 700}}>
        a leaf turns<br />light into food
      </div>
      <div style={{marginTop: 34, height: 12, width: 620, background: C.amber, transformOrigin: 'left center', transform: `scaleX(${reveal})`}} />
    </div>
  );
};

// the two working parts, as a legend under the chloroplast
export const ChloroLabels = () => (
  <div style={{display: 'flex', gap: 56, fontFamily: 'var(--vt-sans)', color: C.dark}}>
    <Obj id="lab-thyl" style={{flex: 1}}>
      <div style={{borderTop: `6px solid ${C.amber}`, paddingTop: 14}}>
        <div style={{fontSize: 46, fontWeight: 700, lineHeight: 1.1}}>thylakoids</div>
        <div style={{fontSize: 28, color: C.mute, marginTop: 6, lineHeight: 1.3}}>stacks of flat discs — they catch the light</div>
      </div>
    </Obj>
    <Obj id="lab-stroma" style={{flex: 1}}>
      <div style={{borderTop: `6px solid ${C.teal}`, paddingTop: 14}}>
        <div style={{fontSize: 46, fontWeight: 700, lineHeight: 1.1}}>stroma</div>
        <div style={{fontSize: 28, color: C.mute, marginTop: 6, lineHeight: 1.3}}>the fluid around them — sugar is built here</div>
      </div>
    </Obj>
  </div>
);

export const CellNote = () => (
  <div style={{fontFamily: 'var(--vt-sans)', fontSize: 32, color: C.mute, textAlign: 'center'}}>
    one cell — the green ovals are chloroplasts
  </div>
);

export const Kicker = ({text}: {text: string}) => (
  <div style={{fontFamily: 'var(--vt-sans)', fontSize: 30, letterSpacing: 6, textTransform: 'uppercase', color: C.mute}}>{text}</div>
);
