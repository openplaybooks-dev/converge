---
id: hello
title: Hello task
agent: codex
outputs:
  - READY.txt
checks:
  - id: file-exists
    cmd: test -f READY.txt
    description: READY.txt exists
  - id: has-content
    cmd: grep -q "codex-ready" READY.txt
    description: File contains codex-ready
---

Create a file called READY.txt in the project root with the content
"codex-ready". This is a simple one-shot task to verify the Codex
backend is wired correctly.
