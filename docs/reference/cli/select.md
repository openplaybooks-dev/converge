---
title: "converge --select DSL"
description: "The selection DSL: graph operators, selector methods, set operators, and named selectors."
sidebar:
  order: 23
---

Every command that operates on tasks (`run`, `build`, `test`, `compile`, `list`, `clean`) takes `--select` and `--exclude`. The selection DSL is a composable language for picking subsets of the task DAG. It mirrors dbt's syntax verbatim.

## Graph operators

Apply to anything that resolves to a set of tasks.

| Form | Meaning | Example |
|---|---|---|
| `task_id` | Just this task | `--select 03-tokens` |
| `task_id+` | Task + all descendants (downstream) | `--select 03-tokens+` |
| `+task_id` | Task + all ancestors (upstream) | `--select +07-keyframes` |
| `+task_id+` | Task with full lineage | `--select +05-storyboard+` |
| `2+task_id` | Up to 2 hops upstream | `--select 2+10-render` |
| `task_id+3` | Up to 3 hops downstream | `--select 03-tokens+3` |
| `@task_id` | Task + ancestors + ancestors-of-descendants (full rebuild subgraph) | `--select @06-storyboard` |
| `*pattern*` | Glob over task IDs | `--select '*keyframe*'` |

## Selector methods

Anywhere you can write a `task_id`, you can write a `method:value` selector.

| Method | Selects | Example |
|---|---|---|
| `name:` | Tasks whose ID contains the value (default) | `name:keyframe` |
| `tag:` | Tasks with this tag | `tag:image` |
| `path:` | Tasks under this directory | `path:tasks/keyframes` |
| `phase:` | Tasks with a `phase` tag | `phase:render` |
| `status:` | Current journal state: `pending`, `running`, `complete`, `failed`, `blocked` | `status:failed` |
| `result:` | Outcome from last session: `error`, `fail`, `skip`, `pass` | `result:error` |
| `selector:` | Named selector from `selectors.yml` | `selector:nightly` |
| `state:modified` | Union of all `state:modified.*` methods | `state:modified+` |
| `state:modified.body` | TASK.md body changed | `state:modified.body+` |
| `state:modified.frontmatter` | Frontmatter changed (not checks) | `state:modified.frontmatter` |
| `state:modified.checks` | Only checks block changed | `state:modified.checks` |
| `state:modified.inputs` | An input file's content changed | `state:modified.inputs+` |
| `state:modified.upstream` | A direct parent's hash changed | `state:modified.upstream` |
| `state:modified.playbook` | `playbook.yml` changed | `state:modified.playbook` |
| `state:modified.drifted` | A declared output's content differs from prior `run_results.json` | `state:modified.drifted` |
| `state:new` | Node exists in current manifest, absent in `--state` manifest | `state:new` |
| `seed:` | Seed shape: `parent`, `child`, `seeded`, `unseeded` | `seed:unseeded` |
| `frontier:` | Seed parents whose children are unknown | `frontier:` |
| `expected:` | Manifest-predicted children not yet on disk | `expected:` |
| `concrete:` | Materialized tasks | `concrete:` |
| `attempt:` | Tasks by attempt count | `attempt:>=3` |

## Set operators

- **Space = union.** `--select "tag:image phase:render"` → image OR render.
- **Comma = intersection.** `--select "tag:image,status:failed"` → image AND failed.
- **`--exclude`** subtracts after `--select`. `--select 'tag:image' --exclude 'status:complete'` → unfinished image tasks.

## Quoting

Always quote selection expressions:

```bash
converge run --select '03-tokens+'         # good
converge run --select 03-tokens+           # zsh expands the +; don't
```

## Named selectors (`selectors.yml`)

Complex, reusable selections in version control. Place `selectors.yml` at the playbook root:

```yaml
selectors:
  - name: nightly
    description: Image pipeline that runs on schedule.
    definition:
      union:
        - method: tag
          value: image
        - method: phase
          value: render
      exclude:
        - method: status
          value: complete

  - name: failures_with_lineage
    description: Re-run failed tasks with full lineage.
    definition:
      method: result
      value: error
      parents: true
      children: true
```

Use as `--select 'selector:nightly'` or `--selector nightly`.

## Worked examples

```bash
# Run one task and everything downstream.
converge run --select '03-tokens+'

# Re-run only failures, plus everything downstream that's now stale.
converge run --select 'result:error+'

# Build the keyframe phase, but stop at storyboard.
converge build --select '+07-keyframes' --exclude '+04-script'

# Test only completed tasks (verify nothing drifted on disk).
converge test --select 'status:complete'

# Preview what changed since last good run.
converge list --select 'state:modified+' --state /tmp/last-good
```

## Frontier warnings

When a selection crosses a Seed frontier (children that don't exist yet), the CLI warns rather than silently matching nothing:

```
$ converge run --select '03-characters+'
warning: '03-characters+' crosses a frontier:
  - 03-characters (Seed, unseeded — children unknown)
hint:    converge compile --seed --select 03-characters
         converge run --select '03-characters+'
```

Run `converge compile --seed --select <parent>` first to materialize children, then select them.
