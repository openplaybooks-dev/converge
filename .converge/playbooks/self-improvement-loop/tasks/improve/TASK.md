---
id: improve
title: Analyze and improve converge framework
materialization: incremental
seeds:
  - type: seed
    name: epoch
---

# Converge

After each epoch completes, read the shared journal and assess the trajectory.

## Shared journal

Read `{{projectDir}}/.converge/artifacts/self-improvement-loop/journal.md`. This is the cross-epoch record of every fix applied, its result, scores, and files changed.

## Trajectory assessment

1. Count completed epochs from the journal (count `## Epoch` headings)
2. Extract scores per dimension across epochs — which dimensions are improving? stagnating?
3. Track type error counts — trending toward zero?

## Refactor signal detection

Scan the journal for these patterns that suggest a larger refactor is warranted:

| Signal | Threshold | What it means |
|--------|-----------|---------------|
| Same dimension scored ≤ 2 for 3+ consecutive epochs | Surface-level fixes aren't working → structural change needed |
| Same file modified in 3+ epochs | File accumulating patches → may need redesign |
| Same fix category repeated | Root cause not addressed |
| Type errors not trending down after 5+ epochs | Typing architecture change may be needed |

If 2+ signals fire, recommend: **"Consider a larger refactor"** with the specific area and rationale.

## Convergence summary

Write to `{{projectDir}}/.converge/artifacts/self-improvement-loop/convergence.md` with trajectory, refactor signals, and recommendation.
