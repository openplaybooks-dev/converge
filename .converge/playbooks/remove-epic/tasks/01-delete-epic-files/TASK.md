---
id: 01-delete-epic-files
title: Delete epic-only infrastructure files
blocking: true
checks:
  - id: epic-manager-gone
    cmd: "test ! -f packages/core/src/runtime/epic-manager.ts"
    description: epic-manager.ts deleted
  - id: epic-context-gone
    cmd: "test ! -f packages/core/src/context/epic-context.ts"
    description: epic-context.ts deleted
  - id: epic-scanner-gone
    cmd: "test ! -f packages/core/src/planning/epic-scanner.ts"
    description: epic-scanner.ts deleted
  - id: epic-checkpoints-gone
    cmd: "test ! -f packages/core/src/checkpoint/ensure-epic-checkpoints.ts"
    description: ensure-epic-checkpoints.ts deleted
---

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
