import fs from 'node:fs'
import { setTimeout as sleep } from 'node:timers/promises'
import IORedis from 'ioredis'
import { Queue,Worker,UnrecoverableError } from 'bullmq'
import { createImportClient } from './client.js'
import { processImport } from './ingestion.js'
import { pollMailbox } from './imap.js'
import { createWorkerMetrics } from './metrics.js'
const required=['QUEUE_REDIS_URL','TASK_IMPORT_BASE_URL','TASK_IMPORT_TOKEN_FILE','MAILBOX_CONNECTION_ID','IMAP_HOST','IMAP_USER']
for(const name of required)if(!process.env[name])throw new Error('Missing '+name)
if(!process.env.IMAP_PASSWORD_FILE&&!process.env.IMAP_ACCESS_TOKEN_FILE)throw new Error('Missing IMAP_PASSWORD_FILE or IMAP_ACCESS_TOKEN_FILE')
const read=p=>fs.readFileSync(p,'utf8').trim()
const backend=createImportClient({baseUrl:process.env.TASK_IMPORT_BASE_URL,token:read(process.env.TASK_IMPORT_TOKEN_FILE)})
const config={connectionId:process.env.MAILBOX_CONNECTION_ID,host:process.env.IMAP_HOST,user:process.env.IMAP_USER,password:process.env.IMAP_PASSWORD_FILE?read(process.env.IMAP_PASSWORD_FILE):undefined,accessToken:process.env.IMAP_ACCESS_TOKEN_FILE?read(process.env.IMAP_ACCESS_TOKEN_FILE):undefined}
const redis=new IORedis(process.env.QUEUE_REDIS_URL,{maxRetriesPerRequest:1,enableOfflineQueue:false,lazyConnect:true})
redis.on('error',()=>console.error('Queue connection unavailable'))
await redis.connect()
// Queue checkpoints require AOF acknowledgement before success, not an evictable cache.
const values=Object.fromEntries((await redis.config('GET','appendonly','appendfsync','maxmemory-policy')).reduce((a,v,i,all)=>{if(i%2===0)a.push([v,all[i+1]]);return a},[]))
if(values.appendonly!=='yes'||values.appendfsync!=='always'||values['maxmemory-policy']!=='noeviction')throw new Error('QUEUE_DURABILITY_CONFIGURATION_REQUIRED')
const queue=new Queue('cloudnest-email',{connection:redis})
const workerRedis=new IORedis(process.env.QUEUE_REDIS_URL,{maxRetriesPerRequest:null,enableOfflineQueue:false})
workerRedis.on('error',()=>console.error('Worker queue unavailable'))
const metrics=createWorkerMetrics(process.env)
const concurrency=Number(process.env.WORKER_CONCURRENCY??2)
if(!Number.isInteger(concurrency)||concurrency<1||concurrency>4)throw new Error('WORKER_CONCURRENCY must be 1?4')
const worker=new Worker('cloudnest-email',async job=>{const end=metrics.duration.startTimer();try{return await processImport(job,backend,{permanentError:UnrecoverableError,onImported:()=>metrics.imported.set(Date.now()/1000)})}finally{end()}},{connection:workerRedis,concurrency,limiter:{max:10,duration:1000},lockDuration:30000})
worker.on('error',()=>console.error('Worker unavailable'))
worker.on('failed',()=>metrics.failures.inc())
const healthFile=process.env.WORKER_HEALTH_FILE||'/tmp/cloudnest-worker-health.json'
let lastPoll=0;let draining=false
const heartbeat=setInterval(()=>fs.writeFile(healthFile,JSON.stringify({heartbeat:Date.now(),lastPoll,draining}),()=>{}),5000)
const abort=new AbortController();let stopped=false
const stop=()=>{if(!stopped){stopped=true;draining=true;abort.abort();setTimeout(()=>process.exit(1),50000).unref()}}
process.once('SIGTERM',stop);process.once('SIGINT',stop)
let failures=0
try{while(!stopped){try{const polled=await pollMailbox({config,redis,queue,backend,signal:abort.signal});if(polled){lastPoll=Date.now();metrics.poll.set(lastPoll/1000)}failures=0;const counts=await queue.getJobCounts('wait','active','delayed','failed');for(const [state,n]of Object.entries(counts))metrics.depth.set({state},n)}catch{failures++;console.error('Mailbox poll failed; retry scheduled')}await sleep(Math.min(60000,15000*2**Math.min(failures,2)),undefined,{signal:abort.signal}).catch(()=>{})}}finally{clearInterval(heartbeat);await worker.close();await queue.close();await workerRedis.quit();await redis.quit();metrics.server?.close()}
