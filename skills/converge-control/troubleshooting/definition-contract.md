# Task Definition & Contract

Issues where the playbook's **source definition** is broken — TASK.md frontmatter, template structure, dependency graphs. These fail at compile time or DAG build, before any task body runs.

## D.1 Stale `outputs:` paths after workflow moved files

**Symptom:**
```
CHECK_FAIL <nodeId> <checkId>
  Task output not created: <path>
```
The path in the error points to a location that's empty on disk, but the file actually exists at a different location. Common: a `split` task declares output at `lib/screens/X/widgets/foo.dart`, a follow-up `lift` task moves it to `lib/widgets/foo.dart`, and the split task's check fails on re-validation because the file moved.

**Root cause:** TASK.md frontmatter declares an `outputs:` path that's correct at generation time but stale after later steps move the file.

**Fix recipe:**

1. **Fix the template** so future spawns handle the moved file:
   ```yaml
   # In the template TASK.md — make checks tolerate the moved location:
   checks:
     - id: widget-exists
       cmd: "bash -c 'test -f {{widgetPath}} || test -f lib/widgets/$(basename {{widgetPath}})'"
   ```
   Or drop the brittle `outputs:` entry entirely if the check is sufficient.

2. **Regenerate already-spawned nodes.** For each affected spawned node directory under `.converge/inventory/<playbook>/spawned/`, re-render from the fixed template with the node's existing `vars:`.

3. **Re-compile and re-run:**
   ```bash
   converge run --playbook=<name> --dry
   converge run --playbook=<name> --select 'result:error+'
   ```

**Verification:** `CHECK_FAIL` doesn't recur for the fixed node. Node completes on next attempt.

---

## D.2 Stale `inputs:` blocking a node that should be ready

**Symptom:**
```
INPUT_MISSING <nodeId> <path>
```
A node can't start because its declared `inputs:` file doesn't exist. The file was produced but later moved by a downstream task.

**Root cause:** The `inputs:` path references a file that existed when the DAG was compiled but was moved or renamed.

**Fix recipe:**

1. **Fix the TASK.md** — drop the brittle input or make it conditional:
   ```yaml
   # Instead of:
   inputs:
     - "{{localWidgetPath}}"
   # Use a check that tolerates the moved location.
   ```

2. **Regenerate affected spawned nodes** from the fixed template.

3. **Re-compile and re-run:**
   ```bash
   converge run --playbook=<name> --dry
   converge run --playbook=<name> --select 'result:error+'
   ```

**Verification:** Node moves past the input gate. `INPUT_MISSING` doesn't recur.

---

## D.3 Missing spawner template directory

**Symptom:**
```
NODE_FAIL <spawnerId> spawner-apply-failed
```
A `mode: spawner` body issued one or more `converge spawn` calls (or, for legacy bodies, rows in `spawn.plan.jsonl`), but expansion rejected the invocation with `template-not-found` — the named template doesn't exist under `templates/<name>/`.

**Root cause:** When migrating or copying a playbook, template directories were missed.

**Fix recipe:**

1. Read `$CONVERGE_SPAWN_DIR/STATUS.md` (RFC 0024) to see which `- [ ]` row carries `template-not-found` and which file to edit; or, for legacy bodies, `$CONVERGE_TASK_DIR/spawn.plan.result.jsonl`.

2. Locate the missing template in a known-good source:
   ```bash
   find <source-playbook>/templates/ -maxdepth 2 -name 'TASK.md'
   ```

3. Copy the template tree into the target playbook (the directory should contain `TASK.md` + `PARAMS.yml` + optional `EXAMPLES.yml`):
   ```bash
   cp -r <source-playbook>/templates/<name> <target-playbook>/templates/<name>
   ```

4. Re-run the parent; the spawner body will re-emit the `converge spawn` calls (re-runs producing identical children are no-ops).

**Verification:** `STATUS.md` shows `- [x]` for every row (or `spawn.plan.result.jsonl` shows `ok: true` per row for legacy bodies). `SEED_SPAWN` event appears in the stream and the children execute.

---

## D.4 Cycle detected in DAG

**Symptom:**
```
CYCLE <nodeA> -> <nodeB> -> <nodeC> -> <nodeA>
```
The DAG builder refuses to compile because a circular dependency exists.

**Root cause:** Two or more tasks declare `depends_on` that form a loop. Common when refactoring: task A depends on B, B depends on C, and someone adds C depending on A.

**Fix recipe:**

1. **Break the cycle** — find the weakest link and remove it:
   ```yaml
   # In the TASK.md of the task that should NOT depend on the other:
   depends_on:  # remove the back-edge
     - <other-deps-but-not-the-cycle>
   ```

2. **If the cycle is real** (A needs B's output, B needs A's output), split one task into two phases:
   - Task A1 produces the output B needs
   - Task A2 consumes B's output
   - `A1 -> B -> A2` is acyclic.

3. **Re-validate:**
   ```bash
   converge playbook validate <name>
   converge run --playbook=<name> --dry
   ```

**Verification:** `--dry` shows a valid DAG with no cycle errors. All tasks have a clear execution order.

---

## D.5 Malformed TASK.md frontmatter

**Symptom:** `converge playbook validate` fails with YAML parse error, or a task silently produces wrong behavior because a field wasn't read.

**Common traps:**
- Missing `---` delimiter between frontmatter and body
- Invalid YAML syntax (tabs instead of spaces, unquoted special chars)
- Unknown field names (`depend_on` instead of `depends_on`)
- `checks:` with empty `id` or `cmd` fields

**Fix:**

```bash
converge playbook validate <name>
# Fix the reported file and field
```

**Verification:** `converge playbook validate <name>` exits 0.
