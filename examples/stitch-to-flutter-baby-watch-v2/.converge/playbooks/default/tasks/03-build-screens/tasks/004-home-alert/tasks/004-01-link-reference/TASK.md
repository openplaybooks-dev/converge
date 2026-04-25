---
id: 004-01-link-reference
title: "Link reference: Home — Alert"
description: Verify the reference HTML for home-alert exists and copy it to the canonical design path.
tags:
  - link-reference
  - screen-home-alert
inputs:
  - .stitch/references/babyguard_home_phase_2_alert/code.html
outputs:
  - .stitch/designs/home-alert/code.html
checks:
  - id: source-reference-exists
    description: Source reference HTML exists at .stitch/references/babyguard_home_phase_2_alert/code.html
    cmd: test -f .stitch/references/babyguard_home_phase_2_alert/code.html
  - id: linked-html-exists
    description: Linked HTML copy exists at .stitch/designs/home-alert/code.html
    cmd: test -f .stitch/designs/home-alert/code.html
  - id: linked-html-is-copy
    description: Linked HTML is a verbatim copy of the reference
    cmd: diff -q .stitch/references/babyguard_home_phase_2_alert/code.html .stitch/designs/home-alert/code.html
vars:
  prefix: 004
  screenId: home-alert
  title: Home — Alert
  widgetName: HomeAlert
  snakeName: home_alert
  route: /home
  screenPath: lib/screens/home_alert/home_alert_screen.dart
  widgetsJsonPath: .stitch/designs/home-alert/widgets.jsonl
  localWidgetsDir: lib/screens/home_alert/widgets
  screenTaskId: 004-home-alert
  specPath: .stitch/designs/home-alert/SPEC.md
  metaPath: .stitch/designs/home-alert/META.md
  designPath: .stitch/designs/home-alert/design.html
  linkedHtmlPath: .stitch/designs/home-alert/code.html
  statesPath: lib/screens/home_alert/home_alert_states.dart
  htmlReference: .stitch/references/babyguard_home_phase_2_alert/code.html
  htmlReferenceInput: "  - \".stitch/references/babyguard_home_phase_2_alert/code.html\"\n"
  screenshotReference: .stitch/references/babyguard_home_phase_2_alert/screen.png
  screenshotReferenceInput: "  - \".stitch/references/babyguard_home_phase_2_alert/screen.png\"\n"
  prevScreenLastId: 003-07-states
  variant: alert
  variantGroup: home
---

# Link reference: Home — Alert

Copy the reference HTML from `.stitch/references/babyguard_home_phase_2_alert/code.html` to the canonical design location `.stitch/designs/home-alert/code.html`. Downstream steps read from the canonical location so they don't need to know which reference each screen came from.

## Steps

1. Ensure the parent directory exists:
   ```bash
   mkdir -p .stitch/designs/home-alert
   ```
2. Copy verbatim:
   ```bash
   cp .stitch/references/babyguard_home_phase_2_alert/code.html .stitch/designs/home-alert/code.html
   ```
3. Verify with `diff -q`.

## Why not a symlink

A hard copy means downstream steps can freely modify `.stitch/designs/home-alert/code.html` (e.g., during normalization) without mutating the source-of-truth reference. The original stays pristine under `.stitch/references/`.

## Banned

- Editing the file during the copy (formatting, stripping, rewriting). 02-normalize-to-glossary does the rewriting.
- Skipping the copy because "the reference already exists" — downstream checks expect `.stitch/designs/home-alert/code.html`.

## Success Criteria

- `.stitch/designs/home-alert/code.html` exists
- `diff -q .stitch/references/babyguard_home_phase_2_alert/code.html .stitch/designs/home-alert/code.html` reports no differences
