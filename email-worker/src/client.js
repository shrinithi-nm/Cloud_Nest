export class ImportError extends Error {constructor(code,permanent=false){super(code);this.permanent=permanent}}
export function createImportClient({baseUrl,token,fetchImpl=fetch}) {
 const base=new URL(baseUrl)
 if(base.username||base.password||base.search||base.hash||!['https:','http:'].includes(base.protocol)|| (base.protocol==='http:'&&!['localhost','127.0.0.1','[::1]'].includes(base.hostname)))throw new Error('HTTPS_OR_LOOPBACK_REQUIRED')
 if(!token||/[\r\n]/.test(token))throw new Error('IMPORT_TOKEN_REQUIRED')
 async function request(path,options={}) {
  let response
  try{response=await fetchImpl(new URL(path,base),{...options,redirect:'error',signal:AbortSignal.timeout(8000),headers:{Authorization:'Bearer '+token,'Content-Type':'application/json',...options.headers}})}catch{throw new ImportError('IMPORT_UNREACHABLE')}
  if(!response.ok)throw new ImportError('IMPORT_HTTP_'+response.status,!([408,425,429].includes(response.status)||response.status>=500))
  if(!response.body)throw new ImportError('IMPORT_EMPTY_RESPONSE',true)
  const reader=response.body.getReader();const decoder=new TextDecoder();let text='';let bytes=0
  for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>16384){await reader.cancel();throw new ImportError('IMPORT_RESPONSE_TOO_LARGE',true)}text+=decoder.decode(value,{stream:true})}
  text+=decoder.decode();try{return JSON.parse(text)}catch{throw new ImportError('IMPORT_INVALID_RESPONSE',true)}
 }
 return {
  async verify(connectionId){const r=await request('/api/integrations/mailboxes/'+encodeURIComponent(connectionId));if(r.connectionId!==connectionId||r.provider!=='imap'||r.verified!==true||r.enabled!==true)throw new ImportError('MAILBOX_NOT_VERIFIED',true);return r},
  async importTask(data){await this.verify(data.connectionId);const r=await request('/api/tasks/import/email',{method:'POST',headers:{'Idempotency-Key':data.idempotencyKey},body:JSON.stringify(data)});if(!['created','duplicate'].includes(r.status)||typeof r.taskId!=='string')throw new ImportError('IMPORT_UNCONFIRMED',true);return r}
 }
}
