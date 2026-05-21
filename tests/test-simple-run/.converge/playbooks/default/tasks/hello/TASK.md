---
id: hello
title: Hello task
outputs:
  - READY.txt
checks:
  - id: file-exists
    cmd: test -f READY.txt
    description: READY.txt exists
  - id: has-content
    cmd: grep -q "ready" READY.txt
    description: File has correct content
---

Create a file called READY.txt in the project root with the content
"ready". This is a simple one-shot task.
