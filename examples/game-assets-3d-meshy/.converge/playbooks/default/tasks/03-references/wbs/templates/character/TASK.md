---
id: "ref-{{id}}"
title: "Character reference: {{id}}"
wbs:
  type: shell
  path: scripts/build_character_ref.js
  args: ["{{id}}"]
outputs:
  - "assets/characters/{{id}}/reference.png"
  - "assets/characters/{{id}}/SPEC.md"
checks:
  - id: reference-png-valid
    cmd: |
      node -e "const fs=require('fs');const b=fs.readFileSync('assets/characters/{{id}}/reference.png');if(b.readUInt32LE(0)!==0x474e5089)process.exit(1)"
    description: reference.png is a valid PNG
  - id: spec-exists
    cmd: test -s "assets/characters/{{id}}/SPEC.md"
    description: SPEC.md is non-empty
tags: [reference, "{{cls}}"]
---

Runs `scripts/build_character_ref.js {{id}}`. Attaches `assets/shared/classes/{{cls}}/reference.png` as the Gemini reference so the character matches its class style.
