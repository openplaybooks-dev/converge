# Task: 04-ui/016-command-palette

A keyboard-first jumper across the three top-level entities: playbooks, tasks, runs. Modal dialog opened with Cmd-K (Ctrl-K on Linux/Windows). No fancy fuzzy-rank library required — the dataset is small (tens of playbooks, hundreds of tasks). Substring match on a normalized lowercase string is enough.

**Add `src/app/api/search/route.ts`:**
- `GET ?q=<term>&limit=20` returns `{ items: SearchResult[] }` where each result is `{ kind: 'playbook' | 'task' | 'run', label: string, href: string, hint?: string }`.
- Implementation: walks the playbook + task + recent-sessions list (cap to last 50 sessions), substring-matches against `q`, returns up to `limit` ranked results (playbooks first, then tasks, then runs — within each kind, alphabetical or recency).
- Empty `q` returns the most recently touched playbooks/tasks/runs (5 each) — gives users something useful when they just hit Cmd-K.

**Add `src/components/command-palette.tsx`** (client component, ≤ 200 LOC):
- A modal `<Dialog>` (use the existing UI primitive if `src/components/ui/dialog.tsx` exists post-prune, else a div + portal).
- Global keyboard listener: Cmd/Ctrl-K opens; Esc closes; ↑/↓ moves selection; Enter navigates to the selected `href`.
- Input field debounced 100 ms, hits `/api/search`.
- Result list grouped by kind with section headers.
- Highlight the matched substring in each label (simple `<mark>` wrap).

**Mount it in `src/app/layout.tsx`** so it's available on every route. Keep the SiteHeader free of a button — the shortcut is the discovery path; for users who don't know shortcuts, surface a hint in the header (e.g., a small "⌘K" badge).

**Verification:**
- Cmd-K opens the palette on `/`, `/playbooks/x`, `/runs`, etc.
- Typing `imp` shows `implement-studio` as the top result.
- Enter navigates; Esc dismisses.
- Empty search shows recent items.
- Search response time stays under 100 ms for a few hundred items (no virtualization needed).