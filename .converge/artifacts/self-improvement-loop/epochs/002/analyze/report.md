# Selection Report: Epoch 002

**Selected finding:** `fingerprint-raw-file-not-normalized` (high severity)
**Mental model:** Fingerprint Determinism
**Target file:** `packages/core/src/run/helpers.ts`

## Why this finding was chosen

`fingerprint-raw-file-not-normalized` is the highest-leverage correction because it addresses a correctness-level bug: `computeFingerprint` hashes raw TASK.md file content instead of normalized task definition fields. This means comments, trailing whitespace, and markdown formatting that don't affect task behavior can change the fingerprint, causing false cache invalidation. The framework literally produces different results for semantically identical tasks.

This ranks highest across all rubric dimensions:
- **Correctness**: The framework produces wrong results (false cache misses)
- **Prevention**: Fixing this makes the entire class of "cosmetic change causes cache miss" bugs impossible
- **Determinism**: The current behavior is explicitly non-deterministic

The fix is minimal — delegate to `hashTaskFrontmatter`, `hashTaskBody`, and `hashTaskChecks` from `hash/task.ts` which already normalize their inputs properly.

## Rejected findings

### `fingerprint-json-stringify-vs-stableStringify` (medium)
Rejected because it's a subset of the selected finding. Once `computeFingerprint` delegates to `hash/task.ts` functions (which use `stableStringify`), the JSON.stringify vs stableStringify inconsistency is resolved automatically. Fixing the root cause covers this.

### `fingerprint-dual-path-non-determinism` (medium)
Rejected because this is also a subset of the selected finding. The dual-path problem (file vs. fields) exists because of the raw-file hashing approach. When `computeFingerprint` always hashes from normalized taskDef fields regardless of file existence, both code paths produce identical fingerprints.
