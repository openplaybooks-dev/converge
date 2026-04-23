---
id: 002-01-spec
title: "Spec: Beacon Scanner"
description: Generate Beacon Scanner screen specification
tags:
  - spec
  - screen-beacon-scanner
inputs:
  - .stitch/system/DESIGN.md
  - .stitch/UX.md
  - .stitch/screens.json
  - .stitch/references/ANALYSIS.md
  - .stitch/references/th_m_beacon_phase_2/code.html
outputs:
  - .stitch/designs/beacon-scanner/SPEC.md
checks:
  - id: spec-exists
    description: SPEC.md exists for beacon-scanner
    cmd: test -f .stitch/designs/beacon-scanner/SPEC.md
  - id: spec-has-content
    description: "SPEC.md has >50 lines"
    cmd: test $(wc -l < .stitch/designs/beacon-scanner/SPEC.md) -gt 50
plan:
vars:
  references: ["flutter-building-layouts"]
  prefix: 002
  screenId: beacon-scanner
  title: Beacon Scanner
  widgetName: BeaconScanner
  snakeName: beacon_scanner
  route: /scan
  screenPath: lib/screens/beacon_scanner/beacon_scanner_screen.dart
  widgetsJsonPath: .stitch/designs/beacon-scanner/widgets.jsonl
  localWidgetsDir: lib/screens/beacon_scanner/widgets
  screenTaskId: 002-beacon-scanner
  specPath: .stitch/designs/beacon-scanner/SPEC.md
  metaPath: .stitch/designs/beacon-scanner/META.md
  designPath: .stitch/designs/beacon-scanner/design.html
  prevScreenLastId: 001-06-lift
  htmlReference: .stitch/references/th_m_beacon_phase_2/code.html
  htmlReferenceInput: "  - \".stitch/references/th_m_beacon_phase_2/code.html\"\n"
---

# Spec: Beacon Scanner

Generate the screen specification for **Beacon Scanner** (`/scan`).

## Inputs
- `.stitch/system/DESIGN.md` — Design system
- `.stitch/UX.md` — UX overview
- `.stitch/screens.json` — Screen definitions (includes `htmlReference` for this screen: `.stitch/references/th_m_beacon_phase_2/code.html`)
- `.stitch/references/ANALYSIS.md` — Synthesized analysis of design references (if available)
- **Linked HTML reference** — Repo-relative path from `screens.json` → `htmlReference` for this screen (see below). When this path is **non-empty** and the file exists, it is mandatory input.

## Reference HTML (`htmlReference`)

Value from `.stitch/screens.json` for this screen: **`.stitch/references/th_m_beacon_phase_2/code.html`**

- If **non-empty** and the file exists at that path: open and read that HTML. It is the **authoritative** Stitch/reference UI for this screen. The spec MUST describe the same screen as that file: **identical** section order, hierarchy, visible labels/copy (allow language normalization only if UX mandates another locale), controls, states implied by the markup, and layout intent. Map Tailwind or raw HTML structure into clear Flutter-oriented section descriptions. If `ANALYSIS.md` or `UX.md` disagrees with this file, **prefer the linked HTML** for layout and content fidelity.
- If **empty** or the file is missing: do **not** treat a single HTML file as authoritative; use `ANALYSIS.md` Screen Inventory and `UX.md` as before to infer the closest reference screens.

## Task

1. If there is **no** usable linked HTML (empty `htmlReference` or missing file) and `.stitch/references/ANALYSIS.md` exists, consult the Screen Inventory and Component Inventory to find reference screens that match this screen's purpose. Note matching references for use in the spec.

Read inputs and produce `.stitch/designs/beacon-scanner/SPEC.md` containing:

1. **Screen Title** — Beacon Scanner
2. **Purpose** — What this screen does and why
3. **Route** — `/scan`
4. **Widget Name** — `BeaconScannerScreen`
5. **Design Tokens** — Colors, typography, spacing from DESIGN.md
6. **Layout Rules** — Scaffold structure, app bar, body, bottom nav
7. **Sections** — Each visual section with:
   - Description of content
   - Widget type (ListView, GridView, Column, etc.)
   - Data requirements
   - Interactive elements
8. **Data** — Entities and fields displayed on this screen
9. **Motion** — Entry animations, transitions, hero animations
10. **Accessibility** — Semantics labels, focus order, contrast notes
11. **Anti-Patterns** — Things to avoid

## Success Criteria

- `.stitch/designs/beacon-scanner/SPEC.md` exists and has >50 lines
- All required sections present
- Design tokens reference DESIGN.md values
- When `htmlReference` is non-empty and the file exists, the spec explicitly states that the linked HTML was the fidelity source and the described UI matches it
