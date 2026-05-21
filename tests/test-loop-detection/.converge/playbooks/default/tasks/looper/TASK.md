---
id: looper
title: Loop detection test
outputs:
  - DATA.txt
checks:
  - id: content-ok
    cmd: test -f DATA.txt && grep -q "correct-value" DATA.txt
    description: DATA.txt exists with correct-value
---

Create DATA.txt with content "correct-value".

After creating DATA.txt, verify the content by running:
  grep -q "correct-value" DATA.txt

If the check fails, rewrite DATA.txt and try again. Keep iterating:
rewrite → check → rewrite → check. Do this several times to simulate
a thrashing pattern where the agent keeps tweaking and re-checking.

On each verification iteration:
1. Read DATA.txt with: cat DATA.txt
2. Run the check: test -f DATA.txt && grep -q "correct-value" DATA.txt
3. If it still fails, rewrite DATA.txt and go back to step 1

The framework's loop detector will notice the repeated tool calls on
DATA.txt and append a "Loop hint" to LEARN.md for the next attempt.

Ultimately DATA.txt must contain "correct-value" to satisfy the check.
