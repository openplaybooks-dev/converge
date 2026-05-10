---
id: opencode-hello
title: Opencode hello smoke
agent: openfn
outputs:
  - OPENCODE_READY.txt
checks:
  - id: opencode-file-exists
    cmd: test -f OPENCODE_READY.txt
    description: OPENCODE_READY.txt exists
  - id: opencode-has-content
    cmd: grep -q "opencode-done" OPENCODE_READY.txt
    description: File contains opencode-done
---

Create a file called `OPENCODE_READY.txt` in the project root with the content
`opencode-done`. This verifies that Converge can route a task through
Opencode/openfn while using the Opencode model configured in project.yaml.
