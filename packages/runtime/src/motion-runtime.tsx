/**
 * VisoTalk as an engine of @motionhub/runtime: a motion's components (`motion/parts/*.tsx`, importing '@motionhub/runtime') draw by the scene's clock,
 * the frame and the document's theme as the motion's tokens. The document's own parts keep this runtime's hooks.
 */
import React, {useMemo} from 'react';
import {MotionRuntimeProvider, tokenVariables, type Tokens, type VideoProps} from '@motionhub/runtime';
import type {ThemeTokens} from '@visotalk/ir';
import {useDocTime, useTime} from './react';
import {Video} from './video';

/** The document's theme as resolved motion tokens: its colours, its faces, and its caption skin as the caption group */
export function motionTokens(theme: ThemeTokens): Tokens {
  const fonts = {...theme.fonts, display: theme.fonts.display ?? theme.fonts.sans};
  const k = theme.caption;
  const caption: Record<string, string | number> = {};
  if (k) {
    const set = (name: string, v: string | number | undefined) => { if (v !== undefined) caption[name] = v; };
    set('font', fonts[k.font ?? 'sans']);
    set('size', k.size);
    set('weight', k.weight);
    set('color', k.color);
    set('background', k.background === 'none' ? undefined : k.background);
    set('radius', k.radius);
    set('padding-y', k.padding?.[0]);
    set('padding-x', k.padding?.[1]);
    set('bottom', k.bottom);
    set('max-width', k.maxWidth);
    set('shadow', k.shadow);
    if (k.rule) caption[k.ruleSide === 'left' ? 'rule-left' : 'rule-top'] = k.rule;
  }
  return {color: {...theme.colors}, font: fonts, ...(k && {caption})};
}

/** <Video src> of a motion: in a document, `src` is the id of a video asset */
const MotionVideo: React.FC<VideoProps> = ({src, startAt, trimBefore, playbackRate, objectFit, style}) => (
  <Video asset={src} start={startAt} in={trimBefore} rate={playbackRate} fit={objectFit} style={style} />
);

/** The motion runtime for everything inside it, and its tokens as custom properties (`--color-ink`, `--font-display`) on a wrapper that fills the stage */
export const MotionBridge: React.FC<{theme: ThemeTokens; fps: number; width: number; height: number; children: React.ReactNode}> = ({theme, fps, width, height, children}) => {
  const tokens = useMemo(() => motionTokens(theme), [theme]);
  const vars = useMemo(() => tokenVariables(tokens), [tokens]);
  const value = useMemo(() => ({useTime, useCompositionTime: useDocTime, fps, width, height, tokens, Video: MotionVideo}), [fps, width, height, tokens]);
  return <MotionRuntimeProvider value={value}><div style={{position: 'absolute', inset: 0, ...vars}}>{children}</div></MotionRuntimeProvider>;
};
