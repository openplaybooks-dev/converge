# Schema Reference

Field reference for playbook.yml and TASK.md frontmatter.

---

## playbook.yml

```yaml
name: default
description: End-to-end app generation
run:
  maxIterations: 50
  maxTaskAttempts: 3
tasks:
  - id: 01-prepare
  - id: 02-build
    depends_on: [01-prepare]
goals:
  - id: code-quality
    checks:
      - cmd: pnpm tsc --noEmit
```

`tasks:` lists top-level task IDs with `depends_on` edges. `goals:` is for measurable completion conditions — different from per-task `outputs:`/`checks:`.

---

## TASK.md frontmatter

```yaml
---
id: task-name
title: Human-Readable Title
description: One-line purpose
depends_on:
  - upstream-task
inputs:
  - path/to/input.md
outputs:
  - path/to/output.md
skills:
  - skill-name
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
| `title` | Yes | Human-readable |
| `description` | Recommended | One-line |
| `inputs` | If reads files | Must trace to upstream outputs |
| `outputs` | Yes | Specific paths — not "various files" |
| `checks` | Yes | At least one per output |
| `depends_on` | If needed | Sibling/cross-branch IDs |
| `skills` | If using | Skill names the task delegates to |
| `vars` | Optional | Template variables |
| `mode` | Default: `leaf` | `leaf` / `spawner` / `converger` / `gateway` |
| `spawn` | With `spawner` | `{ template?, min_children?, max_children?, apply? }` |
| `converge` | With `converger` | `{ max_waves, halt_when?, wave_check? }` |

---

## Spawn template (`templates/<name>/TASK.md`)

Handlebar-templated task instantiated at runtime. `{{paramName}}` substituted by the spawner.

```yaml
---
id: screen
title: Screen {{screenId}}
inputs:
  - 02-design-system/theme.json
outputs:
  - lib/screens/{{screenId}}.tsx
depends_on: [02-design-system]
checks:
  - id: exists
    cmd: test -f lib/screens/{{screenId}}.tsx
---
```

Never write a child TASK.md directly from a spawner body — use a template.

**Optional template files:**

- `PARAMS.yml` — declares param names, types, required/optional, defaults
- `EXAMPLES.yml` — canonical invocations with guidance on when to pick this template

**Load template:** spawned by a parent calling `ctx.loop.spawn(target, { params: { screenId: 'home' } })`. The framework interpolates `{{screenId}}` and applies.

---

## Skills directory

```
playbooks/<name>/skills/<skill-name>/
├── SKILL.md              # methodology — loaded when task uses skills: [<name>]
├── references/           # deep detail, loaded on demand
│   └── <topic>.md
└── scripts/              # deterministic helpers (sh, py)
    └── helper.sh
```

The skill is referenced by name in task frontmatter (`skills: [skill-name]`). The runtime resolves it from the playbook's `skills/` directory, then project-scoped `.claude/skills/`, then global `.converge/skills/`.

```yaml
checks:
  - id: file-exists
    cmd: test -f output.md
  - id: valid-json
    cmd: jq empty data.json
  - id: has-section
    cmd: grep -q "## Overview" output.md
  - id: compiles
    cmd: pnpm tsc --noEmit
```

Exit `0` = pass, non-zero = fail.