# Health Report

## Type Errors
- **Count:** 13
- **Files:**
  - `core/src/metrics/extract.ts` (1 error — `onlyDirectories` not in `GlobOptions`)
  - `core/src/repair/agent-runner.ts` (2 errors — `AIConfig | AIMultiProviderConfig` type mismatch)
  - `core/src/repair/navigator/actions.ts` (2 errors — `eventWriter` not found, should be `getEventWriter`)
  - `core/src/repair/strategies/missing-wbs-script.ts` (1 error — `string` not assignable to `never`)
  - `core/src/repair/strategies/tool-environment-repair.ts` (7 errors — `.includes` on `{}`, missing `askString` on `AIContext`, invalid `EventType`, missing `updateTaskMd` on `FilesystemHelper`)

## Tests
- **Passed:** 1032
- **Failed:** 106
- **Skipped:** 8
- **No test files:** 3 packages (acpfn, swebench, tbench)

Breakdown by package:
| Package | Passed | Failed | Skipped |
|---------|--------|--------|---------|
| core | 532 | 56 | 0 |
| claudefn | 72 | 28 | 0 |
| agentfn | 56 | 18 | 0 |
| qwenfn | 99 | 4 | 0 |
| kimifn | 96 | 0 | 0 |
| codets | 283 | 0 | 0 |
| openfn | 40 | 0 | 8 |
| geminifn | 29 | 0 | 0 |

## Code Smells
- `any` casts: 689 occurrences (172 files)
- `@ts-ignore`: 0 occurrences
- `@ts-expect-error`: 0 occurrences
- `eslint-disable`: 0 occurrences

## Dead Exports
Notable unused exports (60+ total):
- `parseToolCalls`, `buildToolPreamble`, `buildCodePreamble`, `extractCode` — duplicated across 6 provider packages, never imported
- 16 functions in `agentfn/src/skills.ts` — `discoverSkills`, `loadSkill`, `ensureSkillSymlinks`, etc.
- `agentfn/src/feedback.ts` — `TASK_COMPLETION_PROMPT`, `parseTaskReport`, `formatReportAsMarkdown`
- `codets/src/semantic/` — `ExprHelper`, `ObjectBuilder`, `ArrayBuilder`, `SemanticBuilder`, `MdBuilder`, `renderExpr`, `DEFAULT_FORMAT`
- `core/src/cli/inspect-display.ts` — `color`, `formatTimestamp`, `renderProjectOverview`, `renderTaskTree`, etc.
- `core/src/repair/navigator/default-graph.ts` — `GOAL_CONDITIONS`, `buildPreflightNodes`, `buildResponseNodes`, etc.
- `core/src/functions/builders.ts` — `evalFn`, `defineEpic`, `defineProject`
- `core/src/planning/dynamic-planner.ts` — `createDynamicPlanner`, `createAdaptivePlanner`

## Large Files
| File | Lines |
|------|-------|
| core/src/config/task-definition.ts | 1826 |
| core/src/executor/wbs-executor.ts | 1449 |
| core/src/cli/next-task.ts | 1408 |
| core/src/converge/goal-planner.ts | 1363 |
| core/src/tree/task-tree.ts | 1272 |
| core/src/cli/main.ts | 1256 |
| core/src/repair/navigator/actions.ts | 1229 |
| codets/test/semantic-builder.test.ts | 1226 |
| claudefn/src/claudefn.ts | 1192 |
| core/src/lifecycle/task-runner.ts | 1183 |
| core/src/cli/autonomous-run.ts | 1180 |
| core/src/functions/builders.ts | 1150 |
| core/src/executor/spawn-runner.ts | 1085 |
| core/src/cli/commands.ts | 1033 |
| core/tests/integration/navigator-graph.test.ts | 1023 |
| core/tests/unit/executor/loop-executor.test.ts | 954 |
| core/src/cli/commands-run.ts | 943 |
| core/src/repair/agent-runner.ts | 922 |
| core/src/repair/strategies/dependency-backoff.ts | 841 |
| qwenfn/tests/compose.test.ts | 825 |
| kimifn/tests/compose.test.ts | 825 |
| claudefn/tests/compose.test.ts | 825 |
| core/src/executor/function-executor.ts | 797 |
| acpfn/src/acpfn.ts | 774 |
| core/src/cli/skills/autonomous-orchestrator.ts | 767 |
| core/tests/unit/executor/task-executor.test.ts | 740 |
| core/src/functions/types.ts | 726 |
| agentfn/tests/compose.test.ts | 710 |
| core/src/orchestrator/convergence.ts | 703 |
| core/src/validation/rules/project-md.ts | 702 |
| core/src/checkpoint/manager.ts | 679 |
| core/src/config/task-md-definition.ts | 677 |
| core/src/cli/inspect-display.ts | 676 |
| core/src/index.ts | 675 |
| core/src/storage/types.ts | 669 |
| core/tests/unit/journal/structure.test.ts | 636 |
| core/src/repair/strategy-catalog.ts | 631 |
| agentfn/tests/agentfn.test.ts | 619 |
| codets/test/project-builder.test.ts | 608 |
| core/src/meta/analyzer.ts | 607 |
| core/src/metrics/extract.ts | 603 |
| acpfn/src/compose.ts | 602 |
| openfn/src/openfn.ts | 580 |
| core/tests/helpers/test-builders.ts | 573 |
| core/src/repair/strategies/tool-environment-repair.ts | 572 |
| core/src/repair/strategies/skill-based-repair.ts | 563 |
| core/tests/unit/checkpoint/simplified-checkpoint.test.ts | 561 |
| core/src/agent-manager/agent-manager.ts | 545 |
| claudefn/src/compose.ts | 545 |
| core/src/cli/commands-goals.ts | 541 |
| core/tests/unit/tree/tree-traversal.test.ts | 538 |
| core/src/tree/traversal.ts | 533 |
| core/src/lifecycle/before.ts | 526 |
| core/tests/helpers/mock-registry.ts | 524 |
| core/src/process/manager.ts | 518 |
| core/src/validation/rules/format.ts | 517 |
| codets/src/semantic/formatter.ts | 517 |
| qwenfn/src/compose.ts | 516 |
| kimifn/src/compose.ts | 516 |
| geminifn/src/compose.ts | 516 |
| core/src/storage/filesystem.ts | 511 |
| openfn/tests/compose.test.ts | 507 |
| core/src/journal/writer.ts | 503 |

## Dependencies
- **Production:** 11 (unique across all packages)
- **Dev:** 4 (unique across all packages)
