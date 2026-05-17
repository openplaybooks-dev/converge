# test-waves — single-task multi-wave do-while loop

A minimal fixture demonstrating how a **single passthrough task** can
iterate across multiple waves inside one `converge run` invocation,
using the framework's gap-driven repair loop plus the `converge:`
verdict prompt.

## Shape

```
.converge/
  project.yaml
  playbooks/default/
    playbook.yml
    tasks/looper/TASK.md     ← the one task
```

One task, no children, no spawn, no skill. Auto-discovered from
`tasks/looper/TASK.md`.

## How the loop is driven

The task declares a check that **only passes once wave 2 has been
recorded**:

```yaml
checks:
  - id: completed-3-waves
    cmd: grep -q '^wave=2 ' output/waves.log
```

The framework's gap-repair loop sees a `check-failed` gap after each
body run and re-fires the body as long as the gap persists. Each body
run:

1. Reads `output/wave.counter` (defaults to 0).
2. Appends `wave=$WAVE ran-at=...` to `output/waves.log`.
3. Bumps the counter to `$WAVE + 1`.
4. On wave 2, calls `converge tasks mark looper --status done`.

Between body runs the `converge:` prompt fires. The stub provider
(`ai.provider: stub`) reads `CONVERGE_STUB_RESPONSE` and returns
`{"action":"continue"}`, which:

- Bumps the per-task wave counter in
  `.converge/inventory/<playbook>/tasks.jsonl metadata.wave`.
- Logs `🔄 Converge: loop continues — wave N`.

On wave 2 the body's `tasks mark` call sets the ledger status to
`done`. On the next converge: pass the framework detects
`beforeStatus === "done"` and **short-circuits the stub call** — that's
the early-halt path. The check then passes (waves.log contains
`wave=2`), gaps are zero, and the task converges.

## Why this shape (and not a true per-task while-loop)

The framework's primary loop is **gap-driven**: a task runs, gaps are
detected, strategies fire to fix them, repeat. The `converge:` verdict
prompt augments this with a wave counter and an early-halt mechanism,
but does not itself force re-execution. The `retryMode: "rerun"`
signal exists in the type system but isn't consumed by the navigator's
outer loop today.

The shape this fixture uses — a check that fails until N body runs
have happened — is the **idiomatic way to express multi-wave loops in
a single invocation today**. The gap loop drives the re-runs; the
converge: prompt drives the wave counter and provides the clean exit.

For outer-loop driven sprint chains (multi-invocation), see
`examples/goal-driven-dev/.converge/scripts/sprint-loop.sh`.

## What's tested

`run-test.sh` runs the fixture and asserts 12 invariants across four
families:

1. **Playbook validates** (1)
2. **waves.log structure** — 3 entries, all present, ascending (5)
3. **Gap loop fired body 3 times** — body run count, wave-counter
   bumps, early-halt path triggered (3)
4. **Ledger reflects final state** — status=done, reasoning preserved
   (2)
5. **Framework clean completion** — `Done: 3 ok, 0 failed` (1)

All run without an LLM thanks to `ai.provider: stub` —
`CONVERGE_STUB_RESPONSE` is the only env input the converge: prompt
needs.

## Run it

```bash
bash run-test.sh
```

Expected output ends with:

```
RESULTS:  12 passed,  0 failed
```

## Files

- `.converge/project.yaml` — workspace pointer
- `.converge/playbooks/default/playbook.yml` — playbook metadata
- `.converge/playbooks/default/tasks/looper/TASK.md` — the single task
  (frontmatter + passthrough body)
- `run-test.sh` — full E2E with reset, run, assertions, cleanup
