---
id: do
title: Task dispatcher
wbs:
  type: nodejs
  path: ./wbs/index.js
---

# Task Dispatcher

Each `--add` invokes the WBS to stamp a new task under `tasks/`.
Each task runs the full pipeline: analyze → implement → review → quality.
