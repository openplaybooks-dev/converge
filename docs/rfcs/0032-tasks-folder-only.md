---
rfc: 0032
title: Remove inline task definitions from playbook.yml
status: accepted
type: refactor
source: human
priority_tier: tier1
estimate: "2-3 days"
backwards_compatible: no
risk: medium
breaks_existing: yes
---
# RFC 0032: Remove inline task definitions from playbook.yml

## Problem

Converge currently supports **two ways** to define tasks in a playbook:

1. **Inline in playbook.yml** — tasks defined directly in the `tasks:` array with fields like `title`, `description`, `prompt`, `depends_on`, `outputs`, `checks`, etc.
2. **Tasks folder** — tasks defined as `tasks/<id>/TASK.md` files, referenced by `path` or `id` in playbook.yml's `tasks:` array

The loader merges both sources: inline fields override TASK.md fields when both exist. This dual-surface pattern creates:

- **Ambiguity** — which source is authoritative? Inline fields silently override TASK.md.
- **Drift** — a task can have `prompt:` in playbook.yml and a different prompt body in TASK.md.
- **Complexity** — the loader has branching logic for "inline-only", "TASK.md-only", "both", and "file: reference".

RFC 0031 (unified-tasks-jsonl) already moves toward **one file, one row schema** for runtime state. This RFC completes the consolidation by establishing **one authoring surface** for task definitions: the `tasks/` folder.

**Why now:** The codebase has 33 RFCs in the backlog. Examples like `hello-world`, `data-pipeline`, `fullstack-app`, and `app-builder` all use inline task definitions. The framework's own playbooks (`rfc-ideation`, `code-audit`, `rfc-shipping`) use minimal inline entries (`- id: ideate`) that reference `tasks/ideate/TASK.md`. This RFC draws a clean line: **tasks/ is the source of truth; playbook.yml declares the graph.**

## Current behavior

### Inline task definition (supported today)
```yaml
# playbook.yml
tasks:
  - id: analyze
    title: "Analyze codebase"
    description: "Run static analysis"
    prompt: "Run eslint and report findings"
    depends_on: []
    outputs:
      - analysis.json
    checks:
      - id: valid-json
        cmd: jq . analysis.json
```

No `tasks/analyze/TASK.md` required. The loader synthesizes a `TaskDefinition` from inline fields.

### Tasks folder (supported today)
```yaml
# playbook.yml
tasks:
  - path: analyze
```

```markdown
<!-- tasks/analyze/TASK.md -->
---
title: Analyze codebase
description: Run static analysis
outputs:
  - analysis.json
checks:
  - id: valid-json
    cmd: jq . analysis.json
---

Run eslint and report findings to analysis.json.
```

The loader reads TASK.md and builds the `TaskDefinition` from frontmatter + body.

### Hybrid (supported today, creates drift)
```yaml
# playbook.yml
tasks:
  - path: analyze
    prompt: "Use eslint --fix"  # overrides TASK.md body
```

The loader merges: inline `prompt` wins, TASK.md provides `outputs` and `checks`. **This is the drift surface.**

## Proposal

**Ban the `tasks:` key from playbook.yml entirely. Tasks are auto-discovered from the `tasks/` folder only.**

### New behavior

1. **playbook.yml declares metadata only** — name, description, run config, checks, vars. The `tasks:` key is removed entirely:
   ```yaml
   name: default
   description: Analyze codebase and produce a report
   run:
     mode: oneoff
     maxTaskAttempts: 3
   checks:
     - id: report-exists
       cmd: test -f report.md
   ```

2. **tasks/ folder is the sole source of truth** — every task must have `tasks/<id>/TASK.md`:
   ```
   .converge/playbooks/default/
     playbook.yml
     tasks/
       analyze/
         TASK.md
       report/
         TASK.md
   ```

   The TASK.md frontmatter declares the task's `depends_on`, `outputs`, `checks`, etc. The loader auto-discovers all tasks by scanning `tasks/*/TASK.md`.

3. **Loader throws on `tasks:` key** — if playbook.yml contains a `tasks:` key of any kind (even empty array), the loader rejects it:
   ```
   Error: playbook.yml contains a `tasks:` key.
   Inline task declarations are no longer supported (RFC 0032).
   Remove the `tasks:` block from playbook.yml — tasks are auto-discovered from the tasks/ folder.
   Migration: run `converge migrate --rfc=0032`
   ```

4. **`file:` reference removed** — the `file:` field is deleted. Tasks are always at `tasks/<id>/TASK.md`.

### Migration path

`converge migrate --rfc=0032` per playbook:

1. Parse `playbook.yml`'s `tasks:` array.
2. For each entry with inline fields (`title`, `description`, `prompt`, etc.):
   - Create `tasks/<id>/TASK.md` if it doesn't exist.
   - Write frontmatter from inline fields.
   - Write body from `prompt` field (if present).
   - If TASK.md already exists, **merge**: inline fields override existing frontmatter, append a migration note to the body.
3. **Delete** the `tasks:` block from `playbook.yml`.
4. Validate: re-load the playbook with the new loader; DAG must match pre-migration DAG (same nodes, same edges, same `taskDef` per node).

### Code changes

**packages/core/src/config/declarative-loader.ts:**

1. **Throw on `tasks:` key** — if playbook.yml contains `tasks:`, the loader rejects it immediately with RFC 0032 error.
2. **Delete `TaskEntry` interface** — no longer needed.
3. **Simplify `resolveTaskDef`** — no longer reads playbook.yml for task graph. Always load from `tasks/<id>/TASK.md`. Throws if missing.
4. **Delete `hasInlineFields`, `findTaskPath`, `resolveTaskPath`** — removed entirely.
5. **Auto-discovery only** — scan `tasks/*/TASK.md` to build DAG. `depends_on` comes from TASK.md frontmatter.

**packages/core/src/config/declarative-loader-unified.ts:**

- Legacy playbook loader updated to match new `tasks:` key rejection.

**packages/core/src/migrate/rfc-0032.ts:**

- `migratePlaybookToTasksFolder(playbookDir: string): MigrationReport`
- Reads playbook.yml, extracts inline fields, writes TASK.md files, rewrites playbook.yml to remove `tasks:` block.

**packages/cli/src/commands-migrate.ts:**

- Add `--rfc=0032` handler.

### Backwards compatibility

**Clean break. No migration window. No soft deprecation.**

Playbooks with a `tasks:` key in playbook.yml **throw immediately** on load. The `converge migrate --rfc=0032` command is the only escape hatch — run it before the loader will accept the playbook.

The `TaskEntry` interface, `hasInlineFields`, `findTaskPath`, and `resolveTaskPath` helper functions are **deleted**, not deprecated. No stub DAGs for error recovery. No "graceful degradation". If the playbook doesn't comply, it fails fast.

## Verification

1. **Migrator parity** — for each example playbook (`hello-world`, `data-pipeline`, `fullstack-app`, `app-builder`):
   - Run `converge migrate --rfc=0032`.
   - Load the playbook with the new loader.
   - Compare DAG to pre-migration DAG: same nodes, same edges, same `taskDef` per node.

2. **Throw on inline fields** — create a test playbook with inline `title`, `prompt`, `outputs`. Expect loader to produce `inline_task_definition` error with migration instructions.

3. **Auto-discovery unchanged** — playbook with empty `tasks:` array and `tasks/*/TASK.md` files still loads correctly.

4. **Existing tasks-folder playbooks unchanged** — `rfc-ideation`, `code-audit`, `rfc-shipping` already use tasks-folder pattern. They load without migration.

## Impact

- **Examples** — 5+ examples need migration (`hello-world`, `data-pipeline`, `fullstack-app`, `app-builder`, `flutter-app`).
- **Framework playbooks** — `rfc-ideation`, `code-audit`, `rfc-shipping` already use tasks-folder pattern; no migration needed.
- **User playbooks** — any playbook with inline task definitions must run the migrator before upgrading.

## Relationship to RFC 0031

RFC 0031 (unified-tasks-jsonl) consolidates **runtime state** into one file (`tasks.jsonl`). This RFC consolidates **authoring surface** into one location (`tasks/` folder). Together:

- **Authoring** — tasks/ folder (TASK.md files)
- **Runtime** — tasks.jsonl (one row per task)
- **Graph** — playbook.yml (task IDs + dependencies)

Three files, three concerns, zero drift.

## Anti-goals

- **NOT** keeping the `tasks:` key in playbook.yml for graph-only references. The loader now auto-discovers from `tasks/` — the key is banned entirely.
- **NOT** removing playbook.yml entirely. It remains for playbook header (name, description, run config, checks, vars).
- **NOT** silent dual-format support. A workspace with a `tasks:` key is rejected; the migrator is mandatory.

## Why now

The codebase has 33 RFCs in the backlog. Examples like `hello-world`, `data-pipeline`, `fullstack-app`, and `app-builder` all use inline task definitions. The framework's own playbooks (`rfc-ideation`, `code-audit`, `rfc-shipping`) use minimal inline entries (`- id: ideate`) that reference `tasks/ideate/TASK.md`. This RFC draws a clean line: **tasks/ is the source of truth; playbook.yml declares the graph.**

The dual-surface pattern creates ambiguity (which source is authoritative?), drift (inline fields silently override TASK.md), and complexity (branching loader logic). RFC 0031 already established one file for runtime state. This RFC completes the consolidation by establishing one authoring surface for task definitions.

One file. One source of truth. Zero drift.
