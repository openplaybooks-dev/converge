---
id: 009-01-link-reference
title: "Link reference: History"
description: Verify the reference HTML for history exists and copy it to the canonical design path.
tags:
  - link-reference
  - screen-history
inputs:
  - .stitch/references/history/code.html
outputs:
  - .stitch/designs/history/code.html
checks:
  - id: source-reference-exists
    description: Source reference HTML exists at .stitch/references/history/code.html
    cmd: test -f .stitch/references/history/code.html
  - id: linked-html-exists
    description: Linked HTML copy exists at .stitch/designs/history/code.html
    cmd: test -f .stitch/designs/history/code.html
  - id: linked-html-is-copy
    description: Linked HTML is a verbatim copy of the reference
    cmd: diff -q .stitch/references/history/code.html .stitch/designs/history/code.html
vars:
  prefix: 009
  screenId: history
  title: History
  widgetName: History
  snakeName: history
  route: /history
  screenPath: lib/screens/history/history_screen.dart
  widgetsJsonPath: .stitch/designs/history/widgets.jsonl
  localWidgetsDir: lib/screens/history/widgets
  screenTaskId: 009-history
  specPath: .stitch/designs/history/SPEC.md
  metaPath: .stitch/designs/history/META.md
  designPath: .stitch/designs/history/design.html
  linkedHtmlPath: .stitch/designs/history/code.html
  statesPath: lib/screens/history/history_states.dart
  htmlReference: .stitch/references/history/code.html
  htmlReferenceInput: "  - \".stitch/references/history/code.html\"\n"
  screenshotReference: .stitch/references/history/screen.png
  screenshotReferenceInput: "  - \".stitch/references/history/screen.png\"\n"
  prevScreenLastId: 008-07-states
  variant: 
  variantGroup: 
---

# Link reference: History

Copy the reference HTML from `.stitch/references/history/code.html` to the canonical design location `.stitch/designs/history/code.html`. Downstream steps read from the canonical location so they don't need to know which reference each screen came from.

## Steps

1. Ensure the parent directory exists:
   ```bash
   mkdir -p .stitch/designs/history
   ```
2. Copy verbatim:
   ```bash
   cp .stitch/references/history/code.html .stitch/designs/history/code.html
   ```
3. Verify with `diff -q`.

## Why not a symlink

A hard copy means downstream steps can freely modify `.stitch/designs/history/code.html` (e.g., during normalization) without mutating the source-of-truth reference. The original stays pristine under `.stitch/references/`.

## Banned

- Editing the file during the copy (formatting, stripping, rewriting). 02-normalize-to-glossary does the rewriting.
- Skipping the copy because "the reference already exists" — downstream checks expect `.stitch/designs/history/code.html`.

## Success Criteria

- `.stitch/designs/history/code.html` exists
- `diff -q .stitch/references/history/code.html .stitch/designs/history/code.html` reports no differences
