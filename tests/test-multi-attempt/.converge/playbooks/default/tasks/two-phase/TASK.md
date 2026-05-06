---
id: two-phase
title: Two-phase task — MUST take 2 attempts
checks:
  - id: phase-one
    cmd: test -f STEP1.txt && grep -q "phase-1-done" STEP1.txt
    description: STEP1.txt exists
  - id: phase-two
    cmd: test -f STEP2.txt && grep -q "phase-2-done" STEP2.txt
    description: STEP2.txt exists
  - id: second-attempt-gate
    cmd: "find .converge/journal -path '*/attempts/01/FEEDBACK.md' 2>/dev/null | grep -q FEEDBACK"
    description: Attempt 1 archive exists (proves we are on attempt 2+)
---

CRITICAL: You MUST take exactly 2 attempts to complete this task.

The `second-attempt-gate` check verifies that the `attempts/01/` directory
exists. This directory is ONLY created after attempt 1 completes and is
archived. It CANNOT pass during attempt 1 — forcing a genuine retry.

Attempt 1: Create ONLY STEP1.txt with "phase-1-done". STOP — do NOT create
           STEP2.txt. The second-attempt-gate will fail. Let the attempt end.
Attempt 2: FEEDBACK.md will show second-attempt-gate failed. Now create
           STEP2.txt with "phase-2-done". The attempts/01/ dir now exists,
           so all checks pass.
