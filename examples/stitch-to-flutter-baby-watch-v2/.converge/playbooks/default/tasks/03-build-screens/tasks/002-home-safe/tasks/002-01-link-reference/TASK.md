---
id: 002-01-link-reference
title: "Link reference: Home — Safe"
description: Verify the reference HTML for home-safe exists and copy it to the canonical design path.
tags:
  - link-reference
  - screen-home-safe
inputs:
  - .stitch/references/babyguard_home_phase_2_safe_updated/code.html
outputs:
  - .stitch/designs/home-safe/code.html
checks:
  - id: source-reference-exists
    description: Source reference HTML exists at .stitch/references/babyguard_home_phase_2_safe_updated/code.html
    cmd: test -f .stitch/references/babyguard_home_phase_2_safe_updated/code.html
  - id: linked-html-exists
    description: Linked HTML copy exists at .stitch/designs/home-safe/code.html
    cmd: test -f .stitch/designs/home-safe/code.html
  - id: linked-html-is-copy
    description: Linked HTML is a verbatim copy of the reference
    cmd: diff -q .stitch/references/babyguard_home_phase_2_safe_updated/code.html .stitch/designs/home-safe/code.html
vars:
  prefix: 002
  screenId: home-safe
  title: Home — Safe
  widgetName: HomeSafe
  snakeName: home_safe
  route: /home
  screenPath: lib/screens/home_safe/home_safe_screen.dart
  widgetsJsonPath: .stitch/designs/home-safe/widgets.jsonl
  localWidgetsDir: lib/screens/home_safe/widgets
  screenTaskId: 002-home-safe
  specPath: .stitch/designs/home-safe/SPEC.md
  metaPath: .stitch/designs/home-safe/META.md
  designPath: .stitch/designs/home-safe/design.html
  linkedHtmlPath: .stitch/designs/home-safe/code.html
  statesPath: lib/screens/home_safe/home_safe_states.dart
  htmlReference: .stitch/references/babyguard_home_phase_2_safe_updated/code.html
  htmlReferenceInput: "  - \".stitch/references/babyguard_home_phase_2_safe_updated/code.html\"\n"
  screenshotReference: .stitch/references/babyguard_home_phase_2_safe_updated/screen.png
  screenshotReferenceInput: "  - \".stitch/references/babyguard_home_phase_2_safe_updated/screen.png\"\n"
  prevScreenLastId: 001-07-states
  variant: safe
  variantGroup: home
---

# Link reference: Home — Safe

Copy the reference HTML from `.stitch/references/babyguard_home_phase_2_safe_updated/code.html` to the canonical design location `.stitch/designs/home-safe/code.html`. Downstream steps read from the canonical location so they don't need to know which reference each screen came from.

## Steps

1. Ensure the parent directory exists:
   ```bash
   mkdir -p .stitch/designs/home-safe
   ```
2. Copy verbatim:
   ```bash
   cp .stitch/references/babyguard_home_phase_2_safe_updated/code.html .stitch/designs/home-safe/code.html
   ```
3. Verify with `diff -q`.

## Why not a symlink

A hard copy means downstream steps can freely modify `.stitch/designs/home-safe/code.html` (e.g., during normalization) without mutating the source-of-truth reference. The original stays pristine under `.stitch/references/`.

## Banned

- Editing the file during the copy (formatting, stripping, rewriting). 02-normalize-to-glossary does the rewriting.
- Skipping the copy because "the reference already exists" — downstream checks expect `.stitch/designs/home-safe/code.html`.

## Success Criteria

- `.stitch/designs/home-safe/code.html` exists
- `diff -q .stitch/references/babyguard_home_phase_2_safe_updated/code.html .stitch/designs/home-safe/code.html` reports no differences
