---
id: 001-execute
title: "Execute: packages/engine/src/index.ts carries autonomousRun. packages/core/src/index.ts drops engine re-exports. HARD BREAK on public path."
---

Implement the PR.

**Summary:** packages/engine/src/index.ts carries autonomousRun. packages/core/src/index.ts drops engine re-exports. HARD BREAK on public path.

**Spec:**
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

**Analysis:** `D:/converge/.converge/artifacts/split-cli/014-rewire-engine-exports/analyze/plan.md`
