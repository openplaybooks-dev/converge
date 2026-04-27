---
title: Phase 04 — Drop MC-only components, libs, and routes
blocking: true
---

Hard-delete MC-domain modules. Each leaf's `outputs:` declares a "deletion-marker" file that the leaf creates after the deletes succeed — this gives the pre-flight lint a positive control.
