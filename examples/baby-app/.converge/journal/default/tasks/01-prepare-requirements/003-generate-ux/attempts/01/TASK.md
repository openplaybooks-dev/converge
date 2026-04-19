# Task: 01-prepare-requirements/003-generate-ux

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