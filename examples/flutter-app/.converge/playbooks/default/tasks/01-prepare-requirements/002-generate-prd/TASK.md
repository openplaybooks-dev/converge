---
id: 002-generate-prd
title: Generate PRD
description: Generate Product Requirements Document from idea.md
inputs:
  - idea.md
outputs:
  - PRD.md
checks:
  - id: prd-exists
    cmd: test -f PRD.md
    description: PRD.md exists
  - id: prd-has-sections
    cmd: grep -qE "## (Overview|Features|Requirements)" PRD.md
    description: PRD.md has expected sections
  - id: prd-matches-idea
    cmd: first=$(head -1 idea.md | sed 's/^#* *//' | awk '{print $1}'); grep -qi "$first" PRD.md
    description: PRD.md references the app name from idea.md
depends_on:
  - 001-gather-idea
tags:
  - requirements
  - prd
---

# Generate PRD

Read `idea.md` and generate a structured Product Requirements Document (`PRD.md`) at the project root.

## Inputs

- `idea.md` — User's app idea with Purpose, Core Features, Target Audience, Technical Requirements

## Constraints

- **Source of truth is ONLY `idea.md`** — Do NOT read or reference existing source code in `lib/`

## Task

Generate `PRD.md` containing these sections:

### 1. Overview
Summarize the app's purpose and value proposition from `idea.md`'s Purpose section. **Start the first sentence with the app name** (e.g., "Folio is a Flutter application that...").

### 2. User Personas
Derive user personas from the Target Audience section in `idea.md`. For each persona include a brief description and key goals.

### 3. Features
Expand Core Features from `idea.md` into detailed feature requirements with acceptance criteria for each feature.

### 4. Non-Functional Requirements
Extract and expand Technical Requirements from `idea.md` into specific non-functional requirements (performance, accessibility, platform support).

## Success Criteria

- `PRD.md` exists in root directory
- `PRD.md` has Overview, Features, and Requirements sections
- `PRD.md` references the app name from `idea.md`
