#!/usr/bin/env bash
# Catalog-batch seeding test harness.
#
# Tests two approaches for seeding 100 subtasks from a catalog JSON file:
#   1. inline-catalog  — batch logic is inline in the parent TASK.md body
#   2. external-catalog — batch logic is in scripts/spawn-batch.sh
#
# Both use `converge spawn --batch catalog.jsonl` to register all 100 children.
# This fixture validates structural contracts and batch generation logic.

set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$HERE/../.." && pwd)"

if [ -f "$REPO_ROOT/packages/cli/dist/index.js" ]; then
  CONVERGE="$REPO_ROOT/packages/cli/dist/index.js"
else
  CONVERGE="node_modules/.bin/converge"
fi

PASS=0
FAIL=0

ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); }
fail() { echo "  ❌ $1"; FAIL=$((FAIL+1)); }

reset_state() {
  rm -rf "$HERE/.converge/journal" "$HERE/.converge/inventory" "$HERE/.converge/artifacts"
  rm -rf "$HERE/output" "$HERE/catalog.jsonl"
  # Also clean per-playbook generated files
  for pb in inline-catalog external-catalog; do
    rm -rf "$HERE/.converge/playbooks/$pb/output"
    rm -rf "$HERE/.converge/playbooks/$pb/catalog.jsonl"
  done
}

cd "$HERE" || exit 1

echo "=== Generate catalogs ==="
bash scripts/generate-catalog.sh "$HERE/.converge/playbooks/inline-catalog" 2>&1
cp "$HERE/.converge/playbooks/inline-catalog/catalog.json" "$HERE/.converge/playbooks/external-catalog/catalog.json"
ok "catalogs generated"

echo ""
echo "=== Validate catalog structure ==="
ITEMS=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$HERE/.converge/playbooks/inline-catalog/catalog.json','utf-8')).length)")
[ "$ITEMS" -eq 100 ] && ok "catalog.json has 100 items" || fail "catalog.json has $ITEMS items (expected 100)"

for FIELD in id name category; do
  MISSING=$(node -e "
    const items = JSON.parse(require('fs').readFileSync('$HERE/.converge/playbooks/inline-catalog/catalog.json','utf-8'));
    console.log(items.filter(i => !i['$FIELD']).length);
  ")
  [ "$MISSING" -eq 0 ] && ok "all items have '$FIELD' field" || fail "$MISSING items missing '$FIELD'"
done

DIFF_OUT=$(diff "$HERE/.converge/playbooks/inline-catalog/catalog.json" "$HERE/.converge/playbooks/external-catalog/catalog.json" 2>&1)
[ -z "$DIFF_OUT" ] && ok "both catalogs are identical" || fail "catalogs differ"

echo ""
echo "=== Validate playbooks ==="
for pb in inline-catalog external-catalog; do
  node "$CONVERGE" playbook validate "$pb" 2>&1 | tail -3 | grep -q "structurally valid" && \
    ok "$pb validates" || fail "$pb validate failed"
done

echo ""
echo "=== Verify playbook.yml settings ==="
for pb in inline-catalog external-catalog; do
  PLAYBOOK="$HERE/.converge/playbooks/$pb/playbook.yml"
  grep -q 'workers:' "$PLAYBOOK" && ok "$pb has workers setting" || fail "$pb missing workers"
  grep -q 'maxDuration:' "$PLAYBOOK" && ok "$pb has maxDuration" || fail "$pb missing maxDuration"
  grep -q 'maxTaskAttempts:' "$PLAYBOOK" && ok "$pb has maxTaskAttempts" || fail "$pb missing maxTaskAttempts"
done

echo ""
echo "=== Verify TASK.md contracts ==="
for pb in inline-catalog external-catalog; do
  TASK_MD="$HERE/.converge/playbooks/$pb/tasks/seed-all/TASK.md"
  TPL_MD="$HERE/.converge/playbooks/$pb/templates/catalog-item/TASK.md"

  # Parent contract
  grep -q 'passthrough: true' "$TASK_MD" && ok "$pb parent is passthrough" || fail "$pb parent not passthrough"
  if [ "$pb" = "inline-catalog" ]; then
    grep -q 'converge spawn --batch' "$TASK_MD" && ok "$pb parent calls batch spawn" || fail "$pb parent missing batch spawn call"
  else
    ok "$pb parent delegates to external script (skipping inline batch check)"
  fi
  grep -q 'outputs:' "$TASK_MD" && ok "$pb parent declares outputs" || fail "$pb parent missing outputs"
  grep -q 'checks:' "$TASK_MD" && ok "$pb parent declares checks" || fail "$pb parent missing checks"
  grep -q 'converge:' "$TASK_MD" && ok "$pb parent has converge.cmd" || fail "$pb parent missing converge.cmd"
  grep -q 'echo done' "$TASK_MD" && ok "$pb parent converge.cmd returns done" || fail "$pb parent converge.cmd missing done"

  # Template contract
  grep -q 'passthrough: true' "$TPL_MD" && ok "$pb template is passthrough" || fail "$pb template not passthrough"
  grep -q 'item_id:' "$TPL_MD" && ok "$pb template declares item_id var" || fail "$pb template missing item_id"
  grep -q 'item_name:' "$TPL_MD" && ok "$pb template declares item_name var" || fail "$pb template missing item_name"
  grep -q 'item_category:' "$TPL_MD" && ok "$pb template declares item_category var" || fail "$pb template missing item_category"
  grep -q 'CONVERGE_VAR_ITEM_ID' "$TPL_MD" && ok "$pb template uses CONVERGE_VAR_ITEM_ID" || fail "$pb template missing var usage"
  grep -q '```bash' "$TPL_MD" && ok "$pb template has bash body" || fail "$pb template missing bash body"

  # Verify both catalogs referenced in TASK.md bodies exist
  grep -q 'catalog.json' "$TASK_MD" && ok "$pb TASK.md references catalog.json" || fail "$pb TASK.md missing catalog.json ref"
done

echo ""
echo "=== Verify batch JSONL generation ==="
for pb in inline-catalog external-catalog; do
  CATALOG="$HERE/.converge/playbooks/$pb/catalog.json"
  JSONL=$(mktemp)

  > "$JSONL"
  while IFS= read -r line; do
    echo "$line" | grep -qE '^\s*[\[\]]' && continue
    ID=$(echo "$line" | grep -o '"id"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"\([^"]*\)".*/\1/')
    NAME=$(echo "$line" | grep -o '"name"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"\([^"]*\)".*/\1/')
    CAT=$(echo "$line" | grep -o '"category"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"\([^"]*\)".*/\1/')
    [ -z "$ID" ] && continue
    printf '{"id":"%s","template":"catalog-item","vars":{"item_id":"%s","item_name":"%s","item_category":"%s"}}\n' \
      "$ID" "$ID" "$NAME" "$CAT" >> "$JSONL"
  done < "$CATALOG"

  JSONL_COUNT=$(wc -l < "$JSONL")
  [ "$JSONL_COUNT" -eq 100 ] && ok "$pb generates 100 JSONL lines" || fail "$pb generates $JSONL_COUNT JSONL lines (expected 100)"

  # Validate each JSONL line is parseable JSON with required fields
  BAD=0
  while IFS= read -r jline; do
    echo "$jline" | node -e "
      const d = require('fs').readFileSync(0,'utf-8');
      const o = JSON.parse(d);
      if (typeof o.id !== 'string' || typeof o.template !== 'string' || !o.vars) process.exit(1);
    " 2>/dev/null || BAD=$((BAD+1))
  done < "$JSONL"
  [ "$BAD" -eq 0 ] && ok "$pb all JSONL lines valid" || fail "$pb $BAD invalid JSONL lines"

  FIRST_ID=$(head -1 "$JSONL" | node -e "const d=require('fs').readFileSync(0,'utf-8'); console.log(JSON.parse(d).id)")
  LAST_ID=$(tail -1 "$JSONL" | node -e "const d=require('fs').readFileSync(0,'utf-8'); console.log(JSON.parse(d).id)")
  [ "$FIRST_ID" = "item-001" ] && ok "$pb first entry is item-001" || fail "$pb first entry is $FIRST_ID"
  [ "$LAST_ID" = "item-100" ] && ok "$pb last entry is item-100" || fail "$pb last entry is $LAST_ID"

  rm -f "$JSONL"
done

echo ""
echo "=== Verify batch JSONL generation (inline body approach) ==="
# Inline parent should contain the JSONL generation + --batch logic
grep -q 'converge spawn --batch' "$HERE/.converge/playbooks/inline-catalog/tasks/seed-all/TASK.md" && \
  ok "inline-catalog has batch spawn in TASK.md" || fail "inline-catalog missing batch spawn"
# External parent delegates to script, so check the script instead
grep -q 'converge spawn --batch' "$HERE/.converge/playbooks/external-catalog/scripts/spawn-batch.sh" && \
  ok "external-catalog has batch spawn in script" || fail "external-catalog missing batch spawn in script"

echo ""
echo "=== Verify external script ==="
SCRIPT="$HERE/.converge/playbooks/external-catalog/scripts/spawn-batch.sh"
[ -x "$SCRIPT" ] && ok "spawn-batch.sh is executable" || fail "spawn-batch.sh not executable"
grep -q 'converge spawn --batch' "$SCRIPT" && ok "spawn-batch.sh calls batch spawn" || fail "spawn-batch.sh missing batch call"

echo ""
echo "=== Run unit tests ==="
cd "$REPO_ROOT"
VITEST_OUTPUT=$(node_modules/.bin/vitest run tests/test-catalog-batch.test.ts 2>&1)
VITEST_RC=$?
cd "$HERE"

echo "$VITEST_OUTPUT" | tail -5

if [ "$VITEST_RC" -eq 0 ]; then
  ok "vitest unit tests pass"
else
  fail "vitest unit tests exited with rc=$VITEST_RC"
fi

echo ""
echo "=== Cleanup ==="
reset_state
echo "  runtime state removed"

echo ""
echo "===================================="
echo "RESULTS:  $PASS passed,  $FAIL failed"
echo "===================================="
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
