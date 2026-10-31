import {Obj, useProp} from '@visotalk/runtime';
import {mix, css} from './colors.ts';

// A dome of sky over a viewer: rays arrive from every direction and the dome fills with blue.
// `fill` is how blue the dome is, `rays` how many directions are lit, `sun` where the Sun sits.
// The dome stays the colour we actually see — blue — in every line of the scene.
export const Dome = () => {
  const fill = useProp('fill', 0);
  const rays = useProp('rays', 0);
  const sunLow = useProp('sun', 0);
  const base = mix([18, 20, 34], [46, 116, 210], fill);
  const top = mix([10, 12, 24], [30, 88, 190], fill);
  return (
    <svg viewBox="0 0 1600 660" width={1600} height={660}>
      <defs>
        <radialGradient id="domeg" cx="50%" cy="78%" r="78%">
          <stop offset="0%" stopColor={css(mix(base, [255, 255, 255], 0.10))} />
          <stop offset="100%" stopColor={css(top)} />
        </radialGradient>
      </defs>
      <path d="M 80 640 A 720 640 0 0 1 1520 640 Z" fill="url(#domeg)" stroke="rgba(255,255,255,0.15)" strokeWidth={3} />
      <Obj as="g" id="sunmark">
        <circle cx={1420} cy={560 - 430 * sunLow} r={44} fill="#fff2c9" />
      </Obj>
      <g opacity={rays}>
        {[-72, -48, -24, 0, 24, 48, 72].map((a, i) => {
          const r = (a * Math.PI) / 180;
          return <line key={i} x1={800 - Math.sin(r) * 520} y1={640 - Math.cos(r) * 500}
            x2={800} y2={620} stroke="#cfe6ff" strokeWidth={4} opacity={0.55} strokeLinecap="round" />;
        })}
      </g>
      {/* the viewer */}
      <Obj as="g" id="viewer">
        <circle cx={800} cy={578} r={26} fill="var(--vt-text)" />
        <path d="M 770 660 q 30 -62 60 0 z" fill="var(--vt-text)" />
      </Obj>
    </svg>
  );
};
