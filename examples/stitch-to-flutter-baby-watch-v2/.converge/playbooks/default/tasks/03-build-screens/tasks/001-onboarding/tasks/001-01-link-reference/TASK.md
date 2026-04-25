---
id: 001-01-link-reference
title: "Link reference: Onboarding"
description: Verify the reference HTML for onboarding exists and copy it to the canonical design path.
tags:
  - link-reference
  - screen-onboarding
inputs:
  - .stitch/references/babyguard_onboarding_phase_2/code.html
outputs:
  - .stitch/designs/onboarding/code.html
checks:
  - id: source-reference-exists
    description: Source reference HTML exists at .stitch/references/babyguard_onboarding_phase_2/code.html
    cmd: test -f .stitch/references/babyguard_onboarding_phase_2/code.html
  - id: linked-html-exists
    description: Linked HTML copy exists at .stitch/designs/onboarding/code.html
    cmd: test -f .stitch/designs/onboarding/code.html
  - id: linked-html-is-copy
    description: Linked HTML is a verbatim copy of the reference
    cmd: diff -q .stitch/references/babyguard_onboarding_phase_2/code.html .stitch/designs/onboarding/code.html
vars:
  prefix: 001
  screenId: onboarding
  title: Onboarding
  widgetName: Onboarding
  snakeName: onboarding
  route: /onboarding
  screenPath: lib/screens/onboarding/onboarding_screen.dart
  widgetsJsonPath: .stitch/designs/onboarding/widgets.jsonl
  localWidgetsDir: lib/screens/onboarding/widgets
  screenTaskId: 001-onboarding
  specPath: .stitch/designs/onboarding/SPEC.md
  metaPath: .stitch/designs/onboarding/META.md
  designPath: .stitch/designs/onboarding/design.html
  linkedHtmlPath: .stitch/designs/onboarding/code.html
  statesPath: lib/screens/onboarding/onboarding_states.dart
  htmlReference: .stitch/references/babyguard_onboarding_phase_2/code.html
  htmlReferenceInput: "  - \".stitch/references/babyguard_onboarding_phase_2/code.html\"\n"
  screenshotReference: .stitch/references/babyguard_onboarding_phase_2/screen.png
  screenshotReferenceInput: "  - \".stitch/references/babyguard_onboarding_phase_2/screen.png\"\n"
  prevScreenLastId: 
  variant: 
  variantGroup: 
---

# Link reference: Onboarding

Copy the reference HTML from `.stitch/references/babyguard_onboarding_phase_2/code.html` to the canonical design location `.stitch/designs/onboarding/code.html`. Downstream steps read from the canonical location so they don't need to know which reference each screen came from.

## Steps

1. Ensure the parent directory exists:
   ```bash
   mkdir -p .stitch/designs/onboarding
   ```
2. Copy verbatim:
   ```bash
   cp .stitch/references/babyguard_onboarding_phase_2/code.html .stitch/designs/onboarding/code.html
   ```
3. Verify with `diff -q`.

## Why not a symlink

A hard copy means downstream steps can freely modify `.stitch/designs/onboarding/code.html` (e.g., during normalization) without mutating the source-of-truth reference. The original stays pristine under `.stitch/references/`.

## Banned

- Editing the file during the copy (formatting, stripping, rewriting). 02-normalize-to-glossary does the rewriting.
- Skipping the copy because "the reference already exists" — downstream checks expect `.stitch/designs/onboarding/code.html`.

## Success Criteria

- `.stitch/designs/onboarding/code.html` exists
- `diff -q .stitch/references/babyguard_onboarding_phase_2/code.html .stitch/designs/onboarding/code.html` reports no differences
