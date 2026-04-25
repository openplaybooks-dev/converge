---
id: 005-01-link-reference
title: "Link reference: Beacon Detail"
description: Verify the reference HTML for beacon-detail exists and copy it to the canonical design path.
tags:
  - link-reference
  - screen-beacon-detail
inputs:
  - .stitch/references/chi_ti_t_beacon_phase_2/code.html
outputs:
  - .stitch/designs/beacon-detail/code.html
checks:
  - id: source-reference-exists
    description: Source reference HTML exists at .stitch/references/chi_ti_t_beacon_phase_2/code.html
    cmd: test -f .stitch/references/chi_ti_t_beacon_phase_2/code.html
  - id: linked-html-exists
    description: Linked HTML copy exists at .stitch/designs/beacon-detail/code.html
    cmd: test -f .stitch/designs/beacon-detail/code.html
  - id: linked-html-is-copy
    description: Linked HTML is a verbatim copy of the reference
    cmd: diff -q .stitch/references/chi_ti_t_beacon_phase_2/code.html .stitch/designs/beacon-detail/code.html
vars:
  prefix: 005
  screenId: beacon-detail
  title: Beacon Detail
  widgetName: BeaconDetail
  snakeName: beacon_detail
  route: /devices
  screenPath: lib/screens/beacon_detail/beacon_detail_screen.dart
  widgetsJsonPath: .stitch/designs/beacon-detail/widgets.jsonl
  localWidgetsDir: lib/screens/beacon_detail/widgets
  screenTaskId: 005-beacon-detail
  specPath: .stitch/designs/beacon-detail/SPEC.md
  metaPath: .stitch/designs/beacon-detail/META.md
  designPath: .stitch/designs/beacon-detail/design.html
  linkedHtmlPath: .stitch/designs/beacon-detail/code.html
  statesPath: lib/screens/beacon_detail/beacon_detail_states.dart
  htmlReference: .stitch/references/chi_ti_t_beacon_phase_2/code.html
  htmlReferenceInput: "  - \".stitch/references/chi_ti_t_beacon_phase_2/code.html\"\n"
  screenshotReference: .stitch/references/chi_ti_t_beacon_phase_2/screen.png
  screenshotReferenceInput: "  - \".stitch/references/chi_ti_t_beacon_phase_2/screen.png\"\n"
  prevScreenLastId: 004-07-states
  variant: 
  variantGroup: 
---

# Link reference: Beacon Detail

Copy the reference HTML from `.stitch/references/chi_ti_t_beacon_phase_2/code.html` to the canonical design location `.stitch/designs/beacon-detail/code.html`. Downstream steps read from the canonical location so they don't need to know which reference each screen came from.

## Steps

1. Ensure the parent directory exists:
   ```bash
   mkdir -p .stitch/designs/beacon-detail
   ```
2. Copy verbatim:
   ```bash
   cp .stitch/references/chi_ti_t_beacon_phase_2/code.html .stitch/designs/beacon-detail/code.html
   ```
3. Verify with `diff -q`.

## Why not a symlink

A hard copy means downstream steps can freely modify `.stitch/designs/beacon-detail/code.html` (e.g., during normalization) without mutating the source-of-truth reference. The original stays pristine under `.stitch/references/`.

## Banned

- Editing the file during the copy (formatting, stripping, rewriting). 02-normalize-to-glossary does the rewriting.
- Skipping the copy because "the reference already exists" — downstream checks expect `.stitch/designs/beacon-detail/code.html`.

## Success Criteria

- `.stitch/designs/beacon-detail/code.html` exists
- `diff -q .stitch/references/chi_ti_t_beacon_phase_2/code.html .stitch/designs/beacon-detail/code.html` reports no differences
