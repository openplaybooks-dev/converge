---
title: "Wire: {{screenId}}"
description: "Parent task: fix every broken interactive element in {{screenId}}"
tags:
  - screen
  - "{{screenId}}"
vars:
  screenId:
---

# Wire: {{screenId}}

Parent task for fixing all broken interactive elements in the **{{screenId}}** screen.

Children — one per broken element — are spawned by the `003-wire-per-screen` epic parent. Each child wires a single handler (link, button, nav handler) by replacing its placeholder body in place.
