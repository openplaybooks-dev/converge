---
id: 03-build-html
title: Build the HTML concept from the design spec
depends_on:
  - 02-design-spec
skills:
  - design-taste-frontend
checks:
  - id: html-exists
    cmd: test -f "concepts/notion/concept.html"
    description: HTML file exists
  - id: has-doctype
    cmd: head -5 "concepts/notion/concept.html" | grep -qi '<!DOCTYPE'
    description: Valid HTML
  - id: has-style
    cmd: grep -q '<style>' "concepts/notion/concept.html"
    description: Self-contained CSS
  - id: has-script
    cmd: grep -q '<script>' "concepts/notion/concept.html"
    description: Has JavaScript
  - id: has-task-content
    cmd: grep -qiE 'task|leaf|gateway|spawner' "concepts/notion/concept.html"
    description: Has task content
  - id: minimum-size
    cmd: bash -c 'test "$(wc -l < "concepts/notion/concept.html")" -ge 200'
    description: Substantial HTML
  - id: warm-white-bg
    cmd: grep -qiE 'fafaf|FAF9F|f9faf' "concepts/notion/concept.html"
    description: Uses warm white background (not pure white or dark)
  - id: no-inter-font
    cmd: bash -c '! grep -qi "font-family.*Inter" "concepts/notion/concept.html"'
    description: Does not use banned Inter font
  - id: no-dark-bg
    cmd: bash -c '! grep -qE "#000000|#010102|#0f1011|#0a0a0a" "concepts/notion/concept.html"'
    description: No dark mode backgrounds
---

# Build the HTML Concept

Take the design specification and implement it faithfully as a standalone HTML file.

## Inputs

- `concepts/$CONVERGE_PARTITION_KEY/design-spec.md` — the creative brief from the design director. This is your blueprint — follow it literally.
- `concepts/$CONVERGE_PARTITION_KEY/design-system.md` — the brand's design tokens for reference

## What to build

A single self-contained HTML file (embedded CSS + JS) that implements the design spec. The spec tells you:
- Page composition and layout
- Typography scale and weights
- Colors and their semantic roles
- Spacing system
- How nesting is expressed
- How task types look different
- What interactions exist

Follow it. The design director already made the creative decisions — your job is flawless execution.

Include realistic sample data: a playbook with tasks showing the hierarchy described in the spec. Use meaningful titles, descriptions, checks, inputs/outputs. Make it feel like a real product.

## Technical

- Single HTML file, embedded `<style>` and `<script>`
- No external dependencies except font CDN links
- `prefers-reduced-motion` support
- Clean, semantic markup
- Follow the design-taste-frontend skill rules

## Mandatory CSS Rules

These are hard constraints — violating any one means the output is wrong:

- `body` background: warm white (`#FAFAF8`), never `#FFFFFF` or pure white
- Main content container: `max-width: 720px; margin: 0 auto` (book-width reading column)
- Cards/sections: `box-shadow` only, never `border` for depth. Shadow max: `rgba(0,0,0,0.08)`
- `border-radius: 8px` to `12px` on cards
- Body text `line-height: 1.6` minimum
- No `font-family: Inter` — use the brand's font or system stack
- Padding inside cards: minimum `24px`
- Gap between cards: minimum `16px`
- All transitions: `200ms ease` to `300ms ease`, no springs or bounces
