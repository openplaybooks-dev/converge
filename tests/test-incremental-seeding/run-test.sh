#!/usr/bin/env bash
set -u

HERE="$(cd "$(dirname "$0")" && pwd)"
CONVERGE="/Users/minh/Documents/converge/packages/cli/dist/index.js"
PASS=0
FAIL=0

ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); }
fail() { echo "  ❌ $1"; FAIL=$((FAIL+1)); }

reset_state() {
  rm -rf "$HERE/.converge/journal" "$HERE/.converge/inventory" "$HERE/.converge/artifacts"
  rm -rf "$HERE/output"
}

run_playbook() {
  local pb="$1"
  local log="$2"
  unset ANTHROPIC_BASE_URL ANTHROPIC_AUTH_TOKEN ANTHROPIC_MODEL
  timeout 120 node "$CONVERGE" run --playbook "$pb" > "$log" 2>&1
  return $?
}

cd "$HERE" || exit 1

echo "=== Reset state ==="
reset_state
echo "  state cleared"

echo ""
echo "=== Validate playbooks ==="
for pb in default for-each nested-loop; do
  node "$CONVERGE" playbook validate "$pb" 2>&1 | tail -3 | grep -q "structurally valid" && \
    ok "$pb validates" || fail "$pb validate failed"
done

echo ""
echo "=== Run default ==="
DEFAULT_LOG=$(mktemp)
run_playbook default "$DEFAULT_LOG"
RC=$?
echo "exit=$RC"
grep -E "\[default\]|\[default-child\]|Converge|Done:|Stalled" "$DEFAULT_LOG" | head -30 || true
[ "$RC" -eq 0 ] && ok "default run exited 0" || fail "default run exited $RC"
for w in 0 1 2; do
  [ -f "output/default/wave-${w}.flag" ] && ok "default wave-${w}.flag exists" || fail "default wave-${w}.flag missing"
done
for i in 0 1 2; do
  F=$(printf "output/child-%02d.txt" "$i")
  [ -f "$F" ] && ok "$(basename "$F") exists" || fail "$(basename "$F") missing"
done

echo ""
echo "=== Run for-each ==="
rm -rf .converge/journal .converge/inventory .converge/artifacts
FOR_EACH_LOG=$(mktemp)
run_playbook for-each "$FOR_EACH_LOG"
RC=$?
echo "exit=$RC"
grep -E "\[for-each\]|\[for-each-item\]|Converge|Done:|Stalled" "$FOR_EACH_LOG" | head -30 || true
[ "$RC" -eq 0 ] && ok "for-each run exited 0" || fail "for-each run exited $RC"
for item in alpha beta gamma; do
  [ -f "output/for-each/${item}.txt" ] && ok "${item}.txt exists" || fail "${item}.txt missing"
done

echo ""
echo "=== Run nested-loop ==="
rm -rf .converge/journal .converge/inventory .converge/artifacts
NESTED_LOG=$(mktemp)
run_playbook nested-loop "$NESTED_LOG"
RC=$?
echo "exit=$RC"
grep -E "\[nested-root\]|\[batch\]|\[nested-item\]|Converge|Done:|Stalled" "$NESTED_LOG" | head -50 || true
[ "$RC" -eq 0 ] && ok "nested-loop run exited 0" || fail "nested-loop run exited $RC"
for batch in 0 1; do
  [ -f "output/nested-loop/batches/batch-${batch}.flag" ] && ok "batch-${batch}.flag exists" || fail "batch-${batch}.flag missing"
  for item in 0 1; do
    F="output/nested-loop/items/batch-${batch}-item-${item}.txt"
    [ -f "$F" ] && ok "$(basename "$F") exists" || fail "$(basename "$F") missing"
  done
done

echo ""
echo "=== Cleanup ==="
rm -f "$DEFAULT_LOG" "$FOR_EACH_LOG" "$NESTED_LOG"
reset_state
echo "  runtime state removed"

echo ""
echo "===================================="
echo "RESULTS:  $PASS passed,  $FAIL failed"
echo "===================================="
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
