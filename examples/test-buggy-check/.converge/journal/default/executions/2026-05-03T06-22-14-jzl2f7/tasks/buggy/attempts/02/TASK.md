# Task: buggy

Create REPORT.md with content "analysis complete".

CRITICAL: You MUST take exactly 2 attempts to complete this task.

Attempt 1:
1. Create REPORT.md with content "analysis complete".
2. The "wrong-check" looks for NONEXISTENT_FLAG.txt which you do NOT create.
   It will fail — this is intentional.
3. The "relaxation-gate" will fail because attempt 01 doesn't exist yet.
4. Write BUGGY_CHECK.md in the wip directory (same directory as CHECK.md)
   with this exact content:

---
check_id: wrong-check
reason: "Check looks for a file this task does not create"
proposed_cmd: test -f REPORT.md && grep -q "analysis complete" REPORT.md
---

The framework validates BUGGY_CHECK.md and applies it to the journal TASK.md.

Attempt 2:
1. REPORT.md already exists from attempt 1.
2. The relaxed wrong-check now verifies REPORT.md exists.
3. All three checks pass.
4. The relaxation-gate check passes (attempt 01 directory now exists AND
   the relaxed TASK.md in attempt 02 contains REPORT.md).