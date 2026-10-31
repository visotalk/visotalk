import {Obj, useProp} from '@visotalk/runtime';
import {BLUE, VIOLET, SANS} from './lib.tsx';

// Scene 4: violet scatters even more than blue, yet the Sun sends little of it and the eye barely sees it.
const BASE = 600;
const COL = (i: number) => 250 + i * 330;

export const VioletAsk = () => {
  const scale = useProp('scale', 0);
  const sun = useProp('sun', 0);
  const eye = useProp('eye', 0);
  const drop = useProp('drop', 0);

  return (
    <svg viewBox="0 0 1600 680" width={1600} height={680}>
      <line x1={120} y1={BASE} x2={1500} y2={BASE} stroke="var(--vt-faint)" strokeWidth={3} />

      <Obj as="g" id="bar-violet">
        <rect x={COL(0) - 62} y={BASE - 400 * scale} width={124} height={400 * scale} rx={8} fill={VIOLET} opacity={1 - drop * 0.15} />
      </Obj>
      <Obj as="g" id="bar-blue">
        <rect x={COL(1) - 62} y={BASE - 272 * scale} width={124} height={272 * scale} rx={8} fill={BLUE} />
      </Obj>
      <Obj as="g" id="bar-sun">
        <rect x={COL(2) - 62} y={BASE - 52 * sun} width={124} height={52 * sun} rx={8} fill={VIOLET} opacity={0.92} />
      </Obj>
      <Obj as="g" id="bar-eye">
        <rect x={COL(3) - 62} y={BASE - 90 * eye} width={124} height={90 * eye} rx={8} fill={VIOLET} opacity={0.6} />
      </Obj>

      <Obj as="g" id="lbl-violet">
        <text x={COL(0)} y={BASE + 52} fill="var(--vt-text)" fontFamily={SANS} fontSize={34} textAnchor="middle">紫光 · 散射</text>
      </Obj>
      <Obj as="g" id="lbl-blue">
        <text x={COL(1)} y={BASE + 52} fill="var(--vt-muted)" fontFamily={SANS} fontSize={34} textAnchor="middle">蓝光 · 散射</text>
      </Obj>
      <Obj as="g" id="lbl-sun">
        <text x={COL(2)} y={BASE + 52} fill="var(--vt-text)" fontFamily={SANS} fontSize={34} textAnchor="middle">太阳发出的紫光</text>
      </Obj>
      <Obj as="g" id="lbl-eye">
        <text x={COL(3)} y={BASE + 52} fill="var(--vt-text)" fontFamily={SANS} fontSize={34} textAnchor="middle">眼睛对紫光的敏感</text>
      </Obj>
      <Obj as="g" id="lbl-hint">
        <text x={COL(0)} y={170} fill="var(--vt-muted)" fontFamily={SANS} fontSize={34} textAnchor="middle">散得更多</text>
      </Obj>
      <Obj as="g" id="lbl-hint2">
        <text x={COL(2)} y={520} fill="var(--vt-muted)" fontFamily={SANS} fontSize={34} textAnchor="middle">本来就少</text>
      </Obj>
    </svg>
  );
};
