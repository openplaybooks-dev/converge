---
id: 02-design-spec
title: Write the creative design specification
depends_on:
  - 01-setup
skills:
  - design-director
inputs:
  - docs/design/living-playbook-spec.md
  - concepts/.workspace/design-system.md
  - concepts/.workspace/chosen-design-system.txt
outputs:
  - concepts/.workspace/design-spec.md
checks:
  - id: spec-exists
    cmd: test -s concepts/.workspace/design-spec.md
    description: Design spec exists and is non-empty
  - id: spec-substantial
    cmd: bash -c 'test "$(wc -l < concepts/.workspace/design-spec.md)" -ge 40'
    description: Design spec is substantial (at least 40 lines)
---

# Write the Creative Design Specification

You are a design director creating a masterpiece UI/UX concept. Read the inputs deeply and write a creative brief that a developer will implement.

## Inputs

- `docs/design/living-playbook-spec.md` — the product spec: vibe (handbook), data model (tasks nesting up to 5 levels, modes: leaf/spawner/gateway), and example data
- `concepts/.workspace/design-system.md` — the brand's design system. Study it deeply — understand its personality, its rhythm, its values.

## You must deeply understand two things:

### 1. The Design System

Don't just extract colors and fonts. Understand the SOUL of this brand:
- What's its personality? Playful? Serious? Minimal? Dense?
- How does it handle hierarchy? What's its approach to space?
- What's its motion philosophy? Its surface treatment?
- How does it differentiate information levels?
- What makes it recognizable and distinct?

### 2. The Product Information Hierarchy

The product shows a playbook — a composable tree of tasks up to 5 levels deep. Each task has:
- Title, description, body (long markdown instructions)
- Mode: leaf (does work), spawner (creates children), gateway (structural container)
- Inputs, outputs, checks (pass/fail)
- Status, duration, dependencies

The design must present this data clearly. The hierarchy must be immediately scannable. The reader should understand the structure at a glance AND be able to drill into any level for detail.

## Your job

Create a design specification that is a **masterpiece of UI/UX** — something so well-crafted it could win design awards. Think deeply about:

- How this brand would naturally present structured, nested information
- What page composition creates the right reading experience
- How to express 5 levels of nesting beautifully (indentation? progressive disclosure? split views? breadcrumbs?)
- How task types (leaf/spawner/gateway) are distinct yet cohesive
- What typography scale makes hierarchy effortless to scan
- What interactions feel native to this brand (hover, click, expand, slide, morph)
- What unique visual touches make this feel premium and specific to this brand
- How to present data (checks, outputs, status) without clutter

## Principles

- Generous whitespace — let the content breathe
- Clean and readable — hierarchy through type and space, minimize visual noise
- The brand drives everything — if the brand uses cards, use cards. If it's flat, be flat. Follow the brand's own patterns.
- Be specific: exact colors (hex), sizes (px), spacing values, font weights
- Be opinionated: make bold choices that serve the content
- Write for a developer who will implement it literally

## Output

Write to `concepts/.workspace/design-spec.md`.
