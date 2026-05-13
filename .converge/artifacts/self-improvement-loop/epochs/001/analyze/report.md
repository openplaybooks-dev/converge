# Selection Report: Epoch 1 Correction

## Selected finding

**`runtime-content-over-blueprint`** (HIGH, Correctness) — `packages/core/src/run/index.ts:968`

The `executeTask` function prefers task content from `runstate.json` (compiled at compile time) over the authoritative playbook `TASK.md`. If compilation embeds stale content, the runtime silently uses it instead of re-reading the blueprint source. This inverts the "Blueprint vs Runtime" hierarchy.

## Rejected findings

### `hardcoded-journal-path-in-compile` (MEDIUM, Maintainability)

`compilePlaybook` hardcodes `.converge/journal/` in 4 locations instead of using `getTargetDir()`. Rejected because:
- It's a maintainability/debt issue, not a correctness bug
- The path convention is stable; no incorrect behavior results
- Lower leverage than the source-of-truth inversion

### `hardcoded-journal-path-in-dag-reload` (LOW, Maintainability)

`ingestSpawnedChildrenFromRunstate` constructs journal paths manually. Rejected because:
- Same maintainability category as above, but lower severity
- Fixing the compile-level hardcoding would cover this as well
- No runtime impact on correctness

## Anti-repeat verification

- **metrics.jsonl**: Does not exist — no mental model has been audited in prior epochs
- **touched-files.jsonl**: Does not exist — no file has been touched in 3+ epochs
- **escalated.json**: Contains `select-parent-plus-missing-children` and `hooks-throw-timeout` — neither matches `runtime-content-over-blueprint`

## Rationale

Fixing source-of-truth inversion (Correctness, rubric #1) has the highest leverage. The runtime currently trusts compiled state blindly. Making the blueprint authoritative on every read, with compiled state as a verified cache, prevents future violations of the Blueprint vs Runtime contract by design.
