---
title: Project Setup
checks:
  - id: package-json
    cmd: test -f package.json
  - id: tsconfig
    cmd: test -f tsconfig.json
---

Initialize the project:

1. Create package.json with TypeScript, React, and Vite
2. Create tsconfig.json with strict mode
3. Create src/main.tsx entry point
4. Verify `npm install` succeeds
