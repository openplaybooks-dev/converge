---
id: grandchild
title: Create grand.txt
description: "Level 3 leaf task — writes grand.txt with content \"grand\""
outputs:
  - grand.txt
checks:
  - id: grand-output
    description: grand.txt exists with correct content
    cmd: "test -f grand.txt && grep -q \"grand\" grand.txt"
---

Create the file `grand.txt` with the exact content:

```
grand
```
