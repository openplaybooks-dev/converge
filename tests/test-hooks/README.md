# test-hooks

Integration test fixtures for the Converge **hook system**.

Hooks allow playbooks to attach callbacks to task lifecycle events (`task:complete`, `task:fail`, `task:start`), optionally filtered by task ID or tags. The framework compiles each hook into companion DAG nodes that execute at the correct topological position relative to the matched task.

## Fixtures

### `hook-taskid-filter`

Validates that hooks can filter by **specific task IDs** rather than tags.

**Setup:**
- Two tasks: `specific-task` and `other-task` (both untagged)
- One hook: `targeted`, listening on `task:complete`, filtered to `specific-task` only

**Expected behavior:**
- Both tasks run and write their output files (`out/specific.txt`, `out/other.txt`)
- The `targeted` hook fires only after `specific-task`, not after `other-task`

**Test:** [`tests/playbook-hooks.test.ts`](../playbook-hooks.test.ts) — `"should match tasks by taskId filter"`

## Directory layout

```
test-hooks/
  out/                  # Task output files (written at runtime)
  .converge/
    inventory/          # Task inventory (persisted task state)
    journal/            # Run journals (DAG manifest, events, execution log)
```

## Related

- Hook definitions: `packages/core/src/hooks/hook-definition.ts`
- Hook DAG compilation: `packages/core/src/dag/hook-nodes.ts`
