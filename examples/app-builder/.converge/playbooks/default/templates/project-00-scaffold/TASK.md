---
title: Scaffold Project
description: Create the project foundation for the generated React app
blocking: true
vars:
  themeName:
inputs:
  - .stitch/system/DESIGN.md
outputs:
  - package.json
  - src/main.tsx
checks:
  - id: package-exists
    cmd: test -f package.json
    description: package exists
---
# Scaffold Project

Create or update the base project files so the app can build with Vite.

This template is for one-time scaffolding only. It must not overwrite completed screens.

