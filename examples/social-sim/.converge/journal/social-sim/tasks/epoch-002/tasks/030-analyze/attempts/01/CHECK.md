# Checks: epoch-002/030-analyze

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## metrics-row-appended
**Description**: metrics.jsonl has exactly one row with tick=2
**Command**: `python3 -c "import json,sys; lines=[json.loads(l) for l in open('runs/run-2026-04-25T01-45/metrics.jsonl') if l.strip()]; hits=[l for l in lines if l.get('tick')==2]; sys.exit(0 if len(hits)==1 else 1)"
`

## report-mentions-tick
**Description**: vault/reports/misinfo.md mentions this tick
**Command**: `grep -q 'Tick 2' vault/reports/misinfo.md`

## vault-tick-note
**Description**: Vault tick note exists
**Command**: `test -f vault/runs/run-2026-04-25T01-45/ticks/tick-2.md`

## vault-overview-links-tick
**Description**: Run overview links to this tick
**Command**: `grep -q 'tick-2' vault/runs/run-2026-04-25T01-45/overview.md`