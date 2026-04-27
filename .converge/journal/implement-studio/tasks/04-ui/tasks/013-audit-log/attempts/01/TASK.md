# Task: 04-ui/013-audit-log

The runs page (`005-runs-list`) shows currently-known sessions. The audit log shows the *historical* picture: every session that ever existed across every playbook, with status transitions, durations, and which user/process triggered it. Different shape (flat history table) and different lens (operational accountability vs. live monitoring).

**Reuse:** `src/lib/converge-adapter/sessions.ts::listSessions()` already enumerates sessions. Extend it (or compose) into a `listAllSessionsAcrossPlaybooks()` that walks `.converge/journal/*/sessions/*` and reads each session's metadata header. If the file count gets large, sort newest-first and accept a `?limit=N&offset=M` query.

**Add `src/app/api/audit/route.ts`:**
- `GET ?limit=200&offset=0&playbook=<name>&status=<succeeded|failed|running>` returns `{ items: AuditEntry[], total: number }`.
- `AuditEntry`: `{ playbook, sessionId, startedAt, finishedAt, status, durationMs, actor?: string, taskCount: number }`. `actor` is whatever the journal records as the trigger (CLI user, cron, "manual"); leave undefined if not stored.
- Cache the listing in-memory for 5 s — these reads can hit the disk hard if the journal is big and the page is reloaded often.

**Add `src/app/audit/page.tsx`:**
- A filter bar at the top: playbook dropdown (populated from `/api/playbooks`), status dropdown, date range (last 24h / 7d / 30d / all).
- A paginated table: timestamp · playbook · session ID · status · duration · actor · task count. Click a row → `/runs/<playbook>/<sessionId>`.
- Column sorting (client-side over the loaded page is fine).

**Add the route to the SiteHeader nav** (from `010-shell-and-branding`) — fourth link `Audit` between `Runs` and `Settings`.

**Verification:**
- After a few runs of `implement-studio` exist on disk, `/audit` shows them in a table.
- Filtering by status=failed reduces rows.
- Clicking a row navigates to the live session view.
- `/api/audit?limit=1` returns one item; the response shape matches `AuditEntry`.