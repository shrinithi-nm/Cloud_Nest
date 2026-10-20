# Backup and recovery tooling (not executed)

Requires Node 24 and matching PostgreSQL client binaries. The operations image combines node:24-bookworm-slim with postgres:17-bookworm for the existing PostgreSQL 17 deployment. These image tags are supplied templates, not built/pulled/runtime-tested here. Pin reviewed digests in deployment. pg_dump must not be older than the server major; use pg_restore from the same client release as pg_dump. Restoring into an older PostgreSQL major is not supported. Install extensions and required roles in the separate recovery environment through the database owner. Role/global-object backup is a separate DBA responsibility.

The scripts rely on libpq environment variables and never pass a password/connection URL as a command argument. Use a privately protected PGPASSFILE (or private PGPASSWORD supplied by the secret manager). Do not put passwords into shell history. PGSSLMODE=verify-full requires the matching CA and server name; for an intentionally local database the operator may explicitly choose the appropriate local connection policy. No configuration in backend/.env is read or changed.

## PowerShell usage — future operator action only

From repository root, after the teammate configures private access:

```powershell
$env:BACKUP_DIR = 'C:\CloudNestBackups' # Choose canonical path and protect its ACL privately.
$env:PGHOST = 'REPLACE_WITH_DATABASE_HOST'
$env:PGPORT = '5432'
$env:PGDATABASE = 'REPLACE_WITH_PRIMARY_DATABASE'
$env:PGUSER = 'REPLACE_WITH_BACKUP_ROLE'
$env:PGPASSFILE = 'REPLACE_WITH_PRIVATE_PGPASS_PATH'
$env:PGSSLMODE = 'verify-full'
$env:RETENTION_DAYS = '7'
pg_dump --version
pg_restore --version
node .\operations\backup.mjs backup
node .\operations\backup.mjs status
```

Custom-format archives are first written to unique .partial files, inspected with pg_restore --list, atomically renamed, then checksummed. A single-writer lock prevents overlapping local backups. After success, retention removes only matching generated archive basenames older than RETENTION_DAYS in the canonical backup directory, with regular-file/symlink checks. It never recursively deletes paths or deletes unrelated filenames. Lock and partial files are intentionally not silently purged after a crash: inspect them privately and remove only that owned artifact when no backup process is running. Copy archive plus checksum off-machine through an encrypted, independently retained destination; the included local PVC/volume alone is not disaster recovery. All backup directory writers must be trusted; use separate database roles with only the required dump/read privileges.

Status includes lastSuccess only after a confirmed dump; first use returns unavailable/null. A failed attempt records failed while retaining the previous lastSuccess. backup.prom exports outcome and the last successful timestamp only if observed. An optional authenticated host reader can be run later with BACKUP_METRICS_TOKEN_FILE and node .\operations\backup-metrics.mjs (127.0.0.1:9468). It was not started. No backup file means metrics 503, not fabricated success. Protect dumps: they contain private academic data.

## Separate recovery target

The database owner must provision an EMPTY recovery database in advance with a role that cannot modify the primary. The tool never creates a database, uses --clean, drops data or initializes PostgreSQL. It rejects the configured primary DATABASE NAME even on another host, validates the actual current_database() before pg_restore, requires an empty non-system-table set, checks archive SHA256 and performs one exit-on-error transaction. Use only trusted self-produced archives. Confirmation is a guard, not evidence of operator authorization to overwrite data.

```powershell
# Keep PGDATABASE naming the primary for the comparison above.
$env:RECOVERY_DB_NAME = 'cloudnest_recovery_review'
$env:RESTORE_CONFIRM = 'cloudnest_recovery_review'
$env:BACKUP_FILE = 'REPLACE_WITH_GENERATED_ARCHIVE_BASENAME'
node .\operations\backup.mjs restore
node .\operations\backup.mjs verify
```

These commands query recovery identity, public tables, workspace count and task count. Compare counts and tenant/ownership invariants with the chosen backup point, then run the academic application's read/login checks against recovery only. Schema presence/pg_restore success alone does not prove full recovery. No backup, restore or verification SQL was run during implementation.

Kubernetes CronJob template: kubernetes/integration/backup.template.yaml. It is suspended, namespace-isolated, single concurrency, bounded CPU/RAM/runtime, read-only root, and tokenless. Build the operations image and privately create cloudnest-backup-private (PGPASSWORD or configured PGPASSFILE mount) plus required CA access. Review storage ACLs, timezone/schedule, backup-role access, image digest and off-site destination before unsuspending. Last-success status lives on its backup PVC; no status API was registered in the academic server. Retention runs only after a successful backup. Suspended templates are not scheduled backups.

## File backup is separate

PostgreSQL dumps do not include assignment upload objects, Vault files, browser-local tasks or object storage. The teammate must identify the authoritative file store, take a consistent manifest/checksum snapshot coordinated with database references, encrypt/copy files off-machine, and restore into a separate recovery bucket/path. Verify file hashes, reference ownership, access policy and representative downloads. No file backup/restore script can safely choose a storage path while the upload/storage contract is missing. File recovery remains unfinished, so full recovery is NOT claimed.

## Redis queue versus cache

redis.compose.template.yaml is an opt-in, unstarted template. Before any future use create .local/redis-users.acl and .local/cache-users.acl privately, disable the default user, and supply named users with hashed secrets. Never commit these files. Restrict queue keys to bull:cloudnest-email:* and cloudnest:mailbox:* with the exact BullMQ command set plus CONFIG GET for durability verification. Queue Redis uses AOF appendfsync always, noeviction, 128 MB dataset ceiling and its own persistent volume; its 192 MiB container cap needs workload validation. Cache Redis is separate, nonpersistent allkeys-lru with 80 MB dataset/128 MiB container cap. Rate-limit state needs a non-evicting shared store/service (RATE_LIMIT_REDIS_URL), not that evictable cache. Native Redis cluster mode is not configured by these templates. None of these limits establish production capacity.
