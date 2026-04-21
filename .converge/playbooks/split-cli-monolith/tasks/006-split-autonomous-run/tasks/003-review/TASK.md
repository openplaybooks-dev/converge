---
id: 003-review
title: Review — PR5 — Move + split cli/autonomous-run.ts → orchestrator/autonomous/
checks:
  - id: review-approved
    description: Code review passed
    cmd: "grep -q 'APPROVED' D:/converge/.converge/artifacts/split-cli/006-split-autonomous-run/review/report.md"
vars:
  taskId: 003-review
  parentId: 006-split-autonomous-run
  title: PR5 — Move + split cli/autonomous-run.ts → orchestrator/autonomous/
  tier: 2 — In-core reorg
  task: 1180-line autonomous-run moves into orchestrator/autonomous/ as 5 files + barrel. Root src/index.ts autonomousRun export path hard-breaks.
  spec: "Move `packages/core/src/cli/autonomous-run.ts` (1180 L) → `packages/core/src/orchestrator/autonomous/` and split into focused modules.\n\n**Target split:**\n\n| New file                                   | Lines | Contents                                                                                    |\n| ------------------------------------------ | ----- | ------------------------------------------------------------------------------------------- |\n| `orchestrator/autonomous/types.ts`         | ~80   | `AutonomousRunConfig`, `AutonomousRunResult`, `TreeSnap`                                    |\n| `orchestrator/autonomous/snap.ts`          | ~50   | `snapTree`                                                                                   |\n| `orchestrator/autonomous/recovery.ts`      | ~500  | `detectStuckTasks`, `recoverStuckTasks`, `resetAllTasks`, `recoverFailedTasks`, `collectCheckpointsRecursive` |\n| `orchestrator/autonomous/dirty-session.ts` | ~120  | `DIRTY_SESSION_STATUSES`, `formatAge`, `getLastSessionMetadata`, `guardDirtySession`         |\n| `orchestrator/autonomous/run-loop.ts`      | ~350  | `autonomousRun` main body                                                                    |\n| `orchestrator/autonomous/index.ts`         | barrel | re-export public API                                                                         |\n\n**Import sites to update (4) — HARD BREAK on public path:**\n- `packages/core/src/cli/commands-run.ts`\n- `packages/core/src/converge/converge-runner.ts`\n- `packages/core/src/evolve/evolve-runner.ts`\n- `packages/core/src/index.ts` — `autonomousRun` re-export path changes; no shim\n\n**ESLint rule (added this PR):**\n\n`no-restricted-imports` banning `../cli/*` from `tree/`, `orchestrator/`, `checkpoint/`, `journal/`. Prevents future regressions — non-CLI code cannot pull CLI-layer modules.\n\n**Acceptance:**\n- PR1 autonomous-run suites green\n- Every split file ≤500 lines\n- swebench + tbench tests green (proves public API via `@converge/core` intact)\n- Downstream of `import { autonomousRun } from '@converge/core'` still works (symbol name unchanged, re-export path updated)\n- `pnpm -r build` + `pnpm -r test` green\n- `madge --circular packages/core/src/orchestrator` — no cycles"
  projectDir: "D:/converge"
  artifactsDir: "D:/converge/.converge/artifacts/split-cli/006-split-autonomous-run"
  phaseTemplateDir: "D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item/tasks/review"
  wbsSection: 
---

# Code review — PR5 — Move + split cli/autonomous-run.ts → orchestrator/autonomous/

Review the diff against the PR spec and acceptance criteria.

## Inputs

- **PR summary:** 1180-line autonomous-run moves into orchestrator/autonomous/ as 5 files + barrel. Root src/index.ts autonomousRun export path hard-breaks.
- **Full spec:**

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

- Analysis: `D:/converge/.converge/artifacts/split-cli/006-split-autonomous-run/analyze/plan.md`
- Implementation plan: `D:/converge/.converge/artifacts/split-cli/006-split-autonomous-run/implement/plan.md`

## Review criteria

1. **Alignment** — does the diff match the spec? Files named in the spec should be the only files changed (plus strictly required import updates). If scope drifted, **REJECT**.
2. **Acceptance criteria** — every bullet in the spec's Acceptance block must be satisfied. If not, REJECT.
3. **Behavior-locking tests (PR1)** — still green? If a move/split broke them, the split is wrong, REJECT.
4. **No shims** — the user explicitly chose hard breaks for public exports (PR4, PR13). If a re-export shim was added "for safety", REJECT.
5. **Line limits** — for split PRs (3, 5, 6, 9), every new file ≤500 lines. If any file is larger, REJECT.
6. **Layering (CRITICAL for Tier B, PR10–PR13)** — `@converge/core` is the programmatic interface; `@converge/cli` is the terminal-facing shell; a future web UI must be able to integrate directly with `core` without touching `cli` or `display`. Run these audits and **REJECT** on any hit:
   - `grep -rn "@converge/display\|@converge/cli" packages/core/src` → no matches (core never imports CLI-layer packages)
   - `grep -n "@converge/display\|@converge/cli" packages/core/package.json` → no matches
   - `grep -rn "process\.exit\|process\.stdout\.write\|process\.stderr\.write" packages/core/src` → no matches
   - `grep -rn "console\.\(log\|error\|warn\|info\)" packages/core/src | grep -v ".test.ts"` → no matches
   - `grep -rn "@converge/display" packages/scheduler/src packages/journal/src 2>/dev/null` → no matches
7. **Style** — matches existing codebase conventions.

## Steps

1. `git diff --stat` — confirm only spec-scoped files changed.
2. `git diff` — read the full diff.
3. Re-run `pnpm test` to confirm green.
4. Compare diff against each Acceptance bullet.

## Output

Write `D:/converge/.converge/artifacts/split-cli/006-split-autonomous-run/review/report.md`:
- If acceptable: `APPROVED` on its own line, followed by brief notes.
- If not: `REJECTED` on its own line, followed by specific, actionable feedback so the implement phase knows what to fix.
