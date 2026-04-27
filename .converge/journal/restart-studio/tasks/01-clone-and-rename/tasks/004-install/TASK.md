---
id: 004-install
title: pnpm install at workspace root
dependencies:
  - 002-rename-package
outputs:
  - packages/studio/node_modules
checks:
  - id: install-success
    description: packages/studio has node_modules linked or symlinked
    cmd: "test -e packages/studio/node_modules || test -d node_modules/@converge/studio"
---

Run `pnpm install` at the workspace root so the new package's deps resolve.

```bash
pnpm install
```

If the install reports a missing dep, surface in INTERRUPTED.md — likely a peer dep we missed in 002-rename-package.
