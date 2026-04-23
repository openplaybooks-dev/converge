---
id: 011-onboarding
title: "Screen: Onboarding"
dependencies:
  - 010-06-lift
tags:
  - screen
  - screen-onboarding
inputs:
  - .stitch/screens.json
  - .stitch/system/DESIGN.md
  - .stitch/UX.md
outputs:
  - lib/screens/onboarding/onboarding_screen.dart
vars:
  screenId: onboarding
  screenTitle: Onboarding
  widgetName: Onboarding
  route: /onboarding
  htmlReference: .stitch/references/babyguard_onboarding_phase_2/code.html
---

Parent task for building the "Onboarding" screen through the full pipeline: spec → design → convert → analyze → split → lift.
