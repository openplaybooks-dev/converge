---
title: Phase 01 — Vendor Mission Control into packages/converge-studio
blocking: true
---

Fork builderz-labs/mission-control (MIT, Next.js + Tailwind + TypeScript) into `packages/converge-studio/` and rewrite identity (package name, license attribution).

Three sequential leaf tasks:

1. **001-clone-prune** — clone the upstream repo, drop `.git`, move into `packages/converge-studio/`, prune what we don't need (auth, agent registry, framework adapters, prisma/SQLite).
2. **002-package-rename** — rewrite `package.json` to `@converge/studio` with workspace deps on `@converge/core` and `@converge/project-root`.
3. **003-license-notice** — preserve upstream `LICENSE` as `LICENSE.upstream`, add `NOTICE` with attribution and upstream commit SHA, keep root MIT `LICENSE`.

This phase produces the empty shell. Phase 02 fills in the data layer.
