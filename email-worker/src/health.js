import {readFileSync} from 'node:fs'
try{const s=JSON.parse(readFileSync(process.env.WORKER_HEALTH_FILE||'/tmp/cloudnest-worker-health.json','utf8'));const now=Date.now();if(s.draining||now-s.heartbeat>30000||(process.argv[2]==='ready'&&(!s.lastPoll||now-s.lastPoll>120000)))process.exitCode=1}catch{process.exitCode=1}
