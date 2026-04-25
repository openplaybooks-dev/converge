---
id: 003-generate-prd
title: Generate PRD (reference-grounded)
description: Generate a Product Requirements Document grounded in both idea.md (domain intent) and ANALYSIS.md (observable UI behaviors).
dependencies:
  - 001-gather-idea
  - 002-analyze-references
tags:
  - requirements
  - prd
inputs:
  - idea.md
  - .stitch/references/ANALYSIS.md
outputs:
  - PRD.md
checks:
  - id: prd-exists
    cmd: test -f PRD.md
    description: PRD.md exists
  - id: prd-has-sections
    cmd: grep -qE "## (Overview|Features|Requirements)" PRD.md
    description: PRD.md has expected sections
  - id: prd-cites-references
    cmd: grep -qE "\.stitch/references/" PRD.md
    description: PRD.md cites at least one reference path (grounding check)
  - id: prd-matches-idea
    cmd: first=$(head -1 idea.md | sed 's/^#* *//' | awk '{print $1}'); grep -qi "$first" PRD.md
    description: PRD.md references the app name from idea.md
---

# Generate PRD (reference-grounded)

Read `idea.md` **and** `.stitch/references/ANALYSIS.md`, then emit a PRD that describes the app as it *actually exists* in the references, constrained by domain needs from idea.md.

## Inputs

- `idea.md` — domain intent, user goals, non-UI requirements (performance, platform, security)
- `.stitch/references/ANALYSIS.md` — pixel-truth: screens present, state variants, components, navigation

## Constraints

- The PRD is **grounded, not aspirational**. Every feature must be traceable to either:
  - a screen listed in ANALYSIS.md's Screen Inventory (include the `.stitch/references/*/code.html` path as an inline citation), **or**
  - a non-UI requirement explicitly stated in idea.md (performance, offline, privacy, etc.).
- Do NOT invent features that appear in neither input.
- Do NOT read or reference files in `lib/` (it doesn't exist yet).
- If ANALYSIS.md and idea.md disagree on feature scope, prefer ANALYSIS.md for UI-observable behaviors and idea.md for non-UI constraints.

## Output: `PRD.md`

Produce sections:

### 1. Overview
Start with the app name from idea.md. One paragraph summary of the app's purpose, blending idea.md's value proposition with the navigation shape observed in ANALYSIS.md (e.g., "a 4-tab bottom-nav app centered on the home dashboard").

### 2. User Personas
Derive from idea.md's Target Audience section. 2-3 personas, each with name, one-sentence role, and primary goals.

### 3. Features
For each feature, cite the reference that proves it exists:
```
#### Feature: Home Dashboard with Safe/Alert/Weak states
**Evidence:** `.stitch/references/babyguard_home_phase_2_safe_updated/code.html`,
              `.stitch/references/babyguard_home_phase_2_alert/code.html`,
              `.stitch/references/babyguard_home_phase_2_weak_signal/code.html`
**Behavior:** ...
**Acceptance:** ...
```
Every feature entry must have at least one `Evidence:` line pointing at a reference (or an explicit `Evidence: idea.md §<section>` for non-UI features).

### 4. Non-Functional Requirements
From idea.md's Technical Requirements section. Performance, accessibility (WCAG AA minimum), platform (iOS + Android), locale (match references — primarily `vi`), offline behavior, security/privacy.

## Success Criteria

- `PRD.md` exists with the above sections
- Every UI feature cites at least one `.stitch/references/...code.html` path
- App name matches idea.md
