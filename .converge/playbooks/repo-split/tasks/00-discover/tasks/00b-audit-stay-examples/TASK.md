---
description: >
  Audit the 16 examples staying in the monorepo.
  Confirm each is a playbook demo, getting-started material, or superseded version.
inputs:
  - examples/ (directory listing)
outputs:
  - stay-audit.json
checks:
  - id: stay-audit-json-valid
    cmd: jq -e 'type == "array" and length == 16' stay-audit.json
skills: []
references: []
vars: {}
depends_on: []
---

Produce `stay-audit.json` — an array of 16 objects.

The 16 examples staying:
  hello-world, agentic-calculator, data-pipeline, deep-research,
  scientific-research, frontier-research, evolutionary-optimization,
  fullstack-app, social-sim, game-assets, game-assets-video,
  game-assets-3d-meshy, acp-demo, flutter-app, stitch-to-flutter,
  stitch-to-flutter-baby-watch

Record:
```json
{
  "id": "hello-world",
  "path": "examples/hello-world",
  "reason": "Getting-started example referenced in docs"
}
```

Verify each directory exists and record the reason it stays (from the plan).
Save to `stay-audit.json`.
