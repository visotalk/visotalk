/**
 * Effective pattern per beat: a beat pattern with `kind` replaces the current one; a patch (no `kind`) is merged over
 * it (slots by name, `null` removes a slot; options key by key). Beats without a pattern keep the current one.
 */
import type {PatternPatch, PatternUse, Scene} from './spec.ts';

export function mergePattern(base: PatternUse | undefined, p: PatternUse | PatternPatch): PatternUse | undefined {
  if (p.kind) return p as PatternUse;
  if (!base) return undefined;
  const slots: Record<string, string | string[]> = {...base.slots};
  for (const [k, v] of Object.entries(p.slots ?? {})) {
    if (v === null) delete slots[k];
    else slots[k] = v;
  }
  return {kind: base.kind, slots, options: {...(base.options ?? {}), ...(p.options ?? {})}};
}

/** [pattern at scene start, then the effective pattern of every beat] */
export function scenePatterns(scene: Scene): {start: PatternUse | undefined; beats: Array<PatternUse | undefined>} {
  let cur = scene.pattern;
  const beats = scene.beats.map((b) => (cur = b.pattern ? mergePattern(cur, b.pattern) : cur));
  return {start: scene.pattern, beats};
}

/** Every object id placed by the scene's patterns */
export const sceneObjectIds = (scene: Scene): string[] => {
  const {start, beats} = scenePatterns(scene);
  return [...new Set([start, ...beats].flatMap((p) => Object.values(p?.slots ?? {}).flat()))];
};
