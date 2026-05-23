# test-three-workers

Fixture for validating the coordinator-worker scheduler with `workers: 3`.

## What it tests

- `playbook.yml` parses with `run.workers: 3`
- Three independent root tasks can be leased at once
- Each root task records the worker it ran on in its output file
- A dependent task still waits on its upstream dependency

## Structure

```text
.converge/
├── project.yaml
└── playbooks/default/
    └── playbook.yml              # Declares workers: 3
```

## Verification

Run the root test:

```bash
pnpm exec vitest run tests/three-workers.test.ts
```

The test passes if the output files show three distinct worker ids and the
aggregate task includes the alpha output it depended on.
