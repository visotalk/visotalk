/** Motion reads stay inert; local defaults preserve the story and copied bytes stay independent. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,mkdtempSync,readFileSync,writeFileSync,mkdirSync,rmSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {parseMarkup,solve} from '../../packages/ir/src/index.ts';
import {applyMotion,BUILTIN_MOTIONS,builtinMotion,builtinMotionList,componentMoments,componentPreviewPath,inspectMotion,motionComponents,motionIndex,motionPath,motionSectionIssues} from '../../packages/ir/src/motions.ts';
import {readMotion,motionCmd} from '../../packages/cli/src/motion.ts';
// @ts-expect-error: the generator is plain JavaScript beside the package, with no declarations
import {readPacks,render,MODULE} from '../../packages/ir/scripts/builtin-motions.mjs';
import {validate} from '../../packages/ir/src/index.ts';
import {sourceClosure} from '../../packages/ir/src/bundle.ts';
const bytes=(files:Record<string,string>)=>new Map(Object.entries(files).map(([path,text])=>[path,Buffer.from(text)]));
const files=()=>new Map(builtinMotion('red-pencil')!);
const source=`import {Doc,Scene,Line} from '@visotalk/jsx';\nexport default <Doc id="story" title="My story" lang="en"><Scene id="s"><Line id="l">Keep my words.</Line></Scene></Doc>;`;
test('motion defaults are literal, preserve narration, and compare against the editable local copy',()=>{
 const pack=inspectMotion(files());assert.equal(pack.issues.length,0);assert.equal(pack.components.length,8);
 const doc=parseMarkup(applyMotion(source,pack.config)).doc;
 assert.equal(doc.meta.id,'story');assert.equal(doc.scenes[0].lines[0].text,'Keep my words.');
 assert.deepEqual(inspectMotion(files(),doc).issues,[]);
 const custom=source.replace('<Scene','<Canvas><Preset id="custom" width={100} height={100}/></Canvas><Scene');
 assert.throws(()=>applyMotion(custom,pack.config),/Custom Canvas/);
 doc.theme!.tokens!.fonts!.sans='Different';assert.equal(inspectMotion(files(),doc).issues[0].code,'motion.locked');
 pack.config.theme!.tokens={...pack.config.theme!.tokens,fonts:doc.theme!.tokens!.fonts};
 const adapted=files();adapted.set('motion/motion.json',Buffer.from(JSON.stringify(pack.config)));assert.deepEqual(inspectMotion(adapted,doc).issues,[]);
});
test('a motion brings only its look to a recording: the recording keeps its voice, frame and clock',()=>{
 const pack=inspectMotion(files());
 const recorded=`import {Doc,Scene,Line,Asset,Canvas,Preset} from '@visotalk/jsx';\nexport default <Doc id="take" title="Take" lang="en" voice="recording:take" exports={{fps:29.97}}><Canvas><Preset id="recording" width={1280} height={720}/></Canvas><Asset id="take" kind="video" src="media/take.mp4" analysis={{duration:4,width:1280,height:720,fps:29.97,frames:120}} license={{id:'user-owned',obligations:[]}}/><Scene id="s"><Line id="l" span={{start:0.5,end:1.5}} words={[{w:'Hello',t0:0,t1:1}]}>Hello</Line></Scene></Doc>;`;
 const doc=parseMarkup(applyMotion(recorded,pack.config)).doc;
 assert.equal(doc.voice?.voice,'recording:take');
 assert.deepEqual(doc.canvas.presets,[{id:'recording',width:1280,height:720}]);
 assert.equal(doc.pacing,undefined);
 assert.equal(doc.exports?.fps,29.97,'the recording keeps its frame rate beside the motion\'s captions');
 assert.equal(doc.exports?.captions,pack.config.exports?.captions);
 assert.deepEqual(doc.theme?.tokens?.colors,pack.config.theme?.tokens?.colors);
});
test('a motion names its scenarios and tags from the closed lists, and every built-in pack names both',()=>{
 for(const slug of BUILTIN_MOTIONS){const {config,issues}=inspectMotion(builtinMotion(slug)!);assert.deepEqual(issues,[],slug);assert.ok(config.scenarios?.length&&config.tags?.length,slug);}
 const config=JSON.parse(Buffer.from(files().get('motion/motion.json')!).toString('utf8'));
 const read=(fields:Record<string,unknown>)=>{const pack=files();pack.set('motion/motion.json',Buffer.from(JSON.stringify({...config,...fields})));return inspectMotion(pack);};
 // a person's own motion may name none; what it names is kept as written
 assert.deepEqual(read({scenarios:undefined,tags:undefined}).issues,[]);
 assert.deepEqual(read({scenarios:['lesson','story'],tags:['ink-wash','oriental']}).config.tags,['ink-wash','oriental']);
 // an unknown value, a repeat or a count outside the range drops that field and says why, and the pack still reads
 for(const [fields,code] of [[{scenarios:['data shorts']},'motion.scenarios'],[{scenarios:[]},'motion.scenarios'],[{scenarios:['lesson','science','product','story']},'motion.scenarios'],[{tags:['dark']},'motion.tags'],[{tags:['dark','dark']},'motion.tags'],[{tags:'dark, light'},'motion.tags']] as const){
  const pack=read(fields);const key=code.slice(7) as 'scenarios'|'tags';
  assert.equal(pack.config[key],undefined,code);assert.deepEqual(pack.issues.map((i)=>i.code),[code]);
 }
 assert.deepEqual(builtinMotionList().map((s)=>[s.scenarios,s.tags]),BUILTIN_MOTIONS.map((slug)=>{const c=inspectMotion(builtinMotion(slug)!).config;return [c.scenarios,c.tags];}));
});
test('component metadata cannot execute and declares actual parameters',()=>{
 const bad=bytes({'motion/parts/x.tsx':'export const meta = (() => {throw new Error("executed")})();'});
 assert.equal(motionComponents(bad).issues.length,1);
 const unused=files();const code=Buffer.from(unused.get('motion/parts/headline.tsx')!).toString();
 unused.set('motion/parts/headline.tsx',Buffer.from(code.replace('params: {','params: { unused: {type: "text", doc: "Never used"},')));
 assert.match(motionComponents(unused).issues[0].message,/not read/);
 for(const path of ['motion/../secret','motion/.env','motion/node_modules/x','motion/a\\b','motion/a:secret'])assert.equal(motionPath(path),false);
});
test('CLI copies the entire pack once, preserves binary extras, and refuses links and implicit overwrites',async()=>{
 const root=mkdtempSync(join(tmpdir(),'motion-cli-'));
 try{
  const original=join(root,'original');mkdirSync(original);
  for(const [path,data] of files()){const dest=join(original,path.slice(7));mkdirSync(join(dest,'..'),{recursive:true});writeFileSync(dest,data);}
  writeFileSync(join(original,'unused.bin'),Buffer.from([0,255,4]));
  const doc=join(root,'doc.tsx');writeFileSync(doc,source);
  await motionCmd(['use',original,doc]);
  assert.deepEqual(readFileSync(join(root,'motion/unused.bin')),Buffer.from([0,255,4]));
  writeFileSync(join(root,'motion/MOTION.md'),'Adapted');assert.notEqual(readFileSync(join(original,'MOTION.md'),'utf8'),'Adapted');
  await assert.rejects(()=>motionCmd(['use','red-pencil',doc]),/already owns/);
  await assert.rejects(()=>motionCmd(['show','no-such-motion']),new RegExp(`neither a built-in motion \\(${BUILTIN_MOTIONS.join(', ')}\\)`));
  symlinkSync(join(original,'MOTION.md'),join(original,'escape'));assert.throws(()=>readMotion(original),/Unsafe/);
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('the component index is deterministic and changes no authored section', ()=>{
 const pack=inspectMotion(files()),guide=Buffer.from(files().get('motion/MOTION.md')!).toString('utf8');
 const indexed=motionIndex(guide,pack.components);
 assert.equal(indexed,guide,'the catalogue ships its section 8 already generated');
 const stale=guide.replace(/(## 8\. Components\n)[\s\S]*?(## 9\.)/,'$1\nnothing\n\n$2');
 const again=motionIndex(stale,pack.components);
 assert.equal(again,guide);
 assert.equal(again.split('## 8.')[0],stale.split('## 8.')[0]);
 assert.equal(again.split('## 9.')[1],stale.split('## 9.')[1]);
});

test('the built-in catalogue is the skill\'s motion directories, byte for byte', ()=>{
 assert.equal(render(readPacks()),readFileSync(MODULE,'utf8'),'run node packages/ir/scripts/builtin-motions.mjs');
 assert.deepEqual(builtinMotionList().map((s)=>s.slug),BUILTIN_MOTIONS);
 assert.equal(builtinMotion('data-editorial'),undefined,'retired');
});

test('every built-in motion is a whole pack: its sections, components with previews, faces the engine holds, and a valid sample that imports only the pack', ()=>{
 for(const slug of BUILTIN_MOTIONS){
  const pack=builtinMotion(slug)!,inspected=inspectMotion(pack);
  assert.deepEqual(inspected.issues,[],slug);
  assert.deepEqual(motionSectionIssues(Buffer.from(pack.get('motion/MOTION.md')!).toString('utf8')),[],`${slug} has its eleven sections`);
  assert.ok(inspected.components.length>=5,`${slug} has its components`);
  // the pictures stay beside the pack for visotalk.dev to serve, and out of the catalogue a work copies
  for(const c of inspected.components)assert.ok(existsSync(join('skills/visotalk/motions',slug,componentPreviewPath(c.file).slice(7))),`${c.file} has its preview`);
  assert.ok(existsSync(join('skills/visotalk/motions',slug,'poster.jpg')),`${slug} has a poster`);
  assert.ok(![...pack.keys()].some((p)=>p==='motion/poster.jpg'||p.startsWith('motion/previews/')),`${slug}'s pictures are not in the catalogue`);
  assert.ok(pack.get('motion/MOTION.md')!.length<8000,`${slug}'s MOTION.md stays short`);
  const sample=Buffer.from(pack.get('motion/demo/doc.tsx')!).toString('utf8'),doc=parseMarkup(sample).doc;
  assert.deepEqual(validate(doc),[],`${slug}'s sample validates`);
  assert.deepEqual(inspectMotion(pack,doc).issues,[],`${slug}'s sample keeps the pack's locked values`);
  // a sample over footage keeps its recording beside the pack (demo/media), not in the catalogue; the public tree leaves the recording out
  const footage=(p:string)=>{
    if(!p.startsWith('motion/demo/media/'))return undefined;
    const file=join('skills/visotalk/motions',slug,p.slice(7));
    return existsSync(file)?readFileSync(file):new Uint8Array();
  };
  for(const path of sourceClosure('motion/demo/doc.tsx',(p)=>pack.get(p)??footage(p)).keys())assert.ok(path.startsWith('motion/'),`${slug}'s sample imports ${path} from its pack`);
 }
});

test('a MOTION.md without its numbered sections is reported by the motion commands, and still builds', async()=>{
 const pack=files();pack.set('motion/MOTION.md',Buffer.from('# Bare\n\n## 8. Components\n\n## 9. Native moves\n'));
 assert.deepEqual(inspectMotion(pack).issues,[],'the build-time check does not read the guidance');
 const issues=motionSectionIssues('# Bare\n\n## 8. Components\n\n## 9. Native moves\n');
 assert.equal(issues[0].code,'motion.sections');
 assert.match(issues[0].message,/## 1\. Essence, and what it is not.*## 11\. Freedom in each work/);
});

test('a work\'s component stills are taken where each component is first seen whole, including through the work\'s own modules', ()=>{
 const pack=files();
 // the sample as a work: the document at the root, the pack under motion/, and the ledger reached through a module of the work's own
 const sample=Buffer.from(pack.get('motion/demo/doc.tsx')!).toString('utf8').replaceAll("'../parts/","'./motion/parts/").replace("import {Ledger} from './motion/parts/ledger.tsx';","import {Ledger} from './parts/sums.tsx';");
 const project=new Map([...[...pack].map(([p,b])=>[p,Buffer.from(b).toString('utf8')] as const),['doc.tsx',sample],['parts/sums.tsx',"export {Ledger} from '../motion/parts/ledger.tsx';"]]);
 const doc=parseMarkup(sample).doc,voice=Object.fromEntries(doc.scenes.flatMap((s)=>s.lines).map((l)=>[l.id,{duration:3,audio:`${l.id}.m4a`}]));
 const at=componentMoments(sample,voice,(p)=>project.get(p)),c=solve(doc,voice);
 assert.deepEqual([...at.keys()].filter((f)=>f.endsWith('.tsx')).sort(),inspectMotion(pack).components.map((c)=>c.file).sort(),'every component the sample uses has a moment');
 assert.equal(at.get('motion/parts/page.tsx'),0.4,'a ground shown from the first frame');
 // the ledger whole: after the last change to its part, and still inside the scene that shows it
 const sum=c.scenes.find((s)=>s.id==='sum')!,last=Math.max(...c.actions.filter((a)=>a.target==='ledger').map((a)=>a.start+a.dur));
 assert.ok(at.get('motion/parts/ledger.tsx')!>=last&&at.get('motion/parts/ledger.tsx')!<sum.end,`ledger at ${at.get('motion/parts/ledger.tsx')}, its last change ends at ${last}, the scene at ${sum.end}`);
});
