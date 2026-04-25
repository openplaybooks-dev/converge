---
id: 010-01-link-reference
title: "Link reference: Settings"
description: Verify the reference HTML for settings exists and copy it to the canonical design path.
tags:
  - link-reference
  - screen-settings
inputs:
  - .stitch/references/settings/code.html
outputs:
  - .stitch/designs/settings/code.html
checks:
  - id: source-reference-exists
    description: Source reference HTML exists at .stitch/references/settings/code.html
    cmd: test -f .stitch/references/settings/code.html
  - id: linked-html-exists
    description: Linked HTML copy exists at .stitch/designs/settings/code.html
    cmd: test -f .stitch/designs/settings/code.html
  - id: linked-html-is-copy
    description: Linked HTML is a verbatim copy of the reference
    cmd: diff -q .stitch/references/settings/code.html .stitch/designs/settings/code.html
vars:
  prefix: 010
  screenId: settings
  title: Settings
  widgetName: Settings
  snakeName: settings
  route: /settings
  screenPath: lib/screens/settings/settings_screen.dart
  widgetsJsonPath: .stitch/designs/settings/widgets.jsonl
  localWidgetsDir: lib/screens/settings/widgets
  screenTaskId: 010-settings
  specPath: .stitch/designs/settings/SPEC.md
  metaPath: .stitch/designs/settings/META.md
  designPath: .stitch/designs/settings/design.html
  linkedHtmlPath: .stitch/designs/settings/code.html
  statesPath: lib/screens/settings/settings_states.dart
  htmlReference: .stitch/references/settings/code.html
  htmlReferenceInput: "  - \".stitch/references/settings/code.html\"\n"
  screenshotReference: .stitch/references/settings/screen.png
  screenshotReferenceInput: "  - \".stitch/references/settings/screen.png\"\n"
  prevScreenLastId: 009-07-states
  variant: 
  variantGroup: 
---

# Link reference: Settings

Copy the reference HTML from `.stitch/references/settings/code.html` to the canonical design location `.stitch/designs/settings/code.html`. Downstream steps read from the canonical location so they don't need to know which reference each screen came from.

## Steps

1. Ensure the parent directory exists:
   ```bash
   mkdir -p .stitch/designs/settings
   ```
2. Copy verbatim:
   ```bash
   cp .stitch/references/settings/code.html .stitch/designs/settings/code.html
   ```
3. Verify with `diff -q`.

## Why not a symlink

A hard copy means downstream steps can freely modify `.stitch/designs/settings/code.html` (e.g., during normalization) without mutating the source-of-truth reference. The original stays pristine under `.stitch/references/`.

## Banned

- Editing the file during the copy (formatting, stripping, rewriting). 02-normalize-to-glossary does the rewriting.
- Skipping the copy because "the reference already exists" — downstream checks expect `.stitch/designs/settings/code.html`.

## Success Criteria

- `.stitch/designs/settings/code.html` exists
- `diff -q .stitch/references/settings/code.html .stitch/designs/settings/code.html` reports no differences
