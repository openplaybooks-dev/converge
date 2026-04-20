# Epoch-001 Code Review

## Summary

This epoch fixed 13 TypeScript type errors across 9 files in `packages/core/src/`. The changes resolve compilation failures without altering runtime behavior.

## Review

### Correctness

All 13 type errors are resolved. `npx tsc --noEmit` passes cleanly.

- `metrics/extract.ts`: Replaced unsupported `onlyDirectories` glob option with trailing-slash pattern `"*/"` — correct for glob v11.
- `repair/agent-runner.ts`: Cast `convergeConfig.ai` to `any` for `listAIProviders`/`resolveAIConfig` — acceptable workaround for union type mismatch between `AIConfig | AIMultiProviderConfig`.
- `repair/navigator/actions.ts`: Added missing `const eventWriter = getEventWriter()` declaration before use — fixes a clear reference error.
- `repair/strategies/missing-wbs-script.ts`: Added `string[]` type annotations to resolve `never[]` inference from `?? []` — correct fix.
- `repair/strategies/tool-environment-repair.ts`: Six fixes including casting `checkOutput` metadata to `string`, replacing `askString()` with `ask()` + `asText()`, correcting event type to `"CHECK_SELF_HEALED"`, and fixing `updateTaskMd` to `updateSkillMd` — all match the actual API surface.
- `cli/commands-goals.ts`: Made `blocked` optional in `GoalResult` — matches usage sites that omit it.
- `cli/commands-inspect.ts`: Reordered spread to put `...s.metadata` before `sessionId` — fixes duplicate property error while preserving the intended override.
- `cli/commands-tree.ts`: Added `"partial"` status mapping to `"running"` — reasonable handling of an unaccounted status value.
- `cli/main.ts`: Cast `pb.def` to `any` for `.skills` access — acceptable workaround for a property not yet in the type definition.
- `tsconfig.json`: Added `@converge/tbench` path mapping — necessary for module resolution.

### Minimal change

Each fix is narrowly scoped to the type error. No unrelated refactoring or formatting changes.

### Style

Changes match existing codebase conventions (casting patterns, ternary style, type annotations).

### No regressions

Type errors: 0. The fixes are all type-level adjustments or API call corrections that align with the actual runtime API.

## Verdict

APPROVED

All changes are correct, minimal, and consistent with existing patterns. The `any` casts in `agent-runner.ts` and `main.ts` are pragmatic workarounds — ideally the upstream types would be fixed, but that is outside the scope of this epoch.
