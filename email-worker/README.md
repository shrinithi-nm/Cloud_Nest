# Email-to-task worker — independent implementation

Not connected to a mailbox, Redis or a real task-import endpoint during implementation. Uses locked BullMQ 6.3.19, ImapFlow 2.5.9, ioredis 6.0.0, mailparser 3.10.0 and @prometheus-io/client 0.16.1 on Node 24. The lockfile records transitive versions. Provider/queue behaviour must still be integration-tested.

IMAP uses verified TLS on port 993, certificate validation, a read-only INBOX lock and bounded source retrieval (128 KiB + rejection byte). Use the provider's supported OAuth access-token flow or app-specific password under its MFA policy, not an invented ordinary password. The worker reads private password/access-token files at startup. Token refresh/rotation and verified mailbox ownership belong to the teammate's connection service; after rotation restart only this worker in a later authorized session. No email is marked read, deleted or moved. No attachment is imported and no HTML is rendered or converted into task text. mailparser sees only bounded message bytes.

Only exact [CloudNest Task] subject prefix is considered. Title 1–160 characters. Required body fields Subject-Code (uppercase ASCII code <=32), Due (strict calendar-valid ISO timestamp with seconds and Z or numeric offset), Priority (low/medium/high). Optional Description: starts a final plain-text block, continued on later lines, max 4,000 characters. Extra fields before Description, repeated fields, ambiguous dates and oversized messages are retained as rejected review jobs. Unrelated messages create compact ignored receipts, never tasks. Sender headers and embedded user IDs are never an ownership authority. Connection identity must come from a verified backend mapping matching IMAP host/user/INBOX; imports always reverify it.

Example:

```text
Subject: [CloudNest Task] Complete Java assignment

Subject-Code: JAVA
Due: 2026-10-22T18:00:00+05:30
Priority: high
Description: Review collections.
Complete exercises 1-3.
```

Stable key: SHA256 of the versioned connection ID/UIDVALIDITY/UID tuple. UIDVALIDITY change replays from zero under new keys. Initial polling starts at UID 1 and scans at most 50 UID positions per poll (not necessarily 50 messages). Already existing matching messages can therefore import; verify the intended connection/INBOX before first activation. Durable scan receipts handle gaps/expunged UIDs without stalling. Queue acknowledgement precedes every checkpoint. A renewable mailbox lease protects overlap, and checkpoint writes compare the lease atomically. Queue Redis must report appendonly=yes, appendfsync=always, maxmemory-policy=noeviction or startup fails. This requires CONFIG GET permission; managed Redis that forbids it is an explicit integration blocker, not a bypassable success flag.

Concurrency 1–4 (default 2); import limiter 10 jobs/s; five attempts with bounded exponential backoff/jitter. Completed receipts are retained for seven days/up to 1,000; failed jobs remain for review. Polling backpressures at 1,000 pending/active/delayed/failed jobs for this single configured poller; the 1,000 completed cap is separate. Do not scale independent different-mailbox producers without an atomic global admission gate/capacity review. Queue maxmemory noeviction is an additional hard bound. Inspect failed jobs privately; they may include personal task text. Failures are not silently discarded or turned into success. Operator reviews/removes/retries permanent failures under a retention policy. Backend transactional uniqueness is essential after queue retention/replay.

SIGTERM/SIGINT closes polling and drains the active worker; a 50-second shutdown ceiling ensures termination, leaving interrupted jobs to BullMQ stall recovery/backend idempotency. Health heartbeat is separate from successful poll time, so an upstream outage does not masquerade as a successful mailbox poll. Kubernetes template uses /tmp health state. On Windows explicitly choose an existing writable WORKER_HEALTH_FILE path.

## Commands (repository root)

```powershell
npm ci --prefix .\email-worker --ignore-scripts
npm test --prefix .\email-worker
npm run fixture --prefix .\email-worker
# OFFLINE fixture uses an in-memory fake queue only. It proves no real delivery/durability.
# Later, after teammate endpoints, private credentials, capacity and durable Redis exist:
Copy-Item .\email-worker\.env.example .\email-worker\.env
# Edit privately; preserve any existing .env rather than overwriting it.
New-Item -ItemType Directory -Force .\email-worker\.local | Out-Null
$env:WORKER_HEALTH_FILE = Join-Path (Get-Location) 'email-worker\.local\health.json'
npm start --prefix .\email-worker
# Stop only that terminal with Ctrl+C. Do not stop the monitoring services.
```

No runtime start command above was executed. TASK_IMPORT_TOKEN_FILE and IMAP_PASSWORD_FILE or IMAP_ACCESS_TOKEN_FILE point to privately protected files. QUEUE_REDIS_URL remains private and must include the configured Redis ACL credentials when auth is enabled. HTTPS is required for non-loopback import URLs. The base URL is an origin; fixed /api paths intentionally do not follow arbitrary reverse-proxy prefixes. Review contracts/README.md before integration. No runtime localStorage/fake task fallback exists.

Optional WORKER_METRICS_ENABLED=true exposes authenticated loopback-only 9467 with WORKER_METRICS_TOKEN_FILE. No identity labels are exported. Poll/import timestamps are absent until observed; queue gauges reflect their last successful read. Use poll age to judge freshness. Pending dashboard/scrape fragments are outside live provisioned directories. Container/pod access requires an explicitly protected private path/port-forward during later integration, not an automatic public bind.
