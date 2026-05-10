---
description: >
  Remove the 10 complex examples, all apps, and stubs from the monorepo.
  Update pnpm-workspace.yaml, README.md, and verify core still builds.
inputs:
  - examples/ (10 dirs to remove)
  - apps/ (entire dir)
  - examples/game-ai-pk/
  - examples/context-chain-demo.ts
  - pnpm-workspace.yaml
  - README.md
outputs:
  - pnpm-workspace.yaml (modified)
  - README.md (modified)
checks:
  - id: complex-examples-removed
    cmd: |
      for d in game-aiwolf game-assets-3d baby-app stitch-to-flutter-baby-watch-v2 \
               autonomous-pentest cinematic-video-production financial-deep-research \
               converge-design unity-remix unity-mono-remix; do
        test ! -d "examples/$d" || exit 1
      done
  - id: apps-removed
    cmd: test ! -d apps
  - id: stubs-removed
    cmd: test ! -d examples/game-ai-pk && test ! -f examples/context-chain-demo.ts
  - id: examples-count-is-16
    cmd: test $(ls -1 examples/ | wc -l) -eq 16
  - id: core-builds
    cmd: pnpm install && pnpm build
  - id: core-tests-pass
    cmd: pnpm test
children:
  - 10a-remove-complex-examples
  - 10b-remove-apps-dir
  - 10c-remove-stubs
  - 10d-update-pnpm-workspace
  - 10e-update-readme
  - 10f-verify-core-builds
---

Strip the monorepo down to core only. Children run in the listed order:
1. Remove files
2. Update configs
3. Verify

Convergence: after all children complete, verify every check passes. If a check fails, identify which child didn't do its job and re-run it.
