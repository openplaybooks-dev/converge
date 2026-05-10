---
description: >
  Generate SPLIT-REPORT.md listing all 13 created repos with URLs,
  descriptions, and verification status.
inputs: []
outputs:
  - ../../../SPLIT-REPORT.md
checks:
  - id: report-exists
    cmd: test -s ../../../SPLIT-REPORT.md
  - id: report-has-13-repos
    cmd: grep -c "github.com/minhlucvan/" ../../../SPLIT-REPORT.md | grep -q "13"
skills: []
references: []
vars: {}
depends_on:
  - 40a-verify-core
  - 40b-verify-examples
  - 40c-verify-apps
---

Generate the final split report at `.converge/playbooks/repo-split/SPLIT-REPORT.md`.

Contents:

```markdown
# Repo Split Report

Generated: <date>

## Summary

Split the converge monorepo into 13 individual GitHub repositories.

| Category | Count |
|---|---|
| Complex examples | 10 |
| Apps | 3 |
| **Total split repos** | **13** |
| Examples staying in core | 16 |
| Stubs removed | 3 |

## Created Repositories

### Complex Examples

| # | Repo | URL | Description |
|---|---|---|---|
| 1 | game-aiwolf | https://github.com/minhlucvan/game-aiwolf | Claude Code Game Studio — 41 sub-agents |
| 2 | game-assets-3d | https://github.com/minhlucvan/game-assets-3d | TypeScript 3D Lego-block library |
| 3 | baby-app | https://github.com/minhlucvan/baby-app | Flutter novel-reader mobile app |
| 4 | stitch-to-flutter-baby-watch-v2 | https://github.com/minhlucvan/stitch-to-flutter-baby-watch-v2 | Child safety BLE beacon app |
| 5 | autonomous-pentest | https://github.com/minhlucvan/autonomous-pentest | 6-stage autonomous pentesting |
| 6 | cinematic-video-production | https://github.com/minhlucvan/cinematic-video-production | AI film director |
| 7 | financial-deep-research | https://github.com/minhlucvan/financial-deep-research | Python equity research |
| 8 | converge-design | https://github.com/minhlucvan/converge-design | Design/landing page generator |
| 9 | unity-remix | https://github.com/minhlucvan/unity-remix | Unity il2cpp game analysis |
| 10 | unity-mono-remix | https://github.com/minhlucvan/unity-mono-remix | Unity Mono game analysis |

### Apps

| # | Repo | URL | Description |
|---|---|---|---|
| 1 | converge-landing | https://github.com/minhlucvan/converge-landing | Landing page (Astro + Cloudflare) |
| 2 | playbooks-to | https://github.com/minhlucvan/playbooks-to | Playbooks directory site (Astro + Cloudflare) |
| 3 | converge-planner | https://github.com/minhlucvan/converge-planner | DAG planner UI (Next.js) |

## Core Repo

The core framework remains at `minhlucvan/converge` with:
- 16 packages in `packages/`
- 16 examples in `examples/`
- Tests, docs, scripts, skills

## Verification Status

All 13 repos verified with README, LICENSE, .gitignore, and CI workflow.
```

Fill in the actual verification status from the sibling tasks' outputs.
Save to `.converge/playbooks/repo-split/SPLIT-REPORT.md`.
