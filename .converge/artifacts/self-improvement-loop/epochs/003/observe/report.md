# Audit Report: Fingerprint Determinism (Epoch 3)

## Mental Model (from CLAUDE.md §5)

> Preserve determinism for DAG discovery, `--select`, spawned children, resume, retries, locks, and cleanup.

**Rule in one sentence:** Every operation that compiles or executes a DAG must produce identical results given identical inputs — wall-clock time or execution order must not change the compiled manifest, runstate, or caching decisions.

## Files Audited

| File | Role |
|------|------|
| `packages/core/src/hash/task.ts` | Hash primitives (frontmatter, body, checks, upstream, inputs) |
| `packages/core/src/run/helpers.ts` | `computeFingerprint` — runtime fingerprint for change detection |
| `packages/core/src/run/index.ts` | Run orchestration — calls `computeFingerprint`, compares against prev runstate |
| `packages/cli/src/commands-compile.ts` | `compile` command — builds manifest.json + runstate.json from playbook |
| `packages/core/src/manifest/run-state-manager.ts` | `setNodeFingerprint`, `markCached` — persists fingerprint to runstate |

## Commands Run

```
grep -rn 'hashTask\|hashUpstream\|computeFingerprint\|fingerprint' packages/core/src/ packages/cli/src/
```

Result: 39 matches across 8 files. Fingerprint logic spans core (hash, run, manifest) and cli (compile).

## Findings Summary

### Finding 1 (HIGH): Compile output is non-deterministic

**File:** `packages/cli/src/commands-compile.ts:188,252`

Every `compile` call embeds `new Date().toISOString()` in:
- `manifest.json` metadata `.generated_at` (line 188)
- `runstate.json` metadata `.generated_at` (line 252)

This means the compile idempotency test from the audit template (`compile → save → compile → diff`) ALWAYS fails — the timestamp changes even though the playbook source is identical.

**Why this matters:** DAG discovery determinism is the foundation for caching, resume, and retry safety. If the compile output differs on every run, downstream consumers (diffs, CI cache keys, fingerprint-based skip decisions) cannot trust the manifest to represent a stable artifact.

**Contrast:** The per-node hashes (`frontmatter_hash`, `body_hash`, `checks_hash`, `inputs_hash`, `upstream_hash`) ARE deterministic — they only depend on TASK.md content. The metadata timestamp is the sole source of non-determinism.

### Finding 2 (MEDIUM): `computeFingerprint` omits upstream hash

**File:** `packages/core/src/run/helpers.ts:93-127`

`computeFingerprint` hashes only the task's own definition (frontmatter, body, checks, inputs). It does NOT incorporate upstream dependency fingerprints. The run-time change detection at `run/index.ts:488-494` compensates with a manual `upstreamChanged` check that walks `depends_on` separately, but the stored fingerprint value in runstate is incomplete.

**Risk:** If a previous runstate is missing (first run, or runstate was deleted) but fingerprints were stored elsewhere (external cache, CI artifact), comparing fingerprints alone would miss upstream changes — a child whose parent changed would still show a matching fingerprint.

### Finding 3 (LOW): `inputs_hash` computed via wrong hasher

**File:** `packages/cli/src/commands-compile.ts:117`

`inputs_hash` is computed by passing inputs through `hashTaskChecks` instead of a generic hash:
```ts
inputs_hash: hashTaskChecks(inputsArr.map((s) => ({ id: String(s ?? "") })))
```

Both functions currently use `stableStringify` + `sha256`, so outputs are identical. But the semantic coupling means any future divergence in `hashTaskChecks` (e.g. check-specific normalization) would silently break input hashing.

## Gap: What Should Change

The mental model requires determinism. Two concrete gaps exist:

1. **Timestamp in compile output** — direct violation. The fix is to either exclude `generated_at` from the hash-sensitive manifest content (keep it as metadata-only), or replace it with a source-derived value (e.g. git HEAD hash) when determinism is required.

2. **Fingerprint doesn't compose upstream** — partial violation with a compensating control. The runtime change detection works correctly because it checks upstream separately, but the fingerprint value stored in runstate is not a self-contained cache key.

## Proposed Correction (from Finding 1)

- **Test:** `tests/compile-determinism.test.ts` — compile the self-improvement-loop playbook twice to temp dirs, diff the manifest nodes (ignoring `generated_at`), assert identical.
- **Code change:** In `commands-compile.ts`, use a stable timestamp (or omit it) when `--deterministic` flag is set, or move `generated_at` outside the hash-relevant portion.
- **Prevention:** This correction ensures CI pipelines, cache-key systems, and fingerprint-based skip decisions all see stable manifests for identical source.
