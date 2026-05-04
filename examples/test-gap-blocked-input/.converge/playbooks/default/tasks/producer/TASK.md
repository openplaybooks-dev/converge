---
id: producer
title: Producer task — intentionally wrong on attempt 1
checks:
  - id: correct-output
    cmd: test -f INPUT_FILE.txt && grep -q "producer-ok" INPUT_FILE.txt
    description: INPUT_FILE.txt exists with correct content
---

Create INPUT_FILE.txt with content "producer-ok".

CRITICAL: You MUST fail on attempt 1 so the DependencyBackoffStrategy fires.

- Attempt 1: Create WRONG_FILE.txt instead of INPUT_FILE.txt.
  The `correct-output` check will fail because INPUT_FILE.txt doesn't exist.
- Attempt 2: The FEEDBACK will show the failure. Now create INPUT_FILE.txt
  with content "producer-ok".
