---
id: "refine-{{id}}"
title: "Meshy refine: {{id}}"
wbs:
  type: shell
  path: scripts/meshy_step.js
  args: ["{{id}}", "refine"]
outputs:
  - "assets/characters/{{id}}/model.glb"
checks:
  - id: model-glb-valid
    cmd: |
      node -e "const fs=require('fs');const b=fs.readFileSync('assets/characters/{{id}}/model.glb');if(b.readUInt32LE(0)!==0x46546c67)process.exit(1)"
    description: model.glb is a valid GLB
tags: [meshy, refine]
---
