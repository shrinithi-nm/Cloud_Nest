Latest local runtime results: [21 October live verification](LIVE-VERIFICATION.md). The implementation-time pending statements below are historical; browser acceptance remains manual.

# Step 3 — observability handoff

Implementation is complete as code/configuration; **live observability acceptance is pending**. No Prometheus/Grafana processes were started, no images were pulled, no Kubernetes resources were installed, and no load was generated. Do not start this stack until host memory headroom has been reassessed and the operator chooses to proceed.

The latest Step 1/2 acceptance remains: monitoring observed 2 desired/2 ready replicas; the one traffic experiment was aborted for host-memory safety, no scale-out was observed, and generator cleanup was verified. Website checks remain pending. PostgreSQL authentication (`28P01`) and schema/seed gaps remain with the academic/API teammate; this feature does not repair or bypass them. See `cloud-ops/acceptance/2026-10-20/REPORT.md` and `cloud-ops/MANUAL-BROWSER.md` for the historical evidence/capacity diagnosis. The latter's original missing-env observations predate the subsequent PostgreSQL authentication diagnosis.

## Architecture and endpoint exposure

- Existing monitoring API stays on loopback **4100**; control API stays on loopback **4101** in local mode. No controller routes are exposed by the metrics listener.
- `GET /metrics` on the existing monitoring listener exports process/HTTP/Kubernetes observations locally. It uses the existing host/origin checks and existing in-cluster network/auth boundary; do not publish that API listener.
- Optional **separate metrics-only listeners**: monitor **9464**, controller **9465**, optional academic backend **9466**. Only exact `GET /metrics` is supported. Every request needs a bearer token from an ignored local file; invalid/missing auth returns 401, other paths/methods 404. No CORS is enabled. There are no Kubernetes credentials, Docker socket or mutation routes behind these listeners.
- The listeners default to **127.0.0.1**. A loopback listener is not assumed reachable from Docker Desktop's Linux containers. For Docker scrapes, explicitly opt into `METRICS_BIND_HOST=0.0.0.0` on **the metrics listener only**; configure Windows Firewall to permit only the actual Docker Desktop source addresses and block unrelated LAN/public clients. Use HTTPS or a protected private proxy for any non-local production network. Plain HTTP bearer auth here assumes a trusted local Docker/host path.
- Prometheus uses **host.docker.internal:9464** from Docker Desktop; cloud-ops queries Prometheus using **http://127.0.0.1:9090** on Windows. The Docker-specific hostname is configured in the Compose scrape targets; a loopback bind alone is not the connectivity solution. Actual Docker-to-host reachability/firewall enforcement remains a live acceptance check.
- Prometheus and Grafana publish only **127.0.0.1:9090** and **127.0.0.1:3000**. Containers communicate on a private Compose network. No public Ingress, Kubernetes write permissions or new ServiceAccounts are added.
- Grafana requires login; anonymous access and self-signup are disabled. Its datasource is server-side `http://prometheus:9090`, not browser access to Prometheus.

The localhost API endpoints still require the earlier server-side admin integration before production exposure. This step does not supply administrator authorization. Production load mutation routes continue to fail closed without their reviewed authorization hook. Do not enable load controls to obtain observability: disabled control state is exported as **unknown/absent**, not fabricated idle zero.

## Deferred local configuration (PowerShell, repository root)

These are handoff commands, **not commands executed during this implementation**. Keep the current memory constraint in mind. The selected library is maintained `@prometheus-io/client` **0.16.1** (formerly prom-client), compatible with Node 24. Dependency lockfiles pin it; no unrelated versions were upgraded.

Install changed Node dependencies before future startup:

```powershell
npm ci --prefix .\cloud-ops
npm ci --prefix .\backend
```

Create ignored local credential files without printing their contents. Existing files are preserved:

```powershell
$repoRoot = (Get-Location).Path
$secretDir = Join-Path $repoRoot 'observability\.local'
New-Item -ItemType Directory -Force $secretDir | Out-Null
foreach ($filename in @('metrics-token.txt', 'grafana-admin-password.txt')) {
    $destination = Join-Path $secretDir $filename
    if (-not (Test-Path -LiteralPath $destination)) {
        $bytes = New-Object byte[] 32
        $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
        $rng.GetBytes($bytes)
        $rng.Dispose()
        $value = [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
        [System.IO.File]::WriteAllText($destination, $value)
    }
}
if (-not (Test-Path .\observability\.env)) {
    Copy-Item .\observability\.env.example .\observability\.env
}
```

Privately choose `GRAFANA_ADMIN_USER` in `observability/.env` instead of its placeholder. Use the generated password file privately for login; do not paste it in chat/logs. `.env` and `.local/` are ignored. Treat the metrics token as local credentials for **metrics only**, not as production administrator authorization. No secret belongs in a `VITE_*` variable. Do not copy/overwrite the existing backend/frontend `.env` files.

The monitor's restricted identity was removed after acceptance. If it has not been restored, follow the exact **read-only** identity/proxy commands in `cloud-ops/MANUAL-BROWSER.md` first. They use `browser-monitor-rbac.json` (only get/list), not the controller mutation template. Keep the loopback proxy on 18001 running. No new permissions are required by Step 3.

In a separate monitoring terminal, from the repository root:

```powershell
$repoRoot = (Get-Location).Path
$env:KUBECONFIG = Join-Path $repoRoot 'cloud-ops\acceptance\2026-10-20\monitor.kubeconfig.json'
$env:KUBE_CONTEXT = 'docker-desktop'
$env:KUBE_NAMESPACE = 'default'
$env:KUBE_DEPLOYMENT = 'cloudnest-frontend'
$env:KUBE_POD_SELECTOR = 'app=cloudnest-frontend'
$env:KUBE_HPA = 'cloudnest-frontend-hpa'
$env:PORT = '4100'
$env:METRICS_ENABLED = 'true'
$env:METRICS_BIND_HOST = '0.0.0.0' # ONLY the authenticated metrics port; review firewall first.
$env:METRICS_PORT = '9464'
$env:METRICS_TOKEN_FILE = Join-Path $repoRoot 'observability\.local\metrics-token.txt'
$env:PROMETHEUS_URL = 'http://127.0.0.1:9090'
$env:GRAFANA_URL = 'http://127.0.0.1:3000/d/cloudnest'
Remove-Item Env:KUBE_MODE -ErrorAction SilentlyContinue
Push-Location .\cloud-ops
npm start
```

Enabling the metrics listener starts one non-overlapping, five-second read-only snapshot poller. It shares the existing snapshot cache with browser calls; actual collections, not cache hits, are counted. Without the flag, snapshots still work on demand and expire from exported metrics when old. The listener and collectors are initialized once per process, not once per scrape.

Firewall guidance: determine the Docker Desktop source address/subnet on this machine, and allow only that source to TCP 9464 (9465/9466 only if explicitly used), scoped to a private interface/profile. Do not add an Any-source/Any-profile allow rule or bind the full API to all interfaces. Since source routing varies between Docker Desktop versions, no guessed subnet or firewall change is applied by this repository. If isolation cannot be established, leave the dedicated listener loopback-only and report container scraping as blocked.

Start the existing frontend in another terminal:

```powershell
npm run dev --prefix .\frontend
```

An optional disabled controller can keep its panel explicit without granting controller RBAC:

```powershell
$env:CLOUD_LOAD_ENABLED = 'false'
$env:METRICS_ENABLED = 'false'
Push-Location .\cloud-ops
npm run controller
```

Do **not** enable load in this step. Experiment telemetry is instrumented where controller state can legitimately be observed. To scrape a controller already enabled by a separate authorized workflow, its own terminal sets METRICS_PORT=9465 and the other metrics variables; `observability/prometheus/controller-targets.json` can then contain `[{"targets":["host.docker.internal:9465"]}]`. Keep that file empty for this step. Turning on metrics does not authorize mutations and does not create a controller identity.

## Deferred Compose start/stop

Only after host headroom is acceptable and the operator explicitly chooses to launch:

```powershell
docker compose --env-file .\observability\.env -f .\observability\compose.yaml --profile observability up -d
# Check actual state and then log into Grafana privately:
docker compose --env-file .\observability\.env -f .\observability\compose.yaml --profile observability ps
```

Pinned images: **prom/prometheus:v3.13.4**, **grafana/grafana:13.2.3**. They were not pulled or executed during implementation. Prometheus is capped at **384 MiB / 0.5 CPU**, Grafana at **256 MiB / 0.5 CPU**: about **640 MiB of configured container memory limits**, plus host processes/VM/filesystem overhead. This is neither measured usage nor reserved free host memory, and is not a guarantee the stack fits safely in current Windows headroom. Startup may hit a cap and fail rather than exceed it. Do not compensate by stopping unrelated processes automatically.

Prometheus scrapes/evaluates every 15 seconds, with 5-second scrape deadlines, per-target 1MB/10,000-sample limits, two concurrent queries, a 100,000-sample query cap and 3-second query deadlines. Retention is **6 hours or 256MB of retained blocks**, whichever applies first; WAL/head and compaction overhead mean this is not a hard total disk-size cap. WAL segments are 32MB. There is no durable replica history inside cloud-ops itself: Prometheus retention exists only after this stack is actually running/scraping.

Named volumes retain Prometheus and Grafana data. Safe shutdown preserves both volumes:

```powershell
docker compose --env-file .\observability\.env -f .\observability\compose.yaml --profile observability down
```

Do not use `down -v`, volume deletion, prune, or Kubernetes reset. Stop only your own npm/proxy terminals with Ctrl+C when finished. The compose health checks/provisioning are configuration-reviewed, not runtime-verified.

## Optional academic instrumentation boundary

`backend/src/app.js` registers `backend/src/observability.cjs` **only if BACKEND_METRICS_ENABLED=true**. Default behavior, authentication middleware, academic routes/results, student isolation, database queries and PostgreSQL configuration are unchanged. The standalone module tests require no database, JWT secret or production app startup.

The module measures **academic API** response count/duration on the existing server but exposes them on a **separate authenticated metrics-only listener**, never `/metrics` on its public academic listener. It normalizes a fixed allowlist of mount points and route templates; unknown routes become `unmatched`, never raw IDs or URLs. Existing auth failures still retain their existing results and are measured as responses, not bypassed.

The teammate must first resolve the current PostgreSQL authentication and schema/seed issues through its own workflow. After normal backend startup requirements are satisfied, enable with process-local variables (do not overwrite existing `.env`):

```powershell
$repoRoot = (Get-Location).Path
$env:BACKEND_METRICS_ENABLED = 'true'
$env:BACKEND_METRICS_BIND_HOST = '0.0.0.0' # Metrics ONLY, bearer protected, firewall review required.
$env:BACKEND_METRICS_PORT = '9466'
$env:BACKEND_METRICS_TOKEN_FILE = Join-Path $repoRoot 'observability\.local\metrics-token.txt'
# Retain the port used by the existing application/client configuration.
Push-Location .\backend
npm start
```

Opt-in environment names are also listed in `backend/.env.metrics.example`. Keep the default file `observability/prometheus/academic-targets.json` empty until the module is enabled and reachable. Then a trusted operator can configure that discovery file as `[{"targets":["host.docker.internal:9466"]}]`. Backend panels remain **no-data** until enabled, successfully scraped and requests are actually measured. No measured traffic means rate/p95 series may be absent. Health checks working alone do not establish database connectivity or academic capacity.

## Metric definitions and panel sources

All custom labels are fixed/allowlisted: `service`, normalized `route`, bounded `method`, `status_class`, section, state, action and result. No identities, email, raw URLs, token values, pod UIDs, experiment IDs or error strings are exported. Unknown paths collapse to `unmatched`, unknown HTTP methods to OTHER. Real process metrics use a constant number of collectors and on-scrape Node process calls; no per-user collectors or repeated default-metric registration.

| Metric | Meaning/source |
| --- | --- |
| `cloudnest_http_requests_total` | Completed responses by route/method/status class. Actual scrapes excluded. `service=monitoring`/controller are **not academic API** measurements; academic-api requires opt-in. |
| `cloudnest_http_response_duration_seconds` | Histogram with .005–10s finite buckets plus +Inf; service response duration. |
| `cloudnest_snapshot_refresh_total{result}` | Actual shared collection outcome: success (all sections), partial, failure (all unavailable/exception). |
| `cloudnest_snapshot_last_success_timestamp_seconds` | Last collection with an available Deployment section; absent before first success. Partial metrics-server failure does not mean the workload is offline. |
| `cloudnest_snapshot_fresh` | 1 only if the most recent Deployment reading is available and <=30s old, otherwise 0. |
| `cloudnest_snapshot_section_available{section}` | Availability per fixed section, gated by 30s collection age. Partial is not fully available. |
| `cloudnest_workload_desired_replicas`, `...ready_replicas` | Observed Deployment readings, removed if unavailable or >30s old. |
| `cloudnest_workload_cpu_cores`, `...memory_bytes` | Real application pod aggregate from resource metrics API. CPU is cores, **not percentage**. Samples omitted if coverage incomplete, snapshot >30s, or any resource sample >60s old. No node/exporter metrics are fabricated. |
| `cloudnest_workload_metrics_timestamp_seconds` | Oldest pod sample time for the aggregate. |
| `cloudnest_experiment_active` | Controller-observed active (1)/idle-or-terminal (0). Missing when disabled, failed discovery, or >30s old. |
| `cloudnest_experiment_transitions_total{state}` | Observed state changes, deduplicated by internal identity/state; identity never becomes a label. Restarts can re-observe transitions. Not durable lifecycle accounting. |
| `cloudnest_experiment_actions_total{action,result}` | Start/Stop operations by confirmed/partial/failed outcome. Not student/request throughput. |
| `cloudnest_process_cpu_seconds_total`, `...resident_memory_bytes`, `...heap_used_bytes`, `...uptime_seconds` | Actual Node process CPU, RSS, heap and uptime; no host-memory headroom claim. |

The single provisioned dashboard separates monitoring-service request rate/5xx/p95 (5-minute windows) from the optional academic section. Kubernetes CPU/memory/replicas come **only from the existing cloud-ops collector**. No node exporter, kube-state-metrics, cAdvisor or Prometheus Operator is installed or assumed. Prometheus does not discover all cluster metrics automatically. Empty optional discovery files produce absent sources. No `or vector(0)` or random/fixture live fallback is used.

## Cloud Pulse fixed-query boundary

`GET /api/cloud/observability` on cloud-ops returns the Step 1-style observedAt/source/availability/data/error envelope. It provides Prometheus reachability, last successful query time, fixed target statuses, four allowlisted alert names/states, and an optional validated HTTP(S) Grafana URL. Empty PROMETHEUS_URL returns explicit unconfigured/unavailable, not healthy. GRAFANA_URL is server configuration only; link disabled when absent. No iframe, arbitrary PromQL or browser target URL is supported. Query strings/unknown routes are rejected.

Only three fixed instant queries are sent: selected scrape `up` states, selected `ALERTS` states, and the CloudNest rule-group rule count. Upstream redirects are rejected; each request has a 2.5-second abort deadline, 64KiB body limit and 50-vector-row limit. Results are sanitized to bounded fields and shared in a 10-second cache; UI polling is 15 seconds with failure backoff/cleanup. Failures preserve the last successful query timestamp but return alert state unavailable; they do not break Kubernetes snapshots.

“No active alerts” means no active allowlisted ALERTS series **and at least four loaded CloudNest rules were observed**. It does not assert that academic APIs, cluster resources, notification delivery, or unconfigured targets are healthy. Missing rule-group metrics show alert evaluation unavailable. Prometheus must scrape itself for its rule-group metric; first-start no-data can persist for a scrape/evaluation cycle. Rules may be pending before firing.

## Alerts and thresholds

Thresholds/durations are explicitly configurable in `observability/prometheus/alerts.yml` (edit and validate the file, then restart/reload Prometheus through an approved operator workflow):

| Rule | Default |
| --- | --- |
| Monitoring scrape unavailable | up=0 **or absent**, for 30s |
| Stale Kubernetes snapshot | Deployment observation unavailable, >30s since success, or success timestamp absent while target is up, for 1m |
| Ready replica deficit | Fresh ready < desired continuously for 2m |
| Monitoring-service elevated errors | 5xx ratio >5% over 5m **and >=20 responses over 5m**, for 2m |

Unavailable resource samples are absent, never healthy zero. The scrape/stale rules cover telemetry loss rather than inferring healthy replicas. These rules concern the monitoring service/workload only; they are not academic API SLAs. Alert **evaluation** in Prometheus and external **notification delivery** are separate. No Alertmanager, receiver, email, Slack or other delivery is configured or claimed.

## Verification and pending acceptance

Completed during implementation:

- **33 cloud-ops tests pass**, including existing Step 1/2 checks plus collector/cardinality, normalized routes, actual histogram/process output, partial/fresh/stale samples, metrics-only bearer boundary, fixed queries/cache/timeout/response limits, unconfigured/failed/no-rules states, optional database-independent backend module, and structural provisioning/alert checks.
- Frontend lint and build pass; existing bundle-size warning remains.
- Docker Compose v5.5.1 configuration validation passed **without starting or pulling anything**:

```powershell
docker compose -f .\observability\compose.yaml --profile observability config --quiet --no-env-resolution
npm test --prefix .\cloud-ops
npm run lint --prefix .\frontend
npm run build --prefix .\frontend
```

- YAML/JSON/provisioning and dashboard source checks passed in Node tests. This does **not** substitute for promtool or Grafana runtime validation.
- **promtool is not installed**. PromQL parsing and semantic rule evaluation are **pending**, not passed. `observability/prometheus/alerts.test.yml` prepares four rule cases. Once a native promtool is available, without starting any service:

```powershell
Push-Location .\observability\prometheus
promtool check rules alerts.yml
promtool test rules alerts.test.yml
Pop-Location
```

The production Prometheus config uses container mount paths, so full `promtool check config /etc/prometheus/prometheus.yml` must run in the future configured container/filesystem context; it has not been claimed passed here. No browser tooling is available: visual/keyboard/mobile checks remain manual. Docker-to-host metrics authentication/connectivity, image compatibility, actual measured memory consumption, ingestion, Grafana login/provisioning, real alert transitions and notification delivery (not configured) are not live-verified.

The backend npm audit reported five existing findings in unchanged packages (`brace-expansion`, `braces`, `chokidar`, `nodemon`, `proxy-addr`), including one critical advisory. The four newly added dependency packages are not those findings; existing package versions were preserved. No automatic audit fix or repository-wide upgrade was attempted.

## Changed files

- cloud-ops: new `src/metrics.js`, `src/metrics-server.js`, `src/observability.js`, `test/observability.test.js`; additive `src/server.js` and `src/controller-server.js` instrumentation; package/lockfile and environment example; README link.
- Backend: new `src/observability.cjs`, `.env.metrics.example`; four-line flag-gated registration in `src/app.js`; pinned dependency and its lockfile additions. No database/auth/student-business implementation or `.env` changes.
- Frontend: new `src/components/ObservabilityPanel.jsx`; additive cloud API function, scoped styles, Cloud Pulse inclusion and narrowly scoped Vite proxy. The user's existing `frontend/src/services/api.js` change is preserved and untouched.
- Observability: Compose profile, ignored-secret example, Prometheus config/rules/rule fixtures/empty optional targets, Grafana datasource/provider/dashboard JSON, reproducible dashboard generator and this guide. No Kubernetes deployment templates changed.

Manual acceptance after future launch: verify authenticated metrics from Docker, targets up, fresh replicas/CPU/memory, real HTTP series after browsing, Grafana login/dashboard, rule loading and Cloud Pulse reachable/alert states; stop Prometheus to verify unavailable UI without losing Kubernetes snapshots; keep academic panels unavailable until enabled. Do not run load as part of that observability check. Safe shutdown must retain named volumes. No commit or push.

Sources: [maintained Node client](https://github.com/prometheus/client_js), [Prometheus downloads](https://prometheus.io/download/), [Grafana download](https://grafana.com/grafana/download/13.2.3), [Grafana provisioning](https://grafana.com/docs/grafana/latest/administration/provisioning/).
