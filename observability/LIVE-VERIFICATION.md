# Local monitoring runtime verification — 21 October 2026 (IST)

The existing stack was started with no load test and no PostgreSQL changes. No application login was bypassed. No browser tools are available; visual and login acceptance remain manual.

## Running setup

- Frontend: http://127.0.0.1:5173/login ; after the existing Admin login flow, http://127.0.0.1:5173/admin/cloud .
- Monitoring health: http://127.0.0.1:4100/healthz ; snapshot: http://127.0.0.1:4100/api/cloud/snapshot .
- Explicitly disabled controller: 127.0.0.1:4101, expected experiment response 503. No controller write identity restored.
- Scoped Kubernetes proxy: 127.0.0.1:18001, impersonating default/cloudnest-cloud-ops. Restored only the documented ServiceAccount, read-only Role and RoleBinding. Job creation authorization returns no. Context docker-desktop.
- Prometheus: http://127.0.0.1:9090 ; targets: http://127.0.0.1:9090/targets .
- Grafana: http://127.0.0.1:3000/login ; dashboard: http://127.0.0.1:3000/d/cloudnest .
- Dedicated metrics listener: 127.0.0.1:9464, bearer authentication retained. Docker Desktop reached this loopback listener successfully; no wildcard binding or firewall change was needed.

Credentials were generated only in ignored local files. Privately open observability/.env for the Grafana username and observability/.local/grafana-admin-password.txt for its password. Do not paste these values into chat or commit them. The metrics bearer token is separately stored in observability/.local/metrics-token.txt.

## Live evidence

- Cloud-ops snapshot: HTTP 200, all five sections available, 2 desired and 2 ready replicas. A sample observed aggregate CPU 0.242521 millicores and memory 29,790,208 bytes. These are observations, not scaling claims.
- Prometheus cloud-ops and self-scrape targets both UP. cloudnest_workload_ready_replicas returned a real sample of 2.
- promtool check config passed; check rules passed with four rules; all prepared rule fixtures passed in an isolated temporary 128 MiB container with writable temporary memory and read-only rule mounts.
- Grafana health HTTP 200/database ok; authenticated datasource health HTTP 200/OK. Provisioned dashboard retrieved through authenticated API. All 14 panel target queries executed with HTTP/result status 200 and no query errors. Replicas, availability, response rate/p95, CPU and memory returned samples. No observed 5xx series, disabled controller and optional unconfigured academic panels returned no samples; no healthy zeros were fabricated.
- Frontend login document HTTP 200; frontend observability proxy HTTP 200, Prometheus reachable, cloud-ops target up, four rules loaded and no active allowlisted alerts. This does not establish academic API/database health or notification delivery.
- Metrics without bearer token returned 401. All seven observed published/listening monitoring ports bound to 127.0.0.1.
- Both pinned images pulled: prom/prometheus:v3.13.4 and grafana/grafana:13.2.3.

## Confirmed runtime correction

Grafana's default plugin preinstaller stopped its bundled Prometheus plugin while trying to update it, then failed because the container root filesystem is read-only. Added only GF_PLUGINS_PREINSTALL_DISABLED=true in compose.yaml and recreated Grafana, preserving its volume. Datasource and dashboard query verification then passed. Authentication, resource limits and read-only filesystem remain enabled.

## Capacity and safety

Windows initially reported ~1,879 MiB free, briefly fell to 923–928 MiB during the image-pull interval, then recovered to 3,742 MiB. Startup was paused during pressure; the image pulls had already completed before the attempted scoped cancellation. No monitoring service was running during that low-memory interval. Kubernetes initially returned EOF and subsequently recovered; no reset or cluster setting changes were performed.

Services started only after host memory recovered to 3,555 MiB and Kubernetes readiness returned ok. The startup guard checks Windows available memory every five seconds and stops only this session's processes plus the two Compose services if memory falls below 8% of host total, preserving volumes. The guard runs for up to ten minutes. Its evidence is in ignored observability/.local/memory.log; owned PIDs are in session-pids.json. Available memory was ~2,540 MiB during query verification and ~2,041 MiB at the final health check. Both containers were healthy, with zero restarts and no OOM kill. Observed container usage was Prometheus 74.39 MiB/384 MiB, Grafana 231.5 MiB/256 MiB. Grafana is close to its cap; do not infer capacity for additional workloads from this idle check.

Sanitized authenticated query results are in ignored observability/.local/live-verification.json. Credentials are not included. Existing unit/lint/build tests were not repeated. No commit or push.

## Remaining manual browser checks

1. Open the frontend login URL and use its existing Admin login flow; do not edit browser storage to bypass it.
2. Open Cloud Pulse and verify readable layout, current pod cards, 2 desired/ready replicas, live resource timestamps and disabled experiment controls.
3. Verify the observability panel shows Prometheus reachable and opens the local Grafana dashboard.
4. Sign into Grafana with the private local credentials; inspect actual graphs and expected no-data optional panels.
5. Check normal Tasks, Exams, Admin and logout/login navigation. Academic database/authentication readiness is not established by these monitoring checks.