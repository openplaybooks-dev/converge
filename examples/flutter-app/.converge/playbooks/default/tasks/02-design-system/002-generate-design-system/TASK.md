---
id: 002-generate-design-md
title: Generate DESIGN.md
description: Create design system specification from UX overview using taste-design skill
skill: taste-design
tags:
  - design
  - design-system
inputs:
  - .stitch/UX.md
  - .stitch/screens.json
outputs:
  - .stitch/system/DESIGN.md
plan: true
checks:
  - id: design-md-exists
    cmd: test -f .stitch/system/DESIGN.md
    description: DESIGN.md exists
  - id: design-md-has-colors
    cmd: grep -q "Color Palette" .stitch/system/DESIGN.md
    description: DESIGN.md contains color palette
  - id: design-md-has-typography
    cmd: grep -q "Typography" .stitch/system/DESIGN.md
    description: DESIGN.md contains typography
---

# Generate DESIGN.md

Create the design system specification from UX overview using the **taste-design** skill.

## Inputs
- `.stitch/UX.md` — UX overview with vibe, screens, and visual direction
- `.stitch/screens.json` — Machine-readable screen definitions

## Task

1. Read `.stitch/UX.md` and `.stitch/screens.json` to understand the app's purpose, screens, and visual direction
2. Follow the **taste-design** skill to produce `.stitch/system/DESIGN.md`

## Mobile Design Notes

The design system targets a mobile app. Keep these principles in mind:
- Colors should include both light and dark theme values
- Typography should use Google Fonts with clear roles (display, body, UI chrome)
- All interactive elements need 48-point minimum touch targets
- Spacing and layout should account for system chrome (status bar, home indicator)
- Component descriptions should cover mobile patterns (bottom sheets, navigation bars, cards)

**Important:** The DESIGN.md must describe visual design intent in natural language — no code snippets, no framework API references, no Dart/Flutter syntax. Describe WHAT things look like, not HOW to implement them.

## Output
- `.stitch/system/DESIGN.md` — Complete design system specification:
  - Visual Theme & Atmosphere
  - Color Palette & Roles (semantic names + hex codes, light and dark themes)
  - Typography Rules (font families, weights, sizes — Google Fonts)
  - Component Stylings (cards, buttons, inputs, bottom sheets — visual descriptions only)
  - Layout Principles (padding, spacing, safe areas)
  - Motion & Interaction (feel, speed, character — not framework-specific curves)
  - Anti-Patterns (Banned)
