---
id: 003-review
title: Review — PR11c — Re-wire engine exports + move autonomousRun out of core
checks:
  - id: review-approved
    description: Code review passed
    cmd: "grep -q 'APPROVED' D:/converge/.converge/artifacts/split-cli/014-rewire-engine-exports/review/report.md"
vars:
  taskId: 003-review
  parentId: 014-rewire-engine-exports
  title: PR11c — Re-wire engine exports + move autonomousRun out of core
  tier: 4 — Engine middle layer
  task: packages/engine/src/index.ts carries autonomousRun. packages/core/src/index.ts drops engine re-exports. HARD BREAK on public path.
  spec: "Finalize the engine extraction by setting up its public surface and breaking core's forwarders.\n\n**Build `packages/engine/src/index.ts`:**\n\nRe-export the public engine surface:\n- `autonomousRun`, `AutonomousRunConfig`, `AutonomousRunResult` (from `./orchestrator/autonomous`)\n- `ConvergenceOrchestrator`, `ProjectOrchestratorV2` (from `./orchestrator`)\n- `FunctionExecutor`, `BatchExecutor` (from `./executor`)\n- `DynamicPlanner`, `AdaptivePlanner` (from `./planning`)\n- `ResumabilityManager` (from `./resume`)\n- `TaskFileScanner`, `ReplanEngine` (from `./planning`)\n- `YieldsProcessor`, `YieldsSpawner` (from `./yields`)\n- `ConvergeSynthesizer`, `ConvergeExecutor`, `ConvergeRefiner`, `ConvergeCache` (from `./auto-verify`)\n- `SubtasksProcessor` (from `./subtasks`)\n- `MetaAnalyzer`, `MetaOptimizationSidecar` (from `./meta`)\n- Playbook loader, `generateEpicFromPlaybook` (from `./playbook`)\n- `Runtime`, `RuntimeImpl` (from `./runtime`)\n- Repair strategy registry (from `./repair/strategy-catalog`)\n- `Unit`, `UnitDefinition`, `taskDef()`, `v2AutonomousRun` (from `./unit`)\n\n**Slim `packages/core/src/index.ts` — HARD BREAK:**\n\nRemove from core's root re-exports:\n- `autonomousRun` (and its alias `v2AutonomousRun`)\n- Everything now living in `@converge/engine`\n\nConsumers update their imports:\n```ts\n// Before:\nimport { autonomousRun } from '@converge/core';\n// After:\nimport { autonomousRun } from '@converge/engine';\n```\n\nUpdate cli/ (still in core), swebench, tbench — they now depend on `@converge/engine`.\n\n**Remove core's bin entry:**\n\n`packages/core/package.json`:\n- Delete `\"bin\": { \"converge\": \"./dist/cli.js\" }` (cli still lives in core until PR13, but the bin moves to the CLI-package shape we're building toward)\n- Actually: **keep** the bin entry until PR13 flips, since the `converge` command still needs to work. Remove only in PR13.\n\nCorrection: in THIS PR, leave the bin entry. The engine extraction does not include cli yet.\n\n**Layering audit:**\n```bash\n# Core must NOT re-export engine symbols\ngrep -rn \"autonomousRun\\\\|ConvergenceOrchestrator\\\\|FunctionExecutor\" packages/core/src/index.ts && exit 1 || true\n\n# Core must NOT depend on engine (engine depends on core, not vice-versa)\ngrep -rn \"@converge/engine\" packages/core/src && exit 1 || true\n```\n\n**Acceptance:**\n- `@converge/engine`'s `autonomousRun` is the canonical import path\n- `@converge/core` no longer re-exports engine symbols\n- swebench + tbench rewritten to import from `@converge/engine` (with `@converge/core` only for types) — tests green\n- Layering audits clean\n- `pnpm -r build` + `pnpm -r test` green\n- Full smoke matrix on `converge` bin (cli still in core; all subcommands work)"
  projectDir: "D:/converge"
  artifactsDir: "D:/converge/.converge/artifacts/split-cli/014-rewire-engine-exports"
  phaseTemplateDir: "D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item/tasks/review"
  wbsSection: 
---

# Code review — PR11c — Re-wire engine exports + move autonomousRun out of core

Review the diff against the PR spec and acceptance criteria.

## Inputs

- **PR summary:** packages/engine/src/index.ts carries autonomousRun. packages/core/src/index.ts drops engine re-exports. HARD BREAK on public path.
- **Full spec:**

Finalize the engine extraction by setting up its public surface and breaking core's forwarders.

**Build `packages/engine/src/index.ts`:**

Re-export the public engine surface:
- `autonomousRun`, `AutonomousRunConfig`, `AutonomousRunResult` (from `./orchestrator/autonomous`)
- `ConvergenceOrchestrator`, `ProjectOrchestratorV2` (from `./orchestrator`)
- `FunctionExecutor`, `BatchExecutor` (from `./executor`)
- `DynamicPlanner`, `AdaptivePlanner` (from `./planning`)
- `ResumabilityManager` (from `./resume`)
- `TaskFileScanner`, `ReplanEngine` (from `./planning`)
- `YieldsProcessor`, `YieldsSpawner` (from `./yields`)
- `ConvergeSynthesizer`, `ConvergeExecutor`, `ConvergeRefiner`, `ConvergeCache` (from `./auto-verify`)
- `SubtasksProcessor` (from `./subtasks`)
- `MetaAnalyzer`, `MetaOptimizationSidecar` (from `./meta`)
- Playbook loader, `generateEpicFromPlaybook` (from `./playbook`)
- `Runtime`, `RuntimeImpl` (from `./runtime`)
- Repair strategy registry (from `./repair/strategy-catalog`)
- `Unit`, `UnitDefinition`, `taskDef()`, `v2AutonomousRun` (from `./unit`)

**Slim `packages/core/src/index.ts` — HARD BREAK:**

Remove from core's root re-exports:
- `autonomousRun` (and its alias `v2AutonomousRun`)
- Everything now living in `@converge/engine`

Consumers update their imports:
```ts
// Before:
import { autonomousRun } from '@converge/core';
// After:
import { autonomousRun } from '@converge/engine';
```

Update cli/ (still in core), swebench, tbench — they now depend on `@converge/engine`.

**Remove core's bin entry:**

`packages/core/package.json`:
- Delete `"bin": { "converge": "./dist/cli.js" }` (cli still lives in core until PR13, but the bin moves to the CLI-package shape we're building toward)
- Actually: **keep** the bin entry until PR13 flips, since the `converge` command still needs to work. Remove only in PR13.

Correction: in THIS PR, leave the bin entry. The engine extraction does not include cli yet.

**Layering audit:**
```bash
# Core must NOT re-export engine symbols
grep -rn "autonomousRun\\|ConvergenceOrchestrator\\|FunctionExecutor" packages/core/src/index.ts && exit 1 || true

# Core must NOT depend on engine (engine depends on core, not vice-versa)
grep -rn "@converge/engine" packages/core/src && exit 1 || true
```

**Acceptance:**
- `@converge/engine`'s `autonomousRun` is the canonical import path
- `@converge/core` no longer re-exports engine symbols
- swebench + tbench rewritten to import from `@converge/engine` (with `@converge/core` only for types) — tests green
- Layering audits clean
- `pnpm -r build` + `pnpm -r test` green
- Full smoke matrix on `converge` bin (cli still in core; all subcommands work)

- Analysis: `D:/converge/.converge/artifacts/split-cli/014-rewire-engine-exports/analyze/plan.md`
- Implementation plan: `D:/converge/.converge/artifacts/split-cli/014-rewire-engine-exports/implement/plan.md`

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

Write `D:/converge/.converge/artifacts/split-cli/014-rewire-engine-exports/review/report.md`:
- If acceptable: `APPROVED` on its own line, followed by brief notes.
- If not: `REJECTED` on its own line, followed by specific, actionable feedback so the implement phase knows what to fix.
