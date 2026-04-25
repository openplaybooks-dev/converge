---
id: 002-emit-design-md
title: Emit DESIGN.md (copy from chosen reference)
description: Copy the chosen reference DESIGN.md to .stitch/system/DESIGN.md with a provenance header. Carry over non-conflicting rules from other candidates.
dependencies:
  - 001-pick-design-system
tags:
  - design
  - design-system
inputs:
  - .stitch/system/DECISION.md
  - .stitch/references/**/DESIGN.md
outputs:
  - .stitch/system/DESIGN.md
checks:
  - id: design-md-exists
    cmd: test -f .stitch/system/DESIGN.md
    description: DESIGN.md exists
  - id: design-md-has-provenance
    cmd: 'grep -qE "^> (Source|Derived from): \.stitch/references/" .stitch/system/DESIGN.md'
    description: DESIGN.md has provenance header citing chosen reference
  - id: design-md-has-colors
    cmd: grep -qE "(## |# ).*Colors?" .stitch/system/DESIGN.md
    description: DESIGN.md contains a colors section
  - id: design-md-has-typography
    cmd: grep -qE "(## |# ).*Typography" .stitch/system/DESIGN.md
    description: DESIGN.md contains a typography section
---

# Emit DESIGN.md

Copy the chosen reference's DESIGN.md to `.stitch/system/DESIGN.md`. Do **not** regenerate.

## Steps

1. Read `.stitch/system/DECISION.md` → find the chosen reference path (under `## Chosen System`).
2. Read that file verbatim.
3. Prepend a provenance block:
   ```markdown
   > Source: `.stitch/references/<dir>/DESIGN.md` (chosen in `.stitch/system/DECISION.md`).
   > This file is authoritative for the app's visual design. Do not hand-edit — change the source reference and re-run phase 02.
   ```
4. Read every other candidate `.stitch/references/*/DESIGN.md` from the DECISION.md `## Candidates evaluated` list.
5. Append at the end of `.stitch/system/DESIGN.md`:
   ```markdown
   ## Supplemental rules carried from other candidates

   - From `lullaby_minimal/DESIGN.md` §"Glass & Gradient": <one-line summary> — applies where chosen system is silent.
   - (…)
   ```
   Only carry over rules that:
   - do not contradict the chosen system, and
   - fill a gap the chosen system does not cover.
6. Write `.stitch/system/DESIGN.md`.

## Banned

- Rewriting the chosen DESIGN.md "in your own words".
- Adding rules that don't exist in any candidate DESIGN.md.
- Mixing colors from multiple candidates (palette comes from chosen system only).

## Success Criteria

- `.stitch/system/DESIGN.md` exists
- Starts with a `> Source:` provenance line citing a `.stitch/references/` path
- Has Colors and Typography sections (copied verbatim from chosen source)
- `## Supplemental rules` section (possibly empty) is clearly marked at the end
