---
id: 004-task-editor
title: Task editor (frontmatter form + Monaco markdown body)
dependencies:
  - 001-prune-mc-pages
outputs:
  - packages/converge-studio/src/app/playbooks/[name]/tasks/[...path]/page.tsx
checks:
  - id: page-exists
    description: Task editor page exists
    cmd: "test -f 'packages/converge-studio/src/app/playbooks/[name]/tasks/[...path]/page.tsx'"
  - id: typecheck
    description: Page typechecks
    cmd: "pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq"
---

Build the per-task editor page.

**URL**: `/playbooks/[name]/tasks/[...path]` — `path` is the relative task directory under `<playbook>/tasks/`, e.g. `01-brand` or `01-brand/tasks/001-source-rename`.

**Layout**:

- Header: breadcrumb (playbook → ancestor tasks → this task), "Reset checkpoint" button, "Save" button.
- Two-pane:
  - **Frontmatter form** — typed inputs for known fields:
    - `id` (text), `title` (text), `dependencies` (list of taskPath strings)
    - `outputs` (list of strings)
    - `checks` (list of `{ id, description, cmd }`)
    - Free-form fields (e.g. `wbs`, `blocking`) shown as a JSON editor fallback
  - **Body** — Monaco editor in markdown mode for the task prompt body.
- Bottom: a read-only "Last run" panel showing `readCheckpoint` result if non-null.

**Save flow**:

1. Fetch on mount: `GET /api/playbooks/[name]/tasks/[...path]` → `{ frontmatter, body }`.
2. On Save: `PUT /api/playbooks/[name]/tasks/[...path]` with `{ frontmatter, body }` from form/editor state.
3. On Reset: `POST /api/playbooks/[name]/tasks/[...path]/reset`.

**Lossy round-trip warning**: gray-matter's YAML serializer reformats keys and may drop comments. Show a small banner the first time the user edits a task: "Saving will reformat the YAML frontmatter. Comments and exact quoting may not be preserved." Persist the dismissal to localStorage.

**Reuse**: `@monaco-editor/react`, Mission Control's form components.
