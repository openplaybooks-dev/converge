---
name: converge-control
description: Use when the user wants to run a converge playbook, monitor execution, inspect status, diagnose failures, or re-run after changes. Triggers on "run my playbook", "monitor this run", "converge failed", "what's the status", "retry failures", or "babysit this playbook".
---

# Converge Control

## Purpose

Run, monitor, and unblock a playbook using the **current** Converge runtime surface.

This skill is for:

- starting a playbook run
- watching progress
- narrowing failures to one task / subtree
- using the built-in operator commands (`status`, `list`, `show`, `doctor`, `playbook validate`)
- re-running only what needs to move

This skill is **not** for authoring a new playbook or redesigning its task tree. That belongs to **`converge-planning`**.

## Current mental model

Converge has three important layers:

1. **Source blueprint** — `.converge/playbooks/<name>/`
   Files like `playbook.yml`, `TASK.md`, `seed` scripts, templates, playbook-scoped skills.
2. **Runtime state** — `.converge/journal/<playbook>/`, `.converge/inventory/<playbook>/`, `.converge/artifacts/<playbook>/`
   Execution state, event stream, per-task forensics, spawned-task ledger, and produced outputs.
3. **Operator surface** — the CLI
   `run`, `status`, `list`, `show`, `inspect`, `doctor`, `playbook validate`, `clean`, `stop`.

The playbook is the source of truth. Do **not** hand-edit `runstate.json`, `manifest.json`, or journal files to "fix" a run.

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
converge stop --playbook=<name>
```

Then restart with a narrowed selection if possible.

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

# Stop a live / stale run
converge stop --playbook=<name>
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
