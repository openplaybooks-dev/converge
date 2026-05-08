---
id: 001-prd
title: Child task — creates PRD.txt
depends_on: []
outputs:
  - PRD.txt
checks:
  - id: prd-exists
    cmd: test -f PRD.txt
    description: PRD.txt exists
---

Create a file called `PRD.txt` in the project root with the content `product requirements document`.
