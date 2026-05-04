---
id: buggy
title: Buggy check relaxation test
checks:
  - id: wrong-check
    cmd: test -f NONEXISTENT_FLAG.txt
    description: Deliberately wrong check — will be relaxed by framework
  - id: real-check
    cmd: test -f REPORT.md && grep -q "analysis complete" REPORT.md
    description: REPORT.md exists with correct content
  - id: relaxation-gate
    cmd: "find .converge/journal -path '*/attempts/02/TASK.md' 2>/dev/null | head -1 | xargs -I {} grep -q 'REPORT.md' {}"
    description: Attempt 2 TASK.md was relaxed (proves buggy-check relaxer ran)
---

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
