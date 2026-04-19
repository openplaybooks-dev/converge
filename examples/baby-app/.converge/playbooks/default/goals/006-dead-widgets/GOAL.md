---
title: Unused/dead widgets
metric:
  script: metric.js
  target: 0
  direction: min
detail:
  script: report.js
plan:
  strategy: single
tags: [code-quality]
---

Widget files that are not imported by any other file. Dead widgets should be deleted to reduce code bloat.
