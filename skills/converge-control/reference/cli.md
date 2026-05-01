# Converge CLI — run-and-troubleshoot cheatsheet

The commands you'll actually use while babysitting a run. For everything else, `--help` or `converge-planning`.

## How to invoke

The `converge` binary may not be on PATH. Use the dist file directly:

```bash
node /Users/minh/Documents/converge/packages/cli/dist/index.js <args>
```

Or if `converge` is on PATH, replace the prefix accordingly. All examples below use `converge` for brevity.

## Path-based execution

Most commands accept a leading path argument that scopes them to one playbook. Use this whenever the project has more than one playbook in `.converge/playbooks/`.

```bash
converge .converge/playbooks/default/playbook.yml run        # run only the 'default' playbook
converge .converge/playbooks/default/playbook.yml list        # list tasks in only the 'default' playbook
```

Without the path, `converge run` may execute a different playbook (e.g. a `realdevice` one chained after `default` finishes). The path-form is the *foreign-playbook fix*.

## `--select` / `--exclude` — the selection DSL

Selection is how you scope commands to specific tasks. It replaces the old `--filter` flag, `status` filtering, and positional substring matching. Always quote expressions — `+` and `*` are shell glob characters.

### Graph operators

| Form | Meaning | Example |
|---|---|---|
| `task_id` | Just this task | `--select 03-tokens` |
| `task_id+` | Task + all descendants | `--select 03-tokens+` |
| `+task_id` | Task + all ancestors | `--select +07-keyframes` |
| `+task_id+` | Full lineage | `--select +05-storyboard+` |
| `@task_id` | Full subgraph to rebuild from scratch | `--select @06-storyboard` |
| `*pattern*` | Glob over task IDs | `--select '*keyframe*'` |

### Selector methods

| Method | Selects | Example |
|---|---|---|
| `name:` | Tasks whose ID contains the value (default — bare `'foo'` means `name:foo`) | `--select 'keyframe'` |
| `tag:` | Tasks with this tag | `--select 'tag:image'` |
| `phase:` | Tasks with a `phase` tag | `--select 'phase:render'` |
| `status:` | Journal state: `pending`, `running`, `complete`, `failed`, `blocked` | `--select 'status:failed'` |
| `result:` | Last session outcome: `error`, `fail`, `skip`, `pass` | `--select 'result:error+'` |
| `state:modified` | Anything changed vs `--state` manifest | `--select 'state:modified+'` |
| `wbs:` | WBS shape: `parent`, `child`, `seeded`, `unseeded` | `--select 'wbs:unseeded'` |

### Set operators

- **Space = union.** `--select "tag:image phase:render"` → image OR render.
- **Comma = intersection.** `--select "tag:image,status:failed"` → image AND failed.
- **`--exclude`** subtracts. `--select 'tag:image' --exclude 'status:complete'` → unfinished image tasks.

### Common patterns

```bash
# What would run? (preview without execution)
converge list --select 'state:modified+'

# Run one task and everything downstream
converge run --select '03-tokens+'

# Re-run failures with full lineage
converge run --select 'result:error+'

# Only incomplete tasks
converge list --exclude 'status:complete'

# Run a single task by name substring (migration from old positional arg)
converge run --select 'build'
```

## `run` — autonomous execution

```bash
converge <playbook.yml> run [flags]
```

Flags that matter during a run:

| Flag | Use it when |
|---|---|
| `--select`, `-s` | Scope to specific tasks (replaces `--filter` and positional args). |
| `--exclude`, `-e` | Subtract tasks from the selection. |
| `--max-iterations N` | Always set ≥ 250 on real playbooks. Default is 100 and trips silently. |
| `--full-refresh` | Force non-incremental execution; rebuild from scratch. Replaces `--restart`. |
| `--force` | Force-run tasks that are blocked or already complete. Diagnostic use only. |
| `--step` | Run exactly one iteration and exit. Useful for inspecting state changes. |
| `--dry` | Plan only, no execution. Preview what `run` would do. |
| `--fail-fast` | Stop on first uncorrectable failure. |
| `--wbs` | Compose with `--select 'wbs:…'` to run only WBS phases. |
| `--auto-fix=BOOL` | Default `true`. Leave it on. |
| `--self-plan=BOOL` | Default `true`. Leave it on. |

Resume is automatic — `converge run` picks up where the last session left off. Use `converge retry` to explicitly redo only the failures from the last session.

Common invocations:

```bash
# Fresh run on a playbook
converge .converge/playbooks/default/playbook.yml run --max-iterations 250

# Run a specific task and its descendants
converge .converge/playbooks/default/playbook.yml run --select '03-build-screens+'

# Force-run a single task (diagnostic)
converge .converge/playbooks/default/playbook.yml run --select '03-build-screens' --force

# Inspect one step without committing to a full run
converge .converge/playbooks/default/playbook.yml run --step --dry

# Wipe and restart (was --restart)
converge clean --select '*' && converge .converge/playbooks/default/playbook.yml run --max-iterations 250
```

Run in the background so you can attach a Monitor:

```bash
node .../cli/dist/index.js <playbook.yml> run --max-iterations 250 \
  > /tmp/converge-run.log 2>&1 &
```

## `list` — task listing and status

```bash
converge <playbook.yml> list [--select <expr>] [--exclude <expr>]
```

Shows tasks matching the selection with status icons:

- `✓` complete
- `◑` seeded (WBS parent waiting for children) or in-progress
- `○` pending
- `▶` next pending
- `⏸️` blocked

`list` also runs the parent-rollup pass, so calling it can move stuck `seeded`/`pending` parents to `complete` once their children are all done. **Useful diagnostic move when phases look stuck.**

```bash
# Full status (replaces old `status`)
converge <playbook.yml> list

# Only incomplete tasks (replaces `status --only-incomplete`)
converge <playbook.yml> list --exclude 'status:complete'

# Show only failed tasks with downstream
converge <playbook.yml> list --select 'result:error+'
```

## `clean` — delete journal state

Use with care. Replaces the old `reset` and `cleanup` commands.

```bash
converge clean --select '*'                          # wipe everything (was `reset --all`)
converge clean --select '<task>+'                    # wipe a task subtree + descendants
converge clean --orphaned                            # remove orphaned journal dirs (was `cleanup`)
```

Most common during troubleshooting:

```bash
# A single task is wedged in a bad attempt loop — clean just that subtree
converge clean --select '03-build-screens/001-onboarding/001-05-split+'
```

After `clean`, the next `run` will re-spawn that task fresh.

## `debug` — checkpoint reconciliation

```bash
converge debug          # report inconsistencies (was `verify`)
converge debug --fix    # auto-correct what it can (was `verify --fix`)
```

Run after manual file edits (e.g. you patched a TASK.md frontmatter, deleted a stale lib/ file, etc.) to re-sync the checkpoint with reality.

## `inspect` — failure forensics

```bash
converge inspect --last-session
converge inspect <playbook.yml> --task <taskId>
```

Shows:

- Convergence graph for the inspected task (gaps detected → fixes attempted → outcome)
- Session summary (iterations, duration, tokens)
- Per-attempt FEEDBACK.md and LEARN.md content

Use when a task failed structurally and you want to read the AI's own analysis before deciding what to fix.

## `show` — visualization

```bash
converge show graph              # dependency graph (was `tree`)
converge show graph --detail     # with more detail
converge show gantt              # timeline view of execution attempts
converge show journal            # recent execution events
converge show backlog            # pending work queue
converge show trend              # progress over time
```

## Killing a stuck run

The CLI has no built-in stop. Kill the process:

```bash
pkill -9 -f "node.*cli/dist/index.js run"
sleep 2
ps aux | grep "node.*cli" | grep -v grep || echo "stopped"
```

Then re-launch — resume is automatic.
