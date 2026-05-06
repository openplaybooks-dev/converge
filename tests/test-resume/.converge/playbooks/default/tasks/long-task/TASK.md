---
id: long-task
title: Long-running resumable task
checks:
  - id: all-steps
    cmd: test -f STEP-1.txt && test -f STEP-2.txt && test -f STEP-3.txt
    description: All three steps exist
---

Create three files in order:
1. STEP-1.txt with "step-1-complete"
2. STEP-2.txt with "step-2-complete"
3. STEP-3.txt with "step-3-complete"

This simulates a long-running task that can be killed and resumed.
