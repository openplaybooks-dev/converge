---
id: "{{taskId}}"
title: "Paper draft — epoch {{epoch}}"
depends_on:
  - 006-contradiction-resolution
seeds:
  - type: nodejs
    path: ./wb./seed.js
---

# Paper Draft — Epoch {{epoch}}

Generate an academic-quality research paper from the accumulated evidence.

This task dynamically spawns one task per paper section (8 sections) plus an assembly task that combines them into a coherent paper.

Sections: Abstract, Introduction, Literature Review, Methodology, Results, Discussion, Conclusion, References.
