---
id: claude-hello
title: Create CLAUDE_READY.txt
ai:
  provider: claude
  timeoutMs: 180000
checks:
  - id: claude-exists
    cmd: test -f CLAUDE_READY.txt
    description: CLAUDE_READY.txt exists
---

Create a file called `CLAUDE_READY.txt` in the project root with the content `claude-done`.
