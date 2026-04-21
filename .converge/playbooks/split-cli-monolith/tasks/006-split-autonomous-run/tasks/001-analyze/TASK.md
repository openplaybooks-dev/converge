---
id: 001-analyze
title: Analyze — PR5 — Move + split cli/autonomous-run.ts → orchestrator/autonomous/
checks:
  - id: plan-written
    description: Analysis plan exists
    cmd: "test -f D:/converge/.converge/artifacts/split-cli/006-split-autonomous-run/analyze/plan.md"
vars:
  taskId: 001-analyze
  parentId: 006-split-autonomous-run
  title: PR5 — Move + split cli/autonomous-run.ts → orchestrator/autonomous/
  tier: 2 — In-core reorg
  task: 1180-line autonomous-run moves into orchestrator/autonomous/ as 5 files + barrel. Root src/index.ts autonomousRun export path hard-breaks.
  spec: "Move `packages/core/src/cli/autonomous-run.ts` (1180 L) → `packages/core/src/orchestrator/autonomous/` and split into focused modules.\n\n**Target split:**\n\n| New file                                   | Lines | Contents                                                                                    |\n| ------------------------------------------ | ----- | ------------------------------------------------------------------------------------------- |\n| `orchestrator/autonomous/types.ts`         | ~80   | `AutonomousRunConfig`, `AutonomousRunResult`, `TreeSnap`                                    |\n| `orchestrator/autonomous/snap.ts`          | ~50   | `snapTree`                                                                                   |\n| `orchestrator/autonomous/recovery.ts`      | ~500  | `detectStuckTasks`, `recoverStuckTasks`, `resetAllTasks`, `recoverFailedTasks`, `collectCheckpointsRecursive` |\n| `orchestrator/autonomous/dirty-session.ts` | ~120  | `DIRTY_SESSION_STATUSES`, `formatAge`, `getLastSessionMetadata`, `guardDirtySession`         |\n| `orchestrator/autonomous/run-loop.ts`      | ~350  | `autonomousRun` main body                                                                    |\n| `orchestrator/autonomous/index.ts`         | barrel | re-export public API                                                                         |\n\n**Import sites to update (4) — HARD BREAK on public path:**\n- `packages/core/src/cli/commands-run.ts`\n- `packages/core/src/converge/converge-runner.ts`\n- `packages/core/src/evolve/evolve-runner.ts`\n- `packages/core/src/index.ts` — `autonomousRun` re-export path changes; no shim\n\n**ESLint rule (added this PR):**\n\n`no-restricted-imports` banning `../cli/*` from `tree/`, `orchestrator/`, `checkpoint/`, `journal/`. Prevents future regressions — non-CLI code cannot pull CLI-layer modules.\n\n**Acceptance:**\n- PR1 autonomous-run suites green\n- Every split file ≤500 lines\n- swebench + tbench tests green (proves public API via `@converge/core` intact)\n- Downstream of `import { autonomousRun } from '@converge/core'` still works (symbol name unchanged, re-export path updated)\n- `pnpm -r build` + `pnpm -r test` green\n- `madge --circular packages/core/src/orchestrator` — no cycles"
  projectDir: "D:/converge"
  artifactsDir: "D:/converge/.converge/artifacts/split-cli/006-split-autonomous-run"
  phaseTemplateDir: "D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item/tasks/analyze"
  wbsSection: 
---

# Analyze — PR5 — Move + split cli/autonomous-run.ts → orchestrator/autonomous/

Read the PR spec, inspect current code, and write a concrete implementation plan.

## Inputs

**PR summary:** 1180-line autonomous-run moves into orchestrator/autonomous/ as 5 files + barrel. Root src/index.ts autonomousRun export path hard-breaks.

**Full spec:**

Move `packages/core/src/cli/autonomous-run.ts` (1180 L) → `packages/core/src/orchestrator/autonomous/` and split into focused modules.

**Target split:**

| New file                                   | Lines | Contents                                                                                    |
| ------------------------------------------ | ----- | ------------------------------------------------------------------------------------------- |
| `orchestrator/autonomous/types.ts`         | ~80   | `AutonomousRunConfig`, `AutonomousRunResult`, `TreeSnap`                                    |
| `orchestrator/autonomous/snap.ts`          | ~50   | `snapTree`                                                                                   |
| `orchestrator/autonomous/recovery.ts`      | ~500  | `detectStuckTasks`, `recoverStuckTasks`, `resetAllTasks`, `recoverFailedTasks`, `collectCheckpointsRecursive` |
| `orchestrator/autonomous/dirty-session.ts` | ~120  | `DIRTY_SESSION_STATUSES`, `formatAge`, `getLastSessionMetadata`, `guardDirtySession`         |
| `orchestrator/autonomous/run-loop.ts`      | ~350  | `autonomousRun` main body                                                                    |
| `orchestrator/autonomous/index.ts`         | barrel | re-export public API                                                                         |

**Import sites to update (4) — HARD BREAK on public path:**
- `packages/core/src/cli/commands-run.ts`
- `packages/core/src/converge/converge-runner.ts`
- `packages/core/src/evolve/evolve-runner.ts`
- `packages/core/src/index.ts` — `autonomousRun` re-export path changes; no shim

**ESLint rule (added this PR):**

`no-restricted-imports` banning `../cli/*` from `tree/`, `orchestrator/`, `checkpoint/`, `journal/`. Prevents future regressions — non-CLI code cannot pull CLI-layer modules.

**Acceptance:**
- PR1 autonomous-run suites green
- Every split file ≤500 lines
- swebench + tbench tests green (proves public API via `@converge/core` intact)
- Downstream of `import { autonomousRun } from '@converge/core'` still works (symbol name unchanged, re-export path updated)
- `pnpm -r build` + `pnpm -r test` green
- `madge --circular packages/core/src/orchestrator` — no cycles

## Steps

1. **Read the spec** above carefully — it names exact file paths, line ranges, and acceptance criteria.
2. **Inspect current state:**
   - Read every file path named in the spec; note its current size, exports, imports.
   - Run `grep -rn "from.*<module>" packages/core/src` to enumerate real import sites — the spec's numbers are estimates, the grep is truth.
   - Check `git log --oneline -- <path>` for recent churn that might complicate the move.
3. **Identify risks:**
   - Cyclic imports introduced by the split
   - Public API paths that downstream packages (swebench, tbench) import from
   - Line-range drift since the spec was written — symbols may have moved
4. **Write the plan.**

## Output

Write `D:/converge/.converge/artifacts/split-cli/006-split-autonomous-run/analyze/plan.md`:

```markdown
# PR5 — Move + split cli/autonomous-run.ts → orchestrator/autonomous/ — Analysis

## Source audit
- <file>: <current lines>, <exports>, <consumers found via grep>

## Implementation plan
1. Step — what to do and why
2. Step — ...

## Risks & mitigations
- <risk>: <mitigation>

## Acceptance checklist (copy from spec)
- [ ] <criterion>
- [ ] <criterion>
```
