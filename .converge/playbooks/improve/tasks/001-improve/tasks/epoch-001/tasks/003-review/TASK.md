---
id: 003-review
title: Code review — epoch 1
checks:
  - id: review-approved
    description: Code review passed
    cmd: "grep -q 'APPROVED' /Users/minh/Documents/converge/.converge/artifacts/improve/epochs/001/review/report.md"
vars:
  taskId: 003-review
  epoch: 1
  projectDir: /Users/minh/Documents/converge
  artifactsDir: /Users/minh/Documents/converge/.converge/artifacts/improve/epochs/001
  epochTemplateDir: /Users/minh/Documents/converge/.converge/playbooks/improve/tasks/001-improve/templates/epoch
---

# Code review

Review the changes made in this epoch.

## Review criteria

1. **Correctness**: Does the fix actually resolve the issue from the analysis?
2. **Minimal change**: Only the reported issue was fixed, no unrelated changes
3. **Style**: Matches existing codebase conventions
4. **No regressions**: No new problems introduced

## Output

Write your review to `/Users/minh/Documents/converge/.converge/artifacts/improve/epochs/001/review/report.md`:
- If acceptable: include `APPROVED` on its own line, with brief notes
- If problems found: include `REJECTED` on its own line, with specific feedback on what to fix

If REJECTED, be specific — the implement phase will retry with your feedback.
