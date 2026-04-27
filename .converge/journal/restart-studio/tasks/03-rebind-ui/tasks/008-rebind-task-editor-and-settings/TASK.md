---
id: 008-rebind-task-editor-and-settings
title: Build task editor page and /settings page
outputs:
  - packages/studio/src/app/playbooks/[name]/tasks/by-path/[...path]/page.tsx
  - packages/studio/src/app/settings/page.tsx
checks:
  - id: task-editor-exists
    description: Task editor page exists
    cmd: "test -f 'packages/studio/src/app/playbooks/[name]/tasks/by-path/[...path]/page.tsx'"
  - id: settings-page-exists
    description: /settings/page.tsx exists
    cmd: "test -f packages/studio/src/app/settings/page.tsx"
---

**Task editor** at `/playbooks/[name]/tasks/by-path/[...path]/page.tsx` (note: catch-all wrapped in `by-path/` to avoid Next.js sibling-of-catchall conflict — see troubleshooting #12 from converge-control skill):
- Frontmatter form (left): id, title, dependencies, outputs[], checks[]
- Monaco markdown body (right)
- Buttons: Save / Reset / Reset checkpoint
- Save → `PUT /api/playbooks/[name]/tasks/by-path/[...path]`
- Reset checkpoint → `POST /api/playbooks/[name]/task-reset/[...path]`

**`/settings/page.tsx`**:
- Theme picker (next-themes)
- Language switcher
- Read-only: data dir (`process.env.CONVERGE_PROJECT_ROOT`)
- Use MC's settings-panel visual treatment if it survived the fork; otherwise simple form fields
