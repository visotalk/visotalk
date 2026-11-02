// A name for a point in the tunnel: a cyan dot on the point, a hairline that runs out to a dark plate with the name in tracked
// capitals and a note under it. It is HTML over the canvas, placed where the camera sees the point, so it follows the camera
// and the section as they move, and it stays upright whichever way the car hangs.
import {useTunnelWorld} from './world.tsx';
import {HEX, V, clamp, easeOut, phase, plate} from './tunnel.tsx';

export const meta = {
  name: {en: 'Callout', 'zh-CN': '标注'},
  purpose: 'term',
  line: 'A dot on a point of the car or the tunnel, a hairline out to a dark plate with its name and a note; it follows the camera.',
  fits: 'naming a part (the fans, the skirts, the chamber); a term the narration defines; where a figure applies',
  params: {
    x: {type: 'number', default: 0, doc: 'the point it names, along the tunnel (metres)'},
    y: {type: 'number', default: 0, doc: 'the point, up'},
    z: {type: 'number', default: 0, doc: 'the point, across'},
    dx: {type: 'px', default: 160, doc: 'where the plate sits from the point, across the frame'},
    dy: {type: 'px', default: -140, doc: 'where the plate sits from the point, down the frame (negative is up)'},
    text: {type: 'text', doc: 'one to four words'},
    note: {type: 'text', default: '', doc: 'a smaller line under it'},
    tone: {type: 'low | high | force | text', default: 'low', doc: 'the colour of the dot and the line'},
    show: {type: 'progress', default: 1, doc: '0 hidden, 1 on: the dot, then the line runs out, then the plate'},
  },
  preview: 17.0,
};

const TONE: Record<string, string> = {low: HEX.low, high: HEX.high, force: HEX.force, text: '#E8EEF5'};

export function Callout({x = 0, y = 0, z = 0, dx = 160, dy = -140, text, note = '', tone = 'low', show = 1}: {
  x?: number; y?: number; z?: number; dx?: number; dy?: number; text: string; note?: string; tone?: string; show?: number;
}) {
  const w = useTunnelWorld();
  const p = w.project(x, y, z);
  const s = clamp(show);
  if (s <= 0 || !p.front) return null;
  const dot = easeOut(phase(s, 0, 0.25)), run = easeOut(phase(s, 0.15, 0.6)), pl = easeOut(phase(s, 0.45, 1));
  const col = TONE[tone] ?? HEX.low;
  // an elbow: out at an angle, then level to the plate
  const ex = p.x + dx, ey = p.y + dy, kx = p.x + dx * 0.35, right = dx >= 0;
  const len1 = Math.hypot(kx - p.x, ey - p.y), len2 = Math.abs(ex - kx), total = len1 + len2, drawn = run * total;
  return (
    <div style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
      <svg width="1920" height="1080" style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        <circle cx={p.x} cy={p.y} r={16 * dot} fill="none" stroke={col} strokeWidth={2} opacity={0.5 * dot} />
        <circle cx={p.x} cy={p.y} r={6 * dot} fill={col} />
        <path d={`M${p.x} ${p.y} L${kx} ${ey} L${ex} ${ey}`} fill="none" stroke={col} strokeWidth={2} strokeDasharray={`${drawn} ${total}`} />
      </svg>
      {pl > 0 && (
        <div style={{position: 'absolute', top: ey - 30, left: right ? ex + 10 : undefined, right: right ? undefined : 1920 - ex + 10, opacity: pl,
          transform: `translateX(${(1 - pl) * (right ? -14 : 14)}px)`, padding: '10px 20px 12px', background: 'rgba(7, 11, 18, 0.84)',
          border: '1px solid rgba(79, 209, 255, 0.22)', borderRadius: 4, whiteSpace: 'nowrap'}}>
          <div style={{...plate(30), color: V.text}}>{text}</div>
          {note && <div style={{fontFamily: V.sans, fontSize: 26, color: V.muted, marginTop: 4}}>{note}</div>}
        </div>
      )}
    </div>
  );
}
