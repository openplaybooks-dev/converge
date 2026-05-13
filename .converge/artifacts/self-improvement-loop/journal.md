# Self-Improvement Loop Journal

## Epoch 1

- **Mental Model:** Blueprint vs Runtime
- **Finding:** boundary-enforcement-self-contradicting
- **Result:** pass
- **Correction:** Updated context-writer boundary enforcement text to stop claiming the framework never reads journal files, since compile-time code reads journal manifest and runstate.
- **Files changed:** `packages/core/src/navigator/repair/context-writer.ts`, `tests/context-writer-boundary-accuracy.test.ts`
- **Test added:** `tests/context-writer-boundary-accuracy.test.ts`

## Epoch 2

- **Mental Model:** Checks, Not Vibes
- **Finding:** ai-checks-violate-shell-only-rule
- **Result:** pass
- **Correction:** Removed AI check type from runCheck() in find-gaps.ts. AI evaluations are a separate lifecycle step, not conflated with deterministic check verification.
- **Files changed:** `packages/core/src/task/unit/find-gaps.ts`, `tests/checks-no-ai-type.test.ts`
- **Test added:** `tests/checks-no-ai-type.test.ts`

## Epoch 3

- **Mental Model:** Framework vs Project
- **Finding:** project-example-hardcoded-in-framework-prompts
- **Result:** pass
- **Correction:** Replaced hardcoded `examples/cinematic-video-production/` paths in framework prompt templates (analyze.ts, implement-executable.ts, task-md-schema.ts) with generic runtime-resolved placeholders.
- **Files changed:** `packages/core/src/planning/progressive-decomposition/analyze.ts`, `packages/core/src/planning/progressive-decomposition/implement-executable.ts`, `packages/core/src/planning/progressive-decomposition/task-md-schema.ts`, `tests/planning/prompt-templates.test.ts`
- **Test added:** `tests/planning/prompt-templates.test.ts`
