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
converge .converge/playbooks/default/playbook.yml status     # status for only the 'default' playbook
```

Without the path, `converge run` may execute a different playbook (e.g. a `realdevice` one chained after `default` finishes). The path-form is the *foreign-playbook fix*.

## `run` — autonomous execution

```bash
converge <playbook.yml> run [flags]
```

Flags that matter during a run:

| Flag | Use it when |
|---|---|
| `--resume` | After a kill / non-zero exit. Without it the CLI refuses to continue. |
| `--max-iterations N` | Always set ≥ 250 on real playbooks. Default is 100 and trips silently. |
| `--restart` | **Avoid in-flight.** Resets ALL tasks to pending. Only use when starting a deliberately fresh run. |
| `--filter <id>` | Limit execution to a specific task or subtree (e.g. `--filter 03-build-screens`). |
| `--force` | With `--filter`, force-runs a task that's blocked or already complete. Diagnostic use only. |
| `--step` | Run exactly one iteration and exit. Useful for inspecting state changes. |
| `--dry` / `--plan` | Plan only, no execution. Preview what `run` would do. |
| `--auto-fix=BOOL` | Default `true`. Leave it on. |
| `--self-plan=BOOL` | Default `true`. Leave it on. |

Common invocations:

```bash
# Fresh run on a playbook with no prior session
converge .converge/playbooks/default/playbook.yml run --max-iterations 250

# Resume after kill / iteration cap / process crash
converge .converge/playbooks/default/playbook.yml run --resume --max-iterations 250

# Inspect one step without committing to a full run
converge .converge/playbooks/default/playbook.yml run --step --dry
```

Run in the background so you can attach a Monitor:

```bash
node .../cli/dist/index.js <playbook.yml> run --resume --max-iterations 250 \
  > /tmp/converge-run.log 2>&1 &
```

## `status` — current state

```bash
converge <playbook.yml> status
```

Shows the phase tree with status icons:

- `✓` complete
- `◑` seeded (WBS parent waiting for children) or in-progress
- `○` pending
- `▶` next pending
- `⏸️` blocked

`status` also runs the parent-rollup pass, so calling it can move stuck `seeded`/`pending` parents to `complete` once their children are all done. **Useful diagnostic move when phases look stuck.**

Useful flags:

```bash
converge <playbook.yml> status --only-incomplete   # hide finished work
converge <playbook.yml> status --checkpoint        # show iteration count, timestamps
```

## `reset` — delete journal state

Use with care. Three scopes:

```bash
converge reset --all                                # nuke everything
converge reset <playbook>                           # nuke one playbook's journal
converge reset <playbook> <taskPath>                # nuke one task subtree (and descendants)
```

Most common during troubleshooting:

```bash
# A single task is wedged in a bad attempt loop — reset just that subtree
converge reset default 03-build-screens/001-onboarding/001-05-split
```

`<taskPath>` is the slash-separated journal id. Do NOT include `tasks/` segments.

After `reset`, the next `run` will re-spawn that task fresh.

## `verify` — checkpoint reconciliation

```bash
converge verify          # report inconsistencies
converge verify --fix    # auto-correct what it can
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

## `cleanup` — remove orphaned journal dirs

```bash
converge cleanup
```

Removes journal directories whose corresponding TASK.md no longer exists in the playbook. Safe to run any time. Useful after deleting tasks or restructuring a playbook.

## `tree` and `gantt` — visualization

```bash
converge tree         # task tree with status icons (similar to status but tree-shaped)
converge gantt        # timeline view of execution attempts
```

Diagnostic only. Don't depend on these for state — `status` is authoritative.

## `journal` and `show` — execution history

```bash
converge journal                    # recent execution events
converge show journal               # alias of above
converge show graph --detail        # dependency graph as ASCII art
```

Useful when you joined a project mid-run and want to see what happened in past sessions before the current one.

## Killing a stuck run

The CLI has no built-in stop. Kill the process:

```bash
pkill -9 -f "node.*cli/dist/index.js run"
sleep 2
ps aux | grep "node.*cli" | grep -v grep || echo "stopped"
```

Then re-launch with `--resume`.
