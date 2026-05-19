# RFC 0009: Structured retry context

**Status**: Draft
**Backwards-compatible**: Yes (additive; FEEDBACK.md continues to work)
**Estimate**: 3-4 days

## Problem

On a retry, the AI repair agent gets a fresh prompt + FEEDBACK.md (markdown). It reasons about what went wrong by reading prose. Agents are demonstrably better at structured input.

## Proposal

Alongside FEEDBACK.md (which stays as a human-readable artifact), write `retry-context.json`:

```json
{
  "schemaVersion": 1,
  "attempt": 2,
  "maxAttempts": 3,
  "priorAttempts": [
    {
      "attempt": 1,
      "outcome": "check_fail",
      "durationMs": 87421,
      "filesProduced": [".stitch/designs/home/design.html"],
      "filesModified": ["lib/router/app_router.dart"],
      "failedChecks": [
        {
          "id": "uses-glossary",
          "command": "grep -q 'class=\"scaffold\"' .stitch/designs/home/design.html",
          "actualStdout": "",
          "actualExitCode": 1,
          "interpretation": "design.html does not contain the .scaffold class"
        }
      ],
      "passedChecks": ["design-exists", "meta-exists"],
      "toolCalls": [
        { "name": "Edit", "target": ".stitch/designs/home/design.html", "result": "success" }
      ]
    }
  ]
}
```

Agent prompt becomes: "Read `retry-context.json`. The prior attempt failed for the reason below. Make the minimal change to produce the missing artifact."

## Code-level design

- New module: `packages/core/src/journal/retry-context.ts` that aggregates from `events.jsonl` for a given task.
- Hook into the executor's pre-attempt setup.
- The schema is versioned so future changes don't break consumers.

## Implementation steps

1. Define the schema.
2. Write the aggregator that builds the JSON from journal events.
3. Plumb into the executor: write `retry-context.json` before invoking the agent.
4. Update prompt templates to reference it.
5. Smoke test: a task fails on attempt 1 with a known check failure → attempt 2's retry-context.json contains the right failedChecks entry.

## Test plan

1. Failed check → retry-context.json has correct failedChecks.
2. Failed produced-output → retry-context.json captures filesProduced vs declared outputs.
3. Multi-attempt: attempt 3 contains data from attempts 1 and 2.
4. Schema versioning: bump schemaVersion → old consumers ignore unknown fields.

## Out of scope

- Replacing FEEDBACK.md entirely (it's still useful for humans browsing the journal).
- Cross-task retry context (e.g. "this whole epic has retried 5 times"). Could come later.
