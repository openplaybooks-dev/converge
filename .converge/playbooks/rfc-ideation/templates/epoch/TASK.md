---
id: "{{taskId}}"
title: "RFC ideation epoch {{epoch}}"
outputs:
  - "{{artifactsRel}}/epoch-summary.md"
checks:
  - id: epoch-summary-written
    cmd: "test -s {{artifactsRel}}/epoch-summary.md"
    description: Epoch summary exists
  - id: journal-has-epoch
    cmd: "grep -q '## Epoch {{epoch}}' {{artifactsRootRel}}/journal.md"
    description: Parent journal contains this epoch
spawn:
  min_children: 1
---

# RFC ideation epoch {{epoch}}

Draft exactly one RFC from one source candidate. Emit six
`converge spawn template` commands for the sequential children:

- `{{taskId}}-01-discover-sources` (no deps)
- `{{taskId}}-02-pick-source` (depends_on 01)
- `{{taskId}}-03-triage` (depends_on 02)
- `{{taskId}}-04-draft` (depends_on 03)
- `{{taskId}}-05-cite-check` (depends_on 04)
- `{{taskId}}-06-index` (depends_on 05)

Use template paths under
`{{epochTemplateDir}}/tasks/{01-discover-sources,02-pick-source,03-triage,04-draft,05-cite-check,06-index}/TASK.md`
and pass the shared vars plus each child `taskId`.

After all six complete, write `{{artifactsRel}}/epoch-summary.md`:

```
# Epoch {{epoch}} — RFC ideation

- Source picked: <source>:<ref>
- Triage decision: <draft|dedup-skip|invalid>
- Draft slug: <slug or "-">
- Assigned RFC number: <NNNN or "-">
- Citations verified: <count>
- Notes: <one line>
```

And append to `{{artifactsRootRel}}/journal.md`:

```
## Epoch {{epoch}}
- Source: <source>:<ref>
- Decision: <draft|dedup-skip|invalid>
- RFC: <NNNN-slug or "-">
- Notes: <one line>
```
