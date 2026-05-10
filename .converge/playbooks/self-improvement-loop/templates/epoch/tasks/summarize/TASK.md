---
id: "{{taskId}}"
depends_on:
  - "{{verifyTaskId}}"
title: "Summarize completed epoch — epoch {{epoch}}"
inputs:
  - "{{artifactsRel}}/observe/report.md"
  - "{{artifactsRel}}/analyze/improvement-spec.json"
  - "{{artifactsRel}}/implement/patch-manifest.json"
  - "{{artifactsRel}}/verify/result.json"
  - "{{artifactsRel}}/verify/result.md"
outputs:
  - "{{artifactsRel}}/epoch-summary.md"
checks:
  - id: summary-written
    cmd: "test -s {{artifactsRel}}/epoch-summary.md"
    description: Epoch summary exists
  - id: final-diff-matches-patch-manifest
    cmd: "node .converge/playbooks/self-improvement-loop/scripts/check-final-diff.mjs {{projectDir}} {{artifactsRel}}/implement/patch-manifest.json"
    description: Final non-artifact diff still matches patch manifest exactly
  - id: epoch-complete
    cmd: "node .converge/playbooks/self-improvement-loop/scripts/check-epoch-complete.mjs {{artifactsRootRel}} {{artifactsRel}}"
    description: Epoch has all required artifacts and passing command-backed verification
---

# Summarize completed epoch

Write the mandatory durable handoff for this epoch. Do not change source code in
this stage. Read the observe, analyze, implement, and verify artifacts, then
write `{{artifactsRel}}/epoch-summary.md`. The final non-artifact git diff must
still exactly match `implement/patch-manifest.json`; if it does not, stop and
report the mismatch instead of editing source.

The summary is for the next autonomous epoch and for human maintainers. Keep it
short, factual, and evidence-backed.

## Output format

```markdown
# Epoch {{epoch}} summary

## Selected target
- ID:
- Priority class / dimension:
- Why now:

## Patch
- Files changed:
- Regression added: yes/no, or exception
- Summary:

## Verification
- Result:
- Commands:
  - `<cmd>` → `<exit_code>`

## Metrics / ledger movement
- Journal appended: yes/no
- Metrics appended: yes/no
- Touched files appended: yes/no
- Backlog changes: none | list

## Next maintainer note
- Continue with:
- Avoid repeating:
- Escalate if:
```
