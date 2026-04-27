---
id: "preview-{{id}}"
title: "Meshy preview: {{id}}"
wbs:
  type: shell
  path: scripts/meshy_step.js
  args: ["{{id}}", "preview"]
outputs:
  - "assets/characters/{{id}}/preview.glb"
  - "assets/characters/{{id}}/meshy.json"
checks:
  - id: preview-glb-valid
    cmd: |
      node -e "const fs=require('fs');const b=fs.readFileSync('assets/characters/{{id}}/preview.glb');if(b.readUInt32LE(0)!==0x46546c67)process.exit(1)"
    description: preview.glb is a valid GLB
tags: [meshy, preview]
---
