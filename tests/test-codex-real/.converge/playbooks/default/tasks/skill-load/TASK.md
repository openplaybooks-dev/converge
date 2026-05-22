---
id: skill-load
title: Skill load test
agent: codex
inputs:
  - .agents
outputs:
  - SKILL_LOADED.txt
checks:
  - id: skill-file-exists
    cmd: test -f SKILL_LOADED.txt
    description: SKILL_LOADED.txt exists (skill was loaded)
  - id: skill-result-pass
    cmd: grep -q "PASS" SKILL_LOADED.txt
    description: Skill verification passed
---

Use the hello-checker skill to verify the file .agents exists
and contains the content "codex-ready". Write the verification
result to SKILL_LOADED.txt (one word: PASS or FAIL).
