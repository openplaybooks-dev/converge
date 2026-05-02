---
id: verification-red
title: Red — write verification sweep script
description: |
  Write a script that checks every live playbook for complete children:
  declarations. Run it. Expected RED — not all playbooks have been
  migrated yet.

outputs:
  - .converge/playbooks/declarative-discovery/tools/verify-declarative.sh

checks:
  - id: script-exists
    cmd: test -x .converge/playbooks/declarative-discovery/tools/verify-declarative.sh
    description: Verification script exists and is executable.
  - id: sweep-fails
    cmd: "! bash .converge/playbooks/declarative-discovery/tools/verify-declarative.sh"
    description: Sweep fails (RED) — playbooks not yet fully declarative.

tags:
  - tdd
  - red
---

# Red — verification sweep script

Write `.converge/playbooks/declarative-discovery/tools/verify-declarative.sh`:

```bash
#!/bin/bash
set -e

CATALOG=".converge/playbooks/declarative-discovery/playbooks-catalog.json"
FAILED=0
PASSED=0

echo "=== Declarative verification sweep ==="

while IFS= read -r playbook_path; do
  playbook_name=$(basename "$playbook_path")
  echo ""
  echo "--- $playbook_name ---"

  # Find all parent directories (have TASK.md + subdirs with TASK.md)
  parent_dirs=$(find "$playbook_path/tasks" -name TASK.md -mindepth 2 \
    -exec dirname {} \; | xargs -I{} dirname {} | sort -u)

  for pd in $parent_dirs; do
    parent_task="$pd/TASK.md"
    test -f "$parent_task" || continue

    if grep -qE '^children:|^from_seed:' "$parent_task"; then
      echo "  PASS: $(basename "$pd") declares children"
      PASSED=$((PASSED + 1))
    else
      echo "  FAIL: $(basename "$pd") missing children: or from_seed:"
      FAILED=$((FAILED + 1))
    fi
  done
done < <(jq -r '.[] | select(.live == true) | .path' "$CATALOG")

echo ""
echo "=== Results: $PASSED passed, $FAILED failed ==="
[ $FAILED -eq 0 ] || exit 1
```

Run it — expected RED because the migration hasn't happened yet.
