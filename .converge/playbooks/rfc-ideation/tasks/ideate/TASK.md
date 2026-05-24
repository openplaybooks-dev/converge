---
id: ideate
title: Continuous RFC-drafting loop
materialization: incremental
outputs:
  - .converge/artifacts/rfc-ideation/journal.md
checks:
  - id: clean-nonartifact-start
    cmd: "node .converge/playbooks/rfc-ideation/scripts/check-clean-start.mjs {{projectDir}}"
    description: Autonomous RFC drafting starts from a clean non-artifact git diff
  - id: journal-written
    cmd: test -s .converge/artifacts/rfc-ideation/journal.md
    description: Ideation journal exists
  - id: playbook-templates-valid
    cmd: "node .converge/playbooks/rfc-ideation/scripts/check-playbook-templates.mjs"
    description: Self-improvement-loop templates still parse (shared scripts dependency)
  - id: no-self-modification
    cmd: "! git -C {{projectDir}} diff --name-only -- .converge/playbooks/rfc-ideation/ .converge/playbooks/rfc-shipping/ | grep -q ."
    description: Zero uncommitted changes to rfc-ideation or rfc-shipping playbooks
  - id: accepted-queue-not-overloaded
    cmd: "node .converge/playbooks/rfc-ideation/scripts/check-accepted-queue-size.mjs"
    description: Accepted RFC queue is not blocked (count <= 10)
spawn:
  min_children: 1
---

# Continuous RFC-drafting loop

This loop drafts one RFC per epoch from candidate sources. The human reviews
each draft and either promotes `status: draft → status: accepted` (to be
shipped by `rfc-shipping`) or deletes it.

Emit one `converge spawn template` command for the next epoch only.

Rules:
- Derive the next epoch number from existing
  `.converge/artifacts/rfc-ideation/epochs/<NNN>/` directories.
- Use zero-padded ids: `epoch-001`, `epoch-002`, ...
- Instantiate `.converge/playbooks/rfc-ideation/templates/epoch/TASK.md`.
- Pass `taskId`, `epoch`, `projectDir`, `artifactsRoot`, `artifactsRootRel`,
  `artifactsDir`, `artifactsRel`, and `epochTemplateDir`.

After each epoch completes, append a one-line entry to
`.converge/artifacts/rfc-ideation/journal.md`:

```
## Epoch NNN
- Source: <source>:<ref>
- Decision: drafted | dedup-skip | invalid
- RFC: <NNNN-slug or "-">
- Notes: <one line>
```

Read for context:

- `.converge/artifacts/rfc-ideation/journal.md` (prior epochs)
- `.converge/artifacts/rfc-ideation/source-cursor.jsonl` (round-robin state)
- `docs/rfcs/README.md` (existing priority queue and conventions)
