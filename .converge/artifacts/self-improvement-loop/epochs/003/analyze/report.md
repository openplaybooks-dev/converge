# Selection Report: Epoch 003 Analyze

**Selected finding:** `compile-non-deterministic-timestamp` (high severity, Correctness)

**Why this finding:** The compile command embeds `new Date().toISOString()` in both `manifest.json` and `runstate.json` metadata (lines 188, 252 of `packages/cli/src/commands-compile.ts`). Every compile produces different output even with identical source, breaking DAG discovery determinism. This is the highest-leverage fix because it prevents an entire class of non-deterministic compile bugs.

## Rejected findings

- **`compute-fingerprint-missing-upstream`** (medium severity) — The fingerprint gap in `packages/core/src/run/helpers.ts:93` is mitigated by a manual `upstreamChanged` check at `run/index.ts:488`. The runtime compensates correctly; the stored fingerprint alone is incomplete but not broken in practice. Fixing the timestamp is higher leverage because the non-determinism affects every compile, not just edge cases.

- **`compile-inputs-hash-uses-wrong-hasher`** (low severity) — The semantic mismatch in `packages/cli/src/commands-compile.ts:117` (using `hashTaskChecks` for inputs) has identical behavior today since both use `stableStringify` + sha256. This is a code-clarity issue, not a bug. If the hashers ever diverge it would become a correctness problem, but at present it produces correct results.
