# Task: 01-delete-epic-files

Delete these 4 files that exist solely for epic infrastructure:

1. `packages/core/src/runtime/epic-manager.ts` — EpicManagerImpl class
2. `packages/core/src/context/epic-context.ts` — EpicContextImpl, EpicEvalAPI, EpicPlanAPI
3. `packages/core/src/planning/epic-scanner.ts` — EpicFileScanner, EpicMetadata
4. `packages/core/src/checkpoint/ensure-epic-checkpoints.ts` — ensureEpicCheckpoints(), updateEpicProgress()

Then remove all imports/usages of these deleted modules from:
- `packages/core/src/runtime/runtime.ts` — remove EpicManagerImpl import/usage
- `packages/core/src/context/index.ts` — remove EpicContextImpl, createEpicContext exports
- `packages/core/src/index.ts` — remove all epic re-exports from these files
- `packages/core/src/cli/next-task.ts` — remove ensureEpicCheckpoints/updateEpicProgress calls

Comment out broken downstream references temporarily (they'll be fixed in later tasks).