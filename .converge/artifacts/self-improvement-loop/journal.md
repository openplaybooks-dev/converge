## Epoch 2

**Mental Model**: Blueprint vs Runtime
**Finding**: runstate-path-divergence
**Date**: 2026-05-14
**Result**: ✅ PASS

Fixed a path divergence between `dag-tree.ts:335` and `run-state-manager.ts:48`. The `ingestSpawnedChildrenFromRunstate()` function was reading from a non-existent `executions/` subdirectory while `RunStateManager` persisted directly to `runstate.json`. Added `tests/runstate-ingest-consistency.test.ts` (3 assertions, all passing) to ensure both components stay in sync.

## Epoch 15

**Mental Model**: Checks, Not Vibes
**Finding**: ai-checks-still-functional
**Date**: 2026-05-14
**Result**: ✅ PASS

Replaced the AI check dispatch branch in `find-gaps.ts` with a hard rejection that throws at check execution time, structurally enforcing the "Checks, Not Vibes" principle. The `type: ai` check pathway is now impossible to execute. Added `tests/check-rejects-ai-type.test.ts` (2 assertions, all passing) to prove the mental model is enforced by the framework.
