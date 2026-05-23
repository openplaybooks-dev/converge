---
name: epic-decomposition
description: Methodology for identifying and organizing high-level product areas (epics) from research
---

# Epic Decomposition Skill

## Methodology

### 1. Epic Identification

Sources: product brief, user personas, competitive analysis, business goals.

**Discovery techniques**:
- User journey mapping — identify major phases of the user experience
- Capability grouping — cluster related features into logical buckets
- Value stream analysis — identify distinct value deliveries
- Domain-driven design — split along business domain boundaries

### 2. Epic Definition

Each epic needs:
- `id`: kebab-case identifier
- `title`: short descriptive name
- `description`: 2-3 sentence overview
- `priority`: must/should/could
- `target_personas`: array of personas
- `rationale`: why this epic matters
- `dependencies`: other epics this depends on

### 3. Prioritization

- **Must**: Critical for product viability
- **Should**: Important for v1 if timeline allows
- **Could**: Nice to have, deferred if needed

### 4. Output

**epics.json** and **EPIC_MAP.md** with priority matrix, persona coverage, and dependency graph.
