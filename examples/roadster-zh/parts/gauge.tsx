import {V, clamp, plate} from './tunnel.tsx';

export const meta = {
  name: {en: 'Instrument readout', 'zh-CN': '仪表读数'},
  purpose: 'data',
  line: 'A test-bench readout: a label in small capitals, a large condensed figure that counts to its value, its unit, and a bar against the instrument\'s range.',
  fits: 'a measured or quoted figure: a pressure, a force, a speed, a weight; two readouts side by side for a ratio',
  params: {
    x: {type: 'px', doc: 'the readout\'s left edge'},
    y: {type: 'px', doc: 'its top'},
    label: {type: 'text', doc: 'what it measures, in a few words'},
    value: {type: 'number', default: 0, doc: 'the figure now: tween it from 0 to count up'},
    unit: {type: 'text', default: '', doc: 'the unit after the figure'},
    max: {type: 'number', default: 100, doc: 'the end of the bar'},
    decimals: {type: 'number', default: 0, doc: 'decimal places shown'},
    tone: {type: 'low | high | force', default: 'force', doc: 'the bar\'s colour, matching what it measures'},
    note: {type: 'text', default: '', doc: 'the source or a caveat, small, under the bar'},
  },
  preview: 24.8,
};

/** A readout: HTML over the test section, clear of the car; at most two at a time. */
export function Readout({x, y, label, value = 0, unit = '', max = 100, decimals = 0, tone = 'force', note = ''}: {
  x: number; y: number; label: string; value?: number; unit?: string; max?: number; decimals?: number; tone?: 'low' | 'high' | 'force'; note?: string;
}) {
  const col = tone === 'low' ? V.low : tone === 'high' ? V.high : V.force;
  return (
    <div style={{position: 'absolute', left: x, top: y, width: 380, padding: '18px 24px 20px', background: 'rgba(13, 20, 34, 0.86)', border: '1px solid var(--vt-border)', borderRadius: 6}}>
      <div style={{...plate(24), color: V.muted}}>{label}</div>
      <div style={{display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 6}}>
        <span style={{fontFamily: V.display, fontSize: 104, fontWeight: 700, lineHeight: 1, color: V.text, fontVariantNumeric: 'tabular-nums'}}>{value.toFixed(decimals)}</span>
        <span style={{...plate(36), color: col}}>{unit}</span>
      </div>
      <div style={{marginTop: 14, height: 8, background: 'var(--vt-faint)', borderRadius: 4}}>
        <div style={{width: `${clamp(value / max) * 100}%`, height: '100%', background: col, borderRadius: 4}} />
      </div>
      {note && <div style={{marginTop: 10, fontFamily: V.sans, fontSize: 24, color: V.muted}}>{note}</div>}
    </div>
  );
}
