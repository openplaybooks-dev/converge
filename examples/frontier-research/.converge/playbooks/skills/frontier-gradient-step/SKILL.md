---
id: frontier-gradient-step
title: Gradient Step
---

# Gradient Step

Update the accumulated knowledge model and decide whether to continue or converge.

## Convergence Rule

```
if (currentDelta < threshold AND priorDelta < threshold):
    decision = "CONVERGED"    # 2 consecutive low-delta epochs
else:
    decision = "CONTINUE"
```

The threshold is the `convergenceThreshold` input (default: 0.15).

Two consecutive low-delta epochs are required to avoid premature convergence on a single unproductive epoch.

## Process

1. Read selection results (insight delta, merged knowledge)
2. Read prior `research-state.json` and `research-ledger.jsonl`
3. Update knowledge model:
   - Add new claims with source epoch and beam
   - Add new connections between claims
   - Add new dead ends
   - Update convergence history
4. Evaluate convergence:
   - Get current insight delta from selection
   - Get prior insight delta from ledger
   - Count consecutive low-delta epochs
   - Apply convergence rule
5. Append metrics to ledger
6. If CONTINUE, provide guidance for next epoch (which frontier areas need attention)
7. If CONVERGED, summarize the final knowledge state

## Outputs

- `gradient-step.json` — convergence decision with rationale
- Updated `research-state.json` — accumulated knowledge model
- Appended line to `research-ledger.jsonl` — epoch metrics

## Quality Criteria

- Convergence rule is applied strictly (not subjective judgment)
- Knowledge model is cumulative (prior claims preserved, not overwritten)
- Ledger is append-only (prior lines not modified)
- Next-epoch guidance is specific and actionable (for CONTINUE decisions)
- Final summary captures the full research journey (for CONVERGED decisions)
