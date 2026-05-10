---
description: >
  Create individual GitHub repos for 10 complex examples.
  Each child handles one example: create gh repo, copy content,
  add scaffolding, init git, push.
inputs:
  - examples/<name>/ (original content for each example)
outputs:
  - github.com/minhlucvan/<name> (10 remote repos created)
checks:
  - id: all-10-repos-exist
    cmd: |
      for repo in game-aiwolf game-assets-3d baby-app stitch-to-flutter-baby-watch-v2 \
                  autonomous-pentest cinematic-video-production financial-deep-research \
                  converge-design unity-remix unity-mono-remix; do
        gh repo view "minhlucvan/$repo" --json name >/dev/null 2>&1 || exit 1
      done
children:
  - 20a-game-aiwolf
  - 20b-game-assets-3d
  - 20c-baby-app
  - 20d-baby-watch-v2
  - 20e-autonomous-pentest
  - 20f-cinematic-video-production
  - 20g-financial-deep-research
  - 20h-converge-design
  - 20i-unity-remix
  - 20j-unity-mono-remix
depends_on:
  - 10-strip-core
---

Create 10 GitHub repos for complex standalone examples. Each child task follows the same pattern:

1. `gh repo create minhlucvan/<name> --public --description "<desc>"`
2. Copy content from `examples/<name>/` to a temp directory
3. Remove converge runtime state (`.converge/journal/`, `.converge/artifacts/`) — keep `.converge/playbooks/` and `.converge/project.yaml`
4. Add missing scaffolding: LICENSE (MIT), .gitignore (tech-appropriate), `.github/workflows/ci.yml`
5. `cd <tmpdir> && git init && git add -A && git commit -m "Initial commit: extract <name> from converge monorepo" && git push -u origin main`
6. `gh repo view minhlucvan/<name>` to verify

Convergence: after all children complete, verify every repo exists on GitHub. Read each child's verification output and confirm no gaps.
