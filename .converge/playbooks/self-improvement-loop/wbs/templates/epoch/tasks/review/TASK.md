---
id: "{{taskId}}"
title: "Code review — epoch {{epoch}}"
checks:
  - id: review-approved
    cmd: "grep -q 'APPROVED' {{artifactsDir}}/review/report.md"
    description: "Code review passed"
on-fail:
  reset:
    - "002-implement"
---

# Code review

Review the changes made in this epoch against what was planned.

## Inputs

Read these to understand what was supposed to happen:
- `{{artifactsDir}}/analyze/report.md` — the picked improvement
- `{{artifactsDir}}/implement/plan.md` — the implementation plan

## Review criteria

1. **Alignment**: Do the actual code changes match what the analyze report picked? If the implementation did something different from what was planned, REJECT.
2. **Strategic impact**: Does this improvement demonstrably raise the targeted quality dimension? If the change is superficial or doesn't address the identified weakness, REJECT.
3. **Correctness**: Does the fix actually resolve the planned issue?
4. **Minimal change**: Only the planned changes were made, no unrelated modifications
5. **Style**: Matches existing codebase conventions
6. **No regressions**: No new problems introduced

## Output

Write your review to `{{artifactsDir}}/review/report.md`:
- If acceptable: include `APPROVED` on its own line, with brief notes
- If problems found: include `REJECTED` on its own line, with specific feedback on what to fix

If REJECTED, be specific — the implement phase will retry with your feedback.
