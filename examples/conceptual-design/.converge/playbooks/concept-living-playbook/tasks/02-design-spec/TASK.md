---
id: 02-design-spec
title: Write the creative design specification
depends_on:
  - 01-setup
skills:
  - design-director
inputs:
  - docs/design/design-brief.md
checks:
  - id: spec-exists
    cmd: test -f "concepts/${CONVERGE_PARTITION_KEY}/design-spec.md"
    description: Design spec exists and is non-empty
  - id: spec-substantial
    cmd: bash -c 'test "$(wc -l < "concepts/${CONVERGE_PARTITION_KEY}/design-spec.md")" -ge 40'
    description: Design spec is substantial (at least 40 lines)
---

# Write the Creative Design Specification

## CONSTRAINTS — Read These First

These rules override everything else. The brand's design system informs colors and typography, but the FORMAT is a book — not a dashboard, not a web app.

1. **Book layout.** Single column, `max-width: 720px`, centered. Content reads top-to-bottom. No multi-column grids. No sidebar navigation.
2. **Paper surface.** Background: warm white (`#FAFAF8`). Cards: white with soft `box-shadow` (`0 1px 3px rgba(0,0,0,0.06)`). No colored card backgrounds. No hard borders.
3. **Typography does the hierarchy.** Font size and weight communicate structure — not icons, not colored containers. Specify exact px sizes and weights for every heading level.
4. **Badges for metadata.** Status, task mode, duration — small pill badges with subtle tint. Never bold colored blocks.
5. **40% whitespace.** The page must breathe. Generous margins and gaps.
6. **Shadows max `rgba(0,0,0,0.08)`.** Gentle depth, never dramatic.
7. **Muted status colors.** Sage green for pass, warm amber for running, dusty rose for failed. Never saturated.
8. **No dark mode.** Ever. The background is warm white. The text is near-black.
9. **No Inter font.** Use the brand's font or a clean alternative like Georgia or system-ui.
10. **No sticky navbars.** No fixed headers. The page scrolls like a book.

## Your Role

You are a design director. Read the inputs, deeply understand the brand's personality, then write a creative brief that a developer implements literally — but within the book format above.

## Inputs

- `docs/design/design-brief.md` — the product spec: the book vibe, data model, example data
- `concepts/$CONVERGE_PARTITION_KEY/design-system.md` — the brand's design system

## Understand the Brand

Study the design system deeply — its personality, rhythm, color philosophy, typography choices. Then ADAPT those qualities to the book format:

- Use the brand's colors for accents, links, and highlights — but keep the warm white background
- Use the brand's font for headings and body — but at the sizes specified in the constraints
- Use the brand's spacing rhythm — but within the single-column book layout
- Use the brand's surface treatment — but only as subtle card shadow variations

## What to Include

1. **Brand interpretation** — how you read this brand and how it shapes the spec
2. **Page composition** — overall layout (single column, 720px, top to bottom)
3. **Typography scale** — exact sizes/weights for every level (must match constraint #3)
4. **Color mapping** — brand colors mapped to semantic roles (status, accent, text, background)
5. **Spacing system** — the rhythm between elements
6. **Nesting expression** — how 5 levels of depth look (indentation + type scale changes + card elevation)
7. **Task type differentiation** — how leaf/spawner/gateway look different
8. **Status & data presentation** — badges, checks, outputs, durations
9. **Interaction design** — hover (shadow lift), expand/collapse (gentle height), body reveal
10. **Signature touches** — 2-3 brand-specific details that make it feel premium

Be specific. Give exact hex values, px sizes, font weights. Write for a developer who implements literally.

## Output

Write to `concepts/$CONVERGE_PARTITION_KEY/design-spec.md`.
