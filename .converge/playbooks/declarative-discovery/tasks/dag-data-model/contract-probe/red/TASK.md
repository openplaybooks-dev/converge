---
id: contract-probe-red
title: Red — write probe scripts; confirm they detect missing surfaces
description: |
  Write a probe script for each predecessor contract check. Each probe
  exits 0 if the surface is present, non-zero if absent. The aggregate
  runner exits non-zero if ANY probe fails. Expect RED — some
  dbt-paradigm outputs don't exist on disk yet.

inputs:
  - .converge/playbook-chain.md

outputs:
  - .converge/playbooks/declarative-discovery/00-contract-probe/probes/

checks:
  - id: probes-exist
    cmd: test -d .converge/playbooks/declarative-discovery/00-contract-probe/probes && test -f .converge/playbooks/declarative-discovery/00-contract-probe/probes/run-all.sh
    description: Probe scripts directory and aggregate runner exist.
  - id: probes-are-executable
    cmd: test -x .converge/playbooks/declarative-discovery/00-contract-probe/probes/run-all.sh
    description: Aggregate probe runner is executable.
  - id: probes-fail
    cmd: "! .converge/playbooks/declarative-discovery/00-contract-probe/probes/run-all.sh"
    description: Aggregate probe runner fails (RED) — some predecessor surfaces are missing.

tags:
  - tdd
  - red
---

# Red — write probe scripts

Create `.converge/playbooks/declarative-discovery/00-contract-probe/probes/`
with one script per check and an aggregate runner.

## Probe scripts

Each probe is a standalone script in `probes/`. Naming: `NN-description.sh`.

### `01-cli-redesign-select.sh`
```bash
#!/bin/bash
test -d packages/core/src/select || { echo "FAIL: select/ directory missing"; exit 1; }
echo "PASS: cli-redesign select module exists"
```

### `02-remove-goals-no-goal-manager.sh`
```bash
#!/bin/bash
test -f packages/core/src/runtime/goal-manager.ts && { echo "FAIL: goal-manager.ts still exists"; exit 1; }
echo "PASS: goal-manager.ts absent"
```

### `03-child-synthesizer-exists.sh`
```bash
#!/bin/bash
test -f packages/core/src/runtime/child-synthesizer.ts || { echo "FAIL: child-synthesizer.ts missing"; exit 1; }
echo "PASS: child-synthesizer.ts exists"
```

### `04-child-synthesizer-exports-synthesize.sh`
```bash
#!/bin/bash
grep -q 'export.*function synthesize\|export.*synthesize' packages/core/src/runtime/child-synthesizer.ts || { echo "FAIL: synthesize not exported"; exit 1; }
echo "PASS: child-synthesizer exports synthesize"
```

### `05-seed-spawner-exists.sh`
```bash
#!/bin/bash
test -f packages/core/src/runtime/seed-spawner.ts || { echo "FAIL: seed-spawner.ts missing"; exit 1; }
echo "PASS: seed-spawner.ts exists"
```

### `06-seed-spawner-exports.sh`
```bash
#!/bin/bash
grep -q 'export.*spawnDynamicChildren\|export.*SeedSpawner' packages/core/src/runtime/seed-spawner.ts || { echo "FAIL: spawnDynamicChildren not exported"; exit 1; }
echo "PASS: seed-spawner exports spawn entry point"
```

### `07-seed-md-definition.sh`
```bash
#!/bin/bash
test -f packages/core/src/config/seed-md-definition.ts || { echo "FAIL: seed-md-definition.ts missing"; exit 1; }
grep -q 'export.*parseSeedMd\|export.*SeedMdDefinition' packages/core/src/config/seed-md-definition.ts || { echo "FAIL: parseSeedMd not exported"; exit 1; }
echo "PASS: seed-md-definition.ts exists with expected exports"
```

### `08-test-md-definition.sh`
```bash
#!/bin/bash
test -f packages/core/src/config/test-md-definition.ts || { echo "FAIL: test-md-definition.ts missing"; exit 1; }
grep -q 'export.*parseTestMd\|export.*TestMdDefinition' packages/core/src/config/test-md-definition.ts || { echo "FAIL: parseTestMd not exported"; exit 1; }
echo "PASS: test-md-definition.ts exists with expected exports"
```

### `09-wbs-executor-absent.sh`
```bash
#!/bin/bash
test -f packages/core/src/executor/wbs-executor.ts && { echo "FAIL: wbs-executor.ts still exists (should be deleted by dbt-paradigm)"; exit 1; }
echo "PASS: wbs-executor.ts absent"
```

### `10-wbs-target-utils-absent.sh`
```bash
#!/bin/bash
test -f packages/core/src/executor/wbs-target-utils.ts && { echo "FAIL: wbs-target-utils.ts still exists"; exit 1; }
echo "PASS: wbs-target-utils.ts absent"
```

### `11-no-wbs-field-in-task-md.sh`
```bash
#!/bin/bash
grep -q "'wbs'" packages/core/src/config/task-md-definition.ts 2>/dev/null && { echo "FAIL: wbs field still in task-md-definition.ts"; exit 1; }
echo "PASS: no wbs field in task-md-definition.ts"
```

### `12-manifest-has-parent-child-maps.sh`
```bash
#!/bin/bash
grep -q 'parent_map\|child_map' packages/core/src/manifest/types.ts || { echo "FAIL: manifest types missing parent_map/child_map"; exit 1; }
echo "PASS: manifest types have parent_map/child_map"
```

### `13-fixture-has-seeds-and-tests.sh`
```bash
#!/bin/bash
test -d packages/cli/tests/fixtures/minimal-playbook/seeds || { echo "FAIL: fixture missing seeds/"; exit 1; }
test -d packages/cli/tests/fixtures/minimal-playbook/tests || { echo "FAIL: fixture missing tests/"; exit 1; }
echo "PASS: fixture has seeds/ and tests/"
```

## Aggregate runner (`probes/run-all.sh`)

```bash
#!/bin/bash
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
PASS=0
FAIL=0
for probe in "$DIR"/*.sh; do
  [ "$(basename "$probe")" = "run-all.sh" ] && continue
  if bash "$probe"; then
    PASS=$((PASS + 1))
  else
    FAIL=$((FAIL + 1))
  fi
done
echo "---"
echo "Passed: $PASS  Failed: $FAIL"
[ $FAIL -eq 0 ] || exit 1
```

Run `probes/run-all.sh` — confirm it exits non-zero (RED). Some
dbt-paradigm surfaces are not yet on disk. That's expected.
