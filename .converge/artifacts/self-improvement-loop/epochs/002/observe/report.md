# Audit: Fingerprint Determinism

**Mental model**: Fingerprint Determinism (CLAUDE.md §5, model index 4)
**Rule**: "Preserve determinism for DAG discovery, `--select`, spawned children, resume, retries, locks, and cleanup."
**Interpretation**: A task's fingerprint must be a deterministic function of its logical definition — same definition → same fingerprint. Fingerprint changes must only occur when task behavior actually changes.

## Files audited

- `packages/core/src/run/helpers.ts` — `computeFingerprint` (line 72)
- `packages/core/src/hash/task.ts` — `hashTaskBody`, `hashTaskChecks`, `hashTaskFrontmatter`, `hashUpstream`, `stableStringify`
- `packages/core/src/run/index.ts` — change detection logic (lines 462–504), spawned children re-fingerprint (line 760)
- `packages/core/src/dag/dag-node.ts` — `DagNode` type, `path` field
- `packages/core/src/manifest/types.ts` — `RunStateNode.fingerprint` field (line 127)

## Commands run

```
grep -rn "hashTask|hashUpstream|computeFingerprint|fingerprint" packages/core/src/
```

Found 22 matches across `hash/task.ts`, `hash/index.ts`, `run/index.ts`, `run/helpers.ts`, `manifest/types.ts`, `manifest/run-state-manager.ts`, `index.ts`.

## Findings

### Gap 1: computeFingerprint hashes raw file content, not normalized task definition

**File**: `packages/core/src/run/helpers.ts:76-89`
**Severity**: high

`computeFingerprint` has two paths:
1. If `node.path` exists on disk → `hash.update(readFileSync(taskPath, "utf-8"))` — hashes raw file content verbatim
2. If `node.path` doesn't exist → hashes `taskDef.prompt`, `taskDef.description`, `taskDef.skill`

The raw file path includes comments, trailing whitespace, blank lines, and markdown formatting that do not affect task behavior. A cosmetic edit (e.g., adding a comment, fixing a typo in body text) changes the fingerprint and invalidates the cache, even though the task definition is semantically identical.

The framework already has normalized hashing in `packages/core/src/hash/task.ts`:
- `hashTaskBody` strips trailing whitespace per line before hashing (line 30)
- `hashTaskFrontmatter` uses `stableStringify` with sorted keys (line 26)
- `hashTaskChecks` uses `stableStringify` with sorted keys (line 41)

But `computeFingerprint` bypasses all three.

### Gap 2: computeFingerprint uses JSON.stringify while hashTaskChecks uses stableStringify

**File**: `packages/core/src/run/helpers.ts:91` vs `packages/core/src/hash/task.ts:42`
**Severity**: medium

At line 91: `JSON.stringify(node.taskDef.checks ?? [])` — key order depends on insertion order (though V8 preserves it in practice, this is not guaranteed by spec).

At `hash/task.ts:42`: `stableStringify(checks)` sorts object keys.

If checks objects are constructed with different key insertion order between compiler runs, the same logical check produces a different fingerprint. This is a latent determinism bug — currently masked by V8's stable property enumeration but not safe long-term.

### Gap 3: Dual path in computeFingerprint produces two different fingerprints for the same task

**File**: `packages/core/src/run/helpers.ts:76-89`
**Severity**: medium

When `node.path` exists → fingerprint = hash(raw file + checks + inputs). When it doesn't → fingerprint = hash(taskDef fields + checks + inputs). These produce different fingerprints for the same logical task. If file path resolution changes between runs (e.g., a precompile step that moves or transforms the task file), the fingerprint changes even though the task definition is identical.

## Recommended correction

Make `computeFingerprint` use the normalized hash functions from `hash/task.ts` (`hashTaskFrontmatter`, `hashTaskBody`, `hashTaskChecks`) instead of raw file content and `JSON.stringify`. This ensures the fingerprint only changes when the semantically meaningful parts of the task change.

Test to write: `tests/fingerprint-determinism.test.ts` — verify that cosmetic changes to a TASK.md file (adding comments, trailing whitespace) do not change the computed fingerprint.
