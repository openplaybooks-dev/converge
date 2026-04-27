# Task: 03-rebind-ui/002-rebind-command-palette

Adapt MC's command palette (`src/components/command-palette.tsx`).

**Keep:** modal overlay, debounced input, grouped results, keyboard navigation, glass morphism, Cmd-K shortcut.

**Swap:**
- Result fetcher → `fetch('/api/search?q=' + encodeURIComponent(query))`
- Result groups → "Playbooks", "Tasks", "Runs"
- Action commands → `New playbook` (/playbooks/new), `View runs` (/runs), `Toggle theme` (next-themes), `Open settings` (/settings)
- Recent items LRU → populate from converge entities only