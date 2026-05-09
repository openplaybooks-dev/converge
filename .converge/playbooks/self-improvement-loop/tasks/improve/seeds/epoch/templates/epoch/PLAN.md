# PLAN — Epoch {{taskId}} (epoch template)

## Goal
Within one iteration: pick the single most impactful quality improvement, apply it, verify it, and record the result. The epoch produces a measured pass/fail verdict with supporting artifacts.

## Decision
CONTAINER. Three static children, ordered sequentially. The verify stage gates implement via `on-fail.reset`.

## Pattern
**Process Pipeline** (within the Epoch Loop). Each stage produces a distinct artifact:

```
001-analyze ──→ 002-implement ──→ 003-verify
                     ↑               │
                     └───────────────┘
                   (on-fail reset)
```

1. **analyze** → `analyze/report.md` (decision: what to fix)
2. **implement** → code changes (execution: apply the fix)
3. **verify** → `verify/result.md` (gate: typecheck + tests; on fail → reset implement)

## Children

| id | kind | objective | gating output |
|----|------|-----------|---------------|
| 001-analyze | leaf | Score 6 quality dimensions, pick the single best improvement | analyze/report.md |
| 002-implement | leaf | Read analysis, apply the fix | code changes |
| 003-verify | leaf | Typecheck + test gate, record result | verify/result.md |

## Sequencing
Linear chain. Each stage gates the next:
- analyze → implement (implement reads analyze/report.md)
- implement → verify (verify checks the code change)
- verify → implement (on-fail reset creates the while loop)

## Critical files
- Seed: `seeds/epoch-seed.seed.js`
- Artifacts per epoch: `{{artifactsDir}}/`
