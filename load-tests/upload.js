import http from 'k6/http';import {check} from 'k6';import {Rate} from 'k6/metrics'
const failures=new Rate('upload_failures')
if(__ENV.UPLOAD_CONTRACT_CONFIRMED!=='true'||!__ENV.ACCOUNTS_FILE||!__ENV.API_BASE_URL||!__ENV.UPLOAD_FILE||!__ENV.RUN_ID)throw Error('Missing reviewed upload contract/private test configuration; submission endpoint is not implemented in this repository')
if(/[@?#]/.test(__ENV.API_BASE_URL))throw Error('Use an origin without credentials, query or fragment')
const base=__ENV.API_BASE_URL.replace(/\/$/,'');if(!/^https:\/\//.test(base)&&!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(base))throw Error('HTTPS or loopback required')
if(!/^[A-Za-z0-9_-]{1,64}$/.test(__ENV.RUN_ID))throw Error('Invalid run ID')
const accounts=JSON.parse(open(__ENV.ACCOUNTS_FILE)).slice(0,20);if(accounts.length!==20||new Set(accounts.map(a=>a.workspaceId+':'+a.studentId)).size!==20||new Set(accounts.map(a=>a.token)).size!==20||accounts.some(a=>!a.token||!/^\d+$/.test(String(a.assignmentId))))throw Error('20 distinct authorized students and owned disposable assignment IDs required')
const file=open(__ENV.UPLOAD_FILE,'b');if(file.byteLength>1048576)throw Error('Upload fixture exceeds 1 MiB cap')
export const options={scenarios:{upload:{executor:'per-vu-iterations',vus:20,iterations:1,maxDuration:'1m'}},thresholds:{upload_failures:['rate<0.01'],http_req_duration:['p(95)<2000']},systemTags:['status','method','name','scenario','expected_response']}
export default function(){const a=accounts[__VU-1];const r=http.post(base+'/api/assignments/'+a.assignmentId+'/submissions',{file:http.file(file,'load-fixture.txt','text/plain')},{headers:{Authorization:'Bearer '+a.token,'Idempotency-Key':__ENV.RUN_ID+'-'+__VU},timeout:'15s',redirects:0,tags:{name:'owned-assignment-upload'}});let valid=false;try{valid=[200,201].includes(r.status)&&typeof r.json().submissionId==='string'}catch{}failures.add(!valid);check(r,{'confirmed own submission':()=>valid})}
