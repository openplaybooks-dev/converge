#!/usr/bin/env bash
# Multi-wave do-while loop test — single `converge run` invocation.
#
# Demonstrates that a single passthrough task can iterate across
# multiple waves via the framework's gap-driven repair loop.
#
# How the loop is driven:
#   - The task declares a check `grep -q '^wave=2 '` that only passes
#     once wave 2 has been recorded.
#   - On each gap-repair iteration, the framework re-runs the
#     passthrough body. The body reads `output/wave.counter`, appends
#     to `output/waves.log`, and bumps the counter.
#   - The `converge:` prompt fires after each body run. The stub
#     provider returns `{"action":"continue"}` so the framework's
#     per-task wave counter increments in the ledger.
#   - On wave 2, the body itself calls `converge tasks mark looper
#     --status done`, which the converge: prompt honors as an
#     early-halt signal (pre-marked status=done short-circuits the
#     stub call) and the check finally passes — converged.
#
# Win condition:
#   - One `converge run` invocation
#   - output/waves.log has 3 entries in order (wave=0, wave=1, wave=2)
#   - tasks.jsonl shows looper status=done with reasoning preserved
#   - Final framework status: Done: 3 ok, 0 failed

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
echo "=== Run converge (single invocation, 3 waves via gap loop) ==="
unset ANTHROPIC_BASE_URL ANTHROPIC_AUTH_TOKEN ANTHROPIC_MODEL
RUN_LOG=$(mktemp)
CONVERGE_STUB_RESPONSE='{"action":"continue"}' \
  timeout 60 node "$CONVERGE" run --playbook "$PB" > "$RUN_LOG" 2>&1
RC=$?
echo "exit=$RC"
echo "--- key lines from run log ---"
grep -E "\[looper\]|wave=|Converge|Done:|complete|Stalled" "$RUN_LOG" | head -30

echo ""
echo "=== Verify output/waves.log shows 3 waves in order ==="
if [ -s output/waves.log ]; then
  echo "--- output/waves.log ---"
  cat output/waves.log
  TOTAL=$(wc -l < output/waves.log | tr -d ' ')
  [ "$TOTAL" -eq 3 ] && \
    ok "waves.log has exactly 3 entries" || \
    fail "waves.log has $TOTAL entries (expected 3)"
  grep -q "^wave=0 " output/waves.log && ok "wave 0 recorded" || fail "wave 0 missing"
  grep -q "^wave=1 " output/waves.log && ok "wave 1 recorded" || fail "wave 1 missing"
  grep -q "^wave=2 " output/waves.log && ok "wave 2 recorded" || fail "wave 2 missing"
  ORDER=$(awk '{print $1}' output/waves.log | tr '\n' ' ')
  [ "$ORDER" = "wave=0 wave=1 wave=2 " ] && \
    ok "waves recorded in ascending order (0→1→2)" || \
    fail "wave order wrong: $ORDER"
else
  fail "output/waves.log not created"
fi

echo ""
echo "=== Verify per-wave artifacts (one JSON per wave) ==="
if [ -d output/waves ]; then
  echo "--- output/waves/ ---"
  ls -1 output/waves
  WAVE_FILES=$(ls -1 output/waves 2>/dev/null | wc -l | tr -d ' ')
  [ "$WAVE_FILES" -eq 3 ] && \
    ok "exactly 3 per-wave artifacts present" || \
    fail "found $WAVE_FILES per-wave artifacts (expected 3)"

  for w in 0 1 2; do
    F="output/waves/wave-${w}.json"
    if [ -s "$F" ]; then
      ok "wave-${w}.json exists"
      grep -q "\"wave\": ${w}" "$F" && \
        ok "wave-${w}.json records wave=${w}" || \
        fail "wave-${w}.json missing wave=${w}"
    else
      fail "wave-${w}.json missing"
    fi
  done
else
  fail "output/waves/ directory not created"
fi

echo ""
echo "=== Verify gap loop fired body 3 times ==="
BODY_RUNS=$(grep -c '\[looper\] wave=' "$RUN_LOG")
[ "$BODY_RUNS" -eq 3 ] && \
  ok "passthrough body ran 3 times in one invocation" || \
  fail "body ran $BODY_RUNS times (expected 3)"

WAVE_BUMPS=$(grep -c 'Converge: loop continues — wave' "$RUN_LOG")
[ "$WAVE_BUMPS" -eq 2 ] && \
  ok "converge: prompt bumped wave counter twice (after waves 0 and 1)" || \
  fail "wave bumps = $WAVE_BUMPS (expected 2)"

grep -q "Converge: done (pre-marked by body)" "$RUN_LOG" && \
  ok "early-halt path fired (body's tasks-mark short-circuited stub)" || \
  fail "early-halt path didn't fire"

echo ""
echo "=== Verify ledger shows looper done with reasoning ==="
if [ -f .converge/inventory/$PB/tasks.jsonl ]; then
  LAST=$(grep '"id":"looper"' .converge/inventory/$PB/tasks.jsonl | tail -1)
  echo "$LAST" | grep -q '"status":"done"' && \
    ok "looper status=done — body's tasks mark call worked" || \
    fail "looper not marked done"

  echo "$LAST" | grep -q "completed 3 waves" && \
    ok "reasoning metadata preserved from tasks mark call" || \
    fail "reasoning missing"
else
  fail "tasks.jsonl not created"
fi

echo ""
echo "=== Verify framework reports clean completion ==="
grep -q "Done: 3 ok, 0 failed" "$RUN_LOG" && \
  ok "framework: Done: 3 ok, 0 failed" || \
  fail "framework didn't report clean completion"

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
