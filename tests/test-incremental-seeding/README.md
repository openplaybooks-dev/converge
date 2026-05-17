# test-incremental-seeding

Deterministic fixture demonstrating three incremental spawning patterns in the
converge framework, all without live agent calls:

1. `default` — a do-while parent that emits one child per wave
2. `for-each` — a parent that walks a fixed list and emits one item per wave
3. `nested-loop` — an outer parent that emits batch children, where each batch
   is its own incremental loop that emits item children

Every task is `passthrough: true`. The loop decisions use `converge.cmd`, so
the fixture is fast, reproducible, and independent of a stub AI provider.

## Playbooks

### `default`

```
parent
  ├── child-00
  ├── child-01
  └── child-02
```

`parent` records `output/default/wave-{0,1,2}.flag`, spawns one child per wave,
and halts after wave 2. Each child writes `output/child-0N.txt`.

### `for-each`

```
process-all
  ├── alpha
  ├── beta
  └── gamma
```

`process-all` walks a fixed `alpha beta gamma` list, spawning one child per
wave. Each item writes `output/for-each/<name>.txt`.

### `nested-loop`

```
process-batches
  ├── batch-0
  │     ├── batch-0-item-0
  │     └── batch-0-item-1
  └── batch-1
        ├── batch-1-item-0
        └── batch-1-item-1
```

`process-batches` emits one batch per outer wave. Each batch is another
incremental passthrough task that emits one item per inner wave.

## Run it

```bash
bash run-test.sh
```

Expected result:

```
RESULTS:  21 passed,  0 failed
```

## Why this fixture exists

This is a regression harness and a reference example for:

- gap-driven re-runs of passthrough container tasks
- idempotent `converge spawn <id> <template>` usage
- command-driven `converge.cmd` loops
- nested dynamic DAG growth during a single `converge run`
