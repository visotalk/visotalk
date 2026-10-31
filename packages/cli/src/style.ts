/** Local style selection and consistency checks; copying never replaces an existing work copy. */
import {existsSync,lstatSync,mkdirSync,readFileSync,readdirSync,renameSync,rmSync,writeFileSync,mkdtempSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {parseMarkup,validate} from '@visotalk/ir';
import {BUILTIN_STYLES,STYLE_SCENARIOS,STYLE_TAGS,applyStyle,builtinStyle,builtinStyleList,inspectStyle as inspectPack,styleIndex,stylePath,styleSectionIssues} from '@visotalk/ir/styles';

export function readStyle(dir: string): Map<string,Uint8Array> {
  const out=new Map<string,Uint8Array>(); let total=0;
  const walk=(base: string)=>{
    for(const entry of readdirSync(join(dir,base),{withFileTypes:true})) {
      const path=base?`${base}/${entry.name}`:entry.name;
      if(entry.name.startsWith('.')||entry.name==='node_modules')continue;
      if(entry.isDirectory())walk(path);
      else {
        if(!entry.isFile()||!stylePath(`style/${path}`))throw new Error(`Unsafe style file or link: ${path}`);
        total+=lstatSync(join(dir,path)).size;
        if(total>10_000_000||out.size>=256)throw new Error('A style is at most 10 MB and 256 files');
        out.set(`style/${path}`,readFileSync(join(dir,path)));
      }
    }
  };
  if(!lstatSync(dir).isDirectory())throw new Error('A style is a directory, never a link');
  walk('');return out;
}
/** The pack's checks and, for the CLI, its STYLE.md sections */
const inspectStyle=(files: Map<string,Uint8Array>, doc?: Parameters<typeof inspectPack>[1])=>{
  const pack=inspectPack(files,doc);
  return {...pack,issues:[...styleSectionIssues(new TextDecoder().decode(files.get('style/STYLE.md'))),...pack.issues]};
};

/** A built-in style by its slug, else a pack directory; a name that is neither says which styles there are */
export function selectedStyle(input: string): Map<string,Uint8Array> {
  const builtin=builtinStyle(input);
  if(builtin)return builtin;
  if(!existsSync(resolve(input)))throw new Error(`"${input}" is neither a built-in style (${BUILTIN_STYLES.join(', ')}) nor a style directory`);
  return readStyle(resolve(input));
}
export async function styleCmd(args: string[]): Promise<void> {
  const [command,input,file]=args;
  if(command==='list') {
    for(const s of builtinStyleList())console.log(`${s.slug}  [${s.scenarios.join(', ')}]  ${s.line}  (looks: ${s.tags.join(', ')}; fits: ${s.uses.join('; ')})`);
    // the closed lists a style's scenarios and tags come from, for an agent writing a style.json of its own
    console.log(`\nScenarios: ${STYLE_SCENARIOS.join(', ')}\nTags: ${STYLE_TAGS.join(', ')}`);
    return;
  }
  if(command==='show'&&input) {
    const files=selectedStyle(input), pack=inspectStyle(files);
    // what an agent chooses and draws by: the configuration, then the components one line each; STYLE.md is read from the copy once chosen
    console.log(JSON.stringify(pack.config,null,1));
    for(const c of pack.components)console.log(`${c.purpose}  ${c.file.slice(6)}  ${c.name.en??Object.values(c.name)[0]}: ${c.line} Fits: ${c.fits} Params: ${Object.entries(c.params).map(([k,v])=>`${k} (${v.type})`).join(', ')||'none'}`);
    // a progress parameter moves only when a document drives it: say how, with this pack's first such component
    const moving=pack.components.find((c)=>Object.values(c.params).some((v)=>v.type==='progress'));
    if(moving){const [name]=Object.entries(moving.params).find(([,v])=>v.type==='progress')!,fn=(/export function (\w+)/.exec(Buffer.from(files.get(moving.file)!).toString('utf8'))??[])[1]??'Component';
     console.log(`Progress parameters move when the document drives them through the part: <Part id="x">{() => <${fn} ${name}={useProp('${name}', 0)} …/>}</Part>, then <Tween target="x" to={{${name}: 1}} …/>; demo/doc.tsx does it for each component.`);}
    console.log(`STYLE.md: ${files.get('style/STYLE.md')!.length} bytes`);
    if(pack.issues.length){for(const i of pack.issues)console.error(`${i.code}: ${i.at}: ${i.message}`);process.exitCode=1;}
    return;
  }
  if(command==='check'&&input) {
    const path=resolve(input), directory=join(dirname(path),'style'), files=readStyle(directory);
    const pack=inspectStyle(files,parseMarkup(readFileSync(path,'utf8')).doc);
    if(!pack.issues.some((i)=>i.code==='style.component')){
      const guide=join(directory,'STYLE.md'),before=readFileSync(guide,'utf8'),after=styleIndex(before,pack.components);
      if(after!==before)writeFileSync(guide,after);
    }
    console.log(JSON.stringify({ok:!pack.issues.length,...pack},null,2));if(pack.issues.length)process.exitCode=1;return;
  }
  if(command==='use'&&input&&file) {
    const path=resolve(file), target=join(dirname(path),'style');
    if(existsSync(target))throw new Error('This work already owns style/. Use explicit synchronization instead of replacing it.');
    const files=selectedStyle(input), pack=inspectStyle(files);
    if(pack.issues.length)throw new Error(pack.issues.map((i)=>`${i.at}: ${i.message}`).join('\n'));
    const source=readFileSync(path,'utf8'), next=applyStyle(source,pack.config);
    const issues=validate(parseMarkup(next).doc);
    if(issues.length)throw new Error(issues.map((i)=>`${i.code}: ${i.message}`).join('\n'));
    const temp=mkdtempSync(join(dirname(path),'.style-'));
    try {
      for(const [name,data] of files) {const dest=join(temp,name.slice(6));mkdirSync(dirname(dest),{recursive:true});writeFileSync(dest,data);}
      if(readFileSync(path,'utf8')!==source)throw new Error('The document changed while the style was being copied');
      const temporary=join(dirname(path),`${temp.split('/').pop()!}.tsx`);
      writeFileSync(temporary,next,{mode:lstatSync(path).mode});
      renameSync(temp,target);
      try {renameSync(temporary,path);} catch(error) {rmSync(target,{recursive:true,force:true});throw error;}
    } finally {rmSync(temp,{recursive:true,force:true});rmSync(`${temp}.tsx`,{force:true});}
    console.log(`Copied ${files.size} style files; check with visotalk style check ${file}`);return;
  }
  throw new Error('style list | show <slug-or-directory> | use <slug-or-directory> doc.tsx | check doc.tsx');
}
