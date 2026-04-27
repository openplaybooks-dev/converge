---
id: split-cli
title: Split CLI monolith
wbs:
  type: nodejs
  path: ./wbs/index.js
---

# Split CLI monolith

Execute the 13-PR plan to modularize `packages/core/src/cli/`.

The root WBS seeds 13 sequential PR items from the shared `templates/item` pipeline.
Each item runs: **analyze → implement → review → quality**.

See `README.md` for the full scope table.
