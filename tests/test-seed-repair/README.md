# test-seed-repair

Tests the legacy SeedScriptRepairStrategy for broken seed scripts.

A legacy `.seed.js` file has a deliberate bug (wrong parameter name causing
ReferenceError). The seed executor catches the error, creates a
`seed-script-error` gap, and the SeedScriptRepairStrategy diagnoses
and fixes the script before re-running it.

This fixture exists only for historical repair coverage. New playbooks
should use `seed: { mode: cli }` and body-driven `converge spawn ...`
commands instead of seed scripts.

## What it tests

- Seed script execution error handling
- `seed-script-error` gap creation
- AI-driven seed script diagnosis and repair
- Retry after repair

## Structure

```
.converge/playbooks/default/
├── playbook.yml              # Single task: spawner (seed container)
└── tasks/
    ├── spawner/
    │   └── TASK.md            # References broken-seed
    └── seeds/
        └── broken.seed.js     # Deliberately broken: uses "context" instead of "ctx"
```

## Run

```bash
converge run
```

## Expected outcome

- Seed executor runs broken.seed.js → throws ReferenceError.
- SeedScriptRepairStrategy fixes the parameter name.
- Fixed script runs successfully, spawns `worker` task.
- Worker creates OUTPUT.txt. All converge.
