# Static vs. Dynamic Subtask Reference

Decision guide for static vs. dynamic subtask decomposition. Read when planning a container and deciding whether to hand-write children or use a seed template.

---

## Static vs. Dynamic Subtasks

**The core decomposition choice: when you split a task into subtasks, each subtask is either static or dynamic.**

| Subtask type | How it's created | When it's knowable | Use when |
|---|---|---|---|
| **Static** | Hand-written `TASK.md` file | Compile time (*concrete*) | Fixed set, known at plan time, ≤ ~7 children |
| **Dynamic (seed)** | seed template spawns it at runtime | After seed runs (*expected* or *frontier*) | Data-driven list, unknown at plan time, N > 7, or N may grow |

**Static subtasks** are the default. Write each child's `TASK.md` by hand. The DAG is fully concrete at compile time — every node exists on disk, every edge is declared. No surprises. No seeding needed.

**Dynamic subtasks (seeds)** use a seed template. The parent task has a `seeds/index.js` that reads a data source and calls `ctx.spawn()` for each child. Two sub-cases:

- **Expected** — an upstream "catalog" task produces a structured file (e.g., `tokens-catalog.json`) listing what entities exist. The seed reads it. Children's IDs and count are predictable from the catalog — the manifest can show them as `expected` nodes even before seeding. `--select 'parent+'` resolves to a known list.
- **Frontier** — no catalog exists. The seed decides what to spawn at runtime (e.g., asks an LLM to break a goal into subtasks). Children are unknowable until the seed runs. `--select 'parent+'` across a frontier produces a warning, not silent emptiness.

**The catalog pattern** (prefer `expected` over `frontier`):

```
upstream catalog task          →  downstream seed
writes tokens-catalog.json     →  reads it, spawns per-token children
(concrete)                     →  (children are expected)
```

One extra task makes the rest of the DAG queryable. See `examples/game-assets-video` for the worked example.

**`compile --seed`** runs seed scripts to resolve frontiers without doing the actual task work. Cheap graph resolution — you get a complete manifest at the cost of one pass per seed parent. Planning should note which seed parents are seedable (those with a catalog upstream are trivially seedable; frontier seed may be expensive).

**Decision heuristic:**
- ≤ 7 items, known at plan time → **static subtasks** (hand-write each `TASK.md`)
- > 7 items, or the list comes from data → **catalog task + seed** (dynamic, *expected*)
- The list requires LLM reasoning to determine → **Seed only** (dynamic, *frontier*)

**Mixed containers:** a container can have both static and dynamic children. A `03-build-screens` phase might have one static `001-design-system` task plus a seed that spawns per-screen children. The static children are concrete; the seed children are expected/frontier. Both coexist in the same DAG.
