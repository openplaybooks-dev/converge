---
id: 001-pick-design-system
title: Pick primary design system
description: Compare all reference DESIGN.md files and pick the primary one, recording the decision.
tags:
  - design
  - design-system
inputs:
  - .stitch/references/ANALYSIS.md
  - .stitch/references/**/DESIGN.md
outputs:
  - .stitch/system/DECISION.md
checks:
  - id: decision-exists
    cmd: test -f .stitch/system/DECISION.md
    description: DECISION.md exists
  - id: decision-names-source
    cmd: grep -qE "^## Chosen System" .stitch/system/DECISION.md
    description: DECISION.md names the chosen design system
  - id: decision-cites-path
    cmd: grep -qE "\.stitch/references/[^/]+/DESIGN\.md" .stitch/system/DECISION.md
    description: DECISION.md cites the path of the chosen DESIGN.md
---

# Pick primary design system

Multiple `.stitch/references/*/DESIGN.md` files exist. Pick one as the canonical system for the Flutter app.

## Inputs

- `.stitch/references/ANALYSIS.md` — notes which design system is dominant (if ANALYSIS.md took a position)
- Each `.stitch/references/*/DESIGN.md` — candidate systems

## Decision criteria (in order)

1. **Consistency with screen references.** Does the candidate's palette / typography / radius match what's in the reference `code.html` files? Grep the Tailwind configs in a couple of screen references and count matches against each candidate's palette.
2. **Completeness.** Does it cover colors, typography, elevation, radius, components, do's/don'ts? Skip candidates that are stub-length.
3. **ANALYSIS.md endorsement.** If ANALYSIS.md already named a primary system, default to it unless criteria 1 or 2 strongly disagree.
4. **Tie-break on alphabetical directory name** (stable, reproducible).

## Output: `.stitch/system/DECISION.md`

```markdown
# Design System Decision

## Candidates evaluated
- `.stitch/references/serene_guardian/DESIGN.md`
- `.stitch/references/lullaby_minimal/DESIGN.md`

## Chosen System
**serene_guardian** — `.stitch/references/serene_guardian/DESIGN.md`

## Rationale
- Tailwind configs in 9 of 11 screen references use color tokens that match serene_guardian's palette (surface `#fbf9f5`, on-surface `#31332e`, error `#9f403d`).
- More complete: covers buttons, status pills, cards, input fields, do's/don'ts. lullaby_minimal is a subset.
- ANALYSIS.md implicitly favours serene_guardian in its Design System Synthesis section (colors match).

## Non-chosen systems — reuse notes
- lullaby_minimal — overlapping palette; specific rules (e.g. "Glass & Gradient") carried into DESIGN.md where serene_guardian is silent.
```

## Success Criteria

- `.stitch/system/DECISION.md` exists
- Has `## Chosen System` section naming the chosen reference
- Cites the exact `.stitch/references/.../DESIGN.md` path
