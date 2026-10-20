import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'
import { randomUUID,createHash } from 'node:crypto'
import { ingestMessage,finishScan } from './ingestion.js'
import {InvalidMail,MAX_MESSAGE_BYTES} from './parser.js'
export async function pollMailbox({config,redis,queue,backend,signal,createClient=options=>new ImapFlow(options)}) {
 const verified=await backend.verify(config.connectionId)
 if(verified.imap?.host!==config.host||verified.imap?.user!==config.user||verified.imap?.folder!=='INBOX')throw new Error('VERIFIED_MAILBOX_CONFIGURATION_MISMATCH')
 const key='cloudnest:mailbox:'+createHash('sha256').update(config.connectionId).digest('hex')
 const lease=randomUUID();if(await redis.set(key+':lock',lease,'PX',120000,'NX')!=='OK')return false
 let lost=false
 const renew=setInterval(()=>redis.eval("if redis.call('get',KEYS[1])==ARGV[1] then return redis.call('pexpire',KEYS[1],120000) else return 0 end",1,key+':lock',lease).then(ok=>{if(!ok)lost=true}).catch(()=>{lost=true}),30000)
 const client=createClient({host:config.host,port:993,secure:true,auth:config.accessToken?{user:config.user,accessToken:config.accessToken}:{user:config.user,pass:config.password},logger:false,connectionTimeout:10000,greetingTimeout:10000,socketTimeout:30000,tls:{rejectUnauthorized:true}})
 const abort=()=>client.close();signal?.addEventListener('abort',abort,{once:true})
 try{
  await client.connect();const lock=await client.getMailboxLock('INBOX',{readOnly:true})
  try{
   const validity=String(client.mailbox.uidValidity);const old=await redis.hgetall(key+':checkpoint');const last=old.uidValidity===validity?Number(old.uid):0
   const end=Math.min(Number(client.mailbox.uidNext)-1,last+50)
   if(end<=last)return true
   const checkpoint=async point=>{const ok=await redis.eval("if redis.call('get',KEYS[1])~=ARGV[1] then return 0 end redis.call('hset',KEYS[2],'uidValidity',ARGV[2],'uid',ARGV[3]);return 1",2,key+':lock',key+':checkpoint',lease,point.uidValidity,point.uid);if(!ok)throw new Error('POLL_LEASE_LOST')}
   const assertCapacity=async()=>{const counts=await queue.getJobCounts('wait','active','delayed','failed','paused','prioritized');if(Object.values(counts).reduce((a,b)=>a+b,0)>=1000)throw new Error('QUEUE_REVIEW_OR_DRAIN_REQUIRED')}
   // Fetch metadata first: oversize messages are never downloaded.
   const meta=[];for await(const item of client.fetch((last+1)+':'+end,{uid:true,size:true},{uid:true}))meta.push(item)
   for(const item of meta){
    if(signal?.aborted||lost)throw new Error('POLL_INTERRUPTED')
    await assertCapacity()
    await ingestMessage({queue,connectionId:config.connectionId,uidValidity:validity,message:item,
     decode:async message=>{const full=await client.fetchOne(message.uid,{source:{start:0,maxLength:MAX_MESSAGE_BYTES+1}},{uid:true});if(!full?.source)throw new Error('MESSAGE_DISAPPEARED');if(full.source.length>MAX_MESSAGE_BYTES)throw new InvalidMail('MESSAGE_TOO_LARGE');const mail=await simpleParser(full.source,{skipHtmlToText:true,skipTextToHtml:true,skipImageLinks:true});return {subject:mail.subject,text:mail.text??''}},
     checkpoint
    })
   }
   if(signal?.aborted||lost)throw new Error('POLL_INTERRUPTED')
   await assertCapacity()
   await finishScan({queue,checkpoint,connectionId:config.connectionId,uidValidity:validity,end})
   return true
  }finally{lock.release()}
 }finally{clearInterval(renew);signal?.removeEventListener('abort',abort);await client.logout().catch(()=>client.close());await redis.eval("if redis.call('get',KEYS[1])==ARGV[1] then return redis.call('del',KEYS[1]) else return 0 end",1,key+':lock',lease).catch(()=>{})}
}
