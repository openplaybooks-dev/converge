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
  mode: oneoff                # 'oneoff' is the canonical mode (matches every shipped example)
  maxIterations: 50
  maxTaskAttempts: 3
  # maxDuration: 12h          # optional wall-clock cap; also accepts ms
  # resume: true              # optional auto-resume on re-run
tasks:
  - id: 01-prepare
  - id: 02-design-system
    depends_on:
      - 01-prepare
  - id: 03-build-screens
    depends_on:
      - 02-design-system
goals:                        # optional — measurable end-state conditions
  - id: type-check
    description: TypeScript compiles
    checks:
      - id: tsc
        cmd: npx tsc --noEmit
```

`tasks:` lists top-level task IDs (each resolved to `tasks/<id>/TASK.md`) with their `depends_on` edges. `goals:` is for measurable playbook-wide completion conditions (different from per-task `outputs:`/`checks:`); each goal has its own `checks` array. Most playbooks omit `goals:`.

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

### Four practical TASK.md roles (RFC 0022 modes)

- **`mode: leaf`** (default) — produces outputs directly. No children.
- **`mode: spawner`** — body calls `converge spawn` to register children from templates; framework expands and applies post-body. One-shot fan-out.
- **`mode: converger`** — multi-wave loop; body re-runs each wave until `halt_when` / `wave_check` / `halt.marker` fires, capped by `max_waves`.
- **`mode: gateway`** — synchronisation point with no body and no outputs. Downstream depends on one edge instead of N.

A parent task with static children under `tasks/` is implicitly a container that converges once every child completes — no `mode:` declaration required on the parent for that case (children are discovered at compile time). See `references/task-modes.md` for the full contract.

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
| `skills` | If using | resources | string[] | Names of Converge skills to invoke instead of (or in addition to) the inline prompt body. `skill: <name>` (singular string) is accepted as legacy shorthand. See `references/skills.md` for when to factor a skill out vs. inline. |
| `vars` | Optional | resources | object | Template variables passed to children at spawn time |
| `mode` | Always (default: `leaf`) | execution | string | `"leaf" \| "spawner" \| "converger" \| "gateway"` — RFC 0022 lifecycle contract. Runtime dispatcher branches on this. |
| `spawn` | With `mode: spawner` | execution | object | `{ template?, min_children?, max_children?, apply? }` — defaults to `apply: auto` (framework runs `converge apply` post-body) |
| `passthrough` | Optional | execution | boolean | Run the body's shell commands directly without invoking the AI agent. Useful for orchestration bodies (a spawner reading a catalog). Works fully with `mode: leaf` and `mode: spawner`. With `mode: converger`, use the legacy do-while pattern (see skill.md §10). |
| `converge` | Looping/container tasks | convergence | object | RFC 0022 form: `{ max_waves, halt_when?, wave_check? }` (used with `mode: converger`). Legacy form: `{ prompt?, cmd? }` post-body verdict for do-while loops. |
| `tags` | Optional | metadata | string[] | Categorization labels |
| `blocking` | Optional | scheduling | boolean | If true, blocks all downstream until done |
| `executor` | Optional | execution | object | `{ type, path, args, env? }` — override the executor |

A leaky contract is one where any field above is missing, vague, or over-broad.

### Recommended `mode: spawner` shape

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
- for each entry, call `converge spawn --template <name> --id <id> --param key=value [--after <dep-id>]`
- the framework expands every spawn against the named template under `templates/<name>/`, validates params against `PARAMS.yml`, and applies (with `apply: auto`, the default)
- per-child failures surface in `$CONVERGE_SPAWN_DIR/STATUS.md` as `- [ ]` rows with `fix:` blocks the repair loop can apply verbatim

### Recommended `mode: converger` shape (multi-wave loop)

Use this when the stopping condition is a check, not a count:

```yaml
---
id: fix-type-errors
title: Fix all type errors
mode: converger
converge:
  max_waves: 20
  halt_when:
    - id: zero-type-errors
      cmd: pnpm tsc --noEmit
---
```

The body re-runs each wave; the framework evaluates the halt signal between waves. The body may also write `$CONVERGE_TASK_DIR/halt.marker` to halt explicitly.

> ⚠️ The `converge:` field accepts two shapes: the RFC 0022 form (`{ max_waves, halt_when?, wave_check? }`) used with `mode: converger`, and the legacy do-while form (`{ prompt, cmd }`) for non-converger post-body verdicts. Disambiguated at parse time by which keys are present.

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

Current Converge uses one primary dynamic-work mechanism: **`converge spawn` CLI calls** (RFC 0031). Reusable child contracts live in `templates/<name>/` and bodies invoke them via `converge spawn` commands that append rows to `tasks.jsonl`.

---

## Spawn syntax — `converge spawn` CLI

A `mode: spawner` (or `mode: converger`) body calls `converge spawn` once per child. The framework resolves the template, validates params against the template's `PARAMS.yml`, expands the template, and applies — preview→apply, with no journal mutation until every spawn expands cleanly.

**CLI syntax (RFC 0031):**

```bash
converge spawn --template <template-name> --id <child-id> \
  --param key=value [--param key2=value2] \
  [--after <sibling-id>]
```

There is no `outputs:`, no `checks:`, no body on the spawn call. Templates own all of those; bodies only invoke.

**Template layout under `templates/<name>/`:**

```
templates/asset-spec/
  TASK.md          # the contract, with {{paramName}} interpolation
  PARAMS.yml       # optional — declared params, types, required, defaults
  EXAMPLES.yml     # optional — canonical invocations + when_to_pick guidance
```

If `PARAMS.yml` is absent, the framework infers required params from `{{...}}` references in the template's TASK.md.

**Example body** (a sprint spawner reading a catalog):

```bash
jq -c '.sprints[]' state/sprint-plan.json | while read -r S; do
  ID=$(echo "$S" | jq -r '"sprint-\(.wave)"')
  PARAMS=$(echo "$S" | jq -r 'to_entries | map("--param \(.key)=\(.value)") | join(" ")')
  eval "converge spawn --template sprint --id $ID $PARAMS"
done
```

Per-child outcomes surface in `$CONVERGE_SPAWN_DIR/STATUS.md` — one `- [x]` or `- [ ]` row per child. Failed rows carry a `fix:` block telling the AI what to fix. Failure codes: `template-not-found`, `missing-required-param`, `unknown-param`, `param-type-mismatch`, `duplicate-id`, plus the anti-goal locks `SPAWN_TASKMD_AUTHORED_BY_BODY` and `SPAWN_MANIFEST_AUTHORED_BY_BODY`.

**Recommended usage:**

- keep repeated child shapes in `templates/<name>/TASK.md` with a `PARAMS.yml` declaring the param contract
- ship `EXAMPLES.yml` so bodies can pick by closest example rather than reading the schema
- build spawn calls deterministically from upstream catalogs — re-running with identical params is a no-op; same-id-different-params surfaces as `duplicate-id` (drop the child to force re-spawn)
- pair spawn with a status-clean check: `! grep -q '^- \[ \]' "$CONVERGE_SPAWN_DIR/STATUS.md"`
- for multi-wave loops, use `mode: converger` with `halt_when:` / `wave_check:` / `halt.marker` to terminate

---

## Skills

A task that references a skill via `skills: [<name>]` delegates the *how* of producing its outputs to a `SKILL.md` that lives alongside the project. Use this when the methodology is reusable; keep the body inline when it's one-time orchestration. See `references/skills.md` for the full authoring guide.

### Resolver search order

The runtime resolves a skill name to a `SKILL.md` file by searching, in order — first hit wins:

1. **`.skill/<name>/SKILL.md`** — repo-local (rare; iteration scratch space).
2. **`.converge/playbooks/<playbook>/skills/<name>/SKILL.md`** — **playbook-scoped**. Recommended for skills that only matter inside one playbook.
3. **`.claude/skills/<name>/SKILL.md`** — **project-scoped**. Cross-playbook reuse within the repo. `converge init --skills` installs bundled skills here (and at `.codex/skills/`).
4. **`.converge/skills/<name>/SKILL.md`** — legacy global; supported but discouraged for new work.

Pick the narrowest scope that fits. A skill used only by one playbook belongs under that playbook's `skills/` folder, not at the project root.

### Minimal SKILL.md frontmatter

Both Anthropic's canonical spec and Converge accept this shape:

```markdown
---
name: greeting-author
description: >-
  Write greeting JSON files with required fields (name, language,
  timestamp). Use this skill whenever a task asks for a structured
  greeting file, a multi-locale hello message, or any
  `output/*greeting*.json` deliverable.
---

# Greeting Author

## When to use this skill
…

## Instructions
…
```

`name` is kebab-case and must match the directory name. `description` is the **primary triggering mechanism** — write it concretely (list trigger phrases an agent will see) and keep it around 100 words. See `references/skills.md` for the full authoring checklist and progressive-disclosure layout (`SKILL.md` ≤500 lines, deeper material in `references/` and `scripts/`).

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
