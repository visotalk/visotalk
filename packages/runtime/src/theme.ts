/**
 * Theme tokens as CSS custom properties. Components reference `C.*` / `F.*` (var(--vt-*)); the host sets the
 * variables from the document's theme (themeTokens: the built-in theme with `theme.tokens` merged over it), so a brand
 * kit changes colours and fonts without touching components. Style tables are typed against the theme's style lists
 * in @visotalk/ir (themes.ts).
 */
import {DARK_TOKENS, type ThemeTokens} from '@visotalk/ir';

const COLOR_KEYS = ['bg', 'panel', 'panel2', 'border', 'text', 'muted', 'faint', 'data', 'grad', 'op', 'good', 'bad', 'warn'] as const;
export type ColorToken = (typeof COLOR_KEYS)[number];

export const C = Object.fromEntries(COLOR_KEYS.map((k) => [k, `var(--vt-${k})`])) as Record<ColorToken, string>;

export const F = {
  sans: 'var(--vt-sans)',
  mono: 'var(--vt-mono)',
  display: 'var(--vt-display)',
};

/** `color` at `alpha` (0..1), for token colours */
export const alpha = (color: string, a: number) => `color-mix(in srgb, ${color} ${+(a * 100).toFixed(2)}%, transparent)`;

/** CSS custom properties for a set of tokens (defaults for anything missing) */
export function themeVars(tokens: ThemeTokens): Record<string, string> {
  const colors = {...DARK_TOKENS.colors, ...tokens.colors};
  return {
    ...Object.fromEntries(COLOR_KEYS.map((k) => [`--vt-${k}`, colors[k]])),
    '--vt-sans': tokens.fonts.sans,
    '--vt-mono': tokens.fonts.mono,
    // a theme without a display face titles in its sans
    '--vt-display': tokens.fonts.display ?? tokens.fonts.sans,
  };
}

export const NO_LIGA = {fontVariantLigatures: 'none' as const, fontFeatureSettings: '"liga" 0, "calt" 0'};
