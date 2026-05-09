---
title: "playbook.yml"
description: "Complete schema reference for playbook.yml."
sidebar:
  order: 2
---
## At-a-glance example

```yaml
name: implement-planner
description: Build @converge/planner: a web UI for managing converge playbooks, tasks, and runs.
run:
  mode: oneoff
  maxIterations: 100
  maxTaskAttempts: 3
  maxDuration: 6h
  resume: true
  stall:
    maxConsecutive: 3
    backoffMs: 30000
tasks:
  - path: 01-prepare-requirements
  - path: 02-design-system
  - path: 03-build-screens
checks:
  - id: planner-package-exists
    cmd: "test -f apps/planner/package.json"
    description: "@converge/planner package exists with correct name"
```

## name

- **Type**: string
- **Required**: yes
- **Default**: none

Human-readable name for the playbook.

```yaml
name: implement-planner
```

## description

- **Type**: string
- **Required**: no
- **Default**: none

Free-form description of what this playbook does.

```yaml
description: Build @converge/planner: a web UI for managing converge playbooks.
```

## run

- **Type**: object
- **Required**: yes
- **Default**: see below

Execution constraints for the playbook.

```yaml
run:
  mode: oneoff
  maxIterations: 100
  maxTaskAttempts: 3
  maxDuration: 6h
  resume: true
  stall:
    maxConsecutive: 3
    backoffMs: 30000
```

### `run.mode`

- **Type**: `oneoff` | `loop` | `dispatch`
- **Required**: yes
- **Default**: `oneoff`

Controls how the playbook executes. `oneoff` runs once and stops. `loop` re-runs after checks pass. `dispatch` fans out to parallel task workers.

### `run.maxIterations`

- **Type**: integer
- **Required**: no
- **Default**: no limit

Maximum number of loop iterations before the playbook aborts.

### `run.maxTaskAttempts`

- **Type**: integer
- **Required**: no
- **Default**: 3

How many times to retry a failing task before marking it failed.

### `run.maxDuration`

- **Type**: duration string (e.g. `8h`, `30m`)
- **Required**: no
- **Default**: no limit

Maximum wall-clock time before the playbook aborts.

### `run.resume`

- **Type**: boolean
- **Required**: no
- **Default**: false

Whether the playbook can resume from a checkpoint after interruption.

### `run.stall`

- **Type**: object
- **Required**: no
- **Default**: none

Stall detection: abort if progress stops happening.

```yaml
stall:
  maxConsecutive: 3   # number of consecutive check failures before aborting
  backoffMs: 30000   # milliseconds between stall evaluations
```

## tasks

- **Type**: array
- **Required**: yes
- **Default**: `[]`

Ordered list of task paths. Each entry has a `path` identifying the task's location on disk.

```yaml
tasks:
  - path: 01-prepare-requirements
  - path: 02-design-system
  - path: 03-build-screens
```

### `tasks[].path`

- **Type**: string
- **Required**: yes

Path to the task directory relative to the playbook `tasks/` directory.
Each `/` in the path descends into a nested `tasks/` subdirectory.

Examples:
- `path: 02-catalog` → `tasks/02-catalog/TASK.md`
- `path: 01-analyze/01a-extract` → `tasks/01-analyze/tasks/01a-extract/TASK.md`

Dependencies between tasks are declared in each task's TASK.md frontmatter
via the `depends_on` field: not in playbook.yml.

## checks

- **Type**: array
- **Required**: no
- **Default**: `[]`

Global checks run after each task iteration. Each check has `id`, `cmd`, and `description`.

```yaml
checks:
  - id: planner-package-exists
    cmd: "test -f apps/planner/package.json"
    description: "@converge/planner package exists with correct name"
```

### `checks[].id`

- **Type**: string
- **Required**: yes

Unique identifier for the check.

### `checks[].cmd`

- **Type**: string
- **Required**: yes

Shell command to run. Exit code 0 = pass, non-zero = fail.

### `checks[].description`

- **Type**: string
- **Required**: no

Human-readable description of what this check verifies.

## variables

- **Type**: object
- **Required**: no
- **Default**: `{}`

Global variables accessible to all tasks.

```yaml
variables:
  outputDir: ./dist
  concurrency: 4
```
