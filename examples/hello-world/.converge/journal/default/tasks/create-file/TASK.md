---
id: create-file
title: Create output file
checks:
  - id: file-created
    cmd: test -f output.txt
    description: output.txt exists
---

Create a file called `output.txt` in the project root with the content:

```
Hello from Converge!
```
