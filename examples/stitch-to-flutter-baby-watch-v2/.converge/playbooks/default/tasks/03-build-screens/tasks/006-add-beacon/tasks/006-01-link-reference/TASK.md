---
id: 006-01-link-reference
title: "Link reference: Add Beacon"
description: Verify the reference HTML for add-beacon exists and copy it to the canonical design path.
tags:
  - link-reference
  - screen-add-beacon
inputs:
  - .stitch/references/th_m_beacon_phase_2/code.html
outputs:
  - .stitch/designs/add-beacon/code.html
checks:
  - id: source-reference-exists
    description: Source reference HTML exists at .stitch/references/th_m_beacon_phase_2/code.html
    cmd: test -f .stitch/references/th_m_beacon_phase_2/code.html
  - id: linked-html-exists
    description: Linked HTML copy exists at .stitch/designs/add-beacon/code.html
    cmd: test -f .stitch/designs/add-beacon/code.html
  - id: linked-html-is-copy
    description: Linked HTML is a verbatim copy of the reference
    cmd: diff -q .stitch/references/th_m_beacon_phase_2/code.html .stitch/designs/add-beacon/code.html
vars:
  prefix: 006
  screenId: add-beacon
  title: Add Beacon
  widgetName: AddBeacon
  snakeName: add_beacon
  route: /devices/add
  screenPath: lib/screens/add_beacon/add_beacon_screen.dart
  widgetsJsonPath: .stitch/designs/add-beacon/widgets.jsonl
  localWidgetsDir: lib/screens/add_beacon/widgets
  screenTaskId: 006-add-beacon
  specPath: .stitch/designs/add-beacon/SPEC.md
  metaPath: .stitch/designs/add-beacon/META.md
  designPath: .stitch/designs/add-beacon/design.html
  linkedHtmlPath: .stitch/designs/add-beacon/code.html
  statesPath: lib/screens/add_beacon/add_beacon_states.dart
  htmlReference: .stitch/references/th_m_beacon_phase_2/code.html
  htmlReferenceInput: "  - \".stitch/references/th_m_beacon_phase_2/code.html\"\n"
  screenshotReference: .stitch/references/th_m_beacon_phase_2/screen.png
  screenshotReferenceInput: "  - \".stitch/references/th_m_beacon_phase_2/screen.png\"\n"
  prevScreenLastId: 005-07-states
  variant: 
  variantGroup: 
---

# Link reference: Add Beacon

Copy the reference HTML from `.stitch/references/th_m_beacon_phase_2/code.html` to the canonical design location `.stitch/designs/add-beacon/code.html`. Downstream steps read from the canonical location so they don't need to know which reference each screen came from.

## Steps

1. Ensure the parent directory exists:
   ```bash
   mkdir -p .stitch/designs/add-beacon
   ```
2. Copy verbatim:
   ```bash
   cp .stitch/references/th_m_beacon_phase_2/code.html .stitch/designs/add-beacon/code.html
   ```
3. Verify with `diff -q`.

## Why not a symlink

A hard copy means downstream steps can freely modify `.stitch/designs/add-beacon/code.html` (e.g., during normalization) without mutating the source-of-truth reference. The original stays pristine under `.stitch/references/`.

## Banned

- Editing the file during the copy (formatting, stripping, rewriting). 02-normalize-to-glossary does the rewriting.
- Skipping the copy because "the reference already exists" — downstream checks expect `.stitch/designs/add-beacon/code.html`.

## Success Criteria

- `.stitch/designs/add-beacon/code.html` exists
- `diff -q .stitch/references/th_m_beacon_phase_2/code.html .stitch/designs/add-beacon/code.html` reports no differences
