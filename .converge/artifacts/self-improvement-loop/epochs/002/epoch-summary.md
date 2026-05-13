# Epoch 2 summary

## Mental model audited
- **Model:** Framework vs Project
- **Rule:** NEVER hardcode project specifics into the framework (CLAUDE.md §3.5)
- **Finding:** `packages/cli/src/commands-add.ts:615` hardcodes `myanlabs/converge` as the GitHub org/repo for downloading examples, violating the Framework vs Project boundary
- **Severity:** high / Portability

## Correction
- **Test written:** tests/cli/examples-registry-config.test.ts
- **Framework file changed:** packages/cli/src/commands-add.ts
- **Change:** Replace hardcoded org/repo in downloadExampleFromGitHub with a configurable base URL read from project.yaml examples.registry.url, with the current hardcoded value as default
- **Test-first:** yes, test failed before fix, passed after

## Verification
- **Result:** PASS
- **Build:** pass (cli + core)
- **Test:** pass

## Ledger updates
- Journal: appended
- Metrics: appended
- Touched files: appended
- Escalated: no

## Next epoch guidance
- **Continue auditing:** Think Before Coding, Simplicity First, Surgical Changes, Goal-Driven Execution (not yet audited)
- **Already audited:** Blueprint vs Runtime (epoch 1), Checks Not Vibes (epoch 2a), Framework vs Project (this epoch)
- **Skip mental models:** Blueprint vs Runtime, Checks Not Vibes (recently audited per metrics.jsonl)
- **Escalated bugs (do not retry):** select-parent-plus-missing-children (Determinism), hooks-throw-timeout (Correctness)
