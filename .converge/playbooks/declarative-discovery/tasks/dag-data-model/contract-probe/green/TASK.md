---
id: contract-probe-green
title: Green — run probes; generate contract-probe-report.md
description: |
  Run all probe scripts. For each probe, record PASS or FAIL with the
  specific error. If all pass, the playbook can proceed. If any fail,
  document the drift and STOP — the predecessor contract is broken and
  must be fixed before continuing.

inputs:
  - .converge/playbooks/declarative-discovery/00-contract-probe/probes/

outputs:
  - .converge/playbooks/declarative-discovery/contract-probe-report.md

checks:
  - id: report-exists
    cmd: test -s .converge/playbooks/declarative-discovery/contract-probe-report.md
    description: Contract probe report exists and is non-empty.
  - id: all-probes-pass
    cmd: .converge/playbooks/declarative-discovery/00-contract-probe/probes/run-all.sh
    description: All predecessor probes pass (GREEN).

tags:
  - tdd
  - green
---

# Green — run probes and report

Run the aggregate probe runner. Generate a report documenting each
probe's result.

## Steps

### 1. Run all probes

```bash
.converge/playbooks/declarative-discovery/00-contract-probe/probes/run-all.sh
```

Capture stdout to get per-probe PASS/FAIL lines.

### 2. Generate report

Write `.converge/playbooks/declarative-discovery/contract-probe-report.md`:

```markdown
# Contract probe report — declarative-discovery

Run: <timestamp>

| # | Probe | Result | Detail |
|---|-------|--------|--------|
| 1 | cli-redesign select module | PASS | select/ exists |
| 2 | remove-goals goal-manager absent | PASS | goal-manager.ts not found |
| 3 | child-synthesizer.ts exists | PASS/FAIL | ... |
| ... | ... | ... | ... |

Summary: X passed, Y failed

## Failures (if any)

- Probe N: <description> — <error detail>
```

### 3. Gate

If all probes pass → proceed to dag-node.
If any probe fails → the predecessor contract is broken. Update the
affected downstream contracts in TASK.md files before continuing.

## Done when

All 13 probes pass. Report written. Phase 01 can proceed.
