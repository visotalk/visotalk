/** Style reads stay inert; local defaults preserve the story and copied bytes stay independent. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,mkdtempSync,readFileSync,writeFileSync,mkdirSync,rmSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {parseMarkup,solve} from '../../packages/ir/src/index.ts';
import {applyStyle,BUILTIN_STYLES,builtinStyle,builtinStyleList,componentMoments,componentPreviewPath,inspectStyle,styleComponents,styleIndex,stylePath,styleSectionIssues} from '../../packages/ir/src/styles.ts';
import {readStyle,styleCmd} from '../../packages/cli/src/style.ts';
// @ts-expect-error: the generator is plain JavaScript beside the package, with no declarations
import {readPacks,render,MODULE} from '../../packages/ir/scripts/builtin-styles.mjs';
import {validate} from '../../packages/ir/src/index.ts';
import {sourceClosure} from '../../packages/ir/src/bundle.ts';
const bytes=(files:Record<string,string>)=>new Map(Object.entries(files).map(([path,text])=>[path,Buffer.from(text)]));
const files=()=>new Map(builtinStyle('red-pencil')!);
const source=`import {Doc,Scene,Line} from '@visotalk/jsx';\nexport default <Doc id="story" title="My story" lang="en"><Scene id="s"><Line id="l">Keep my words.</Line></Scene></Doc>;`;
test('style defaults are literal, preserve narration, and compare against the editable local copy',()=>{
 const pack=inspectStyle(files());assert.equal(pack.issues.length,0);assert.equal(pack.components.length,8);
 const doc=parseMarkup(applyStyle(source,pack.config)).doc;
 assert.equal(doc.meta.id,'story');assert.equal(doc.scenes[0].lines[0].text,'Keep my words.');
 assert.deepEqual(inspectStyle(files(),doc).issues,[]);
 const custom=source.replace('<Scene','<Canvas><Preset id="custom" width={100} height={100}/></Canvas><Scene');
 assert.throws(()=>applyStyle(custom,pack.config),/Custom Canvas/);
 doc.theme!.tokens!.fonts!.sans='Different';assert.equal(inspectStyle(files(),doc).issues[0].code,'style.locked');
 pack.config.theme!.tokens={...pack.config.theme!.tokens,fonts:doc.theme!.tokens!.fonts};
 const adapted=files();adapted.set('style/style.json',Buffer.from(JSON.stringify(pack.config)));assert.deepEqual(inspectStyle(adapted,doc).issues,[]);
});
test('a style brings only its look to a recording: the recording keeps its voice, frame and clock',()=>{
 const pack=inspectStyle(files());
 const recorded=`import {Doc,Scene,Line,Asset,Canvas,Preset} from '@visotalk/jsx';\nexport default <Doc id="take" title="Take" lang="en" voice="recording:take" exports={{fps:29.97}}><Canvas><Preset id="recording" width={1280} height={720}/></Canvas><Asset id="take" kind="video" src="media/take.mp4" analysis={{duration:4,width:1280,height:720,fps:29.97,frames:120}} license={{id:'user-owned',obligations:[]}}/><Scene id="s"><Line id="l" span={{start:0.5,end:1.5}} words={[{w:'Hello',t0:0,t1:1}]}>Hello</Line></Scene></Doc>;`;
 const doc=parseMarkup(applyStyle(recorded,pack.config)).doc;
 assert.equal(doc.voice?.voice,'recording:take');
 assert.deepEqual(doc.canvas.presets,[{id:'recording',width:1280,height:720}]);
 assert.equal(doc.pacing,undefined);
 assert.equal(doc.exports?.fps,29.97,'the recording keeps its frame rate beside the style\'s captions');
 assert.equal(doc.exports?.captions,pack.config.exports?.captions);
 assert.deepEqual(doc.theme?.tokens?.colors,pack.config.theme?.tokens?.colors);
});
test('a style names its scenarios and tags from the closed lists, and every built-in pack names both',()=>{
 for(const slug of BUILTIN_STYLES){const {config,issues}=inspectStyle(builtinStyle(slug)!);assert.deepEqual(issues,[],slug);assert.ok(config.scenarios?.length&&config.tags?.length,slug);}
 const config=JSON.parse(Buffer.from(files().get('style/style.json')!).toString('utf8'));
 const read=(fields:Record<string,unknown>)=>{const pack=files();pack.set('style/style.json',Buffer.from(JSON.stringify({...config,...fields})));return inspectStyle(pack);};
 // a person's own style may name none; what it names is kept as written
 assert.deepEqual(read({scenarios:undefined,tags:undefined}).issues,[]);
 assert.deepEqual(read({scenarios:['lesson','story'],tags:['ink-wash','oriental']}).config.tags,['ink-wash','oriental']);
 // an unknown value, a repeat or a count outside the range drops that field and says why, and the pack still reads
 for(const [fields,code] of [[{scenarios:['data shorts']},'style.scenarios'],[{scenarios:[]},'style.scenarios'],[{scenarios:['lesson','science','product','story']},'style.scenarios'],[{tags:['dark']},'style.tags'],[{tags:['dark','dark']},'style.tags'],[{tags:'dark, light'},'style.tags']] as const){
  const pack=read(fields);const key=code.slice(6) as 'scenarios'|'tags';
  assert.equal(pack.config[key],undefined,code);assert.deepEqual(pack.issues.map((i)=>i.code),[code]);
 }
 assert.deepEqual(builtinStyleList().map((s)=>[s.scenarios,s.tags]),BUILTIN_STYLES.map((slug)=>{const c=inspectStyle(builtinStyle(slug)!).config;return [c.scenarios,c.tags];}));
});
test('component metadata cannot execute and declares actual parameters',()=>{
 const bad=bytes({'style/parts/x.tsx':'export const meta = (() => {throw new Error("executed")})();'});
 assert.equal(styleComponents(bad).issues.length,1);
 const unused=files();const code=Buffer.from(unused.get('style/parts/headline.tsx')!).toString();
 unused.set('style/parts/headline.tsx',Buffer.from(code.replace('params: {','params: { unused: {type: "text", doc: "Never used"},')));
 assert.match(styleComponents(unused).issues[0].message,/not read/);
 for(const path of ['style/../secret','style/.env','style/node_modules/x','style/a\\b','style/a:secret'])assert.equal(stylePath(path),false);
});
test('CLI copies the entire pack once, preserves binary extras, and refuses links and implicit overwrites',async()=>{
 const root=mkdtempSync(join(tmpdir(),'style-cli-'));
 try{
  const original=join(root,'original');mkdirSync(original);
  for(const [path,data] of files()){const dest=join(original,path.slice(6));mkdirSync(join(dest,'..'),{recursive:true});writeFileSync(dest,data);}
  writeFileSync(join(original,'unused.bin'),Buffer.from([0,255,4]));
  const doc=join(root,'doc.tsx');writeFileSync(doc,source);
  await styleCmd(['use',original,doc]);
  assert.deepEqual(readFileSync(join(root,'style/unused.bin')),Buffer.from([0,255,4]));
  writeFileSync(join(root,'style/STYLE.md'),'Adapted');assert.notEqual(readFileSync(join(original,'STYLE.md'),'utf8'),'Adapted');
  await assert.rejects(()=>styleCmd(['use','red-pencil',doc]),/already owns/);
  await assert.rejects(()=>styleCmd(['show','no-such-style']),new RegExp(`neither a built-in style \\(${BUILTIN_STYLES.join(', ')}\\)`));
  symlinkSync(join(original,'STYLE.md'),join(original,'escape'));assert.throws(()=>readStyle(original),/Unsafe/);
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('the component index is deterministic and changes no authored section', ()=>{
 const pack=inspectStyle(files()),guide=Buffer.from(files().get('style/STYLE.md')!).toString('utf8');
 const indexed=styleIndex(guide,pack.components);
 assert.equal(indexed,guide,'the catalogue ships its section 8 already generated');
 const stale=guide.replace(/(## 8\. Components\n)[\s\S]*?(## 9\.)/,'$1\nnothing\n\n$2');
 const again=styleIndex(stale,pack.components);
 assert.equal(again,guide);
 assert.equal(again.split('## 8.')[0],stale.split('## 8.')[0]);
 assert.equal(again.split('## 9.')[1],stale.split('## 9.')[1]);
});

test('the built-in catalogue is the skill\'s style directories, byte for byte', ()=>{
 assert.equal(render(readPacks()),readFileSync(MODULE,'utf8'),'run node packages/ir/scripts/builtin-styles.mjs');
 assert.deepEqual(builtinStyleList().map((s)=>s.slug),BUILTIN_STYLES);
 assert.equal(builtinStyle('data-editorial'),undefined,'retired');
});

test('every built-in style is a whole pack: its sections, components with previews, faces the engine holds, and a valid sample that imports only the pack', ()=>{
 for(const slug of BUILTIN_STYLES){
  const pack=builtinStyle(slug)!,inspected=inspectStyle(pack);
  assert.deepEqual(inspected.issues,[],slug);
  assert.deepEqual(styleSectionIssues(Buffer.from(pack.get('style/STYLE.md')!).toString('utf8')),[],`${slug} has its eleven sections`);
  assert.ok(inspected.components.length>=5,`${slug} has its components`);
  // the pictures stay beside the pack for visotalk.dev to serve, and out of the catalogue a work copies
  for(const c of inspected.components)assert.ok(existsSync(join('skills/visotalk/styles',slug,componentPreviewPath(c.file).slice(6))),`${c.file} has its preview`);
  assert.ok(existsSync(join('skills/visotalk/styles',slug,'poster.jpg')),`${slug} has a poster`);
  assert.ok(![...pack.keys()].some((p)=>p==='style/poster.jpg'||p.startsWith('style/previews/')),`${slug}'s pictures are not in the catalogue`);
  assert.ok(pack.get('style/STYLE.md')!.length<8000,`${slug}'s STYLE.md stays short`);
  const sample=Buffer.from(pack.get('style/demo/doc.tsx')!).toString('utf8'),doc=parseMarkup(sample).doc;
  assert.deepEqual(validate(doc),[],`${slug}'s sample validates`);
  assert.deepEqual(inspectStyle(pack,doc).issues,[],`${slug}'s sample keeps the pack's locked values`);
  // a sample over footage keeps its recording beside the pack in the repository (demo/media), not in the catalogue
  const footage=(p:string)=>p.startsWith('style/demo/media/')?readFileSync(join('skills/visotalk/styles',slug,p.slice(6))):undefined;
  for(const path of sourceClosure('style/demo/doc.tsx',(p)=>pack.get(p)??footage(p)).keys())assert.ok(path.startsWith('style/'),`${slug}'s sample imports ${path} from its pack`);
 }
});

test('a STYLE.md without its numbered sections is reported by the style commands, and still builds', async()=>{
 const pack=files();pack.set('style/STYLE.md',Buffer.from('# Bare\n\n## 8. Components\n\n## 9. Native moves\n'));
 assert.deepEqual(inspectStyle(pack).issues,[],'the build-time check does not read the guidance');
 const issues=styleSectionIssues('# Bare\n\n## 8. Components\n\n## 9. Native moves\n');
 assert.equal(issues[0].code,'style.sections');
 assert.match(issues[0].message,/## 1\. Essence, and what it is not.*## 11\. Freedom in each work/);
});

test('a work\'s component stills are taken where each component is first seen whole, including through the work\'s own modules', ()=>{
 const pack=files();
 // the sample as a work: the document at the root, the pack under style/, and the ledger reached through a module of the work's own
 const sample=Buffer.from(pack.get('style/demo/doc.tsx')!).toString('utf8').replaceAll("'../parts/","'./style/parts/").replace("import {Ledger} from './style/parts/ledger.tsx';","import {Ledger} from './parts/sums.tsx';");
 const project=new Map([...[...pack].map(([p,b])=>[p,Buffer.from(b).toString('utf8')] as const),['doc.tsx',sample],['parts/sums.tsx',"export {Ledger} from '../style/parts/ledger.tsx';"]]);
 const doc=parseMarkup(sample).doc,voice=Object.fromEntries(doc.scenes.flatMap((s)=>s.lines).map((l)=>[l.id,{duration:3,audio:`${l.id}.m4a`}]));
 const at=componentMoments(sample,voice,(p)=>project.get(p)),c=solve(doc,voice);
 assert.deepEqual([...at.keys()].filter((f)=>f.endsWith('.tsx')).sort(),inspectStyle(pack).components.map((c)=>c.file).sort(),'every component the sample uses has a moment');
 assert.equal(at.get('style/parts/page.tsx'),0.4,'a ground shown from the first frame');
 // the ledger whole: after the last change to its part, and still inside the scene that shows it
 const sum=c.scenes.find((s)=>s.id==='sum')!,last=Math.max(...c.actions.filter((a)=>a.target==='ledger').map((a)=>a.start+a.dur));
 assert.ok(at.get('style/parts/ledger.tsx')!>=last&&at.get('style/parts/ledger.tsx')!<sum.end,`ledger at ${at.get('style/parts/ledger.tsx')}, its last change ends at ${last}, the scene at ${sum.end}`);
});
