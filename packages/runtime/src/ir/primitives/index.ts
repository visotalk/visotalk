import type React from 'react';
import type {ObjectDef} from '@visotalk/ir';
import {Text} from './Text';
import {MathObj} from './Math';
import {Graph} from './Graph';
import {Chip} from './Chip';
import {Card} from './Card';
import {Code} from './Code';
import {Terminal} from './Terminal';
import {Steps} from './Steps';
import {Chart} from './Chart';
import {Counter} from './Counter';
import {Image, Video} from './Media';
import {Timeline} from './Timeline';
import {Credits} from './Credits';
import {Component} from './Component';
import {Shape} from './Shape';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPrimitive = React.FC<any>;

/** Object type → renderer. Types without an entry render a placeholder (and QA flags them). */
export const PRIMITIVES: Partial<Record<ObjectDef['type'], AnyPrimitive>> = {
  text: Text, math: MathObj, graph: Graph, chip: Chip, card: Card, code: Code, terminal: Terminal, steps: Steps, chart: Chart, counter: Counter,
  image: Image, video: Video, timeline: Timeline, credits: Credits, component: Component, shape: Shape,
};
