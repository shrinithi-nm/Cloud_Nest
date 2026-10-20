# Opt-in performance modules — teammate registration required

No existing app middleware order, pool construction or academic routes were changed. These CommonJS modules are usable with dependency injection and have focused offline tests. They are NOT registered by environment variables alone. The following is the minimal proposed registration patch, to be applied by the backend owner after auth/database readiness.

## Pool

In src/config/db.js, retain the existing Pool constructor fields and spread an opt-in options object after them:

```js
const options = process.env.PERFORMANCE_ENABLED === 'true'
  ? require('../performance/options.cjs').poolOptions(process.env)
  : {};
// new Pool({ host: ..., port: ..., database: ..., user: ..., password: ..., ...options });
```

Default opt-in max is 5/client-process, zero minimum, 10s idle, 3s acquisition/connect, 10s statement and 12s query timeouts. Check the actual PostgreSQL role/connection budget before scaling. Two API replicas plus a one-pod rolling surge may open 15 pool connections, in addition to migrations, backups and admin clients. No PostgreSQL replica/container is added or scaled. Existing pool behaviour stays unchanged until the teammate applies this patch.

## Body/network timeouts, readiness and shutdown

Keep the current cors/json/auth order. At the existing express.json() call only, select bodyLimits(express, process.env) when enabled; otherwise keep express.json(). Default opt-in JSON body cap is 64 KiB. Multipart uploads need their own reviewed streaming limit/auth/storage middleware; JSON limits do not protect multipart. Review route requirements before selecting limits.

```js
const { bodyLimits, configureHttpServer, gracefulShutdown } = require('./performance/options.cjs');
const { registerReadiness } = require('./performance/readiness.cjs');
// Replace just the original parser statement, without moving other middleware:
app.use(process.env.PERFORMANCE_ENABLED === 'true' ? bodyLimits(express, process.env) : express.json());
// After routes/health, before listening:
let lifecycle;
if (process.env.PERFORMANCE_ENABLED === 'true') {
  registerReadiness(app, { pool, isDraining: () => Boolean(lifecycle?.isDraining()) });
}
// Capture the existing listen return value instead of calling listen twice:
const server = app.listen(PORT, existingListenCallback);
if (process.env.PERFORMANCE_ENABLED === 'true') {
  configureHttpServer(server, process.env);
  lifecycle = gracefulShutdown({ server, pool, closeExtras: async () => {
    // Close only this process's injected Redis/metrics connections here.
  }});
}
```

Use the EXISTING listen callback in place of existingListenCallback. The readiness probe shares one pending SELECT 1 and returns 503 during drain/database failure. It is not proof of schema/auth correctness. Existing /api/health remains process liveness. HTTP incoming-request timeout 30s, headers 10s, keepalive 5s, max 100 requests/socket; these do not magically cancel arbitrary application computation. Database/query and import deadlines apply separately. Shutdown deadline 25s (template grace 30s); do not add duplicate signal handlers. Register only after backend owner reviews interactions with optional observability shutdown.

## Shared rate protection

The existing backend package does not yet depend on ioredis; modules accept a Redis-compatible injected client rather than silently installing/starting one. Future teammate command: npm install --prefix .\backend --save-exact ioredis@6.0.0. Create it privately from RATE_LIMIT_REDIS_URL with commandTimeout:1500, maxRetriesPerRequest:1, enableOfflineQueue:false; attach a sanitized error handler. Use a shared NON-EVICTING rate-limit store or reviewed gateway, never the evictable cache instance. Namespace and limit are bounded by the helper; each replica uses the same workspace/user hash key and atomic fixed-window Lua counter. A fixed window permits a boundary burst of up to twice the nominal window limit; select quotas accordingly. Redis failure returns 503, not unlimited access.

After existing authenticate, before the same protected route/controller (do not move authorization):

```js
const { sharedRateLimit } = require('./performance/shared.cjs');
const academicLimit = sharedRateLimit({ redis: rateRedis, namespace: 'academic', limit: 120, windowMs: 60000 });
// router.get('/student/:studentId', authenticate, authorizeStudentAccess, academicLimit, getStudentTasks);
```

Keys require verified req.user.workspace_id and req.user.user_id, matching existing JWT field names. No trust in query/body identity. Login/pre-auth routes need a separately reviewed network/IP policy behind a known proxy; this authenticated-user helper is not a login limiter. The placeholder 120/minute quota needs workload review before the 100-user script; do not disable protection to improve a test result.

## Scoped subject/exam cache

Use a SEPARATE CACHE_REDIS_URL client (same bounded command timeout/error handling). createScopedCache({redis: cacheRedis, ttlSeconds:30}) provides getOrLoad and invalidation. Authorize the requested student/entity FIRST; cache keys use the authenticated workspace/user, kind and all query/target parameters. Include the authorized target student ID in parameters on administrator reads; otherwise one administrator's multiple target reads could collide. Never use a global private-response key. No task/auth/grade payload is allowlisted.

```js
const { createScopedCache } = require('./performance/shared.cjs');
const cache = createScopedCache({ redis: cacheRedis });
const data = await cache.getOrLoad({
  principal: req.user, kind: 'exams', parameters: { studentId: authorizedStudentId },
  load: () => existingAuthorizedExamQuery()
});
// ONLY after the owning database transaction commits:
await cache.invalidate({ principal: verifiedOwnerPrincipal, kind: 'exams' });
// Shared subject/exam changes affecting multiple people:
await cache.invalidateWorkspace({ workspaceId: verifiedWorkspaceId, kind: 'subjects' });
```

Random generation tokens prevent version-key eviction from resurrecting an old key. Epoch changes are shared across replicas; stale in-flight loaders write only into the old generation. TTL <=300s and value cap <=1 MiB (default 256 KiB). Failed cache reads/writes use the REAL loader, never fixtures. Loader errors propagate. An invalidation error must be retried/reconciled after commit (outbox recommended); generation invalidation is not transactionally atomic with PostgreSQL. Cache is bounded-staleness until that integration exists, not a guarantee of strong consistency.
