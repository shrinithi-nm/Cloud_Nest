import { identity, parseTask, InvalidMail, MAX_MESSAGE_BYTES } from './parser.js'
export const jobOptions={attempts:5,backoff:{type:'exponential',delay:2000,jitter:0.25},removeOnComplete:{age:604800,count:1000},removeOnFail:false}
export async function ingestMessage({queue,checkpoint,connectionId,uidValidity,message,decode}) {
 const idempotencyKey=identity(connectionId,uidValidity,message.uid)
 let data={connectionId,idempotencyKey,source:{provider:'imap',uidValidity:String(uidValidity),uid:message.uid},kind:'ignored'}
 try{
  if(message.size>MAX_MESSAGE_BYTES)throw new InvalidMail('MESSAGE_TOO_LARGE')
  const parsed=await decode(message)
  const task=parseTask({...parsed,size:message.size})
  if(task)data={...data,kind:'task',task}
 }catch(e){if(!(e instanceof InvalidMail))throw e;data={...data,kind:'rejected',reason:e.code}}
 await queue.add('email',data,{...jobOptions,jobId:idempotencyKey})
 // Never acknowledge the mailbox checkpoint before Redis accepts the job.
 await checkpoint({uidValidity:String(uidValidity),uid:message.uid})
 return data.kind
}
export async function processImport(job,client,{permanentError=Error,onImported=()=>{}}={}) {
 if(job.data.kind==='ignored')return {status:'ignored'}
 if(job.data.kind==='rejected')throw new permanentError(job.data.reason)
 try{const result=await client.importTask({connectionId:job.data.connectionId,idempotencyKey:job.data.idempotencyKey,source:job.data.source,task:job.data.task});onImported();return result}catch(e){if(e.permanent)throw new permanentError(e.message);throw e}
}

// Expunged UID gaps must not trap the poller forever. Persist a scan acknowledgement first.
export async function finishScan({queue,checkpoint,connectionId,uidValidity,end}) {
 const key='scan-'+identity(connectionId,uidValidity,end)
 await queue.add('scan',{kind:'ignored'}, {...jobOptions,jobId:key})
 await checkpoint({uidValidity:String(uidValidity),uid:end})
}
