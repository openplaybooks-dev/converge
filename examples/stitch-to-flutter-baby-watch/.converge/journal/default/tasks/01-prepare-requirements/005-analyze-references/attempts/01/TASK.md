# Task: 01-prepare-requirements/005-analyze-references

# Analyze Design References

Scan all subdirectories in `.stitch/references/` and produce a single synthesized analysis document at `.stitch/references/ANALYSIS.md`.

## Inputs

- `idea.md` — App idea for domain context
- `.stitch/references/*/screen.png` — Screenshot images of reference screens
- `.stitch/references/*/code.html` — HTML source of reference screens (Tailwind-based)
- `.stitch/references/*/DESIGN.md` — Design system specifications

## Reference Types

Each subdirectory in `.stitch/references/` contains one of:
- **Screen reference** — `screen.png` + `code.html` pair (a rendered screen and its HTML source)
- **Design system reference** — `DESIGN.md` (a design system specification document)

## Task

1. **Read `idea.md`** to understand the app domain and purpose

2. **Enumerate `.stitch/references/`** — list all subdirectories and classify each as screen-ref or design-system-ref based on contents

3. **For each screen reference** (has `code.html` + `screen.png`):
   - View `screen.png` to understand the visual design
   - Read `code.html` and extract:
     - Tailwind CSS tokens used (colors, spacing, typography, radius)
     - Layout structure (grid/flex patterns, sections, component hierarchy)
     - UI components present (cards, buttons, lists, inputs, nav bars, etc.)
     - Data entities visible (what domain objects appear, what fields are shown)
     - Interaction states (if the screen name implies a state variant)

4. **For each design system reference** (has `DESIGN.md`):
   - Read `DESIGN.md` and extract:
     - Color palette (primary, secondary, accent, semantic colors with hex values)
     - Typography rules (font families, weights, sizes, roles)
     - Elevation and shadow definitions
     - Border radius and shape tokens
     - Component styling rules
     - Design principles and anti-patterns

5. **Produce `.stitch/references/ANALYSIS.md`** with these sections:

   ## Design System Synthesis
   Merged color palette, typography, elevation, radius, and spacing tokens across all design system references. Note consensus values and conflicts.

   ## Screen Inventory
   Table of all screen references. **Each row must name the exact HTML source** as a repo-relative path under `.stitch/references/**/code.html` (e.g. `.stitch/references/babyguard_home_phase_2_alert/code.html`). Columns at minimum: `code.html` path, reference directory name, screen type/purpose, layout pattern (e.g., list, detail, form, dashboard), key visual characteristics. One screen reference = one `code.html` row (no orphan directories without a path).

   ## Component Inventory
   All UI components observed across references, with variants and frequency count. Group by category (navigation, content, input, feedback).

   ## Data Entities
   Domain objects visible in reference UIs — entity names, visible fields, relationships inferred from the screens.

   ## Interaction Patterns
   State variations observed (e.g., alert vs safe vs weak-signal), animation hints, touch target patterns, navigation patterns.

   ## Design Scoring Matrix
   Per-reference scoring table for downstream example matching:
   | Reference | Complexity | Component Count | State Variants | Best Match For |
   Rate each reference on a 1-5 scale for complexity and note what screen types it best represents.

## Graceful Degradation

If `.stitch/references/` is empty or does not exist, produce a minimal ANALYSIS.md noting that no references are available and downstream tasks should rely on DESIGN.md and UX.md alone.

## Success Criteria

- `.stitch/references/ANALYSIS.md` exists
- Contains "## Design System Synthesis" section
- Contains "## Screen Inventory" section
- All reference subdirectories are accounted for in the inventory