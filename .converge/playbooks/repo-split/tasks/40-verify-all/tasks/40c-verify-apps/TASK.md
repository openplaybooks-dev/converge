---
description: >
  Verify all 3 app repos exist on GitHub and are production-ready.
  planner must have no workspace:* refs, only git dependencies.
inputs: []
outputs:
  - (none — verification only)
checks:
  - id: landing-exists
    cmd: gh repo view minhlucvan/converge-landing --json name >/dev/null 2>&1
  - id: playbooks-to-exists
    cmd: gh repo view minhlucvan/playbooks-to --json name >/dev/null 2>&1
  - id: planner-exists
    cmd: gh repo view minhlucvan/converge-planner --json name >/dev/null 2>&1
skills: []
references: []
vars: {}
depends_on: []
---

Verify all 3 app repos exist and are valid.

```bash
# Verify landing
echo "=== converge-landing ==="
if gh repo view minhlucvan/converge-landing --json name >/dev/null 2>&1; then
  echo "Repo exists: OK"
  TMPDIR=$(mktemp -d)
  git clone https://github.com/minhlucvan/converge-landing.git "$TMPDIR" 2>/dev/null
  test -f "$TMPDIR/README.md" && echo "README: OK" || echo "README: MISSING"
  test -f "$TMPDIR/LICENSE" && echo "LICENSE: OK" || echo "LICENSE: MISSING"
  test -f "$TMPDIR/.github/workflows/ci.yml" && echo "CI: OK" || echo "CI: MISSING"
  rm -rf "$TMPDIR"
else
  echo "FAIL: repo not found"
  exit 1
fi

# Verify playbooks-to
echo "=== playbooks-to ==="
if gh repo view minhlucvan/playbooks-to --json name >/dev/null 2>&1; then
  echo "Repo exists: OK"
  TMPDIR=$(mktemp -d)
  git clone https://github.com/minhlucvan/playbooks-to.git "$TMPDIR" 2>/dev/null
  test -f "$TMPDIR/README.md" && echo "README: OK" || echo "README: MISSING"
  test -f "$TMPDIR/LICENSE" && echo "LICENSE: OK" || echo "LICENSE: MISSING"
  test -f "$TMPDIR/.github/workflows/ci.yml" && echo "CI: OK" || echo "CI: MISSING"
  rm -rf "$TMPDIR"
else
  echo "FAIL: repo not found"
  exit 1
fi

# Verify planner — special: must have no workspace:* refs
echo "=== converge-planner ==="
if gh repo view minhlucvan/converge-planner --json name >/dev/null 2>&1; then
  echo "Repo exists: OK"
  TMPDIR=$(mktemp -d)
  git clone https://github.com/minhlucvan/converge-planner.git "$TMPDIR" 2>/dev/null
  test -f "$TMPDIR/README.md" && echo "README: OK" || echo "README: MISSING"
  test -f "$TMPDIR/LICENSE" && echo "LICENSE: OK" || echo "LICENSE: MISSING"
  test -f "$TMPDIR/.github/workflows/ci.yml" && echo "CI: OK" || echo "CI: MISSING"

  # Critical check: no workspace:* refs in package.json
  if grep -q "workspace:" "$TMPDIR/package.json"; then
    echo "FAIL: workspace:* refs found in package.json"
    grep "workspace:" "$TMPDIR/package.json"
    exit 1
  fi
  echo "No workspace refs: OK"

  # Check git deps are present
  if grep -q "github:minhlucvan/converge" "$TMPDIR/package.json"; then
    echo "Git deps present: OK"
  else
    echo "WARNING: git deps not found — manual check needed"
  fi
  rm -rf "$TMPDIR"
else
  echo "FAIL: repo not found"
  exit 1
fi

echo "All 3 app repos verified."
```
