---
description: >
  Final audit: verify core repo is clean, all 13 split repos exist and are
  production-ready, and generate the split report.
inputs:
  - . (core monorepo)
  - (13 remote repos on GitHub)
outputs:
  - .converge/playbooks/repo-split/SPLIT-REPORT.md
checks:
  - id: core-clean
    cmd: test ! -d apps && test $(ls -1 examples/ 2>/dev/null | wc -l) -eq 16
  - id: split-report-exists
    cmd: test -s SPLIT-REPORT.md
children:
  - 40a-verify-core
  - 40b-verify-examples
  - 40c-verify-apps
  - 40d-final-report
depends_on:
  - 20-split-complex-examples
  - 30-split-apps
---

Final audit across all repos.

Children verify:
- 40a: Core monorepo builds and is clean
- 40b: All 10 complex example repos are valid
- 40c: All 3 app repos are valid
- 40d: Generate SPLIT-REPORT.md with all URLs

Convergence: read each child's output, confirm all checks pass, and write the final report.
