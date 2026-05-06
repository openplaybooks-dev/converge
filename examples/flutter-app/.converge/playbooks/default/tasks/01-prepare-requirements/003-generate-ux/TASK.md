---
id: 003-generate-ux
title: Generate UX Overview
description: Generate UX specification from PRD using ux-design skill
inputs:
  - PRD.md
outputs:
  - .stitch/UX.md
checks:
  - id: ux-md-exists
    cmd: test -f .stitch/UX.md
    description: UX.md exists
  - id: ux-has-screens
    cmd: grep -qE "##.*Screens" .stitch/UX.md
    description: UX.md has screens section
  - id: ux-matches-idea
    cmd: "first=$(awk '/^## Overview/{found=1; next} found && /^[^ #]/{print $1; exit}' PRD.md); grep -qi \"$first\" .stitch/UX.md"
    description: UX.md references the app name from PRD.md
depends_on:
  - 002-generate-prd
tags:
  - requirements
  - ux
vars:
  skill: ux-design
---

# Generate UX Overview

Invoke **/ux-design** skill to generate `.stitch/UX.md` from the PRD.

## Inputs

- `PRD.md` — Product Requirements Document

## Constraints

- **Source of truth is ONLY `PRD.md`** — Do NOT read or reference existing source code in `lib/`
- If `data-modeling/` does not exist, derive everything from `PRD.md` alone
- The UX.md title and screens MUST correspond to the app described in `PRD.md`
- Screens should be designed for **Flutter** — consider platform conventions (Material 3, bottom navigation, app bars)

## Task

Invoke **/ux-design** to create `.stitch/UX.md` containing:
- Project overview
- Screen definitions (Flutter screens, not web pages)
- Design token recommendations (Material 3 compatible)
- User flows
- Visual style guidelines

## Success Criteria

- `.stitch/UX.md` exists
- `.stitch/UX.md` has screens section
- File has valid content (not empty)
