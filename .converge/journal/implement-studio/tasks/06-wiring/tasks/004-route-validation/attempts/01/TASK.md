# Task: 06-wiring/004-route-validation

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