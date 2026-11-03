/** Motion selection (built-in, a directory, or the public catalogue) and consistency checks; copying never replaces an existing work copy. */
import {existsSync,lstatSync,mkdirSync,readFileSync,readdirSync,renameSync,rmSync,writeFileSync,mkdtempSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {parseMarkup,validate} from '@visotalk/ir';
import {HUB_ID,MOTIONHUB,hubIndex,hubMotion,searchHub,shareMotion} from './motionhub.ts';
import {BUILTIN_MOTIONS,MOTION_SCENARIOS,MOTION_TAGS,applyMotion,builtinMotion,builtinMotionList,inspectMotion as inspectPack,motionIndex,motionPath,motionSectionIssues} from '@visotalk/ir/motions';

export function readMotion(dir: string): Map<string,Uint8Array> {
  const out=new Map<string,Uint8Array>(); let total=0;
  const walk=(base: string)=>{
    for(const entry of readdirSync(join(dir,base),{withFileTypes:true})) {
      const path=base?`${base}/${entry.name}`:entry.name;
      if(entry.name.startsWith('.')||entry.name==='node_modules')continue;
      if(entry.isDirectory())walk(path);
      else {
        if(!entry.isFile()||!motionPath(`motion/${path}`))throw new Error(`Unsafe motion file or link: ${path}`);
        total+=lstatSync(join(dir,path)).size;
        if(total>10_000_000||out.size>=256)throw new Error('A motion is at most 10 MB and 256 files');
        out.set(`motion/${path}`,readFileSync(join(dir,path)));
      }
    }
  };
  if(!lstatSync(dir).isDirectory())throw new Error('A motion is a directory, never a link');
  walk('');return out;
}
/** The pack's checks and, for the CLI, its MOTION.md sections */
const inspectMotion=(files: Map<string,Uint8Array>, doc?: Parameters<typeof inspectPack>[1])=>{
  const pack=inspectPack(files,doc);
  return {...pack,issues:[...motionSectionIssues(new TextDecoder().decode(files.get('motion/MOTION.md'))),...pack.issues]};
};

/** A built-in motion by its slug, else a pack directory, else a motion of the public catalogue by its id (@creator/slug); a name that is none says where to look */
export async function selectedMotion(input: string): Promise<Map<string,Uint8Array>> {
  const builtin=builtinMotion(input);
  if(builtin)return builtin;
  if(existsSync(resolve(input)))return readMotion(resolve(input));
  const hub=HUB_ID.test(input)?await hubMotion(input):undefined;
  if(hub)return hub;
  throw new Error(`"${input}" is neither a built-in motion (${BUILTIN_MOTIONS.join(', ')}), a motion directory, nor a motion on ${MOTIONHUB}, which is named @<creator>/<slug> (visotalk motion search <words>)`);
}
export async function motionCmd(args: string[]): Promise<void> {
  const [command,input,file]=args;
  if(command==='list') {
    for(const s of builtinMotionList())console.log(`${s.slug}  [${s.scenarios.join(', ')}]  ${s.line}  (looks: ${s.tags.join(', ')}; fits: ${s.uses.join('; ')})`);
    // the closed lists a motion's scenarios and tags come from, for an agent writing a motion.json of its own
    console.log(`\nScenarios: ${MOTION_SCENARIOS.join(', ')}\nTags: ${MOTION_TAGS.join(', ')}`);
    console.log(`More motions, made by others: visotalk motion search <words> (${MOTIONHUB})`);
    return;
  }
  if(command==='search') {
    const rows=searchHub(await hubIndex(),args.slice(1));
    // one line per motion, like list; one without components brings its theme and guidance only
    for(const m of rows)console.log(`${m.slug}  ${m.version}  ${m.line.en??Object.values(m.line)[0]}  (looks: ${m.tags.join(', ')}; by ${m.authors.map((a)=>a.github).join(', ')}; ${m.license.text}${m.tools.includes('react')?'':'; theme and guidance, no components'})`);
    console.log(rows.length?`${rows.length} on ${MOTIONHUB}; use one with visotalk motion use <@creator/slug> doc.tsx, only when the person chose it`:`No motion on ${MOTIONHUB} has every one of those words`);
    return;
  }
  if(command==='show'&&input) {
    const files=await selectedMotion(input), pack=inspectMotion(files);
    // what an agent chooses and draws by: the configuration, then the components one line each; MOTION.md is read from the copy once chosen
    console.log(JSON.stringify(pack.config,null,1));
    for(const c of pack.components)console.log(`${c.purpose}  ${c.file.slice(7)}  ${c.name.en??Object.values(c.name)[0]}: ${c.line} Fits: ${c.fits} Params: ${Object.entries(c.params).map(([k,v])=>`${k} (${v.type})`).join(', ')||'none'}`);
    // a progress parameter moves only when a document drives it: say how, with this pack's first such component
    const moving=pack.components.find((c)=>Object.values(c.params).some((v)=>v.type==='progress'));
    if(moving){const [name]=Object.entries(moving.params).find(([,v])=>v.type==='progress')!,fn=(/export function (\w+)/.exec(Buffer.from(files.get(moving.file)!).toString('utf8'))??[])[1]??'Component';
     console.log(`Progress parameters move when the document drives them through the part: <Part id="x">{() => <${fn} ${name}={useProp('${name}', 0)} …/>}</Part>, then <Tween target="x" to={{${name}: 1}} …/>${files.has('motion/demo/doc.tsx')?'; demo/doc.tsx does it for each component':''}.`);}
    console.log(`MOTION.md: ${files.get('motion/MOTION.md')!.length} bytes`);
    if(pack.issues.length){for(const i of pack.issues)console.error(`${i.code}: ${i.at}: ${i.message}`);process.exitCode=1;}
    return;
  }
  if(command==='check'&&input) {
    const path=resolve(input), directory=join(dirname(path),'motion'), files=readMotion(directory);
    const pack=inspectMotion(files,parseMarkup(readFileSync(path,'utf8')).doc);
    // a catalogue motion's MOTION.md may have the format's five headings and no section 8 to index the components in
    if(!pack.issues.some((i)=>i.code==='motion.component')&&/^## 8\./m.test(readFileSync(join(directory,'MOTION.md'),'utf8'))){
      const guide=join(directory,'MOTION.md'),before=readFileSync(guide,'utf8'),after=motionIndex(before,pack.components);
      if(after!==before)writeFileSync(guide,after);
    }
    console.log(JSON.stringify({ok:!pack.issues.length,...pack},null,2));if(pack.issues.length)process.exitCode=1;return;
  }
  if(command==='share'&&input) {
    // a work's document names its motion/ beside it; the pack must pass VisoTalk's own checks before the catalogue's
    const dir=/\.tsx$/.test(input)?join(dirname(resolve(input)),'motion'):resolve(input), files=readMotion(dir), pack=inspectMotion(files);
    if(pack.issues.length)throw new Error(pack.issues.map((i)=>`${i.code}: ${i.at}: ${i.message}`).join('\n'));
    const flag=(name: string)=>{const i=args.indexOf(`--${name}`);return i>=0?args[i+1]:undefined;};
    console.log(await shareMotion(files,{slug:flag('slug'),github:flag('github'),license:flag('license'),out:flag('out'),pr:args.includes('--pr')}));return;
  }
  if(command==='use'&&input&&file) {
    const path=resolve(file), target=join(dirname(path),'motion');
    if(existsSync(target))throw new Error('This work already owns motion/. Use explicit synchronization instead of replacing it.');
    const files=await selectedMotion(input), pack=inspectMotion(files);
    if(pack.issues.length)throw new Error(pack.issues.map((i)=>`${i.at}: ${i.message}`).join('\n'));
    const source=readFileSync(path,'utf8'), next=applyMotion(source,pack.config);
    const issues=validate(parseMarkup(next).doc);
    if(issues.length)throw new Error(issues.map((i)=>`${i.code}: ${i.message}`).join('\n'));
    const temp=mkdtempSync(join(dirname(path),'.motion-'));
    try {
      for(const [name,data] of files) {const dest=join(temp,name.slice(7));mkdirSync(dirname(dest),{recursive:true});writeFileSync(dest,data);}
      if(readFileSync(path,'utf8')!==source)throw new Error('The document changed while the motion was being copied');
      const temporary=join(dirname(path),`${temp.split('/').pop()!}.tsx`);
      writeFileSync(temporary,next,{mode:lstatSync(path).mode});
      renameSync(temp,target);
      try {renameSync(temporary,path);} catch(error) {rmSync(target,{recursive:true,force:true});throw error;}
    } finally {rmSync(temp,{recursive:true,force:true});rmSync(`${temp}.tsx`,{force:true});}
    console.log(`Copied ${files.size} motion files; check with visotalk motion check ${file}`);return;
  }
  throw new Error('motion list | search [words] | show <slug-or-directory> | use <slug-or-directory> doc.tsx | check doc.tsx | share <motion-dir-or-doc.tsx> [--slug s] [--github login] [--license TEXT,CODE] [--out dir] [--pr]');
}
