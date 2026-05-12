---
description: >
  Generate SPLIT-REPORT.md listing the 13 extracted local projects, core
  cleanup status, and remaining manual publish steps.
inputs:
  - ../myanlabs/
outputs:
  - .converge/playbooks/repo-split/SPLIT-REPORT.md
checks:
  - id: report-exists
    cmd: test -s .converge/playbooks/repo-split/SPLIT-REPORT.md
  - id: report-has-13-projects
    cmd: grep -E "^\| .* \| \.\./myanlabs/" .converge/playbooks/repo-split/SPLIT-REPORT.md | wc -l | grep -q "13"
depends_on:
  - 40a-verify-core
  - 40b-verify-examples
  - 40c-verify-apps
---

Generate `.converge/playbooks/repo-split/SPLIT-REPORT.md`.

The report should include:

```markdown
# Repo Split Report

Generated: <date>

## Summary

Split larger converge projects into local sibling repo `../myanlabs`.

| Category | Count |
|---|---:|
| Complex examples | 10 |
| Apps | 3 |
| Total extracted projects | 13 |
| Examples staying in converge | 16 |
| Stubs removed from converge | 3 |

## Extracted Projects

| Kind | Project | Local path | Status |
|---|---|---|---|
| Example | game-aiwolf | ../myanlabs/examples/game-aiwolf | verified |
...

## Core Repo

Record whether `apps/` is removed, `examples/` has 16 entries, and build/test
checks passed.

## Manual Follow-up

List any publish decisions still needed, such as remote GitHub repo creation or
planner dependency publication.
```

Fill status from sibling verification task outputs.
