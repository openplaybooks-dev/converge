---
id: 005-generate-design-references
title: Generate Design Reference HTML
description: Generate project-specific HTML design mockups as reference examples for stitch-generate
inputs:
  - .stitch/system/DESIGN.md
  - .stitch/screens.json
  - .stitch/UX.md
outputs:
  - .stitch/system/META.md
  - .stitch/system/single-screen.html
  - .stitch/system/multi-state-screen.html
  - .stitch/system/celebration-screen.html
checks:
  - id: meta-md-exists
    cmd: test -f .stitch/system/META.md
    description: META.md exists
  - id: single-screen-exists
    cmd: test -f .stitch/system/single-screen.html
    description: Single screen HTML exists
  - id: multi-state-exists
    cmd: test -f .stitch/system/multi-state-screen.html
    description: Multi-state screen HTML exists
  - id: celebration-exists
    cmd: test -f .stitch/system/celebration-screen.html
    description: Celebration screen HTML exists
  - id: html-has-tokens
    cmd: grep -q ':root' .stitch/system/single-screen.html
    description: HTML uses CSS custom properties
depends_on:
  - 002-generate-design-system
tags:
  - design
  - html
  - references
vars:
  skill: stitch-generate
---

# Generate Design Reference HTML

Generate project-specific HTML design mockups that serve as reference examples for `stitch-generate` when building all screens in `03-build-screens`.

## Why

The `stitch-generate` skill matches new screens against reference examples to produce consistent HTML. By generating project-specific references that embody our design system, every screen generated in `03-build-screens` will inherit the correct visual language — which then converts cleanly to Flutter widgets.

## Steps

1. **Read inputs** — Load `.stitch/system/DESIGN.md`, `.stitch/screens.json`, and `.stitch/UX.md`

2. **Select 3 representative screens** from `screens.json`:
   - **Single Screen** — the most typical/common screen (e.g., a main content list or primary feature screen)
   - **Multi-State** — a screen with multiple interaction states (e.g., form with empty/filling/complete states, or a list with loading/empty/populated)
   - **Celebration** — an achievement or milestone screen (e.g., goal reached, streak milestone, completion)

3. **Create `.stitch/system/META.md`** following this format:
   ```markdown
   # {App Name}

   - **App Type:** {category}
   - **Tags:** {comma-separated keywords}
   - **Platform:** Mobile (375px base width)
   - **Interaction Density:** {Low | Medium | High}
   - **Target Framework:** Flutter (Material 3)

   ## Screens

   | File | Pattern | Description |
   |------|---------|-------------|
   | `single-screen.html` | Single Screen | {what it shows} |
   | `multi-state-screen.html` | Multi-State | {what states it covers} |
   | `celebration-screen.html` | Celebration | {what achievement it shows} |

   ## Key Patterns

   - {notable UI pattern 1}
   - {notable UI pattern 2}
   ```

4. **Generate each HTML file** using `stitch-generate`:
   - Each file must be self-contained (embedded `<style>`, inline SVG icons, Google Fonts via `<link>`)
   - CSS custom properties in `:root` for all design tokens from DESIGN.md
   - Semantic HTML (`<header>`, `<main>`, `<nav>`, `<section>`)
   - ARIA attributes on interactive elements
   - `@media (prefers-reduced-motion: reduce)` block
   - Phone frame wrapper (`.phone` at 375px for mobile)

## Output

```
.stitch/system/
├── DESIGN.md              (created by task 002)
├── META.md
├── single-screen.html
├── multi-state-screen.html
└── celebration-screen.html
```
