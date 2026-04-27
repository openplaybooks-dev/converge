# Task: 04-ui/021-root-redirects-to-playbooks

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