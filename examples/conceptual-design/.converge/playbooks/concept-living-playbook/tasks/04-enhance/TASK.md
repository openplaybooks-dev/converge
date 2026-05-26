---
id: 04-enhance
title: Build the enhanced interactive mockup
depends_on:
  - 03-build-html
skills:
  - product-engineer
  - design-taste-frontend
inputs:
  - concepts/.workspace/concept.html
  - concepts/.workspace/design-spec.md
outputs:
  - concepts/.workspace/mockup.html
checks:
  - id: html-exists
    cmd: test -s concepts/.workspace/mockup.html
    description: Mockup file exists
  - id: has-doctype
    cmd: head -5 concepts/.workspace/mockup.html | grep -qi '<!DOCTYPE'
    description: Valid HTML
  - id: has-interactivity
    cmd: grep -qiE 'addEventListener|onclick|click' concepts/.workspace/mockup.html
    description: Has click interactions
  - id: has-transitions
    cmd: grep -qiE 'transition|transform' concepts/.workspace/mockup.html
    description: Has CSS transitions
  - id: minimum-size
    cmd: bash -c 'test "$(wc -l < concepts/.workspace/mockup.html)" -ge 400'
    description: Mockup is substantial
---

# Build the Enhanced Interactive Mockup

Read the concept HTML (`concepts/.workspace/concept.html`) and the design spec (`concepts/.workspace/design-spec.md`). Then create a NEW file — `concepts/.workspace/mockup.html` — that is a fuller, more interactive version.

This is NOT an edit of the concept. It's a fresh build that takes the concept's design direction and elevates it with product-level interactivity. You have creative freedom to improve the visual quality while adding behaviors.

## What the mockup must have beyond the concept

1. **Click to toggle task status** — clicking a task cycles its status (pending → running → pass → failed → pending)
2. **Expand/collapse all nesting levels** — toggle controls on every parent
3. **Task body reveal** — click to show full markdown body with smooth animation
4. **Running timers** — tasks in running state show a live elapsed counter
5. **Status filter bar** — pills/buttons to filter by status (All / Running / Pass / Failed / Pending)
6. **Search** — filter tasks by title
7. **Progress indicators** — parent tasks show child completion count
8. **Hover effects** — subtle visual feedback
9. **Smooth transitions on all state changes**
10. **Keyboard navigation** — arrow keys between tasks, Enter to expand

## Visual quality

The mockup must be **at least as good looking** as the concept. Don't degrade the design to add features. Study the concept's palette, spacing, typography, and surfaces — then build something that matches or exceeds that quality while adding the interactivity above.

Read the design spec for the creative direction. Maintain the same brand feel.

## Technical

- Single self-contained HTML file (embedded CSS + JS)
- `prefers-reduced-motion` support
- No external deps except font CDN
