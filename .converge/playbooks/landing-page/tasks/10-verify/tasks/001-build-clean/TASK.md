---
id: 001-build-clean
title: pnpm build succeeds with zero errors
inputs:
  - apps/landing/src
outputs:
  - apps/landing/dist
checks:
  - id: build-succeeds
    cmd: "test -d apps/landing/src && pnpm --filter @converge/landing build"
    description: pnpm build exits 0
  - id: dist-emitted
    cmd: "test -d apps/landing/dist && test -f apps/landing/dist/index.html"
    description: dist/ contains index.html
  - id: no-build-warnings
    cmd: "test -d apps/landing/src && pnpm --filter @converge/landing build 2>&1 | (! grep -iE '(warning|warn:)\\s')"
    description: build emits no warnings
---

# Build clean

The first gate of phase 10. If the build doesn't succeed cleanly, no
later check is meaningful.

## Process

```bash
pnpm --filter @converge/landing build
```

Verify:
- Exit 0
- `dist/index.html` exists
- No warnings in stdout (warnings often surface as "WARN" or "warning:")

If warnings appear, address them — they often indicate a real issue
(unresolved imports, missing types, deprecated APIs) that will become
errors in a future Astro version.

## Banned

- Suppressing warnings with `--silent`. The check explicitly greps for them.
- Skipping if `dist/` already exists. A stale dist from a previous run masks current bugs.
