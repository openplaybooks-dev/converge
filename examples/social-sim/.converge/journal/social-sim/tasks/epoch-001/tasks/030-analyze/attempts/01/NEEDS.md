# Needs: epoch-001/030-analyze

## Description

Compute per-tick metrics from the rows added this tick, append to metrics.jsonl, update vault/reports/misinfo.md.


## Inputs

- `runs/run-2026-04-25T01-45/personas.json`
- `runs/run-2026-04-25T01-45/timeline.jsonl`

## Expected Outputs

- `runs/run-2026-04-25T01-45/metrics.jsonl`
- `vault/reports/misinfo.md`
- `vault/runs/run-2026-04-25T01-45/ticks/tick-1.md`
- `vault/runs/run-2026-04-25T01-45/overview.md`

## Checks

- **metrics-row-appended**: metrics.jsonl has exactly one row with tick=1
- **report-mentions-tick**: vault/reports/misinfo.md mentions this tick
- **vault-tick-note**: Vault tick note exists
- **vault-overview-links-tick**: Run overview links to this tick
