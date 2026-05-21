---
id: claude-hello
title: Claude hello test
agent: claude
outputs:
  - CLAUDE_READY.txt
checks:
  - id: claude-file-exists
    cmd: test -f CLAUDE_READY.txt
    description: CLAUDE_READY.txt exists
  - id: claude-has-content
    cmd: grep -q "claude-done" CLAUDE_READY.txt
    description: File contains claude-done
---

Create a file called CLAUDE_READY.txt in the project root with the content
"claude-done". This is a simple one-shot task to verify the Claude
backend is wired correctly.
