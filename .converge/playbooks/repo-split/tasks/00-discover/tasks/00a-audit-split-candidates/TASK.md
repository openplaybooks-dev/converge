---
description: >
  Audit the 10 complex examples + 3 apps being split out.
  Verify each exists on disk, has content beyond stubs, and note
  what scaffolding is missing.
inputs:
  - examples/ (directory listing)
  - apps/ (directory listing)
outputs:
  - audit.json
checks:
  - id: audit-json-valid
    cmd: jq -e 'type == "array" and length == 13' audit.json
  - id: all-paths-exist
    cmd: jq -e '.[].path' audit.json | while read p; do test -d "$p" || test -f "$p" || exit 1; done
skills: []
references: []
vars: {}
depends_on: []
---

Produce `audit.json` — an array of 13 objects, one per split candidate.

For each of the 10 complex examples:
  game-aiwolf, game-assets-3d, baby-app, stitch-to-flutter-baby-watch-v2,
  autonomous-pentest, cinematic-video-production, financial-deep-research,
  converge-design, unity-remix, unity-mono-remix

And each of the 3 apps:
  landing, planner, playbooks-to

Record:
```json
{
  "id": "game-aiwolf",
  "path": "examples/game-aiwolf",
  "type": "claude-code",
  "hasReadme": true,
  "hasLicense": true,
  "hasGitignore": false,
  "hasCi": true,
  "hasPackageJson": false,
  "missingScaffolding": [".gitignore", "ci.yml (needs adaptation)"],
  "notes": "Has nested .git — must exclude from new repo"
}
```

Run: ls, test -f, and jq to build the JSON. Save to `audit.json`.
