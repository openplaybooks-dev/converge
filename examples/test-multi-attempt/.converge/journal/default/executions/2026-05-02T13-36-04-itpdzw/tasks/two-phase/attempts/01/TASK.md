# Task: two-phase

CRITICAL: You MUST take exactly 2 attempts to complete this task.

The `second-attempt-gate` check verifies that the `attempts/01/` directory
exists. This directory is ONLY created after attempt 1 completes and is
archived. It CANNOT pass during attempt 1 — forcing a genuine retry.

Attempt 1: Create ONLY STEP1.txt with "phase-1-done". STOP — do NOT create
           STEP2.txt. The second-attempt-gate will fail. Let the attempt end.
Attempt 2: FEEDBACK.md will show second-attempt-gate failed. Now create
           STEP2.txt with "phase-2-done". The attempts/01/ dir now exists,
           so all checks pass.