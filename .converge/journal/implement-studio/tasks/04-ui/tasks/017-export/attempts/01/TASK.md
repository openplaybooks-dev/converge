# Task: 04-ui/017-export

Two download endpoints + two buttons. No format conversion beyond what's already on disk.

**Add `src/app/api/runs/[playbook]/[sessionId]/export/route.ts`:**
- `GET` returns the session's full data — the session metadata (from `readSession`) plus the events array (from `readSessionEvents` introduced in `011-logs-panel`) — as a single JSON document.
- Headers: `Content-Type: application/json`, `Content-Disposition: attachment; filename="session-${playbook}-${sessionId}.json"`.

**Add `src/app/api/playbooks/[name]/export/route.ts`:**
- `GET` returns the playbook's full definition: the `playbook.yml` contents plus all task `TASK.md` files keyed by their relative path.
- Format: a single YAML document `{ playbook: <yaml>, tasks: { <relpath>: <task-md-with-frontmatter>, ... } }`. Use the YAML lib already in deps.
- Headers: `Content-Type: application/x-yaml`, `Content-Disposition: attachment; filename="${name}.playbook.yaml"`.
- Note: this is a flattened, portable representation. It is not a backup of the journal — for that, the user should `tar` the directory directly.

**Wire UI buttons:**
- On `src/app/runs/[playbook]/[sessionId]/page.tsx`: add an "Export JSON" button in the page header that triggers `window.location.href = '/api/runs/<playbook>/<sessionId>/export'` (browser handles the download via `Content-Disposition`).
- On `src/app/playbooks/[name]/page.tsx`: add an "Export YAML" button in the page header that triggers the same pattern against the playbook export endpoint.

**No import yet.** Round-tripping (export, edit offline, re-import) is more work than this task warrants — defer to a follow-up if users actually ask for it.

**Verification:**
- Click Export JSON on a run → browser downloads `session-implement-studio-<id>.json`. Open it: it parses as JSON; contains the events array.
- Click Export YAML on a playbook → browser downloads `implement-studio.playbook.yaml`. Open it: it parses as YAML; contains the `playbook.yml` contents and a `tasks` map.
- `curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/api/playbooks/implement-studio/export` returns 200.