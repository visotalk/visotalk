/** credits: media (attribution · license, source) and sources, generated from the document; two columns. */
import React from 'react';
import {creditsOf, type CreditsObject} from '@visotalk/ir';
import {useIR} from '../context';
import {C, F} from '../../theme';
import type {PrimitiveProps} from './common';

const head: React.CSSProperties = {fontFamily: F.mono, fontSize: 22, letterSpacing: 2, color: C.grad, marginBottom: 14};
const bare = (u: string) => decodeURI(u).replace(/^https?:\/\//, '');

export const Credits: React.FC<PrimitiveProps<CreditsObject>> = ({id, o}) => {
  const {doc} = useIR();
  const {media, sources} = creditsOf(doc);
  const show = (k: 'media' | 'sources') => !o.include || o.include.includes(k);
  return (
    <div data-path={id} style={{width: '100%', height: '100%', display: 'flex', gap: 80}}>
      {show('media') && media.length > 0 && (
        <div style={{flex: 1.1, minWidth: 0}}>
          <div style={head}>MEDIA</div>
          {media.map((m) => (
            <div key={m.asset} style={{fontFamily: F.sans, fontSize: 21, color: C.text, marginBottom: 10, lineHeight: 1.3}}>
              {m.attribution} · <span style={{color: C.muted}}>{m.license}</span>
              {m.source && <div style={{fontFamily: F.mono, fontSize: 15, color: C.faint, overflowWrap: 'anywhere'}}>{bare(m.source)}</div>}
            </div>
          ))}
        </div>
      )}
      <div style={{flex: 0.9, minWidth: 0}}>
        {show('sources') && sources.length > 0 && (
          <>
            <div style={head}>SOURCES</div>
            {sources.map((s) => (
              <div key={s.id} style={{fontFamily: F.mono, fontSize: 16, color: C.muted, marginBottom: 12, overflowWrap: 'anywhere'}}>{bare(s.url)}</div>
            ))}
          </>
        )}
        {o.note && <div style={{fontFamily: F.sans, fontSize: 20, color: C.faint, marginTop: 30, lineHeight: 1.4, whiteSpace: 'pre-line'}}>{o.note}</div>}
      </div>
    </div>
  );
};
