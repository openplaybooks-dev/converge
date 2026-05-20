---
rfc: 0016
title: Idempotency tokens on spawns
status: draft
type: feat
source: human
priority_tier: tier3
estimate: "3-4 days"
backwards_compatible: yes
risk: low
---
# RFC 0016: Idempotency tokens on spawns

## Problem

If a seed task is re-run during repair (or hot-reload), it might re-emit the same `converge spawn template …` lines. Today the spawn executor tries to write a new task; if the ID already exists, behaviour is fuzzy (overwrites? errors? depends on path). Seed bodies are not idempotent by default.

## Proposal

Every spawn carries an idempotency token, auto-derived if not supplied:

```
token = sha256(playbookName + templatePath + canonical(vars))
```

When the executor receives a spawn:

1. Compute token (or use supplied `--idempotency-key`).
2. Check inventory for an existing spawn with the same token.
3. If exists: log info, skip the spawn.
4. If new: write the TASK.md and register.

## Code-level design

- New file: `packages/core/src/seed/idempotency.ts`.
- Modify `executeSpawnCliCommand` in `packages/core/src/seed/cli-spawn.ts`.
- Index in inventory: a column `idempotency_token TEXT UNIQUE` on the tasks table.

## Implementation steps

1. Define the canonicalization rules (sort keys, normalize whitespace, etc).
2. Compute token in `executeSpawnCliCommand`.
3. Add the inventory unique index.
4. On conflict: log + skip.

## Test plan

1. Run a seed twice with same inputs → second run is a no-op.
2. Change one var → token differs → new spawn.
3. Custom `--idempotency-key` → overrides the auto-computed.
4. Concurrent re-runs (two workers) → only one task created.

## Out of scope

- Idempotency for non-seed task spawns (manual `converge spawn` CLI calls).
- TTL on idempotency records (currently forever).
