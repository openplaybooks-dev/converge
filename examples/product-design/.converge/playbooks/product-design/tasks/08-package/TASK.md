---
id: 08-package
title: Design Package & Handoff
description: Assemble final deliverables, validate completeness, generate traceability doc
blocking: true
depends_on:
  - 07-wire-prototype
inputs:
  - docs/product/**/*
  - .design/system/**/*
  - .design/screens/**/*
  - .design/prototype/**/*
outputs:
  - docs/product/HANDOFF.md
  - docs/product/TRACEABILITY.md
checks:
  - id: handoff-exists
    cmd: test -f docs/product/HANDOFF.md
    description: Handoff document exists
  - id: traceability-exists
    cmd: test -f docs/product/TRACEABILITY.md
    description: Traceability document exists
  - id: traceability-maps-hierarchy
    cmd: grep -q "Epic → Feature → View" docs/product/TRACEABILITY.md
    description: Traceability maps full hierarchy
  - id: handoff-has-all-sections
    cmd: python3 -c "
content = open('docs/product/HANDOFF.md').read()
for section in ['## Design System', '## Epics', '## Screens', '## Prototype', '## Next Steps']:
    assert section in content, f'Missing section: {section}'
"
    description: Handoff has all required sections
---

# Design Package & Handoff

Assemble all design artifacts into a complete, development-ready package with full traceability.

## Inputs

Read all outputs from prior tasks:
- `docs/product/PRODUCT_BRIEF.md`, `docs/product/SCOPE.md`, `docs/product/EPIC_MAP.md`
- `docs/product/research/RESEARCH_REPORT.md`, `user-personas.md`, `competitive-analysis.md`
- `docs/product/epics.json`
- `docs/product/features/*/catalog.json` (per-epic) and all `FEATURE.md` + `META.md` files
- `docs/product/features/*/*/views.json` (per-feature, includes sections/tabs/modals)
- `.design/system/DESIGN.md`, `tokens.css`, `tokens.json`, `base.css`, `components.css`
- All `.design/screens/<epic-id>/<feature-id>/<view-id>/SPEC.md` + `META.md`
- `.design/prototype/index.html` (interactive mockup site)

## Tasks

1. **Generate TRACEABILITY.md** — Map the complete hierarchy:
   ```markdown
   # Epic → Feature → View Traceability

   ## Epic: [Name] (priority: must/should/could)
   - **Feature: [Name]** (priority: must/should/could)
     - View: [Name] → `.design/screens/[epic]/[feature]/[view]/SPEC.md`
     - View: [Name] → `.design/screens/[epic]/[feature]/[view]/design.html`
     - Design rationale: `docs/product/features/[epic]/[feature]/META.md`
   ```

2. **Generate HANDOFF.md** with sections:
   - `## Executive Summary` — what this product is, why it matters
   - `## Design System` — link to `.design/system/`, key decisions
   - `## Epics` — list with MVP vs v2+ split
   - `## Screens` — count by epic/feature, link to prototype
   - `## Prototype` — how to use the interactive mockup site
   - `## Design Rationale` — key decisions and trade-offs (from META.md files)
   - `## MVP Scope` — what's included vs deferred
   - `## Next Steps` — implementation guidance, open questions

3. **Validate package completeness**:
   - Every epic in epics.json has features
   - Every feature has views
   - Every view has SPEC.md + META.md + design.html + design.css
   - All design files reference tokens.css
   - Prototype includes all screens
   - TRACEABILITY.md covers every level

## Output

Complete design package ready for development handoff, with an interactive prototype that stakeholders can click through to validate the design before any code is written.
