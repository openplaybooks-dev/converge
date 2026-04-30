# Schema Reference

Format reference for converge planning artifacts. **For the contract model that explains *why* these fields exist, see `SKILL.md` §1.**

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
  - id: 01-prepare-requirements
  - id: 02-design-system
    depends_on: [01-prepare-requirements]
  - id: 03-build-screens
    depends_on: [02-design-system]
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
id: 001-task-name
title: Human-Readable Title
description: What this task accomplishes in one sentence
dependencies:
  - upstream-task-id
  - 01-requirements.002-spec       # Cross-branch dotted path
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
| `id` | Yes | identity | string | Unique among siblings: `NN-kebab-case` (top) or `NNN-kebab-case` (child) |
| `title` | Yes | scope | string | Human-readable title |
| `description` | Recommended | scope | string | One-line purpose |
| `inputs` | If reads | **Context In** | string[] | Files this task reads (must be upstream outputs) |
| `outputs` | Yes | **Context Out** | string[] | Files this task produces |
| `checks` | Yes | acceptance | Check[] | Deterministic validation commands |
| `dependencies` | If needed | deps | string[] | Sibling/cross-branch task IDs that must complete first |
| `skills` | If using | resources | string[] | Converge skills to invoke |
| `references` | Optional | resources | string[] | Skill libraries to reference |
| `vars` | Optional | resources | object | Template variables passed to WBS/children |
| `wbs` | Optional | delegation | object | WBS template config (see WBS API below) |
| `tags` | Optional | metadata | string[] | Categorization labels |
| `blocking` | Optional | scheduling | boolean | If true, blocks all downstream until done |
| `executor` | Optional | execution | object | Execution method override |
| `allowed-tools` | Optional | sandbox | string[] | Restrict available tools |

A leaky contract is one where any field above is missing, vague, or over-broad. See SKILL.md §6.

---

## Dependency formats

```yaml
# Sibling (same level)
dependencies:
  - 001-upstream-task

# Cross-branch (dotted path from playbook root)
dependencies:
  - 01-requirements.002-spec

# Tag-based (any task with this tag)
dependencies:
  - tag:setup

# Mixed
dependencies:
  - 001-setup
  - 01-requirements.002-spec
  - tag:foundation
```

**Rules:**
- No cycles. If you find one, split the task.
- Minimize: depend only on what you actually consume.
- Top-level deps go in `playbook.yml` `depends_on`; intra-task deps go in `TASK.md` `dependencies`.

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

# Non-empty
- id: nonempty
  cmd: test -s output.md
  description: Output file is not empty

# Valid JSON
- id: valid-json
  cmd: jq empty data.json
  description: Valid JSON format

# Valid YAML
- id: valid-yaml
  cmd: python3 -c "import yaml; yaml.safe_load(open('config.yaml'))"
  description: Valid YAML format

# Has required section
- id: has-overview
  cmd: grep -q "## Overview" output.md
  description: Has Overview section

# TypeScript compiles
- id: compiles
  cmd: npx tsc --noEmit
  description: TypeScript compiles

# Tests pass
- id: tests-pass
  cmd: npm test -- --passWithNoTests
  description: All tests passing

# File count
- id: screens-generated
  cmd: test $(ls screens/*.html 2>/dev/null | wc -l) -ge 3
  description: At least 3 screens generated
```

**Rules:**
- Every output gets at least one check (existence + non-empty minimum).
- Code outputs add a compilation check.
- Data outputs add format validation.
- Never use exact string matching — too brittle.

---

## WBS API

WBS spawns N child tasks dynamically — **one contract template, N instances**. Use when the same shape repeats from data.

### `ctx` API

| Property/Method | Description |
|----------------|-------------|
| `ctx.projectDir` | Absolute path to project root |
| `ctx.spawn(task)` | Instantiate one contract from this template |
| `ctx.ai.askJson(prompt, schema)` | Ask AI to return structured JSON (use only when data isn't in a file) |
| `ctx.log(message)` | Write to execution log |

### `ctx.spawn(task)` shape

```typescript
{
  id: string;              // Required: NNN-kebab-case
  title?: string;
  dependencies?: string[];
  inputs?: string[];
  outputs?: string[];
  skills?: string[];
  tags?: string[];
  vars?: Record<string, string>;
  checks?: Check[];        // At least one required
  body?: string;           // Markdown instructions (the contract body)
}
```

### Pattern 1 — WBS from JSON

```js
import { readFileSync } from 'fs';
import { join } from 'path';

export async function run(ctx) {
  const items = JSON.parse(
    readFileSync(join(ctx.projectDir, 'data.json'), 'utf-8')
  );

  for (const [i, item] of items.entries()) {
    await ctx.spawn({
      id: `${String(i + 1).padStart(3, '0')}-${item.id}`,
      title: item.name,
      dependencies: [],   // [] = parallel; [prevId] = sequential
      outputs: [`output/${item.id}.json`],
      checks: [{
        id: 'exists',
        cmd: `test -f output/${item.id}.json`,
        description: `${item.name} exists`,
      }],
      body: `Process ${item.name}.\n\n${JSON.stringify(item, null, 2)}`,
    });
  }
}
```

### Pattern 2 — WBS from AI analysis

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
- Every spawned task gets a unique `id` (NNN-kebab-case) and at least one `check`.
- `dependencies: []` for parallel; `dependencies: [prevId]` for sequential chains.
- Prefer reading from a file over `ctx.ai.askJson()` — it's faster and deterministic.

---

## Directory naming

All task directories live under `.converge/playbooks/{name}/tasks/`.

```
Top-level:    NN-kebab-case      → 01-requirements, 02-foundation
Children:     NNN-kebab-case     → 001-gather-needs, 002-create-spec
WBS-spawned:  NNN-NNN-kebab      → 003-001-screen-dashboard
```

- Top-level: two-digit prefix (01–99).
- Children: three-digit prefix (001–999).
- WBS-spawned: parent prefix + three-digit suffix.
- Always kebab-case after the number.
- Sort order matches execution order for sequential tasks.
- WBS scripts go in `wbs/index.js` within the task directory.
- WBS-spawned children go in `tasks/` within the task directory.

```
03-build-screens/
├── TASK.md              # The container contract
├── wbs/
│   └── index.js         # The WBS template logic
└── tasks/               # WBS-spawned children
    ├── 001-home/TASK.md
    ├── 002-dashboard/TASK.md
    └── 003-settings/TASK.md
```
