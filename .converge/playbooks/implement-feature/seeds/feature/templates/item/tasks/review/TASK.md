---
id: "{{taskId}}"
title: "Review — {{task}}"
checks:
  - id: review-approved
    cmd: "grep -q 'APPROVED' {{artifactsDir}}/review/report.md"
    description: "Code review passed"
on-fail:
  reset:
    - "002-implement"
---

# Code review

Review the changes against the original task request.

## Inputs

- Original task: `{{task}}`
- Analysis: `{{artifactsDir}}/analyze/plan.md`
- Implementation plan: `{{artifactsDir}}/implement/plan.md`

## Review criteria

1. **Alignment**: Do the actual code changes match what was requested? If the implementation did something different from the task, REJECT.
2. **Correctness**: Does the implementation actually accomplish the task?
3. **Minimal change**: Only necessary changes were made, no unrelated modifications
4. **Style**: Matches existing codebase conventions
5. **No regressions**: No new problems introduced

## Steps

1. Run `git diff` to see all changes made
2. Compare against the original task request and the implementation plan
3. Check for correctness, completeness, and style

## Output

Write `{{artifactsDir}}/review/report.md`:
- If acceptable: include `APPROVED` on its own line, with brief notes
- If problems found: include `REJECTED` on its own line, with specific feedback

If REJECTED, be specific — the implement phase will retry with your feedback.
