# Schema

Field reference for playbook.yml and TASK.md frontmatter. Read when writing contracts.

---

## playbook.yml

```yaml
name: default
description: End-to-end app generation
run:
  maxTaskAttempts: 3
tasks:
  - id: 01-prepare
    path: 01-prepare
goals:
  - id: code-quality
    checks:
      - cmd: pnpm tsc --noEmit
```

`tasks:` lists top-level task entries — only `id` + `path`. Task bodies (inputs:, outputs:, checks:) go in `tasks/<id>/TASK.md`.

---

## TASK.md frontmatter

```yaml
---
id: task-name
title: Human-Readable Title
inputs:
  - path/to/input.md
outputs:
  - path/to/output.md
checks:
  - id: check-id
    cmd: shell-command-returns-0
    description: What this validates
---
```

### Field summary

| Field | Required | Notes |
|---|---|---|
| `id` | Yes | Unique kebab-case slug |
| `title` | Yes | Human-readable, noun phrase for the output |
| `inputs` | If reads files | Must trace to an upstream output |
| `outputs` | Yes | Specific paths — not "various files" |
| `checks` | Yes | At least one per output |
| `skills` | If using | Skill names the task delegates to |
| `vars` | Optional | Template variables |
| `mode` | Default: `task` | `task` / `spawner` / `converger` / `gateway` |
| `spawn` | With `spawner` | `{ template?, min_children?, max_children?, apply? }` |
| `converge` | With `converger` | `{ max_waves, halt_when? }` |

**Note:** Do not write `depends_on:` in task frontmatter. Ordering is via `inputs:`.

---

## Checks

A check is a shell command — exit 0 = pass, non-zero = fail.

```yaml
checks:
  - id: file-exists
    cmd: test -f output.md
  - id: valid-json
    cmd: jq empty data.json
  - id: has-items
    cmd: 'jq -e ".items | length > 0" data.json'
```

Common patterns:
- `test -s <file>` — file exists and is non-empty
- `jq empty <file>` — valid JSON
- `pnpm tsc --noEmit` — TypeScript compiles
- `pnpm test` — tests pass

Playbook-level checks (`goals:`) use the same shape but run after the task pipeline completes.

---

## Spawn template (`templates/<name>/TASK.md`)

Handlebar-templated task instantiated at runtime. `{{paramName}}` substituted by the spawner.

```yaml
---
id: screen-{{screenId}}
title: Screen {{screenId}}
inputs:
  - 02-design-system/theme.json
outputs:
  - lib/screens/{{screenId}}.tsx
checks:
  - id: exists
    cmd: test -f lib/screens/{{screenId}}.tsx
---
```

Never write a child TASK.md directly from a spawner body — use a template.

**Optional:** `EXAMPLES.yml` — canonical invocations with guidance on when to pick this template.

---
