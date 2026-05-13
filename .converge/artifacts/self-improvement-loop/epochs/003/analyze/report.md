# Selection Report — Epoch 3

**Mental model audited:** Framework vs Project
**Rule:** NEVER hardcode project specifics into the framework — framework (`packages/`) is generic, projects (`examples/`) are specific.

## Selected finding

**`project-example-hardcoded-in-framework-prompts`** (severity: high, dimension: Maintainability)

The framework prompt templates in `packages/core/src/planning/progressive-decomposition/` hardcode the example project name `cinematic-video-production` in three files. This directly violates the Framework vs Project boundary and risks the LLM treating one example project as special.

This finding ranks highest on the selection rubric:
1. **Correctness** — LLM prompts that embed project-specific names can produce misleading outputs by steering the model toward example-specific patterns rather than generic reasoning.
2. **Prevention** — replacing hardcoded names with runtime-resolved placeholders makes this entire class of violation impossible across all future prompt additions.

## Rejected findings

### `validation-glob-paths-hardcoded` (severity: medium)

**Reason:** This is a configurability concern, not a correctness bug. The hardcoded glob patterns in `validate.ts` produce correct results; they just aren't derived from a central config. Per the rubric, correctness/prevention findings outrank configurability/DX findings. This can be addressed in a future epoch if no higher-leverage findings remain.

## Anti-repeat verification

- Mental model "Framework vs Project" was NOT audited in epochs 1 or 2 (those covered "Blueprint vs Runtime" and "Checks, Not Vibes"). ✓
- Target file `packages/core/src/planning/progressive-decomposition/analyze.ts` does not appear in `touched-files.jsonl`. ✓
- Finding ID is not in `escalated.json`. ✓
- Target is not under `.converge/playbooks/self-improvement-loop/`. ✓
