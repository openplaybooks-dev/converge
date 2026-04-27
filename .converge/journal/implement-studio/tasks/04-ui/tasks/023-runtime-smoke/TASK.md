---
id: 023-runtime-smoke
title: Boot dev server and verify `/` shows playbooks index
dependencies:
  - 020-converge-shell
  - 021-root-redirects-to-playbooks
outputs:
  - .converge/studio-state/runtime-smoke.json
checks:
  - id: smoke-report-exists
    description: Smoke report file exists and reports root-redirect-200 = true
    cmd: "test -f .converge/studio-state/runtime-smoke.json && node -e \"const r=JSON.parse(require('fs').readFileSync('.converge/studio-state/runtime-smoke.json','utf8'));process.exit(r.rootRedirectsToPlaybooks===true&&r.playbooksIndexHas200===true?0:1)\""
---

Boot `pnpm dev`, hit `/`, verify it redirects to `/playbooks` and the index renders with at least one known playbook name in the HTML.

**Process:**

1. Free port 4000 first: `lsof -ti :4000 2>/dev/null | xargs -r kill -9; sleep 1`.

2. Boot dev server in background:
   ```bash
   cd packages/converge-studio
   PORT=4000 CONVERGE_PROJECT_ROOT=/Users/minh/Documents/converge \
     pnpm dev > /tmp/converge-studio-smoke.log 2>&1 &
   DEV_PID=$!
   ```

3. Wait up to 60s for `/playbooks` to return 200:
   ```bash
   for i in $(seq 1 60); do
     code=$(curl -s -o /tmp/converge-studio-index.html -w '%{http_code}' \
       http://localhost:4000/playbooks 2>/dev/null || echo 000)
     [ "$code" = "200" ] && break
     sleep 1
   done
   ```

4. Verify `/` redirects (should return 307 or 200 after follow):
   ```bash
   redirect_code=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:4000/)
   followed_code=$(curl -sL -o /dev/null -w '%{http_code}' http://localhost:4000/)
   final_url=$(curl -sL -o /dev/null -w '%{url_effective}' http://localhost:4000/)
   ```

5. Verify the index has a real playbook name. Pick a known one from the project:
   ```bash
   grep -q 'implement-studio\|oss-standardize' /tmp/converge-studio-index.html && hasPlaybook=true || hasPlaybook=false
   ```

6. Verify NO Mission Control content rendered:
   ```bash
   ! grep -qiE 'mission control|launch sequence|fleet status|dispatch a task' /tmp/converge-studio-index.html && noMc=true || noMc=false
   ```

7. Kill the dev server: `kill $DEV_PID 2>/dev/null; lsof -ti :4000 | xargs -r kill -9`.

8. Write the report to `.converge/studio-state/runtime-smoke.json`:
   ```json
   {
     "timestamp": "<ISO>",
     "rootHttpCode": <int>,
     "rootFollowedHttpCode": <int>,
     "rootFinalUrl": "<url>",
     "rootRedirectsToPlaybooks": <bool>,
     "playbooksIndexHas200": <bool>,
     "playbooksIndexHasKnownName": <bool>,
     "noMissionControlContentRendered": <bool>,
     "logTail": "<last 30 lines of /tmp/converge-studio-smoke.log>"
   }
   ```

   Where `rootRedirectsToPlaybooks = (rootFollowedHttpCode === 200 && rootFinalUrl.endsWith('/playbooks'))`.

**Anti-patterns to avoid (per troubleshooting #12):**
- Do NOT `pkill -f "node"` or `pkill -f "converge"` — that will kill the runner itself.
- Use the captured `$DEV_PID` to kill specifically.
- Always also run `lsof -ti :4000 | xargs -r kill -9` afterwards as a belt-and-braces cleanup.

**If the smoke fails:** the dev log (`/tmp/converge-studio-smoke.log`) is the source of truth. Common failures:
- `[[...panel]]` not deleted → `/` falls through to MC dashboard. Re-check 019.
- `src/app/page.tsx` missing or doesn't redirect → re-check 021.
- 500 on `/playbooks` because of a dangling import → run typecheck and fix.
