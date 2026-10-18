/**
 * QA helpers that need only the document and its solved timeline: sample frames per line, and static checks.
 * Frame checks on rendered layout live in @visotalk/exporter (qa.ts).
 */
import type {VisoDoc} from './spec.ts';
import {alignedSpan, presenceAt, type Compiled} from './timeline.ts';

export interface Sample {
  frame: number;
  /** "scene/line@fraction" or "scene@0.4s" */
  at: string;
}

/** Frames at fractions of every line (entrances, mid-line, settled), plus 0.4 s into each scene */
export function sampleFrames(c: Compiled, fps: number, perLine = 3): Sample[] {
  const out = new Map<number, string>();
  const last = Math.round(c.duration * fps) - 1;
  const fr = (t: number) => Math.min(last, Math.max(0, Math.floor(t * fps)));
  for (const s of c.scenes) {
    out.set(fr(s.from + 0.4), `${s.id}@0.4s`);
    s.lines.forEach((l, i) => {
      const end = i + 1 < s.lines.length ? s.lines[i + 1].from : s.end;
      for (let k = 0; k < perLine; k++) {
        const f = (k + 1) / (perLine + 1);
        out.set(fr(l.from + f * (end - l.from)), `${s.id}/${l.id}@${f.toFixed(2)}`);
      }
    });
  }
  return [...out].sort((a, b) => a[0] - b[0]).map(([frame, at]) => ({frame, at}));
}

export interface QaIssue {
  code: string;
  at: string;
  objects: string[];
  message: string;
  fix?: string;
}

/** A target on screen for less than this (seconds) before something takes it away is reported: the viewer has not had time to see it and understand it */
const MIN_SEEN = 2;

/** Static checks: a target that an `appear` names but that is never visible in its scene, and targets on screen for less than MIN_SEEN seconds in one go */
export function staticQa(doc: VisoDoc, c: Compiled): QaIssue[] {
  const issues: QaIssue[] = [];
  // an action that starts after its scene is over never happens in that scene: on a scene's part it is lost, on a global part it lands in a later scene
  for (const a of c.actions) {
    const sc = c.scenes.find((s) => s.id === a.scene);
    if (sc && a.start >= sc.end) {
      issues.push({code: 'action.outside-scene', at: a.scene, objects: [a.on], message: `${a.motion} of "${a.on}" starts at ${(a.start - sc.from).toFixed(1)} s into scene "${a.scene}", which is over at ${(sc.end - sc.from).toFixed(1)} s`,
        fix: 'anchor it on a word of the scene, or at="end" with a negative offset; to hold the scene longer give its last line a hold'});
    }
  }
  const global = new Set((doc.parts ?? []).map((x) => x.id));
  // a target that several scenes act on can only be inside a global part: it is one thing across them
  const scenesOf = new Map<string, Set<string>>();
  for (const a of c.actions) (scenesOf.get(a.on) ?? scenesOf.set(a.on, new Set()).get(a.on)!).add(a.scene);
  doc.scenes.forEach((scene, i) => {
    const parts = new Set(scene.parts.map((x) => x.id));
    const sc = c.scenes[i];
    if (!sc) return;
    const ids = [...new Set(c.actions.filter((a) => a.scene === scene.id && a.motion === 'appear').map((a) => a.on))];
    for (const id of ids) {
      let seen = false;
      const scope = global.has(id) || (scenesOf.get(id)?.size ?? 0) > 1 ? undefined : scene.id;
      const isPart = parts.has(id) || global.has(id);
      // what was on screen when the scene began has been seen already: a carried global target is not a flash, however soon this scene takes it away
      let from: number | undefined = scope === undefined && presenceAt(c, id, sc.from - 0.001, scope, isPart) > 0.05 ? -Infinity : undefined;
      for (let t = sc.from; t <= sc.end + 0.05; t += 0.05) {
        const on = t < sc.end && presenceAt(c, id, t, scope, isPart) > 0.05;
        if (on) seen = true;
        if (on && from === undefined) from = t;
        if (!on && from !== undefined) {
          if (t - from < MIN_SEEN - 0.1) {
            issues.push({
              code: 'visible.brief', at: scene.id, objects: [id],
              message: `"${id}" is on screen for ${(t - from).toFixed(1)} s (${from.toFixed(1)}-${t.toFixed(1)} s) before it goes: too short to see and understand`,
              fix: `keep it on screen for ${MIN_SEEN} s or more: move its \`disappear\` later, give the last line of the scene a \`hold\` (<Line hold={1.5}>) so the scene outlasts the narration, or merge it into the next picture. A flash that is the point is allowed`,
            });
          }
          from = undefined;
        }
      }
      if (!seen) issues.push({code: 'never-visible', at: scene.id, objects: [id], message: `"${id}" has an appear in scene "${scene.id}" but is never visible in it`, fix: 'start its appear while the scene is running: an anchor on a word of one of its lines'});
    }
  });
  return issues;
}

/** The line and the spoken word at time t, for labelling a sampled frame; none in a pause or in a scene without narration */
export function wordAt(c: Compiled, t: number): {line: string; word: string} | undefined {
  for (const sc of c.scenes) for (const l of sc.lines) {
    if (t < l.from || t >= l.from + l.duration) continue;
    const w = l.words?.find((x) => t >= l.from + x.t0 && t < l.from + x.t1);
    if (w) return {line: l.id, word: w.w};
    const words = l.say.split(/\s+/).filter(Boolean);
    return {line: l.id, word: words[Math.min(words.length - 1, Math.floor(((t - l.from) / l.duration) * words.length))]};
  }
  return undefined;
}

/** An aligned word with a probability below this is not trusted for sync */
const WEAK_ALIGNMENT = 0.5;

/**
 * How much the word anchors rest on: lines with anchors but no word times (placed by character position, up to half a second off),
 * and anchored words the aligner was unsure of (a letter spoken by its name, a word it could not hear) or could not time (no letters).
 * Needs the voice manifest, so it is not part of staticQa.
 */
export function alignmentIssues(doc: VisoDoc, c: Compiled): QaIssue[] {
  const issues: QaIssue[] = [];
  const estimated: string[] = [];
  const seen = new Set<string>();
  doc.scenes.forEach((scene, si) => {
    const lines = c.scenes[si]?.lines ?? [];
    for (const a of scene.animations) {
      if (!('line' in a.at) || a.at.word === undefined) continue;
      const at = a.at;
      const line = lines.find((l) => l.id === at.line);
      if (!line) continue;
      if (!line.words?.length) {
        if (!estimated.includes(line.id)) estimated.push(line.id);
        continue;
      }
      const span = alignedSpan(line, at.word!, at.nth);
      if (!span) {
        if (!estimated.includes(line.id)) estimated.push(line.id);
        continue;
      }
      const i = at.edge === 'end' ? span.last : span.first;
      const key = `${line.id}:${i}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const w = line.words[i], p = w?.p;
      if (typeof p === 'number' ? p >= WEAK_ALIGNMENT : !line.words.some((x) => typeof x.p === 'number')) continue;
      issues.push({
        code: 'align.weak', at: `${scene.id}/${line.id}`, objects: [a.on].flat(),
        message: typeof p === 'number'
          ? `an anchor on "${w.w}" in line "${line.id}" rests on a weak alignment (p = ${p.toFixed(2)}): the reveal can be off by several tenths of a second`
          : `an anchor on "${w?.w}" in line "${line.id}" rests on a word that has no time of its own (no letters)`,
        fix: typeof p === 'number' ? 'anchor on a clearer neighbouring word, or write the word out in `say` the way it is pronounced' : 'spell the number or symbol out in `say`, or anchor on the word next to it',
      });
    }
  });
  if (estimated.length) {
    issues.push({
      code: 'align.estimated', at: 'document', objects: [],
      message: `line${estimated.length > 1 ? 's' : ''} ${estimated.slice(0, 8).map((l) => `"${l}"`).join(', ')}${estimated.length > 8 ? ` and ${estimated.length - 8} more` : ''} ha${estimated.length > 1 ? 've' : 's'} no word times for an anchored phrase, so word anchors in ${estimated.length > 1 ? 'them are' : 'it are'} placed by character position and can be off by half a second`,
      fix: 'run `visotalk prepare` with torch and torchaudio installed (English only); otherwise keep an anchored word near the start of its line',
    });
  }
  return issues;
}
