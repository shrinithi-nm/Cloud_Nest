# CloudNest Cloud Pulse — Steps 1, 2 and 3

Step 3 adds metrics, fixed-query observability, and deferred Prometheus/Grafana provisioning. See [observability/README.md](../observability/README.md) for configuration, metrics, alert rules and validation status. The following Step 1/2 implementation notes are historical; the latest acceptance report records a safely aborted test and verified cleanup. Do not launch the observability stack under the current memory constraint.

Read-only monitoring, independent of PostgreSQL and the academic backend. The existing `/admin/cloud` route and admin layout are retained. No auth, academic, scaling-page, or shared CSS changes. The older Autoscaling page remains a static page outside this step; its historical claims are not observations supplied by this service.

## Step 1 monitoring startup (Step 2 controller commands below)

Node 24 or newer is required. Docker Desktop Kubernetes and resource metrics should be running. These commands do not apply manifests or change the cluster.

Terminal 1:

```powershell
npm ci --prefix .\cloud-ops
# Optional: copy once, then edit placeholders/configuration as needed.
Copy-Item .\cloud-ops\.env.example .\cloud-ops\.env
Push-Location .\cloud-ops
npm start
Pop-Location
```

Terminal 2:

```powershell
npm ci --prefix .\frontend
npm run dev --prefix .\frontend
```

Open `http://127.0.0.1:5173`, sign in with an existing admin account, and open Cloud Pulse. The existing backend must run separately for login/academic APIs. Keep the existing frontend `.env` and `VITE_API_URL`; do not overwrite it. The added frontend example is placeholders only. Port 5173 is fixed to match the monitoring origin allowlist. Only `/api/cloud/snapshot` is proxied to port 4100; existing academic API routing is unchanged.

Configuration: `PORT` (4100), `KUBE_NAMESPACE` (default), `KUBE_DEPLOYMENT` (cloudnest-frontend), `KUBE_POD_SELECTOR` (app=cloudnest-frontend), `KUBE_HPA` (cloudnest-frontend-hpa). Local mode loads standard kubeconfig, including `KUBECONFIG` support. `KUBE_CONTEXT` optionally selects an explicit context without changing kubeconfig. `KUBE_MODE=in-cluster` loads a ServiceAccount and binds all container interfaces; never use that mode for an exposed standalone server. Configuration-load failures produce unavailable sections; restart after fixing configuration.

## HTTP contract

`GET /healthz`: 200 `{ "status": "ok", "service": "cloudnest-cloud-ops" }`. Process liveness only; does not claim cluster health.

`GET /api/cloud/snapshot`: 200 JSON, including partial or entirely unavailable cluster results. Transport/internal collection failure returns 503 with a generic error. The monitoring process accepts no arbitrary query strings, paths or write methods; Step 2 mutations use a separate process. Error statuses: 403 host/origin denial, 404 unknown path, 405 non-GET.

```json
{
  "observedAt": "2026-10-20T12:00:00.000Z",
  "source": {
    "type": "kubernetes",
    "namespace": "default",
    "deployment": "cloudnest-frontend",
    "podSelector": "app=cloudnest-frontend",
    "hpa": "cloudnest-frontend-hpa"
  },
  "availability": "partial",
  "sections": {
    "deployment": { "availability": "available", "data": { "name": "cloudnest-frontend", "desired": 2, "updated": 2, "ready": 2, "available": 2, "generation": 1, "observedGeneration": 1 }, "error": null },
    "pods": { "availability": "available", "data": [], "error": null },
    "metrics": { "availability": "unavailable", "data": null, "error": { "code": 403, "message": "Kubernetes reading unavailable; check connectivity, RBAC and resource configuration." } },
    "hpa": { "availability": "unavailable", "data": null, "error": { "code": 404, "message": "Kubernetes reading unavailable; check connectivity, RBAC and resource configuration." } },
    "events": { "availability": "available", "data": [], "error": null }
  }
}
```

The sample illustrates the schema only, not live fallback data. Each section has `availability` (`available`, `partial`, `unavailable`), `data`, and `error`. Unavailable data is null. The root availability summarizes all five sections.

- Deployment: desired, updated, ready, available, generation and observedGeneration. Omitted Kubernetes replica status counts mean zero; unavailable Deployment reads never become zero.
- Pods: UID, name, phase, Ready condition, regular/init-container restart count, creation and deletion timestamps. Running does not imply Ready. List capped at 200; continuation is reported as partial.
- Metrics: per-pod `cpuMillicores`, `memoryBytes`, resource sample `timestamp` and `window`; aggregate totals, `coverage`, `totalPods` and `basis`. Containers are summed. Missing/invalid quantities are null. Aggregate totals are null if coverage is incomplete or the pod list is unavailable/truncated. CPU usage in mCPU is separate from HPA utilization percentages. Quantities support decimal SI, binary SI and scientific notation.
- HPA: min/max, current/desired replicas, current/target CPU utilization as percentages of CPU requests, and typed conditions. Missing CPU values are null, not zero.
- Events: at most 30 matching Pod/Deployment/HPA events from the last hour, sorted by actual event time. Namespace query is bounded at 200 and reports continuation as partial; a truncated query may omit relevant events. Event output includes UID, time, type, reason, resource, message and count. Deleted pods no longer in the selected pod list are not included. Intermediate ReplicaSet events are not queried.

Queries run concurrently with 3.5-second abort deadlines (including response body reads). Shared cache TTL is four seconds and concurrent callers share one collection. `observedAt` is collection completion time, not metrics sampling time. History exists **only in the browser session**, capped at 60 successful Deployment observations; no durable storage or history endpoint. Chart spacing uses actual timestamps. Polling starts around five seconds with no overlap and exponential backoff capped at 30 seconds. Unmount cancels fetches. Failed whole snapshots retain previous values with a visible stale label. Partial failures show explicit unavailable sections. No random data or fixture fallback is served.

## Security and teammate integration

Local binding is always `127.0.0.1`. The service checks local Host, browser Origin and cross-site fetch metadata, and sends no permissive CORS headers. Local mode is a developer convenience and **does not establish production administrator authorization**. The existing React admin route is a UI gate only. Do not expose Vite with a tunnel or external bind while using this unauthenticated proxy.

For production, the auth owner must add a same-origin server-side `GET /api/cloud/snapshot` route on the existing backend/gateway. Apply the existing `authenticate` middleware and `requireRole('admin')` before forwarding a fixed GET to the internal monitoring process. Preserve the existing JWT verification contract and role checks. The separate cloud client must then attach the existing session bearer token if that backend contract requires it; do not change academic interceptors. Return 401/403 for unauthorized callers. Never forward arbitrary resource paths or browser-supplied upstream URLs. Do not trust browser role claims or an unsigned header as service authentication. No reusable secret belongs in `VITE_*`.

`kubernetes/cloud-ops.template.yaml` supplies a ServiceAccount, namespace Role/RoleBinding, non-root Deployment, and deny-all ingress NetworkPolicy. There is **no Service or Ingress**. The image is a placeholder. Before using this template, provide an enforced NetworkPolicy allowing only the reviewed authenticated gateway, plus its internal routing. NetworkPolicy requires a supporting CNI; do not deploy this unauthenticated process without network isolation. Cluster credentials, environment variables, Deployment pod templates and raw upstream errors are never returned. Kubernetes event messages are cluster-generated operational text; restrict this endpoint to admins.

The Role grants only named Deployment/HPA reads and namespace pod/event/metrics lists. Kubernetes native RBAC cannot constrain list operations by label; the service applies fixed selectors and never accepts user resource parameters. Prefer a dedicated workload namespace to narrow list visibility. No secrets, logs, exec, delete, patch, scale or load-generation permissions are granted. No manifests were applied.

Client API verification: pinned `@kubernetes/client-node` 2.0.0, checked installed object-parameter API declarations and `RequestContext.setSignal`/HTTP transport implementation. Official client reference: https://github.com/kubernetes-client/javascript . The installed 2.0.0 release does not expose the newer documented timeout helper, so the transport attaches `AbortSignal.timeout` directly.

## Verification and changed files

```powershell
npm test --prefix .\cloud-ops
npm run lint --prefix .\frontend
npm run build --prefix .\frontend
Invoke-RestMethod http://127.0.0.1:4100/healthz
Invoke-RestMethod http://127.0.0.1:4100/api/cloud/snapshot
kubectl get deployment cloudnest-frontend -n default --request-timeout=4s
kubectl get pods -n default -l app=cloudnest-frontend --request-timeout=4s
kubectl top pods -n default -l app=cloudnest-frontend --request-timeout=4s
kubectl get hpa cloudnest-frontend-hpa -n default --request-timeout=4s
```

Live read-only verification on 20 October 2026: Deployment desired/ready/updated/available all 2; two Running and Ready pods; HPA current/desired 2, bounds 2–6, CPU current/target 2%/50%. Snapshot pod memory was approximately 12.3 and 15.4 MiB, agreeing with `kubectl top` rounded readings of 12Mi and 15Mi. `kubectl top` rounds very small CPU readings upward to 1m; raw metrics snapshot values retain sub-millicore precision. Metrics are sampled independently, so adjacent queries may vary.

Tests cover quantities, multi-container totals, missing metrics, partial/all failures, redacted raw errors/Deployment secrets, caching, event filtering/truncation and read-only HTTP boundaries. Frontend build and existing lint pass; build reports the large bundle warning. No browser automation tool is available, so desktop/narrow visual inspection and authenticated academic-page smoke checks remain manual. Existing auth, routes and academic service files were unchanged.

Changed files: `frontend/src/pages/CloudPulse.jsx`, new scoped `CloudPulse.css`, `frontend/src/services/cloudApi.js`, `frontend/vite.config.js`, `frontend/.env.example`; new `cloud-ops/` package, lockfile, source modules, tests, Dockerfile, ignore files, environment example and this guide; new `kubernetes/cloud-ops.template.yaml`.

## Manual acceptance checklist

- [ ] Live snapshot loads in Cloud Pulse for an existing admin.
- [ ] Pod counts match Kubernetes.
- [ ] Missing metrics show unavailable (use a test environment or fixture tests; do not disrupt the live cluster).
- [ ] Cluster disconnection marks retained data stale.
- [ ] Existing academic pages still work.
- [ ] Desktop and narrow layouts, keyboard details/refresh controls, and reduced-motion preference work.

Final HTTP smoke check: the actual monitoring HTTP handler returned 200 from `/healthz` and `/api/cloud/snapshot`, with all five sections available and two observed pods. The temporary test listener was closed afterward. Six monitoring tests pass.

# Step 2 — bounded frontend traffic experiments

This extends Cloud Pulse with a compact **Frontend traffic test** panel. It measures frontend Service traffic and observed CPU/HPA/replica behavior. It does **not** establish authenticated-student counts, backend/database capacity, request success rates or latency. Static-file traffic may not trigger scaling within these conservative bounds; no replicas or HPA settings are changed to manufacture a result.

## Processes and local startup (PowerShell from repository root)

Node 24+, the existing Docker Desktop cluster, and the frontend Service are required. Keep the existing academic backend running as before. Install once:

```powershell
npm ci --prefix .\cloud-ops
npm ci --prefix .\frontend
```

Terminal 1 — unchanged read-only monitor:

```powershell
Push-Location .\cloud-ops
npm start
```

Terminal 2 — separate controller, disabled by default:

```powershell
Push-Location .\cloud-ops
npm run controller
```

Terminal 3 — existing frontend:

```powershell
npm run dev --prefix .\frontend
```

Open `http://127.0.0.1:5173/admin/cloud` with the existing admin UI session. Without local opt-in, controller status returns `CONTROLS_DISABLED`; Start/Stop remain disabled. The existing frontend session stores a browser-selected role and is **not verified production administrator authorization**. This implementation deliberately does not modify that teammate-owned flow.

To enable **local development only**, stop the controller with Ctrl+C, then restart Terminal 2 from the repository root:

```powershell
$env:CLOUD_LOAD_ENABLED = 'true'
# Optional: a separate restricted kubeconfig context, not a secret.
# $env:KUBE_CONTROLLER_CONTEXT = 'YOUR_RESTRICTED_LOCAL_CONTEXT'
Push-Location .\cloud-ops
npm run controller
```

Enabling controls does not start traffic. A website confirmation is required for each explicit Start action. Keep all processes loopback-only, do not tunnel/expose Vite, and do not run local opt-in in production. Stop the controller with Ctrl+C and remove the opt-in when done:

```powershell
Remove-Item Env:CLOUD_LOAD_ENABLED -ErrorAction SilentlyContinue
```

Existing Jobs continue to obey their independent deadlines if this process/browser closes. Disabling controls does not itself stop an existing Job; use Stop first when possible. Local kubeconfig may grant cluster-admin capabilities beyond this feature. The implementation only operates on the fixed Job and configured namespace; the included production Role narrows the deployed identity separately.

Configuration additions in `cloud-ops/.env.example`:

| Variable | Default | Meaning |
| --- | --- | --- |
| `CLOUD_LOAD_ENABLED` | `false` | Explicit local-only opt-in |
| `CONTROLLER_PORT` | `4101` | Separate controller listener |
| `KUBE_FRONTEND_SERVICE` | `cloudnest-frontend-service` | Server-configured Service name |
| `KUBE_CONTROLLER_CONTEXT` | blank | Explicit controller kubeconfig context; falls back to `KUBE_CONTEXT`, then current context |
| `KUBE_NAMESPACE` | `default` | Existing namespace configuration, shared with monitoring |

The Service target is always `http://<configured-service>.<namespace>.svc.cluster.local:80/`. Port 80, path `/`, HTTP GET, generator image and source are fixed in server code. Namespace and Service names must be DNS labels. Browser bodies cannot specify URL, target, image, commands, headers, paths or Kubernetes resources. Redirects are not followed by the generator. Existing manifests and live read-only discovery confirmed the frontend Service name, port 80 and selector `app=cloudnest-frontend`; HPA remains 2–6 replicas, CPU target 50%.

## Experiment bounds and lifecycle

- Duration: integer **10–120 seconds**, default **30**.
- Concurrency: integer **1–16**, default **4**, independently running request workers in one generator container.
- Each HTTP request has an absolute **2-second** timeout; workers pause 10ms between attempts.
- Generator image: **`node:24.12.0-alpine`**, pinned Node patch-version tag. Docker Hub/image-pull access is required unless cached. Production should resolve/review a digest before release; a version tag is not an immutable digest. No npm dependencies or large load-test platform are installed in the Job. Image pull/runtime compatibility is pending live verification.
- Generator: CPU request/limit **50m/250m**, memory **32Mi/96Mi**, non-root user, read-only root filesystem, dropped capabilities, no ServiceAccount token mount.
- One Job/one pod (`parallelism: 1`, `completions: 1`, `backoffLimit: 0`, `restartPolicy: Never`). `activeDeadlineSeconds = duration + 15` at **both Job and Pod levels**, at most **135 seconds** including startup overhead. The script also exits on its own duration timer and on SIGTERM. None depends on browser/process-memory timers.
- Kubernetes TTL: **600 seconds after Complete/Failed**, where the TTL controller is supported. The fixed Job name prevents another experiment while retained metadata or cleanup exists; click **Clean up Job** before starting another, or wait for TTL removal.
- The fixed name **`cloudnest-frontend-traffic`** is the Kubernetes atomic lock across controllers. Starts are serialized in-process and reconciled by UUID after create conflicts/ambiguous responses. Repeating the same ID/controls returns the existing experiment. Reusing an ID with different controls conflicts. A different experiment receives 409 while the slot is occupied.
- Active/recent visibility is reconstructed from the reserved Job, feature labels, annotations, owner references and pod status. After metadata is garbage-collected, durable experiment history is **not** promised: the controller retains at most the last record in process memory, and UI markers are browser-session only. Do not replay old Start requests after garbage collection/restart as a durable idempotency mechanism.
- Stop first suspends the owned Job with UID/resourceVersion JSON Patch tests, then foreground-deletes it with a UID precondition. Job suspension and cascading deletion terminate its dependent generator pods; no application pods are deleted. The response reports stopping/pending until deletion is observed, and only reports stopped/complete once the Job and live generator pods are absent. Retry Stop if patch/deletion fails. Deadline safety remains independent of cleanup.
- Pods with unrecognized feature ownership, truncated discovery, a mismatched target, namespace or reserved Job ownership block mutations. There is no pod-delete endpoint or pod-delete permission. Orphaned live generator pods block new starts while Kubernetes cleanup/deadlines take effect.

Elapsed/remaining time is approximate experiment time from observed Job start and may include image-pull/scheduling delay. Pending generator pods are labeled Pending rather than Running. Request/error/latency statistics are intentionally omitted; no unsupported performance claims are shown. Start/stop/end markers use actual server/Kubernetes observation timestamps on the existing browser-session replica chart. The UI states **“Load stopped; observing scale-down”** only after termination is observed; scale-down is subject to real HPA conditions and stabilization.

## Controller HTTP contract

The controller has its own `/healthz` and three exact experiment routes. Vite proxies only `/api/cloud/experiment...` to `127.0.0.1:4101`; `/api/cloud/snapshot` continues to go to the read-only process on port 4100. No academic API client/interceptor changes.

- `GET /api/cloud/experiment` — observed current/recent experiment, controls and bounds.
- `POST /api/cloud/experiment/start` — JSON `{ "experimentId": "<UUID v4>", "durationSeconds": 30, "concurrency": 4 }`.
- `POST /api/cloud/experiment/stop` — JSON `{ "experimentId": "<UUID v4>" }`. Explicit ID prevents a stale tab stopping a replacement experiment.

Local mutations require `Content-Type: application/json` and an explicit allowed `Origin` (`http://127.0.0.1:5173` or `http://localhost:5173`). Unknown JSON fields, non-integer bounds, arbitrary targets, untrusted Host/Origin and cross-site requests are rejected. Bodies are limited to 2 KiB; HTTP requests and Kubernetes calls have deadlines. There are no permissive CORS headers. Requests are never automatically retried as POSTs by the UI.

Successful status/start/stop envelope:

```json
{
  "observedAt": "2026-10-20T12:00:00.000Z",
  "source": { "type": "kubernetes", "namespace": "default", "service": "cloudnest-frontend-service" },
  "availability": "available",
  "data": {
    "enabled": true,
    "bounds": { "minDuration": 10, "maxDuration": 120, "defaultDuration": 30, "minConcurrency": 1, "maxConcurrency": 16, "defaultConcurrency": 4 },
    "target": "http://cloudnest-frontend-service.default.svc.cluster.local:80/",
    "experiment": null
  },
  "error": null
}
```

When present, `experiment` includes `id`, `state`, `requestedAt`, `startedAt`, `endedAt`, `stopRequestedAt`, duration/concurrency, Job deadline seconds, `cleanup: { status, message }`, and generator pod names/phases/deletion states. States include pending, running, stopping, cleanup-pending, completed, failed, stopped, and finished (removal observed without a confirmed terminal Job result). Cleanup states include not-requested, pending, failed, retained, complete. No raw Job specs, credentials or upstream errors are returned.

Disabled/unconfigured routes return **503**, `availability: unavailable`, `data.enabled: false`, bounds, null experiment, and `error.code: CONTROLS_DISABLED`. Other errors use the same observedAt/source/availability/data/error envelope: 400 invalid controls/JSON, 403 host/origin/admin denial, 409 active/ownership/ID conflict, 413 oversized body, 415 wrong content type, 503 unconfirmed Kubernetes operation. A partial Stop failure returns 200 with `availability: partial`, `CLEANUP_FAILED`, and explicit retryable cleanup state. GET refresh failures retain the last browser view with a stale indicator.

## Separate identity, deployment and teammate auth hook

`kubernetes/cloud-load-controller.template.yaml` is a **review template only**, not applied. It supplies a separate ServiceAccount, Role/RoleBinding, non-root Deployment with controls disabled, and deny-all ingress NetworkPolicy. Build the existing `cloud-ops/Dockerfile` with Step 2 source and replace the placeholder controller image only during reviewed deployment. Start the controller with `node src/controller-server.js`; keep the Step 1 monitor on its original ServiceAccount and entrypoint. No public Service or Ingress is supplied.

Controller permissions: namespace Job create, get/patch/delete restricted to `cloudnest-frontend-traffic`, and namespace pod list. It has **no Deployment/HPA mutation, pod-delete, exec, log, Secret, ConfigMap or academic database permissions**. Native RBAC cannot restrict Job create or pod list by labels/resource name. Treat namespace Job creation as meaningful authority; production needs namespace isolation/admission policy limiting Job image, command, labels, token mounts and resources. NetworkPolicy must be enforced by the CNI; only a reviewed authenticated gateway should eventually be allowed to reach the controller.

The CLI deliberately ignores local opt-in when `KUBE_MODE=in-cluster` **or** `NODE_ENV=production`: mutations remain disabled even if `CLOUD_LOAD_ENABLED=true`. There is no environment-only production override.

The integration hook is the exported `controllerServer(controller, { enabled, production: true, authorizeAdmin, namespace })`. The teammate must supply a **server-side verification function** returning exactly `true` only for a verified admin using the existing JWT/session contract; absence/failure fails closed. The existing backend exposes `authenticate` and `requireRole('admin')`, but the current browser-only login does not establish that identity. Integrate the authenticated backend/gateway flow first without weakening student privacy. Cookie-based integration must include CSRF protection in that authorization boundary. Do not implement this hook as a browser-selected role, unsigned forwarded header, hidden button or shared VITE secret. Production also needs authenticated same-origin forwarding to the fixed internal routes and reviewed network isolation. Client bearer-token attachment, if needed by the final verified session contract, belongs only in the separate cloud client.

## Inspect and safely clean up an experiment

Read-only commands from the repository root (set `--context` to the same reviewed context if necessary):

```powershell
kubectl get job cloudnest-frontend-traffic -n default --request-timeout=4s
kubectl get pods -n default -l cloudnest.io/feature=frontend-traffic-v1 --request-timeout=4s
kubectl get deployment cloudnest-frontend -n default --request-timeout=4s
kubectl top pods -n default -l app=cloudnest-frontend --request-timeout=4s
kubectl get hpa cloudnest-frontend-hpa -n default --request-timeout=4s
```

Use the website Stop/Clean up Job control, or the same local ownership-checked endpoint below. This command can **stop an existing** experiment; it never starts one:

```powershell
$status = Invoke-RestMethod http://127.0.0.1:4101/api/cloud/experiment
if ($null -ne $status.data.experiment) {
    $body = @{ experimentId = $status.data.experiment.id } | ConvertTo-Json
    Invoke-RestMethod -Method Post `
        -Uri http://127.0.0.1:4101/api/cloud/experiment/stop `
        -Headers @{ Origin = 'http://127.0.0.1:5173' } `
        -ContentType 'application/json' -Body $body
}
```

Poll status and the generator pod selector until cleanup is complete. If cleanup fails, keep the controller running/retry Stop. A suspended Job whose deletion fails will retain metadata until a successful retry; TTL alone does not clean suspended Jobs. If ownership conflicts or a stuck finalizer prevent cleanup, stop new experiments and ask a cluster operator to inspect the exact UID/owner references; do not broadly delete pods by application label. Independent generator/Pod deadlines still bound traffic. Experiment metadata may disappear after restart/TTL, so use Kubernetes pod observation to confirm no remaining generators.

## Step 2 verification and changed files

New files: `cloud-ops/src/{generator,experiments,controller-kubernetes,controller-server}.js`, `cloud-ops/test/{experiments,generator,controller-transport}.test.js`, `frontend/src/components/ScalingExperiment.jsx`, `kubernetes/cloud-load-controller.template.yaml`.

Updated: `cloud-ops/package.json` (controller script only), `.env.example`, this README; `frontend/src/services/cloudApi.js`, `frontend/src/pages/CloudPulse.jsx`, scoped `CloudPulse.css`, and `frontend/vite.config.js`. No new dependencies or dependency lockfile churn. Step 1 source/tests/read-only RBAC, academic routes/services, database code, login, and shared CSS are preserved.

```powershell
npm test --prefix .\cloud-ops
npm run lint --prefix .\frontend
npm run build --prefix .\frontend
git diff --check
```

Twenty service tests pass (including installed-client transport requests against an isolated loopback fake API): bounds/unknown-target rejection, Job limits/deadlines/token mounting, actual concurrent generator execution with a network-free HTTP stub, duration/SIGTERM cleanup, duplicate/cross-controller starts, conflicting ID controls, restart discovery, ownership and stale-ID protection, cleanup failures/retry, orphan/truncated discovery, disabled production routes and local Origin validation, plus all six Step 1 tests. Frontend lint passes. Build passes with the existing large-bundle warning.

At Step 2 implementation verification, no live load Job had been created. Subsequent acceptance created one bounded Job but stopped it for host-memory safety; no scale-out was observed, cleanup was verified, and temporary RBAC was removed. See acceptance/2026-10-20/REPORT.md. Read-only discovery confirmed the live Service/Deployment/HPA baseline. Generator image pull, actual Job admission/scheduling, live Stop/GC behavior, and any resulting HPA scaling remain **pending runtime acceptance**. No browser tool is available; responsive/keyboard/dialog visual inspection and academic-page smoke tests remain manual. No commit or push.

## Step 2 manual acceptance sequence

1. Open Cloud Pulse, confirm the baseline CPU/HPA readings and ready/desired replicas.
2. Review the visible duration/concurrency bounds and target; enable local controls, then confirm one bounded frontend experiment.
3. Observe actual CPU, desired/ready replicas and pod transitions. Scaling is not guaranteed within the bounds.
4. Click Stop (or Clean up Job after natural completion).
5. Verify generator termination and cleanup using controller status and the feature-specific pod selector.
6. Observe eventual scale-down **if** HPA conditions permit; do not manually scale or adjust its thresholds.
7. Confirm existing academic pages still function. Also check narrow/desktop layouts, keyboard dialog/controls and reduced-motion behavior.

References: [Kubernetes Job lifecycle, deadlines and suspension](https://kubernetes.io/docs/concepts/workloads/controllers/job/), [finished Job TTL cleanup](https://kubernetes.io/docs/concepts/workloads/controllers/ttlafterfinished/), [official Node image](https://hub.docker.com/_/node).

Final read-only smoke check: the real controller API adapter discovered no existing experiment and the unchanged monitoring collector returned all sections available with 2 desired/ready/updated/available replicas and two application pods. Both YAML templates parsed; monitoring permissions remain get/list only. No cluster mutation was performed.
