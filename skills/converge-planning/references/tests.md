# Tests Reference

How to write checks. Read when designing deterministic verification for tasks.

---

## Every output needs a check

A check is a shell command — exit 0 = pass, non-zero = fail.

```yaml
checks:
  - id: file-exists
    cmd: test -f output.md
  - id: valid-json
    cmd: jq empty data.json
  - id: has-section
    cmd: grep -q "## Overview" output.md
```

## Check layers

- **Leaf task** — its own outputs exist and are well-formed.
- **Container task** — child outputs are all present and internally consistent.
- **Playbook** — cross-task invariants hold.

## Common patterns

```yaml
# File exists and is non-empty
- id: nonempty
  cmd: test -s output.md

# Valid JSON with required shape
- id: schema-ok
  cmd: jq empty data.json

# JSON array has entries
- id: has-items
  cmd: 'jq -e ".items | length > 0" data.json'

# TypeScript compiles
- id: compiles
  cmd: pnpm tsc --noEmit

# Tests pass
- id: tests-pass
  cmd: pnpm vitest run

# Every catalog entry has an output
- id: all-entries-built
  cmd: |
    count=$(jq '.items | length' catalog.json)
    built=$(ls output/*.json 2>/dev/null | wc -l)
    test "$built" -eq "$count"
```

## Converger halt conditions

For `mode: converger`, the body does work then the framework checks `halt_when`:

```yaml
mode: converger
converge:
  max_waves: 20
  halt_when:
    - id: backlog-empty
      cmd: test ! -s artifacts/backlog.txt
    - id: report-valid
      cmd: node scripts/verify-report.js artifacts/report.json
```

Every `halt_when` check must pass for the loop to terminate cleanly.

Alternative: `halt.marker` — the body writes this file to signal explicit stop.

## Reusable helpers

Shared check logic goes in `scripts/`. Call from checks:

```yaml
checks:
  - id: configured
    cmd: node scripts/backend-configured.js image-generate
```

Don't extract one-off shell checks. Keep inline if readable.