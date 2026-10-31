import {Obj, useProp} from '@visotalk/runtime';
import {COLS} from './colors.ts';

// White light is a mixture. `open` is how far the strip has separated: at 0 it is one white bar,
// at 1 six bands of colour lying inside the same beam. The labels name each band as it is spoken.
const X = 120, W = 1680, CY = 300, H = 168;
const yb = (i: number) => CY + (i - (COLS.length - 1) / 2) * (H / COLS.length);

export const Band = () => {
  const open = useProp('open', 0);
  return (
    <svg viewBox="0 0 1920 720" width={1920} height={720}>
      <rect x={X} y={CY - H / 2} width={W} height={H} rx={6} fill="#ffffff" opacity={1 - open} />
      {COLS.map((c, i) => (
        <rect key={c.id} x={X} y={CY + (yb(i) - (CY - H / 2)) * open - H / COLS.length / 2 + 1}
          width={W} height={H / COLS.length - 4} rx={1} fill={c.hex} opacity={open} />
      ))}
    </svg>
  );
};

// The prism: a white beam in, six routes out. `inside` fades the white so the colours in the
// beam are seen; `fan` is how far apart the routes have spread past the glass.
const PY = 330;
const TH = 22;
const N = COLS.length;
const yIn = (i: number) => PY + (i - (N - 1) / 2) * TH;
const yOut = (i: number, fan: number) => PY + (i - (N - 1) / 2) * (TH + 96 * fan);

export const Prism = () => {
  const fan = useProp('fan', 0);
  const inside = useProp('inside', 0);
  return (
    <svg viewBox="0 0 1600 660" width={1600} height={660}>
      <Obj as="g" id="beamin">
        <rect x={30} y={PY - (N * TH) / 2} width={720} height={N * TH} rx={4} fill="#ffffff" />
        {COLS.map((c, i) => (
          <rect key={c.id} x={30} y={yIn(i) - TH / 2 + 2} width={720}
            height={TH - 5} fill={c.hex} opacity={inside} />
        ))}
      </Obj>

      {COLS.map((c, i) => (
        <Obj key={c.id} as="path" id={`ray-${c.id}`}
          d={`M 862 ${yIn(i).toFixed(1)} L 1400 ${yOut(i, fan).toFixed(1)}`}
          stroke={c.hex} strokeWidth={TH - 4} fill="none" strokeLinecap="butt" />
      ))}

      <Obj as="polygon" id="glass" points="700,478 800,182 900,478"
        fill="rgba(210,230,255,0.12)" stroke="rgba(225,240,255,0.9)" strokeWidth={5} strokeLinejoin="round" />

      {COLS.map((c, i) => (
        <Obj key={c.id} as="g" id={`lab-${c.id}`}>
          <circle cx={1424} cy={yOut(i, 1)} r={9} fill={c.hex} />
          <text x={1444} y={yOut(i, 1) + 13} fill="var(--vt-text)" fontSize={38} fontFamily="var(--vt-sans)">{c.name}</text>
        </Obj>
      ))}
    </svg>
  );
};
