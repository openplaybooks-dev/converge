# Design System Decision

## Candidates evaluated
- `.stitch/references/serene_guardian/DESIGN.md`
- `.stitch/references/lullaby_minimal/DESIGN.md`

## Chosen System
**serene_guardian** — `.stitch/references/serene_guardian/DESIGN.md`

## Rationale
- Palette match: ANALYSIS.md's synthesized tokens (`surface #fbf9f5`, `on-surface #31332e`, `error #9f403d`) align with serene_guardian's exact values; lullaby_minimal differs on `primary #5f5e5e` and `error #9e422c`.
- Completeness: serene_guardian covers buttons, status pills, cards, input fields, typography, radii, and do's/don'ts comprehensively. lullaby_minimal overlaps but is a subset.
- ANALYSIS.md endorsement: the Design System Synthesis section uses serene_guardian's error token (`#9f403d`) as the canonical value, implicitly favouring it.
- Tie-break: alphabetical order (`lullaby_minimal` < `serene_guardian`) does not apply because criteria 1 and 2 already settle the choice.

## Non-chosen systems — reuse notes
- lullaby_minimal — overlapping palette and tonal-layering principles; carry "Editorial Serenity" rules (glass/gradient nuances, soft minimalism guidance) into DESIGN.md where serene_guardian is silent.
