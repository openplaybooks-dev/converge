---
id: improve
title: Analyze and improve converge framework
wbs:
  type: nodejs
  path: ./wbs.js
---

# Improve Converge Framework

Each epoch runs a 4-phase pipeline:
1. **Analyze** — scan codebase for issues, write analysis JSON
2. **Implement** — fix the highest-priority issue
3. **Review** — code review the changes (rejects backoff to implement)
4. **Quality** — typecheck + test gate
