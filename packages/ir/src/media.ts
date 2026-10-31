/**
 * What a document needs from the network, and when: every file the page may ask for, with the stretches of document time in which it is heard or seen.
 * The player fetches ahead by this. The solver knows the times of the lines and the sounds; which part shows which
 * picture is known only to a build, which reads the parts' sources before it throws them away and writes the result, and the size of each file, into the
 * document's `x-media` (`MediaHints`).
 */
import type {Asset, Id, Part, VisoDoc} from './spec.ts';
import {presenceAt, type Compiled} from './timeline.ts';

/** What a build found out that the document itself does not say: where each picture and clip is shown, and how big each file is. */
export interface MediaHints {
  /** by asset id: the parts that show it (`scene` is absent for a global part); an asset a build found no part for is not here, and is taken as possibly shown at any time */
  uses?: Record<Id, Array<{part: Id; scene?: Id}>>;
  /** by asset id: bytes of the file */
  sizes?: Record<Id, number>;
}

export type MediaKind = 'narration' | 'soundtrack' | 'sound' | 'image' | 'video';

export interface MediaItem {
  /** the file, as the page names it (a line's `audio`, an asset's `src`, the mixed soundtrack) */
  src: string;
  kind: MediaKind;
  /** document time in which it is heard or seen, as `[from, to]` seconds, in order */
  windows: Array<[number, number]>;
  /** the viewer cannot do without it while a window is open: it stops the clock if it has not arrived (a sound, which only enriches, never does) */
  critical: boolean;
  bytes?: number;
}

/** How finely a part's presence is sampled to find when it is on screen */
const STEP = 0.25;

const hintsOf = (doc: VisoDoc): MediaHints => (doc['x-media'] as MediaHints | undefined) ?? {};

/**
 * The asset ids that appear as a string literal in `source`: where a part names a picture or a clip (`useAsset("f4")`, `<Video asset="f4">`, `<Photo asset="f4">`).
 * A literal that is not an asset's id is not a use; an id built from pieces is not found, and its asset is then fetched when it is first drawn.
 */
export function assetsNamedIn(source: string, ids: ReadonlySet<Id>): Set<Id> {
  const found = new Set<Id>();
  for (const m of source.matchAll(/'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`([^`$\\]*)`/g)) {
    const text = m[1] ?? m[2] ?? m[3];
    if (ids.has(text)) found.add(text);
  }
  return found;
}

/**
 * The hints for a document about to be built: which parts name each picture and clip, from the bodies it still has. `prelude` is the module's own code
 * around the document (its components): an asset it names may be shown by any part, so it is left out of `uses`. `sizes` are the built files' bytes.
 */
export function mediaHints(doc: VisoDoc, prelude: string, sizes: Record<Id, number>): MediaHints {
  const visual = new Set((doc.assets ?? []).filter((a) => a.kind === 'image' || a.kind === 'video').map((a) => a.id));
  const anywhere = assetsNamedIn(prelude, visual);
  const uses: NonNullable<MediaHints['uses']> = {};
  const note = (part: Part, scene?: Id) => {
    if (!part.body) return;
    for (const id of assetsNamedIn(part.body, visual)) if (!anywhere.has(id)) (uses[id] ??= []).push({part: part.id, ...(scene !== undefined && {scene})});
  };
  for (const part of doc.parts ?? []) note(part);
  for (const scene of doc.scenes) for (const part of scene.parts) note(part, scene.id);
  return {...(Object.keys(uses).length && {uses}), ...(Object.keys(sizes).length && {sizes})};
}

/** The stretches of `[from, to]` in which a part is on screen (presence above nothing), merged, sampled every `STEP` seconds. */
function onScreen(c: Compiled, part: Id, scene: Id | undefined, from: number, to: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  let open: number | undefined;
  for (let t = from; t < to; t += STEP) {
    // a part that has just begun to appear was invisible one step ago: the window opens there, so it never opens late
    if (presenceAt(c, part, t, scene, true) > 0.001) open ??= Math.max(from, t - STEP);
    else if (open !== undefined) { out.push([open, t]); open = undefined; }
  }
  if (open !== undefined) out.push([open, to]);
  return out;
}

const merge = (windows: Array<[number, number]>): Array<[number, number]> => {
  const sorted = [...windows].sort((a, b) => a[0] - b[0]);
  const out: Array<[number, number]> = [];
  for (const w of sorted) {
    const last = out[out.length - 1];
    if (last && w[0] <= last[1]) last[1] = Math.max(last[1], w[1]);
    else out.push([w[0], w[1]]);
  }
  return out;
};

/**
 * Every file the page may need and when, in the order it is first needed: the narration clips (each in its line), the soundtrack when the page has one (`mix`: it
 * stands for the clips and the sounds, which the plan then leaves out), the sounds (from their start to their end), and each picture and clip in the stretches in which
 * a part that shows it is on screen. A picture or clip no part is known to show may be shown at any time: the whole film.
 */
export function mediaPlan(doc: VisoDoc, c: Compiled, opts: {mix?: string} = {}): MediaItem[] {
  const hints = hintsOf(doc);
  const assets = new Map((doc.assets ?? []).map((a): [Id, Asset] => [a.id, a]));
  const items: MediaItem[] = [];
  if (opts.mix) items.push({src: opts.mix, kind: 'soundtrack', windows: [[0, c.duration]], critical: true});
  else {
    if(c.recording)items.push({src:c.recording.audio,kind:'narration',windows:[[0,c.duration]],critical:true});
    for (const sc of c.scenes) for (const l of sc.lines) if (l.audio) items.push({src: l.audio, kind: 'narration', windows: [[l.from, l.from + l.duration]], critical: true});
    for (const s of c.sounds) {
      const a = assets.get(s.asset);
      const src = a?.src ?? s.asset;
      const window: [number, number] = [s.start, s.end ?? c.duration];
      const known = items.find((i) => i.kind === 'sound' && i.src === src);
      if (known) known.windows.push(window);
      else items.push({src, kind: 'sound', windows: [window], critical: false, ...(hints.sizes?.[s.asset] !== undefined && {bytes: hints.sizes[s.asset]})});
    }
  }
  for (const a of assets.values()) {
    if (a.kind !== 'image' && a.kind !== 'video') continue;
    const used = hints.uses?.[a.id];
    const windows: Array<[number, number]> = [];
    if (used) {
      for (const u of used) {
        if (u.scene === undefined) windows.push(...onScreen(c, u.part, undefined, 0, c.duration));
        else {
          const sc = c.scenes.find((s) => s.id === u.scene);
          if (sc) windows.push(...onScreen(c, u.part, sc.id, sc.from, sc.end));
        }
      }
    } else windows.push([0, c.duration]);
    // a use that is never on screen asks nothing of the network
    if (!windows.length) continue;
    items.push({src: a.src, kind: a.kind, windows: merge(windows), critical: true, ...(hints.sizes?.[a.id] !== undefined && {bytes: hints.sizes[a.id]})});
  }
  for (const i of items) i.windows = merge(i.windows);
  return items.sort((a, b) => a.windows[0][0] - b.windows[0][0]);
}
