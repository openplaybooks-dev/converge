---
name: converge-control
description: >-
  Operate a Converge playbook end-to-end — start runs, monitor progress,
  narrow failures with `--select`, inspect runtime state, validate definitions,
  surgically reset subtrees, and stop stuck or orphaned runs. Use this skill
  whenever the user says "run my playbook", "execute this", "monitor the run",
  "converge failed", "the run is stuck", "retry failures", "babysit this
  playbook", "what's the status?", "show me the gantt", or asks how to use
  `converge run` / `--select` / `inspect` / `doctor` / `clean` / `stop`. Also
  use it for `HTTP 401` / `Invalid API key` failures on the first task — those
  are environment-not-playbook problems — and for any post-run cleanup work.
  Hand off to `converge-planning` if the user wants to design or restructure
  the playbook itself.
---

# Converge Control

## When to use this skill

Trigger this skill whenever the user is operating an existing playbook —
not authoring a new one. Concrete signals:

- A `.converge/project.yaml` + `playbooks/<name>/` already exist; the
  user wants the playbook to actually run, or wants to know what
  happened on the last run.
- The user reports a failure mid-run, a stuck task, an error in the
  journal, or wants to retry only what failed.
- The user asks operational questions: *what's running right now?*,
  *which tasks are blocked?*, *what did task X produce?*, *how much
  did the last run cost?*, *how do I re-run just the failures?*
- The user hits HTTP 401 / Invalid API key — that's an environment
  conflict between shell `ANTHROPIC_*` vars and the project's provider
  config, not a playbook bug. See entry §13 in
  `troubleshooting/playbook.md`.

If the user wants to design a new playbook, change its task tree, or
factor reusable instructions into skills, **hand off to
`converge-planning`**. This skill only operates what already exists.

## Current mental model

Converge has three important layers:

1. **Source blueprint** — `.converge/playbooks/<name>/`
   - `playbook.yml` — the manifest (top-level tasks, `depends_on`, `goals`).
   - `tasks/**/TASK.md` — task contracts (id, inputs, outputs, checks).
   - `templates/<name>/TASK.md` — runtime spawn templates for dynamic children.
   - `skills/<name>/SKILL.md` — **playbook-scoped skills** (the *how* paired with each task's *what*). Also searched at `.claude/skills/` (project-scoped) and `.codex/skills/`.
   - `scripts/` — orchestration helpers invoked from task bodies (e.g., to compute `<id>/spawn.yml` invocations from a catalog).
2. **Runtime state** — `.converge/journal/<playbook>/`, `.converge/inventory/<playbook>/`
   Execution state, event stream, per-task forensics, and the spawned-task ledger.
3. **Operator surface** — the CLI
   `run`, `status`, `list`, `show`, `inspect`, `doctor`, `playbook validate`, `tasks mark`, `skills list`, `clean`, `stop`.

The playbook is the source of truth. Do **not** hand-edit `runstate.json`, `manifest.json`, or journal files to "fix" a run.

### Three-layer task model

When interpreting failures or proposing fixes, remember each task carries content across three layers — different problems live in different layers:

- **TASK.md frontmatter** — the *contract* (id, inputs, outputs, checks, depends_on). Failures here look like dependency cycles, missing-input gaps, check-syntax errors. Fix the frontmatter.
- **TASK.md body** — the *subjective + context* for this invocation (which name, which path, which catalog row). Failures here look like a wrong-but-runnable result on this specific input. Fix the body's specifics or the project data the body reads.
- **SKILL.md** — the *general how-to* the task references via `skills: [<name>]`. Failures here look like the same wrong-result shape across many tasks that share the skill. Fix the skill body once, not each task.

If three tasks fail the same way and they all share `skills: [X]`, the bug is in skill X, not in the tasks.

### The per-task execution dir (`$CONVERGE_TASK_DIR`)

Every task gets a stable directory the runtime sets before the body runs:

```
.converge/journal/<playbook>/tasks/<task-id>/exec/
```

Exposed as `$CONVERGE_TASK_DIR` to the body. Bodies write evidence there; the framework reads from there. When a task misbehaves, this is the first place to look.

| File | What it means |
|---|---|
| `spawn/<id>/spawn.yml` | The spawner/converger body's per-child invocation (RFC 0024). Three fields: `template:`, optional `depends_on:`, `params:`. The dir name is the child id. |
| `spawn/<id>/EXPANDED.md` | Framework-rendered template TASK.md with `{{...}}` substituted. Useful when verifying that the body's params produced the intended contract. |
| `spawn/<id>/EVIDENCE.json` | Machine-readable per-child failure detail. Mirrors a row in STATUS.md. |
| `spawn/STATUS.md` | The single AI-facing transparency surface. One `- [x]` / `- [ ]` row per invocation. Failed rows carry a `fix:` block (file + patch). |
| `spawn.plan.jsonl` | (Legacy) the JSONL manifest path. Body authoring rejected with `SPAWN_MANIFEST_AUTHORED_BY_BODY` for new-surface playbooks. Old playbooks that haven't migrated still write here. |
| `spawn.plan.result.jsonl` | (Legacy) per-row outcome of the legacy `converge apply`. |
| `wave.counter` | Current wave number for `mode: converger` tasks. Persists across re-leases so wave state survives crashes. |
| `halt.marker` | The body's explicit "I'm done" signal for a converger. Highest-priority halt signal — overrides `halt_when:` and `wave_check:`. |
| `mode-violation.json` | RFC 0022 contract violation evidence. Read this first when a parent reports `FRONTIER_UNRESOLVED` or refuses to converge. Contains `errorCode`, `declaredMode`, `message`, `fixHint`. |

The directory persists across attempts on purpose — a crashed body's partial invocations survive into the next attempt's repair. See `reference/events.md` for the matching event-stream interpretation (e.g., `SEED_SPAWN`, `FRONTIER_UNRESOLVED`).

## Primary workflow

Use this loop unless a narrower recipe in `troubleshooting/playbook.md` fits exactly.

### 1. Preflight the playbook

Validate the definition before running:

```bash
converge playbook validate <name>
```

If the user is editing tasks live and wants a pure preview of what would execute:

```bash
converge run --playbook=<name> --dry
```

Use `--dry` instead of teaching an explicit compile-first workflow by default. `compile` still exists as a compatibility command, but the modern operator path is `run --dry`.

### 2. Start the run

```bash
converge run --playbook=<name>
```

Common narrowed runs:

```bash
# Only changed work and downstream
converge run --playbook=<name> --select 'state:modified+'

# Retry failures and their downstream consumers
converge run --playbook=<name> --select 'result:error+'

# One task / subtree
converge run --playbook=<name> --select '03-build+'

# Fail fast when debugging one subtree
converge run --playbook=<name> --select '03-build+' --fail-fast
```

### 3. Watch the run

Primary operator views:

```bash
converge status --playbook=<name>
converge list --playbook=<name> --exclude 'status:complete'
converge show gantt --playbook=<name>
converge show graph --playbook=<name> --detail
```

Raw event stream:

```bash
tail -f .converge/journal/<playbook>/events.jsonl
tail -f .converge/journal/<playbook>/events.jsonl | grep -E '(NODE_COMPLETE|NODE_FAIL|CHECK_FAIL|ERROR|CYCLE)'
```

### 4. If the run fails

First classify whether the problem is:

- **definition-shape** → `converge playbook validate <name>`
- **runtime-shape** → `converge doctor --playbook=<name>`
- **task / check-shape** → `converge inspect --playbook=<name> --task=<id>`
- **selection / graph-shape** → `converge list --playbook=<name> --select ...` or `converge show graph`

Then use the smallest surgical next step:

```bash
# Inspect one failed task
converge inspect --playbook=<name> --task=<taskId>

# Health-check the runtime state
converge doctor --playbook=<name>

# Reset only the failed subtree
converge clean --playbook=<name> --select '<taskId>+'

# Re-run just failures
converge run --playbook=<name> --select 'result:error+'
```

### 5. If the run is stuck or orphaned

```bash
# Stop the live process and release the lock
converge stop --playbook=<name>
```

If a single dynamic-container task is wedged in a continue-loop and the
operator (with the user's consent) wants to retire it manually:

```bash
# Mark one task done / dropped / blocked so the parent stops re-spawning
converge tasks mark <taskId> --playbook=<name> --status done
converge tasks mark <taskId> --playbook=<name> --status dropped --reasoning "user opted out"
```

Then restart with a narrowed selection if possible.

### 6. If the first task fails with `Invalid API key` / HTTP 401

This is almost always **environment**, not the playbook. The spawned
agent CLI (`claude`, `codex`) inherits `ANTHROPIC_*` / `OPENAI_*` env
vars from the shell, and a stale value from a previous proxy setup
will override the project's `.converge/project.yaml` env block.

```bash
env | grep -E 'ANTHROPIC_|OPENAI_|CLAUDE_'
# Reconcile against .converge/project.yaml's provider env:
cat .converge/project.yaml | grep -A20 'ai:'
# If the shell vars conflict with what project.yaml expects, unset them
# (or re-export to match) before re-running.
```

See `troubleshooting/playbook.md` §13 for the full recipe.

## Preferred command set

Use these first. They reflect the actual CLI surface and current docs.

```bash
# Run
converge run --playbook=<name>

# Preview
converge run --playbook=<name> --dry

# Current status tree
converge status --playbook=<name>

# Selection-aware listing
converge list --playbook=<name> --exclude 'status:complete'

# Graph / gantt / metrics / journal views
converge show graph --playbook=<name> --detail
converge show gantt --playbook=<name>
converge show metrics --playbook=<name> --by-model --top=5

# Forensics
converge inspect --playbook=<name> --task=<taskId>

# Definition health
converge playbook validate <name>

# Runtime health
converge doctor --playbook=<name>

# Surgical cleanup
converge clean --playbook=<name> --select '<taskId>+'

# State reconciliation (fix zombie runstate, stale inventory, rebuild DAG)
converge reconcile --playbook=<name>

# Stop a live / stale run
converge stop --playbook=<name>

# Mark a task done/dropped/blocked (use sparingly — prefer fixing the cause)
converge tasks mark <taskId> --playbook=<name> --status done

# List installed skills (project-scoped + bundled)
converge skills list

# Goal progress (for goal-driven epoch playbooks)
converge goals --playbook=<name>
```

## When to use compatibility commands

These still exist, but they are not the first teaching surface:

- `converge compile` → compatibility / low-level preview path
- `converge build` → `run --fail-fast`
- `converge retry` → `run --resume`
- `converge test` → checks-only execution

Use them when the user explicitly asks for them or when a fixture / test / older note already uses them.

## Hard rules

- **Prefer `run --dry` over teaching `compile` first.**
- **Always scope with `--playbook=<name>` when more than one playbook exists.**
- **Use `doctor` for runtime-health questions.**
- **Use `playbook validate` for definition-health questions.**
- **Use `inspect --task=<id>` before proposing a novel fix.**
- **Use `clean --select` instead of deleting `.converge/journal/` or `.converge/inventory/` by hand.**
- **Use `stop` instead of ad-hoc `pkill` when possible.**
- **Do not edit generated runtime state. Fix the playbook source or the project inputs.**
- **If the failure is in user domain code or missing credentials, surface it clearly instead of inventing framework fixes.**
- **HTTP 401 / "Invalid API key" on the first task is environment, not the playbook.** Check `env | grep ANTHROPIC_` and reconcile against `.converge/project.yaml`'s `ai.providers.<name>.env` block before touching the playbook itself.
- **`--backend` and `--provider` are init-time flags, not run-time flags.** Don't pass them to `converge run`. To change provider routing, edit `.converge/project.yaml` (or re-run `converge init --force --backend=… --provider=…`).
- **When playbook state is out of sync (0 DAG nodes, orphaned spawned tasks, stale "doing" status), use `converge reconcile --playbook=<name>` first.** If that doesn't resolve it, fall back to the manual recovery workflow in `troubleshooting/state-recovery.md`.
- **Step-through execution:** use `run --select` to run one task or subset at a time, `tasks mark` to correct individual status, and `clean --select` to wipe specific broken subtrees. Rebuild incrementally.

## Manual recovery workflow

When a playbook's runtime state is out of sync with reality (orphaned spawned tasks, stale statuses, missing DAG nodes), follow this three-layer approach:

1. **Audit** — `converge doctor`, `converge playbook validate`, compare `converge list` vs `converge tasks list` counts
2. **Repair** — `converge reconcile --playbook=<name>` (systematic) or `converge reset <name> --yes` (nuclear) or `converge clean --select=X --yes` (surgical) or `converge tasks mark X --status done/dropped/todo` (manual correction)
3. **Step-through** — `converge run --select=02-spawn` → verify → `converge run --select="screen-chat-*"` → verify → `converge run` (full)

For state mismatches (zombie runstate + stale inventory), `converge reconcile` is the **preferred** first step — it cleans zombie runstate, reconciles inventory against disk outputs, rebuilds the DAG, and pre-flights cached tasks. Full recipe with troubleshooting fingerprints: see `troubleshooting/state-recovery.md` Scenario H.

## Hand-off rules

| Situation | Hand off to |
|---|---|
| User wants to design or restructure a playbook | `converge-planning` |
| User wants to debug framework code under `packages/` | `converge-development` |
| Failure is novel and crosses framework/runtime boundaries | user escalation with evidence |

## File map

```
SKILL.md
reference/
  cli.md
  events.md
troubleshooting/
  playbook.md
```

Load `reference/cli.md` for concrete command patterns, `reference/events.md` for event interpretation, and `troubleshooting/playbook.md` only when a concrete failure fingerprint matches.
