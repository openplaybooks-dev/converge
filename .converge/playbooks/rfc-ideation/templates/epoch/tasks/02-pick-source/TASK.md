---
id: "{{taskId}}"
title: "Pick one candidate via weighted round-robin — epoch {{epoch}}"
outputs:
  - "{{artifactsRel}}/pick/selected.json"
checks:
  - id: selected-valid
    cmd: "node .converge/playbooks/rfc-ideation/scripts/jq-safe.mjs -e '.source != null and .ref != null' {{artifactsRel}}/pick/selected.json"
    description: Selected candidate has source and ref
  - id: source-cursor-updated
    cmd: "test -s {{artifactsRootRel}}/source-cursor.jsonl"
    description: Round-robin cursor updated
---

# Pick one candidate via weighted round-robin

Read `{{artifactsRel}}/discover/candidates.jsonl` (from task 01) and
`{{artifactsRootRel}}/source-cursor.jsonl` (round-robin state, may be empty
on first epoch).

## Algorithm

Invoke the cursor script — it does the math and updates state atomically:

```sh
node {{projectDir}}/.converge/playbooks/rfc-ideation/scripts/source-cursor.mjs \
  --candidates {{artifactsRel}}/discover/candidates.jsonl \
  --cursor {{artifactsRootRel}}/source-cursor.jsonl \
  --epoch {{epoch}} \
  --out {{artifactsRel}}/pick/selected.json
```

The script:
1. Reads candidates grouped by source.
2. Looks up `last_picked_epoch` per source in cursor (default: 0).
3. Computes effective weight = base × `max(1, (current_epoch - last_picked) / 3)`.
   Base weights: `issue=3, idea=2, backlog=2, code-finding=1`.
4. Picks the highest effective weight (ties → lower `last_picked_epoch`).
5. Within the winning source, picks the first candidate (sources are pre-sorted
   in task 01 by recency / priority).
6. Updates the cursor with this epoch.
7. Writes `selected.json` = the picked candidate (full row).

## Edge cases

- **No candidates at all**: Write `selected.json` as
  `{"source": "none", "ref": null, "reason": "no-candidates"}` and the epoch
  proceeds to triage which short-circuits to `decision: invalid`.
- **Only one source has candidates**: That source wins regardless of weight.

## Output

`{{artifactsRel}}/pick/selected.json` — the chosen candidate row.

Updated `{{artifactsRootRel}}/source-cursor.jsonl` — one JSON line per source
with `{source, last_picked_epoch, pick_count}`.
