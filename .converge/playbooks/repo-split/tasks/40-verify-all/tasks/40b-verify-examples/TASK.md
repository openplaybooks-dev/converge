---
description: >
  Verify all 10 complex examples exist under ../myanlabs/examples and have
  standalone project scaffolding.
inputs:
  - ../myanlabs/examples/
outputs:
  - (none - verification only)
checks:
  - id: all-example-dirs-exist
    cmd: |
      for repo in game-aiwolf game-assets-3d baby-app stitch-to-flutter-baby-watch-v2 \
                  autonomous-pentest cinematic-video-production financial-deep-research \
                  converge-design unity-remix unity-mono-remix; do
        test -d "../myanlabs/examples/$repo" || exit 1
      done
  - id: examples-have-readmes
    cmd: |
      for repo in game-aiwolf game-assets-3d baby-app stitch-to-flutter-baby-watch-v2 \
                  autonomous-pentest cinematic-video-production financial-deep-research \
                  converge-design unity-remix unity-mono-remix; do
        test -s "../myanlabs/examples/$repo/README.md" || exit 1
      done
  - id: examples-have-licenses
    cmd: |
      for repo in game-aiwolf game-assets-3d baby-app stitch-to-flutter-baby-watch-v2 \
                  autonomous-pentest cinematic-video-production financial-deep-research \
                  converge-design unity-remix unity-mono-remix; do
        test -s "../myanlabs/examples/$repo/LICENSE" || exit 1
      done
  - id: no-nested-git
    cmd: '! find ../myanlabs/examples -mindepth 2 -name .git -type d | grep .'
depends_on: []
---

Verify every extracted example under `../myanlabs/examples/`.

Required:
- Directory exists.
- `README.md` and `LICENSE` exist.
- No nested `.git` directories were copied.
- Generated bulk such as `node_modules/`, Flutter `build/`, Unity `Library/`,
  and `.converge/journal/` is absent unless a task documents why it must stay.

Do not modify source from this verification task. Report gaps to the specific
split child task.
