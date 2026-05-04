---
check_id: wrong-check
reason: "Check looks for a file this task does not create"
proposed_cmd: test -f REPORT.md && grep -q "analysis complete" REPORT.md
---
