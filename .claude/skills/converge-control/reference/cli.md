# Converge CLI — run-and-troubleshoot cheatsheet

The commands you'll use while running and monitoring a playbook. For everything else, `--help` or `converge-planning`.

## How to invoke

If `converge` is on PATH:

```bash
converge <command> <playbook.yml> [flags]
```

If not, use the compiled CLI directly:

```bash
node packages/cli/dist/index.js <command> <playbook.yml> [flags]
```

All examples below use `converge` for brevity.

## Path-based execution

Most commands accept a leading path argument that scopes them to one playbook. Use this whenever the project has more than one playbook in `.converge/playbooks/`.

```bash
converge compile .converge/playbooks/default/playbook.yml
converge run .converge/playbooks/default/playbook.yml
converge list .converge/playbooks/default/playbook.yml
```

Without the path, `converge` uses the only playbook if there's exactly one, or the first it finds. The explicit path is safer.

## `compile` — build the manifest

```bash
converge compile <playbook.yml>
```

Reads `playbook.yml` + all `TASK.md` files, resolves `depends_on` edges, runs seeds to discover dynamic children, and writes `target/{playbook}/manifest.json`.

Always compile before running. The manifest catches cycle errors and missing dependencies before execution starts.

```bash
# Compile and preview what would run
converge compile <playbook.yml> && converge list <playbook.yml> --exclude 'status:complete'

# Compile resolving seed frontiers without executing tasks
converge compile <playbook.yml> --seed
```

## `run` — execute the DAG

```bash
converge run <playbook.yml> [flags]
```

Walks the DAG in topological layers. Nodes with unchanged fingerprints (vs the previous `runstate.json`) are cached and skipped.

| Flag | Use it when |
|---|---|
| `--select`, `-s` | Scope to specific nodes (task ID, tag, state, result). |
| `--exclude`, `-e` | Subtract nodes from the selection. |
| `--full-refresh` | Ignore fingerprints — re-execute everything. |
| `--force` | Force-run nodes that are already complete. Diagnostic only. |
| `--auto-fix=BOOL` | Default `true`. Leave it on. |

Common invocations:

```bash
# Full run
converge run <playbook.yml>

# Incremental — only what changed and downstream (like dbt run --select state:modified+)
converge run <playbook.yml> --select 'state:modified+'

# Retry only failures from last run
converge run <playbook.yml> --select 'result:error+'

# Run one subtree
converge run <playbook.yml> --select '03-build-screens+'

# Force re-run a single node (diagnostic)
converge run <playbook.yml> --select '03-build-screens' --force

# Full refresh — rebuild everything
converge clean --select '*' && converge compile <playbook.yml> && converge run <playbook.yml>
```

Run in the background so you can monitor:

```bash
converge run <playbook.yml> > /tmp/converge-run.log 2>&1 &
```

## `test` — run checks without executing tasks

```bash
converge test <playbook.yml> [--select <expr>]
```

Runs the `checks:` for matching nodes. Faster than `run` — no AI invocation, just shell commands. Like dbt's `dbt test`.

```bash
# Run fast checks only
converge test <playbook.yml> --select 'tag:fast'

# Run all checks for modified nodes and downstream
converge test <playbook.yml> --select 'state:modified+'
```

## `--select` / `--exclude` — the selection DSL

Selection scopes commands to specific DAG nodes. Always quote expressions — `+` and `*` are shell glob characters.

### Graph operators

| Form | Meaning | Example |
|---|---|---|
| `task_id` | Just this node | `--select 03-tokens` |
| `task_id+` | Node + all descendants | `--select 03-tokens+` |
| `+task_id` | Node + all ancestors | `--select +07-keyframes` |
| `+task_id+` | Full lineage | `--select +05-storyboard+` |
| `@task_id` | Full subgraph | `--select @06-storyboard` |
| `*pattern*` | Glob over node IDs | `--select '*keyframe*'` |

### Selector methods

| Method | Selects | Example |
|---|---|---|
| `name:` | Nodes whose ID contains the value (default — bare `'foo'` means `name:foo`) | `--select 'keyframe'` |
| `tag:` | Nodes with this tag | `--select 'tag:image'` |
| `state:modified` | Nodes changed vs previous manifest | `--select 'state:modified+'` |
| `result:` | Last-run outcome: `pass`, `error`, `fail`, `skip` | `--select 'result:error+'` |
| `status:` | Current state: `pending`, `running`, `complete`, `failed` | `--select 'status:failed'` |

### Set operators

- **Space = union.** `--select "tag:image tag:render"` → image OR render.
- **Comma = intersection.** `--select "tag:image,status:failed"` → image AND failed.
- **`--exclude`** subtracts. `--select 'tag:image' --exclude 'status:complete'` → unfinished image tasks.

### Common patterns

```bash
# What would run? (dry-run preview)
converge list --select 'state:modified+'

# Run one task and everything downstream
converge run --select '03-tokens+'

# Re-run failures
converge run --select 'result:error+'

# Only incomplete tasks
converge list --exclude 'status:complete'

# Run a single task by name substring
converge run --select 'build'
```

## `list` — DAG status

```bash
converge list <playbook.yml> [--select <expr>] [--exclude <expr>]
```

Shows every DAG node matching the selection with status:

- `✓` complete
- `○` pending
- `◑` in-progress (running or spawned children not yet done)
- `✗` failed

```bash
# Full status
converge list <playbook.yml>

# Only incomplete
converge list <playbook.yml> --exclude 'status:complete'

# Show failures with downstream
converge list <playbook.yml> --select 'result:error+'
```

## `clean` — delete target state

```bash
converge clean --select '*'                    # wipe everything
converge clean --select '<task>+'              # wipe a subtree + descendants
```

Most common during troubleshooting:

```bash
# A single node is wedged — reset just its subtree
converge clean --select '03-build-screens/001-onboarding+'
```

After `clean`, the next `run` executes those nodes fresh (no fingerprint cache).

## `inspect` — failure forensics

```bash
converge inspect <playbook.yml> --task <taskId>
```

Shows the per-attempt forensics for the given node: check results, FEEDBACK.md, LEARN.md content. Use when a node failed structurally and you want to read the agent's own analysis before deciding what to fix.

## `show` — visualization

```bash
converge show graph <playbook.yml>       # DAG visualization
converge show graph --detail             # with more detail
converge show gantt <playbook.yml>       # timeline of execution attempts
```

## Target directory

The execution target lives at `target/{playbook}/`:

```
target/{playbook}/
  manifest.json         — compiled DAG (before run)
  manifest.prev.json    — previous manifest (for change detection)
  runstate.json         — execution state (overwritten each run)
  runstate.prev.json    — previous runstate (for fingerprint caching)
  events.jsonl          — append-only event stream
  tasks/
    {id}/
      FEEDBACK.md       — per-attempt feedback
      LEARN.md          — per-attempt failure analysis
```

## Stopping a run

```bash
pkill -f "converge run"
sleep 2
ps aux | grep "converge" | grep -v grep || echo "stopped"
```

Re-running picks up cleanly — the runner reads `runstate.json` and continues from incomplete nodes.
