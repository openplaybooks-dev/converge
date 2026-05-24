---
id: design-mockup
title: Design Mockup
description: Create a single self-contained HTML mockup for one feature
mode: leaf
depends_on: []
inputs:
  - docs/product/features/{{epicId}}/catalog.json
  - docs/product/PRODUCT_BRIEF.md
outputs:
  - .design/screens/{{epicId}}/{{featureId}}/design.html
checks:
  - id: html-exists
    cmd: test -f .design/screens/{{epicId}}/{{featureId}}/design.html
  - id: has-style
    cmd: grep -q '<style>' .design/screens/{{epicId}}/{{featureId}}/design.html
skills:
  - html-mockup
---

# Design Mockup for {{featureId}}

Create a simple, self-contained HTML mockup for this feature. This is an **MVP concept mockup**, not a production design.

## What to produce

One HTML file at `.design/screens/{{epicId}}/{{featureId}}/design.html` showing the concept layout.

## Rules

- **Single file** — all CSS in `<style>`, no external links
- **MVP concept** — show the layout and content structure, not pixel-perfect design
- **Self-contained** — opens in any browser with no dependencies
- **Real content** — use realistic text from the product brief, not Lorem Ipsum
- **Simple layout** — flexbox or grid, no complex responsive logic needed
- **Clean typography** — use system fonts, good spacing, readable hierarchy

## Context

- Read `docs/product/PRODUCT_BRIEF.md` for the product concept
- Read `docs/product/features/{{epicId}}/catalog.json` for this epic's features
- This mockup covers the **{{featureId}}** feature within the **{{epicId}}** epic
