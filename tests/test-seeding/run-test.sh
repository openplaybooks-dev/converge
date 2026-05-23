#!/usr/bin/env bash
# Multi-level CLI-spawn seeding test with multi-spawn from level-2 children.
#
# Tree:
#     parent (level 1, static, auto-discovered from tasks/)
#       ├── child-alpha (level 2, CLI-spawned, seed container)
#       │     ├── sub-alpha-1 (level 3, CLI-spawned in loop)
#       │     ├── sub-alpha-2 (level 3, CLI-spawned in loop)
#       │     └── sub-alpha-3 (level 3, CLI-spawned in loop)
#       └── child-beta (level 2, CLI-spawned, seed container)
#             ├── sub-beta-1 (level 3, CLI-spawned in loop)
#             ├── sub-beta-2 (level 3, CLI-spawned in loop)
#             └── sub-beta-3 (level 3, CLI-spawned in loop)
#
# Win condition:
#  - One `converge run` invocation runs all 10 tasks (1 static + 2 spawned + 6 loop-spawned)
#  - tasks.jsonl contains rows for: parent, child-alpha, child-beta,
#    sub-alpha-1/2/3, sub-beta-1/2/3
#  - All leaf outputs exist on disk: sub-alpha-*.txt (3) + sub-beta-*.txt (3)
#  - All bodies executed via passthrough (no LLM)

set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
# Auto-detect converge binary: prefer the dist built in this repo
if [ -f "$HERE/../../../packages/cli/dist/index.js" ]; then
  CONVERGE="$HERE/../../../packages/cli/dist/index.js"
elif [ -f "/Users/minh/Documents/converge/packages/cli/dist/index.js" ]; then
  CONVERGE="/Users/minh/Documents/converge/packages/cli/dist/index.js"
else
  CONVERGE="node_modules/.bin/converge"
fi
export CONVERGE_WORKSPACE="$HERE"
PB="default"
PASS=0
FAIL=0

ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); }
fail() { echo "  ❌ $1"; FAIL=$((FAIL+1)); }

cd "$HERE" || exit 1

echo "=== Reset state ==="
rm -rf .converge/journal .converge/inventory .converge/artifacts
rm -rf output
echo "  state cleared (framework dirs + output/)"

echo ""
echo "=== Validate playbook ==="
node "$CONVERGE" playbook validate "$PB" 2>&1 | tail -3 | grep -q "structurally valid" && \
  ok "playbook validates" || fail "playbook validate failed"

echo ""
echo "=== Dry-run: confirm only parent is statically discovered ==="
DRY=$(node "$CONVERGE" run --playbook "$PB" --dry 2>&1)
echo "$DRY" | grep -qE "Will run: *parent" && \
  ok "parent auto-discovered" || { fail "parent NOT auto-discovered"; echo "$DRY" | tail -5; }

echo ""
echo "=== Confirm templates use the singular spawn shape ==="
PARENT_TASK_MD=".converge/playbooks/$PB/tasks/parent/TASK.md"
ALPHA_TPL=".converge/playbooks/$PB/templates/child-alpha/TASK.md"
BETA_TPL=".converge/playbooks/$PB/templates/child-beta/TASK.md"
# Reject any legacy flag — the framework now supports ONE shape only.
for flag in --task-file --from --parent --playbook --depends-on --title --summary; do
  if grep -q -- "$flag" "$PARENT_TASK_MD"; then
    fail "parent body uses removed flag $flag"
  else
    ok "parent body free of legacy flag $flag"
  fi
done
# Affirm the two-positional shape: `converge spawn <id> <template>`
grep -qE "converge spawn [a-z0-9-]+ +[a-z0-9-]+( |$)" "$PARENT_TASK_MD" && \
  ok "parent body uses 'converge spawn <id> <template>' singular shape" || \
  fail "parent body missing the two-positional shape"
grep -qE "converge spawn \"?sub-alpha-" "$ALPHA_TPL" && \
  ok "child-alpha body uses the singular shape" || \
  fail "child-alpha body missing the two-positional shape"
grep -qE "converge spawn \"?sub-beta-" "$BETA_TPL" && \
  ok "child-beta body uses the singular shape" || \
  fail "child-beta body missing the two-positional shape"

echo ""
echo "=== Confirm child-alpha and child-beta loop-spawn 3 children each ==="
grep -qE "for i in 1 2 3" "$ALPHA_TPL" && \
  ok "child-alpha spawns 3 sub-alpha in a loop" || \
  fail "child-alpha loop-spawn pattern not found"
grep -qE "for i in 1 2 3" "$BETA_TPL" && \
  ok "child-beta spawns 3 sub-beta in a loop" || \
  fail "child-beta loop-spawn pattern not found"

echo ""
echo "=== Run converge run end-to-end ==="
# Dry-run above leaves a runstate.json — clear it before the real run.
rm -rf .converge/journal/default
unset ANTHROPIC_BASE_URL ANTHROPIC_AUTH_TOKEN ANTHROPIC_MODEL
node "$CONVERGE" run --playbook "$PB" --full-refresh > /tmp/seeding-run.log 2>&1
echo "--- last 20 lines of run output ---"
tail -20 /tmp/seeding-run.log

echo ""
echo "=== Verify all 10 tasks ran (tasks.jsonl) ==="
if [ -f .converge/inventory/$PB/tasks.jsonl ]; then
  echo "--- tasks.jsonl summary ---"
  awk -F'"' '{
    for(i=1;i<=NF;i++) if($i=="id") { id=$(i+2) }
    for(i=1;i<=NF;i++) if($i=="status") { status=$(i+2) }
    for(i=1;i<=NF;i++) if($i=="source") { source=$(i+2) }
    for(i=1;i<=NF;i++) if($i=="parent") { parent=$(i+2) }
    print "  id="id" status="status" source="source" parent="parent
    parent=""
  }' .converge/inventory/$PB/tasks.jsonl
  echo ""

  # Level 1
  grep -q '"id":"parent"' .converge/inventory/$PB/tasks.jsonl && \
    ok "parent row present (source=static)" || fail "parent row missing"
  grep "\"id\":\"parent\"" .converge/inventory/$PB/tasks.jsonl | grep -q '"source":"static"' && \
    ok "parent has source=static" || fail "parent source wrong"

  # Level 2
  grep -q '"id":"child-alpha"' .converge/inventory/$PB/tasks.jsonl && \
    ok "child-alpha row present" || fail "child-alpha row missing"
  grep "\"id\":\"child-alpha\"" .converge/inventory/$PB/tasks.jsonl | grep -q '"source":"spawned"' && \
    ok "child-alpha has source=spawned" || fail "child-alpha source wrong"
  grep "\"id\":\"child-alpha\"" .converge/inventory/$PB/tasks.jsonl | grep -q '"parent":"parent"' && \
    ok "child-alpha has parent=parent" || fail "child-alpha parent wrong"

  grep -q '"id":"child-beta"' .converge/inventory/$PB/tasks.jsonl && \
    ok "child-beta row present" || fail "child-beta row missing"
  grep "\"id\":\"child-beta\"" .converge/inventory/$PB/tasks.jsonl | grep -q '"source":"spawned"' && \
    ok "child-beta has source=spawned" || fail "child-beta source wrong"

  # Level 3 — sub-alpha-1/2/3
  for i in 1 2 3; do
    grep -q "\"id\":\"sub-alpha-$i\"" .converge/inventory/$PB/tasks.jsonl && \
      ok "sub-alpha-$i row present" || fail "sub-alpha-$i row missing"
    grep "\"id\":\"sub-alpha-$i\"" .converge/inventory/$PB/tasks.jsonl | grep -q '"source":"spawned"' && \
      ok "sub-alpha-$i has source=spawned" || fail "sub-alpha-$i source wrong"
    grep "\"id\":\"sub-alpha-$i\"" .converge/inventory/$PB/tasks.jsonl | grep -q '"parent":"child-alpha"' && \
      ok "sub-alpha-$i has parent=child-alpha" || fail "sub-alpha-$i parent wrong"
  done

  # Level 3 — sub-beta-1/2/3
  for i in 1 2 3; do
    grep -q "\"id\":\"sub-beta-$i\"" .converge/inventory/$PB/tasks.jsonl && \
      ok "sub-beta-$i row present" || fail "sub-beta-$i row missing"
    grep "\"id\":\"sub-beta-$i\"" .converge/inventory/$PB/tasks.jsonl | grep -q '"source":"spawned"' && \
      ok "sub-beta-$i has source=spawned" || fail "sub-beta-$i source wrong"
    grep "\"id\":\"sub-beta-$i\"" .converge/inventory/$PB/tasks.jsonl | grep -q '"parent":"child-beta"' && \
      ok "sub-beta-$i has parent=child-beta" || fail "sub-beta-$i parent wrong"
  done
else
  fail "tasks.jsonl not created"
fi

echo ""
echo "=== Verify topology sequencing and worker parallelism (runstate.json) ==="
if [ -f .converge/journal/default/runstate.json ]; then
  node <<'JSEOF'
const fs = require('node:fs');
const runstate = JSON.parse(fs.readFileSync('.converge/journal/default/runstate.json', 'utf8'));
const nodes = runstate.dag.nodes;
function fail(msg) { console.error(msg); process.exit(1); }
const n = (id) => nodes[id];
const alpha = n('child-alpha');
const beta  = n('child-beta');
if (!alpha || !beta) fail('child-alpha or child-beta missing from runstate');
if (!alpha.started_at) fail('child-alpha missing started_at');
if (!beta.started_at) fail('child-beta missing started_at');
console.log('  child-alpha worker=' + (alpha.worker_id||'none') + ' child-beta worker=' + (beta.worker_id||'none'));
if (alpha.worker_id && beta.worker_id && alpha.worker_id === beta.worker_id) {
  fail('child-alpha and child-beta on same worker: ' + alpha.worker_id);
}
if (n('parent').completed_at && alpha.started_at) {
  const pc = Date.parse(n('parent').completed_at);
  const as = Date.parse(alpha.started_at);
  if (pc > as) fail('child-alpha started before parent completed');
}
console.log('  DAG nodes: ' + Object.keys(nodes).sort().join(', '));
JSEOF
  if [ $? -eq 0 ]; then
    ok "runstate shows sequential parent→child ordering" && \
    ok "runstate shows sibling level-2 tasks on different workers"
  else
    fail "runstate sequencing/worker assertions failed"
  fi
else
  fail "runstate.json not created"
fi

echo ""
echo "=== Verify vars passing — strict contract enforced ==="
# child-alpha received all 3 vars (sprint_id, owner, wave=3 overrides default 0)
[ -s output/alpha.flag ] && grep -q "sprint=sprint-042 owner=alice wave=3" output/alpha.flag && \
  ok "child-alpha received sprint_id+owner+wave (override of default 0 → 3)" || \
  { fail "child-alpha vars wrong: $(cat output/alpha.flag 2>/dev/null)"; }

# child-beta declared ONLY sprint_id → owner is filtered out by the framework
[ -s output/beta.txt ] && [ "$(cat output/beta.txt)" = "sprint-042" ] && \
  ok "child-beta received sprint_id" || \
  { fail "child-beta sprint_id wrong: $(cat output/beta.txt 2>/dev/null)"; }
! grep -q "alice" output/beta.txt && \
  ok "child-beta did NOT receive owner — strict-mode filtering works" || \
  fail "child-beta leaked owner — strict-mode filter broken"

echo ""
echo "=== Verify loop-spawned sub-alpha children (child-alpha's 3 children) ==="
for i in 1 2 3; do
  EXPECTED="sub-alpha-$i: sprint=sprint-042 owner=alice"
  [ -s "output/sub-alpha-$i.txt" ] && grep -q "$EXPECTED" "output/sub-alpha-$i.txt" && \
    ok "sub-alpha-$i received sprint_id+owner from child-alpha" || \
    { fail "sub-alpha-$i vars wrong: $(cat "output/sub-alpha-$i.txt" 2>/dev/null)"; }
done

echo ""
echo "=== Verify loop-spawned sub-beta children (child-beta's 3 children) ==="
for i in 1 2 3; do
  EXPECTED="sub-beta-$i: sprint=sprint-042"
  [ -s "output/sub-beta-$i.txt" ] && grep -q "$EXPECTED" "output/sub-beta-$i.txt" && \
    ok "sub-beta-$i received sprint_id (owner filtered — child-beta didn't declare it)" || \
    { fail "sub-beta-$i vars wrong: $(cat "output/sub-beta-$i.txt" 2>/dev/null)"; }
  # Verify owner was NOT leaked to sub-beta
  ! grep -q "owner" "output/sub-beta-$i.txt" && \
    ok "sub-beta-$i did NOT receive owner — strict-mode filter works at 3-level depth" || \
    fail "sub-beta-$i leaked owner — strict-mode filter broken at level 3"
done

echo ""
echo "=== Failure mode: missing required var → spawn fails clearly ==="
( cd /tmp && unset CONVERGE_VAR_SPRINT_ID CONVERGE_VAR_OWNER && \
  CONVERGE_WORKSPACE="$HERE" \
  CONVERGE_PLAYBOOK="$PB" \
  node "$CONVERGE" spawn missing-test child-alpha 2>&1 ) > /tmp/spawn-fail.log
ec=$?
grep -q "missing required vars" /tmp/spawn-fail.log && \
  ok "missing required var produces clear error message" || \
  { fail "missing-required error missing from output"; cat /tmp/spawn-fail.log | head -5; }
[ "$ec" -ne 0 ] && \
  ok "spawn exits non-zero ($ec) when required vars are missing" || \
  fail "spawn exited 0 despite missing required vars"
grep -qE "sprint_id|owner" /tmp/spawn-fail.log && \
  ok "error message names the specific missing var(s)" || \
  fail "error message vague about which vars are missing"

echo ""
echo "=== Verify parent ran (output/parent.flag) ==="
[ -s output/parent.flag ] && ok "output/parent.flag exists" || fail "output/parent.flag missing"

echo ""
echo "=== Verify child-alpha ran (output/alpha.flag) ==="
[ -s output/alpha.flag ] && ok "output/alpha.flag exists" || fail "output/alpha.flag missing"

echo ""
echo "=== Clean up test artifacts ==="
rm -rf output
rm -f /tmp/spawn-fail.log /tmp/seeding-run.log
echo "  removed output/ + /tmp/spawn-fail.log /tmp/seeding-run.log"

echo ""
echo "===================================="
echo "RESULTS:  $PASS passed,  $FAIL failed"
echo "===================================="
[ "$FAIL" -eq 0 ] && exit 0 || exit 1