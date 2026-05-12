---
description: >
  Final audit: verify core repo is clean, all 13 split projects exist under
  ../myanlabs and are production-ready, and generate the split report.
inputs:
  - . (core monorepo)
  - ../myanlabs/ (13 extracted projects)
outputs:
  - .converge/playbooks/repo-split/SPLIT-REPORT.md
checks:
  - id: core-clean
    cmd: test ! -d apps && test $(ls -1 examples/ 2>/dev/null | wc -l) -eq 16
  - id: myanlabs-has-13-projects
    cmd: test $(find ../myanlabs/examples ../myanlabs/apps -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l) -eq 13
  - id: split-report-exists
    cmd: test -s .converge/playbooks/repo-split/SPLIT-REPORT.md
children:
  - 40a-verify-core
  - 40b-verify-examples
  - 40c-verify-apps
  - 40d-final-report
depends_on:
  - 10-strip-core
---

Final audit across the core repo and local `../myanlabs` repo.

Children verify:
- 40a: Core monorepo builds and is clean
- 40b: All 10 complex example extractions are valid
- 40c: All 3 app extractions are valid
- 40d: Generate SPLIT-REPORT.md with all URLs

Convergence: read each child's output, confirm all checks pass, and write the final report.
