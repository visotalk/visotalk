import 'katex/dist/katex.min.css';
import katex from 'katex';
import React, {useLayoutEffect, useMemo, useRef, useState} from 'react';
import type {MathObject} from '@visotalk/ir';
import {flushSync} from 'react-dom';
import {usePathView} from '../context';
import {useRuntime} from '../../react';
import {C} from '../../theme';
import type {PrimitiveProps} from './common';

/**
 * KaTeX at the style's size (52 px, `large` 72 px), shrunk to fit the box when the expression is taller or wider:
 * measured after layout, then re-rendered once at the fitted size (synchronously, so exports see the final size).
 */
export const MathObj: React.FC<PrimitiveProps<MathObject>> = ({id, o, box}) => {
  usePathView(id);
  const html = useMemo(() => katex.renderToString(o.tex, {throwOnError: false, output: 'html', displayMode: false}), [o.tex]);
  const base = o.style === 'large' ? 72 : 52;
  const ref = useRef<HTMLDivElement>(null);
  const rt = useRuntime();
  const [fit, setFit] = useState({size: base, pad: 0});
  const [fonts, setFonts] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // measuring may start a font load: re-measure inside the readiness barrier once the fonts are there
    void el.offsetHeight;
    if (document.fonts.status === 'loading') rt.readiness.hold(document.fonts.ready.then(() => flushSync(() => setFonts((n) => n + 1))));
    // ink = every glyph box of the rendered expression (KaTeX vlists reach outside its inline box)
    const range = document.createRange();
    range.selectNodeContents(el);
    const ink = range.getBoundingClientRect();
    const top = el.getBoundingClientRect().top;
    const k = fit.size / base;
    const scale = Math.min(1, box.h / (ink.height / k), box.w / (ink.width / k));
    const size = Math.floor(base * scale);
    const pad = Math.max(0, Math.round((fit.pad - (ink.top - top)) * (size / fit.size)));
    if (size !== fit.size || pad !== fit.pad) setFit({size, pad});
  }, [html, box.w, box.h, base, fit, fonts, rt]);
  return (
    <div ref={ref} data-path={id} style={{position: 'absolute', left: box.x, top: box.y, width: box.w, fontSize: fit.size, paddingTop: fit.pad, color: C.text}}
      dangerouslySetInnerHTML={{__html: html}} />
  );
};
