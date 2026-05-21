---
id: miss-out
title: Missing output test
outputs:
  - OUTPUT.txt
checks:
  - id: output-exists
    cmd: test -f OUTPUT.txt && grep -q "task-complete" OUTPUT.txt
    description: OUTPUT.txt exists with correct content
---

Create OUTPUT.txt with content "task-complete".

FIRST ATTEMPT: Do NOT create OUTPUT.txt. Let the gap detector find it
missing. The check `output-exists` will fail.
SECOND ATTEMPT: After receiving FEEDBACK.md showing the missing-output
gap, create OUTPUT.txt with content "task-complete".
