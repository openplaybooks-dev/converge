---
id: codex-hello
title: Codex hello test
agent: codex
outputs:
  - CODEX_READY.txt
checks:
  - id: codex-file-exists
    cmd: test -f CODEX_READY.txt
    description: CODEX_READY.txt exists
  - id: codex-has-content
    cmd: grep -q "codex-done" CODEX_READY.txt
    description: File contains codex-done
---

Create a file called CODEX_READY.txt in the project root with the content
"codex-done". This is a simple one-shot task to verify the Codex
backend is wired correctly.
