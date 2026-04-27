# Needs: 10-cross-validate

## Inputs

- `docs`
- `packages`
- `examples`
- `skills/converge-control/troubleshooting/playbook.md`

## Expected Outputs

- `docs/_validation-report.json`

## Checks

- **report-exists**: validation report exists and is valid JSON
- **zero-stale-claims**: zero stale claims (every documented behavior verified against source)
- **zero-missing-sources**: zero missing source files
- **pre-flight-passes**: mechanical validate-docs.mjs passes
