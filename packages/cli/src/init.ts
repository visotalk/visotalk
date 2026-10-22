/**
 * `visotalk init`: a document that is valid and already has its narration, with nothing drawn yet, so the first picture (the captions on a
 * dark frame) exists in a minute and every scene is drawn and looked at in turn instead of the whole document being written blind.
 */
export interface ScriptLine {
  id?: string;
  /** the caption */
  text: string;
  /** the spoken form, when it differs from the caption */
  say?: string;
  /** what the line should show: kept as a comment above its beat */
  intent?: string;
}
export interface Script {
  title?: string;
  lang?: string;
  /** `minimax:<voice>`: a language written without spaces (zh, ja, ko) is spoken by a provider's voice, not Kokoro */
  voice?: string;
  /** `9x16` for a vertical film: the skeleton gets that canvas and the word captions a phone is read by */
  canvas?: string;
  lines: ScriptLine[];
}

const ID = /^[a-z][a-z0-9_-]*$/;
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** The skeleton for a script: every line in one `draft` scene, no parts. Throws on a line the markup cannot hold. */
export function skeleton(script: Script, id?: string): string {
  if (!script.lines?.length) throw new Error('the script has no lines: {"title": "…", "lines": [{"text": "…"}]}');
  const title = script.title?.trim() || 'Untitled';
  const docId = id ?? (slug(title) || 'video');
  if (!ID.test(docId)) throw new Error(`the document id "${docId}" must start with a lowercase letter, then a-z, 0-9, _ or -`);
  const seen = new Set<string>();
  const lines = script.lines.map((l, i) => {
    const lineId = l.id ?? `l${i + 1}`;
    if (!ID.test(lineId)) throw new Error(`line ${i + 1}: the id "${lineId}" must start with a lowercase letter, then a-z, 0-9, _ or -`);
    if (seen.has(lineId)) throw new Error(`line ${i + 1}: the id "${lineId}" is used twice`);
    seen.add(lineId);
    const say = (l.say ?? l.text).trim();
    if (!say) throw new Error(`line ${i + 1} ("${lineId}") is empty`);
    if (/[{}<>]/.test(say)) throw new Error(`line ${i + 1} ("${lineId}"): the spoken text may not hold { } < >; spell it out, or move the mark into a part`);
    const caption = l.say !== undefined && l.text.trim() !== say ? ` text={${JSON.stringify(l.text.trim())}}` : '';
    const intent = l.intent?.trim() ? `    {/* intent: ${l.intent.trim().replace(/\*\//g, '* /')} */}\n` : '';
    return `${intent}    <Line id="${lineId}"${caption}>${say}</Line>`;
  });
  return [
    `import {Doc, Scene, Line, Part, Animation, Appear, Tween} from '@visotalk/jsx';`,
    `import {useTarget, useProp, useTime} from '@visotalk/runtime';`,
    ``,
    `export default <Doc id=${JSON.stringify(docId)} title={${JSON.stringify(title)}} lang={${JSON.stringify(script.lang ?? 'en')}}${script.voice ? ` voice={${JSON.stringify(script.voice)}}` : ''} theme="visotalk/dark" canvas=${JSON.stringify(script.canvas ?? '16x9')}${script.canvas === '9x16' ? ` exports={{captions: 'words', fps: 30}}` : ''}>`,
    `  {/* A skeleton: the narration, nothing drawn. Split "draft" into the scenes you design, then draw them. */}`,
    `  <Scene id="draft">`,
    ...lines,
    `  </Scene>`,
    `</Doc>;`,
    ``,
  ].join('\n');
}
