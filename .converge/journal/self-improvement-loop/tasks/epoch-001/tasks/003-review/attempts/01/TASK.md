# Task: epoch-001/003-review

# Code review

Review the changes made in this epoch against what was planned.

## Inputs

Read these to understand what was supposed to happen:
- `/Users/minh/Documents/converge/.converge/artifacts/improve/epochs/001/analyze/report.md` — the picked improvement
- `/Users/minh/Documents/converge/.converge/artifacts/improve/epochs/001/implement/plan.md` — the implementation plan

## Review criteria

1. **Alignment**: Do the actual code changes match what the prioritize report picked? If the implementation did something different from what was planned, REJECT.
2. **Correctness**: Does the fix actually resolve the planned issue?
3. **Minimal change**: Only the planned changes were made, no unrelated modifications
4. **Style**: Matches existing codebase conventions
5. **No regressions**: No new problems introduced

## Output

Write your review to `/Users/minh/Documents/converge/.converge/artifacts/improve/epochs/001/review/report.md`:
- If acceptable: include `APPROVED` on its own line, with brief notes
- If problems found: include `REJECTED` on its own line, with specific feedback on what to fix

If REJECTED, be specific — the implement phase will retry with your feedback.