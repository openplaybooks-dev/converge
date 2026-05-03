---
id: 003-wire-per-screen
title: "Wire Per Screen — Fix All Handlers"
description: Two-level Seed — spawns one parent per screen, then one child per broken interactive element
references:
  - flutter-implementing-navigation-and-routing
  - flutter-managing-state
  - flutter-building-forms
seeds:
  - type: nodejs
    path: ./seeds/wire-per-screen.seed.js
blocking: true
dependencies:
  - 002-analyze-navigations
tags:
  - navigation
  - interactions
  - wiring
inputs:
  - navigations.json
  - lib/router/app_router.dart
outputs:
  - lib/screens/**/*.dart
  - lib/widgets/**/*.dart
---

# Wire Per Screen

Two-level Seed that reads `navigations.json`:

- **Level 1**: One parent task per screen that has broken elements
- **Level 2**: One child task per broken element (link, button, nav handler)

Each child task targets a single handler in a single file with a precise check that verifies that specific handler is wired.
