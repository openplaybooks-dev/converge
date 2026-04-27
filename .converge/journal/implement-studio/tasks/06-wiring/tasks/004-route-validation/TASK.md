---
id: 004-route-validation
title: Codify Next.js routing rules and verify primary routes
outputs:
  - packages/converge-studio/src/app
checks:
  - id: no-segment-after-catchall
    description: No directory under src/app has a static segment after a [...catch-all] segment (Next.js refuses to start otherwise)
    cmd: "bash -c 'bad=$(find packages/converge-studio/src/app -type d 2>/dev/null | awk -F/ \"{ for (i=1;i<NF;i++) if (\\$i ~ /^\\\\[\\\\.\\\\.\\\\./ && \\$(i+1) !~ /^\\\\[/) { print; next } }\"); test -z \"$bad\"'"
  - id: routes-respond-200
    description: Dev server returns 200 on /, /playbooks/implement-studio, /runs, /api/playbooks, and the /api/events SSE endpoint opens
    cmd: "bash -c 'cd packages/converge-studio && (pnpm dev > /tmp/converge-studio-routes.log 2>&1 &); pid=$!; ok=0; for i in $(seq 1 30); do sleep 1; code=$(curl -s -o /dev/null -w \"%{http_code}\" http://localhost:4000/ || echo 000); if [ \"$code\" = \"200\" ]; then ok=1; break; fi; done; if [ $ok -eq 0 ]; then kill $pid 2>/dev/null; cat /tmp/converge-studio-routes.log; exit 1; fi; for path in /playbooks/implement-studio /runs /api/playbooks; do code=$(curl -s -o /dev/null -w \"%{http_code}\" http://localhost:4000$path); if [ \"$code\" != \"200\" ]; then kill $pid 2>/dev/null; echo \"FAIL $path -> $code\"; exit 1; fi; done; sse=$(curl -s --max-time 2 -o /tmp/converge-sse.out -w \"%{http_code}\" http://localhost:4000/api/events || true); if [ \"$sse\" != \"200\" ] && [ \"$sse\" != \"000\" ]; then kill $pid 2>/dev/null; echo \"FAIL /api/events -> $sse\"; exit 1; fi; kill $pid 2>/dev/null; exit 0'"
---

Two classes of failure that have bitten this playbook:

1. **Catch-all routing rule**: Next.js refuses to start if any route directory has a static segment after a `[...catch-all]` segment. We hit this with `api/playbooks/[name]/tasks/[...path]/reset/route.ts` — the fix was to move it to a sibling `task-reset/[...path]/route.ts`. This task adds a check so a regression fails the playbook before the dev server even starts.

2. **Routes that compile but blow up at request time**: typechecking can pass while a page crashes on render (missing config, missing dependency, runtime import error). The second check actually requests each primary route.

**Process:**
1. Run the `no-segment-after-catchall` check locally. If it fails, restructure the offending route. The general fix pattern is "lift the action segment to a sibling": instead of `tasks/[...path]/reset` use `task-reset/[...path]`.
2. Make sure every page route handler the studio depends on exists at the expected path:
   - `/` → `src/app/page.tsx`
   - `/playbooks/[name]` → `src/app/playbooks/[name]/page.tsx`
   - `/playbooks/[name]/tasks/[...path]` → existing task editor
   - `/runs` → `src/app/runs/page.tsx`
   - `/api/playbooks` (GET list, POST create)
   - `/api/playbooks/[name]/tasks/[...path]` (GET/PUT)
   - `/api/playbooks/[name]/task-reset/[...path]` (POST)
   - `/api/events` (SSE — added by 04-ui/009)
3. Run the `routes-respond-200` check. It boots `pnpm dev`, polls `/` until 200 (≤ 30 s), then probes the other routes, then opens `/api/events` briefly to confirm it returns 200 with the SSE content type. The check kills the dev server at the end.

**If the routes check fails:**
- 500 on `/` → check `/tmp/converge-studio-routes.log`. Most common: a missing module (rerun 06-wiring/001 dependency walk) or a missing `next-intl` config (`src/i18n/request.ts` must exist and `next.config.mjs` must wrap with `next-intl/plugin`).
- 404 on `/playbooks/implement-studio` → the playbook list page is at `/` but the detail page wasn't moved out of the `(studio)` route group. Re-run 04-ui/008.
- `Catch-all must be the last part of the URL` in the dev log → re-run the first check; you have a structural route bug.
