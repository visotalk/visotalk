import React from 'react';
export const meta = {
  name: {en: 'Title rule'}, purpose: 'title',
  line: 'A short title above a restrained editorial rule.',
  fits: 'a new question or a named idea; not every scene',
  params: {title: {type: 'text', doc: 'the short topic title'}},
  preview: 0,
};
export function TitleRule({title}: {title: string}) {
  return <div style={{color:'var(--vt-text)',fontFamily:'var(--vt-sans)',fontSize:64,fontWeight:600}}>
    {title}<div style={{width:120,height:4,marginTop:20,background:'var(--vt-data)'}}/>
  </div>;
}
