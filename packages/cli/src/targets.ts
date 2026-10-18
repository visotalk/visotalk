/**
 * Where to look: the window of every line, the frames at which every target an action names should be on the page, and what a run found there.
 */
import type {Compiled} from '@visotalk/ir';
import type {FrameInspection} from '@visotalk/exporter';
import type {Project} from './project.ts';

/** The window of a line is the time it is spoken: `--at` of a still is a fraction of it, so it never lands in the pause or hold after the words */
export const lineWindows = (c: Compiled) => c.scenes.flatMap((sc) => sc.lines.map((l) => ({at: `${sc.id}/${l.id}`, scene: sc.id, line: l.id, from: l.from, end: l.from + l.duration})));

/**
 * Frames at which every target an action names should be on the page: just before and just after each action starts, and in the middle of each scene.
 * A target a part never registers (`useTarget`, `<Obj>`) is a typo that does nothing, and only a run can tell, so the page lists what is registered at these frames.
 */
export function targetFrames(c: Compiled, fps: number): number[] {
  const out = new Set<number>();
  const last = Math.round(c.duration * fps) - 1;
  const inScene = (sc: {from: number; end: number}, t: number) => Math.max(0, Math.min(last, Math.floor(Math.min(Math.max(t, sc.from), sc.end - 1 / fps) * fps)));
  for (const sc of c.scenes) out.add(inScene(sc, (sc.from + sc.end) / 2));
  for (const a of c.actions) {
    const sc = c.scenes.find((x) => x.id === a.scene)!;
    out.add(inScene(sc, a.start - 0.05));
    out.add(inScene(sc, a.start + 0.15));
  }
  return [...out].sort((x, y) => x - y);
}

export function targetIssues(p: Project, c: Compiled, fps: number, inspections: Record<number, unknown>): Array<{code: string; at: string; message: string; fix: string}> {
  const issues: Array<{code: string; at: string; message: string; fix: string}> = [];
  const clashes = new Set<string>();
  p.doc.scenes.forEach((scene, i) => {
    const sc = c.scenes[i];
    const seen = new Set<string>();
    for (const [f, ins] of Object.entries(inspections)) {
      const t = Number(f) / fps;
      if (t < sc.from || t >= sc.end) continue;
      const counts = new Map<string, number>();
      for (const id of (ins as FrameInspection).registered) counts.set(id, (counts.get(id) ?? 0) + 1);
      for (const [id, n] of counts) {
        seen.add(id);
        if (n > 1 && !clashes.has(`${scene.id}:${id}`)) {
          clashes.add(`${scene.id}:${id}`);
          issues.push({code: 'target.duplicate', at: `/scenes/${scene.id}`, message: `"${id}" is registered ${n} times in scene "${scene.id}" (a part is a target by its own id: do not reuse it inside)`,
            fix: 'give every target of a scene its own id: an action on a shared id moves all of them together'});
        }
      }
    }
    scene.animations.forEach((a, k) => {
      for (const id of [a.on].flat()) {
        if (seen.has(id)) continue;
        issues.push({code: 'target.unregistered', at: `/scenes/${scene.id}/animations/${a.id ?? k}`,
          message: `"${id}" is not on the page in scene "${scene.id}": no part has that id, and no element has registered it (registered at the sampled frames: ${[...seen].join(', ') || 'none'})`,
          fix: `register it: <Obj id="${id}">…</Obj> or {...useTarget("${id}")} on the element, or name a part of the scene; check the spelling`});
      }
    });
  });
  // inside a global part an element is invisible until an appear shows it: one that nothing appears never shows
  const appeared = new Set(c.actions.filter((a) => a.motion === 'appear').map((a) => a.on));
  const never = new Set<string>();
  for (const ins of Object.values(inspections)) for (const id of (ins as FrameInspection).registeredGlobal ?? []) if (!appeared.has(id)) never.add(id);
  for (const id of never) {
    issues.push({code: 'target.never-appears', at: '/parts', message: `"${id}" is inside a part of the document and nothing appears it: it stays invisible`,
      fix: `<Appear on="${id}" …/> in the scene where it first shows (inside a part of the document everything is invisible until an appear)`});
  }
  return issues;
}
