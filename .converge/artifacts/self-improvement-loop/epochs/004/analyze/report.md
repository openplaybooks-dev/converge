# Epoch 004 Selection Report

## Selected finding: `fingerprint-json-stringify-non-deterministic`

**Mental model:** Fingerprint Determinism
**Severity:** high
**Dimension:** Determinism

## Why this finding was selected

This was the only finding from the observe phase. It scores under both **Correctness** and **Determinism** — the two highest-priority rubric criteria:

1. **Correctness:** Non-deterministic fingerprints cause the framework to produce wrong results — false-positive re-executions and broken caching.
2. **Determinism:** The core violation is that `computeFingerprint` uses `JSON.stringify` which doesn't guarantee stable key ordering across runs.

## Anti-repeat checks passed

- Mental model "Fingerprint Determinism" was not audited in the last 2 epochs (epochs 2-3 covered "Checks, Not Vibes" and "Framework vs Project")
- Target file `packages/core/src/run/helpers.ts` appears in only 2 prior epochs (not 3+)
- Finding not in escalated.json

## Rejected alternatives

No other findings exist in the observe phase output. All findings are addressed by this single correction.
