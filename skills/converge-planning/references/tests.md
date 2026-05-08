# Tests Reference

Full test reference for converge-planning. Read when you need to write checks for tasks, define reusable `.test.md` files, or understand the test-at-every-level strategy.

---

## Tests as First-Class Citizens

**Tests are nodes in the DAG, same as tasks.** A check on a task is logically a test node that depends on that task's outputs. `converge test --select 'state:modified+'` runs tests for changed tasks and everything downstream. Planning should treat checks as part of the DAG design, not as an afterthought.

**Write tests during planning, not after.** For every task contract, write checks that validate:
- The output **exists** (minimum — `test -f output.md`)
- The output is **well-formed** (format validation — `jq empty data.json`)
- The output **satisfies the contract** (content assertions — `grep -q "## Required Section" output.md`)

**Test at every level:**

| Level | What to test | Example |
|---|---|---|
| **Leaf task** | Its own outputs exist and are valid | `test -f screen.html && grep -q "<html" screen.html` |
| **Container task** | All children's outputs exist and are consistent | For each screen in `screens.json`, a corresponding `.html` file exists |
| **Playbook** | Cross-task invariants | `npx tsc --noEmit` across all generated code |

**Tag tests by cost** so selection can run fast smoke tests or the full suite:

```yaml
checks:
  - id: file-exists
    cmd: test -f output.md
    tags: [fast]
  - id: compiles
    cmd: npx tsc --noEmit
    tags: [slow, build]
```

```bash
converge test --select 'tag:fast'     # smoke test — seconds
converge test --select 'tag:slow+'    # full suite + downstream
```

**Common test patterns** (see `schema.md` for the full catalog):
- **Schema validation** — `jq empty data.json`, JSON Schema, Zod
- **Content assertions** — `grep -q "## Required Section" output.md`
- **Cross-reference** — "for each item in catalog.json, a corresponding output file exists"
- **Count checks** — `test $(jq '.items | length' data.json) -ge 3`
- **Compilation** — `npx tsc --noEmit`, `npm run build`

---

## Reusable Test Definitions (`tests/` API)

When the same check command repeats across multiple tasks, define it **once** as a `.test.md` file in `tests/` and reference it by name. This avoids copy-paste drift, centralizes scripts, and makes checks auditable.

**Directory layout:**
```
playbooks/default/
  tests/                              # Reusable check definitions
    file-exists/
      index.test.md                   # Name + args + script
      index.js                        # Companion script
    backend-configured/
      index.test.md
      index.js
```

**`.test.md` format:**
```yaml
---
name: file-exists
description: File or directory exists at the given path
type: cmd                          # cmd | js | py
args:                              # parameterized inputs
  path:
    type: string
  hint:
    type: string
    default: ""
---
node .converge/playbooks/default/tests/file-exists/index.js "{{ args.path }}" "{{ args.hint }}"
```

- `type: cmd` — shell one-liner. Use for simple existence/format checks.
- `type: js` — Node.js with `createTestContext(taskId)` providing `context.readFile()`, `context.glob()`, `context.run()`. Use for multi-step logic, cross-file assertions, or when you need real control flow.
- `type: py` — Python stdlib. Use when the team has Python tooling.
- `args:` — typed parameters (`string`, `number`, `boolean`) with optional defaults. Unresolved args throw at compile time.
- The body (below `---`) is the script. Alternatively, use `script: ./index.js` to point to an external file.

**Referencing a test from TASK.md or playbook.yml checks:**

```yaml
checks:
  - id: idea-exists
    description: User's idea file is present at project root
    type: test
    name: file-exists
    args:
      path: idea.md
      hint: write a one-paragraph game brief at the project root
```

The `type: test` signals the expander to look up `name:` in the test registry and substitute `args:` into the script. The expanded check behaves identically to an inline `cmd:` check — same runner, same gap detection.

**When to use:**
- The same check appears in 3+ tasks → extract to `tests/`.
- The check needs a companion script (`.js`, `.py`) → `tests/` gives it a home.
- The check is conceptually shared across playbooks → define it once, reference everywhere.
- **Don't** extract one-off checks or checks with unique logic that won't ever repeat.

**When NOT to use:**
- The check is trivially one line (`test -f output.md`) and appears once.
- The check logic is unique to one task and will never be shared.

**Rules:**
- Every output gets at least one check (existence + non-empty minimum).
- Code outputs add a compilation check. Data outputs add format validation.
- Container tasks add cross-child consistency checks.
- Playbook-level checks validate invariants that span multiple tasks.
- Never use exact string matching — too brittle.
- **Extract at 3+ uses** — if the same check command appears in three or more tasks, move it to `tests/`.
