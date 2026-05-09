# Framework Quality Principles

How to evaluate whether the framework implementation is good. Every design decision, PR, and refactor is judged against these.

---

## 1. Single entry point

`run()` is the only function that executes a playbook. The CLI and Studio both call it. There is no backdoor, no alternative path, no special case. If a feature requires bypassing `run()`, the feature is wrong.

A good framework has exactly one way to do each thing.

---

## 2. Compile before execute

Execution never begins without compilation. `compilePlaybook()` runs first, always. It catches cycles and missing edges before any task runs. If a cycle exists, the framework refuses to start — it doesn't discover the cycle mid-execution.

A good framework fails early and loudly.

---

## 3. Runstate is the single source of truth

Node status lives in `runstate.json`. No function ever scans the filesystem to discover tasks or check status. No `readdir`, no `existsSync` on task directories. If a function needs to know what tasks exist or what state they're in, it reads runstate.

A good framework has one authoritative record, not scattered truth.

---

## 4. Every state transition is immediately durable

When a node starts, finishes, fails, or is skipped, `persist()` writes to disk before returning. `atomicWriteFile` ensures partial writes can't corrupt state. There is no in-memory cache that flushes later, no batch window where a crash loses data.

A good framework survives a kill -9 at any instruction.

---

## 5. Structure and status never mix

`manifest.json` records what the DAG looks like — nodes, edges, hashes. `runstate.json` records what happened — attempts, durations, fingerprints. No function writes status into the manifest. No function reads structure from runstate. They are separate artifacts with separate lifecycles.

A good framework keeps orthogonal concerns in orthogonal files.

---

## 6. DAG flows forward only

Nodes execute in topological layers. Layer N finishes before layer N+1 starts. No cycles, no re-queue, no push-back. The only loop is the outer `run()` pass for incremental seeds and queues — and even that requires explicit flags set by the executor.

A good framework has predictable, auditable execution order.

---

## 7. Change detection cascades correctly

A node is cached only if its fingerprint matches AND no upstream node changed. If an upstream changes, everything downstream re-executes regardless of its own fingerprint. `fullRefresh` bypasses all caching.

A good framework never serves stale results.

---

## 8. Containers split unconditionally

Every task with seeds or children becomes `{id}-diverge` + `{id}-converge`. No exception. Downstream deps always point to converge, never to diverge. Root nodes always get `root-diverge` + `root-converge`. Every playbook has exactly one entry and one exit.

A good framework has a consistent DAG shape regardless of playbook structure.

---

## 9. Resume restores exact state

Crash at any point — before diverge, after diverge, mid-children, mid-converge — and resume picks up correctly. Completed nodes skip. Spawned children survive. Converge edges re-wire. The framework behaves identically whether it runs straight through or crashes 50 times.

A good framework treats crash as a pause, not a failure.

---

## 10. Nothing project-specific in packages/

`packages/` works for any project. No hardcoded paths, skill names, domain concepts. When the framework needs project data, it reads it from the playbook, TASK.md, catalog, or seed — it never bakes it in. The test: can you take `packages/` and run it against a completely different project?

A good framework is unaware of its users' domains.

---

## 11. No dead code, no speculation

Every function, import, and variable is used. No abstractions called once. No flexibility for hypothetical futures. No error handling for states that can't occur. If 200 lines can be 50, it must be 50. Adjacent code is left alone unless it's directly related to the change.

A good framework is as small as possible, and no smaller.
