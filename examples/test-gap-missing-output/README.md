# test-gap-missing-output

Tests the framework's output gap detection and TaskRunStrategy repair.

When a task declares an output but doesn't create it, `findGaps` detects an
`output` gap and the navigator dispatches `TaskRunStrategy` to re-execute the
task.

## What it tests

- Gap detection for missing output files
- TaskRunStrategy re-execution on gap detection
- Multi-attempt convergence driven by gap → repair → retry

## Structure

```
.converge/playbooks/default/
├── playbook.yml          # Single task: miss-out
└── tasks/miss-out/
    └── TASK.md            # Intentionally skips OUTPUT.txt on attempt 1
```

## Run

```bash
converge run
```

## Expected outcome

- Attempt 1: Agent creates nothing. Gap detected for `OUTPUT.txt`.
- Attempt 2: Agent creates OUTPUT.txt with "task-complete". Converges.
