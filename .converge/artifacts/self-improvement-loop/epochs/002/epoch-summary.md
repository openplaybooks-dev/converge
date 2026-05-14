# Epoch 2 summary

## Mental model audited
- **Model:** Fingerprint Determinism
- **Rule:** Preserve determinism for DAG discovery, --select, spawned children, resume, retries, locks, and cleanup
- **Finding:** computeFingerprint hashes raw TASK.md file content (readFileSync) instead of normalized task definition fields, causing false cache invalidation from comments, trailing whitespace, or markdown formatting changes
- **Severity:** high / Determinism

## Correction
- **Test written:** tests/fingerprint-determinism.test.ts
- **Framework file changed:** packages/core/src/run/helpers.ts
- **Change:** computeFingerprint now uses hashTaskFrontmatter + hashTaskBody + hashTaskChecks from hash/task.ts instead of raw file content, so cosmetic TASK.md changes don't cause false cache invalidation
- **Test-first:** yes, test failed before fix, passed after

## Verification
- **Result:** PASS
- **Build:** pass
- **Test:** pass

## Ledger updates
- Journal: not yet appended
- Metrics: not yet appended
- Touched files: appended
- Escalated: no

## Next epoch guidance
- **Continue auditing:** model index 5 (not yet audited)
- **Already audited:** Checks Not Vibes, Framework vs Project, Fingerprint Determinism
- **Skip mental models:** Blueprint vs Runtime, Checks Not Vibes, Framework vs Project, Fingerprint Determinism
- **Escalated bugs (do not retry):** select-parent-plus-missing-children, hooks-throw-timeout
