# Schema Reference

Format reference for converge planning artifacts. Read when you need to write or validate TASK.md frontmatter, playbook.yml, checks, or CLI-based seed tasks.

For the contract model that explains *why* these fields exist, see `../SKILL.md` or `model.md`.

---

## `playbook.yml`

Playbook manifest. Defines the top-level task list, dependencies, run config, and playbook-level checks.

**Location:** `.converge/playbooks/{name}/playbook.yml`

```yaml
name: default
description: End-to-end app generation
run:
  mode: autonomous
  maxIterations: 50
  maxTaskAttempts: 3
tasks:
  - path: prepare
  - path: design-system
  - path: build-screens
checks:
  - id: type-check
    cmd: npx tsc --noEmit
```

---

## `TASK.md`

The delegation contract. One per task directory. **Same schema at every nesting level** — top-level tasks and deeply nested children use identical TASK.md format.

**Location:** `.converge/playbooks/{name}/tasks/{path-to-task}/TASK.md`

```yaml
---
id: task-name
title: Human-Readable Title
description: What this task accomplishes in one sentence
depends_on:
  - upstream-task-id
  - prepare.catalog              # Cross-branch dotted path
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

# Task Title

[Concrete, step-by-step instructions for the executor]
```

### Frontmatter fields

| Field | Required | Contract role | Type | Description |
|-------|----------|---------------|------|-------------|
| `id` | Yes | identity | string | Unique kebab-case slug (`prepare`, `build-screens`). No numeric prefix. |
| `title` | Yes | scope | string | Human-readable title |
| `description` | Recommended | scope | string | One-line purpose |
| `inputs` | If reads | **Context In** | string[] | Files this task reads (must be upstream outputs) |
| `outputs` | Yes | **Context Out** | string[] | Files this task produces |
| `checks` | Yes | acceptance | Check[] | Deterministic validation commands |
| `depends_on` | If needed | deps | string[] | Sibling/cross-branch task IDs that must complete first |
| `skills` | If using | resources | string[] | Converge skills to invoke |
| `references` | Optional | resources | string[] | Skill libraries to reference |
| `vars` | Optional | resources | object | Template variables passed to seeded tasks/children |
| `tags` | Optional | metadata | string[] | Categorization labels |
| `blocking` | Optional | scheduling | boolean | If true, blocks all downstream until done |
| `executor` | Optional | execution | object | Execution method override |
| `allowed-tools` | Optional | sandbox | string[] | Restrict available tools |

A leaky contract is one where any field above is missing, vague, or over-broad.

---

## Dependency formats

```yaml
# Sibling (same level)
depends_on:
  - upstream-task

# Cross-branch (dotted path from playbook root)
depends_on:
  - prepare.catalog

# Tag-based (any task with this tag)
depends_on:
  - tag:setup

# Mixed
depends_on:
  - setup
  - prepare.catalog
  - tag:foundation
```

**Rules:**
- No cycles. If you find one, split the task.
- Minimize: depend only on what you actually consume.
- Dependencies are declared in `TASK.md` `depends_on` — each task owns its own edges.
- playbook.yml lists task paths only (no dependency wiring).

---

## Check schema

```yaml
checks:
  - id: string         # Unique kebab-case identifier
    cmd: string        # Shell command (exit 0 = pass, non-zero = fail)
    description: string # Human-readable description
```

### Common patterns

```yaml
# File exists
- id: exists
  cmd: test -f output.md
  description: Output file exists
  tags: [fast]

# Non-empty
- id: nonempty
  cmd: test -s output.md
  description: Output file is not empty
  tags: [fast]

# Valid JSON
- id: valid-json
  cmd: jq empty data.json
  description: Valid JSON format
  tags: [fast]

# JSON Schema validation
- id: valid-schema
  cmd: jq -e '.items | type == "array" and length >= 3' data.json
  description: Items array has at least 3 entries
  tags: [fast]

# Valid YAML
- id: valid-yaml
  cmd: python3 -c "import yaml; yaml.safe_load(open('config.yaml'))"
  description: Valid YAML format
  tags: [fast]

# Has required section
- id: has-overview
  cmd: grep -q "## Overview" output.md
  description: Has Overview section
  tags: [fast]

# TypeScript compiles
- id: compiles
  cmd: npx tsc --noEmit
  description: TypeScript compiles
  tags: [slow, build]

# Tests pass
- id: tests-pass
  cmd: npm test -- --passWithNoTests
  description: All tests passing
  tags: [slow, build]

# File count
- id: screens-generated
  cmd: test $(ls screens/*.html 2>/dev/null | wc -l) -ge 3
  description: At least 3 screens generated
  tags: [fast]

# Cross-reference: every catalog entry has a corresponding output
- id: all-catalog-entries-built
  cmd: |
    count=$(jq '.items | length' tokens-catalog.json)
    built=$(ls tokens/*.json 2>/dev/null | wc -l)
    test "$built" -eq "$count"
  description: One output file per catalog entry
  tags: [slow]

# Cross-task consistency: every screen in catalog has a source file
- id: screens-consistent
  cmd: |
    jq -r '.screens[].id' screens.json | while read id; do
      test -f "lib/screens/$id.html" || exit 1
    done
  description: Every screen in catalog has a generated file
  tags: [slow]

# No broken references
- id: no-broken-refs
  cmd: |
    ! grep -r "\[\[missing" output/ 2>/dev/null
  description: No unresolved [[wikilinks]] in output
  tags: [fast]
```

**Rules:**
- Every output gets at least one check (existence + non-empty minimum).
- Code outputs add a compilation check. Data outputs add format validation.
- Container tasks add cross-child consistency checks (count match, every-catalog-entry).
- Playbook-level checks validate cross-task invariants.
- Tag checks by cost: `fast` for file/grep checks, `slow` for compilation/test suites.
- Never use exact string matching — too brittle.

---

## seed API

Seed fan-out is now CLI-based. A seeded task declares:

```yaml
seed:
  mode: cli
```

The task body must emit only explicit `converge spawn task ...` or `converge spawn template ...` commands. The runtime validates those commands and writes the spawned `TASK.md` files into the inventory/journal flow.

### Spawn command shape

```bash
converge spawn task --id <id> \
  [--title <title>] \
  [--task-file <path>] \
  [--depends-on <id>] \
  [--input <path>] \
  [--output <path>] \
  [--tag <tag>] \
  [--check 'id|cmd'] \
  [--var key=value] \
  [--body <markdown>]
```

### Pattern 1 — seed from JSON

The seeded task reads a driver file, then emits one spawn command per item. Keep IDs deterministic and stable for the same input.

### Pattern 2 — seed from AI analysis

Use only when the task list isn't already in a file.

```js
import { z } from 'zod';

export async function run(ctx) {
  const items = await ctx.ai.askJson(
    'Scan src/api/ and list all route handlers that lack tests.',
    z.array(z.object({ path: z.string(), name: z.string() }))
  );

  for (const [i, item] of items.entries()) {
    await ctx.spawn({
      id: `${String(i + 1).padStart(3, '0')}-test-${item.name}`,
      title: `Write tests for ${item.name}`,
      inputs: [item.path],
      outputs: [item.path.replace('.ts', '.test.ts')],
      checks: [{
        id: 'tests',
        cmd: `npx vitest run ${item.path.replace('.ts', '.test.ts')}`,
        description: 'Tests pass',
      }],
      body: `Write unit tests for ${item.path}.`,
    });
  }
}
```

**Rules:**
- Always `export async function run(ctx)` — ESM only.
- Every spawned task gets a unique `id` (kebab-case slug) and at least one `check`.
- `dependencies: []` for parallel; `dependencies: [prevId]` for sequential chains.
- Prefer reading from a file over `ctx.ai.askJson()` — it's faster and deterministic.

### Seed declaration

When a TASK.md declares a seed, the supported form is CLI seed mode only.

**CLI seed declaration:**

```yaml
seed:
  mode: cli
```

**Best practice:** Keep seeded containers as normal task directories under `tasks/{container}/TASK.md`. The task body or attached skill should read the driver data and emit explicit `converge spawn ...` commands.

---

## Directory naming

Static tasks and seeded containers both live under `.converge/playbooks/{name}/tasks/`.

```
tasks/{id}/TASK.md       → task contract (static or seeded)
tasks/{id}/PLAN.md       → container blueprint
```

- IDs are plain kebab-case slugs (`prepare`, `build-screens`, `per-character`).
- **Static children** under a parent's `tasks/` subdirectory MUST use `\d{2,3}-` prefixes (e.g., `01-prepare`, `02-build-screens`). This is required by `discoverStaticChildren` which matches `^\d{2,3}-` to discover child TASK.md files. The numeric prefix controls execution order within the parent.
- **Seeded containers** and **top-level tasks** use kebab-case without numeric prefixes — order comes from `depends_on` edges in `playbook.yml`.
- Seed-spawned children are materialized by the runtime via `converge spawn ...`, not written during init.

```
playbooks/default/
├── playbook.yml
├── PLAN.md
├── tasks/
│   ├── prepare/
│   │   ├── TASK.md
│   │   └── PLAN.md
│   ├── wire/
│   │   ├── TASK.md
│   │   └── PLAN.md
│   └── build-screens/
│       └── TASK.md
```
