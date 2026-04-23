---
id: 10-refactor-remaining-systems
title: Refactor orchestrator, converge, metrics, yields, hooks, and other systems
blocking: true
dependencies: [09-refactor-cli]
---

Clean remaining epic references across all other subsystems.

**Orchestrator — `packages/core/src/orchestrator/convergence.ts`:**
- Rename `runEpicConvergence()` → `runPlaybookConvergence()`
- Change parameter from `EpicContext` → `PlaybookContext`
- Remove `this.statusManager.transitionEpic()` calls — replace with playbook-level equivalents
- Remove all `ctx.epicId` references — use `ctx.playbookId`
- The epic-level convergence loop becomes the playbook-level loop (single playbook, no iteration)

**`packages/core/src/orchestrator/project-orchestrator.ts`:**
- Remove epic orchestration loop — playbook is now single, not iterated
- Remove `epicId` from all method signatures
- Update `runProjectConvergence()` to use `PlaybookContext`

**Converge:**
- `packages/core/src/converge/goal-planner.ts` — remove epic grouping, use playbook grouping
- `packages/core/src/converge/converge-runner.ts`

**Metrics/Yields/Hooks:**
- `packages/core/src/metrics/extract.ts` — remove epic metrics, use playbook metrics
- `packages/core/src/yields/spawner.ts` — remove `config.epicId`, use playbook context
- `packages/core/src/hooks/types.ts` — remove `epicId` from hook payloads (done in task 01)

**Facts:**
- `packages/core/src/facts/api.ts` — `FactsLogger` constructor: change `epicId` parameter to `playbookId`

**Config/Functions/Discovery:**
- `packages/core/src/config/types.ts` — remove epic references
- `packages/core/src/functions/builders.ts` — remove `epic()` builder, replace with `playbook()` builder
- `packages/core/src/discovery/scanner.ts` — remove epic discovery

**Playbook/Gap/Client/Agent/Meta/Sidecar/Plugins:**
- `packages/core/src/playbook/executor.ts`, `types.ts`, `loader.ts`
- `packages/core/src/gap/detector.ts`, `types.ts`, `utils.ts`
- `packages/core/src/client/types.ts`, `converge-client.ts`
- `packages/core/src/agent-manager/agent-manager.ts`
- `packages/core/src/meta/analyzer.ts`, `sidecar.ts`
- `packages/core/src/sidecar/types.ts`, `runner.ts`
- `packages/core/src/plugins/types.ts`

For each file: replace `epicId` with `playbookId` where context is needed, or remove entirely where it was just epic grouping.
