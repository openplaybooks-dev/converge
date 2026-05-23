# test-catalog-batch

End-to-end fixture for the converge framework's **batch spawning** primitive —
the mechanism that registers many child tasks at once via `converge spawn --batch`.

Two playbooks demonstrate different approaches for reading a catalog JSON file
and spawning 100 subtasks from it:

1. **inline-catalog** — the passthrough parent's body reads `catalog.json`,
   generates `catalog.jsonl`, and calls `converge spawn --batch catalog.jsonl`
   all inline.

2. **external-catalog** — the passthrough parent delegates to
   `scripts/spawn-batch.sh` for the catalog-to-JSONL conversion and batch spawn.

A single `converge run` exercises each playbook. The runner asserts on both
the on-disk evidence (tasks.jsonl rows, leaf output files) and the
spawned task linkage.

## How to run

```bash
./run-test.sh
```

Exits `0` on full pass, non-zero on any failure. Wipes its own state on each
run (`.converge/journal`, `.converge/inventory`, `.converge/artifacts`, and
the leaf output files), so the test is idempotent.

Expected runtime: ~30-60s.

## What gets demonstrated

### Tree topology (both playbooks)

```
seed-all                                 (level 1, static, passthrough parent)
├── item-001                             (level 2, batch-spawned)
├── item-002
├── ...
└── item-100
```

`seed-all` is the only static task. All 100 items are spawned dynamically via
`converge spawn --batch catalog.jsonl` in a single call. The runtime ledger
records each spawned row, and the scheduler executes them across workers.

### The batch spawn CLI

```bash
converge spawn --batch <file.jsonl>
```

Each JSONL line:
```json
{"id":"item-001","template":"catalog-item","vars":{"item_id":"item-001","item_name":"Grassland 001","item_category":"grassland"}}
```

Per-row errors land in stderr; batch continues. Exit code 3 only if ALL rows
fail. This is the primary path for spawning hundreds or thousands of children.

### Inline vs external script

| Approach | Pros | Cons |
|---|---|---|
| **Inline** | Self-contained; no extra files | TASK.md body gets long with JSONL generation |
| **External** | Clean TASK.md; reusable script | Extra file to maintain; path resolution |

Both produce identical results — the choice is about code organization.

## The catalog

`catalog.json` has 100 items across 5 categories (grassland, forest, desert,
tundra, wetland), cycling through them. Generated deterministically by
`scripts/generate-catalog.sh` for reproducibility.

## Layout

```
tests/test-catalog-batch/
├── README.md
├── run-test.sh
├── scripts/
│   └── generate-catalog.sh              # creates catalog.json deterministically
└── .converge/
    ├── project.yaml
    └── playbooks/
        ├── inline-catalog/
        │   ├── playbook.yml
        │   ├── catalog.json             # 100 items
        │   ├── tasks/
        │   │   └── seed-all/TASK.md     # inline passthrough parent
        │   └── templates/
        │       └── catalog-item/TASK.md # item template
        └── external-catalog/
            ├── playbook.yml
            ├── catalog.json             # same 100 items
            ├── scripts/
            │   └── spawn-batch.sh       # external batch script
            ├── tasks/
            │   └── seed-all/TASK.md     # delegates to external script
            └── templates/
                └── catalog-item/TASK.md # same item template
```
