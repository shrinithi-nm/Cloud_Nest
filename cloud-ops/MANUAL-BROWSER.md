# Local capacity and manual browser preparation — 20 October 2026

Read the latest acceptance report at `acceptance/2026-10-20/REPORT.md` alongside this report. That experiment was stopped for host-memory safety; it did not complete 90 seconds of traffic. No load was generated during this diagnosis. No existing processes/containers were stopped, no Kubernetes objects were changed, and no HPA settings, resources, volumes or Docker allocations were changed. Existing application source and uncommitted changes were preserved. Only this document and an unapplied read-only RBAC bundle were added.

## Capacity observed now

| Layer | Observation | Meaning |
| --- | --- | --- |
| Windows host | 15,814 MiB total (~15.44 GiB); available sampled at 1,950 MiB then 1,499 MiB (12.3% then 9.5%) | Limited and fluctuating actual host headroom, even without test traffic |
| Docker/WSL runtime | 14 logical CPUs; 8,030,720,000 bytes (~7.48 GiB) visible memory | Effective Linux runtime ceiling, not extra physical RAM outside Windows |
| WSL Linux memory | MemAvailable 4,173,116 KiB (~3.98 GiB); swap ~2 GiB, mostly unused | Includes Linux-reclaimable cache; shares the same physical machine. Not a guarantee Windows can provide another 4 GiB |
| Kubernetes node | Capacity/allocatable 7,842,500 KiB (~7.48 GiB), 14 CPU; observed 887 MiB / 234m CPU | Node working-set usage is light. Ready=True; Memory/Disk/PIDPressure=False |
| Application pods | Two Ready/Running frontend pods, ~12Mi and 15Mi; no generators | CloudNest frontend itself is small at idle |
| Other Docker workload | `oracle-free`, healthy; ~2.40–2.44 GiB, 3.7–6.6% CPU in Docker stats | An unrelated Oracle database shares the Docker/WSL memory pool |

Docker Desktop uses the running `docker-desktop` WSL2 distribution; Ubuntu-24.04 was stopped. Docker context is `desktop-linux`; Kubernetes context is `docker-desktop`. No explicit WSL memory/CPU override was observed. The Docker settings file exposed KubernetesEnabled=True but did not expose explicit memory/CPU allocation overrides among the inspected numeric/boolean fields; runtime totals above are the reliable effective values. Oracle has no explicit container memory/CPU cgroup cap (`HostConfig.Memory=0`, `NanoCpus=0`), so its ceiling is the shared Docker pool.

`docker ps` exposes Oracle as the running ordinary container, plus a stopped standalone `cloudnest-frontend:1.0` container (Exited 255, two weeks ago). That stopped container consumes no active RAM and need not be deleted. Engine summary counters also include managed containers that this CLI listing did not expose; Kubernetes workloads were inspected separately. Kubernetes has the frontend Deployment, CoreDNS, metrics-server, local-path provisioner, kindnet/kube-proxy DaemonSets, and control-plane pods (API server, etcd, scheduler and controller manager). All listed pods were Running; the largest measured system pod was the API server (~273 MiB), then etcd (~114 MiB).

Windows process-group working sets: vmmemWSL ~2,287 MiB; Chrome ~1,778 MiB across 16 processes; VS Code ~1,418 MiB across 14; WebView2 ~1,217 MiB across 22; Comet ~608 MiB across 17. These are approximate working sets, can include shared pages, and must not be added to Docker/VM readings as independent memory. VM private/committed bytes (~7.6 GiB) are not its resident working set (~2.2 GiB).

No Node development processes or listeners on 4100/4101/5173/8000 were present. No duplicate CloudNest development servers were found. Local PostgreSQL 17 is running on 5432, with seven normal worker processes totaling only ~15 MiB working set; those workers are not duplicate database installations. Feature ServiceAccounts removed by the previous acceptance test are still absent. The Kubernetes frontend replicas are expected Deployment replicas, not duplicate development servers.

## Optional manual closures — nothing was terminated

- Unused Chrome/Comet tabs or windows: browser renderers collectively use substantial RAM; close through the browser UI after saving needed work.
- Unneeded VS Code windows/extensions: VS Code is an Electron multiprocess application; 14 processes does not mean 14 editor windows. Keep this workspace open if needed and close other work manually.
- Teams, WhatsApp and other optional embedded-browser windows: WebView roots included Teams, WhatsApp and Windows Search; do not kill all WebView processes indiscriminately or terminate Search/security services.
- `oracle-free`, **only if you are not using that database for other work**: it is the largest optional container and is not CloudNest's PostgreSQL backend. Use Docker Desktop's Stop control manually if appropriate. Do not delete its container data/volumes or prune resources.
- Keep Docker Desktop/Kubernetes running for Cloud Pulse, PostgreSQL for academic APIs, and Windows security/system services. No blanket WSL shutdown is appropriate here.

## Headroom judgment

- Existing Cloud Pulse: **feasible but marginal**, for a single browser session with read-only monitoring and Vite. Avoid concurrent builds and unnecessary tabs; watch Windows available memory. This is not a measured guarantee of stable future usage.
- Another bounded test: **not currently advisable and not authorized**. Idle headroom is close to the previous stop threshold. First close optional workloads manually, then remeasure stable host and Linux availability. Several GiB of stable Windows headroom (for example 3–4 GiB) would provide a more comfortable operational margin; that is a planning judgment, not a tested requirement.
- Prometheus/Grafana: **defer on the current machine state**. Retention, scrape volume and deployment limits are not specified; idle Kubernetes capacity alone does not establish host capacity for the stack. Nothing was installed.

## Why raw pod CPU differs from HPA CPU

At collection time 17:05:15.167Z (22:35:15.167 IST):

| Pod suffix | Metric timestamp (UTC) | Window | Raw CPU | Converted CPU |
| --- | --- | --- | --- | --- |
| b7rmd | 17:05:04Z | 11.794s | 79107n | 0.079107 mCPU |
| glwwd | 17:05:07Z | 12.215s | 74826n | 0.074826 mCPU |

The sum was 0.153933 mCPU. Each pod requests 50m CPU; the total request is 100m. A direct division of those fractional readings is ~0.154% of requests, while the observed HPA reported `averageValue: 1m` and `averageUtilization: 2`.

There are two distinct effects. The HPA metrics client converts container resource quantities through integer `MilliValue()`, which rounds positive fractional millicores up; a sub-1m reading can become 1m, and 1m / 50m = 2%. This is consistent with the observed low-idle difference. Also, pod metrics have their own sample windows/timestamps; HPA evaluates on a separate reconciliation schedule (default 15 seconds) and does not expose its CPU sample timestamp in this status object. HPA condition transition times record condition changes, not metric sampling. The UI refresh/cache times are yet another clock. Do not compare these as simultaneous samples or relabel mCPU as percent.

Primary references: [HPA resource metric conversion](https://github.com/kubernetes/kubernetes/blob/master/pkg/controller/podautoscaler/metrics/client.go), [Quantity MilliValue rounding](https://github.com/kubernetes/apimachinery/blob/master/pkg/api/resource/quantity.go), [HPA polling and utilization basis](https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/).

## Exact manual startup from the repository root

No services were left running by this diagnosis. Commands below prepare a **read-only** session, not another load experiment. Existing dependencies are installed; `npm ci --prefix .\cloud-ops` and `npm ci --prefix .\frontend` are only needed if dependencies are missing, and should be run before browser verification.

### One-time read-only identity restoration

The newly prepared `cloud-ops/browser-monitor-rbac.json` contains only the monitoring ServiceAccount, read-only Role and RoleBinding from the existing Step 1 template. It has not been applied. It contains **no controller write permissions, Deployment, Service or Ingress**. From the root:

```powershell
kubectl config current-context
# Expected: docker-desktop. All following kubectl commands pin that context.
kubectl --context docker-desktop create -f .\cloud-ops\browser-monitor-rbac.json
kubectl --context docker-desktop auth can-i create jobs -n default --as=system:serviceaccount:default:cloudnest-cloud-ops
# Expected: no
```

If create reports AlreadyExists, inspect the existing identity/Role instead of overwriting it blindly. Do not apply `acceptance/.../temporary-rbac.json` or the Step 2 controller template: manual read-only browser verification does not need load-controller RBAC.

### Terminal 1 — scoped loopback Kubernetes proxy

```powershell
kubectl --context docker-desktop --as=system:serviceaccount:default:cloudnest-cloud-ops proxy --address=127.0.0.1 --port=18001
```

This uses the operator's existing connection only to impersonate the restricted monitoring identity. No credentials are copied or exported. The existing credential-free `acceptance/2026-10-20/monitor.kubeconfig.json` points to this proxy and names its context docker-desktop; it will not work without the proxy and restored read-only RBAC.

### Terminal 2 — monitoring service

```powershell
$repoRoot = (Get-Location).Path
$env:KUBECONFIG = Join-Path $repoRoot 'cloud-ops\acceptance\2026-10-20\monitor.kubeconfig.json'
$env:KUBE_CONTEXT = 'docker-desktop'
$env:KUBE_NAMESPACE = 'default'
$env:KUBE_DEPLOYMENT = 'cloudnest-frontend'
$env:KUBE_POD_SELECTOR = 'app=cloudnest-frontend'
$env:KUBE_HPA = 'cloudnest-frontend-hpa'
$env:PORT = '4100'
Remove-Item Env:KUBE_MODE -ErrorAction SilentlyContinue
Push-Location .\cloud-ops
npm start
```

### Terminal 3 — disabled controller (clear disabled state in the UI)

```powershell
$env:CLOUD_LOAD_ENABLED = 'false'
$env:CONTROLLER_PORT = '4101'
Push-Location .\cloud-ops
npm run controller
```

This disabled process does not create a Kubernetes client and needs no controller identity. **Do not set CLOUD_LOAD_ENABLED=true.** Production mutation authorization remains unconfigured and disabled.

### Terminal 4 — frontend

```powershell
npm run dev --prefix .\frontend
```

Open `http://127.0.0.1:5173/login`, use the existing Admin UI flow, then `/admin/cloud`. The current login is a browser-local role/session flow, not verified backend administrator authorization. Preserve that interface for this manual review; it does not authorize production mutations. The standalone cluster frontend remains an older deployed build; use the Vite address to inspect the current Cloud Pulse source. No deployment/rebuild of the cluster image is needed.

### Terminal 5 — endpoint checks (no Start requests)

```powershell
Invoke-RestMethod http://127.0.0.1:4100/healthz
Invoke-RestMethod http://127.0.0.1:5173/api/cloud/snapshot
# Disabled status returns HTTP 503 and CONTROLS_DISABLED; this is expected.
curl.exe -i http://127.0.0.1:5173/api/cloud/experiment
kubectl --context docker-desktop get pods -n default -l app=cloudnest-frontend
```

All listeners use loopback only. Keep this local session untunneled. Use Ctrl+C in each terminal when finished; those commands do not stop unrelated applications. The read-only identity can remain for later reviews or be removed deliberately with only its three named RBAC objects after stopping the proxy. The controller write identity remains absent.

## Academic backend requirements and confirmed blockers

The backend has no `.env` file, no Node server/listener on 8000/5000, and all expected dependencies are installed. A direct auth-module load confirmed its startup guard exits for missing `JWT_SECRET`. Missing configuration names (values deliberately not read out): **DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, JWT_SECRET**. **PORT** is also unset; it is optional in code but needs alignment for this local setup.

PostgreSQL 17 is already running on 5432. Its presence does not establish correct database credentials, database/schema existence, or academic API authorization. The schema/seed scripts must not be applied blindly to an existing database. Obtain the existing project's database settings and JWT secret from the teammate and configure them locally in `backend/.env` without sharing/committing them. Do not invent credentials or change auth to bypass missing configuration.

The backend defaults to 5000; the existing frontend API base URL resolves to localhost:8000. Keep the frontend client unchanged and explicitly run the backend at 8000 after its environment is supplied:

```powershell
# From a fresh terminal at repository root, after private backend configuration exists:
$env:PORT = '8000'
Push-Location .\backend
npm start
```

From another terminal:

```powershell
Invoke-RestMethod http://localhost:8000/api/health
# Optional read-only database connectivity check; do not paste raw diagnostic responses publicly.
Invoke-RestMethod http://localhost:8000/api/db-test
```

No backend credentials or schema were inspected, changed or fabricated. Backend-dependent academic acceptance remains blocked until configuration is supplied. The UI's browser-local login alone is not evidence of working authenticated academic APIs; record failures for the auth/API owner rather than weakening authorization.

## Five-minute browser checklist — no load

1. **0:00–1:00:** Open Vite `/login`, use existing Admin UI flow, open Cloud Pulse. Confirm workload default/cloudnest-frontend, Connected/partial status, advancing successful-update time, and Start/Stop disabled. Do not start traffic.
2. **1:00–2:00:** Compare 2 ready/2 desired against kubectl; verify real pod names, Running versus Ready, restart counts, memory units and metric sample times. HPA percent need not match raw fractional mCPU at the same apparent refresh.
3. **2:00–3:00:** Wait for real chart observations, use Refresh and keyboard-operate Events/Experiment details. Resize to desktop/narrow widths and check text, focus, contrast, overflow and reduced-motion preference. Do not expect new pods or scaling at idle.
4. **3:00–4:00:** If desired, stop **only your monitoring npm terminal** with Ctrl+C to simulate connection loss; wait for stale data/error, then restart that same process and confirm recovery. Leave Kubernetes and other applications untouched.
5. **4:00–5:00:** Logout/login and check Admin navigation; use the existing Student UI flow for Tasks and Exams. Backend-related acceptance is pending until its configuration/startup blockers are resolved. Record errors without exposing tokens or credentials.

No browser tool is available, so layout/interaction verification and screenshots remain pending. Static inspection found no confirmed Cloud Pulse defect warranting source edits. All 20 cloud-ops tests and frontend lint pass; no production build was repeated because application code did not change and the prior build passed. Nothing was committed or pushed.
