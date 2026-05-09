# PLAN — self-improvement-loop (root)

## Goal
Continuously improve the converge framework by running iterative epochs, each picking and fixing the single most impactful issue. Quality dimensions: API consistency, DX, architecture, documentation, code clarity, reliability.

## Decision
CONTAINER. Dynamically spawns one epoch per loop cycle via seed. The loop runner handles iteration bounds (maxIterations: 50, maxDuration: 4h, stall detection). The root converge step reads epoch outputs and assesses trajectory.

## Pattern
**Epoch Loop.** Each epoch runs a 3-stage pipeline from a fixed template:

```
analyze → implement → verify
              ↑          │
              └──────────┘
            (on-fail reset)
```

The while loop: verify has `on-fail.reset: ["002-implement"]`. If typecheck or tests fail, implement re-runs with the failure output as feedback.

## Children
[Dynamic — spawned by seed at runtime.]

| Child | Kind | Produces |
|-------|------|----------|
| epoch-NNN | Container (3-stage pipeline) | analyze/report.md, code changes, verify/result.md |

## How it works
1. Loop runner calls converge, which discovers TASK.md at root — a seed parent
2. `seeds/epoch.seed.js` scans `tasks/` for existing epoch-NNN dirs, spawns the next one from `seeds/epoch/templates/epoch/`
3. The spawned epoch fans out into 3 stages via `seeds/epoch-seed.seed.js`
4. verify appends to the shared journal (`journal.md`) — scores, result, files changed
5. After all 3 stages complete, the epoch converge step cross-validates outputs and confirms the journal entry
6. The root converge step reads the full journal, detects refactor signals, and writes a convergence recommendation
7. Loop runner checks stop conditions; if not stopping, repeats from step 2

## Convergence criteria
- Score trajectory from journal: if the targeted dimension score hasn't improved for 3+ consecutive epochs, note a plateau
- Refactor signals from journal: same file patched 3+ times, same dimension ≤ 2 for 3+ epochs, fix category repeats, type errors stagnant — 2+ signals → recommend larger refactor
- Type errors at zero for 2+ consecutive epochs → dimension converged
- Loop runner's stall detection provides hard stop (maxConsecutive: 3, backoffMs: 60000)

## Key design decisions
- **3 stages, not 5**: review + quality + changelog collapsed into verify. Simpler, fewer moving parts.
- **verify→implement reset replaces LLM review**: mechanical gate (typecheck + tests) instead of subjective approval
- **Implement is a leaf**: no plan/todos sub-breakdown. One focused fix per epoch. If a fix is too large, analyze should have picked a smaller issue.
- **Shared journal (journal.md)**: cross-epoch markdown log at `.converge/artifacts/self-improvement-loop/journal.md`. Each epoch's verify stage appends a section with scores, target, result, and files changed. Analyze reads it for history. Root convergence scans it to detect refactor signals.
- **Refactor signal detection**: the root convergence step scans the journal for patterns (same dimension low 3+ times, same file patched 3+ times, fix category repeats, type errors not trending down). When 2+ signals fire, it recommends a larger refactor — giving the next epoch evidence to take on a bigger change.

## Pointers
- Seed: `seeds/epoch.seed.js`
- Epoch template: `seeds/epoch/templates/epoch/`
- Epoch seed: `seeds/epoch/templates/epoch/seeds/epoch-seed.seed.js`
- Artifacts: `.converge/artifacts/self-improvement-loop/epochs/{NNN}/`
- Shared journal: `.converge/artifacts/self-improvement-loop/journal.md`
