---
id: 021-root-redirects-to-playbooks
title: Make `/` redirect to `/playbooks`
dependencies:
  - 020-converge-shell
outputs:
  - packages/converge-studio/src/app/page.tsx
checks:
  - id: page-exists
    description: src/app/page.tsx exists
    cmd: "test -f packages/converge-studio/src/app/page.tsx"
  - id: page-redirects
    description: page.tsx calls redirect('/playbooks')
    cmd: "bash -c 'P=packages/converge-studio/src/app/page.tsx; grep -q \"next/navigation\" \"$P\" && grep -q \"/playbooks\" \"$P\" && grep -q \"redirect\" \"$P\"'"
  - id: page-no-mc-content
    description: page.tsx renders nothing else (no MC dashboard, no launch sequence)
    cmd: "bash -c 'P=packages/converge-studio/src/app/page.tsx; ! grep -qE \"Launch|Mission Control|fleet|widget|dashboard\" $P'"
  - id: typecheck-passes
    description: Studio typechecks
    cmd: "pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq"
---

Make the root URL redirect server-side to `/playbooks` so the playbooks index is the home page.

**`src/app/page.tsx`** — server component, ~5 lines:

```tsx
import { redirect } from 'next/navigation';

export default function RootPage(): never {
  redirect('/playbooks');
}
```

That's the entire file. No header, no welcome card, no fleet stats — the redirect happens server-side before any UI renders.

**Why redirect rather than render the playbooks index directly:** keeping `/playbooks` as the canonical URL for the index means deep links, refreshes, and bookmarks all land on a stable route. Rendering the index on `/` would split bookmarks (`/` vs `/playbooks`) and complicate the active-link logic in the header.

**If `(studio)/playbooks/page.tsx` was previously the route group's home:** task 008-promote-playbooks-to-root already moved it to `/playbooks/page.tsx` (top-level). Confirm by checking the file exists at `src/app/playbooks/page.tsx`. If it doesn't, move it now — but task 008 should have done this; the gap is that `/` still falls through the `[[...panel]]` catch-all instead of hitting our redirect. Once 019 deletes the catch-all, this redirect picks up the URL.

**Process:**
1. Write `src/app/page.tsx` with the redirect.
2. Confirm `src/app/playbooks/page.tsx` exists (it should, from task 008). If not, move from `(studio)/playbooks/page.tsx`.
3. Run typecheck.
