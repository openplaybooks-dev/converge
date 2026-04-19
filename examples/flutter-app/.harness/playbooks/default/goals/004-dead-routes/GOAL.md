---
title: Dead routes in navigation
metric:
  script: metric.js
  target: 0
  direction: min
detail:
  script: report.js
plan:
  strategy: single
tags: [navigation]
---

Navigation paths that don't match any GoRouter route definition. Every navigation action (`context.push`, `context.go`) should target a valid route.
