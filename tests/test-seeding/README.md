# test-seeding

End-to-end fixture for the converge framework's **dynamic spawning** primitives —
the mechanism that lets a parent task register new child tasks at runtime via
the `converge spawn` CLI, with the framework injecting them into the live task
topology through the runtime ledger.

The test covers four things at once, with **no LLM involved**:

1. **Sequential subtasks** — parent → child-alpha → sub-alpha (3 levels deep)
2. **Parallel workers** — child-alpha and child-beta run on different workers
   once the parent spawns them
3. **Multi-spawn from level-2** — each level-2 child spawns 3 level-3 children in a loop
4. **The singular spawn CLI** — `converge spawn <id> <template>`, no flags
5. **Typed vars contract** — child templates declare what vars they accept;
   the framework filters parent vars through that declaration

A single `converge run` exercises every primitive and the runner asserts on
both the on-disk evidence (`tasks.jsonl` rows, leaf output files) and the
rendered TASK.md frontmatter inside the inventory.

## How to run

```bash
./run-test.sh
```

Exits `0` on full pass, non-zero on any failure. Wipes its own state on each
run (`.converge/journal`, `.converge/inventory`, `.converge/artifacts`, and
the leaf output files), so the test is idempotent.

Expected runtime: ~3 seconds. Expected output ends with:

```
RESULTS:  60 passed,  0 failed
```

## What gets demonstrated

### Tree topology

```
parent                                  (level 1, static, auto-discovered from tasks/)
├── child-alpha                         (level 2, CLI-spawned)
│     ├── sub-alpha-1                   (level 3, CLI-spawned in a loop by child-alpha)
│     ├── sub-alpha-2                   (level 3, CLI-spawned in a loop by child-alpha)
│     └── sub-alpha-3                   (level 3, CLI-spawned in a loop by child-alpha)
└── child-beta                          (level 2, CLI-spawned, runs in parallel)
      ├── sub-beta-1                    (level 3, CLI-spawned in a loop by child-beta)
      ├── sub-beta-2                    (level 3, CLI-spawned in a loop by child-beta)
      └── sub-beta-3                   (level 3, CLI-spawned in a loop by child-beta)
```

`parent` is the only static task — it lives at `tasks/parent/TASK.md` and the
framework auto-discovers it on `converge run` startup. The other 8 are
spawned dynamically: child-alpha and child-beta by parent's passthrough body,
sub-alpha-{1,2,3} by child-alpha's loop body, and sub-beta-{1,2,3} by
child-beta's loop body. The runtime ledger records each spawned row, and the
scheduler uses those rows to keep the level ordering and worker assignment in
sync inside the same `converge run`.

### The spawn CLI shape

Every spawn call uses one shape, no flags in the common case:

```bash
converge spawn <id> <template>
```

`<template>` resolves to `.converge/playbooks/<pb>/templates/<template>/TASK.md`
by convention. The framework infers:

- **playbook** from `$CONVERGE_PLAYBOOK` (set by the executor)
- **parent** from `$CONVERGE_CURRENT_TASK_PATH` (the executing task)
- **title, summary, goal-id** from the template's own frontmatter

Optional flags (only when needed):

| Flag | Purpose |
|---|---|
| `--var k=v` | Pass an explicit var to the child (repeatable) |
| `--after <sibling-id>` | Add a sibling depends_on |
| `--no-inherit` | Opt out of inheriting parent's vars |
| `--dry` | Preview the rendered TASK.md as JSON |
| `--batch <file.jsonl|->` | Bulk-spawn from JSONL (for thousands of children) |

### The typed vars contract

Each child template declares a `vars:` block in its frontmatter. The
framework treats the declaration as a **typed contract**:

```yaml
# templates/child-alpha/TASK.md
vars:
  sprint_id:        # required (no default → spawn fails if missing)
  owner:            # required
  wave: 0           # optional with default 0
```

**Strict mode** (template has `vars:` declared):

- Only declared keys flow into the child — undeclared parent vars are dropped
- A key without a default is **required**; missing → spawn fails with a clear error
- A key with a default uses that default unless parent/explicit `--var` supplies one
- Precedence (low → high): template default → parent's `CONVERGE_VAR_*` env →
  auto-injected `wave` from `$CONVERGE_TASK_WAVE` → explicit `--var` override

**Permissive mode** (template has no `vars:` block):

- Every parent `CONVERGE_VAR_*` flows in
- Plus auto-wave, plus explicit `--var`
- No filtering, no validation — useful for generic forwarder templates

## The test fixture's vars story

The fixture deliberately exercises each strict-mode property:

| Template | `vars:` declaration | What gets demonstrated |
|---|---|---|
| `parent` | none | Passes `sprint_id`, `owner`, `wave` explicitly via `--var` to children |
| `child-alpha` | `sprint_id:`, `owner:`, `wave: 0` | 2 required + 1 default; parent's `wave=3` overrides template's default 0 |
| `child-beta` | `sprint_id:` only | Parent also passed `owner=alice` — but **the framework drops it** because child-beta's contract doesn't declare it. Body sees empty `$CONVERGE_VAR_OWNER`. |
| `sub-alpha` | `sprint_id:`, `owner:`, `index: 0` | Receives both sprint_id + owner from child-alpha; index differentiates each loop iteration |
| `sub-beta` | `sprint_id:`, `index: 0` | Receives sprint_id only; owner is filtered because child-beta didn't declare it (and child-beta itself never received owner either) |

All evidence files land under `output/` (created by each body's
`mkdir -p output`). The values are baked into the assertions:

- `output/alpha.flag` must contain `sprint=sprint-042 owner=alice wave=3`
- `output/beta.txt` must contain `sprint-042` and must NOT contain `alice`
- `output/sub-alpha-1.txt` through `output/sub-alpha-3.txt` each contain `sprint=sprint-042 owner=alice`
- `output/sub-beta-1.txt` through `output/sub-beta-3.txt` each contain `sprint=sprint-042` and must NOT contain `alice`

The `output/` folder is wiped on test start and removed on test end, so
the fixture root stays clean for `git status` and reviewer diffs.

## The failure mode

The runner includes a deliberate "missing required var" test:

```bash
unset CONVERGE_VAR_SPRINT_ID CONVERGE_VAR_OWNER
converge spawn missing-test child-alpha
```

Expected: exit code 3, stderr contains `missing required vars [sprint_id, owner]`,
the template path is named in the error so the AI agent (or human) knows
where to look.

## Layout

```
tests/test-seeding/
├── README.md                                            # this file
├── run-test.sh                                          # the test runner
├── output/                                              # produced at run time, wiped on exit
│   ├── parent.flag                                      # parent body's evidence
│   ├── alpha.flag                                       # child-alpha vars dump
│   ├── beta.txt                                         # child-beta vars dump (filtered)
│   ├── sub-alpha-1.txt                                  # sub-alpha-1 vars dump
│   ├── sub-alpha-2.txt                                  # sub-alpha-2 vars dump
│   ├── sub-alpha-3.txt                                  # sub-alpha-3 vars dump
│   ├── sub-beta-1.txt                                   # sub-beta-1 vars dump
│   ├── sub-beta-2.txt                                   # sub-beta-2 vars dump
│   └── sub-beta-3.txt                                   # sub-beta-3 vars dump
└── .converge/
    ├── project.yaml
    └── playbooks/default/
        ├── playbook.yml                                 # generic, no tasks: block
        ├── tasks/
        │   └── parent/TASK.md                           # level-1 root (auto-discovered)
        └── templates/
            ├── child-alpha/TASK.md                      # level-2 seed → loop-spawns sub-alpha-1/2/3
            ├── child-beta/TASK.md                       # level-2 leaf → loop-spawns sub-beta-1/2/3
            ├── sub-alpha/TASK.md                        # level-3 leaf
            └── sub-beta/TASK.md                         # level-3 leaf
```

Templates under `templates/` are NOT auto-discovered — they only exist as spawn
targets. The framework's discovery scanner excludes `**/templates/**` for
exactly this reason. A template is a recipe; an instance is a row in
`tasks.jsonl`.

## What the test proves about the framework

Counted by assertion:

| Category | Assertions | What it proves |
|---|---|---|
| Auto-discovery + structure | 3 | playbook validates, parent is found, topology starts with the static root |
| Singular spawn shape | 9 | No legacy flags; positional `<id> <template>` everywhere |
| Multi-level spawn flow | 18 | parent + 2 spawned + 6 loop-spawned rows in `tasks.jsonl`, correct source/parent linkage |
| Worker sequencing | 2 | sibling parallelism + parent/child/grandchild start order from runstate |
| Vars passing (values) | 10 | child-alpha: 3 vars; child-beta: 1 + filters owner; 6 sub-children: correct propagation |
| Failure mode | 3 | Missing required var → clear error message + non-zero exit + names the offending var |
| Body-evidence files | 6 | parent.flag + alpha.flag + 4 sub-beta outputs confirm passthrough bodies ran |
| **Total** | **60** | |

Total runtime: ~3 seconds, no LLM, no network, fully deterministic.

## Files outside the fixture this exercises

The test depends on these framework files; changes to them should re-run this
test:

- `packages/cli/src/commands-spawn.ts` — the spawn CLI
- `packages/core/src/navigator/repair/strategies/task-run.ts` — passthrough body
  executor and the `syncSpawnedToDag` callback
- `packages/core/src/run/execute-task.ts` — `CONVERGE_PLAYBOOK`,
  `CONVERGE_CURRENT_TASK_PATH`, `CONVERGE_TASK_WAVE`, `CONVERGE_VAR_*` env
  injection before task execution
- `packages/core/src/config/task-md-definition.ts` — frontmatter parser +
  serializer (preserves `passthrough`, `vars`, `converge` round-trip)
- `packages/core/src/config/declarative-loader.ts` — auto-discovery from
  `tasks/` when no `tasks:` block is in `playbook.yml`
- `packages/core/src/task/goal/runtime-ledger.ts` — `appendTaskUpsert`,
  `readRuntimeLedgerState` (the in-process spawn registration path)