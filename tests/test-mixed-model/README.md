# test-mixed-model

End-to-end test that verifies multiple AI backends can be used within a single
playbook — one task uses Claude and another uses Codex.

## What it tests

- Multi-provider AI config (`ai.default` + `ai.providers`) in `project.yaml`
- Per-task `agent` field routes execution to the correct AI backend
- Claude task creates `CLAUDE_READY.txt`, Codex task creates `CODEX_READY.txt`
- Both tasks complete independently with their respective backends

## Structure

```
.converge/
├── project.yaml                           # Multi-provider: claude (default) + codex
└── playbooks/default/
    ├── playbook.yml                       # Two tasks: claude-hello, codex-hello
    └── tasks/
        ├── claude-hello/
        │   └── TASK.md                    # Uses agent: claude
        └── codex-hello/
            └── TASK.md                    # Uses agent: codex
```

## Run

```bash
converge run
```

## Expected outcome

- Claude agent creates `CLAUDE_READY.txt` with content `claude-done`
- Codex agent creates `CODEX_READY.txt` with content `codex-done`
- All four checks pass (file existence + content for each output)
- Both tasks converge on first attempt
