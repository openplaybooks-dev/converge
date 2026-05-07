# test-codex-real

End-to-end test that verifies the Codex (OpenAI CLI) AI backend is wired correctly.

A single task asks the agent to create `READY.txt` with content `codex-ready`. The
Codex provider runs the task, and checks validate the output file exists with the
correct content.

## What it tests

- Codex provider is correctly configured in `project.yaml` (`ai.providers.codex`)
- Agent can execute a simple file-creation task via Codex
- Output checks (`file-exists`, `grep`) validate task completion

## Structure

```
.converge/
├── project.yaml                           # Single provider: codex
└── playbooks/default/
    ├── playbook.yml                       # One task: hello
    └── tasks/hello/
        └── TASK.md                        # Prompt to create READY.txt
```

## Run

```bash
converge run
```

## Expected outcome

- Codex agent creates `READY.txt` with content `codex-ready`
- Both checks pass (file exists + has correct content)
- Converges on first attempt
