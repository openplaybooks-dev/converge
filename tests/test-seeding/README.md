# test-seeding

End-to-end fixture for the converge framework's **dynamic spawning** primitives —
the mechanism that lets a parent task register new child tasks at runtime via
the `converge spawn` CLI, with the framework injecting them into the live DAG
through `syncSpawnedToDag`.

The test covers three things at once, with **no LLM involved**:

1. **Multi-level spawning** — parent → child-alpha → grandchild (3 levels deep)
2. **The singular spawn CLI** — `converge spawn <id> <template>`, no flags
3. **Typed vars contract** — child templates declare what vars they accept;
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

Expected runtime: ~2 seconds. Expected output ends with:

```
RESULTS:  36 passed,  0 failed
```

## What gets demonstrated

### Tree topology

```
parent                                  (level 1, static, auto-discovered from tasks/)
├── child-alpha                         (level 2, CLI-spawned)
│     └── grandchild                    (level 3, CLI-spawned by child-alpha)
└── child-beta                          (level 2, CLI-spawned)
```

`parent` is the only static task — it lives at `tasks/parent/TASK.md` and the
framework auto-discovers it on `converge run` startup. The other three are
spawned dynamically: child-alpha and child-beta by parent's passthrough body,
grandchild by child-alpha's passthrough body. The framework's `syncSpawnedToDag`
callback (in `packages/core/src/navigator/repair/strategies/task-run.ts`) reads
the freshly-appended `tasks.jsonl` rows after each parent's body exits and
injects them into the running DAG so they execute in the same `converge run`.

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
| `grandchild` | `sprint_id:`, `phase: "leaf"` | sprint_id propagates 3 levels (parent → child-alpha → grandchild); `phase` defaults to "leaf" because nobody passed it |

All evidence files land under `output/` (created by each body's
`mkdir -p output`). The values are baked into the assertions:

- `output/alpha.flag` must contain `sprint=sprint-042 owner=alice wave=3`
- `output/beta.txt` must contain `sprint-042` and must NOT contain `alice`
- `output/grand.txt` must contain `sprint-042/leaf`

The `output/` folder is wiped on test start and removed on test end, so
the fixture root stays clean for `git status` and reviewer diffs.

The rendered TASK.md inside `.converge/inventory/<pb>/spawned/<id>/TASK.md` is
also asserted — proving the filter happens at render time, not just at
body-execution time. Beta's rendered frontmatter has no `owner:` field at
all.

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
│   └── grand.txt                                        # grandchild vars dump (3-level)
└── .converge/
    ├── project.yaml
    └── playbooks/default/
        ├── playbook.yml                                 # generic, no tasks: block
        ├── tasks/
        │   └── parent/TASK.md                           # level-1 root (auto-discovered)
        └── templates/
            ├── child-alpha/TASK.md                      # level-2 seed → spawns grandchild
            ├── child-beta/TASK.md                       # level-2 leaf
            └── grandchild/TASK.md                       # level-3 leaf
```

Templates under `templates/` are NOT auto-discovered — they only exist as spawn
targets. The framework's discovery scanner excludes `**/templates/**` for
exactly this reason. A template is a recipe; an instance is a row in
`tasks.jsonl`.

## What the test proves about the framework

Counted by assertion:

| Category | Assertions | What it proves |
|---|---|---|
| Auto-discovery + structure | 3 | playbook validates, parent is found, DAG starts with 3 nodes |
| Singular spawn shape | 9 | No legacy flags (`--task-file`, `--from`, `--parent`, etc.); positional `<id> <template>` everywhere |
| Multi-level spawn flow | 9 | parent + 3 spawned rows in `tasks.jsonl`, correct source/parent linkage |
| Vars passing (values) | 4 | child-alpha receives 3 vars; child-beta receives 1 + filters owner; grandchild receives sprint_id (3-level) + phase default |
| Vars passing (rendered frontmatter) | 6 | Inventory TASK.md has correct keys, beta's rendering omits owner entirely, defaults appear when nobody overrode |
| Failure mode | 3 | Missing required var → clear error message + non-zero exit + names the offending var |
| Body-evidence files | 2 | parent.flag + alpha.flag confirm passthrough bodies actually ran |
| **Total** | **36** | |

Total runtime: ~2 seconds, no LLM, no network, fully deterministic.

## How this maps to production playbooks

The same primitives drive `examples/goal-driven-dev`:

- `tasks/build/TASK.md` (static root) spawns one sprint-NNN per loop iteration
- Each sprint template spawns the 6 phase children (research → plan → … → retro)
- Vars (`nnn`, `sprint_id`, `wave`, `sprint_dir`) flow from build → sprint → phases

The test-seeding fixture is the minimal version of that pattern — strip away
the agile-phase content and you're left with the exact spawn machinery being
exercised here.

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
