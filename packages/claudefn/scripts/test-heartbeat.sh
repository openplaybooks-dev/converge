#!/bin/bash
# Test heartbeat logging and process monitoring

set -e

echo "Testing heartbeat and process monitoring..."
echo ""

cd ../../../workspace

# Clean up previous test files
rm -f .stitch/SITE.md .stitch/screens-plan.json

# Run harness in background
echo "Starting harness..."
pnpm harness run --step > /tmp/harness-test.log 2>&1 &
HARNESS_PID=$!

echo "Harness PID: $HARNESS_PID"
echo ""

# Watch the log file for 60 seconds
LOG_DIR=".harness/journal/epics/02-ux-ui-design-screen-generation/tasks/002-generate-design-system/claudefn-logs"

echo "Monitoring log file for 60 seconds..."
echo "Looking for HEARTBEAT messages..."
echo ""

for i in {1..6}; do
  sleep 10

  # Find latest log file
  LATEST_LOG=$(ls -t "$LOG_DIR" 2>/dev/null | head -1)

  if [ -n "$LATEST_LOG" ]; then
    echo "=== After ${i}0 seconds ==="

    # Show last 10 lines
    tail -10 "$LOG_DIR/$LATEST_LOG"

    # Check for heartbeat
    if grep -q "HEARTBEAT" "$LOG_DIR/$LATEST_LOG"; then
      echo "✅ Heartbeat detected!"
    fi

    # Check if process died
    if grep -q "process died" "$LOG_DIR/$LATEST_LOG"; then
      echo "❌ Process death detected!"
    fi

    # Check if we got output
    if grep -q "STDOUT" "$LOG_DIR/$LATEST_LOG"; then
      echo "✅ Claude CLI responded!"
      break
    fi

    echo ""
  else
    echo "No log file found yet..."
  fi
done

# Cleanup
echo ""
echo "Stopping harness..."
kill $HARNESS_PID 2>/dev/null || true
wait $HARNESS_PID 2>/dev/null || true

echo ""
echo "Test complete. Check the log file for HEARTBEAT messages."
echo "Log location: $LOG_DIR/$(ls -t "$LOG_DIR" | head -1)"
