/**
 * Built-in themes: tokens (colours, fonts). A part reads them as CSS custom properties (`var(--vt-data)`) or from `useTheme()`; `theme.tokens` in a
 * document overrides colours and fonts.
 */
import type {ThemeTokens} from './spec.ts';

export const DEFAULT_THEME = 'visotalk/dark';

const DARK_COLORS = {
  bg: '#0B0E14', panel: '#121722', panel2: '#171E2B', border: '#263042', text: '#E8ECF4', muted: '#8792A6', faint: '#3A4559',
  data: '#6CB6FF', grad: '#FF8A4C', op: '#B794FF', good: '#4ADE80', bad: '#F87171', warn: '#FBBF24',
};
/** The colour keys every theme defines */
export type ThemeColorKey = keyof typeof DARK_COLORS;

export const DARK_TOKENS: ThemeTokens = {
  colors: DARK_COLORS,
  fonts: {sans: '"Inter", sans-serif', mono: '"JetBrains Mono", monospace'},
  radius: 20,
  space: [8, 16, 24, 40, 60],
};

export const THEMES: Record<string, {tokens: ThemeTokens}> = {
  [DEFAULT_THEME]: {tokens: DARK_TOKENS},
};

/** Tokens of a document: its theme's, with `theme.tokens` merged over them */
export function themeTokens(theme?: {id: string; tokens?: Partial<ThemeTokens>}): ThemeTokens {
  const base = THEMES[theme?.id ?? DEFAULT_THEME]?.tokens ?? DARK_TOKENS;
  const t = theme?.tokens ?? {};
  return {...base, ...t, colors: {...base.colors, ...(t.colors ?? {})}, fonts: {...base.fonts, ...(t.fonts ?? {})}};
}
