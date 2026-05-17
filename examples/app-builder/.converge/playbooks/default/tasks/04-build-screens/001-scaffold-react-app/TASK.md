---
id: 001-scaffold-react-app
title: Scaffold React App
description: Create the base Vite + React + TypeScript project structure used by all later phases
blocking: true
skills:
  - react-theming-apps
  - react-testing-apps
inputs:
  - .stitch/system/DESIGN.md
  - .stitch/system/META.md
outputs:
  - package.json
  - index.html
  - tsconfig.json
  - tsconfig.node.json
  - vite.config.ts
  - tailwind.config.ts
  - postcss.config.cjs
  - src/main.tsx
  - src/app/AppShell.tsx
  - src/app/router.tsx
  - src/theme/theme.css
  - src/styles/base.css
  - src/test/setup.ts
checks:
  - id: package-exists
    cmd: test -f package.json
    description: package.json exists
  - id: theme-exists
    cmd: test -f src/theme/theme.css
    description: theme.css exists
---
# Scaffold React App

Create the base project files for a generated React app.

Requirements:

- `Vite + React + TypeScript`
- `react-router-dom` for routing
- `framer-motion` for motion
- `tailwindcss` plus CSS variables for theming
- `vitest` and Testing Library for tests
- a root shell component that can host route-level background treatments
- a theme file that defines semantic variables for both light and dark mode

Do not create placeholder corporate layouts. The base shell should already reflect the design system's atmosphere.

