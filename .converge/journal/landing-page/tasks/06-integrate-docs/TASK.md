---
id: 06-integrate-docs
title: Phase 06 — Wire Starlight to render docs/ at /docs/* (consumer of docs/)
blocking: true
dependencies: [05-build-layout]
inputs:
  - docs
  - docs/_ia.json
  - docs/_redirects.json
outputs:
  - apps/landing/src/content/config.ts
  - apps/landing/astro.config.mjs
  - apps/landing/public/_redirects
---

Mount Astro Starlight as the `/docs/*` route, configured to **read directly
from `docs/`** at the repo root via `docsLoader()`. The `docs` playbook
owns content; this phase is a pure consumer.

`/docs` and the marketing landing share the same Astro app — Starlight is
an Astro integration. We point its `docsLoader()` at the repo's `docs/`
directory (excluding `_internal/`, `_*.json`, etc.) so any re-run of the
`docs` playbook flows through to the next site rebuild without a porting
step.

Four leaf tasks (sequential):

1. **001-starlight-mount** — install `@astrojs/starlight` (already added in phase 02 but verify), register integration in `astro.config.mjs`, mount under `/docs`.
2. **002-sidebar-from-ia** — read `docs/_ia.json` (owned by docs playbook), build Starlight `sidebar:` from it, configure `docsLoader()` to source from the repo's `docs/` directory.
3. **003-pagefind-search** — enable Pagefind (Starlight's built-in search).
4. **004-redirects** — set up canonical redirects (`/docs` → `/docs/getting-started/why-converge`); merge `docs/_redirects.json` into Cloudflare `public/_redirects`.
