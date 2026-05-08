---
id: codex-hello
title: Create CODEX_READY.txt
ai:
  provider: codex
  timeoutMs: 180000
checks:
  - id: codex-exists
    cmd: test -f CODEX_READY.txt
    description: CODEX_READY.txt exists
---

Create a file called `CODEX_READY.txt` in the project root with the content `codex-done`.
