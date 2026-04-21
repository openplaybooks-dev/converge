---
id: 001-plan
title: Plan implementation — PR5 — Move + split cli/autonomous-run.ts → orchestrator/autonomous/
checks:
  - id: impl-plan-written
    description: Implementation plan exists
    cmd: "test -f D:/converge/.converge/artifacts/split-cli/006-split-autonomous-run/implement/plan.md"
vars:
  taskId: 001-plan
  title: PR5 — Move + split cli/autonomous-run.ts → orchestrator/autonomous/
  task: 1180-line autonomous-run moves into orchestrator/autonomous/ as 5 files + barrel. Root src/index.ts autonomousRun export path hard-breaks.
  spec: "Move `packages/core/src/cli/autonomous-run.ts` (1180 L) → `packages/core/src/orchestrator/autonomous/` and split into focused modules.\n\n**Target split:**\n\n| New file                                   | Lines | Contents                                                                                    |\n| ------------------------------------------ | ----- | ------------------------------------------------------------------------------------------- |\n| `orchestrator/autonomous/types.ts`         | ~80   | `AutonomousRunConfig`, `AutonomousRunResult`, `TreeSnap`                                    |\n| `orchestrator/autonomous/snap.ts`          | ~50   | `snapTree`                                                                                   |\n| `orchestrator/autonomous/recovery.ts`      | ~500  | `detectStuckTasks`, `recoverStuckTasks`, `resetAllTasks`, `recoverFailedTasks`, `collectCheckpointsRecursive` |\n| `orchestrator/autonomous/dirty-session.ts` | ~120  | `DIRTY_SESSION_STATUSES`, `formatAge`, `getLastSessionMetadata`, `guardDirtySession`         |\n| `orchestrator/autonomous/run-loop.ts`      | ~350  | `autonomousRun` main body                                                                    |\n| `orchestrator/autonomous/index.ts`         | barrel | re-export public API                                                                         |\n\n**Import sites to update (4) — HARD BREAK on public path:**\n- `packages/core/src/cli/commands-run.ts`\n- `packages/core/src/converge/converge-runner.ts`\n- `packages/core/src/evolve/evolve-runner.ts`\n- `packages/core/src/index.ts` — `autonomousRun` re-export path changes; no shim\n\n**ESLint rule (added this PR):**\n\n`no-restricted-imports` banning `../cli/*` from `tree/`, `orchestrator/`, `checkpoint/`, `journal/`. Prevents future regressions — non-CLI code cannot pull CLI-layer modules.\n\n**Acceptance:**\n- PR1 autonomous-run suites green\n- Every split file ≤500 lines\n- swebench + tbench tests green (proves public API via `@converge/core` intact)\n- Downstream of `import { autonomousRun } from '@converge/core'` still works (symbol name unchanged, re-export path updated)\n- `pnpm -r build` + `pnpm -r test` green\n- `madge --circular packages/core/src/orchestrator` — no cycles"
  projectDir: "D:/converge"
  artifactsDir: "D:/converge/.converge/artifacts/split-cli/006-split-autonomous-run"
  subTemplateDir: "D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item/tasks/implement/tasks/plan"
  wbsSection: 
---

# Plan implementation — PR5 — Move + split cli/autonomous-run.ts → orchestrator/autonomous/

Read the analysis and produce a concrete, file-level implementation plan.

## Steps

1. Read `D:/converge/.converge/artifacts/split-cli/006-split-autonomous-run/analyze/plan.md`.
2. Reconcile the analysis against current code state — the analysis may have been written minutes or hours ago, but files may have drifted. Re-check line ranges and grep counts if they're load-bearing.
3. Write the final implementation plan. Be specific: file paths, exact lines, what becomes what.

## Output

Write `D:/converge/.converge/artifacts/split-cli/006-split-autonomous-run/implement/plan.md`:

```markdown
# PR5 — Move + split cli/autonomous-run.ts → orchestrator/autonomous/ — Implementation Plan

## Summary
<one line>

## Changes (ordered)
1. File: `packages/core/src/...` — <create | move | edit | delete>; what
2. File: `packages/core/src/...` — ...

## Order of Operations
1. Do X first because Y depends on it
2. Then Z

## Post-change verification commands
- `pnpm --filter @converge/core build`
- `pnpm --filter @converge/core test`
- <any smoke checks specific to this PR>
```
