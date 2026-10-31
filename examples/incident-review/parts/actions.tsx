import {Obj, useProp} from '@visotalk/runtime';

const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

const ROWS = [
  {id: 'a1', n: '1', text: 'Every certificate in automatic renewal; the build fails if one is outside it', who: 'Platform', due: '31 Oct', hero: true},
  {id: 'a2', n: '2', text: 'Alert 30 days before any certificate expires', who: 'Platform', due: '24 Oct', hero: false},
  {id: 'a3', n: '3', text: 'Log TLS failures with their reason, not a bare reset', who: 'Sync', due: '7 Nov', hero: false},
];

// Three actions with an owner and a date: the first one is the one that would have prevented it.
export const Actions = () => {
  const one = clamp(useProp('one', 0));
  const two = clamp(useProp('two', 0));
  const three = clamp(useProp('three', 0));
  const hero = clamp(useProp('hero', 0));
  const slots = clamp(useProp('slots', 0));
  const opacity = [one, two, three];
  const H = 150;
  const TOP = 74;
  const STEPY = H + 20;
  return (
    <div style={{position: 'relative', width: 1640, height: 680, fontFamily: 'var(--vt-sans)', color: 'var(--vt-text)'}}>
      <div style={{position: 'absolute', left: 0, top: 0, display: 'flex', gap: 24, fontSize: 22, letterSpacing: 3, color: 'var(--vt-muted)'}}>
        <div style={{width: 72}}>#</div>
        <div style={{width: 1000}}>ACTION</div>
        <div style={{width: 200}}>OWNER</div>
        <div style={{width: 160}}>DUE</div>
      </div>
      {ROWS.map((r, i) => {
        const hot = r.hero ? hero : 0;
        return (
          <Obj
            key={r.id}
            id={r.id}
            style={{
              position: 'absolute',
              left: 0,
              top: TOP + i * STEPY,
              width: 1640,
              height: H,
              borderRadius: 16,
              background: hot > 0.02 ? 'var(--vt-panel2)' : 'var(--vt-panel)',
              border: `2px solid ${hot > 0.02 ? 'var(--vt-grad)' : 'var(--vt-border)'}`,
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              gap: 24,
              padding: '0 36px',
              opacity: Math.max(opacity[i], slots * 0.55),
            }}
          >
            <div style={{width: 72, fontSize: 54, fontWeight: 700, fontFamily: 'var(--vt-mono)', color: r.hero ? 'var(--vt-grad)' : 'var(--vt-muted)'}}>{r.n}</div>
            <div style={{width: 1000, fontSize: 38, lineHeight: 1.18, opacity: opacity[i]}}>{r.text}</div>
            <div style={{width: 200, fontSize: 30, color: 'var(--vt-muted)', opacity: opacity[i]}}>{r.who}</div>
            <div style={{width: 160, fontSize: 30, fontFamily: 'var(--vt-mono)', color: 'var(--vt-muted)', opacity: opacity[i]}}>{r.due}</div>
          </Obj>
        );
      })}
      <Obj id="hero-mark" style={{position: 'absolute', left: 0, top: TOP + 6, width: 8, height: H - 12, borderRadius: 4, background: 'var(--vt-grad)', opacity: hero}} />
      <div style={{position: 'absolute', left: 8, top: TOP + 3 * STEPY + 14, fontSize: 32, color: 'var(--vt-grad)', opacity: hero}}>
        with this one, the outage could not have happened
      </div>
    </div>
  );
};
