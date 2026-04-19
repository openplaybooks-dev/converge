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

Review the changes made in this epoch.

## Review criteria

1. **Correctness**: Does the fix actually resolve the issue from the analysis?
2. **Minimal change**: Only the reported issue was fixed, no unrelated changes
3. **Style**: Matches existing codebase conventions
4. **No regressions**: No new problems introduced

## Output

Write your review to `{{artifactsDir}}/review/report.md`:
- If acceptable: include `APPROVED` on its own line, with brief notes
- If problems found: include `REJECTED` on its own line, with specific feedback on what to fix

If REJECTED, be specific — the implement phase will retry with your feedback.
