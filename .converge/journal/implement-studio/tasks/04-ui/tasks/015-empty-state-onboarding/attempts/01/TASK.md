# Task: 04-ui/015-empty-state-onboarding

Replace the deleted Mission Control "Launch Sequence" wizard with a single-card empty state that appears on `/playbooks` only when there are zero playbooks. No multi-step setup, no agent runtime install, no docking flow — converge has none of those concepts.

**Note on routing:** task `021-root-redirects-to-playbooks` makes `/` a server-side redirect to `/playbooks`, so the empty state lives in the `/playbooks` index, not on `/`.

**Add `src/components/empty-state.tsx`** (≤ 60 LOC, client component):
- Centered card on the page.
- Heading: "No playbooks yet."
- Body: 1–2 sentences explaining what a playbook is and pointing at `/playbooks/new`.
- Primary CTA button: "Create your first playbook" → links to `/playbooks/new`.
- Secondary link: "Read the converge docs" → external link (read the converge repo to find the docs URL; if none exists, link to the README on GitHub).
- Optionally: a code-block snippet showing how to create a playbook from the CLI (`converge init my-playbook`) — gives users a path that doesn't require the form.

**Modify `src/app/playbooks/page.tsx`** (the playbooks index, established by `008-promote-playbooks-to-root`):
- After fetching the playbooks list, if `items.length === 0`, render `<EmptyState />` *instead of* the empty table. If `> 0`, render the table as normal.

**Verification:**
- In a converge project with no playbooks (`mv .converge/playbooks /tmp/backup-playbooks`), `/playbooks` shows the empty state.
- Restoring playbooks (`mv /tmp/backup-playbooks .converge/playbooks`) and reloading shows the playbook list.
- Clicking the CTA navigates to `/playbooks/new`.