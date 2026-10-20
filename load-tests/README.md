# Future authenticated academic workload — NOT RUN

Scripts target actual academic routes, not frontend nginx, health or monitoring endpoints. Proposed acceptance thresholds are <1% logical errors and p95 HTTP latency <2s for this workload. Neither target nor 100-student capacity is achieved/claimed. k6 is not installed in this session; syntax checks do not substitute for k6 runtime validation. Install a reviewed k6 release separately after environment/capacity approval, and record k6 version with results.

Prepare 100 distinct privately stored test student accounts/tokens, each with owned representative tasks/exams. Accounts file is a JSON array of {studentId:"REPLACE",workspaceId:"REPLACE",token:"REPLACE",assignmentId:"REPLACE"}. Do not use example placeholders as credentials. Keep it outside Git or in load-tests/.local. Tokens must be real backend-authenticated student tokens (not browser-local role choices), valid for the full run. The server must enforce student/workspace ownership. No shared data is deleted or graded. The exam query defect and missing submission endpoint are detailed in contracts/README.md and block their workloads.

Future PowerShell, after separate load authorization and teammate fixes:

```powershell
$env:API_BASE_URL = 'REPLACE_WITH_REVIEWED_API_ORIGIN'
$env:ACCOUNTS_FILE = 'REPLACE_WITH_PRIVATE_ACCOUNTS_JSON_PATH'
$env:CONTRACTS_CONFIRMED = 'true'
$env:EXAMS_QUERY_FIXED = 'true'
k6 run .\load-tests\academic.js
# Separate upload burst, only after that exact owned-upload contract exists:
$env:UPLOAD_CONTRACT_CONFIRMED = 'true'
$env:UPLOAD_FILE = 'REPLACE_WITH_HARMLESS_FIXTURE_PATH'
$env:RUN_ID = 'REPLACE_WITH_UNIQUE_RUN_ID'
k6 run .\load-tests\upload.js
```

academic.js ramps 0→20 in 1 minute, 20→100 in 2 minutes, sustains 100 for 5 minutes, then ramps down over 1 minute. Each VU uses its own account, reads tasks then exams with realistic 2–6s pauses. Checks require HTTP 200 and the academic JSON envelope; HTML/frontend responses cannot pass. The custom error threshold includes application-envelope failures, not just transport failures. HTTP p95 excludes think time; results must be interpreted with the defined request mix. No arbitrary write workload is substituted for a missing endpoint.

upload.js is a separate 20-student, one-upload-each burst (one minute deadline; <=1 MiB harmless text fixture). It requires owned disposable assignment IDs, stable per-run/VU idempotency and a confirmed submission ID. This future authenticated route does not currently exist; do not enable the gate until reviewed. Uploads create personal test submissions and consume storage; the teammate owns lifecycle/cleanup policy. Do not run academic and upload tests concurrently on this laptop.

HTTP metric system tags omit raw URLs/student IDs and use fixed operation names. Do not enable HTTP debug logging or share account files/tokens. Record software/image versions, test data size, machine/node headroom, saturation, latency/error distributions, HPA decisions and cleanup. Abort on resource pressure/application failures; no continuing memory guard is provided by these scripts. The earlier monitoring startup guard was temporary and must not be treated as active protection.
