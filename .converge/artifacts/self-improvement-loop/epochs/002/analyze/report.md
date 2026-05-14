# Selection Rationale: Epoch 2 Correction

**Selected finding:** `runstate-path-divergence`
**Mental model:** Blueprint vs Runtime
**Target file:** `packages/core/src/dag/dag-tree.ts`

## Why this finding was chosen

The selection rubric prioritizes findings by impact, in order:

1. **Correctness** — framework produces wrong results
2. **Prevention** — fixing makes a class of bugs impossible
3. **Determinism** — non-deterministic behavior
4. **Clarity** — obscures contract, causing downstream bugs
5. **DX** — only if nothing else qualifies

`runstate-path-divergence` is a **Correctness** issue: `ingestSpawnedChildrenFromRunstate()` reads `runstate.json` from `.converge/journal/{playbook}/executions/{entry}/runstate.json`, but `RunStateManager` persists it to `.converge/journal/{playbook}/runstate.json`. The path mismatch causes the tree-based navigator to silently return zero spawned children — it produces wrong results.

## Rejected findings

### `journal-usurps-playbook` (HIGH severity, Architecture/Prevention)

**Reason rejected:** This is a Prevention concern (rubric #2). While high severity, it does not cause wrong results today — it creates a risk that future code might misuse the journal as a design-time source. Correctness issues (rubric #1) take priority over Prevention. **Recommended for epoch 3.**

### `misleading-structure-doc` (LOW severity, Documentation/Clarity)

**Reason rejected:** This is a Clarity concern (rubric #4). The docstring in `structure.ts` describes a `target/` directory that doesn't exist. No runtime impact. Can be fixed trivially in any future epoch alongside a code change touching that file.

## Anti-repeat checks

- **metrics.jsonl**: Not present — no prior epochs have audited models, so no rejection.
- **touched-files.jsonl**: Not present — no file appears in 3+ epochs.
- **escalated.json**: Not present — no escalated entries to match against.
- **Self-modification**: The target is `packages/core/src/dag/dag-tree.ts`, which is not under `.converge/playbooks/self-improvement-loop/`. Passed.
- **Breaking changes**: The fix is an internal path alignment within a private function. No public API, exported function, or configuration field is affected. Risk: `low`.

## Correction summary

Remove the `executions/` subdirectory indirection in `ingestSpawnedChildrenFromRunstate()` at line ~335 of `dag-tree.ts`. Change the path construction from `join(projectDir, ".converge", "journal", playbookName, "executions")` to `join(projectDir, ".converge", "journal", playbookName)` to match the path used by `RunStateManager`.
