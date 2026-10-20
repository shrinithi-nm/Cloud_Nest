import { Registry,Gauge,Counter,Histogram } from '@prometheus-io/client'
import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { timingSafeEqual } from 'node:crypto'
export function createWorkerMetrics(env={}) {
 const registry=new Registry();const metric=(Type,name,help,extra={})=>new Type({name,help,registers:[registry],...extra})
 const depth=metric(Gauge,'cloudnest_email_queue_jobs','Last observed queue depth',{labelNames:['state']})
 const failures=metric(Counter,'cloudnest_email_worker_failures_total','Failed processing attempts')
 const duration=metric(Histogram,'cloudnest_email_worker_duration_seconds','Import attempt duration',{buckets:[.05,.1,.5,1,5,10]})
 const poll=metric(Gauge,'cloudnest_email_last_poll_success_timestamp_seconds','Last successful verified mailbox poll')
 const imported=metric(Gauge,'cloudnest_email_last_import_success_timestamp_seconds','Last confirmed backend import')
 // No successful poll/import has been observed yet: omit instead of zero.
 poll.remove();imported.remove()
 let server
 if(env.WORKER_METRICS_ENABLED==='true'){
  const token=readFileSync(env.WORKER_METRICS_TOKEN_FILE,'utf8').trim();if(!/^[A-Za-z0-9_-]{32,256}$/.test(token))throw new Error('Invalid worker metrics token')
  const expected=Buffer.from('Bearer '+token)
  server=createServer(async(req,res)=>{if(req.url!=='/metrics'||req.method!=='GET'){res.writeHead(404);res.end();return}const got=Buffer.from(req.headers.authorization??'');if(got.length!==expected.length||!timingSafeEqual(got,expected)){res.writeHead(401);res.end();return}res.writeHead(200,{'Content-Type':registry.contentType});res.end(await registry.metrics())})
  server.listen(9467,'127.0.0.1')
 }
 return {registry,depth,failures,duration,poll,imported,server}
}
