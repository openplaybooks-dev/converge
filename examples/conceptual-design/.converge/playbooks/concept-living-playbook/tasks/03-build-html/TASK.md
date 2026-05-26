---
id: 03-build-html
title: Build the HTML concept from the design spec
depends_on:
  - 02-design-spec
skills:
  - design-taste-frontend
checks:
  - id: html-exists
    cmd: test -s "concepts/${CONVERGE_PARTITION_KEY}/concept.html"
    description: HTML file exists
  - id: has-doctype
    cmd: head -5 "concepts/${CONVERGE_PARTITION_KEY}/concept.html" | grep -qi '<!DOCTYPE'
    description: Valid HTML
  - id: has-style
    cmd: grep -q '<style>' "concepts/${CONVERGE_PARTITION_KEY}/concept.html"
    description: Self-contained CSS
  - id: has-script
    cmd: grep -q '<script>' "concepts/${CONVERGE_PARTITION_KEY}/concept.html"
    description: Has JavaScript
  - id: has-task-content
    cmd: grep -qiE 'task|leaf|gateway|spawner' "concepts/${CONVERGE_PARTITION_KEY}/concept.html"
    description: Has task content
  - id: minimum-size
    cmd: bash -c 'test "$(wc -l < "concepts/${CONVERGE_PARTITION_KEY}/concept.html")" -ge 200'
    description: Substantial HTML
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
