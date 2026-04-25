---
id: 01-prepare-requirements
title: Prepare Requirements (reference-first)
description: Analyze .stitch/references/ as the source of truth; derive PRD, UX, screens.json, and data entities grounded in the references.
blocking: true
outputs:
  - PRD.md
  - .stitch/UX.md
  - .stitch/SITE.md
  - .stitch/screens.json
  - .stitch/references/ANALYSIS.md
  - .stitch/data-entities.md
checks:
  - id: references-analysis-exists
    cmd: test -f .stitch/references/ANALYSIS.md
    description: References analysis exists
  - id: prd-exists
    cmd: test -f PRD.md
    description: PRD exists
  - id: ux-spec-exists
    cmd: test -f .stitch/UX.md
    description: UX specification exists
  - id: screens-json-exists
    cmd: test -f .stitch/screens.json
    description: Screen definitions exist
  - id: screens-json-html-reference
    cmd: python3 -c "import json,sys; d=json.load(open('.stitch/screens.json')); sys.exit(0 if isinstance(d,list) and all(isinstance(x,dict) and 'htmlReference' in x and isinstance(x.get('htmlReference'),str) for x in d) else 1)"
    description: Every screen in screens.json has a string htmlReference
  - id: data-entities-exists
    cmd: test -f .stitch/data-entities.md
    description: Data entities doc exists
---

# Prepare Requirements (v2)

In v1, idea.md drove PRD → UX → screens, and references were a late hint. v2 inverts this: `.stitch/references/` is pixel-truth, and every downstream artifact is grounded in it.

## Subtask Flow

1. **001-gather-idea** — confirm idea.md is present and well-formed (unchanged from v1).
2. **002-analyze-references** — synthesize `.stitch/references/` into `ANALYSIS.md` (Screen Inventory, Component Inventory, Design System Synthesis, Data Entities sketched). Runs *before* PRD/UX so they can consult it.
3. **003-generate-prd** — PRD grounded in both idea.md (domain/personas) and ANALYSIS.md (observable UI behaviors). The PRD describes what the app *does* per the references, not aspirations.
4. **004-generate-ux** — UX.md + SITE.md derived primarily from ANALYSIS.md (navigation, flows, states). idea.md is secondary.
5. **005-derive-screens-json** — emit `.stitch/screens.json` directly from ANALYSIS.md Screen Inventory. Each entry has `htmlReference` pre-filled. Replaces v1's two-step breakdown+enrich.
6. **006-derive-data-entities** — parse data-bearing elements from reference `code.html` files to produce `.stitch/data-entities.md` listing domain objects with observed fields. Feeds phase 05.
