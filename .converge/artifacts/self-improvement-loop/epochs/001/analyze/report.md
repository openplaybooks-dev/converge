# Epoch 001 selection report

## Selected

- `run-lock-interrupt-coverage` — high-severity production readiness gap from `observe/findings.json`.

Maintainer rationale: the observation phase found that all build and existing focused suites pass, but there is no top-level Vitest coverage for run-lock cleanup or interrupted-process recovery. Run locks are lifecycle infrastructure; missing interruption coverage can leave users unable to continue runs without manual cleanup. The selected work is small, reviewable, and maps directly to a focused regression command: `pnpm vitest run tests/playbook-run-lock.test.ts`.

## Rejected alternatives

No competing observed findings were present in `observe/findings.json`. Build-warning noise and unused-import warnings from the successful build probes were rejected as explicitly low-value standalone targets.

## Anti-repeat check

The durable `metrics.jsonl` and `touched-files.jsonl` ledgers were not present on disk for this run, so no repeated selected id, dimension, or hot file pattern was available to reject. This target is production lifecycle coverage rather than cosmetic/DX cleanup.
