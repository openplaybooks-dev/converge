---
id: 09-refactor-cli
title: Refactor CLI commands — remove --epic flag and epic references
blocking: true
dependencies: [08-refactor-lifecycle-executor-repair]
---

Remove epic references from all CLI command files.

- `packages/core/src/cli/commands-run.ts` (~28 occurrences) — remove epic flags/params
- `packages/core/src/cli/autonomous-run.ts` (~25 occurrences) — remove epic loop logic
- `packages/core/src/cli/tree-display.ts` (~25 occurrences) — remove epic grouping in display
- `packages/core/src/cli/commands-gantt.ts` (~20 occurrences) — remove epic grouping
- `packages/core/src/cli/commands.ts` (~16 occurrences) — remove --epic flag definitions
- `packages/core/src/cli/commands-graph.ts` (~15 occurrences) — remove epic filtering
- `packages/core/src/cli/commands-tree.ts` (~11 occurrences) — remove --epic flag
- `packages/core/src/cli/commands-backlog.ts` (~11 occurrences) — remove epic references
- `packages/core/src/cli/commands-reset.ts` (~11 occurrences) — remove epic reset logic
- `packages/core/src/cli/commands-journal.ts` (~10 occurrences) — remove --epic flag and filtering
- `packages/core/src/cli/skills/autonomous-orchestrator.ts` (~16 occurrences)
- `packages/core/src/cli/main.ts` (~12 occurrences)
- `packages/core/src/cli/commands-metrics.ts` (~6 occurrences)
- `packages/core/src/cli/help.ts` (~4 occurrences)

Remove the `--epic` CLI flag entirely from all command definitions.
