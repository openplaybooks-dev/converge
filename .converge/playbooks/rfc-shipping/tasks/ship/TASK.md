---
id: ship
title: Continuous RFC-shipping loop
materialization: incremental
outputs:
  - .converge/artifacts/rfc-shipping/journal.md
checks:
  - id: clean-nonartifact-start
    cmd: "node .converge/playbooks/rfc-shipping/scripts/check-clean-start.mjs {{projectDir}}"
    description: Autonomous shipping starts from a clean non-artifact git diff
  - id: journal-written
    cmd: test -s .converge/artifacts/rfc-shipping/journal.md
    description: Shipping journal exists
  - id: no-self-modification
    cmd: "! git -C {{projectDir}} diff --name-only -- .converge/playbooks/rfc-ideation/ .converge/playbooks/rfc-shipping/ | grep -q ."
    description: Zero uncommitted changes to rfc-ideation or rfc-shipping playbooks
  - id: any-accepted-rfc-available
    cmd: "node .converge/playbooks/rfc-shipping/scripts/check-accepted-available.mjs"
    description: At least one accepted RFC awaits shipping (epoch is a no-op otherwise)
mode: spawner
spawn:
  min_children: 1
---

# Continuous RFC-shipping loop

Each wave emits one epoch spawn for the next Accepted RFC. If no Accepted RFC
is available, the precheck fails cleanly and the playbook idles.

Rules:
- Derive epoch number from existing
  `.converge/artifacts/rfc-shipping/epochs/<NNN>/` directories.
- Use zero-padded ids: `epoch-001`, `epoch-002`, ...
- Instantiate `.converge/playbooks/rfc-shipping/templates/epoch/TASK.md`.
- Pass `taskId`, `epoch`, `projectDir`, `artifactsRoot`, `artifactsRootRel`,
  `artifactsDir`, `artifactsRel`, and `epochTemplateDir`.

After each epoch completes, append to `.converge/artifacts/rfc-shipping/journal.md`:

```
## Epoch NNN
- RFC: NNNN-slug
- Branch: rfc/NNNN-slug
- Test outcome: pass | fail_recoverable | fail_blocked
- PR: <url or "-">
- Notes: <one line>
```
