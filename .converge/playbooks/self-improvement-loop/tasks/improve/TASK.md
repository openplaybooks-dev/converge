---
id: improve
title: Continuous test-driven framework improvement loop
materialization: incremental
outputs:
  - .converge/artifacts/self-improvement-loop/convergence.md
checks:
  - id: checkpoint-dirty-tree
    cmd: "node .converge/playbooks/self-improvement-loop/scripts/checkpoint-dirty-tree.mjs {{projectDir}} .converge/artifacts/self-improvement-loop/checkpoint.json"
    description: Dirty non-artifact work is checkpointed into a git commit before autonomous edits
  - id: clean-nonartifact-start
    cmd: "node .converge/playbooks/self-improvement-loop/scripts/check-clean-start.mjs {{projectDir}}"
    description: Autonomous self-improvement starts from a clean non-artifact git diff after checkpointing
  - id: convergence-written
    cmd: test -s .converge/artifacts/self-improvement-loop/convergence.md
    description: Convergence trajectory summary exists
  - id: convergence-counts-verified-epochs
    cmd: "test ! -s .converge/artifacts/self-improvement-loop/metrics.jsonl || grep -q 'verified epochs' .converge/artifacts/self-improvement-loop/convergence.md"
    description: Convergence summary is based on verified epoch metrics
  - id: playbook-templates-valid
    cmd: "node .converge/playbooks/self-improvement-loop/scripts/check-playbook-templates.mjs"
    description: Self-improvement playbook templates parse before autonomous run continuation
  - id: escalated-valid
    cmd: "test ! -s .converge/artifacts/self-improvement-loop/escalated.json || node .converge/playbooks/self-improvement-loop/scripts/jq-safe.mjs empty .converge/artifacts/self-improvement-loop/escalated.json"
    description: Escalated bugs ledger is valid JSON
  - id: no-self-modification
    cmd: "! git -C {{projectDir}} diff --name-only -- .converge/playbooks/self-improvement-loop/ | grep -q ."
    description: Zero uncommitted changes to self-improvement playbook
seeds:
  - type: seed
    name: epoch
---

# Continuous test-driven framework improvement loop

This loop audits Converge's own mental models against its implementation.
Each epoch picks one design principle (Blueprint vs Runtime, Checks Not Vibes,
Framework vs Project, etc.), traces it through the actual code, finds gaps
between the stated model and what the code does, writes a test that encodes
the correct behavior, and implements the minimal fix.

The loop automatically checkpoints any dirty non-artifact working-tree changes
into a git commit before running so each epoch has reviewable patch attribution.

After each epoch completes, update `.converge/artifacts/self-improvement-loop/convergence.md` from durable loop memory.

Read:

- `.converge/artifacts/self-improvement-loop/journal.md`
- `.converge/artifacts/self-improvement-loop/metrics.jsonl`
- `.converge/artifacts/self-improvement-loop/backlog.jsonl`
- `.converge/artifacts/self-improvement-loop/touched-files.jsonl`
- latest `epochs/<NNN>/verify/result.json`

## Required convergence accounting

Count only epochs whose `verify/result.json` has `result: "pass"` and whose
commands all have `exit_code: 0`. Mention the number as `verified epochs`.
Do not count observe-only or partially implemented epochs as complete.

Track which mental models have been audited and which still need attention.

## Output

Write:

```markdown
# Self-improvement convergence

## Current trajectory
- verified epochs: <number>
- mental models audited: <list from metrics.jsonl>
- mental models remaining: <list not yet audited>
- pass/fail trend

## Mental model coverage

| # | Mental Model | Audited | Epoch | Result |
|---|---|---|---|---|
| 1 | Blueprint vs Runtime | yes/no | — | — |
| 2 | Checks, Not Vibes | yes/no | — | — |
| ... | ... | ... | ... | ... |

## Escalated bugs
<list from escalated.json — do not re-audit these>

## Current framework risk profile
- Correctness gaps found
- Determinism gaps found
- Architecture violations found

## Recommendation for next epoch
<which mental model to audit next, based on coverage gaps>
```

Keep this summary concise. It is guidance for the next epoch, not a full report.
