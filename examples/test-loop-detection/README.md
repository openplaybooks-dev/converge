# test-loop-detection

Tests the framework's loop detection for agent thrashing.

When an agent repeatedly makes the same tool calls on the same files, the loop
detector identifies the repeated signatures and appends a "Loop hint" to
LEARN.md, suggesting the check predicate (not the artifact) may be wrong.

## What it tests

- Tool-call signature extraction and normalization
- Repetition threshold crossing (default: 5)
- LEARN.md augmentation with loop hint

## Structure

```
.converge/playbooks/default/
├── playbook.yml          # Single task: looper
└── tasks/looper/
    └── TASK.md            # Instructs agent to repeatedly check and tweak
```

## Run

```bash
converge run
```

## Expected outcome

- Attempt 1: Agent creates DATA.txt, repeatedly checks/tweaks it.
  Loop detector identifies repeated tool calls, appends hint to LEARN.md.
- Attempt 2: Agent reads LEARN.md with loop hint. Converges.
