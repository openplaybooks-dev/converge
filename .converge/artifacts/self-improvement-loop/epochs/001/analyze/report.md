# Selection report — epoch 001

## Selected target

Selected `invalid-model-config-errors` from `observe/findings.json`.

Maintainer rationale: the observation phase found no failing baseline build or playbook regression, but it did identify a high-severity API gap around invalid provider/model configuration. This is production-relevant because bad configuration should fail early with an actionable message before agent work begins.

## Rejected alternatives

- Build-warning cleanup: explicitly low-value and disallowed while a stronger API target exists.
- Help-text-only changes: lower priority than provider/model configuration behavior.
- Playbook compile/DAG/seed work: baseline focused suites passed during observation, so there is no stronger current evidence than the observed provider/model finding.

## Test mapping

Focused command: `pnpm vitest run tests/mixed-model.test.ts`.
