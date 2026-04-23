# Task: 09-refactor-cli

Remove epic references from all CLI command files. Replace --epic flag with --playbook.

- `packages/core/src/cli/commands-run.ts` — remove epic flags/params, use playbook
- `packages/core/src/cli/autonomous-run.ts` — remove epic loop logic
- `packages/core/src/cli/tree-display.ts` — remove epic grouping in display
- `packages/core/src/cli/commands-gantt.ts` — remove epic grouping
- `packages/core/src/cli/commands.ts` — remove --epic flag definitions, add --playbook
- `packages/core/src/cli/commands-graph.ts` — remove epic filtering
- `packages/core/src/cli/commands-tree.ts` — remove --epic flag
- `packages/core/src/cli/commands-backlog.ts` — remove epic references
- `packages/core/src/cli/commands-reset.ts` — remove epic reset logic
- `packages/core/src/cli/commands-journal.ts` — remove --epic flag and filtering
- `packages/core/src/cli/skills/autonomous-orchestrator.ts`
- `packages/core/src/cli/main.ts`
- `packages/core/src/cli/commands-metrics.ts`
- `packages/core/src/cli/help.ts`

Remove the `--epic` CLI flag entirely. Replace with `--playbook` where appropriate.