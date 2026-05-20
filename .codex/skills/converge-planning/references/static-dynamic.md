# Static vs. Dynamic Subtask Reference

Decision guide for static vs. dynamic subtask decomposition. Read when planning a container and deciding whether to hand-write children or use runtime spawn templates.

---

## Static vs. Dynamic Subtasks

**The core decomposition choice: when you split a task into subtasks, each subtask is either static or dynamic.**

| Subtask type | How it's created | When it's knowable | Use when |
|---|---|---|---|
| **Static** | Hand-written `TASK.md` file | Compile time (*concrete*) | Fixed set, known at plan time, ≤ ~7 children |
| **Dynamic** | parent body spawns it from a template at runtime | After the parent runs (*expected* or *adaptive*) | Data-driven list, unknown at plan time, N > 7, or N may grow |

**Static subtasks** are the default. Write each child's `TASK.md` by hand. The DAG is fully concrete at compile time — every node exists on disk, every edge is declared.

**Dynamic subtasks** use runtime templates. The parent task body (with `mode: spawner` or `mode: converger`) writes one `<id>/spawn.yml` per child under `$CONVERGE_SPAWN_DIR` — three fields naming the template, optional `depends_on:`, and `params:`. The framework expands each invocation against `templates/<name>/` and applies. Two sub-cases:

- **Expected** — an upstream "catalog" task produces a structured file (e.g., `tokens-catalog.json`) listing what entities exist. The parent reads it and spawns children from it. Children's IDs and count are predictable from the catalog.
- **Adaptive** — no catalog exists. The parent decides what to spawn at runtime. Children are unknowable until the parent runs.

**The catalog pattern** (prefer `expected` over `frontier`):

```
upstream catalog task          →  downstream dynamic container
writes tokens-catalog.json     →  reads it, spawns per-token children
(concrete)                     →  (children are expected)
```

One extra task makes the rest of the DAG queryable. See `examples/game-assets-video` for the worked example.

**Decision heuristic:**
- ≤ 7 items, known at plan time → **static subtasks** (hand-write each `TASK.md`)
- > 7 items, or the list comes from data → **catalog task + dynamic container** (dynamic, expected)
- The list requires runtime reasoning to determine → **dynamic container** (adaptive)

**Mixed containers:** a container can have both static and dynamic children. A `03-build-screens` phase might have one static `001-design-system` task plus a body that spawns per-screen children. Both coexist in the same DAG.
