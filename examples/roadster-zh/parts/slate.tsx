import {V, clamp, easeOut, phase, plate} from './tunnel.tsx';

export const meta = {
  name: {en: 'Run slate', 'zh-CN': '试验场记板'},
  purpose: 'title',
  line: 'A title as a test-run slate: a run number, the question in large condensed letters, a ruled line that sweeps under it like a laser.',
  fits: 'the opening question; a chapter of the test; the answer stated once, at the end',
  params: {
    run: {type: 'text', default: 'RUN 01', doc: 'the run or chapter number'},
    title: {type: 'text', doc: 'the question or the chapter, one or two short lines'},
    sub: {type: 'text', default: '', doc: 'one quieter line under it'},
    show: {type: 'progress', default: 1, doc: '0 to 1: the line sweeps, then the words come up'},
  },
  preview: 1.8,
};

/** A title: HTML over the test section, on the side of the frame the camera leaves free. */
export function RunSlate({run = 'RUN 01', title, sub = '', show = 1}: {run?: string; title: string; sub?: string; show?: number}) {
  const sweep = easeOut(phase(show, 0, 0.45)), words = easeOut(phase(show, 0.3, 1));
  return (
    <div style={{position: 'absolute', left: 160, top: 300, width: 1600}}>
      <div style={{...plate(30), color: V.low, opacity: words}}>{run}</div>
      <div style={{fontFamily: V.display, fontSize: 132, fontWeight: 800, lineHeight: 1.05, color: V.text, marginTop: 18, whiteSpace: 'pre-line',
        opacity: words, transform: `translateY(${(1 - words) * 24}px)`}}>{title}</div>
      <div style={{marginTop: 28, height: 3, width: `${sweep * 100}%`, background: 'linear-gradient(90deg, #4FD1FF, rgba(79, 209, 255, 0.1))', boxShadow: '0 0 18px #4FD1FF'}} />
      {sub && <div style={{marginTop: 24, fontFamily: V.sans, fontSize: 40, color: V.muted, opacity: clamp(words * 1.2 - 0.2)}}>{sub}</div>}
    </div>
  );
}
