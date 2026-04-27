---
id: "anim-{{id}}-{{action}}"
title: "Animation: {{id}} / {{action}}"
wbs:
  type: shell
  path: scripts/meshy_step.js
  args: ["{{id}}", "animate", "{{action}}"]
outputs:
  - "assets/characters/{{id}}/anims/{{action}}.glb"
checks:
  - id: anim-glb-valid
    cmd: |
      node -e "const fs=require('fs');const b=fs.readFileSync('assets/characters/{{id}}/anims/{{action}}.glb');if(b.readUInt32LE(0)!==0x46546c67)process.exit(1)"
    description: animation glb is valid
tags: [meshy, animate]
---
