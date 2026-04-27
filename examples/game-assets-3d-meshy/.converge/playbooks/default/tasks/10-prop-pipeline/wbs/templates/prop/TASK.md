---
id: "prop-{{id}}"
title: "Prop pipeline: {{id}}"
wbs:
  type: shell
  path: scripts/run_prop.sh
  args: ["{{id}}"]
outputs:
  - "assets/props/{{id}}/reference.png"
  - "assets/props/{{id}}/model.glb"
checks:
  - id: prop-ref-png
    cmd: |
      node -e "const fs=require('fs');const b=fs.readFileSync('assets/props/{{id}}/reference.png');if(b.readUInt32LE(0)!==0x474e5089)process.exit(1)"
    description: reference.png is a valid PNG
  - id: prop-model-glb
    cmd: |
      node -e "const fs=require('fs');const b=fs.readFileSync('assets/props/{{id}}/model.glb');if(b.readUInt32LE(0)!==0x46546c67)process.exit(1)"
    description: model.glb is a valid GLB
tags: [prop, meshy]
---

Runs `scripts/run_prop.sh {{id}}`, which sequences:

1. `scripts/build_prop_ref.js {{id}}` (nanobanana reference image)
2. `scripts/meshy_step.js {{id}} preview` (image-to-3D preview)
3. `scripts/meshy_step.js {{id}} refine` (PBR-textured refine)
