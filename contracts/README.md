# Teammate-owned HTTP integration contracts

These endpoints do not exist yet. No authentication, ownership or database schema was changed by this implementation. All JSON examples below use placeholders, not working credentials. Server validation is mandatory; a worker or browser is not an authorization authority.

## Verified mailbox connection

Authenticated service GET /api/integrations/mailboxes/:connectionId. Require a reviewed service identity with mailbox-read scope, not a browser-selected role. Return 200 only for an enabled connection the service may access:

```json
{"connectionId":"REPLACE_WITH_VERIFIED_CONNECTION_ID","provider":"imap","verified":true,"enabled":true,"imap":{"host":"REPLACE_WITH_PROVIDER_HOST","user":"REPLACE_WITH_VERIFIED_MAILBOX","folder":"INBOX"}}
```

The backend binds this connection to its verified mailbox, workspace and student owner. Verification must prove control through the provider flow; an arbitrary email address/config file is insufficient. Host/user/folder must exactly match the worker configuration. Connection IDs must never be recycled for a different owner. Revocation/disable must immediately block imports. Do not return passwords or provider access tokens here.

## Email import

Authenticated service POST /api/tasks/import/email, Content-Type application/json, Idempotency-Key containing the 64-character key. Body follows task-import.schema.json. Required service scope: task-import for the verified connection. Do not accept student/workspace/user ownership IDs in this body. Derive ownership exclusively from the live verified connection on EVERY request, including retries. Resolve subjectCode only within that workspace/student's allowed subjects. Map lowercase client priority to the existing uppercase backend enum after validation; do not change the academic schema automatically. Description is literal plain text, never HTML to render/execute.

Recompute key = SHA256(JSON.stringify(['imap-v1', connectionId, String(uidValidity), uid])). Compare it with both body and header. In one database transaction, enforce a UNIQUE constraint on the server-derived workspace and idempotency key (and preferably connection/UIDVALIDITY/UID), insert the import receipt and personal task, and return a stable task ID. The uniqueness migration and receipt/task mapping belong to the teammate and are NOT implemented here. Redis job retention alone cannot provide final deduplication.

201 {"status":"created","taskId":"REPLACE_WITH_TASK_ID"}; idempotent replay 200 {"status":"duplicate","taskId":"REPLACE_WITH_SAME_TASK_ID"}. 409 is a permanent conflicting-payload error, not a duplicate-success substitute. 400/401/403/404/422 stop retries and remain in failed review. 408/425/429/5xx and connection failures retry up to five attempts with exponential delay starting at two seconds (25% jitter, maximum normal retry delay 16 seconds). Retry-After is not currently consumed; configure service quotas with the worker's 10-attempts/second limiter in mind. Redirects are rejected. An empty/incompatible success body is not accepted as an import.

## Own preferences

Use the teammate's real bearer auth, workspace isolation and student ownership. GET /api/me/preferences returns {version:1, revision:"REPLACE_WITH_OPAQUE_REVISION", preferences:{...}}. PUT to the same fixed endpoint accepts {version:1, preferences:{...}} and requires If-Match with the revision from GET. Return the same envelope with a new revision. Return 412/409 for conflicting edits; never silently overwrite another session. Initialize defaults server-side on first GET. Do not accept a student/user/workspace ID from the client. Existing backend auth must derive the owner. Version 1 validation and defaults are in frontend/src/services/preferenceSchema.js (pure JS, independently tested). Store only that validated payload. Expose an allowlisted browser origin and Authorization/If-Match headers in the teammate's CORS configuration.

Fields: theme light/dark/system; modules stats/focus/exams/activity/insight booleans with at least one enabled; preferredView tasks/calendar; study days unique integers 0–6 (Sun–Sat), start/end HH:mm with end after start on the same day, valid IANA timeZone; reminders enabled boolean and minutesBefore 15/30/60/1440; onboardingComplete boolean. Reject extra/missing fields. Reminder delivery is not implemented by these preferences.

Register configurePreferenceAuth(() => realAuthSession.accessToken) from frontend/src/services/preferences.js after teammate auth integration. Do not read a browser-selected local role as proof of auth. Without this hook or compatible endpoints, the UI explicitly remains session-only preview and does not pretend it saved.

## Academic load contracts

Existing authenticated read paths: GET /api/tasks/student/:studentId and GET /api/exams/student/:studentId. Both must return {status:"success", count:NUMBER, data:ARRAY} and enforce ownership from the verified token. Current examController.getStudentExams is defective: its SQL filters e.id instead of e.student_id, references $2, and supplies only [studentId]. The teammate must fix binding and ownership before enabling the test. This implementation deliberately did not alter that controller.

Missing upload path: POST /api/assignments/:assignmentId/submissions, multipart field file, bearer student token, stable per-attempt Idempotency-Key; 201/200 {submissionId:"REPLACE_WITH_ID"}. It must verify assignment/student/workspace ownership, file type/size, safe storage keys and idempotency. This route is NOT implemented here. Prepare disposable individually owned test assignments and a harmless <=1 MiB fixture before enabling the upload script. No grading, deletion or shared assignment mutation is part of the workload.
