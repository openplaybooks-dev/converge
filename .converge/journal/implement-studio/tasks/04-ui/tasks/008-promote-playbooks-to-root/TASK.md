---
id: 008-promote-playbooks-to-root
title: Promote playbooks UI to the URL root
outputs:
  - packages/converge-studio/src/app
checks:
  - id: root-page-exists
    description: src/app/page.tsx exists (i.e. / is served by the playbooks index)
    cmd: "test -f packages/converge-studio/src/app/page.tsx"
  - id: studio-route-group-removed
    description: The (studio) route group is gone
    cmd: "test ! -d 'packages/converge-studio/src/app/(studio)'"
  - id: playbooks-routes-at-root
    description: /playbooks/[name] and /runs are at the URL root
    cmd: "test -f 'packages/converge-studio/src/app/playbooks/[name]/page.tsx' && test -f 'packages/converge-studio/src/app/runs/page.tsx'"
  - id: typecheck-passes
    description: Studio still typechecks after the move
    cmd: "pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq"
---

Playbook is the root entity in converge — there is no separate dashboard. The URL surface should mirror that: `/` lists playbooks, `/playbooks/[name]` is a playbook detail, `/runs` lists runs. Stripe-account-style. No dashboard layer above.

Today (after task 001's prune) the playbooks UI lives under a `(studio)` route group: `src/app/(studio)/playbooks/page.tsx`. That group exists because the upstream split UI between a dashboard catch-all and a "studio" subtree. With the catch-all gone, the group is meaningless.

**Move:**
- `src/app/(studio)/playbooks/page.tsx` → `src/app/page.tsx` (becomes `/`).
- `src/app/(studio)/playbooks/new/page.tsx` → `src/app/playbooks/new/page.tsx`.
- `src/app/(studio)/playbooks/[name]/page.tsx` → `src/app/playbooks/[name]/page.tsx`.
- `src/app/(studio)/playbooks/[name]/tasks/[...path]/page.tsx` → `src/app/playbooks/[name]/tasks/[...path]/page.tsx` (URL unchanged).
- `src/app/(studio)/runs/page.tsx` → `src/app/runs/page.tsx`.
- `src/app/(studio)/runs/[playbook]/[sessionId]/page.tsx` → `src/app/runs/[playbook]/[sessionId]/page.tsx` (URL unchanged).
- Any other file under `(studio)/` moves to the equivalent root path.

**After moving:**
1. Delete the empty `src/app/(studio)/` directory.
2. The new `src/app/page.tsx` is the playbooks index, but it should not duplicate the `/playbooks` route — leave `/playbooks` as a redirect (`export default function Page() { redirect('/') }` from `next/navigation`) OR delete it and rely solely on `/`. Pick the simpler one: delete `src/app/playbooks/page.tsx` if it would just duplicate `/`.
3. Update every `<Link href="/playbooks">` in the codebase to `href="/"`. Update breadcrumb code that assumes `/playbooks` is the index.
4. Update the navigation component (the new minimal one introduced in task 010) so `Playbooks` links to `/`.

**Routing rule reminder:** Next.js disallows static segments after a catch-all. When moving the task editor page (`tasks/[...path]/`), do not introduce any sibling segments under `[...path]`. The companion API route (`api/playbooks/[name]/task-reset/[...path]`) already follows this rule — keep it that way.

**Verification:**
- `pnpm --filter @converge/studio dev` boots cleanly.
- `curl -s http://localhost:4000/` returns 200 and the body contains the literal `Playbooks` (the page heading).
- `curl -s http://localhost:4000/playbooks/implement-studio` returns 200 against a real on-disk playbook.
- `curl -s http://localhost:4000/runs` returns 200.
- No `Catch-all must be the last part of the URL` error in the dev server log.
