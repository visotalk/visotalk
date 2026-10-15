import icons from './icons.json' with {type: 'json'};

/** The built-in icons: each a list of SVG paths on a 24 x 24 grid (Lucide, ISC: `icons.LICENSE`; `scripts/build-icon-set.mjs` writes `icons.json`) */
export const ICONS: Record<string, string[]> = icons;
export const ICON_NAMES = Object.keys(ICONS);
