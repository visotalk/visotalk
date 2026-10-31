import {Obj, useProp} from '@visotalk/runtime';

// Violet is not shown as sky colour. It is compared on its own, beside the blue sky:
// how much of it is scattered away, against how little of it our eye picks up.
// `scatter` grows the top bar, `seen` the bottom one. The bars are illustration, not measurements.
export const VioletCard = () => {
  const scatter = useProp('scatter', 0);
  const seen = useProp('seen', 0);
  return (
    <div style={{
      width: '100%', height: '100%', boxSizing: 'border-box',
      background: 'rgba(10,12,20,0.86)', border: '1px solid rgba(168,85,247,0.45)',
      borderRadius: 16, padding: '20px 24px', fontFamily: 'var(--vt-sans)',
      display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12,
    }}>
      <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
        <div style={{width: 22, height: 22, borderRadius: 11, background: '#a855f7'}} />
        <div style={{fontSize: 36, fontWeight: 700, color: '#c98cff', letterSpacing: 1}}>violet</div>
      </div>
      <div style={{display: 'flex', alignItems: 'center', gap: 20}}>
        <div style={{width: 185, fontSize: 28, color: 'var(--vt-muted)'}}>scattered</div>
        <div style={{flex: 1, height: 30, background: 'rgba(255,255,255,0.07)', borderRadius: 15, overflow: 'hidden'}}>
          <Obj as="div" id="vbar-scatter" style={{width: `${Math.round(scatter * 100)}%`, height: '100%', borderRadius: 15, background: '#a855f7'}} />
        </div>
      </div>
      <div style={{display: 'flex', alignItems: 'center', gap: 20}}>
        <div style={{width: 185, fontSize: 28, color: 'var(--vt-muted)'}}>seen by eye</div>
        <div style={{flex: 1, height: 30, background: 'rgba(255,255,255,0.07)', borderRadius: 15, overflow: 'hidden'}}>
          <Obj as="div" id="vbar-seen" style={{width: `${Math.round(seen * 100)}%`, height: '100%', borderRadius: 15, background: '#6b21a8'}} />
        </div>
      </div>
    </div>
  );
};
