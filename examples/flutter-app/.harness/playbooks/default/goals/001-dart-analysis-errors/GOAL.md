---
title: Dart Analysis Errors
metric:
  cmd: "dart analyze --no-fatal-infos lib/ 2>&1 | grep -c 'error' || echo 0"
  target: 0
  direction: min
detail:
  cmd: "dart analyze --no-fatal-infos lib/ 2>&1 | head -20"
plan:
  strategy: wbs
tags: [code-quality]
---

Dart static analysis errors. The project should pass `dart analyze` cleanly with no errors.
