# Exploration / Deep Research — Worked Example

## When to use this scenario

**Trigger phrases:**
- "deep research" / "explore a topic deeply"
- "multi-epoch research"
- "layered exploration"
- "synthesize findings from multiple sources"

**What it covers:** `(setup → explore-per-item → synthesize) × N`. Catalog drives each epoch, synthesize produces next epoch's catalog.

---

Layered exploration: `(setup → explore-per-item → synthesize) × N → final report`. Used when the space to explore is unknown until you explore it.

## The thinking sequence applied

1. **What does it contain?** A catalog of items to explore, per-item exploration tasks, and a synthesizer that refines the catalog for the next epoch
2. **Composition?** Linear epoch chain: setup → explore → synthesize → [next epoch] → ... → final-report
3. **Static vs. dynamic?** Bootstrap is static. Everything else is dynamic — spawned per catalog item at runtime
4. **Modes?** Bootstrap: spawner via `converge apply`. Explore: spawner per catalog item. Synthesize: task.

---

## The layered exploration loop

```
root bootstrap
  └─▶ epoch-1-setup
  └─▶ epoch-1-explore-per-item     ← spawner: one task per catalog item
  └─▶ epoch-1-synthesize           ← aggregates → next catalog
  └─▶ epoch-2-explore-per-item     ← reads synthesize output
  └─▶ epoch-2-synthesize
  └─▶ [repeat until depth=N or no new items]
  └─▶ final-report                 ← synthesizes all epoch outputs
```

**Core pattern:**
1. **Setup** — produces initial catalog (list of items to explore)
2. **Explore per item** — spawner fans out one task per catalog item
3. **Synthesize** — aggregates explore outputs into a refined catalog for next epoch
4. **Repeat** — N epochs or until convergence (no new items found)
5. **Final report** — synthesizes all epoch outputs

---

## playbook.yml — single entry point

**No `tasks:` entry.** One bootstrap task spawns the full epoch chain via `converge apply`. The runtime discovers nothing from `tasks/` — all work is spawned.

```yaml
name: exploration
description: >-
  Layered exploration: setup → explore-per-item → synthesize → repeat → report.
  Each epoch: catalog from previous synthesize → explore each item → synthesize next catalog.
  One-pass (N=1) or deep exploration (N>1).

run:
  maxIterations: 30
  maxTaskAttempts: 3
  maxDuration: 12h
  resume: true
```

---

## tasks/ — bootstrap only

```
tasks/
└── 000-bootstrap/
    └── TASK.md                      ← spawns epoch chain via converge apply
```

The bootstrap task is the **only static task**. Everything else is a template spawned at runtime.

---

## templates/ — phase structure

```
templates/
├── 001-setup/                      ← phase template: creates initial catalog
│   └── TASK.md
├── 002-explore/                   ← phase template: spawner per catalog item
│   ├── TASK.md
│   └── tasks/templates/
│       └── explore-item/TASK.md   ← DYNAMIC: one per catalog entry
├── 003-synthesize/               ← phase template: aggregates → next catalog
│   └── TASK.md
├── 004-deep-explore/             ← optional deeper dive per item
│   └── TASK.md
└── 005-final-report/             ← final synthesis
    └── TASK.md
```

---

## How bootstrap spawns the epoch chain

The bootstrap task writes a JSONL manifest and runs `converge apply`. Each epoch's explore phase reads the previous synthesize's catalog output:

```bash
# In bootstrap TASK.md body:
QDIR=$(cat .converge/.question-dir)
EPOCHS=3

for EPOCH in $(seq 1 $EPOCHS); do
  if [ "$EPOCH" -eq 1 ]; then
    # Epoch 1: initial setup
    converge spawn "epoch-${EPOCH}-setup" setup --var epoch="$EPOCH" --var questionDir="$QDIR"
    converge spawn "epoch-${EPOCH}-explore" explore --var epoch="$EPOCH" --var questionDir="$QDIR" --after "epoch-${EPOCH}-setup"
    converge spawn "epoch-${EPOCH}-synthesize" synthesize --var epoch="$EPOCH" --var questionDir="$QDIR" --after "epoch-${EPOCH}-explore"
  else
    # Epoch N: reads previous epoch's synthesize output as input
    converge spawn "epoch-${EPOCH}-setup" setup --var epoch="$EPOCH" --var questionDir="$QDIR" --after "epoch-$((EPOCH-1))-synthesize"
    converge spawn "epoch-${EPOCH}-explore" explore --var epoch="$EPOCH" --var questionDir="$QDIR" --after "epoch-${EPOCH}-setup"
    converge spawn "epoch-${EPOCH}-synthesize" synthesize --var epoch="$EPOCH" --var questionDir="$QDIR" --after "epoch-${EPOCH}-explore"
  fi
done

# Final report: reads last synthesize output
converge spawn final-report report --after "epoch-${EPOCHS}-synthesize"
```

---

## Phase details

### 001-setup — initial catalog generation

```yaml
tasks/001-setup/TASK.md:
  ---
  id: setup-{{epoch}}
  title: "Exploration setup — epoch {{epoch}}"
  inputs: (none for epoch 1, previous synthesize output for epoch > 1)
  outputs:
    - output/epoch-{{epoch}}/catalog.json
  ---
  # Reads questionDir, produces initial item list or reads previous catalog and expands it
```

### 002-explore — catalog-driven spawner

```yaml
tasks/002-explore/TASK.md:
  ---
  id: explore-{{epoch}}
  title: "Explore items — epoch {{epoch}}"
  mode: spawner
  spawn:
    min_children: 1
    apply: auto
  inputs:
    - output/epoch-{{epoch}}/catalog.json
  outputs:
    - output/epoch-{{epoch}}/explored/
  ---
  # Body: reads catalog.json, spawns explore-item per entry
  for item in $(jq -r '.items[]' output/epoch-{{epoch}}/catalog.json); do
    converge spawn "explore-{{epoch}}-$item" explore-item \
      --var item="$item" \
      --var epoch="{{epoch}}" \
      --var questionDir="{{questionDir}}"
  done
```

### 002-explore/explore-item — DYNAMIC template (one per catalog entry)

```yaml
tasks/002-explore/tasks/templates/explore-item/TASK.md:
  ---
  id: explore-item-{{itemId}}
  title: "Explore: {{itemName}}"
  inputs:
    - output/epoch-{{epoch}}/catalog.json
  outputs:
    - output/epoch-{{epoch}}/explored/{{itemId}}.md
  checks:
    - id: explored
      cmd: test -s output/epoch-{{epoch}}/explored/{{itemId}}.md
  ---
  # Deep dive into this specific item
```

### 003-synthesize — aggregates into next catalog

```yaml
tasks/003-synthesize/TASK.md:
  ---
  id: synthesize-{{epoch}}
  title: "Synthesize — epoch {{epoch}}"
  inputs:
    - output/epoch-{{epoch}}/catalog.json
    - output/epoch-{{epoch}}/explored/
  outputs:
    - output/epoch-{{epoch}}/summary.json
    - output/epoch-{{nextEpoch}}/catalog.json  ← next epoch's input
  checks:
    - id: summary-valid
      cmd: jq empty output/epoch-{{epoch}}/summary.json
  ---
  # Reads all explored/*.md, extracts new sub-items, writes next catalog
  # If no new items found → write halt.marker
```

### 005-final-report — only after all epochs

```yaml
tasks/005-final-report/TASK.md:
  ---
  id: final-report
  title: Final exploration report
  inputs:
    - output/epoch-1/summary.json
    - output/epoch-2/summary.json
    - output/epoch-3/summary.json
  outputs:
    - output/final-report.md
  checks:
    - id: report-exists
      cmd: test -s output/final-report.md
  ---
```

---

## Convergence: when to stop

The synthesize phase checks if new items were found. If the catalog is empty or unchanged:

```bash
# In synthesize body:
if [ "$(jq '.items | length' output/epoch-$EPOCH/catalog.json)" -eq 0 ]; then
  echo "no new items — convergence reached"
  touch output/halt.marker
fi
```

When `halt.marker` exists, subsequent epochs skip (the `after` chain means later epochs don't run).

---

## Key insight: catalog is the currency between epochs

The catalog is not a stage — it is the **dynamic artifact** that drives the exploration. Each epoch's explore phase reads the previous epoch's catalog. The synthesize phase writes the next epoch's catalog.

```
catalog.json → explore-per-item → explored/*.md → synthesize → catalog.json (refined)
                                                                       ↓
                                                               [next epoch]
```

**Single-pass exploration (N=1):** setup → explore → synthesize → final-report

**Deep exploration (N>1):** each epoch's synthesize output feeds the next epoch's explore input. The catalog grows or refines with each iteration.

---

## Structural summary

| Element | Pattern |
|---|---|
| Entry point | Single bootstrap task |
| Spawner | Per catalog item (from synthesize output) |
| Epoch chaining | `after` in converge apply |
| Catalog | Dynamic artifact — input to explore, output of synthesize |
| Convergence | `halt.marker` when no new items |
| Final report | Reads all epoch summaries |
