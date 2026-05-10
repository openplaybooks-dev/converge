---
id: deepseek-hello
title: DeepSeek hello smoke
agent: deepseek
outputs:
  - DEEPSEEK_READY.txt
checks:
  - id: deepseek-file-exists
    cmd: test -f DEEPSEEK_READY.txt
    description: DEEPSEEK_READY.txt exists
  - id: deepseek-has-content
    cmd: grep -q "deepseek-done" DEEPSEEK_READY.txt
    description: File contains deepseek-done
---

Create a file called `DEEPSEEK_READY.txt` in the project root with the content
`deepseek-done`. This verifies that the DeepSeek Anthropic-compatible
configuration is being applied to the Claude provider.
