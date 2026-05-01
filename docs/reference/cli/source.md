---
title: "converge source"
description: "Check freshness of external data sources declared in task inputs."
sidebar:
  order: 22
---

Check the freshness of external data sources declared in task `inputs:` blocks. For tasks whose input comes from outside the playbook (an API pull, a remote file, a manual upload). Reports `pass | warn | error` per source based on `freshness:` frontmatter thresholds.

## Usage

```bash
converge source freshness --select <expression> [options]
```

## Freshness configuration

Add a `freshness:` block to any task whose inputs come from outside the playbook:

```yaml
freshness:
  loaded_at: "inputs/raw-shots.json"    # file whose mtime is the load timestamp
  warn_after:  { count: 12, period: hour }
  error_after: { count: 24, period: hour }
```

## Options

| Flag | Default | Effect |
|---|---|---|
| `--select`, `-s` | (all sources) | Which sources to check. |
| `--exclude`, `-e` | — | Subtractive expression. |
| `--selector` | — | Shortcut for `--select selector:NAME`. |
| `--playbook=NAME` | (auto-detect) | Which playbook. |
| `--project-dir=PATH` | cwd | Project directory. |
| `--verbose`, `-v` | off | Verbose output. |

## Examples

```bash
# Check freshness of all sources.
converge source freshness

# Check only sources in the data phase.
converge source freshness --select 'phase:data'

# Check a specific source.
converge source freshness --select 'raw-analytics'
```

## When to use

- **Before a scheduled run.** If upstream data is stale, `source freshness` warns before you waste compute on stale inputs.
- **Monitoring.** Pipe `source freshness --output=json` into alerting.
- **Does not invalidate downstream tasks.** Freshness is a query, not an action. Use `--select 'source_status:fresher+'` on `run` to rebuild what's stale.
