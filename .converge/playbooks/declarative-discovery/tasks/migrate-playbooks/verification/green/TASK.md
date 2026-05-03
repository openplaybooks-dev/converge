---
id: verification-green
title: Green — run full sweep; fix remaining playbooks; generate migration report
description: |
  Run the verification sweep. Fix any playbooks still missing
  children: declarations. Generate migration-report.md with results
  per playbook.

inputs:
  - .converge/playbooks/declarative-discovery/tools/verify-declarative.sh
outputs:
  - .converge/playbooks/declarative-discovery/migration-report.md

checks:
  - id: sweep-passes
    cmd: bash .converge/playbooks/declarative-discovery/tools/verify-declarative.sh
    description: All playbooks pass (GREEN).
  - id: migration-report-present
    cmd: test -s .converge/playbooks/declarative-discovery/migration-report.md
    description: Migration report exists.

tags:
  - tdd
  - green
---

# Green — full sweep and report

## Step 1 — Run sweep

```bash
bash .converge/playbooks/declarative-discovery/tools/verify-declarative.sh
```

For each FAIL entry, go back to the per-playbook migration (02) and
add the missing declarations.

## Step 2 — Generate migration report

Write `.converge/playbooks/declarative-discovery/migration-report.md`:

```markdown
# Declarative migration report

Generated: <timestamp>

| Playbook | Parents migrated | children: entries | from_seed: entries | Parity |
|----------|-----------------|-------------------|-------------------|--------|
| cli-redesign | 24 | 48 | 0 | PASS |
| remove-goals | 3 | 6 | 0 | PASS |
| dbt-paradigm | 12 | 28 | 3 | PASS |
| ... | ... | ... | ... | ... |

## Summary
- Playbooks migrated: N
- Total parents: M
- Total children: edges: K
- from_seed: entries: J
- Parity failures: 0
```

## Step 3 — Final sweep

All checks pass. Every parent in every live playbook declares its
children. Cross-loader parity verified for all.

## Done when

Sweep green. Report written. Phase 04 complete.
