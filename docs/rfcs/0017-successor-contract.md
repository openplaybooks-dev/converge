# RFC 0017: Successor contract (`on_fail:`)

**Status**: Draft
**Backwards-compatible**: Yes (additive frontmatter)
**Estimate**: 1 week

## Problem

When task A fails, today we rely on the repair agent to figure out what to do. This works but is non-deterministic and AI-expensive. For known failure modes, the playbook author can specify the recovery explicitly.

## Proposal

Add `on_fail:` to TASK.md frontmatter:

```yaml
on_fail:
  - if: "check_fail:dart-analysis-valid"
    spawn: templates/fix-dart-errors/TASK.md
    inherit_vars: [screenPath]
    inherit_outputs: true
  - if: "error_class:transient"
    retry: { strategy: "backoff", max: 5 }
  - if: "error_class:authoring"
    abort_run: true
  - default:
    spawn: templates/generic-repair/TASK.md
```

The orchestrator matches the failure event against `if:` clauses (top-down, first match) and applies the action:

- `spawn:`: register a new task that depends on the failed one being marked `done` (which the recovery task does after fixing).
- `retry:`: apply the named retry policy.
- `abort_run:`: bubble up.

Combined with RFC 0003 (error classification), this becomes a clean recovery framework.

## Code-level design

- Schema in TASK.md frontmatter parser.
- New module: `packages/core/src/orchestrator/successor-resolver.ts`.
- On any `TASK_FAIL` event, the orchestrator runs the resolver.

### `inherit_vars`, `inherit_outputs`

Allows recovery tasks to use the failed task's context without re-declaring everything.

## Implementation steps

1. Schema additions to TASK.md parser.
2. Resolver.
3. Wire into failure handling alongside RFC 0003's classification.
4. Documentation + examples.

## Test plan

1. Task fails with `check_fail:X` → matching successor spawned.
2. Task fails with no matching successor → falls through to default repair agent.
3. `abort_run:` clause fires → run exits cleanly.
4. `inherit_vars` propagates the right keys.
5. Cycle: A's successor is A → detected and refused at compile time.

## Out of scope

- Successor templates that themselves have successors (level-2 recovery) — works recursively but may need bounds.
- AI-suggested successors (a meta-feature where the system learns common recovery patterns).
