---
id: child-beta
title: Create beta.txt
description: "Write beta.txt with content \"beta\""
outputs:
  - beta.txt
checks:
  - id: beta-output
    description: beta.txt exists with correct content
    cmd: "test -f beta.txt && grep -q \"beta\" beta.txt"
---

Create the file `beta.txt` with the exact content:

```
beta
```
