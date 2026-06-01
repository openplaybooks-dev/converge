---
id: 01-research
title: Market research analysis
depends_on: []
mode: task
outputs:
  - docs/research-report.html
checks:
  - id: report-exists
    cmd: test -f docs/research-report.html
---

Conduct market research and produce a structured HTML report at `docs/research-report.html`.
