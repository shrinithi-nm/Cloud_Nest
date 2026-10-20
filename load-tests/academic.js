import http from 'k6/http'
import {sleep,check} from 'k6'
import {Rate} from 'k6/metrics'
const failed=new Rate('academic_failures')
if(__ENV.CONTRACTS_CONFIRMED!=='true'||__ENV.EXAMS_QUERY_FIXED!=='true')throw Error('Review academic contracts and resolve the documented exam query defect first')
if(!__ENV.ACCOUNTS_FILE||!__ENV.API_BASE_URL)throw Error('ACCOUNTS_FILE and API_BASE_URL required')
if(/[@?#]/.test(__ENV.API_BASE_URL))throw Error('Use an origin without credentials, query or fragment')
const base=__ENV.API_BASE_URL.replace(/\/$/,'');if(!/^https:\/\//.test(base)&&!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(base))throw Error('HTTPS or explicit loopback target required')
const accounts=JSON.parse(open(__ENV.ACCOUNTS_FILE));if(!Array.isArray(accounts)||accounts.length<100)throw Error('100 distinct private test students required')
const selected=accounts.slice(0,100)
if(selected.some(a=>!/^\d+$/.test(String(a.studentId))||!/^\d+$/.test(String(a.workspaceId))||typeof a.token!=='string'||a.token.length<20)||new Set(selected.map(a=>a.workspaceId+':'+a.studentId)).size!==100||new Set(selected.map(a=>a.token)).size!==100)throw Error('Distinct verified student identities and tokens required')
export const options={scenarios:{academic:{executor:'ramping-vus',startVUs:0,stages:[{duration:'1m',target:20},{duration:'2m',target:100},{duration:'5m',target:100},{duration:'1m',target:0}],gracefulRampDown:'30s'}},thresholds:{academic_failures:['rate<0.01'],http_req_duration:['p(95)<2000']},systemTags:['status','method','name','scenario','expected_response'],discardResponseBodies:false}
export default function(){const a=selected[__VU-1];for(const kind of ['tasks','exams']){const r=http.get(base+'/api/'+kind+'/student/'+a.studentId,{headers:{Authorization:'Bearer '+a.token},timeout:'10s',redirects:0,tags:{name:'student-'+kind}});let valid=false;try{const j=r.json();valid=r.status===200&&j.status==='success'&&Array.isArray(j.data)}catch{}failed.add(!valid);check(r,{'authenticated academic JSON response':()=>valid});sleep(2+Math.random()*4)}}
