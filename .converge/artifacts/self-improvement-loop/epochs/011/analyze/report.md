# Selection Report — Epoch 011

## Selected: run-mode-deprecation-warning-spam

**Rationale:** The only finding from observation was the `run.mode` deprecation warning fired 13 times during a 9-node DAG dry run, drowning 3 real playbook load failures in noise. This is a production-readiness issue: operators scanning dry-run output for actual errors will miss them in the wall of repeated deprecation spam.

All higher-priority ranks were checked and are clean:
- Rank 1 (crash/stall): all probes pass, no crashes or stalled runs
- Rank 2 (lifecycle/state): addressed by epochs 003 and 5
- Rank 3 (determinism): addressed by epoch 2; compile, DAG, and seed tests all pass

The fix is minimal — a dedup set at the logger level — and carries low risk. The affected file (`packages/core/src/run.ts`) has been touched in 3 prior epochs; per the anti-repeat rule, a small root-cause dedup is the appropriate response rather than avoiding the file.

## Rejected alternatives

Only one finding was observed (`run-mode-deprecation-warning-spam`), so there were no competing candidates to reject.

The stale playbook directories (`smoke-test`, `test-progress-curl`, `test-progress-fresh` failing to load) were noted in the observation report but are not framework bugs — they are project-level stale directories without `tasks/` folders. Cleaning them is explicitly disallowed as low-value cleanup.

## Maintainer sign-off

This is a small, reviewable patch against a real observability problem. It makes future debugging strictly easier without changing any behavior or contract. One reviewer, one sitting.
