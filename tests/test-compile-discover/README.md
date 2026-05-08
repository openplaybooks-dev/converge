# test-compile-discover

Tests the compile/run separation pattern — compile discovers all tasks via
filesystem scan and writes a manifest + runstate to the journal. Run reads
from the journal without scanning the filesystem. Analogous to dbt's
`compile` → `run` workflow.

## What it tests

- `compile` discovers children nested in `tasks/` subdirectories (filesystem scan)
- `compile` writes `manifest.json` + `runstate.json` to `.converge/journal/<playbook>/`
- `compile` does NOT write to `playbookDir/target/`
- `run` reads the manifest from journal and plans execution
- `run --dry` shows the DAG without executing
- `run` fails cleanly when no manifest exists ("No compiled manifest found")
- Manifest + runstate survive a `--dry` run (not deleted)

## Structure

```
.converge/playbooks/default/
├── playbook.yml
└── tasks/
    ├── 01-prepare/
    │   ├── TASK.md            # Parent: creates READY.txt
    │   └── tasks/             # Children discovered by filesystem scan
    │       ├── 001-prd/
    │       │   └── TASK.md    # Child: creates PRD.txt
    │       └── 002-spec/
    │           └── TASK.md    # Child: creates SPEC.txt
```

## Run

```bash
# Compile discovers nodes and writes manifest + runstate to journal
converge compile --dir=.converge/playbooks/default

# Run reads from journal manifest
converge run
```

## Expected outcome

- **compile**: Discovers 3 nodes (01-prepare + 2 children in tasks/). Writes manifest
  with correct parent-child relationships (001-prd → 01-prepare, 002-spec → 01-prepare).
  All nodes start as `pending` in runstate.
- **run**: Executes the DAG from the manifest without re-scanning the filesystem.
- **Without compile**: `run` fails with "No compiled manifest found."
