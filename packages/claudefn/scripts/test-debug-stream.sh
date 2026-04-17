#!/bin/bash
# Test Claude debug log streaming

set -e

echo "Testing Claude debug log streaming..."
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

# Watch the log file
LOG_DIR=".harness/journal/epics/02-ux-ui-design-screen-generation/tasks/002-generate-design-system/claudefn-logs"

echo "Monitoring log file for Claude debug stream..."
echo ""

for i in {1..12}; do
  sleep 5

  # Find latest log file
  LATEST_LOG=$(ls -t "$LOG_DIR" 2>/dev/null | head -1)

  if [ -n "$LATEST_LOG" ]; then
    echo "=== After ${i}×5 = $((i*5)) seconds ==="

    # Check for debug stream
    if grep -q "DEBUG_STREAM" "$LOG_DIR/$LATEST_LOG"; then
      echo "✅ Found DEBUG_STREAM - Claude debug log discovered!"
      DEBUG_FILE=$(grep "DEBUG_STREAM" "$LOG_DIR/$LATEST_LOG" | head -1)
      echo "   $DEBUG_FILE"
    fi

    # Check for Claude debug content
    if grep -q "CLAUDE_DEBUG" "$LOG_DIR/$LATEST_LOG"; then
      echo "✅ Found CLAUDE_DEBUG - Streaming Claude's internal logs!"
      LINES=$(grep -c "CLAUDE_DEBUG" "$LOG_DIR/$LATEST_LOG")
      echo "   $LINES lines of Claude debug output"
    fi

    # Check for heartbeat
    if grep -q "HEARTBEAT" "$LOG_DIR/$LATEST_LOG"; then
      LAST_HB=$(grep "HEARTBEAT" "$LOG_DIR/$LATEST_LOG" | tail -1)
      echo "   Heartbeat: ${LAST_HB##*HEARTBEAT] }"
    fi

    # Check if we got stdout
    if grep -q "STDOUT" "$LOG_DIR/$LATEST_LOG"; then
      echo "✅ Claude responded with STDOUT!"
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
echo "Test complete. Check log for CLAUDE_DEBUG messages."
echo "Log location: $LOG_DIR/$(ls -t "$LOG_DIR" | head -1)"
