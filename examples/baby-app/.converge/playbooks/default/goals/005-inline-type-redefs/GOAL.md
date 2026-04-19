---
title: Inline type redefinitions
metric:
  script: metric.js
  target: 0
  direction: min
detail:
  script: report.js
plan:
  strategy: split
tags: [code-quality]
---

Dart classes or typedefs that duplicate models already defined in `lib/models/`. All data types should be imported from the models package, not redefined inline in screens or widgets.
