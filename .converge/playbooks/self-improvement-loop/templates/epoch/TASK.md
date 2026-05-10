---
id: "{{taskId}}"
title: "Self-improvement epoch {{epoch}}"
outputs:
  - "{{artifactsRel}}/epoch-summary.md"
checks:
  - id: epoch-complete
    cmd: "node .converge/playbooks/self-improvement-loop/scripts/check-epoch-complete.mjs {{artifactsRootRel}} {{artifactsRel}}"
    description: Epoch has all required artifacts and passing command-backed verification
  - id: journal-has-epoch
    cmd: "grep -q '## Epoch {{epoch}}' {{artifactsRootRel}}/journal.md"
    description: Shared journal contains this epoch
  - id: metrics-has-epoch
    cmd: "grep -q '\"epoch\":\"{{epoch}}\"' {{artifactsRootRel}}/metrics.jsonl"
    description: Metrics ledger contains this epoch
seeds: [epoch-seed]
---

# Self-improvement epoch {{epoch}}

Complete one safe, evidence-backed framework improvement. This epoch is only
complete after `verify/result.json` records passing command exit codes and the
parent `epoch-summary.md` exists. Think like a senior maintainer: leave the repo
with one reviewable patch and enough durable memory for the next maintainer to
continue without guessing.

After `observe → select → implement → verify → summarize` complete,
`{{artifactsRel}}/epoch-summary.md` must exist. This is mandatory durable memory; do not
mark the epoch complete without it.

Summarize:

- selected target and why;
- `/tests` command chosen and why;
- files changed;
- verification result;
- metric movement;
- backlog items created or retired;
- refactor/escalation signal, if any.
