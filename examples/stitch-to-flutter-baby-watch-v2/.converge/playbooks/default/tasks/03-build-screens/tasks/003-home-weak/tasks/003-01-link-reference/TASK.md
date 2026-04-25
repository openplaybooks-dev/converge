---
id: 003-01-link-reference
title: "Link reference: Home — Weak Signal"
description: Verify the reference HTML for home-weak exists and copy it to the canonical design path.
tags:
  - link-reference
  - screen-home-weak
inputs:
  - .stitch/references/babyguard_home_phase_2_weak_signal/code.html
outputs:
  - .stitch/designs/home-weak/code.html
checks:
  - id: source-reference-exists
    description: Source reference HTML exists at .stitch/references/babyguard_home_phase_2_weak_signal/code.html
    cmd: test -f .stitch/references/babyguard_home_phase_2_weak_signal/code.html
  - id: linked-html-exists
    description: Linked HTML copy exists at .stitch/designs/home-weak/code.html
    cmd: test -f .stitch/designs/home-weak/code.html
  - id: linked-html-is-copy
    description: Linked HTML is a verbatim copy of the reference
    cmd: diff -q .stitch/references/babyguard_home_phase_2_weak_signal/code.html .stitch/designs/home-weak/code.html
vars:
  prefix: 003
  screenId: home-weak
  title: Home — Weak Signal
  widgetName: HomeWeak
  snakeName: home_weak
  route: /home
  screenPath: lib/screens/home_weak/home_weak_screen.dart
  widgetsJsonPath: .stitch/designs/home-weak/widgets.jsonl
  localWidgetsDir: lib/screens/home_weak/widgets
  screenTaskId: 003-home-weak
  specPath: .stitch/designs/home-weak/SPEC.md
  metaPath: .stitch/designs/home-weak/META.md
  designPath: .stitch/designs/home-weak/design.html
  linkedHtmlPath: .stitch/designs/home-weak/code.html
  statesPath: lib/screens/home_weak/home_weak_states.dart
  htmlReference: .stitch/references/babyguard_home_phase_2_weak_signal/code.html
  htmlReferenceInput: "  - \".stitch/references/babyguard_home_phase_2_weak_signal/code.html\"\n"
  screenshotReference: .stitch/references/babyguard_home_phase_2_weak_signal/screen.png
  screenshotReferenceInput: "  - \".stitch/references/babyguard_home_phase_2_weak_signal/screen.png\"\n"
  prevScreenLastId: 002-07-states
  variant: weak
  variantGroup: home
---

# Link reference: Home — Weak Signal

Copy the reference HTML from `.stitch/references/babyguard_home_phase_2_weak_signal/code.html` to the canonical design location `.stitch/designs/home-weak/code.html`. Downstream steps read from the canonical location so they don't need to know which reference each screen came from.

## Steps

1. Ensure the parent directory exists:
   ```bash
   mkdir -p .stitch/designs/home-weak
   ```
2. Copy verbatim:
   ```bash
   cp .stitch/references/babyguard_home_phase_2_weak_signal/code.html .stitch/designs/home-weak/code.html
   ```
3. Verify with `diff -q`.

## Why not a symlink

A hard copy means downstream steps can freely modify `.stitch/designs/home-weak/code.html` (e.g., during normalization) without mutating the source-of-truth reference. The original stays pristine under `.stitch/references/`.

## Banned

- Editing the file during the copy (formatting, stripping, rewriting). 02-normalize-to-glossary does the rewriting.
- Skipping the copy because "the reference already exists" — downstream checks expect `.stitch/designs/home-weak/code.html`.

## Success Criteria

- `.stitch/designs/home-weak/code.html` exists
- `diff -q .stitch/references/babyguard_home_phase_2_weak_signal/code.html .stitch/designs/home-weak/code.html` reports no differences
