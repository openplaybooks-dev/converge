# test-gap-blocked-input

Tests the DependencyBackoffStrategy for blocked consumer tasks.

A two-task DAG where the producer fails on its first attempt (doesn't create
its declared output). The consumer declares an input that the producer should
create. When `findGaps` finds the input missing, it creates a `blocker` gap.
The DependencyBackoffStrategy identifies the failed producer and re-runs it,
unblocking the consumer.

## What it tests

- `blocker` gap detection when declared inputs are missing
- DependencyBackoffStrategy: find upstream producer, re-run it
- Consumer unblocking after producer succeeds
- Two-task DAG with repair-driven retry

## Structure

```
.converge/playbooks/default/
├── playbook.yml              # Two tasks: producer → consumer
└── tasks/
    ├── producer/
    │   └── TASK.md            # Creates WRONG_FILE.txt on attempt 1
    └── consumer/
        └── TASK.md            # Declares inputs: [INPUT_FILE.txt]
```

## Run

```bash
converge run
```

## Expected outcome

- Producer attempt 1: Creates WRONG_FILE.txt → output gap.
- Consumer: INPUT_FILE.txt missing → blocker gap.
- DependencyBackoffStrategy re-runs producer.
- Producer attempt 2: Creates INPUT_FILE.txt with correct content.
- Consumer unblocks, creates CONSUMED_OUTPUT.txt. All converge.
