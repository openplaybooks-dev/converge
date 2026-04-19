---
title: Providers connected to UI
metric:
  script: metric.js
  target: 0
  direction: min
detail:
  script: report.js
plan:
  strategy: split
tags: [data-layer]
---

Every Riverpod provider should be imported and used by at least one screen or widget.
Use `ref.watch(provider)` or `ref.read(provider)` in a `ConsumerWidget` to connect providers to the UI.
