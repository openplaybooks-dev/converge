---
title: "playbook.yml"
description: "Current schema reference for playbook.yml."
sidebar:
  order: 2
---

`playbook.yml` is the top-level config file for a playbook. It describes playbook identity, inputs, run limits, task entries, goals, hooks, and playbook-level checks.

Task behavior lives in `TASK.md`; `playbook.yml` is the wrapper around that task set.

## Example

```yaml
name: default
description: Hello-world playbook

run:
  maxTaskAttempts: 2
  resume: true

tasks:
  - id: hello
    path: hello

checks:
  - id: output-exists
    cmd: test -f out/hello.txt
    description: Final output exists
```

## Fields

### `name`

- Type: `string`
- Required: yes

The playbook name. This is also the journal scope under `.converge/journal/<name>/`.

### `description`

- Type: `string`
- Required: no

Human-readable summary of what the playbook does.

### `seed_api_version`

- Type: `number`
- Required: no

Version marker for seeding behavior when declared.

### `key`

- Type: `string`
- Required: no

Input key used by keyed playbooks to distinguish runs.

### `inputs`

- Type: `object`
- Required: no

Declared playbook inputs. Each input can define:

- `description`
- `required`
- `default`

Example:

```yaml
inputs:
  ticker:
    description: Stock ticker to analyze
    required: true
  market:
    default: USA
```

### `run`

- Type: `object`
- Required: no

Execution limits and coordinator settings.

Supported fields:

- `maxTaskAttempts: number`
- `workers: number`
- `maxDuration: number | duration string`
- `resume: boolean`
- `maxGoals: number`
- `stall.maxConsecutive: number`
- `stall.backoffMs: number`

Example:

```yaml
run:
  maxTaskAttempts: 3
  workers: 4
  maxDuration: 6h
  resume: true
  stall:
    maxConsecutive: 2
    backoffMs: 30000
```

#### `run.mode`

`run.mode` is still accepted for backward compatibility, but it is **deprecated and ignored** by the current loader. The runtime no longer uses it to decide execution behavior.

### `tasks`

- Type: `array`
- Required: yes

Top-level task entries for the playbook.

Each task entry can contain:

- `id?: string`
- `path?: string`
- `playbook?: string`
- `depends_on?: string[]`
- `with?: Record<string, string>`

Common local-task shape:

```yaml
tasks:
  - id: 01-prepare
    path: 01-prepare
  - path: 02-build
    depends_on: [01-prepare]
```

Notes:

- If `path` is present and `id` is omitted, the loader derives `id` from `path`.
- For local tasks, `path` is relative to the playbook's `tasks/` tree.
- A playbook may also use a root `TASK.md` pattern instead of a populated `tasks:` list when the root task is responsible for dynamic spawning.

### `goals`

- Type: `array`
- Required: no

Goal-driven completion conditions. Each goal can contain:

- `id: string`
- `description: string`
- `parent?: string`
- `depends_on?: string[]`
- `status?: candidate | active | rejected | stalled`
- `source?: object`
- `metadata?: object`
- `checks: { id, cmd, description? }[]`

### `hooks`

- Type: `array`
- Required: no

Hook definitions that match tasks and create companion DAG nodes.

### `checks`

- Type: `array`
- Required: no

Playbook-level checks that run after the task pipeline completes.

Each check must be an explicit command entry:

- `id: string`
- `cmd: string`
- `description?: string`

Example:

```yaml
checks:
  - id: report-exists
    cmd: test -f out/report.md
  - id: report-has-summary
    cmd: grep -q '^## Summary' out/report.md
```

Current parser rules:

- string shorthands are removed
- `type: test` entries are removed
- reusable logic should live in scripts that `cmd` invokes directly

## Current mental model

- `playbook.yml` is pure config.
- `TASK.md` files define the work.
- `converge compile` writes `manifest.json` and `runstate.json` into `.converge/journal/<playbook>/`.
- `converge run` executes against that journal-backed runtime state.

For task-level fields, see [TASK.md](./task-md.md).
