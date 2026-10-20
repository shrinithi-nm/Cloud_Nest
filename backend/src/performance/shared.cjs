const {createHash,randomUUID}=require('node:crypto')
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex')
function principalScope(principal){if(!principal||!['workspace_id','user_id'].every(k=>typeof principal[k]==='string'||typeof principal[k]==='number'))throw new Error('Verified workspace/user principal required');if(!String(principal.workspace_id)||!String(principal.user_id))throw new Error('Empty principal');return hash([String(principal.workspace_id),String(principal.user_id)])}
const limitScript="local n=redis.call('INCR',KEYS[1]);if n==1 then redis.call('PEXPIRE',KEYS[1],ARGV[1]) end;return {n,redis.call('PTTL',KEYS[1])}"
function sharedRateLimit({redis,limit=120,windowMs=60000,principal=req=>req.user,namespace='academic'}){
 if(!Number.isInteger(limit)||limit<1||limit>10000||!Number.isInteger(windowMs)||windowMs<1000||windowMs>3600000||!['academic','imports','preferences','uploads'].includes(namespace))throw new Error('Invalid rate limit configuration')
 return async(req,res,next)=>{let scope;try{scope=principalScope(principal(req))}catch{return res.status(401).json({message:'Authentication required'})}try{const [count,ttl]=await redis.eval(limitScript,1,'cloudnest:limit:'+namespace+':'+scope,windowMs);if(count>limit){res.setHeader('Retry-After',String(Math.max(1,Math.ceil(ttl/1000))));return res.status(429).json({message:'Too many requests. Try again shortly.'})}return next()}catch{return res.status(503).json({message:'Request protection temporarily unavailable'})}}
}
function workspaceScope(workspaceId,kind){if(!['subjects','exams'].includes(kind)||!['string','number'].includes(typeof workspaceId)||!String(workspaceId))throw Error('Workspace scope required');return 'cloudnest:cache-workspace:'+hash([String(workspaceId),kind])}
function createScopedCache({redis,ttlSeconds=30,maxBytes=262144}){
 if(!Number.isInteger(ttlSeconds)||ttlSeconds<1||ttlSeconds>300||!Number.isInteger(maxBytes)||maxBytes<1024||maxBytes>1048576)throw new Error('Invalid cache bounds')
 function base(principal,kind){if(!['subjects','exams'].includes(kind))throw new Error('Unsupported cache kind');return 'cloudnest:cache:'+principalScope(principal)+':'+kind}
 return {
  async getOrLoad({principal,kind,parameters={},load}){
   const prefix=base(principal,kind);const workspace=workspaceScope(principal.workspace_id,kind);const serialized=JSON.stringify(parameters);if(serialized.length>4096)throw new Error('Cache parameters too large');let version
   try{version=await redis.get(prefix+':version');if(!version){await redis.set(prefix+':version',randomUUID(),'NX');version=await redis.get(prefix+':version');if(!version)return load()}let group=await redis.get(workspace);if(!group){await redis.set(workspace,randomUUID(),'NX');group=await redis.get(workspace);if(!group)return load()}version=group+':'+version;const hit=await redis.get(prefix+':'+version+':'+hash(parameters));if(hit!==null)return JSON.parse(hit)}catch{return load()}
   const data=await load();const value=JSON.stringify(data)
   if(value!==undefined&&Buffer.byteLength(value)<=maxBytes){try{await redis.set(prefix+':'+version+':'+hash(parameters),value,'EX',ttlSeconds)}catch{/* Cache failure never invents data. */}}
   return data
  },
  async invalidate({principal,kind}){await redis.set(base(principal,kind)+':version',randomUUID())},
  async invalidateWorkspace({workspaceId,kind}){await redis.set(workspaceScope(workspaceId,kind),randomUUID())}
 }
}
module.exports={principalScope,sharedRateLimit,createScopedCache}
