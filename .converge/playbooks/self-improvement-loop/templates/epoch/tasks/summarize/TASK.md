---
id: "{{taskId}}"
depends_on:
  - "{{verifyTaskId}}"
title: "Summarize epoch — epoch {{epoch}}"
inputs:
  - "{{artifactsRel}}/observe/findings.json"
  - "{{artifactsRel}}/analyze/correction-spec.json"
  - "{{artifactsRel}}/implement/patch-manifest.json"
  - "{{artifactsRel}}/verify/result.json"
  - "{{artifactsRel}}/verify/result.md"
outputs:
  - "{{artifactsRel}}/epoch-summary.md"
checks:
  - id: summary-written
    cmd: "test -s {{artifactsRel}}/epoch-summary.md"
    description: Epoch summary exists
  - id: mental-model-recorded
    cmd: "grep -q 'Mental model' {{artifactsRel}}/epoch-summary.md"
    description: Summary records which mental model was audited
  - id: diff-matches-patch
    cmd: "node .converge/playbooks/self-improvement-loop/scripts/check-final-diff.mjs {{projectDir}} {{artifactsRel}}/implement/patch-manifest.json"
    description: Final git diff still matches patch manifest
  - id: no-self-modification
    cmd: '! git -C {{projectDir}} diff --name-only -- .converge/playbooks/self-improvement-loop/ | grep -q .'
    description: Zero changes to self-improvement playbook
  - id: epoch-complete
    cmd: "node .converge/playbooks/self-improvement-loop/scripts/check-epoch-complete.mjs {{artifactsRootRel}} {{artifactsRel}}"
    description: All epoch artifacts present
---

# Summarize completed epoch

Write the durable handoff. Do NOT change source code. Read all artifacts and
write `{{artifactsRel}}/epoch-summary.md`.

## Output format

```markdown
# Epoch {{epoch}} summary

## Mental model audited
- **Model:** Checks, Not Vibes
- **Rule:** Shell commands verify correctness, not AI judgment
- **Finding:** Output existence checks only verify file presence, not content validity
- **Severity:** high / Correctness

## Correction
- **Test written:** tests/playbook-output-validation.test.ts
- **Framework file changed:** packages/core/src/task/unit/find-gaps.ts
- **Change:** Added content validation to check definitions
- **Test-first:** yes, test failed before fix, passed after

## Verification
- **Result:** PASS
- **Build:** pass
- **Test:** pass

## Ledger updates
- Journal: appended
- Metrics: appended
- Touched files: appended
- Escalated: no

## Next epoch guidance
- **Continue auditing:** Blueprint vs Runtime (not yet audited)
- **Already audited:** Checks Not Vibes (this epoch)
- **Skip mental models:** <list from metrics.jsonl of recently audited>
- **Escalated bugs (do not retry):** <list from escalated.json>
```
