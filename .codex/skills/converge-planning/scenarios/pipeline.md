# Pipeline / Continuous Sync — Worked Example

## When to use this scenario

**Trigger phrases:**
- "data pipeline" / "continuous sync"
- "cron-triggered pipeline"
- "event-driven pipeline"
- "ETL pipeline"
- "idempotent incremental processing"

**What it covers:** `(extract → transform → load → checkpoint)`. External trigger (cron/event), no convergence signal, designed to run forever.

---

Continuous ETL, data sync, and event-driven pipelines. Runs on cron or event trigger, processes incrementally, idempotent re-runs. No convergence — designed to run forever.

## The thinking sequence applied

1. **What does it contain?** A fixed pipeline of stages (extract → transform → load → checkpoint)
2. **Composition?** Linear chain of tasks, each dependent on the previous
3. **Static vs. dynamic?** All static — the pipeline structure is fixed; only the data changes
4. **Modes?** `mode: oneoff` triggered by external cron or event. `mode: loop` not needed.

---

## The pipeline anatomy

```
01-extract    ← detect new items since last checkpoint
02-transform ← process/normalize each new item (spawner)
03-load      ← write to destination (spawner)
04-checkpoint ← update cursor for next run
```

**Core pattern:**
1. **Extract** — read cursor, query source for items newer than cursor
2. **Transform** — spawn one task per new item
3. **Load** — write transformed items to destination
4. **Checkpoint** — save cursor/state for next run

---

## playbook.yml

**No `tasks:` entry.** Pipeline tasks are static. The trigger (cron, webhook, event) is external.

```yaml
name: pipeline
description: >-
  Continuous ETL pipeline: extract → transform → load → checkpoint.
  Idempotent — skips already-processed items.
  Triggered by cron or event, not by a converge loop.

run:
  mode: oneoff
  maxTaskAttempts: 3
  resume: true
```

**Key:** `mode: oneoff` — not `mode: loop`. The trigger is external.

---

## tasks/ structure

```
tasks/
├── 01-extract/
│   └── TASK.md
├── 02-transform/
│   └── TASK.md
├── 03-load/
│   └── TASK.md
└── 04-checkpoint/
    └── TASK.md
```

All static tasks. No templates/ directory needed.

---

## Phase details

### 01-extract — detect new items since last run

```yaml
tasks/01-extract/TASK.md:
  ---
  id: 01-extract
  title: Extract new items since last checkpoint
  inputs: []
  outputs:
    - output/extract/new-items.json
    - output/extract/cursor.json
  checks:
    - id: new-items-json
      cmd: test -s output/extract/new-items.json
  ---
  # Read last cursor to know where we left off
  LAST_CURSOR=$(cat output/state/cursor.json 2>/dev/null || echo "1970-01-01T00:00:00Z")

  # Query source for items newer than cursor
  NEW_ITEMS=$(query-source --since "$LAST_CURSOR")
  echo "$NEW_ITEMS" > output/extract/new-items.json

  # Write new cursor timestamp
  date -u +%Y-%m-%dT%H:%M:%SZ > output/extract/cursor.json
```

### 02-transform — spawner, process each new item

```yaml
tasks/02-transform/TASK.md:
  ---
  id: 02-transform
  title: Transform new items
  mode: spawner
  spawn:
    min_children: 0
  inputs:
    - output/extract/new-items.json
  ---
  # Read new-items.json, spawn one transform task per item
  for item in $(jq -r '.[] | @json' output/extract/new-items.json); do
    ITEM_ID=$(echo "$item" | jq -r '.id')
    converge spawn "transform-${ITEM_ID}" transform-item --var item="$item"
  done
```

### 02-transform/transform-item — DYNAMIC template (one per item)

```yaml
tasks/02-transform/TASK.md:
  ---
  id: transform-item
  title: Transform item
  vars:
    - item
  inputs: []
  outputs:
    - output/transformed/${ITEM_ID}.json
  checks:
    - id: transformed
      cmd: test -s output/transformed/${ITEM_ID}.json
  ---
  # Transform the item — normalize, enrich, validate
  # Output is idempotent — re-runs skip if output already exists
  DEST="output/transformed/${ITEM_ID}.json"
  if [ -f "$DEST" ]; then
    echo "[skip] $ITEM_ID already transformed"
    exit 0
  fi
  transform-item "$ITEM" > "$DEST"
```

### 03-load — write to destination

```yaml
tasks/03-load/TASK.md:
  ---
  id: 03-load
  title: Load transformed items to destination
  mode: spawner
  spawn:
    min_children: 0
  inputs:
    - output/extract/new-items.json
  ---
  for item in $(jq -r '.[].id' output/extract/new-items.json); do
    converge spawn "load-${item}" load-item --var item="$item"
  done
```

### 03-load/load-item — DYNAMIC template (one per item)

```yaml
tasks/03-load/TASK.md:
  ---
  id: load-item
  title: Load item to destination
  vars:
    - item
  inputs:
    - output/transformed/${ITEM_ID}.json
  checks:
    - id: loaded
      cmd: test -s output/destination/${ITEM_ID}.json
  ---
  DEST="output/destination/${ITEM_ID}.json"
  if [ -f "$DEST" ]; then
    echo "[skip] $ITEM_ID already loaded"
    exit 0
  fi
  cp output/transformed/${ITEM_ID}.json "$DEST"
```

### 04-checkpoint — save cursor for next run

```yaml
tasks/04-checkpoint/TASK.md:
  ---
  id: 04-checkpoint
  title: Update checkpoint for next run
  inputs:
    - output/extract/cursor.json
  outputs:
    - output/state/cursor.json
  checks:
    - id: cursor-saved
      cmd: test -s output/state/cursor.json
  ---
  cp output/extract/cursor.json output/state/cursor.json
```

---

## Key mechanics

**Incremental detection:**
```bash
# In 01-extract:
LAST_CURSOR=$(cat output/state/cursor.json 2>/dev/null || echo "1970-01-01T00:00:00Z")
NEW_ITEMS=$(query-source --since "$LAST_CURSOR")
```

**Idempotent processing:**
```bash
# In any task that writes output:
DEST="output/transformed/${ITEM_ID}.json"
if [ -f "$DEST" ]; then
  echo "[skip] already processed"
  exit 0
fi
# ... do work ...
```

**Cursor persistence:**
```
output/state/cursor.json  ← checkpoint file written by 04-checkpoint
                         ← read by 01-extract on next run
```

---

## Trigger types

**Cron-triggered:**
```bash
# CI cron or system cron triggers converge run:
converge run --playbook=pipeline --max-duration=5m
```

**Event-triggered (webhook):**
```bash
# GitHub push webhook triggers pipeline:
curl -X POST https://api.converge.run/trigger/pipeline \
  -H "Authorization: Bearer $CONVERGE_TRIGGER_TOKEN" \
  -d '{"ref": "main", "event": "push"}'
```

**Schedule-triggered:**
```yaml
# playbook.yml run.schedule for time-based triggers:
run:
  mode: oneoff
  schedule:
    cron: "0 * * * *"  # hourly
    resume: true
```

---

## Examples from real code

### data-pipeline

Daily RSS → cluster → script → validate. Triggered by external cron.

### Continuous ETL

```
01-extract: query database for rows updated since cursor
02-transform: normalize each row
03-load: upsert to warehouse
04-checkpoint: save cursor
```

### GitHub event watcher

```
01-extract: fetch new commits/PRs since last run
02-transform: run code review / lint per changed file
03-load: post review comments
04-checkpoint: update cursor
```

### JIRA issue watcher

```
01-extract: query JIRA for new issues matching filter
02-transform: classify / triage each issue
03-load: create Slack notification, update issue status
04-checkpoint: save cursor
```

---

## Key insight: no convergence — designed to run forever

Pipeline is the only pattern with **no convergence signal**. It processes what's new and exits. The next trigger (cron/event/webhook) starts it again.

| Pattern | Trigger | Convergence | Idempotent |
|---|---|---|---|
| Pipeline | Cron/event | None — runs forever | Yes |
| Exploration loop | Manual | Catalog empty or N epochs | No |
| Optimization loop | Manual | Score threshold | No |
| Goal-driven | Manual | All checklist items done | Partial |
| Software dev | Manual | Goals pass | N/A |

---

## Structural summary

| Element | Pattern |
|---|---|
| Run mode | `mode: oneoff` (trigger is external) |
| Trigger | Cron, webhook, event, schedule |
| Tasks | All static — no templates needed |
| Incremental | Cursor file in `output/state/cursor.json` |
| Idempotent | Re-runs skip already-processed items |
| Spawner | 02-transform and 03-load use parallel spawners |
| Checkpoint | 04-checkpoint persists cursor for next run |
