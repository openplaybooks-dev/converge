---
id: contract-probe-green
title: Green — run probes, produce report
description: |
  Run all probes. All must pass. Produce contract-probe-report.md with
  PASS/FAIL per probe. If any fail, document the drift and STOP.

inputs:
  - .converge/playbooks/dbt-data-model/00-contract-probe/probes/

outputs:
  - .converge/playbooks/dbt-data-model/contract-probe-report.md

checks:
  - id: report-exists
    cmd: test -s .converge/playbooks/dbt-data-model/contract-probe-report.md
    description: Contract probe report exists and is non-empty.
  - id: all-probes-pass
    cmd: bash .converge/playbooks/dbt-data-model/00-contract-probe/run-all.sh
    description: All probes pass (GREEN).

tags:
  - tdd
  - green
---

# Green — run probes, produce report

Run `run-all.sh`. If all probes pass, produce `contract-probe-report.md`:

```markdown
# Contract probe report — dbt-data-model

| # | Probe | Status |
|---|-------|--------|
| 1 | TaskDag exists | PASS |
| 2 | dag-runner exists | PASS |
| ... | ... | ... |
```

If any probe fails, document which one, why, and STOP. Do not proceed
to later phases until the predecessor contract is fixed.
