---
id: two-phase
title: Two-phase test
outputs:
  - STEP1.txt
  - STEP2.txt
checks:
  - id: phase-one
    cmd: test -f STEP1.txt && grep -q "phase-1-done" STEP1.txt
    description: STEP1.txt exists with correct content
  - id: phase-two
    cmd: test -f STEP2.txt && grep -q "phase-2-done" STEP2.txt
    description: STEP2.txt exists with correct content
---

This task has a CHECK that verifies both PASS and FAIL conditions.
The check `phase-one` verifies `STEP1.txt` exists with "phase-1-done".
The check `phase-two` verifies `STEP2.txt` exists with "phase-2-done".

On your first attempt: create STEP1.txt with content "phase-1-done".
The check `phase-one` will pass but `phase-two` will fail.
On your second attempt: the FEEDBACK will show phase-two failing.
Create STEP2.txt with content "phase-2-done".

IMPORTANT: Only create ONE file per attempt. The checks are sequential
gates — you MUST fail phase-two on attempt 1 so the framework schedules
Attempt 2.
