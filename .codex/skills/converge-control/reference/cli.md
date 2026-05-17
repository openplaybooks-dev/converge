# Converge CLI — operator cheatsheet

The commands you actually use while running and babysitting a playbook.

For the canonical contract, prefer:

```bash
converge <command> --help
```

## Recommended invocation style

Prefer explicit playbook scoping:

```bash
converge run --playbook=<name>
converge status --playbook=<name>
converge list --playbook=<name>
```

Path-based invocation also exists, but `--playbook=<name>` is the clearer operator shape for the current docs and README.

## Run / preview

```bash
# Full run
converge run --playbook=<name>

# Preview only
converge run --playbook=<name> --dry

# Changed work + downstream
converge run --playbook=<name> --select 'state:modified+'

# Retry failures
converge run --playbook=<name> --select 'result:error+'

# One subtree
converge run --playbook=<name> --select '03-build+'

# Fail fast while debugging
converge run --playbook=<name> --select '03-build+' --fail-fast
```

## Status / visualization

```bash
# Current task tree
converge status --playbook=<name>

# Incomplete tasks only
converge list --playbook=<name> --exclude 'status:complete'

# DAG graph
converge show graph --playbook=<name> --detail

# Timeline
converge show gantt --playbook=<name>

# Cost / model view
converge show metrics --playbook=<name> --by-model --top=5
```

## Forensics / health

```bash
# One failed task
converge inspect --playbook=<name> --task=<taskId>

# Runtime health
converge doctor --playbook=<name>

# Definition health
converge playbook validate <name>
```

## Reset / stop

```bash
# Reset one subtree
converge clean --playbook=<name> --select '<taskId>+'

# Stop live or stale run
converge stop --playbook=<name>
```

## Selection patterns

```bash
# One task
--select '03-build'

# One task + descendants
--select '03-build+'

# Ancestors + node
--select '+03-build'

# Full lineage
--select '+03-build+'

# Errors and downstream
--select 'result:error+'

# Changed and downstream
--select 'state:modified+'

# Subtract completed work
--exclude 'status:complete'
```

## Compatibility commands

These commands still exist but are not the primary operator teaching surface:

```bash
converge compile ...
converge build ...
converge retry ...
converge test ...
```

Map them mentally to:

- `compile` → low-level preview / compatibility
- `build` → `run --fail-fast`
- `retry` → `run --resume`
- `test` → checks-only execution
