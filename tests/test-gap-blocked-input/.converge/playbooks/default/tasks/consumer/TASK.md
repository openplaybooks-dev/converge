---
id: consumer
title: Consumer task
inputs:
  - INPUT_FILE.txt
outputs:
  - CONSUMED_OUTPUT.txt
checks:
  - id: consumed-output
    cmd: test -f CONSUMED_OUTPUT.txt && grep -q "producer-ok-consumed" CONSUMED_OUTPUT.txt
    description: CONSUMED_OUTPUT.txt exists with chained content
---

Read INPUT_FILE.txt, append "-consumed" to its content, and write the
result to CONSUMED_OUTPUT.txt.

Do NOT create create INPUT_FILE— the producer creates it. Wait for it
to exist before proceeding.
