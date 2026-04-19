---
title: Hardcoded data in screens
metric:
  cmd: "grep -rlE '^(final|const) [a-z].*= \\[' lib/screens/ 2>/dev/null | wc -l | tr -d ' '"
  target: 0
  direction: min
detail:
  script: report.js
plan:
  strategy: split
tags: [data-layer]
---

Hardcoded data arrays in screen files. Data should come from providers or the data layer, not inline constants in screen widgets.
