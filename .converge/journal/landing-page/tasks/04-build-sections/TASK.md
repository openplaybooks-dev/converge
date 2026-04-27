---
id: 04-build-sections
title: Phase 04 — Build home-page sections (WBS-driven, per-section pipeline)
description: |
  Per-section vertical pipeline driven by apps/landing/.content/sections.json.
  Every section runs the same 5-step template (spec → design → build → integrate → verify).
  Sections execute sequentially: each section's 05-verify blocks the next section's 01-spec
  so src/pages/index.astro stays consistent at every checkpoint.
wbs:
  type: nodejs
  path: ./wbs/index.js
blocking: true
dependencies: [03-design-system]
tags: [sections, astro]
inputs:
  - apps/landing/.content/sections.json
  - apps/landing/.content/brand.json
  - apps/landing/src/styles/tokens.json
  - apps/landing/src/components/ui
  - apps/landing/src/components/layout
  - README.md
  - docs/concepts
  - docs/getting-started/why-converge.md
outputs:
  - apps/landing/src/components/sections/**/*.astro
  - apps/landing/src/pages/index.astro
  - apps/landing/.content/sections/**
checks:
  - id: sections-json-exists
    cmd: "test -f apps/landing/.content/sections.json"
    description: section definitions exist
  - id: every-section-has-component
    cmd: "node .converge/playbooks/landing-page/scripts/check-sections.mjs"
    description: every entry in sections.json has a matching component file mounted in index.astro
  - id: index-astro-uses-mainlayout
    cmd: "test -f apps/landing/src/pages/index.astro && grep -qE '(MainLayout|Layout)' apps/landing/src/pages/index.astro"
    description: index.astro wraps content in a Layout
  - id: astro-check-clean
    cmd: "test -f apps/landing/package.json && pnpm --filter @converge/landing astro check"
    description: astro check passes for all sections
backlogs:
  - id: lorem-ipsum
    cmd: "grep -rn 'Lorem\\|Ipsum\\|placeholder content\\|TBD\\|TODO\\|FIXME' apps/landing/src/components/sections/ 2>/dev/null || true"
    description: placeholder copy left in sections
    severity: high
  - id: hardcoded-colors
    cmd: "grep -rnE '#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\\b' apps/landing/src/components/sections/ 2>/dev/null | grep -v 'tokens' || true"
    description: hex colors outside tokens.css
    severity: medium
---

# Build sections (WBS)

This is the heart of the playbook. The WBS at `./wbs/index.js` reads
`apps/landing/.content/sections.json` and spawns:

- **Level 1:** one parent task per section (`Section: <Title>`).
- **Level 2:** 5 sequential step children per section, from
  `wbs/templates/section/tasks/{{prefix}}-{01-spec, 02-design, 03-build, 04-integrate, 05-verify}/TASK.md`.

8 sections × (1 parent + 5 children) = **48 tasks** spawned.

Sections run sequentially: section N's `05-verify` blocks section N+1's
`01-spec`. This keeps `src/pages/index.astro` consistent at every
checkpoint — at any moment, the page either has 0, 1, …, 8 sections
mounted, never a partial half-mounted section.

## Per-section pipeline

| Step | Output | Check |
|---|---|---|
| 01-spec     | `.content/sections/{id}/SPEC.md` (intent, props, content sources)        | file exists, ≥40 lines |
| 02-design   | `.content/sections/{id}/DESIGN.md` (component shape, slots, states)     | file exists, lists props |
| 03-build    | `src/components/sections/{Name}.astro`                                  | file exists, astro check passes |
| 04-integrate | section imported + rendered in `src/pages/index.astro`                  | grep `<{Name}` in index.astro |
| 05-verify   | `.content/sections/{id}/PASSED` marker after section-specific assertions | section-specific |
