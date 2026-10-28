/**
 * Where to look: the window of every line, the frames at which every target an action names should be on the page, and what a run found there.
 */
import {captionBlocks, resolveStarts, wordAt, type Compiled, type VisoDoc} from '@visotalk/ir';
import type {FrameInspection} from '@visotalk/exporter';
import type {Project} from './project.ts';

/** The window of a line is the time it is spoken: `--at` of a still is a fraction of it, so it never lands in the pause or hold after the words */
export const lineWindows = (c: Compiled) => c.scenes.flatMap((sc) => sc.lines.map((l) => ({at: `${sc.id}/${l.id}`, scene: sc.id, line: l.id, from: l.from, end: l.from + l.duration})));

/** The frame at time t, kept inside its scene and the film */
const frameIn = (c: Compiled, fps: number, sc: {from: number; end: number}, t: number) =>
  Math.max(0, Math.min(Math.round(c.duration * fps) - 1, Math.floor(Math.min(Math.max(t, sc.from), sc.end - 1 / fps) * fps)));

/**
 * Frames at which every target an action names should be on the page: just before and just after each action starts, and in the middle of each scene.
 * A target a part never registers (`useTarget`, `<Obj>`) is a typo that does nothing, and only a run can tell, so the page lists what is registered at these frames.
 */
export function targetFrames(c: Compiled, fps: number): number[] {
  const out = new Set<number>();
  const inScene = (sc: {from: number; end: number}, t: number) => frameIn(c, fps, sc, t);
  for (const sc of c.scenes) out.add(inScene(sc, (sc.from + sc.end) / 2));
  for (const a of c.actions) {
    const sc = c.scenes.find((x) => x.id === a.scene)!;
    out.add(inScene(sc, a.start - 0.05));
    out.add(inScene(sc, a.start + 0.15));
  }
  return [...out].sort((x, y) => x - y);
}

/**
 * With `captions: 'words'`, the frame where each block of words is fullest (just after its last word): that is where it can run past the safe area,
 * and a sample taken part-way through a line would not show it.
 */
export function blockFrames(doc: VisoDoc, c: Compiled, fps: number): Array<{frame: number; at: string}> {
  if (doc.exports?.captions !== 'words') return [];
  const last = Math.round(c.duration * fps) - 1;
  return captionBlocks(c).map((b) => {
    const frame = Math.max(0, Math.min(last, Math.round((b.words[b.words.length - 1].t1 + 0.05) * fps)));
    return {frame, at: `words@${(frame / fps).toFixed(2)}s`};
  });
}

export function targetIssues(p: Project, c: Compiled, fps: number, inspections: Record<number, unknown>, range?: [number, number]): Array<{code: string; at: string; message: string; fix: string}> {
  const issues: Array<{code: string; at: string; message: string; fix: string}> = [];
  const clashes = new Set<string>();
  // a part whose code threw draws nothing: name it, and do not also report every target inside it as missing
  const crashed = new Map<string, {part: string; scene?: string; message: string}>();
  for (const ins of Object.values(inspections)) for (const e of (ins as FrameInspection).partErrors ?? []) crashed.set(`${e.scene ?? ''}:${e.part}`, e);
  for (const e of crashed.values()) {
    issues.push({code: 'part.error', at: e.scene ? `/scenes/${e.scene}/parts/${e.part}` : `/parts/${e.part}`, message: `part "${e.part}"${e.scene ? ` of scene "${e.scene}"` : ' (global)'} threw: ${e.message}`,
      fix: `read the message and the part's code: a prop of the wrong type (a number where it maps over a list) or a value read before it exists is the usual cause; \`validate\` cannot see it`});
  }
  const starts = range && resolveStarts(p.doc, c.scenes, fps);
  p.doc.scenes.forEach((scene, i) => {
    const sc = c.scenes[i];
    if (range && (sc.end * fps <= range[0] || sc.from * fps >= range[1])) return;
    const seen = new Set<string>();
    const broken = [...crashed.values()].some((e) => e.scene === undefined || e.scene === scene.id);
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
      // a render of part of the film looks only at the actions that start in it (`range`, in frames)
      const start = starts?.get(a);
      if (range && start !== undefined && (Math.round(start * fps) < range[0] || Math.round(start * fps) >= range[1])) return;
      for (const id of [a.target].flat()) {
        if (seen.has(id) || broken) continue;
        issues.push({code: 'target.unregistered', at: `/scenes/${scene.id}/animations/${a.id ?? k}`,
          message: `"${id}" is not on the page in scene "${scene.id}": no part has that id, and no element has registered it (registered at the sampled frames: ${[...seen].join(', ') || 'none'})`,
          fix: `register it: <Obj id="${id}">…</Obj> or {...useTarget("${id}")} on the element, or name a part of the scene; check the spelling`});
      }
    });
  });
  // inside a global part an element is invisible until an appear shows it: one that nothing appears never shows
  const appeared = new Set(c.actions.filter((a) => a.motion === 'appear').map((a) => a.target));
  const never = new Set<string>();
  for (const ins of Object.values(inspections)) for (const id of (ins as FrameInspection).registeredGlobal ?? []) if (!appeared.has(id)) never.add(id);
  for (const id of never) {
    issues.push({code: 'target.never-appears', at: '/parts', message: `"${id}" is inside a part of the document and nothing appears it: it stays invisible`,
      fix: `<Appear target="${id}" …/> in the scene where it first shows (inside a part of the document everything is invisible until an appear)`});
  }
  return issues;
}

/**
 * A part that appears with nothing drawn: on the frame just after its appear (one `targetFrames` samples) it paints nothing, and elements it holds are still
 * hidden, waiting for appears of their own. Its own appear belongs where the first of them shows; until then it is an empty box on a timeline. That an
 * element is inside the part is read from the frame after that element's own appear, where it is on the page with the elements around it. The part must
 * still draw nothing on the frame just before that first appear: what it draws without an appear (a tweened stroke or word) would be hidden by a later one. A wait under
 * `EMPTY_MIN` seconds is left alone: an empty part is invisible, and so short a stretch does not show on a timeline either.
 */
export const EMPTY_MIN = 1;

export function emptyAppearIssues(p: Project, c: Compiled, fps: number, inspections: Record<number, unknown>): Array<{code: string; at: string; message: string; fix: string}> {
  const issues: Array<{code: string; at: string; message: string; fix: string}> = [];
  const page = (sc: {from: number; end: number}, t: number) => inspections[frameIn(c, fps, sc, t)] as FrameInspection | undefined;
  const globals = new Set((p.doc.parts ?? []).map((x) => x.id));
  const inside = (ins: FrameInspection, id: string, part: string) => {
    for (let at: string | null = id, n = 0; at && n < 32; n++) {
      const o = ins.objects.find((x) => x.id === at);
      if (!o) return false;
      if (o.parent === part) return true;
      at = o.parent;
    }
    return false;
  };
  const reported = new Set<string>();
  for (const a of c.actions) {
    const scene = p.doc.scenes.find((x) => x.id === a.scene);
    const sc = c.scenes.find((x) => x.id === a.scene);
    if (a.motion !== 'appear' || !scene || !sc || !(globals.has(a.target) || scene.parts.some((x) => x.id === a.target))) continue;
    const ins = page(sc, a.start + 0.15);
    const box = ins?.objects.find((o) => o.id === a.target && o.parent === null);
    // too faint yet to tell what it draws, or it draws something
    if (!ins || !box || box.opacity < 0.05 || box.ink) continue;
    const visible = new Set(ins.objects.filter((o) => o.opacity >= 0.05).map((o) => o.id));
    const later = c.actions
      .filter((b) => b.motion === 'appear' && b.scene === a.scene && b.start > a.start && b.target !== a.target && ins.registered.includes(b.target) && !visible.has(b.target))
      .sort((x, y) => x.start - y.start);
    const held = later.filter((b) => {
      const there = page(sc, b.start + 0.15);
      return there !== undefined && inside(there, b.target, a.target);
    });
    const first = held[0];
    const key = `${a.scene}:${a.target}:${a.start}`;
    if (!first || first.start - a.start < EMPTY_MIN || reported.has(key)) continue;
    // something it draws with no appear of its own (a stroke, a typed word, a number tweened into view) can show in the wait: still nothing on the frame
    // just before its first held element shows, or it is not empty, and moving its appear would hide that
    const before = page(sc, first.start - 0.05)?.objects.find((o) => o.id === a.target && o.parent === null);
    if (!before || before.opacity < 0.05 || before.ink) continue;
    reported.add(key);
    const k = scene.animations.findIndex((x) => x.motion === 'appear' && [x.target].flat().includes(a.target));
    // where the first content is anchored, as the document says it (a word the narration names), else the word spoken then
    const own = scene.animations.find((x) => x.motion === 'appear' && [x.target].flat().includes(first.target))?.at;
    const anchor = own && 'line' in own ? `line="${own.line}"${own.word ? ` word="${own.word}"` : ''}` : (() => {
      const w = wordAt(c, first.start + 0.02);
      return w ? `line="${w.line}" word="${w.word}"` : undefined;
    })();
    const names = [...new Set(held.map((b) => b.target))];
    issues.push({code: 'part.appears-empty', at: k >= 0 ? `/scenes/${scene.id}/animations/${scene.animations[k].id ?? k}` : `/scenes/${scene.id}/parts/${a.target}`,
      message: `part "${a.target}" appears at ${a.start.toFixed(2)} s with nothing drawn: what it holds ("${names.slice(0, 3).join('", "')}"${names.length > 3 ? ` and ${names.length - 3} more` : ''}) first shows at ${first.start.toFixed(2)} s${anchor ? ` (${anchor})` : ''}`,
      fix: `anchor the part's own <Appear> where its content first shows${anchor ? ` (${anchor})` : ''}, with dur={0} (its content brings its own entrance), not before: until then it is an empty box on the timeline`});
  }
  return issues;
}
