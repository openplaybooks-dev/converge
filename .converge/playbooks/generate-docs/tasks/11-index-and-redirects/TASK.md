---
id: 11-index-and-redirects
title: Phase 11 — Root index + redirects
blocking: true
dependencies: [10-cross-validate]
outputs:
  - docs/index.md
  - docs/_redirects.json
---

The final cosmetic phase. Two leaves.

1. **001-index** — `docs/index.md`, the root landing page (what users see at `/docs`).
2. **002-redirects** — `docs/_redirects.json`, mapping from legacy doc URLs to current pages.
