/** Motions are data and literal component metadata; reading a pack never executes its modules. */
import {localImports} from './bundle.ts';
import {parseLiteral, parseMarkup} from './markup.ts';
import type {VisoDoc} from './spec.ts';
import {playTime, solve, type VoiceManifest} from './timeline.ts';
import {BUILTIN_MOTION_FILES} from './builtin-motions.ts';
export {BUILTIN_MOTION_FILES};

export const MOTION_PURPOSES = ['ground','open','title','data','compare','quote','steps','term','mark','link','transition','close'] as const;

/** The built-in packs (skills/visotalk/motions), by slug */
export const BUILTIN_MOTIONS = Object.keys(BUILTIN_MOTION_FILES);
/** A built-in pack's files under motion/, or undefined for a slug that is not one */
export function builtinMotion(slug: string): Map<string,Uint8Array> | undefined {
  const files = Object.hasOwn(BUILTIN_MOTION_FILES, slug) ? BUILTIN_MOTION_FILES[slug] : undefined;
  if (!files) return undefined;
  const bytes = (data: string) => Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
  return new Map(Object.entries(files).map(([path,data]) => [`motion/${path}`, bytes(data)]));
}
/** What an agent chooses a built-in motion by: one row per motion */
export function builtinMotionList(): {slug: string; version: string; name: Record<string,string>; line: string; scenarios: MotionScenario[]; tags: MotionTag[]; uses: string[]}[] {
  return BUILTIN_MOTIONS.map((slug) => {
    const config = JSON.parse(new TextDecoder().decode(builtinMotion(slug)!.get('motion/motion.json'))) as MotionConfig & {uses?: string[]};
    return {slug, version: config.version, name: config.name ?? {}, line: config.line ?? '', scenarios: config.scenarios ?? [], tags: config.tags ?? [], uses: config.uses ?? []};
  });
}

/** MOTION.md's eleven sections, by their fixed numbers, or a catalogue motion's five headings. Checked by the CLI's `motion` commands, not by a build: guidance an agent adapted in a work still builds */
export const MOTION_SECTIONS = ['Essence, and what it is not','Ground and material','Colour roles','Type and captions','Motion','Composition and framing','Sound','Components','Native moves','Pitfalls','Freedom in each work'] as const;
/** The headings of the public motion format (motionhub.dev): a motion taken from the catalogue may have only these */
const FORMAT_HEADINGS = [['Essence'],['Colour','Color'],['Type'],['Motion'],['Avoid']];
export function motionSectionIssues(markdown: string): MotionIssue[] {
  if (!/^## \d+\. /m.test(markdown) && FORMAT_HEADINGS.every((names)=>names.some((n)=>new RegExp(`^## ${n}\\b`,'m').test(markdown)))) return [];
  const missing = MOTION_SECTIONS.map((name,i)=>[i+1,name] as const).filter(([n])=>!new RegExp(`^## ${n}\\. `,'m').test(markdown));
  return missing.length ? [{code:'motion.sections',at:'motion/MOTION.md',message:`MOTION.md needs its numbered sections; missing ${missing.map(([n,name])=>`## ${n}. ${name}`).join(', ')}`}] : [];
}
export const MOTION_LOCKS = ['theme.tokens.fonts','theme.tokens.colors','voice.voice','voice.speed','voice.lexicon','pacing','exports.captions','canvas'] as const;
/**
 * The kinds of video a motion is made for, one to three per motion: a gallery groups by them and an agent chooses by them first. `talking-head` is graphics
 * over a person's own recording, so a motion made for it draws no ground. Closed, so the groups stay few and translated; the subjects a motion suits are
 * `uses`, in free words.
 */
export const MOTION_SCENARIOS = ['lesson','science','product','talking-head','report','tutorial','story'] as const;
export type MotionScenario = typeof MOTION_SCENARIOS[number];
/** What a motion looks like (medium, depth, era and mood, light or dark), two to six per motion: a gallery filters by them. Closed, so alike motions are found together. */
export const MOTION_TAGS = ['hand-drawn','line-art','watercolor','ink-wash','print','paper-cut','collage','flat-vector','pixel','clay','footage','layered','isometric','3d','retro','modern','futuristic','oriental','minimal','playful','dark','light'] as const;
export type MotionTag = typeof MOTION_TAGS[number];
/** How many of each a motion names, when it names any: a person's own motion may name none */
const MOTION_LABELS = {scenarios: {list: MOTION_SCENARIOS, min: 1, max: 3}, tags: {list: MOTION_TAGS, min: 2, max: 6}} as const;
export interface MotionConfig {
  slug: string; version: string; name?: Record<string,string>; line?: string; scenarios?: MotionScenario[]; tags?: MotionTag[]; locked: string[];
  theme?: {id?: string; tokens?: Record<string,unknown>}; voice?: {voice?: string; speed?: number; lexicon?: Record<string,string>};
  pacing?: unknown; canvas?: {presets: {id: string; width: number; height: number}[]}; exports?: Record<string, unknown>;
}
export interface MotionComponent {file: string; name: Record<string,string>; purpose: string; line: string; fits: string; params: Record<string,{type: string; doc: string; default?: unknown}>; preview: number}
export interface MotionIssue {code: string; at: string; message: string}
export const motionPath = (path: string) => path.startsWith('motion/') && path.length <= 240 && !/[\\\x00-\x1f:]/.test(path) && path.split('/').every((part) => part && !part.startsWith('.') && part !== 'node_modules');
const record = (value: unknown): value is Record<string,unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
export function motionConfig(value: unknown): MotionConfig {
  if (!record(value) || !text(value.slug) || !/^[a-z][a-z0-9-]{0,79}$/.test(value.slug) || !text(value.version) || value.version.length > 100 || !Array.isArray(value.locked) || !value.locked.every((key) => MOTION_LOCKS.includes(key as typeof MOTION_LOCKS[number]))) throw new Error('motion.json needs a plain slug, version and supported locked fields');
  return value as unknown as MotionConfig;
}
export function motionComponents(files: ReadonlyMap<string,Uint8Array>): {components: MotionComponent[]; issues: MotionIssue[]} {
  const components: MotionComponent[] = [], issues: MotionIssue[] = [];
  for (const [file,bytes] of files) {
    if (!/^motion\/parts\/.+\.tsx$/.test(file)) continue;
    const source = new TextDecoder().decode(bytes);
    try {
      const declaration = /^\s*export\s+const\s+meta\s*=\s*/m.exec(source);
      if (!declaration) throw new Error('export a literal meta object');
      const start = declaration.index + declaration[0].length;
      const parsed = parseLiteral(source.slice(start));
      const meta = parsed.value;
      if (!record(meta) || !record(meta.name) || !Object.values(meta.name).every(text) || !Object.keys(meta.name).length || !MOTION_PURPOSES.includes(meta.purpose as typeof MOTION_PURPOSES[number]) || !text(meta.line) || !text(meta.fits) || !record(meta.params) || typeof meta.preview !== 'number' || !Number.isFinite(meta.preview) || meta.preview < 0) throw new Error('meta needs translated name, known purpose, line, fits, params and a nonnegative preview second');
      const code = source.slice(0,declaration.index)+source.slice(start+parsed.end);
      for (const [key,param] of Object.entries(meta.params)) {
        if (!/^[A-Za-z_$][\w$]*$/.test(key) || !record(param) || !text(param.type) || !text(param.doc)) throw new Error(`invalid parameter ${key}`);
        const escaped=key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
        const mentions=code.match(new RegExp(`\\b${escaped}\\b`,'g'))??[];
        if (mentions.length<2 && !new RegExp(`\\.\\s*${escaped}\\b`).test(code)) throw new Error(`parameter ${key} is not read by the component`);
      }
      components.push({file,...meta} as unknown as MotionComponent);
    } catch (error) { issues.push({code:'motion.component',at:file,message:String(error)}); }
  }
  return {components:components.sort((a,b)=>a.file.localeCompare(b.file)),issues};
}
const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical) : record(value) ? Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,canonical(v)])) : value;
const at = (value: unknown,path: string): unknown => path.split('.').reduce<unknown>((v,k)=>record(v)?v[k]:undefined,value);
export function motionConsistency(doc: VisoDoc, config: MotionConfig): MotionIssue[] {
  return config.locked.filter((key)=>at(config,key)===undefined || JSON.stringify(canonical(at(doc,key)))!==JSON.stringify(canonical(at(config,key)))).map((key)=>({code:'motion.locked',at:key,message:'Follow the local motion.json, or adapt that local pack and Doc together.'}));
}
export function inspectMotion(files: ReadonlyMap<string,Uint8Array>, doc?: VisoDoc): {config: MotionConfig; components: MotionComponent[]; issues: MotionIssue[]} {
  const bytes=files.get('motion/motion.json');
  if (!bytes || bytes.length>1_000_000 || !files.has('motion/MOTION.md')) throw new Error('A motion requires motion.json (at most 1 MB) and MOTION.md');
  for (const path of files.keys()) if (!motionPath(path)) throw new Error(`Unsafe motion file: ${path}`);
  const config=motionConfig(JSON.parse(new TextDecoder().decode(bytes)));
  const {components,issues}=motionComponents(files);
  // scenarios or tags off their closed lists are a fault the agent or the person fixes, like a component's; the pack still reads, without that field
  const labels:MotionIssue[]=[];
  for(const [key,{list,min,max}] of Object.entries(MOTION_LABELS) as [keyof typeof MOTION_LABELS,(typeof MOTION_LABELS)[keyof typeof MOTION_LABELS]][]){
    const value:unknown=config[key];
    if(value===undefined)continue;
    const known=(v:unknown)=>(list as readonly unknown[]).includes(v);
    if(Array.isArray(value)&&value.length>=min&&value.length<=max&&value.every(known)&&new Set(value).size===value.length)continue;
    labels.push({code:`motion.${key}`,at:'motion/motion.json',message:`motion.json ${key} must be ${min} to ${max} different values of ${list.join(', ')}`});
    delete config[key];
  }
  return {config,components,issues:[...labels,...issues,...(doc?motionConsistency(doc,config):[])]};
}
/** Apply starting defaults as literals, preserving narration, imports and all other source text. */
export function applyMotion(source: string, config: MotionConfig): string {
  const parsed=parseMarkup(source), root=parsed.spans.get('/')!;
  // a person's recording is the voice, the clock and (a video) the frame: a motion brings its look to it, and nothing of those
  const recorded=parsed.doc.voice?.voice.startsWith('recording:');
  // a motion's export settings join the document's own (a recording's frame rate, variants), never replace them
  const exports=config.exports&&{...(parsed.doc.exports as Record<string,unknown>|undefined),...config.exports};
  const attrs: Record<string,unknown>=recorded?{theme:config.theme?.id,tokens:config.theme?.tokens,exports}:{theme:config.theme?.id,tokens:config.theme?.tokens,voice:config.voice?.voice,speed:config.voice?.speed,lexicon:config.voice?.lexicon,pacing:config.pacing,exports};
  if (config.canvas && !recorded) {
    const standard: Record<string,[number,number]>={'16x9':[1920,1080],'9x16':[1080,1920],'1x1':[1080,1080]};
    if (!config.canvas.presets.every((p)=>standard[p.id]?.[0]===p.width&&standard[p.id]?.[1]===p.height) || root.kids.some((kid)=>'tag' in kid&&kid.tag==='Canvas')) throw new Error('Custom Canvas presets must be adapted explicitly before applying a motion');
    attrs.canvas=config.canvas.presets.map((p)=>p.id).join(',');
  }
  const edits: {start:number;end:number;text:string}[]=[];
  let added='';
  for(const [name,value] of Object.entries(attrs)) {
    if(value===undefined)continue;
    const literal=`${name}={${JSON.stringify(value)}}`;
    const existing=root.attrs.find((a)=>a.name===name);
    if(existing)edits.push({start:existing.start,end:existing.end,text:literal}); else added+=` ${literal}`;
  }
  const insertion=source[root.openEnd-2]==='/'?root.openEnd-2:root.openEnd-1;
  edits.push({start:insertion,end:insertion,text:added});
  let out=source;
  for(const edit of edits.sort((a,b)=>b.start-a.start))out=out.slice(0,edit.start)+edit.text+out.slice(edit.end);
  parseMarkup(out);
  return out;
}

export const componentPreviewPath = (file: string) => file.replace(/^motion\/parts\//,'motion/previews/').replace(/\.tsx$/,'.jpg');

/**
 * When each motion component a work uses is first seen whole, by its file: the end of the last change its part makes in the scene where the part first
 * appears, before the part leaves. A part uses a component when its body names a component imported by the document, or one imported by a module the
 * document imports, at any depth. `read` gives a project file's text by its path from the project root, or undefined.
 */
export function componentMoments(source: string, voice: VoiceManifest, read: (path: string) => string | undefined): Map<string,number> {
  const parsed=parseMarkup(source), exists=(path: string)=>read(path)!==undefined;
  // every motion component a module reaches, walked afresh from each module (a work's modules are few, and a cycle must not leave a half answer behind)
  const motionFiles=(file: string): Set<string> => {
    const out=new Set<string>(), seen=new Set<string>(), queue=[file];
    for(let next=queue.pop();next!==undefined;next=queue.pop()) {
      if(seen.has(next))continue;
      seen.add(next);
      if(/^motion\/parts\/[^/]+\.tsx$/.test(next))out.add(next);
      queue.push(...localImports(next,read(next)??'',exists));
    }
    return out;
  };
  // each name the document's own imports bind, to the file it comes from
  const names=new Map<string,string>();
  for(const m of parsed.prelude.matchAll(/import\s+([^;'"]*?)\s+from\s*['"](\.{1,2}\/[^'"]+)['"]/g)) {
    const [file]=localImports('doc.tsx',`import '${m[2]}'`,exists);
    if(!file)continue;
    const fallback=/^([A-Za-z_$][\w$]*)/.exec(m[1]), named=/\{([^}]*)\}/.exec(m[1]);
    if(fallback)names.set(fallback[1],file);
    for(const n of named?.[1].split(',')??[]){const id=n.trim().split(/\s+as\s+/).pop()!.trim();if(id)names.set(id,file);}
  }
  const c=solve(parsed.doc,voice), out=new Map<string,number>();
  const visit=(part: {id: string; body?: string}, sceneId?: string) => {
    const files=new Set<string>();
    for(const m of (part.body??'').matchAll(/<([A-Z][\w$]*)/g)){const file=names.get(m[1]);if(file)for(const f of motionFiles(file))files.add(f);}
    if(!files.size)return;
    const appear=c.actions.find((a)=>a.target===part.id&&a.kind==='appear'&&(!sceneId||a.scene===sceneId));
    const scene=c.scenes.find((s)=>s.id===(appear?.scene??sceneId))??c.scenes[0];
    if(!scene)return;
    const leave=c.actions.find((a)=>a.target===part.id&&a.scene===scene.id&&a.kind==='disappear'&&a.start>(appear?.start??scene.from));
    const until=Math.min(leave?.start??scene.end,scene.end)-0.1;
    const changes=c.actions.filter((a)=>a.target===part.id&&a.scene===scene.id&&a.kind!=='disappear'&&a.start<until).map((a)=>a.start+playTime(a)+0.2);
    const t=Math.max(0,Math.min(Math.max(appear?appear.start+appear.dur+0.4:scene.from+1.5,...changes),until));
    for(const f of files)if(!out.has(f)||out.get(f)!>t)out.set(f,Math.round(t*100)/100);
  };
  for(const part of parsed.doc.parts??[])visit(part);
  for(const scene of parsed.doc.scenes)for(const part of scene.parts??[])visit(part,scene.id);
  return out;
}

/** Section eight is derived from literal metadata, while the rest remains authored guidance. */
export function motionIndex(markdown:string,components:MotionComponent[]):string {
  const start=/^## 8\.[^\n]*\n/m.exec(markdown);
  if(!start)throw new Error('MOTION.md needs section 8 for the component index');
  const after=start.index+start[0].length;
  const following=/^## 9\./m.exec(markdown.slice(after));
  if(!following)throw new Error('MOTION.md needs section 9 after the component index');
  const lines=[...components].sort((a,b)=>a.purpose.localeCompare(b.purpose)||a.file.localeCompare(b.file)).map((c)=>`- **${c.purpose}** — ${c.name.en??Object.values(c.name)[0]} (\`${c.file.slice(7)}\`): ${c.line} Fits: ${c.fits}`);
  return markdown.slice(0,after)+'\n<!-- Generated by visotalk motion check; edit literal component meta instead. -->\n'+lines.join('\n')+'\n\n'+markdown.slice(after+following.index);
}
