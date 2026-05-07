---
id: claude-hello
title: Create CLAUDE_READY.txt
agent: claude
checks:
  - id: claude-exists
    cmd: test -f CLAUDE_READY.txt
    description: CLAUDE_READY.txt exists
---

Create a file called `CLAUDE_READY.txt` in the project root with the content `claude-done`.
