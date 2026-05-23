---
id: 01-intake
title: Product Intake
description: Capture and validate the product idea, define scope and success metrics
blocking: true
inputs:
  - docs/idea.txt
outputs:
  - docs/product/PRODUCT_BRIEF.md
  - docs/product/SCOPE.md
checks:
  - id: brief-exists
  - id: brief-has-sections
  - id: scope-exists
  - id: scope-has-boundaries
  - id: idea-provided
---

# Product Intake

Capture the user's product idea and transform it into a validated product brief with clear scope boundaries.

## Input

Read `docs/idea.txt` (user-provided initial concept). If it doesn't exist, prompt the user to describe their product idea.

## Tasks

1. **Clarify the product concept**:
   - What problem does this solve?
   - Who are the target users?
   - What's the core value proposition?
   - What are the key success metrics?
   - What constraints exist (timeline, budget, platform)?

2. **Define scope boundaries** — be ruthless about what's MVP vs future:
   - What's absolutely needed for v1 (MVP)?
   - What's nice-to-have but not critical?
   - What's explicitly out of scope?

3. **Write PRODUCT_BRIEF.md** with sections:
   - `## Problem` — user pain point or market opportunity
   - `## Solution` — how this product addresses it
   - `## Target Users` — primary and secondary segments with specific characteristics
   - `## Success Metrics` — measurable outcomes (not vanity metrics)
   - `## Core Value Proposition` — one sentence that explains why users choose this

4. **Write SCOPE.md** with sections:
   - `## In Scope (MVP)` — must-haves for v1
   - `## In Scope (v2+)` — important but deferred
   - `## Out of Scope` — explicitly excluded
   - `## Constraints` — technical, timeline, resource limits
   - `## Assumptions` — what we're assuming to be true

## Output

Two complete documents that define the product vision and boundaries for all downstream work.
