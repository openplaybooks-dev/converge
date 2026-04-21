# Task: 10-refactor-remaining-systems

Clean remaining epic references across all other subsystems.

**Orchestrator:**
- `packages/core/src/orchestrator/project-orchestrator.ts` (~50 occurrences) — remove epic orchestration
- `packages/core/src/orchestrator/convergence.ts` (~29 occurrences)

**Converge:**
- `packages/core/src/converge/goal-planner.ts` (~21 occurrences)
- `packages/core/src/converge/converge-runner.ts` (~3 occurrences)

**Metrics/Yields/Hooks:**
- `packages/core/src/metrics/extract.ts` (~30 occurrences)
- `packages/core/src/yields/spawner.ts` (~19 occurrences)
- `packages/core/src/hooks/types.ts` (~21 occurrences) — remove epicId from hook payloads
- `packages/core/src/resume/resumability.ts` (~17 occurrences)

**Config/Functions/Discovery:**
- `packages/core/src/config/task-definition.ts` (~13 occurrences)
- `packages/core/src/config/types.ts` (~5 occurrences)
- `packages/core/src/functions/builders.ts` (~35 occurrences) — remove epic() builder
- `packages/core/src/discovery/scanner.ts` (~4 occurrences) — remove epic discovery

**Playbook/Gap/Client/Agent/Meta/Sidecar/Plugins:**
- `packages/core/src/playbook/executor.ts`, `types.ts`, `loader.ts`
- `packages/core/src/gap/detector.ts`, `types.ts`, `utils.ts`
- `packages/core/src/client/types.ts`, `converge-client.ts`
- `packages/core/src/agent-manager/agent-manager.ts`
- `packages/core/src/meta/analyzer.ts`, `sidecar.ts`
- `packages/core/src/sidecar/types.ts`, `runner.ts`
- `packages/core/src/plugins/types.ts`