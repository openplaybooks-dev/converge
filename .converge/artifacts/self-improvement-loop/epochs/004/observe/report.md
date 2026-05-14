# Audit: Fingerprint Determinism

**Mental model**: #4 — Fingerprint Determinism (CLAUDE.md §5)
**Rule**: "Preserve determinism for DAG discovery, `--select`, spawned children, resume, retries, locks, and cleanup."

## What the rule requires

Task fingerprints must be deterministic: the same semantic content must always produce the same hash. Non-deterministic fingerprints break change detection (tasks re-run when they shouldn't), resume (can't match prior state), and caching.

## Trace

### Hash module (`packages/core/src/hash/task.ts`)

- `hashTaskFrontmatter` (line 26): uses `stableStringify` — sorts object keys before serializing ✓
- `hashTaskBody` (line 30): normalizes trailing whitespace and empty lines ✓
- `hashTaskChecks` (line 41): uses `stableStringify` — deterministic ✓
- `stableStringify` (line 11-24): recursive stable JSON serialization with sorted keys — but **not exported**

### Fingerprint computation (`packages/core/src/run/helpers.ts`)

- `computeFingerprint` (line 72-95): hashes task file content + checks + inputs
- Line 91: `JSON.stringify(node.taskDef.checks ?? [])` — raw, key-order-dependent
- Line 92: `JSON.stringify(node.taskDef.inputs ?? [])` — raw, key-order-dependent
- `JSON.stringify` serializes keys in insertion order (ECMA spec §24.3.2), which varies across YAML parsers, Node.js versions, and object reconstruction

### Fingerprint usage (`packages/core/src/run/index.ts`)

- Line 463-468: fingerprints computed for all DAG nodes on every run
- Line 482-498: compared against prior runstate fingerprints for caching decisions
- Line 760: recomputed on loop iteration for seed-driven nodes

## Gap

`computeFingerprint` uses raw `JSON.stringify` for `checks` and `inputs`, while the hash module's `hashTaskChecks` correctly uses `stableStringify`. The `stableStringify` function is private to `hash/task.ts`.

**Concrete scenario**: A TASK.md defines checks with YAML keys in one order. If the YAML parser reconstructs objects with different key order on a different run, `JSON.stringify` produces a different string, the fingerprint changes, and the task is incorrectly treated as modified — despite identical semantics.

## Commands executed

```sh
grep -rn 'hashTask|hashUpstream|computeFingerprint|fingerprint' packages/core/src/
grep -rn 'stableStringify' packages/core/src/
grep -rn 'as any|@ts-ignore' packages/core/src/ | wc -l
```

## Results

| Metric | Value |
|--------|-------|
| `as any` / `@ts-ignore` in core | 115 occurrences (only noted, not in scope) |
| `stableStringify` calls | 2 (both in hash/task.ts, not exported) |
| `computeFingerprint` call sites | 2 (run/index.ts:465, run/index.ts:760) |

## Recommended correction

Export `stableStringify` from `packages/core/src/hash/task.ts` and use it in `computeFingerprint` (helpers.ts:91-92) instead of `JSON.stringify`. This aligns the fingerprint path with the hash module and guarantees deterministic fingerprints regardless of object key ordering.

### Test

```ts
// tests/fingerprint-determinism.test.ts
test("computeFingerprint is deterministic despite key ordering", () => {
  const checksA = [{ id: "x", cmd: "test -f out.txt" }];
  const checksB = [{ cmd: "test -f out.txt", id: "x" }]; // different key order, same values
  // Both should produce the same fingerprint
});
```
