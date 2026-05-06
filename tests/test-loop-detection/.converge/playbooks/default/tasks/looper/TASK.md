---
id: looper
title: Loop detection test
checks:
  - id: content-ok
    cmd: test -f DATA.txt && grep -q "correct-value" DATA.txt
    description: DATA.txt exists with correct-value
  - id: loop-hint-exists
    cmd: |
      learn_files=$(find .converge/journal -name LEARN.md -path "*/attempts/*" 2>/dev/null)
      found=0
      for f in $learn_files; do
        if grep -qi "Loop hint\|thrashed\|repeated\|previous attempt" "$f" 2>/dev/null; then
          found=1
          break
        fi
      done
      test "$found" = "1"
    description: LEARN.md contains loop hint proving loop detection ran
---

Create DATA.txt with content "correct-value".

IMPORTANT FOR LOOP DETECTION:
This task tests the framework's loop detection. To trigger it:

1. Write DATA.txt with content "correct-value".
2. Read DATA.txt to verify: cat DATA.txt
3. Run the check: test -f DATA.txt && grep -q "correct-value" DATA.txt
4. Run the check multiple times — this generates repeated tool-call signatures
   that the loop detector looks for (5+ similar calls).
5. If the check fails at any point, tweak DATA.txt and re-check.

The loop-hint-exists check verifies that LEARN.md contains a loop-related hint.
On attempt 1, this check will fail (loop hint not yet generated).
On attempt 2, it should pass because the loop detector appended a hint.
