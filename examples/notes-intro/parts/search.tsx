import {useProp} from '@visotalk/runtime';

// A search field: the word is typed, matching notes come up as it nears, and a tag narrows the list.
const QUERY = 'plumber';

const NOTES = [
  {text: 'Call the plumber back', tag: 'work', match: 2},
  {text: 'Plumber: Tuesday, 9am', tag: 'home', match: 3},
  {text: 'Ask about the boiler', tag: 'home', match: 4},
  {text: 'Idea: a shared shopping list', tag: 'idea', match: 5},
];

export const Search = () => {
  const chars = useProp('chars', 0);
  const rows = useProp('rows', 0);
  const narrow = useProp('narrow', 0);
  const typed = QUERY.slice(0, Math.round(chars));

  return (
    <div style={{position: 'absolute', inset: 0, fontFamily: 'var(--vt-sans)'}}>
      {/* the field */}
      <div style={{
        position: 'absolute', left: 340, top: 70, width: 1240, height: 148,
        borderRadius: 65, background: '#FFFDF6', border: '3px solid rgba(29,35,48,0.6)',
        boxShadow: '0 14px 30px rgba(29,35,48,0.10)', boxSizing: 'border-box',
        display: 'flex', alignItems: 'center', padding: '0 44px', gap: 26,
      }}>
        <svg width={54} height={54} viewBox="0 0 46 46">
          <circle cx={20} cy={20} r={13} fill="none" stroke="#1D2330" strokeWidth={4} />
          <line x1={30} y1={30} x2={41} y2={41} stroke="#1D2330" strokeWidth={5} strokeLinecap="round" />
        </svg>
        <div style={{fontSize: 64, fontWeight: 600, color: '#1D2330'}}>{typed}</div>
        <div style={{width: 4, height: 58, background: '#1F6FD0', opacity: chars < QUERY.length ? 1 : 0}} />
      </div>

      {/* results */}
      <div style={{position: 'absolute', left: 340, top: 286, width: 1240}}>
        {NOTES.map((n, i) => {
          const revealed = Math.max(0, Math.min(1, (rows - i * 0.8) / 0.6));
          const dim = n.match > 2 ? 1 - narrow * 0.72 : 1;
          return (
            <div key={i} style={{
              position: 'relative', height: 124, marginBottom: 22, borderRadius: 12,
              background: '#FFFDF6', border: '2px solid rgba(29,35,48,0.35)',
              display: 'flex', alignItems: 'center', padding: '0 30px', gap: 24,
              boxSizing: 'border-box', opacity: revealed * dim,
              transform: `translateY(${(1 - revealed) * 14}px)`,
            }}>
              <div style={{flex: 1, fontSize: 44, color: '#1D2330', fontWeight: 500}}>{n.text}</div>
              <div style={{fontSize: 32, color: '#12437E', border: '2px solid #1F6FD0', borderRadius: 22, padding: '6px 20px', opacity: 0.85}}>#{n.tag}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
