# Schema Reference

Format reference for converge planning artifacts. Read when you need to write or validate TASK.md frontmatter, playbook.yml, checks, container behavior, and spawn templates.

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

### Three practical TASK.md roles

- **Leaf task** — produces outputs directly.
- **Static container** — owns child tasks under `tasks/` and converges their results.
- **Dynamic container** — declared `mode: spawner` (one-shot) or `mode: converger` (wave loop); body writes `<id>/spawn.yml` invocation files under `$CONVERGE_SPAWN_DIR` (RFC 0024). The framework expands templates and applies; the parent's `converge` block (or `halt_when:` / `wave_check:`) decides continue vs halt.

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
| `vars` | Optional | resources | object | Template variables passed to seed/children |
| `passthrough` | Optional | execution | boolean | Run the body's shell commands directly without invoking the AI agent. Orthogonal to `mode:`. |
| `mode` | Always (default: `leaf`) | execution | string | `"leaf" \| "spawner" \| "converger" \| "gateway"` — RFC 0022 lifecycle. Dispatch branches on this. |
| `spawn` | With `mode: spawner` | execution | object | `{ min_children?, max_children?, apply? }` — defaults to `apply: auto`. |
| `converge` | Looping/container tasks | convergence | string/object | Post-body verdict prompt that decides continue vs halt |
| `tags` | Optional | metadata | string[] | Categorization labels |
| `blocking` | Optional | scheduling | boolean | If true, blocks all downstream until done |
| `executor` | Optional | execution | object | Execution method override |
| `allowed-tools` | Optional | sandbox | string[] | Restrict available tools |

A leaky contract is one where any field above is missing, vague, or over-broad.

### Recommended dynamic-container shape

Use this when a parent task needs to fan out to children whose set is data-driven:

```yaml
---
id: build
title: Build
mode: spawner
spawn:
  min_children: 1
checks:
  - id: spawn-clean
    cmd: '! grep -q "^- \[ \]" "$CONVERGE_SPAWN_DIR/STATUS.md"'
---
```

Then in the body:

- read the upstream catalog (a JSON file, a directory listing, etc.)
- for each entry, write one invocation file at `$CONVERGE_SPAWN_DIR/<id>/spawn.yml` — three fields: `template:`, optional `depends_on:`, `params:`
- the framework expands every invocation against `templates/<name>/` and applies (with `apply: auto`, the default)
- per-child failures surface in `$CONVERGE_SPAWN_DIR/STATUS.md` as `- [ ]` rows with `fix:` blocks the repair loop can apply verbatim
- byte-identical re-runs are a no-op; delete the child dir to force re-spawn

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

## Dynamic work shapes

Current Converge uses one primary dynamic-work mechanism: **template invocation** (RFC 0024).

**Runtime spawn templates** live in `templates/<name>/`:

```
templates/sprint/
  TASK.md          # contract with {{paramName}} interpolation
  PARAMS.yml       # optional — declared params (types, required, defaults)
  EXAMPLES.yml     # optional — canonical invocations + when_to_pick guidance
```

Bodies invoke them by writing `<id>/spawn.yml` files under `$CONVERGE_SPAWN_DIR` — exactly three fields per file.

---

## Spawn-template pattern

Use runtime templates when the same child shape repeats. The body writes:

```yaml
# $CONVERGE_SPAWN_DIR/sprint-3/spawn.yml
template: sprint
params:
  wave: 3
  sprint_id: sprint-3
```

The directory name (`sprint-3`) *is* the child id. The framework resolves the template under `.converge/playbooks/<name>/templates/sprint/`, validates `params:` against `PARAMS.yml` (or inferred from `{{...}}` references), and applies.

Recommended usage:

- keep repeated child shapes in `templates/<name>/` with a `PARAMS.yml` declaring the param contract
- ship `EXAMPLES.yml` so bodies can pick by closest example rather than reading the schema
- byte-identical re-runs of a `spawn.yml` are no-ops; delete the child dir to force re-spawn
- pair spawn with a status-clean check: `! grep -q '^- \[ \]' "$CONVERGE_SPAWN_DIR/STATUS.md"`

---

## Directory naming

Static tasks live under `.converge/playbooks/{name}/tasks/`. Runtime-spawn templates live under `.converge/playbooks/{name}/templates/`.

```
tasks/{id}/TASK.md       → static task contract (executable or container)
tasks/{id}/PLAN.md       → container blueprint
templates/{name}/TASK.md → runtime spawn template
```

- IDs are plain kebab-case slugs (`prepare`, `build-screens`, `per-character`).
- **Static children** under a parent's `tasks/` subdirectory MUST use `\d{2,3}-` prefixes (e.g., `01-prepare`, `02-build-screens`). This is required by `discoverStaticChildren` which matches `^\d{2,3}-` to discover child TASK.md files. The numeric prefix controls execution order within the parent.
- **Top-level tasks** and **templates** use kebab-case without numeric prefixes — order comes from `depends_on` edges in `playbook.yml`.
- `tasks/` and `templates/` are siblings at the playbook root.
- Spawned children are materialized by the runtime, not written during init.

```
playbooks/default/
├── playbook.yml
├── PLAN.md
├── tasks/
│   └── build/
│       ├── TASK.md
│       └── PLAN.md
└── templates/
    ├── sprint/
    │   └── TASK.md
    └── phase/
        └── TASK.md
```
