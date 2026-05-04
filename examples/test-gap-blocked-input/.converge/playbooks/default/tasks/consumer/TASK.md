---
id: consumer
title: Consumer task — blocked until producer completes
inputs:
  - INPUT_FILE.txt
checks:
  - id: consumed-output
    cmd: test -f CONSUMED_OUTPUT.txt && grep -q "producer-ok-consumed" CONSUMED_OUTPUT.txt
    description: CONSUMED_OUTPUT.txt exists with chained content
  - id: producer-retry-gate
    cmd: "find .converge/journal -path '*/producer/attempts/02/FEEDBACK.md' 2>/dev/null | grep -q FEEDBACK"
    description: Producer ran at least twice (proves DependencyBackoffStrategy re-ran it)
---

Read INPUT_FILE.txt, append "-consumed" to its content, and write the result
to CONSUMED_OUTPUT.txt.

Do NOT create INPUT_FILE.txt yourself — the producer task creates it.

The `producer-retry-gate` check verifies that the producer was re-run by the
DependencyBackoffStrategy. If the producer only ran once, this check fails.
