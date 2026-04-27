---
id: 002-rebind-command-palette
title: Rebind Cmd-K command palette to converge entities
outputs:
  - packages/studio/src/components/command-palette.tsx
checks:
  - id: palette-uses-search-api
    description: Palette fetches /api/search
    cmd: "test -f packages/studio/src/components/command-palette.tsx && grep -q '/api/search' packages/studio/src/components/command-palette.tsx"
---

Adapt MC's command palette (`src/components/command-palette.tsx`).

**Keep:** modal overlay, debounced input, grouped results, keyboard navigation, glass morphism, Cmd-K shortcut.

**Swap:**
- Result fetcher → `fetch('/api/search?q=' + encodeURIComponent(query))`
- Result groups → "Playbooks", "Tasks", "Runs"
- Action commands → `New playbook` (/playbooks/new), `View runs` (/runs), `Toggle theme` (next-themes), `Open settings` (/settings)
- Recent items LRU → populate from converge entities only
