---
id: "{{taskId}}"
title: "RFC shipping epoch {{epoch}}"
outputs:
  - "{{artifactsRel}}/epoch-summary.md"
checks:
  - id: epoch-summary-written
    cmd: "test -s {{artifactsRel}}/epoch-summary.md"
    description: Epoch summary exists
  - id: journal-has-epoch
    cmd: "grep -q '## Epoch {{epoch}}' {{artifactsRootRel}}/journal.md"
    description: Parent journal contains this epoch
mode: spawner
spawn:
  min_children: 1
---

# RFC shipping epoch {{epoch}}

Ship exactly one Accepted RFC to a reviewable PR. Emit six
`converge spawn template` commands for the sequential children:

- `{{taskId}}-01-pick-rfc` (no deps)
- `{{taskId}}-02-branch` (depends_on 01)
- `{{taskId}}-03-rebase-check` (depends_on 02)
- `{{taskId}}-04-implement` (depends_on 03)
- `{{taskId}}-05-test` (depends_on 04)
- `{{taskId}}-06-pr-open` (depends_on 05)

Use template paths under
`{{epochTemplateDir}}/tasks/{01-pick-rfc,02-branch,03-rebase-check,04-implement,05-test,06-pr-open}/TASK.md`
and pass the shared vars plus each child `taskId`.

After all six complete, write `{{artifactsRel}}/epoch-summary.md`:

```
# Epoch {{epoch}} — RFC shipping

- RFC picked: <NNNN-slug>
- Branch: rfc/<NNNN-slug>
- Test outcome: <pass|fail_recoverable|fail_blocked>
- PR: <url or "-">
- RFC status now: <implementing|implementing-needs-human|accepted (reverted)>
- Notes: <one line>
```

And append to `{{artifactsRootRel}}/journal.md`:

```
## Epoch {{epoch}}
- RFC: <NNNN-slug>
- Branch: rfc/<NNNN-slug>
- Test outcome: <outcome>
- PR: <url or "-">
- Notes: <one line>
```
