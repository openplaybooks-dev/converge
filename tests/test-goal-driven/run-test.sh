#!/usr/bin/env bash
# Goal-driven multi-wave + seeding test.
#
# Demonstrates the combined pattern from examples/goal-driven-dev:
#
#   build (multi-wave do-while)
#     ├── wave 0 → spawns sprint-0 → spawns sprint-0--phase-a, sprint-0--phase-b
#     ├── wave 1 → spawns sprint-1 → spawns sprint-1--phase-a, sprint-1--phase-b
#     └── wave 2 → spawns sprint-2 → spawns sprint-2--phase-a, sprint-2--phase-b
#
# After 3 waves: 1 build + 3 sprints + 6 phases = 10 tasks total. The
# build's gap-driven loop drives the waves; each wave's body uses
# `converge spawn task` to inject one sprint orchestrator into the live
# DAG; the sprint spawns 2 phase children via the same mechanism.
#
# Each task writes its own artifact, proving the whole chain ran:
#   - build:   output/build/wave-{0,1,2}.flag
#   - sprint:  output/sprints/sprint-{0,1,2}.flag
#   - phase:   output/phases/sprint-{0,1,2}--phase-{a,b}.json (6 files)
#
# No LLM required — `ai.provider: stub` + CONVERGE_STUB_RESPONSE.

set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
CONVERGE="/Users/minh/Documents/converge/packages/cli/dist/index.js"
PB="default"
PASS=0
FAIL=0
ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); }
fail() { echo "  ❌ $1"; FAIL=$((FAIL+1)); }

cd "$HERE" || exit 1

echo "=== Reset state ==="
rm -rf .converge/journal .converge/inventory .converge/artifacts
rm -rf output
echo "  state cleared"

echo ""
echo "=== Validate playbook ==="
node "$CONVERGE" playbook validate "$PB" 2>&1 | tail -3 | grep -q "structurally valid" && \
  ok "playbook validates" || fail "playbook validate failed"

echo ""
echo "=== Run converge (single invocation, 3 waves × sprint × 2 phases) ==="
unset ANTHROPIC_BASE_URL ANTHROPIC_AUTH_TOKEN ANTHROPIC_MODEL
RUN_LOG=$(mktemp)
CONVERGE_STUB_RESPONSE='{"action":"continue"}' \
  timeout 120 node "$CONVERGE" run --playbook "$PB" > "$RUN_LOG" 2>&1
RC=$?
echo "exit=$RC"
echo "--- key lines from run log ---"
grep -E "\[build\]|\[sprint\]|\[phase\]|Converge|Done:|Stalled" "$RUN_LOG" | head -50

echo ""
echo "=== Verify build wave flags (3 files) ==="
if [ -d output/build ]; then
  for w in 0 1 2; do
    F="output/build/wave-${w}.flag"
    [ -s "$F" ] && ok "build wave-${w}.flag exists" || fail "build wave-${w}.flag missing"
  done
else
  fail "output/build/ not created"
fi

echo ""
echo "=== Verify sprint flags (3 files) ==="
if [ -d output/sprints ]; then
  echo "--- output/sprints/ ---"
  ls -1 output/sprints
  for w in 0 1 2; do
    F="output/sprints/sprint-${w}.flag"
    if [ -s "$F" ]; then
      ok "sprint-${w}.flag exists"
      grep -q "wave=${w} sprint=sprint-${w} " "$F" && \
        ok "sprint-${w}.flag carries wave=${w} sprint=sprint-${w}" || \
        fail "sprint-${w}.flag context wrong"
    else
      fail "sprint-${w}.flag missing"
    fi
  done
else
  fail "output/sprints/ not created"
fi

echo ""
echo "=== Verify phase artifacts (6 files) ==="
if [ -d output/phases ]; then
  echo "--- output/phases/ ---"
  ls -1 output/phases
  PHASE_COUNT=$(ls -1 output/phases 2>/dev/null | wc -l | tr -d ' ')
  [ "$PHASE_COUNT" -eq 6 ] && \
    ok "exactly 6 phase artifacts present (3 sprints × 2 phases)" || \
    fail "found $PHASE_COUNT phase artifacts (expected 6)"

  for w in 0 1 2; do
    for p in a b; do
      F="output/phases/sprint-${w}--phase-${p}.json"
      if [ -s "$F" ]; then
        ok "phase artifact sprint-${w}--phase-${p}.json exists"
        grep -q "\"phase\": \"${p}\"" "$F" && \
          grep -q "\"sprint_id\": \"sprint-${w}\"" "$F" && \
          ok "phase sprint-${w}/${p} carries correct vars" || \
          fail "phase sprint-${w}/${p} vars wrong"
      else
        fail "phase artifact sprint-${w}--phase-${p}.json missing"
      fi
    done
  done
else
  fail "output/phases/ not created"
fi

echo ""
echo "=== Verify ledger has 10 rows total (1 build + 3 sprints + 6 phases) ==="
if [ -f .converge/inventory/$PB/tasks.jsonl ]; then
  BUILD_ROWS=$(grep -c '"id":"build"' .converge/inventory/$PB/tasks.jsonl || true)
  SPRINT_ROWS=$(grep -cE '"id":"sprint-[012]"' .converge/inventory/$PB/tasks.jsonl || true)
  PHASE_ROWS=$(grep -cE '"id":"sprint-[012]--phase-[ab]"' .converge/inventory/$PB/tasks.jsonl || true)

  echo "  build rows: $BUILD_ROWS"
  echo "  sprint rows: $SPRINT_ROWS"
  echo "  phase rows: $PHASE_ROWS"

  [ "$BUILD_ROWS" -ge 1 ] && ok "build row present in ledger" || fail "build row missing"
  [ "$SPRINT_ROWS" -ge 3 ] && ok "3 sprint rows present in ledger" || fail "sprint rows = $SPRINT_ROWS (expected ≥3)"
  [ "$PHASE_ROWS" -ge 6 ] && ok "6 phase rows present in ledger" || fail "phase rows = $PHASE_ROWS (expected ≥6)"

  LAST_BUILD=$(grep '"id":"build"' .converge/inventory/$PB/tasks.jsonl | tail -1)
  echo "$LAST_BUILD" | grep -q '"status":"done"' && \
    ok "build status=done (3 waves completed)" || \
    fail "build not marked done"
else
  fail "tasks.jsonl not created"
fi

echo ""
echo "=== Verify framework reports clean completion ==="
grep -qE "Done: [0-9]+ ok, 0 failed" "$RUN_LOG" && \
  ok "framework: 0 failed tasks" || \
  fail "framework reported failed tasks"

rm -f "$RUN_LOG"

echo ""
echo "=== Clean up ==="
rm -rf output
echo "  removed output/"

echo ""
echo "===================================="
echo "RESULTS:  $PASS passed,  $FAIL failed"
echo "===================================="
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
