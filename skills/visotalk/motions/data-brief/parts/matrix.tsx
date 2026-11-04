import {clamp, textW, fitSize, GUIDE} from './brief.ts';

export const meta = {
  name: {en: 'Matrix', 'zh-CN': '对比表'},
  purpose: 'compare',
  line: 'A ruled table; the guide lies on the row said, its best cell in cobalt.',
  fits: 'products by features; plans and prices; four columns, six rows',
  params: {
    w: {type: 'px', default: 1680, doc: 'the table\'s width, the tab included'},
    columns: {type: 'list', doc: '{name, sub} for each column'},
    rows: {type: 'list', doc: '{label, cells}: each cell a figure or text, or yes, part or no for a mark'},
    h: {type: 'px', default: 560, doc: 'the height it may use: rows shrink to fit it'},
    rowH: {type: 'px', default: 100, doc: 'each row\'s height, at most'},
    at: {type: 'number', default: -1, doc: 'the row the guide rests on; tween it to slide the guide; -1 for no guide'},
    best: {type: 'number', default: -1, doc: 'the column of the guided row\'s best cell, set in the highlight'},
    note: {type: 'list', default: [], doc: 'the note in the guide\'s tab, one line each; the first is bold'},
    markKey: {type: 'list', default: [], doc: 'the words for yes, part and no, under the table'},
    noteAt: {type: 'number', default: -1, doc: 'the row the note belongs to: shown only while the guide rests there; -1 for any row'},
    shown: {type: 'number', default: 99, doc: 'how many rows are set; fractional while one sets in'},
  },
  preview: 32.6,
};

type Column = {name: string; sub?: string};
type Row = {label: string; cells: string[]};

function Mark({kind, color}: {kind: string; color: string}) {
  if (kind === 'yes') return <svg width={30} height={30} style={{display: 'block'}}><circle cx={15} cy={15} r={12} fill={color} /></svg>;
  if (kind === 'part') return <svg width={30} height={30} style={{display: 'block'}}><circle cx={15} cy={15} r={11} fill="none" stroke={color} strokeWidth={2.5} /><path d="M15 4a11 11 0 0 1 0 22z" fill={color} /></svg>;
  return <svg width={30} height={30} style={{display: 'block'}}><line x1={6} x2={24} y1={15} y2={15} stroke="var(--color-muted)" strokeWidth={3} /></svg>;
}

export function Matrix({w = 1680, columns = [], rows = [], h = 560, rowH: rowMax = 100, at = -1, best = -1, note = [], markKey = [], shown = 99, noteAt = -1}: {w?: number; columns?: Column[]; rows?: Row[]; h?: number; rowH?: number; at?: number; best?: number; note?: string[]; markKey?: string[]; shown?: number; noteAt?: number}) {
  const labelW = Math.min(Math.round(w * 0.36), Math.max(200, ...rows.map((r) => textW(r.label, 34) + 48))), tabW = note.length ? 420 : 16, pad = 24;
  const keyH = markKey.length === 3 ? 76 : 0;
  const colW0 = Math.floor((w - Math.min(Math.round(w * 0.36), Math.max(200, ...rows.map((r) => textW(r.label, 34) + 48))) - (note.length ? 420 : 16)) / Math.max(1, columns.length));
  // the head is as tall as its longest wrapped name, and the rows share what the head and the key leave
  const headH = Math.max(116, 40 + Math.max(1, ...columns.map((c) => Math.ceil(textW(c.name, 38) / Math.max(1, colW0 - 30)))) * 50 + (columns.some((c) => c.sub) ? 40 : 0));
  // the rows share what is left of the height, never taller than asked and never so short a figure is cramped
  const rowH = Math.max(36, Math.min(rowMax, Math.floor((h - headH - keyH) / Math.max(1, rows.length))));
  const cell = Math.min(36, Math.max(26, Math.round(rowH * 0.6)));
  const colW = Math.floor((w - labelW - tabW) / Math.max(1, columns.length));
  const tableW = labelW + colW * columns.length;
  const guideOn = at >= 0;
  const resting = guideOn && (noteAt < 0 || Math.round(at) === noteAt) ? clamp(1 - Math.abs(at - Math.round(at)) * 5) : 0;
  const ri = Math.round(at);
  const gTop = headH + at * rowH;
  return (
    <div style={{position: 'relative', width: w, fontFamily: 'var(--font-sans)', color: 'var(--color-text)'}}>
      {/* the head: column names over an ink rule */}
      <div style={{display: 'flex', height: headH, alignItems: 'flex-end', paddingBottom: 18, boxSizing: 'border-box', borderBottom: '3px solid var(--color-text)', width: tableW}}>
        <div style={{width: labelW}} />
        {columns.map((c) => (
          <div key={c.name} style={{width: colW, textAlign: 'right', paddingRight: 30, boxSizing: 'border-box'}}>
            <div style={{fontSize: 38, fontWeight: 700}}>{c.name}</div>
            {columns.some((k) => k.sub) && <div style={{fontSize: 28, color: 'var(--color-muted)', marginTop: 4, minHeight: 34}}>{c.sub ?? ''}</div>}
          </div>
        ))}
      </div>
      {guideOn && <div style={{position: 'absolute', left: 0, top: Math.round(gTop), width: tableW, height: rowH, background: GUIDE.fill}} />}
      {rows.map((r, i) => {
        const on = clamp(shown - i);
        const lit = guideOn && ri === i ? resting : 0;
        return (
          <div key={r.label} style={{position: 'relative', display: 'flex', alignItems: 'center', height: rowH, width: tableW, borderBottom: '1.5px solid var(--color-border)', boxSizing: 'border-box', opacity: on, transform: `translateY(${Math.round((1 - on) * 12)}px)`}}>
            <div style={{width: labelW, paddingLeft: pad, boxSizing: 'border-box', fontSize: fitSize(r.label, Math.min(34, cell), labelW - 48, 24), fontWeight: lit > 0.5 ? 700 : 500, whiteSpace: 'nowrap'}}>{r.label}</div>
            {r.cells.map((c, j) => {
              const isBest = j === best && lit > 0.5;
              const color = isBest ? 'var(--color-data)' : 'var(--color-text)';
              const mark = c === 'yes' || c === 'part' || c === 'no';
              return (
                <div key={j} style={{width: colW, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', paddingRight: 30, boxSizing: 'border-box'}}>
                  {mark ? <Mark kind={c} color={color} />
                    : <span style={{fontSize: isBest ? cell + 4 : cell, fontWeight: isBest ? 700 : 400, color, fontVariantNumeric: 'tabular-nums'}}>{c}</span>}
                </div>
              );
            })}
          </div>
        );
      })}
      {guideOn && (
        <>
          <div style={{position: 'absolute', left: 0, top: Math.round(gTop) - 1, width: tableW, height: GUIDE.width, background: GUIDE.edge}} />
          <div style={{position: 'absolute', left: 0, top: Math.round(gTop + rowH) - 2, width: tableW, height: GUIDE.width, background: GUIDE.edge}} />
          {/* the tab: the guide's note, at its right end */}
          <div style={{position: 'absolute', left: tableW, top: Math.round(gTop) - 1, height: rowH + 2, display: 'flex', alignItems: 'center'}}>
            <div style={{width: 10, alignSelf: 'stretch', background: GUIDE.edge}} />
            <div style={{width: tabW - 10, paddingLeft: 26, boxSizing: 'border-box', opacity: resting}}>
              {note.map((t, k) => <div key={k} style={{fontSize: k ? 26 : 30, fontWeight: k ? 400 : 700, color: k ? 'var(--color-muted)' : 'var(--color-text)', lineHeight: 1.35}}>{t}</div>)}
            </div>
          </div>
        </>
      )}
      {markKey.length === 3 && (
        <div style={{display: 'flex', gap: 40, marginTop: 22, fontSize: 28, color: 'var(--color-muted)', alignItems: 'center'}}>
          {['yes', 'part', 'no'].map((k, i) => (
            <div key={k} style={{display: 'flex', alignItems: 'center', gap: 12}}><div style={{transform: 'scale(0.8)'}}><Mark kind={k} color="var(--color-text)" /></div>{markKey[i]}</div>
          ))}
        </div>
      )}
    </div>
  );
}
