---
description: Remove the 10 complex example directories from examples/
inputs:
  - examples/
outputs:
  - examples/ (10 dirs removed)
checks:
  - id: all-10-removed
    cmd: |
      for d in game-aiwolf game-assets-3d baby-app stitch-to-flutter-baby-watch-v2 \
               autonomous-pentest cinematic-video-production financial-deep-research \
               converge-design unity-remix unity-mono-remix; do
        test ! -d "examples/$d" || exit 1
      done
skills: []
references: []
vars: {}
depends_on: []
---

Remove these 10 directories from `examples/`:
  game-aiwolf
  game-assets-3d
  baby-app
  stitch-to-flutter-baby-watch-v2
  autonomous-pentest
  cinematic-video-production
  financial-deep-research
  converge-design
  unity-remix
  unity-mono-remix

```bash
cd examples
for d in game-aiwolf game-assets-3d baby-app stitch-to-flutter-baby-watch-v2 \
         autonomous-pentest cinematic-video-production financial-deep-research \
         converge-design unity-remix unity-mono-remix; do
  rm -rf "$d"
done
```

Verify each is gone with the check command.
