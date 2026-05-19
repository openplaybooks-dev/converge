---
id: test-structure
title: "Root — mirrors financial-deep-research root"
mode: spawner
spawn:
  min_children: 1

---

# Root Task

Spawns 3 children in order:
1. **A (pipeline)** — has its own seed spawning A1, A2
2. **B (cross-ticker)** — depends on A
3. **C (report)** — depends on B

Emit only explicit `converge spawn task` commands. The `A-pipeline` child must
itself use `seed: { mode: cli }` and describe spawning `A1-fundamental` then
`A2-technical`.
