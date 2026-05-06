# test-buggy-check

Tests the buggy-check relaxation mechanism via `BUGGY_CHECK.md`.

A task has a deliberately impossible check. The agent writes `BUGGY_CHECK.md`
proposing a corrected check command. The framework validates the proposal
(bash syntax + tautology check) and applies the relaxed check to the journal
TASK.md for the next attempt.

## What it tests

- Agent-driven check bug detection and flagging
- `BUGGY_CHECK.md` parsing and validation (syntax + tautology check)
- Journal TASK.md patching by `tryRelaxBuggyCheck`

## Structure

```
.converge/playbooks/default/
├── playbook.yml          # Single task: buggy
└── tasks/buggy/
    └── TASK.md            # Has wrong-check that looks for nonexistent file
```

## Run

```bash
converge run
```

## Expected outcome

- Attempt 1: wrong-check fails (looks for nonexistent file). Agent writes BUGGY_CHECK.md.
- Framework validates and applies relaxed check.
- Attempt 2: Relaxed check passes. Converges.
