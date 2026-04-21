---
id: 004-quality
title: Quality gate — PR11c — Re-wire engine exports + move autonomousRun out of core
checks:
  - id: typecheck
    description: Zero type errors
    cmd: "cd D:/converge && pnpm typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq"
  - id: tests
    description: Tests pass
    cmd: "cd D:/converge && pnpm test 2>&1 | tail -1"
  - id: cli-smoke
    description: converge --help runs (tolerates pre/post-PR13 bin location)
    cmd: "cd D:/converge && node packages/core/dist/cli/main.js --help >/dev/null 2>&1 || node packages/cli/dist/main.js --help >/dev/null 2>&1"
vars:
  taskId: 004-quality
  parentId: 014-rewire-engine-exports
  title: PR11c — Re-wire engine exports + move autonomousRun out of core
  tier: 4 — Engine middle layer
  task: packages/engine/src/index.ts carries autonomousRun. packages/core/src/index.ts drops engine re-exports. HARD BREAK on public path.
  spec: "Finalize the engine extraction by setting up its public surface and breaking core's forwarders.\n\n**Build `packages/engine/src/index.ts`:**\n\nRe-export the public engine surface:\n- `autonomousRun`, `AutonomousRunConfig`, `AutonomousRunResult` (from `./orchestrator/autonomous`)\n- `ConvergenceOrchestrator`, `ProjectOrchestratorV2` (from `./orchestrator`)\n- `FunctionExecutor`, `BatchExecutor` (from `./executor`)\n- `DynamicPlanner`, `AdaptivePlanner` (from `./planning`)\n- `ResumabilityManager` (from `./resume`)\n- `TaskFileScanner`, `ReplanEngine` (from `./planning`)\n- `YieldsProcessor`, `YieldsSpawner` (from `./yields`)\n- `ConvergeSynthesizer`, `ConvergeExecutor`, `ConvergeRefiner`, `ConvergeCache` (from `./auto-verify`)\n- `SubtasksProcessor` (from `./subtasks`)\n- `MetaAnalyzer`, `MetaOptimizationSidecar` (from `./meta`)\n- Playbook loader, `generateEpicFromPlaybook` (from `./playbook`)\n- `Runtime`, `RuntimeImpl` (from `./runtime`)\n- Repair strategy registry (from `./repair/strategy-catalog`)\n- `Unit`, `UnitDefinition`, `taskDef()`, `v2AutonomousRun` (from `./unit`)\n\n**Slim `packages/core/src/index.ts` — HARD BREAK:**\n\nRemove from core's root re-exports:\n- `autonomousRun` (and its alias `v2AutonomousRun`)\n- Everything now living in `@converge/engine`\n\nConsumers update their imports:\n```ts\n// Before:\nimport { autonomousRun } from '@converge/core';\n// After:\nimport { autonomousRun } from '@converge/engine';\n```\n\nUpdate cli/ (still in core), swebench, tbench — they now depend on `@converge/engine`.\n\n**Remove core's bin entry:**\n\n`packages/core/package.json`:\n- Delete `\"bin\": { \"converge\": \"./dist/cli.js\" }` (cli still lives in core until PR13, but the bin moves to the CLI-package shape we're building toward)\n- Actually: **keep** the bin entry until PR13 flips, since the `converge` command still needs to work. Remove only in PR13.\n\nCorrection: in THIS PR, leave the bin entry. The engine extraction does not include cli yet.\n\n**Layering audit:**\n```bash\n# Core must NOT re-export engine symbols\ngrep -rn \"autonomousRun\\\\|ConvergenceOrchestrator\\\\|FunctionExecutor\" packages/core/src/index.ts && exit 1 || true\n\n# Core must NOT depend on engine (engine depends on core, not vice-versa)\ngrep -rn \"@converge/engine\" packages/core/src && exit 1 || true\n```\n\n**Acceptance:**\n- `@converge/engine`'s `autonomousRun` is the canonical import path\n- `@converge/core` no longer re-exports engine symbols\n- swebench + tbench rewritten to import from `@converge/engine` (with `@converge/core` only for types) — tests green\n- Layering audits clean\n- `pnpm -r build` + `pnpm -r test` green\n- Full smoke matrix on `converge` bin (cli still in core; all subcommands work)"
  projectDir: "D:/converge"
  artifactsDir: "D:/converge/.converge/artifacts/split-cli/014-rewire-engine-exports"
  phaseTemplateDir: "D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item/tasks/quality"
  wbsSection: 
---

# Quality gate — PR11c — Re-wire engine exports + move autonomousRun out of core

Final verification after code review approval. Hard gate — if anything fails here, fix it in-place before this PR is considered done.

## Steps

1. `cd D:/converge && pnpm typecheck` — must be zero errors.
2. `cd D:/converge && pnpm test` — all tests must pass.
3. `converge --help` must run (from whichever bin location applies at this point in the sequence).
4. For Tier B PRs (10–13): also run `pnpm -r build && pnpm -r test` to confirm every workspace package is healthy.
5. If anything fails, fix it here — don't defer.
