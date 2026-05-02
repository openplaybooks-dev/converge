---
id: commands-graph
title: commands-graph.ts — dag.toManifest() serialization
description: Replace TaskTree.load() with dag.toManifest() for graph output.
children:
  - commands-graph-red
  - commands-graph-green
---

# 05 — commands-graph.ts

### red
Write baseline test for `converge graph` output.

### green
Replace `TaskTree.load()` with `dag.toManifest()` serialization.
Graph rendering reads from the manifest format.
