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
seeds:
  - type: seed
    name: epoch
---

# Continuous test-driven framework improvement loop

This loop is not for cosmetic edits. Act like a maintainer who knows the
Converge codebase: use failing or weak tests to reveal broken framework
behavior, then make one small production-quality implementation/API cleanup.
The loop automatically checkpoints any dirty non-artifact working-tree changes
into a git commit before running so each epoch has reviewable patch attribution.
This avoids unattended runs mixing prior human edits into epoch manifests.

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

## Output

Write:

```markdown
# Self-improvement convergence

## Current trajectory
- verified epochs: <number counted from verify/result.json or metrics.jsonl>
- pass/fail trend
- tests from /tests recently run
- dimensions improving/stagnating

## Current framework risk profile
- Safety/correctness
- Determinism
- Production readiness
- Simplicity
- DX/API cleanliness

## Backlog guidance
- next best test-backed target
- deferred larger refactors

## Stop / escalation signals
- repeated files
- repeated failure classes
- persistent low dimensions
- failed verification commands

## Recommendation for next epoch
<one actionable target area tied to a test under /tests>
```

Keep this summary concise. It is guidance for the next epoch, not a full report.
