---
id: 007-01-link-reference
title: "Link reference: Co-guardians"
description: Verify the reference HTML for co-guardians-list exists and copy it to the canonical design path.
tags:
  - link-reference
  - screen-co-guardians-list
inputs:
  - .stitch/references/ch_p_nh_n_l_i_m_i/code.html
outputs:
  - .stitch/designs/co-guardians-list/code.html
checks:
  - id: source-reference-exists
    description: Source reference HTML exists at .stitch/references/ch_p_nh_n_l_i_m_i/code.html
    cmd: test -f .stitch/references/ch_p_nh_n_l_i_m_i/code.html
  - id: linked-html-exists
    description: Linked HTML copy exists at .stitch/designs/co-guardians-list/code.html
    cmd: test -f .stitch/designs/co-guardians-list/code.html
  - id: linked-html-is-copy
    description: Linked HTML is a verbatim copy of the reference
    cmd: diff -q .stitch/references/ch_p_nh_n_l_i_m_i/code.html .stitch/designs/co-guardians-list/code.html
vars:
  prefix: 007
  screenId: co-guardians-list
  title: Co-guardians
  widgetName: CoGuardiansList
  snakeName: co_guardians_list
  route: /devices/co-guardians
  screenPath: lib/screens/co_guardians_list/co_guardians_list_screen.dart
  widgetsJsonPath: .stitch/designs/co-guardians-list/widgets.jsonl
  localWidgetsDir: lib/screens/co_guardians_list/widgets
  screenTaskId: 007-co-guardians-list
  specPath: .stitch/designs/co-guardians-list/SPEC.md
  metaPath: .stitch/designs/co-guardians-list/META.md
  designPath: .stitch/designs/co-guardians-list/design.html
  linkedHtmlPath: .stitch/designs/co-guardians-list/code.html
  statesPath: lib/screens/co_guardians_list/co_guardians_list_states.dart
  htmlReference: .stitch/references/ch_p_nh_n_l_i_m_i/code.html
  htmlReferenceInput: "  - \".stitch/references/ch_p_nh_n_l_i_m_i/code.html\"\n"
  screenshotReference: .stitch/references/ch_p_nh_n_l_i_m_i/screen.png
  screenshotReferenceInput: "  - \".stitch/references/ch_p_nh_n_l_i_m_i/screen.png\"\n"
  prevScreenLastId: 006-07-states
  variant: 
  variantGroup: 
---

# Link reference: Co-guardians

Copy the reference HTML from `.stitch/references/ch_p_nh_n_l_i_m_i/code.html` to the canonical design location `.stitch/designs/co-guardians-list/code.html`. Downstream steps read from the canonical location so they don't need to know which reference each screen came from.

## Steps

1. Ensure the parent directory exists:
   ```bash
   mkdir -p .stitch/designs/co-guardians-list
   ```
2. Copy verbatim:
   ```bash
   cp .stitch/references/ch_p_nh_n_l_i_m_i/code.html .stitch/designs/co-guardians-list/code.html
   ```
3. Verify with `diff -q`.

## Why not a symlink

A hard copy means downstream steps can freely modify `.stitch/designs/co-guardians-list/code.html` (e.g., during normalization) without mutating the source-of-truth reference. The original stays pristine under `.stitch/references/`.

## Banned

- Editing the file during the copy (formatting, stripping, rewriting). 02-normalize-to-glossary does the rewriting.
- Skipping the copy because "the reference already exists" — downstream checks expect `.stitch/designs/co-guardians-list/code.html`.

## Success Criteria

- `.stitch/designs/co-guardians-list/code.html` exists
- `diff -q .stitch/references/ch_p_nh_n_l_i_m_i/code.html .stitch/designs/co-guardians-list/code.html` reports no differences
