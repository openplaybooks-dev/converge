#!/usr/bin/env bash
# Multi-level CLI-spawn seeding test.
#
# Tree:
#     parent (level 1, static, auto-discovered from tasks/)
#       ├── child-alpha (level 2, CLI-spawned, seed container)
#       │     └── grandchild (level 3, CLI-spawned, leaf — writes grand.txt)
#       └── child-beta (level 2, CLI-spawned, leaf — writes beta.txt)
#
# Win condition:
#  - One `converge run` invocation runs all 4 tasks
#  - tasks.jsonl contains rows for: parent, child-alpha, child-beta, grandchild
#  - Both leaf outputs exist on disk: beta.txt with "beta", grand.txt with "grand"
#  - All bodies executed via passthrough (no LLM)

set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
# Auto-detect converge binary: prefer the dist built in this repo
if [ -f "$HERE/../../packages/cli/dist/index.js" ]; then
  CONVERGE="$HERE/../../packages/cli/dist/index.js"
elif [ -f "/Users/minh/Documents/converge/packages/cli/dist/index.js" ]; then
  CONVERGE="/Users/minh/Documents/converge/packages/cli/dist/index.js"
else
  CONVERGE="node_modules/.bin/converge"
fi
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
echo "$DRY" | grep -qE "DAG: 3 nodes" && \
  ok "DAG has 3 nodes (parent + 2 framework roots) before seeding" || \
  echo "  (DAG size check — informational, exact count may vary)"

echo ""
echo "=== Confirm templates use the singular spawn shape ==="
PARENT_TASK_MD=".converge/playbooks/$PB/tasks/parent/TASK.md"
ALPHA_TPL=".converge/playbooks/$PB/templates/child-alpha/TASK.md"
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
grep -qE "converge spawn [a-z0-9-]+ +[a-z0-9-]+( |$)" "$ALPHA_TPL" && \
  ok "child-alpha body uses the singular shape" || \
  fail "child-alpha body missing the two-positional shape"

echo ""
echo "=== Run converge run end-to-end ==="
# Dry-run above leaves a runstate.json — clear it before the real run.
rm -rf .converge/journal/default
unset ANTHROPIC_BASE_URL ANTHROPIC_AUTH_TOKEN ANTHROPIC_MODEL
# Note: CONVERGE_BIN is now auto-exported by the framework's execute-task.ts;
# passthrough bodies get a `converge` shell function via task-run.ts.
# Run without piping so output isn't truncated; redirect to log file.
node "$CONVERGE" run --playbook "$PB" --full-refresh > /tmp/seeding-run.log 2>&1
echo "--- last 20 lines of run output ---"
tail -20 /tmp/seeding-run.log

echo ""
echo "=== Verify all 4 tasks ran (tasks.jsonl) ==="
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

  grep -q '"id":"parent"' .converge/inventory/$PB/tasks.jsonl && \
    ok "parent row present (source=static)" || fail "parent row missing"
  grep "\"id\":\"parent\"" .converge/inventory/$PB/tasks.jsonl | grep -q '"source":"static"' && \
    ok "parent has source=static" || fail "parent source wrong"

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

  grep -q '"id":"grandchild"' .converge/inventory/$PB/tasks.jsonl && \
    ok "grandchild (level 3) row present — proves 3-level recursion" || fail "grandchild row missing"
  grep "\"id\":\"grandchild\"" .converge/inventory/$PB/tasks.jsonl | grep -q '"parent":"child-alpha"' && \
    ok "grandchild has parent=child-alpha — proves nested spawn chain" || fail "grandchild parent wrong"
else
  fail "tasks.jsonl not created"
fi

echo ""
echo "=== Verify vars passing — strict contract enforced ==="
# All evidence files now live under output/
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

# grandchild received sprint_id (3-level propagation) + phase default
[ -s output/grand.txt ] && [ "$(cat output/grand.txt)" = "sprint-042/leaf" ] && \
  ok "grandchild received sprint_id (3-level chain) + 'phase' default" || \
  { fail "grandchild vars wrong: $(cat output/grand.txt 2>/dev/null)"; }

echo ""
echo "=== Inspect params in tasks.jsonl rows (RFC 0031: no pre-rendered TASK.md) ==="
ALPHA_ROW=$(grep '"id":"child-alpha"' ".converge/inventory/$PB/tasks.jsonl")
BETA_ROW=$(grep '"id":"child-beta"' ".converge/inventory/$PB/tasks.jsonl")
GRAND_ROW=$(grep '"id":"grandchild"' ".converge/inventory/$PB/tasks.jsonl")

echo "$ALPHA_ROW" | grep -q '"owner":"alice"' && \
  ok "alpha params include owner: alice" || \
  fail "alpha params missing owner"
echo "$ALPHA_ROW" | grep -q '"wave":"3"' && \
  ok "alpha params include wave: 3 (overrode template default 0)" || \
  fail "alpha frontmatter wave wrong"

# Beta's params should have sprint_id. Owner is stored in params (parent
# passed --var owner=alice) but filtered out at runtime by the child's
# template vars contract — see output/beta.txt which confirms owner=''.
echo "$BETA_ROW" | grep -q '"sprint_id"' && \
  ok "beta params include sprint_id" || fail "beta params missing sprint_id"

# Grandchild's params should have sprint_id and taskRef
echo "$GRAND_ROW" | grep -q '"sprint_id"' && \
  ok "grandchild params include sprint_id (3-level propagation)" || \
  fail "grandchild params missing sprint_id"
echo "$GRAND_ROW" | grep -q '"taskRef"' && \
  ok "grandchild uses taskRef (no pre-rendered TASK.md)" || \
  fail "grandchild missing taskRef"

echo ""
echo "=== Failure mode: missing required var → spawn fails clearly ==="
# Simulate: try to spawn child-alpha WITHOUT --var sprint_id. Should error
# with "missing required vars [sprint_id, owner]" and exit code 3.
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
# Remove everything this run produced so the fixture root stays clean for
# the next invocation, for git status, and for diffing reviewers. We keep
# the framework's own inventory/journal in case the operator wants to
# inspect the rows post-mortem; those are wiped at the top of the next run.
rm -rf output
rm -f /tmp/spawn-fail.log /tmp/seeding-run.log
echo "  removed output/ + /tmp/spawn-fail.log /tmp/seeding-run.log"

echo ""
echo "===================================="
echo "RESULTS:  $PASS passed,  $FAIL failed"
echo "===================================="
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
