---
title: Characters
description: Complete character asset pipeline (analysis, shared references, generation)
blocking: true
tags:
  - characters
---

# Characters

Complete pipeline for character asset generation with 3 phases:

## Phase 1: Analysis (01-analysis)
Analyze characters and identify classes, groups, shared attributes.

**Output:** `.converge/character-analysis.json`

## Phase 2: Shared References (02-shared-references, WBS)
Setup shared references for cross-character assets (class style guides, effects).

**Output:** `assets/shared/classes/{class}/`

## Phase 3: Generation (03-generation, WBS)
Generate all character assets using shared references.

**Output:** `assets/characters/{char_id}/`

## Workflow

```bash
# Run all character tasks
converge run 03-characters/01-analysis
converge run --wbs 03-characters/02-shared-references
converge run --wbs 03-characters/03-generation
```

## Structure

```
03-characters/
├── 01-analysis/              # Analyze & classify
├── 02-shared-references/     # Setup class style guides (WBS)
└── 03-generation/            # Generate characters (WBS)
```
