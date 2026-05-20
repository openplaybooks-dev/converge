---
rfc: 0012
title: Doctor as a pre-flight phase
status: draft
type: feat
source: human
priority_tier: tier2
estimate: "3-4 days"
backwards_compatible: yes
risk: low
---
# RFC 0012: Doctor as a pre-flight phase

## Problem

`converge doctor` exists but is a separate manual step. Users don't run it. Run failures that doctor would catch (missing env vars, malformed playbook, missing tools, drift between TASK.md and templates) surface mid-run, after the first AI call has been spent.

## Proposal

Run a strict subset of doctor checks **automatically** before every `converge run` (and a fuller set on `converge run --preflight=full`).

### Default pre-flight (fast, <1s)

- Every TASK.md referenced in `playbook.yml` exists and parses.
- Every skill referenced in any TASK.md exists and has a SKILL.md.
- Every check command's referenced script exists (`extractScriptsPathsFromCheckCmd`).
- Every spawn template path is resolvable.
- (RFC 0001) Every spawn emits required vars to its target.
- Required env vars (resolved from `${VAR}` interpolation in project.yml) are set.
- `manifest.json` exists or compile would succeed.

### Full pre-flight (`--preflight=full`)

Above plus:
- Every executable check command's binary is on PATH (`flutter`, `dart`, `jq`, etc.).
- Provider auth: a no-op `ping` call to each configured provider succeeds.
- Disk space sufficient for projected output volume.
- `dart pub get` would succeed (deps resolvable).

### Output

```
$ converge run

Preflight checks (fast):
  ✓ playbook.yml parses
  ✓ 8 tasks, 21 templates
  ✓ 24 skills resolved
  ✓ All spawn targets exist
  ✓ Spawn vars match templates
  ✗ MINIMAX_API_KEY is not set in current shell

Run aborted: 1 preflight failure.
  Fix the failure or re-run with --skip-preflight (not recommended).
```

## Code-level design

- New module: `packages/core/src/preflight/index.ts`.
- Reuses validation rules from `packages/core/src/validation/rules/`.
- New rules added under `preflight/rules/` for env, PATH binaries, provider ping.
- Wired into `converge run` as the first phase.

## Implementation steps

1. Refactor existing validators to be re-usable from preflight.
2. Add env-var resolver: walk project.yml, extract `${VAR}` references, check presence in `process.env`.
3. Add bin-on-path checker.
4. Add provider ping (with timeout; only on `--preflight=full`).
5. Wire into `converge run` flow.

## Test plan

1. Missing env var → preflight fails with clear message.
2. Missing skill file → preflight fails with path.
3. Bad spawn target → fails with template path.
4. All green → preflight passes silently in <1s.
5. `--skip-preflight` → bypasses.

## Out of scope

- Auto-fix mode (preflight only reports, doesn't fix).
- Cross-playbook preflight.
