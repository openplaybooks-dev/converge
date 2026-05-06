---
id: miss-out
title: Missing output gap test
checks:
  - id: output-exists
    cmd: test -f OUTPUT.txt && grep -q "task-complete" OUTPUT.txt
    description: OUTPUT.txt exists with correct content
  - id: retry-gate
    cmd: "find .converge/journal -path '*/attempts/01/FEEDBACK.md' 2>/dev/null | grep -q FEEDBACK"
    description: Attempt 1 archive exists (proves gap detection + retry happened)
---

Create OUTPUT.txt with content "task-complete".

CRITICAL: You MUST take exactly 2 attempts to complete this task.

- Attempt 1: Do NOT create OUTPUT.txt. The `output-exists` check will fail and
  the `retry-gate` check (which verifies attempt 1 was archived) will also fail
  because attempt 01 doesn't exist yet. Let the attempt end without fixing.

- Attempt 2: The FEEDBACK.md from attempt 1 will show the missing-output gap.
  Now create OUTPUT.txt with content "task-complete". The `retry-gate` check
  will pass because attempt 01 is now archived.
