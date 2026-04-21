---
id: 001-plan
title: Plan implementation — PR11c — Re-wire engine exports + move autonomousRun out of core
checks:
  - id: impl-plan-written
    description: Implementation plan exists
    cmd: "test -f D:/converge/.converge/artifacts/split-cli/014-rewire-engine-exports/implement/plan.md"
vars:
  taskId: 001-plan
  title: PR11c — Re-wire engine exports + move autonomousRun out of core
  task: packages/engine/src/index.ts carries autonomousRun. packages/core/src/index.ts drops engine re-exports. HARD BREAK on public path.
  spec: "Finalize the engine extraction by setting up its public surface and breaking core's forwarders.\n\n**Build `packages/engine/src/index.ts`:**\n\nRe-export the public engine surface:\n- `autonomousRun`, `AutonomousRunConfig`, `AutonomousRunResult` (from `./orchestrator/autonomous`)\n- `ConvergenceOrchestrator`, `ProjectOrchestratorV2` (from `./orchestrator`)\n- `FunctionExecutor`, `BatchExecutor` (from `./executor`)\n- `DynamicPlanner`, `AdaptivePlanner` (from `./planning`)\n- `ResumabilityManager` (from `./resume`)\n- `TaskFileScanner`, `ReplanEngine` (from `./planning`)\n- `YieldsProcessor`, `YieldsSpawner` (from `./yields`)\n- `ConvergeSynthesizer`, `ConvergeExecutor`, `ConvergeRefiner`, `ConvergeCache` (from `./auto-verify`)\n- `SubtasksProcessor` (from `./subtasks`)\n- `MetaAnalyzer`, `MetaOptimizationSidecar` (from `./meta`)\n- Playbook loader, `generateEpicFromPlaybook` (from `./playbook`)\n- `Runtime`, `RuntimeImpl` (from `./runtime`)\n- Repair strategy registry (from `./repair/strategy-catalog`)\n- `Unit`, `UnitDefinition`, `taskDef()`, `v2AutonomousRun` (from `./unit`)\n\n**Slim `packages/core/src/index.ts` — HARD BREAK:**\n\nRemove from core's root re-exports:\n- `autonomousRun` (and its alias `v2AutonomousRun`)\n- Everything now living in `@converge/engine`\n\nConsumers update their imports:\n```ts\n// Before:\nimport { autonomousRun } from '@converge/core';\n// After:\nimport { autonomousRun } from '@converge/engine';\n```\n\nUpdate cli/ (still in core), swebench, tbench — they now depend on `@converge/engine`.\n\n**Remove core's bin entry:**\n\n`packages/core/package.json`:\n- Delete `\"bin\": { \"converge\": \"./dist/cli.js\" }` (cli still lives in core until PR13, but the bin moves to the CLI-package shape we're building toward)\n- Actually: **keep** the bin entry until PR13 flips, since the `converge` command still needs to work. Remove only in PR13.\n\nCorrection: in THIS PR, leave the bin entry. The engine extraction does not include cli yet.\n\n**Layering audit:**\n```bash\n# Core must NOT re-export engine symbols\ngrep -rn \"autonomousRun\\\\|ConvergenceOrchestrator\\\\|FunctionExecutor\" packages/core/src/index.ts && exit 1 || true\n\n# Core must NOT depend on engine (engine depends on core, not vice-versa)\ngrep -rn \"@converge/engine\" packages/core/src && exit 1 || true\n```\n\n**Acceptance:**\n- `@converge/engine`'s `autonomousRun` is the canonical import path\n- `@converge/core` no longer re-exports engine symbols\n- swebench + tbench rewritten to import from `@converge/engine` (with `@converge/core` only for types) — tests green\n- Layering audits clean\n- `pnpm -r build` + `pnpm -r test` green\n- Full smoke matrix on `converge` bin (cli still in core; all subcommands work)"
  projectDir: "D:/converge"
  artifactsDir: "D:/converge/.converge/artifacts/split-cli/014-rewire-engine-exports"
  subTemplateDir: "D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item/tasks/implement/tasks/plan"
  wbsSection: 
---

# Plan implementation — PR11c — Re-wire engine exports + move autonomousRun out of core

Read the analysis and produce a concrete, file-level implementation plan.

## Steps

1. Read `D:/converge/.converge/artifacts/split-cli/014-rewire-engine-exports/analyze/plan.md`.
2. Reconcile the analysis against current code state — the analysis may have been written minutes or hours ago, but files may have drifted. Re-check line ranges and grep counts if they're load-bearing.
3. Write the final implementation plan. Be specific: file paths, exact lines, what becomes what.

## Output

Write `D:/converge/.converge/artifacts/split-cli/014-rewire-engine-exports/implement/plan.md`:

```markdown
# PR11c — Re-wire engine exports + move autonomousRun out of core — Implementation Plan

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
