import {createServer} from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'
import {timingSafeEqual} from 'node:crypto'
if(!process.env.BACKUP_DIR||!path.isAbsolute(process.env.BACKUP_DIR)||!process.env.BACKUP_METRICS_TOKEN_FILE)throw Error('BACKUP_DIR and BACKUP_METRICS_TOKEN_FILE required')
const root=await fs.realpath(process.env.BACKUP_DIR);const token=(await fs.readFile(process.env.BACKUP_METRICS_TOKEN_FILE,'utf8')).trim();if(!/^[A-Za-z0-9_-]{32,256}$/.test(token))throw Error('Invalid metrics token')
const expected=Buffer.from('Bearer '+token)
const server=createServer(async(req,res)=>{if(req.method!=='GET'||req.url!=='/metrics'){res.writeHead(404);res.end();return}const got=Buffer.from(req.headers.authorization??'');if(got.length!==expected.length||!timingSafeEqual(got,expected)){res.writeHead(401);res.end();return}try{const file=path.join(root,'backup.prom');const stat=await fs.lstat(file);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>4096)throw Error();const body=await fs.readFile(file,'utf8');if(!body.trim().split('\n').every(line=>/^cloudnest_backup_(last_outcome|last_success_timestamp_seconds) (?:0|1|\d+(?:\.\d+)?)$/.test(line)))throw Error();res.writeHead(200,{'Content-Type':'text/plain; version=0.0.4'});res.end(body)}catch{res.writeHead(503);res.end('Backup metrics unavailable')}})
server.listen(9468,'127.0.0.1');for(const s of ['SIGTERM','SIGINT'])process.once(s,()=>server.close())
