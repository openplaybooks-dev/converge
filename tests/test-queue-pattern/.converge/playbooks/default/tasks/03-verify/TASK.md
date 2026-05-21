---
id: 03-verify
title: "Verify — assemble results and validate invariants"
depends_on:
  - 02-drain-epochs
description: "Merge per-item pages into results.json, then validate all 6 queue invariants."
inputs:
  - .converge/artifacts/queue-pattern/queue.json
  - .converge/artifacts/queue-pattern/pages/
outputs:
  - .converge/artifacts/queue-pattern/results.json
  - .converge/artifacts/queue-pattern/validation.json
checks:
  - id: results-exists
    cmd: test -f .converge/artifacts/queue-pattern/results.json
  - id: validation-exists
    cmd: test -f .converge/artifacts/queue-pattern/validation.json
  - id: all-passed
    cmd: jq -e '.all_passed == true' .converge/artifacts/queue-pattern/validation.json
    description: All 6 queue invariants passed
---

# Verify — Assemble + Validate

## Step 1: Assemble results.json

Read every `.converge/artifacts/queue-pattern/pages/*.json`, extract `id`, `data`, `discovered`. Write merged results.json:

```json
{ "items": [<each page object>], "total_items": <count> }
```

## Step 2: Validate 6 invariants

Read the real `queue.json` and `results.json`. Check:

1. **No lost items** — every id in `seen_ids` is in `done ∪ processing ∪ pending`
2. **Valid transitions** — no id appears in multiple states
3. **Convergence** — `pending.length == 0 && processing.length == 0`
4. **Outputs exist** — each done item has `pages/{id}.json`
5. **Results match** — `results.total_items == queue.done.length`
6. **Discovery chain** — gamma and delta (discovered by alpha, beta) are in `seen_ids` AND `done`

Write validation.json with `all_passed` and per-invariant `{id, passed, detail}`.
