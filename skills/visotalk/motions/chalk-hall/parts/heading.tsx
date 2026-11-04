import React from 'react';
import {ChalkDefs, unit} from './chalk.ts';
import {Mark} from './write.tsx';
import {Chalked} from './hand.ts';

export const meta = {
  name: {en: 'Board heading', 'zh-CN': '板书标题'},
  purpose: 'title',
  line: 'The lesson\'s heading chalked top left and underlined, the lesson\'s number small at the right.',
  fits: 'the topic of a clean board; the question it answers',
  params: {
    title: {type: 'text', doc: 'the heading, short'},
    aside: {type: 'text', default: '', doc: 'small at the top right: a date, a lesson number, a chapter'},
    write: {type: 'progress', default: 1, doc: '0 to 1: the heading written, then underlined'},
    size: {type: 'px', default: 64, doc: 'the heading\'s size'},
    width: {type: 'px', doc: 'the box\'s width, for the aside at its right'},
  },
  preview: 1.6,
};

export function Heading({title, aside = '', write = 1, size = 64, width}: {title: string; aside?: string; write?: number; size?: number; width: number}) {
  const words = unit(write / 0.8), line = unit((write - 0.8) / 0.2);
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
      <ChalkDefs />
      <div style={{position: 'relative'}}>
        <Chalked pieces={[{text: title, size}]} write={words} />
        <Mark kind="underline" progress={line} chalk="white" weight={Math.max(4, size / 14)} />
      </div>
      {aside && <Chalked pieces={[{text: aside, size: size * 0.58, chalk: 'faded'}]} write={unit((write - 0.6) / 0.4)} />}
    </div>
  );
}
