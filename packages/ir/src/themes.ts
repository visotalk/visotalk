/**
 * Built-in themes: tokens (colours, fonts) and the style names each object type accepts. Renderers type their style
 * tables against these lists, so a style that exists here exists in the runtime and vice versa; the validator reports
 * styles a theme does not define (`style.unknown`). `theme.tokens` in a document overrides colours and fonts.
 */
import type {ObjectDef, ThemeTokens} from './spec.ts';

export const DEFAULT_THEME = 'visotalk/dark';

const DARK_STYLES = {
  text: ['title', 'hero', 'subtitle', 'body', 'kicker', 'caption', 'stat', 'quote', 'question', 'mega', 'brand', 'url', 'statement', 'note', 'footer',
    'headline', 'monoHero', 'centerSub', 'formula', 'rule', 'callout', 'label', 'sweep', 'display', 'eyebrow', 'byline', 'claim', 'failStat',
    'overlayHero', 'overlayNote', 'small', 'smallMono'],
  /** inline runs inside text */
  run: ['accent', 'bad', 'light', 'data', 'grad', 'op', 'muted', 'mono'],
  /** chips also take a `-left` suffix (left-aligned in their box), and `left` alone */
  chip: ['default', 'tool', 'mono', 'accent', 'stat', 'badge', 'overlay', 'overlayBox', 'overlayStatement', 'overlayLabel', 'stamp', 'arrow', 'plain'],
  card: ['default', 'accent', 'meta', 'stats', 'stats-accent', 'cover', 'strike', 'emph', 'bare', 'lowerThird', 'overlayStat'],
  counter: ['default', 'data', 'op', 'grad'],
  code: ['default', 'small'],
  terminal: ['default', 'small'],
  steps: ['points', 'labels', 'commands', 'commands-new'],
  math: ['default', 'large'],
  image: ['default', 'rounded'],
  video: ['default', 'rounded'],
} as const;

export type TextStyle = (typeof DARK_STYLES.text)[number];
export type RunStyle = (typeof DARK_STYLES.run)[number];
export type ChipStyle = (typeof DARK_STYLES.chip)[number];
export type CardStyle = (typeof DARK_STYLES.card)[number];

const DARK_COLORS = {
  bg: '#0B0E14', panel: '#121722', panel2: '#171E2B', border: '#263042', text: '#E8ECF4', muted: '#8792A6', faint: '#3A4559',
  data: '#6CB6FF', grad: '#FF8A4C', op: '#B794FF', good: '#4ADE80', bad: '#F87171', warn: '#FBBF24',
};
/** The colour keys every theme defines; a component reads `ctx.theme.colors.<key>` and `tsc` rejects any other */
export type ThemeColorKey = keyof typeof DARK_COLORS;

export const DARK_TOKENS: ThemeTokens = {
  colors: DARK_COLORS,
  fonts: {sans: '"Inter", sans-serif', mono: '"JetBrains Mono", monospace'},
  radius: 20,
  space: [8, 16, 24, 40, 60],
};

export const THEMES: Record<string, {tokens: ThemeTokens; styles: Partial<Record<ObjectDef['type'] | 'run', readonly string[]>>}> = {
  [DEFAULT_THEME]: {tokens: DARK_TOKENS, styles: DARK_STYLES},
};

/** Tokens of a document: its theme's, with `theme.tokens` merged over them */
export function themeTokens(theme?: {id: string; tokens?: Partial<ThemeTokens>}): ThemeTokens {
  const base = THEMES[theme?.id ?? DEFAULT_THEME]?.tokens ?? DARK_TOKENS;
  const t = theme?.tokens ?? {};
  return {...base, ...t, colors: {...base.colors, ...(t.colors ?? {})}, fonts: {...base.fonts, ...(t.fonts ?? {})}};
}

/** Is `style` defined for objects of `type` (or `run`) in the theme? Types without a list accept any style. */
export function styleKnown(themeId: string | undefined, type: string, style: string): boolean {
  const list = THEMES[themeId ?? DEFAULT_THEME]?.styles[type as ObjectDef['type']];
  if (!list) return true;
  if (type === 'chip' && (style === 'left' || list.includes(style.replace(/-left$/, '')))) return true;
  return list.includes(style);
}
