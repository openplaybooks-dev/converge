---
id: 02-preview
title: Generate HTML preview from greeting JSON
depends_on: [01-greet]
outputs:
  - output/greeting.preview.html
checks:
  - id: preview-exists
    cmd: test -f output/greeting.preview.html
    description: output/greeting.preview.html exists
---

Read output/greeting.json and produce output/greeting.preview.html per the spec.