---
id: buggy
title: Buggy check test
outputs:
  - REPORT.md
checks:
  - id: wrong-check
    cmd: test -f NONEXISTENT_FLAG.txt
    description: Deliberately wrong check — will be relaxed by framework
  - id: real-check
    cmd: test -f REPORT.md && grep -q "analysis complete" REPORT.md
    description: REPORT.md exists with correct content
---

Create REPORT.md with content "analysis complete".

There is a check called "wrong-check" that looks for a file called
NONEXISTENT_FLAG.txt which this task does NOT create. This check will
always fail.

FIRST ATTEMPT:
1. Create REPORT.md with content "analysis complete".
2. After creation, write BUGGY_CHECK.md in the wip directory (the same
directory where CHECK.md is located) with this content:

---
check_id: wrong-check
reason: "Check looks for a file this task does not create"
proposed_cmd: test -f REPORT.md && grep -q "analysis complete" REPORT.md
---

The framework will validate and apply the relaxed check for attempt 2.

SECOND ATTEMPT:
Both checks should pass since the relaxed wrong-check now matches real-check.
