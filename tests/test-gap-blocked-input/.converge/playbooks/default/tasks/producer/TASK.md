---
id: producer
title: Producer task
outputs:
  - INPUT_FILE.txt
checks:
  - id: correct-output
    cmd: test -f INPUT_FILE.txt && grep -q "producer-ok" INPUT_FILE.txt
    description: INPUT_FILE.txt exists with correct content
---

Create INPUT_FILE.txt with content "producer-ok".

FIRST ATTEMPT: Create WRONG_FILE.txt instead of INPUT_FILE.txt.
This will cause an output gap that blocks the consumer.

SECOND ATTEMPT: After receiving FEEDBACK, create INPUT_FILE.txt with
content "producer-ok".
