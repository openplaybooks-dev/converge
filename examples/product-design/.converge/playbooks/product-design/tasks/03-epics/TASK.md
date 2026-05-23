---
id: 03-epics
title: Epic Decomposition
description: Identify high-level product areas and prioritize them for MVP
blocking: true
depends_on:
  - 02-research
inputs:
  - docs/product/PRODUCT_BRIEF.md
  - docs/product/SCOPE.md
  - docs/product/research/RESEARCH_REPORT.md
  - docs/product/research/user-personas.md
outputs:
  - docs/product/epics.json
  - docs/product/EPIC_MAP.md
checks:
  - id: epics-json-exists
  - id: epics-json-valid
  - id: epic-map-exists
  - id: epics-have-priority
skills:
  - epic-decomposition
---

# Epic Decomposition

Identify high-level product areas (epics) that organize the product's capabilities. Use the `epic-decomposition` skill for methodology.

## Inputs

Read research outputs and product brief/scope to understand user needs, market context, and constraints.

## Tasks

1. **Identify epics** (2-7 high-level product areas):
   - Group related capabilities into themes
   - Each epic serves a distinct user goal or product area
   - Examples: "User Management", "Content Creation", "Analytics"

2. **Prioritize for MVP**:
   - **Must**: Critical for product viability — without this, the product doesn't work
   - **Should**: Important for v1 — should be included if timeline allows
   - **Could**: Nice to have — deferred to v2+ if needed
   - Consider: user impact, technical complexity, dependencies between epics

3. **Map to personas**: Which personas care most about each epic?

4. **Write epics.json**:
```json
{
  "epics": [
    {
      "id": "user-management",
      "title": "User Management",
      "description": "User registration, authentication, profile management",
      "priority": "must",
      "target_personas": ["admin", "end-user"],
      "dependencies": [],
      "rationale": "Foundation for all user interactions"
    }
  ]
}
```

5. **Write EPIC_MAP.md**:
   - Priority matrix
   - Persona mapping table
   - Dependencies between epics
   - MVP vs v2+ split

## Output

Complete epic catalog that will drive feature analysis spawning. Every epic has a clear rationale backed by research findings.
