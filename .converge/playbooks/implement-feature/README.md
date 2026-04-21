# implement-feature

Dispatch playbook for implementing features, fixing bugs, and resolving issues.

## Usage

```bash
# Add tasks to the queue
converge run --playbook=implement-feature --add --task='implement dark mode'
converge run --playbook=implement-feature --add --task='fix github.com/org/repo/issues/42'

# Process all queued tasks
converge run --playbook=implement-feature
```

## How it works

1. `--add` invokes the root WBS which stamps a new task under `tasks/`
2. Each stamped task runs a full pipeline: **analyze → implement → review → quality**
3. Running without `--add` processes all pending tasks sequentially

## Pipeline phases

| Phase | Purpose |
|-------|---------|
| **analyze** | Parse input, fetch context (GitHub issues/PRs), write implementation plan |
| **implement** | Plan → split into todos → execute each step → verify (typecheck + tests) |
| **review** | Code review against original request. Rejects reset implement phase. |
| **quality** | Final gate: zero type errors + all tests pass |

## Structure

```
implement-feature/
  playbook.yml        # config (mode: dispatch)
  TASK.md             # root task declaring the WBS
  wbs/
    index.js          # increments task number, spawns from template
    templates/item/   # template copied per --add invocation
      TASK.md
      wbs.js
      tasks/{analyze, implement, review, quality}/
  tasks/              # generated tasks live here
    001-implement-dark-mode/
    002-fix-issue-42/
    ...
```
