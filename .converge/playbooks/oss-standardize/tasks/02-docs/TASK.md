---
title: Documentation Overhaul
seeds:
  - type: nodejs
    path: ./wbs.js
blocking: true
---

Create publication-quality documentation for the Converge framework.
Depends on `01-brand` completing first so all references are already
updated to the Converge name.

Pipeline:
1. Move packages/core/README.md to root — promote the best content to repo root
2. Generate banner SVG — rebrand HARNESS→CONVERGE in pixel-art banner
3. Enhance root README.md — badges, quick start, comparison table, architecture overview
4. Finalize packages/core/README.md — slimmed-down package-level README for npm
5. CONTRIBUTING.md — contributor guide, dev setup, PR process
6. Framework comparisons — vs LangChain, CrewAI, AutoGen, Mastra
7. Architecture Decision Records — key design decisions documented
8. CHANGELOG.md — initial changelog from git history
