# Live acceptance — 20 October 2026

The one authorized local experiment was **aborted safely**, not accepted as a completed 90-second test. No second experiment was attempted. Existing implementation and academic files were preserved; only acceptance scripts, evidence and this report were added.

| Area | Result |
| --- | --- |
| Implementation checks | PASS: 20 tests, frontend lint/build, exact generated-client request checks. Existing bundle-size warning remains. |
| Step 1 live monitoring | PASS: live metrics, Deployment/HPA/pod readings and same-origin proxy work using the read-only identity. |
| Live Job execution | NOT PASSED / aborted for host-memory safety during startup. Creation, scheduling, image pull and Stop were exercised. Full-duration traffic and automatic expiration remain unverified. |
| Website interaction | PENDING: no browser tools available; no screenshots. |
| Autoscaling | NOT OBSERVED: desired/ready stayed 2/2. This was not a sustained-load capacity test. |
| Cleanup | PASS: Stop removed the owned Job/pod; repeated observations showed no generators. Temporary RBAC and local test processes are removed after evidence capture. |

## Configuration and access boundaries

Verified actual context `docker-desktop`, namespace `default`, Deployment `cloudnest-frontend`, Service `cloudnest-frontend-service` port 80 (`app=cloudnest-frontend`), HPA `cloudnest-frontend-hpa`. HPA min/max 2/6, target CPU 50%, scale-down stabilization 60 seconds. Its complete spec before/after is identical in `evidence.json`; Deployment generation stayed 24. No manual scaling, threshold changes, Kubernetes reset, or public exposure.

Only the ServiceAccounts, Roles and RoleBindings from the two feature templates were created temporarily (all were absent beforehand). No monitoring/controller Deployment, Service or Ingress was applied. The documented npm entrypoints ran locally, with credential-free KUBECONFIG files pointing to `kubectl proxy --context docker-desktop --as=system:serviceaccount:default:<feature-account>` listeners on 127.0.0.1. Thus each service used its own namespace Role, not the operator identity's broad permissions. Monitoring had get/list only; controller had namespace Job creation, named Job get/patch/delete, and pod list. Live `auth can-i` denied controller Deployment patches, pod deletion and Secret reads, and denied monitoring Job creation.

All listeners were verified on 127.0.0.1. A targeted loopback Service port-forward supplied frontend health probes because the existing localhost NodePort was unreachable. No credential/token/certificate values were exported or written. Local proxy kubeconfigs contain no authentication material. Production-mode CLI with local opt-in still returned 503 `CONTROLS_DISABLED`. Cross-origin Start returned 403, over-cap Start 400, and monitoring POST 405; none created another Job.

## Job and measurements

Experiment `234bb5fd-1931-462c-be5b-0317c3a77c0e`, Job `cloudnest-frontend-traffic`, pod `cloudnest-frontend-traffic-s9qvl`.

Configured request: **90 seconds, concurrency 4**, fixed target `http://cloudnest-frontend-service.default.svc.cluster.local:80/`. Image `node:24.12.0-alpine`; one Job/pod; Job and Pod deadlines 105 seconds; requests 50m CPU/32Mi, limits 250m/96Mi; backoff 0, restart Never, TTL 600 seconds, token automount false, distinct ownership labels. The observed live spec is preserved in the evidence. Ownership checks, UID-precondition foreground deletion and dependent-pod cleanup were exercised through the actual controller endpoint, via Vite.

| Reading | Baseline | Peak observed |
| --- | ---: | ---: |
| Frontend summed CPU | 0.163 mCPU | 8.188 mCPU |
| HPA CPU utilization | 2% | 9% |
| Deployment desired replicas | 2 | 2 |
| Deployment ready replicas | 2 | 2 |

Peak CPU/HPA readings include delayed metrics sampled **after Stop**. During pre-stop polling, CPU peaked at 0.195 mCPU and HPA remained 2%. These are genuine observations, not a measured sustained-load result. `evidence.json` includes per-pod sample timestamps/windows and the entire observation series.

Times below are IST (UTC+05:30); JSON preserves UTC:

- Requested: **22:25:40.624** (16:55:40.624Z).
- Safety trigger observed: **22:25:52.483**. Host free RAM dropped to **1,255 MiB / 7.9%**, crossing the conservative 8% stop threshold. Baseline was 1,787 MiB. Kubernetes Memory/Disk/PID pressure conditions remained False; Ready stayed True. This was a host-memory safety abort, not a Kubernetes pressure alarm or frontend outage.
- Stop requested: **22:25:53.364**, about **12.74 seconds after the request**.
- Image pull succeeded in 12.108 seconds. Events show Container Started and Killing both at **22:25:54**. The last pre-stop container status was ContainerCreating. Actual traffic duration is unmeasured; no exact running/termination timestamps or traffic statistics were captured. Do not report this as 90 seconds of traffic or claim zero requests.
- Cleanup confirmed: **22:25:57.240**, about **16.62 seconds after request**; controller state stopped, cleanup complete, no generators.
- Continued observing through **22:28:10.899**: about **134 seconds after cleanup**, longer than the existing 60-second stabilization window. Ready/desired remained 2/2, HPA returned to 2%, and no generators reappeared.

All sampled frontend `/health` probes returned 200; application pod restart counts were unchanged (2 and 1). Academic backend `http://localhost:8000/api/health` was unreachable during checks; it was not started or changed. Academic functionality was not claimed as tested.

## Why autoscaling was not observed

Metrics were available with complete pod coverage. HPA conditions remained AbleToScale=True/ReadyForNewScale and ScalingActive=True/ValidMetricFound; ScalingLimited=True/TooFewReplicas indicated recommendations below the minimum. Peak observed HPA utilization (9%) was below its unchanged 50% target. The generator was stopped around container startup, so this does not establish how the workload behaves under 90 seconds of traffic. A log read just before Stop returned ContainerCreating; the generator intentionally exposes no request/latency statistics. Events confirm image-pull success rather than an image error.

No second experiment is authorized by this acceptance run. Before considering a separately authorized rerun, restore host memory headroom and run the existing checks/build before load rather than alongside startup. Do not change CPU requests, HPA targets or replica limits. The existing image is now pulled, but no assumption about a future result is justified.

## Manual browser acceptance still pending

Use startup commands in `../../README.md`; start the existing academic backend using its own documented setup without changing credentials or authorization. The temporary acceptance identities/proxies are removed, so the saved loopback kubeconfigs alone will not work until the documented temporary setup is deliberately recreated.

1. Open Cloud Pulse at desktop and narrow widths; verify readable baseline, real pods, CPU/HPA values and keyboard/reduced-motion behavior.
2. Verify login, Admin, Tasks and Exams navigation with the academic backend running.
3. Only after fresh load authorization and restored memory headroom: confirm the approved bounds, Start through the dialog, distinguish generator/application pods, then Stop or observe deadline expiration.
4. Confirm no owned generators remain and observe the unchanged HPA through stabilization. Do not fabricate scaling if it stays at 2.

Evidence: `evidence.json` (observations, Job spec/status, pod startup status, Stop/cleanup envelopes, image/start/kill events, resource checks and unchanged HPA spec). No screenshots were possible. No feature code was changed, committed or pushed.

Final cleanup verification: all six temporary ServiceAccount/Role/RoleBinding objects were removed with UID/resourceVersion preconditions. All seven verified loopback test listeners (4100, 4101, 4102, 5173, 18001, 18002, 18080) were stopped. Kubernetes queries returned no owned generator Jobs or pods. Final frontend Deployment remained 2/2 ready/updated/available, and HPA remained 2 replicas with 2%/50% CPU and bounds 2–6. `git diff --check` passed. Only acceptance artifacts were added in this turn; no existing feature or academic source was edited.
