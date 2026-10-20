import fs from 'node:fs/promises'
import path from 'node:path'
import {spawn} from 'node:child_process'
import {createHash,randomUUID} from 'node:crypto'
import {fileURLToPath} from 'node:url'
export const archivePattern=/^cloudnest-\d{8}T\d{6}Z-[a-f0-9-]{36}\.dump$/
export function restoreGuard({primary,target,confirm}){if(!/^[a-z][a-z0-9_]{0,62}$/.test(target??'')||target===primary||!primary||confirm!==target)throw new Error('Separate recovery database and matching RESTORE_CONFIRM required');return target}
export function safeArchive(root,name){if(!archivePattern.test(name)||path.basename(name)!==name)throw new Error('Invalid backup filename');return path.join(root,name)}
export function retainedCandidates(files,now,days){if(!Number.isInteger(days)||days<1||days>3650)throw new Error('RETENTION_DAYS must be 1?3650');return files.filter(f=>archivePattern.test(f.name)&&f.regular&&!f.symlink&&now-f.mtime>days*86400000)}
function run(command,args,{env=process.env,output=false}={}){return new Promise((resolve,reject)=>{const child=spawn(command,args,{env,stdio:['ignore',output?'pipe':'ignore','ignore'],windowsHide:true});let text='';if(output)child.stdout.on('data',b=>{text+=b;if(text.length>65536){child.kill();reject(new Error('Command output limit'))}});const timer=setTimeout(()=>{child.kill();reject(new Error('Database tool deadline exceeded'))},600000);child.once('error',()=>{clearTimeout(timer);reject(new Error(command+' unavailable'))});child.once('exit',code=>{clearTimeout(timer);code===0?resolve(text.trim()):reject(new Error(command+' failed; inspect privately with database operator'))})})}
const psql=(sql,env)=>run('psql',['-X','-w','-A','-t','-v','ON_ERROR_STOP=1','-c',sql],{env,output:true})
async function atomic(file,value){const temp=file+'.tmp-'+randomUUID();await fs.writeFile(temp,value,{mode:0o600});await fs.rename(temp,file)}
export async function main(command,env=process.env){
 const root=env.BACKUP_DIR;if(!root||!path.isAbsolute(root))throw new Error('Absolute BACKUP_DIR required')
 await fs.mkdir(root,{recursive:true});const canonical=await fs.realpath(root);if(path.resolve(canonical)!==path.resolve(root))throw new Error('BACKUP_DIR must be its canonical path')
 const statusPath=path.join(root,'status.json')
 if(command==='status'){try{const s=JSON.parse(await fs.readFile(statusPath,'utf8'));console.log(JSON.stringify(s));return s}catch(e){if(e.code==='ENOENT'){console.log(JSON.stringify({status:'unavailable',lastSuccess:null}));return}throw e}}
 for(const name of ['PGHOST','PGPORT','PGDATABASE','PGUSER'])if(!env[name])throw new Error('Missing '+name)
 if(!env.PGPASSFILE&&!env.PGPASSWORD)throw new Error('Missing PGPASSFILE or private PGPASSWORD')
 if(command==='backup'){
  const lock=path.join(root,'.backup.lock');let handle;try{handle=await fs.open(lock,'wx',0o600)}catch{throw new Error('Backup lock exists; inspect before manual recovery')}
  try{
   const identity=await psql('SELECT current_database()',env);if(identity!==env.PGDATABASE)throw new Error('Primary identity mismatch')
   const filename='cloudnest-'+new Date().toISOString().replace(/[-:]/g,'').slice(0,15)+'Z-'+randomUUID()+'.dump';const file=safeArchive(canonical,filename);const partial=file+'.partial'
   await run('pg_dump',['--no-password','--format=custom','--no-owner','--no-acl','--file',partial],{env})
   await run('pg_restore',['--list',partial],{env});await fs.rename(partial,file)
   const hash=createHash('sha256');for await(const chunk of (await import('node:fs')).createReadStream(file))hash.update(chunk)
   const now=new Date().toISOString();await atomic(file+'.sha256',hash.digest('hex')+'\n')
   const old=JSON.parse(await fs.readFile(statusPath,'utf8').catch(()=>'{}'));await atomic(statusPath,JSON.stringify({...old,status:'success',lastSuccess:now,filename}))
   await atomic(path.join(root,'backup.prom'),'cloudnest_backup_last_outcome 1\ncloudnest_backup_last_success_timestamp_seconds '+Date.now()/1000+'\n')
   const entries=[];for(const name of await fs.readdir(root)){const s=await fs.lstat(path.join(root,name));entries.push({name,regular:s.isFile(),symlink:s.isSymbolicLink(),mtime:s.mtimeMs})}
   for(const f of retainedCandidates(entries,Date.now(),Number(env.RETENTION_DAYS??7))){if(f.name===filename)continue;await fs.unlink(safeArchive(canonical,f.name));const side=safeArchive(canonical,f.name)+'.sha256';const stat=await fs.lstat(side).catch(()=>null);if(stat?.isFile()&&!stat.isSymbolicLink())await fs.unlink(side)}
   console.log(JSON.stringify({status:'success',filename}))
  }catch(e){const previous=JSON.parse(await fs.readFile(statusPath,'utf8').catch(()=>'{}'));await atomic(statusPath,JSON.stringify({...previous,status:'failed',lastAttempt:new Date().toISOString()}));const last=previous.lastSuccess?'cloudnest_backup_last_success_timestamp_seconds '+Date.parse(previous.lastSuccess)/1000+'\n':'';await atomic(path.join(root,'backup.prom'),'cloudnest_backup_last_outcome 0\n'+last);throw e}finally{await handle.close();await fs.unlink(lock)}
  return
 }
 if(!['restore','verify'].includes(command))throw new Error('Expected backup/status/restore/verify')
 const target=restoreGuard({primary:env.PGDATABASE,target:env.RECOVERY_DB_NAME,confirm:env.RESTORE_CONFIRM});const recovery={...env,PGDATABASE:target}
 if(await psql('SELECT current_database()',recovery)!==target)throw new Error('Recovery target identity mismatch')
 if(command==='restore'){
  const file=safeArchive(canonical,env.BACKUP_FILE??'');const stat=await fs.lstat(file);if(!stat.isFile()||stat.isSymbolicLink())throw new Error('Archive must be a regular file')
  const count=await psql("SELECT count(*) FROM pg_catalog.pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema')",recovery);if(count!=='0')throw new Error('Recovery database must be empty; no clean/drop is performed')
  const expected=(await fs.readFile(file+'.sha256','utf8')).trim();const hash=createHash('sha256');for await(const chunk of (await import('node:fs')).createReadStream(file))hash.update(chunk);if(hash.digest('hex')!==expected)throw new Error('Archive checksum mismatch')
  await run('pg_restore',['--no-password','--exit-on-error','--single-transaction','--no-owner','--no-acl','--dbname',target,file],{env:recovery})
 }
 const checks=await psql("SELECT current_database(); SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname='public' ORDER BY tablename; SELECT count(*) FROM public.workspaces; SELECT count(*) FROM public.tasks",recovery)
 console.log(checks);console.log('Recovery database queried. File restore and application consistency remain unverified.')
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main(process.argv[2]).catch(e=>{console.error(e.message);process.exitCode=1})
