---
id: "rig-{{id}}"
title: "Auto-rig: {{id}}"
wbs:
  type: shell
  path: scripts/meshy_step.js
  args: ["{{id}}", "rig"]
outputs:
  - "assets/characters/{{id}}/rigged.glb"
checks:
  - id: rigged-glb-valid
    cmd: |
      node -e "const fs=require('fs');const b=fs.readFileSync('assets/characters/{{id}}/rigged.glb');if(b.readUInt32LE(0)!==0x46546c67)process.exit(1)"
    description: rigged.glb is a valid GLB
tags: [meshy, rig]
---
