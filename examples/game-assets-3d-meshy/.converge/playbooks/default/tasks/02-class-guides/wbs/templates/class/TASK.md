---
id: "class-{{cls}}"
title: "Class style guide: {{cls}}"
wbs:
  type: shell
  path: scripts/build_class_guide.js
  args: ["{{cls}}"]
outputs:
  - "assets/shared/classes/{{cls}}/reference.png"
  - "assets/shared/classes/{{cls}}/style-guide.md"
checks:
  - id: reference-png-valid
    cmd: |
      node -e "const fs=require('fs');const b=fs.readFileSync('assets/shared/classes/{{cls}}/reference.png');if(b.readUInt32LE(0)!==0x474e5089)process.exit(1)"
    description: reference.png is a valid PNG (magic bytes 0x89504E47)
  - id: style-guide-exists
    cmd: test -s "assets/shared/classes/{{cls}}/style-guide.md"
    description: style-guide.md is non-empty
tags: [style]
---

Runs `scripts/build_class_guide.js {{cls}}`. See parent `02-class-guides/TASK.md` for purpose.
