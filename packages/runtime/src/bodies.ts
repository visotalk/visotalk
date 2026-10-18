import React from 'react';
import {Part, Scene} from '@visotalk/jsx';
import type {PartBody} from './stage';

/** The children of every part of a document element, by `scene:part` (`:part` for a part of the document) */
export function partBodies(root: React.ReactElement): Map<string, PartBody> {
  const out = new Map<string, PartBody>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type El = React.ReactElement<any>;
  const kids = (el: El): El[] => (Array.isArray(el.props.children) ? el.props.children : [el.props.children]).flat(Infinity).filter((k: unknown): k is El => React.isValidElement(k));
  for (const k of kids(root)) {
    if (k.type === Part) out.set(`:${k.props.id}`, k.props.children);
    else if (k.type === Scene) for (const j of kids(k)) if (j.type === Part) out.set(`${k.props.id}:${j.props.id}`, j.props.children);
  }
  return out;
}
