---
id: 03-design
title: Design system specification
depends_on:
  - 02-research-review
mode: leaf
outputs:
  - docs/design-report.html
checks:
  - id: report-exists
    cmd: test -f docs/design-report.html
---

Design the system based on research findings and produce a structured HTML report at `docs/design-report.html`.
