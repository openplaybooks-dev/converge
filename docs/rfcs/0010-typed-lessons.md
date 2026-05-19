# RFC 0010: Typed lessons (replace LEARN.md prose)

**Status**: Draft
**Backwards-compatible**: Yes (LEARN.md continues to work; lessons.jsonl is additive)
**Estimate**: 2-3 days

## Problem

LEARN.md is a freeform markdown file the agent writes between attempts as "things I learned". In practice it grows unboundedly, contains a mix of relevant rules and irrelevant musings, and gets re-read in full on each attempt. Agents respond better to structured rules than to prose.

## Proposal

Replace (or supplement) LEARN.md with `lessons.jsonl`:

```jsonl
{"kind": "avoid", "pattern": "onPressed: null", "reason": "fails no-null-onpressed check", "scope": "task:001-home-03-convert"}
{"kind": "prefer", "approach": "use Theme.of(context).colorScheme.surface", "over": "hardcoded Colors.white", "scope": "playbook:default"}
{"kind": "fact", "key": "stitch-flutter requires .scaffold root", "value": true, "scope": "skill:stitch-flutter"}
{"kind": "remember", "key": "MiniMax-M2.7 truncates responses over 8k tokens", "scope": "provider:claude"}
```

### Lesson kinds

| Kind | Fields | Effect |
|---|---|---|
| `avoid` | `pattern`, `reason` | Inject "avoid X because Y" into future prompts |
| `prefer` | `approach`, `over`, `reason` | Inject "prefer X over Y" |
| `fact` | `key`, `value` | Knowledge to keep in context |
| `remember` | `key`, `scope` | Like fact but caps per scope |

### Scopes

Hierarchical: `global`, `playbook:<name>`, `task:<id>`, `skill:<name>`, `provider:<name>`. Inheritance: a task inherits its playbook's lessons plus global.

### Lifecycle

- Agents write to `lessons.jsonl` directly (one new tool: `converge lesson record`).
- The runtime injects relevant lessons into prompts based on scope.
- Lessons can expire (`expiresAfterRuns: 5`) — automatic cleanup.

## Code-level design

- Schema: `packages/core/src/journal/lessons.ts`.
- Tool: `converge lesson record --kind avoid --pattern X --reason Y --scope task:001-home-03-convert`.
- Prompt injection: scoped lessons appear at the top of every agent prompt.

## Implementation steps

1. Define the schema + tool.
2. Hook into the prompt-builder.
3. Add CLI for inspection: `converge lesson list --scope task:001-home-03-convert`.
4. Expire old lessons.
5. Migrate one example to use the new mechanism.

## Test plan

1. Record a lesson, assert subsequent agent prompts include it.
2. Scope inheritance: task inherits playbook + global.
3. Expiry: lesson set to expire after 1 run no longer appears after 2 runs.
4. Conflict: two lessons with same pattern but different reasons → last-wins or both shown? Decide.

## Out of scope

- A separate "anti-pattern catalog" feature — this RFC subsumes it.
- Cross-playbook lesson sharing — workshop later.
