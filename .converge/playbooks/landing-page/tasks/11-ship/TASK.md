---
id: 11-ship
title: Phase 11 — Ship to Cloudflare Pages (wrangler config, headers, deploy preview, checklist)
blocking: true
dependencies: [10-verify]
inputs:
  - apps/landing/.verify-passed
  - apps/landing/dist
outputs:
  - apps/landing/wrangler.toml
  - apps/landing/public/_headers
  - LAUNCH-CHECKLIST.md
---

The deploy phase. Blocked behind 10-verify's `.verify-passed` marker —
if the verify phase didn't pass, this phase never runs.

Four leaf tasks (sequential):

1. **001-wrangler-config** — `wrangler.toml` for Cloudflare Pages project name, build output dir, environment.
2. **002-cloudflare-headers** — `public/_headers` for cache-control + security headers (CSP, X-Content-Type-Options, etc.).
3. **003-deploy-preview** — `wrangler pages deploy` to a preview environment. Returns a preview URL.
4. **004-launch-checklist** — emit `LAUNCH-CHECKLIST.md` at the repo root with manual post-deploy verification steps (DNS, OG validators, etc.).

## Hard gate

This phase's epic-level check verifies `apps/landing/.verify-passed`
exists. If phase 10 didn't write it, no task in phase 11 runs.
