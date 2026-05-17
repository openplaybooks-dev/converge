# test-three-workers

Fixture for validating the coordinator-worker scheduler with `workers: 3`.

## What it tests

- `playbook.yml` parses with `run.workers: 3`
- Three independent root tasks can be leased at once
- The coordinator records worker assignment in `runstate.json`
- A dependent task still waits on its upstream dependency

## Structure

```text
.converge/
├── project.yaml
└── playbooks/default/
    ├── playbook.yml              # Declares workers: 3
    └── tasks/
        ├── 01-alpha/TASK.md
        ├── 02-beta/TASK.md
        ├── 03-gamma/TASK.md
        └── 04-aggregate/TASK.md  # Depends on 01-alpha
```

## Verification

Run the root test:

```bash
pnpm exec vitest run tests/three-workers.test.ts
```

The test passes if the runstate records:

- `01-alpha.worker_id = local-1`
- `02-beta.worker_id = local-2`
- `03-gamma.worker_id = local-3`

