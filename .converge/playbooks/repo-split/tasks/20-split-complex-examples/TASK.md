---
description: >
  Copy 10 complex examples into the local ../myanlabs repo.
  Each child handles one example: copy content, remove generated/runtime
  artifacts, add missing scaffolding, and verify the extracted project.
inputs:
  - examples/<name>/ (original content for each example)
outputs:
  - ../myanlabs/examples/<name>/ (10 extracted examples)
checks:
  - id: all-10-examples-exist
    cmd: |
      for repo in game-aiwolf game-assets-3d baby-app stitch-to-flutter-baby-watch-v2 \
                  autonomous-pentest cinematic-video-production financial-deep-research \
                  converge-design unity-remix unity-mono-remix; do
        test -d "../myanlabs/examples/$repo" || exit 1
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
  - 05-prepare-target
---

Copy 10 complex standalone examples into `../myanlabs/examples/`. Each child
task follows the same pattern:

1. Copy content from `examples/<name>/` to `../myanlabs/examples/<name>/` with
   `rsync -a --delete`.
2. Exclude nested `.git`, dependency caches, build outputs, logs, Converge
   runtime state (`.converge/journal/`, `.converge/artifacts/`), and other
   generated bulk.
3. Preserve source dotfiles such as `.converge`, `.claude`, `.stitch`, and
   existing `.github` metadata unless explicitly generated/runtime-only.
4. Add missing scaffolding: LICENSE, tech-appropriate `.gitignore`, README
   updates only when needed, and optional CI workflow if the project can build
   independently.
5. Verify the extracted local path, required files, and no `workspace:*`
   dependencies unless intentionally documented.

Convergence: after all children complete, verify every local extraction exists
under `../myanlabs/examples/`. Read each child's verification output and
confirm no gaps.
