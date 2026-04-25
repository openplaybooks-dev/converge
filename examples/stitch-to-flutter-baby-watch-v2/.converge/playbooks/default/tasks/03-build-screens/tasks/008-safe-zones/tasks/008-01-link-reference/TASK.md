---
id: 008-01-link-reference
title: "Link reference: Safe Zones"
description: Verify the reference HTML for safe-zones exists and copy it to the canonical design path.
tags:
  - link-reference
  - screen-safe-zones
inputs:
  - .stitch/references/safe_zones/code.html
outputs:
  - .stitch/designs/safe-zones/code.html
checks:
  - id: source-reference-exists
    description: Source reference HTML exists at .stitch/references/safe_zones/code.html
    cmd: test -f .stitch/references/safe_zones/code.html
  - id: linked-html-exists
    description: Linked HTML copy exists at .stitch/designs/safe-zones/code.html
    cmd: test -f .stitch/designs/safe-zones/code.html
  - id: linked-html-is-copy
    description: Linked HTML is a verbatim copy of the reference
    cmd: diff -q .stitch/references/safe_zones/code.html .stitch/designs/safe-zones/code.html
vars:
  prefix: 008
  screenId: safe-zones
  title: Safe Zones
  widgetName: SafeZones
  snakeName: safe_zones
  route: /security
  screenPath: lib/screens/safe_zones/safe_zones_screen.dart
  widgetsJsonPath: .stitch/designs/safe-zones/widgets.jsonl
  localWidgetsDir: lib/screens/safe_zones/widgets
  screenTaskId: 008-safe-zones
  specPath: .stitch/designs/safe-zones/SPEC.md
  metaPath: .stitch/designs/safe-zones/META.md
  designPath: .stitch/designs/safe-zones/design.html
  linkedHtmlPath: .stitch/designs/safe-zones/code.html
  statesPath: lib/screens/safe_zones/safe_zones_states.dart
  htmlReference: .stitch/references/safe_zones/code.html
  htmlReferenceInput: "  - \".stitch/references/safe_zones/code.html\"\n"
  screenshotReference: .stitch/references/safe_zones/screen.png
  screenshotReferenceInput: "  - \".stitch/references/safe_zones/screen.png\"\n"
  prevScreenLastId: 007-07-states
  variant: 
  variantGroup: 
---

# Link reference: Safe Zones

Copy the reference HTML from `.stitch/references/safe_zones/code.html` to the canonical design location `.stitch/designs/safe-zones/code.html`. Downstream steps read from the canonical location so they don't need to know which reference each screen came from.

## Steps

1. Ensure the parent directory exists:
   ```bash
   mkdir -p .stitch/designs/safe-zones
   ```
2. Copy verbatim:
   ```bash
   cp .stitch/references/safe_zones/code.html .stitch/designs/safe-zones/code.html
   ```
3. Verify with `diff -q`.

## Why not a symlink

A hard copy means downstream steps can freely modify `.stitch/designs/safe-zones/code.html` (e.g., during normalization) without mutating the source-of-truth reference. The original stays pristine under `.stitch/references/`.

## Banned

- Editing the file during the copy (formatting, stripping, rewriting). 02-normalize-to-glossary does the rewriting.
- Skipping the copy because "the reference already exists" — downstream checks expect `.stitch/designs/safe-zones/code.html`.

## Success Criteria

- `.stitch/designs/safe-zones/code.html` exists
- `diff -q .stitch/references/safe_zones/code.html .stitch/designs/safe-zones/code.html` reports no differences
