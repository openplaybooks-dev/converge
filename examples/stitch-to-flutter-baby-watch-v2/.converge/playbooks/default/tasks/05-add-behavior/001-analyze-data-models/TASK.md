---
id: 001-analyze-data-models
title: Reconcile data models
description: Reconcile phase 01's data-entities.md with actual usage in the generated Flutter widgets. Produces a final data-models.md that phase 05 steps 002-004 implement.
skill: extract-data-models-from-flutter
blocking: true
tags:
  - analysis
  - data-modeling
inputs:
  - .stitch/data-entities.md
  - lib/screens/**/*.dart
  - lib/widgets/**/*.dart
  - .stitch/UX.md
  - .stitch/references/ANALYSIS.md
outputs:
  - data-models.md
checks:
  - id: data-models-exists
    cmd: test -f data-models.md
    description: data-models.md exists
  - id: data-models-cites-entities
    cmd: grep -qE "\.stitch/data-entities\.md" data-models.md
    description: data-models.md cites .stitch/data-entities.md as its starting point
---

# Reconcile data models

Phase 01 produced `.stitch/data-entities.md` from references. Phase 03 generated screens that actually render data. This task **reconciles** the two sources and emits `data-models.md` — the final blueprint for `lib/models/`, `lib/providers/`, and mock data.

## Inputs

- `.stitch/data-entities.md` — entities observed in references (phase 01 output)
- `lib/screens/**/*.dart` and `lib/widgets/**/*.dart` — actual widget code referring to data
- `.stitch/UX.md` — flows that constrain provider shapes
- `.stitch/references/ANALYSIS.md` — component inventory

## Reconciliation rules

For each entity in `.stitch/data-entities.md`:

1. Look for the widget-side shape — what fields does the generated Dart code actually read / display?
2. Fields present in BOTH: include in final model.
3. Fields present only in `.stitch/data-entities.md`: include, marked as "reserved (not yet rendered)".
4. Fields present only in widgets: include, marked as "added during screen generation — likely derived/computed".
5. Fields that conflict in type: prefer the widget-side type (it's what the code needs).

For each entity found only in widgets (phase 03 invented it): add a new section and flag it `**Source: widget-only**` so it's visible on review.

## Output: `data-models.md`

Follow the `extract-data-models-from-flutter` skill structure, but add a `## Reconciliation Notes` section at the top listing any discrepancies resolved. First line of the file must cite the starting point: `Reconciled from \`.stitch/data-entities.md\` and \`lib/screens/\`.`.

For each entity:
```markdown
## Beacon

**Source:** reference + widgets (reconciled)
**Rendered in:** `HomeSafeScreen`, `HomeAlertScreen`, `BeaconDetailScreen`

### Fields
| Field | Type | Source | Notes |
|-------|------|--------|-------|
| id | String | both | — |
| name | String | both | — |
| battery | int | both | — |
| signalStrength | SignalStrength enum | both | enum values: safe, weak, lost |
| rssi | int? | references only | not rendered yet; keep for provider layer |
| distanceMeters | double? | widgets only | computed from rssi at provider |

### Relationships
- `Beacon 1—* AlertEvent`
- `Beacon *—1 Guardian?`

### Mock data hints
2–4 beacons across safe/weak/alert states; one with low battery.
```

End with a `## Provider Plan` section: for each entity, declare a provider type (e.g. `StateNotifierProvider<BeaconsNotifier, AsyncValue<List<Beacon>>>`) and whether it reads from mock data or a service.

## Success Criteria

- `data-models.md` exists
- Cites `.stitch/data-entities.md` on first line
- Every entity has fields, relationships, mock data hints
- Provider Plan section exists
