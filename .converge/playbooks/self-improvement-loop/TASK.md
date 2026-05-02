---
id: self-improvement-loop
title: Analyze and improve converge framework
seeds: [epoch]
---

# Improve Converge Framework

Each epoch runs a pipeline:
1. **Analyze** — parallel scans (types, structure, API, tests) → prioritize best issue
2. **Implement** — fix the picked issue
3. **Review** — code review the changes (rejects backoff to implement)
4. **Quality** — typecheck + test gate
