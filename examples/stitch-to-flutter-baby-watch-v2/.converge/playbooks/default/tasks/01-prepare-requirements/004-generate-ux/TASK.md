---
id: 004-generate-ux
title: Generate UX (reference-grounded)
description: Generate UX.md + SITE.md from PRD and ANALYSIS.md, emphasising flows and states over individual screen layouts.
skill: ux-design
dependencies:
  - 002-analyze-references
  - 003-generate-prd
tags:
  - requirements
  - ux
inputs:
  - PRD.md
  - .stitch/references/ANALYSIS.md
  - idea.md
outputs:
  - .stitch/UX.md
  - .stitch/SITE.md
checks:
  - id: ux-md-exists
    cmd: test -f .stitch/UX.md
    description: UX.md exists
  - id: site-md-exists
    cmd: test -f .stitch/SITE.md
    description: SITE.md exists
  - id: ux-has-flows
    cmd: grep -qE "^## .*(Flow|Navigation|State)" .stitch/UX.md
    description: UX.md has a flows/navigation/state section
  - id: ux-matches-nav-structure
    cmd: grep -qE "(bottom.nav|tab bar|BottomNav)" .stitch/UX.md
    description: UX.md references the navigation structure observed in ANALYSIS.md
---

# Generate UX (reference-grounded)

Invoke **/ux-design** skill to produce `.stitch/UX.md` and `.stitch/SITE.md`. Unlike v1, these artifacts do **not** invent screen layouts — the references have those. Focus on flows, state transitions, and navigation.

## Inputs

- `PRD.md` — features with reference citations
- `.stitch/references/ANALYSIS.md` — authoritative nav + state inventory
- `idea.md` — domain context

## What v2 UX.md covers

- **App shell** — bottom nav tabs and their routes (derived from ANALYSIS.md's observed bottom-nav components)
- **Primary flows** — e.g. "onboarding → home-safe → weak-signal (passive) → alert (push + in-app)". Refer to reference screens by their directory name. Do not re-describe what a screen looks like; cite `.stitch/references/<dir>/code.html`.
- **State transitions** — when does home flip safe → weak → alert? What triggers onboarding? Use the state-variant references as anchors.
- **Overlays** — any modal/dialog/bottom-sheet behaviour visible in reference HTML.
- **Locale** — primary locale (from reference content — visibly Vietnamese in references).
- **Out-of-scope** — explicitly list anything in idea.md that has no reference anchor (to be deferred or hand-coded later).

## What v2 UX.md does NOT cover

- Per-screen layout/component inventory — that is ANALYSIS.md's job.
- Design tokens — that is phase 02's job.

## `.stitch/SITE.md`

Human-readable sitemap:
- Route table: route path → screen id → brief purpose → reference path
- Nav tree (indented): root → tab → detail
- Deep links relevant to the domain

## Success Criteria

- `.stitch/UX.md` exists with flows/navigation/state section
- `.stitch/SITE.md` exists with route table
- UX.md references the navigation structure observed in ANALYSIS.md (bottom nav)
